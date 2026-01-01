#!/usr/bin/env python3
"""
BOM API Script - CLI interface for Node.js integration
Combines your original BOM engine with CLI commands
"""

import sys
import json
import os
import re
from typing import Dict, Any, List, Optional

import numpy as np
import pandas as pd
import boto3
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.ensemble import RandomForestRegressor
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_absolute_percentage_error

# ============= DynamoDB Connection =============
try:
    dynamodb = boto3.resource(
        'dynamodb',
      region_name='ap-south-2',
        aws_access_key_id="AKIAYH3VJY2ZUOPIZ27O",
        aws_secret_access_key="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"
    )
    list(dynamodb.tables.all())
except Exception as e:
    dynamodb = None

# ============= Data Loading Functions =============

def upload_csv_to_dynamodb(table_name: str, df: pd.DataFrame, key: str):
    existing_tables = [t.name for t in dynamodb.tables.all()]
    if table_name not in existing_tables:
        table = dynamodb.create_table(
            TableName=table_name,
            KeySchema=[{"AttributeName": key, "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": key, "AttributeType": "S"}],
            ProvisionedThroughput={"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
        )
        table.wait_until_exists()
    
    table = dynamodb.Table(table_name)
    for _, row in df.iterrows():
        item = {col: str(row[col]) for col in df.columns}
        table.put_item(Item=item)

def load_bom_datasets_for_upload(folder: str) -> Dict[str, pd.DataFrame]:
    csv_files = {
        "boq_bom": "boq_bom_dataset.csv",
        "dimension_rules": "boq_dimension_expansion.csv",
        "cat_map": "category_material_map_expanded_300plus.csv",
        "hist_bom": "historical_bom_master_realistic_1200.csv",
        "consumption_rules": "material_consumption_rules.csv",
        "rates": "material_rates_mode1.csv",
        "specs": "material_specs.csv",
        "substitutions": "material_substitutions_updated.csv",
        "wastage_rules": "material_wastage_factors_v2.csv",
        "task_link": "task_material_link.csv",
    }
    data = {}
    for key, fname in csv_files.items():
        path = os.path.join(folder, fname)
        data[key] = pd.read_csv(path)
    return data

def upload_all_csvs_to_dynamodb(data: Dict[str, pd.DataFrame]):
    table_config = {
        "boq_bom": "item_id", "dimension_rules": "rule_id", "cat_map": "id",
        "hist_bom": "bom_id", "consumption_rules": "rule_id", "rates": "rate_id",
        "specs": "spec_id", "substitutions": "sub_id", "wastage_rules": "waste_id",
        "task_link": "task_id"
    }
    for name, df in data.items():
        key = table_config[name]
        if key not in df.columns:
            df[key] = df.index.astype(str)
        upload_csv_to_dynamodb(name, df, key)

def scan_table_to_df(table_name: str) -> pd.DataFrame:
    table = dynamodb.Table(table_name)
    items = []
    response = table.scan()
    items.extend(response.get("Items", []))
    while "LastEvaluatedKey" in response:
        response = table.scan(ExclusiveStartKey=response["LastEvaluatedKey"])
        items.extend(response.get("Items", []))
    df = pd.DataFrame(items)
    for col in df.columns:
        try:
            df[col] = pd.to_numeric(df[col])
        except:
            pass
    return df

def load_bom_from_dynamodb() -> Dict[str, pd.DataFrame]:
    TABLES = {
        "boq_bom": "boq_bom", "dimension_rules": "dimension_rules",
        "cat_map": "cat_map", "hist_bom": "hist_bom",
        "consumption_rules": "consumption_rules", "rates": "rates",
        "specs": "specs", "substitutions": "substitutions",
        "wastage_rules": "wastage_rules", "task_link": "task_link",
    }
    data = {}
    for key, table in TABLES.items():
        df = scan_table_to_df(table)
        data[key] = df
    return data

# ============= ML Model Functions =============

def build_wastage_model(data: Dict[str, pd.DataFrame]):
    hist = data["hist_bom"].copy()
    specs = data["specs"]
    rates = data["rates"]
    wastage_rules = data["wastage_rules"]
    
    hist = hist.merge(
        specs[["material_name", "thickness_mm", "density_kg_m3", 
               "unit_weight_kg", "durability_rating", "brand_popularity"]],
        on="material_name", how="left"
    )
    
    base_wastage = (
        wastage_rules.groupby(["material_name", "season"])["base_wastage_percent"]
        .mean().fillna(0).reset_index()
        .rename(columns={"base_wastage_percent": "rule_base_wastage_percent"})
    )
    hist = hist.merge(base_wastage, on=["material_name", "season"], how="left")
    
    rate_agg = (
        rates.groupby(["material_name", "region", "grade"])
        [["base_price_inr", "final_price_inr"]].mean().fillna(0).reset_index()
    )
    hist = hist.merge(rate_agg, on=["material_name", "region", "grade"], how="left")
    
    numeric_cols = [
        "base_quantity", "unit_rate_inr", "total_cost_inr", "thickness_mm",
        "density_kg_m3", "unit_weight_kg", "durability_rating", "brand_popularity",
        "rule_base_wastage_percent", "base_price_inr", "final_price_inr"
    ]
    
    rating_map = {"Low": 1, "Medium": 2, "High": 3}
    if "durability_rating" in hist.columns:
        hist["durability_rating"] = (
            hist["durability_rating"].astype(str).replace(rating_map)
        )
        hist["durability_rating"] = pd.to_numeric(
            hist["durability_rating"], errors="coerce"
        ).fillna(2)
    
    if "brand_popularity" in hist.columns:
        hist["brand_popularity"] = (
            hist["brand_popularity"].astype(str).replace(rating_map)
        )
        hist["brand_popularity"] = pd.to_numeric(
            hist["brand_popularity"], errors="coerce"
        ).fillna(2)
    
    for col in numeric_cols:
        if col not in hist.columns:
            hist[col] = 0.0
        hist[col] = pd.to_numeric(hist[col], errors="coerce").fillna(0.0)
    
    cat_cols = ["category", "material_name", "region", "season", "grade"]
    for col in cat_cols:
        hist[col] = hist[col].astype(str).fillna("NA")
    
    X = hist[cat_cols + numeric_cols]
    y = pd.to_numeric(hist["wastage_percent"], errors="coerce").fillna(0.0)
    
    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore"), cat_cols),
            ("num", "passthrough", numeric_cols),
        ]
    )
    
    rf = RandomForestRegressor(
        n_estimators=200, max_depth=12, min_samples_leaf=2,
        random_state=42, n_jobs=-1
    )
    
    model = Pipeline(steps=[("prep", preprocessor), ("rf", rf)])
    model.fit(X_train, y_train)
    pred = model.predict(X_val)
    mape = mean_absolute_percentage_error(y_val, pred) * 100.0
    
    meta = {
        "cat_cols": cat_cols,
        "num_cols": numeric_cols,
        "val_mape": float(mape)
    }
    return model, meta

def predict_wastage_percent(model: Pipeline, meta: Dict[str, Any], 
                           row: Dict[str, Any]) -> float:
    df = pd.DataFrame([row])
    for col in meta["cat_cols"]:
        if col not in df.columns:
            df[col] = "NA"
        df[col] = df[col].astype(str).fillna("NA")
    for col in meta["num_cols"]:
        if col not in df.columns:
            df[col] = 0.0
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)
    return float(model.predict(df)[0])

# ============= BOM Generation Functions =============

def get_candidate_materials(category, data, boq_material_text=None):
    MAX_TOTAL = 18
    category = category.lower()
    cat_map = data["cat_map"].copy()
    
    cat_map = cat_map.rename(columns={
        "material": "material_name", "Material": "material_name",
        "item": "material_name", "Item": "material_name"
    })
    
    sub = cat_map[cat_map["category"].str.lower() == category].copy()
    if sub.empty:
        return pd.DataFrame([{
            "material_name": category, "unit": "nos", "usage_frequency": 1.0
        }])
    
    sub["usage_frequency"] = pd.to_numeric(
        sub.get("usage_frequency", 1.0), errors="coerce"
    ).fillna(1.0)
    
    text = (boq_material_text or "").lower()
    CORE = {
        "electrical": ["wire", "cable", "conduit", "junction", "switch", "socket"],
        "plumbing": ["pipe", "elbow", "tee", "valve", "clamp", "solvent"],
        "carpentry": ["plywood", "laminate", "edge", "hinge", "handle", "adhesive"],
        "tank cleaning": ["chemical", "disinfect", "hose", "brush"],
        "tiling": ["tile", "adhesive", "grout", "spacer"],
        "painting": ["primer", "putty", "paint"]
    }
    
    core_hits = sub[sub["material_name"].str.lower().apply(
        lambda m: any(k in m for k in CORE.get(category, []))
    )]
    text_hits = sub[sub["material_name"].str.lower().apply(
        lambda m: any(w in m for w in text.split())
    )]
    
    candidates = (
        pd.concat([core_hits, text_hits])
        .drop_duplicates("material_name")
        .sort_values("usage_frequency", ascending=False)
        .head(MAX_TOTAL)
    )
    
    if len(candidates) < 6:
        filler = sub.sort_values("usage_frequency", ascending=False).head(8)
        candidates = (
            pd.concat([candidates, filler])
            .drop_duplicates("material_name").head(MAX_TOTAL)
        )
    
    return candidates.reset_index(drop=True)

def lookup_unit_norm(category: str, material_name: str, 
                     data: Dict[str, pd.DataFrame]) -> float:
    mat = material_name.lower()
    if "adhesive" in mat:
        return 0.45
    if "grout" in mat:
        return 0.10
    if "epoxy" in mat:
        return 0.12
    
    norms = data["consumption_rules"]
    sub = norms[
        (norms["category"].str.lower() == str(category).lower()) &
        (norms["material"].str.lower() == mat)
    ]
    
    if sub.empty:
        return 0.05
    
    raw_val = sub["unit_norms"].iloc[0]
    if isinstance(raw_val, (int, float)):
        return float(raw_val)
    
    raw_str = str(raw_val)
    nums = re.findall(r"[-+]?\d*\.\d+|\d+", raw_str)
    if nums:
        return float(nums[0])
    return 0.05

def compute_base_quantity_for_material(boq_row, material_name, category, 
                                      data, wbs_usage=None):
    area = float(boq_row.get("area_sqft", 0) or 0)
    qty = float(boq_row.get("quantity", 1) or 1)
    mat = material_name.lower()
    cat = category.lower()
    
    if cat == "electrical":
        if "wire" in mat or "cable" in mat:
            return round(area * 2.0, 2)
        if "conduit" in mat:
            return round(area * 1.2, 2)
        if "switch" in mat or "socket" in mat:
            return max(1, area // 20)
        if "box" in mat or "junction" in mat:
            return max(1, area // 25)
    
    if cat == "carpentry":
        if "plywood" in mat:
            return round(area * 1.05, 2)
        if "laminate" in mat:
            return round(area * 1.10, 2)
        if "edge" in mat:
            return round(area * 0.25, 2)
        if "hinge" in mat:
            return max(4, area // 15)
        if "handle" in mat:
            return max(2, area // 20)
        if "adhesive" in mat:
            return round(area * 0.40, 2)
    
    if cat == "plumbing":
        points = max(1, qty)
        avg_pipe_per_point_m = 12
        if "pipe" in mat:
            return points * avg_pipe_per_point_m
        if "elbow" in mat or "tee" in mat:
            return points * 2
        if "valve" in mat:
            return round(points * 1.5)
        if "clamp" in mat:
            pipe_len = points * avg_pipe_per_point_m
            return round(pipe_len / 2)
        if "solvent" in mat:
            return round(points * 0.4, 2)
    
    if cat == "tiling":
        tile_size = boq_row.get("dimensions", {}).get("tile_size_mm", "600x600")
        try:
            a, b = tile_size.split("x")
            tile_area_sqft = (float(a) / 304.8) * (float(b) / 304.8)
        except:
            tile_area_sqft = 3.9
        
        if "tile" in mat:
            return round(area / tile_area_sqft, 1)
        if "adhesive" in mat:
            return round(area * 0.45, 2)
        if "grout" in mat:
            return round(area * 0.10, 2)
        if "spacer" in mat:
            return round(area / tile_area_sqft, 0)
    
    if cat == "tank cleaning":
        cap = boq_row.get("dimensions", {}).get("capacity_kl", 10)
        if "chemical" in mat:
            return round(cap * 0.8, 2)
        if "disinfect" in mat:
            return round(cap * 0.3, 2)
        if "brush" in mat:
            return max(2, cap // 5)
        if "hose" in mat:
            return 1
    
    norm = lookup_unit_norm(category, material_name, data)
    return max(round(area * norm, 2), 1.0)

def lookup_rate(material_name, region, grade, data):
    df = data["rates"].copy()
    name = material_name.lower().strip()
    region = region.lower().strip()
    grade = grade.lower().strip()
    
    alias_groups = {
        "wire": ["wire", "wires", "copper wire", "electrical wire", "frls wire"],
        "cable": ["cable", "cables"],
        "conduit": ["conduit", "pvc conduit", "upvc conduit"],
        "junction box": ["junction box", "metal box", "gi box"],
        "switch": ["switch", "modular switch"],
        "socket": ["socket", "universal socket"],
        "pipe": ["pipe", "cpvc pipe", "upvc pipe", "ppr pipe", "gi pipe"],
        "valve": ["valve", "ball valve", "check valve"],
        "elbow": ["elbow", "bend", "tee"],
        "solvent": ["solvent", "cpvc solvent", "cement solvent"],
        "tile": ["tile", "ceramic tile", "vitrified tile", "porcelain tile"],
        "adhesive": ["adhesive", "fevicol", "glue"],
        "grout": ["grout"],
        "spacer": ["spacer"],
        "plywood": ["plywood", "board", "mdf", "hdhmr"],
        "laminate": ["laminate", "veneers", "acrylic sheet"],
        "edge band": ["edge band", "pvc edge band"],
        "hinge": ["hinge", "soft close hinge"],
        "handle": ["handle"],
        "paint": ["paint", "emulsion paint"],
        "primer": ["primer"],
        "putty": ["putty"],
        "chemical": ["chemical", "cleaning liquid"],
        "disinfect": ["disinfect", "chlorine", "peroxide"]
    }
    
    matched_key = None
    for key, values in alias_groups.items():
        if any(v in name for v in values):
            matched_key = key
            break
    
    if matched_key:
        subset = df[df["material_name"].str.lower().str.contains(matched_key)]
        if not subset.empty:
            subset_rg = subset[
                (subset["region"].str.lower() == region) &
                (subset["grade"].str.lower() == grade)
            ]
            if not subset_rg.empty:
                return float(subset_rg["final_price_inr"].iloc[0])
            subset_r = subset[subset["region"].str.lower() == region]
            if not subset_r.empty:
                return float(subset_r["final_price_inr"].mean())
            subset_g = subset[subset["grade"].str.lower() == grade]
            if not subset_g.empty:
                return float(subset_g["final_price_inr"].mean())
            return float(subset["final_price_inr"].mean())
    
    exact = df[
        (df["material_name"].str.lower() == name) &
        (df["region"].str.lower() == region) &
        (df["grade"].str.lower() == grade)
    ]
    if not exact.empty:
        return float(exact["final_price_inr"].iloc[0])
    
    return float(df["final_price_inr"].mean())

def lookup_wastage_rule(material_name: str, season: str, 
                       data: Dict[str, pd.DataFrame]) -> Dict[str, Any]:
    rules = data["wastage_rules"]
    sub = rules[
        (rules["material_name"] == material_name) &
        (rules["season"] == season)
    ]
    if sub.empty:
        sub = rules[rules["material_name"] == material_name]
    
    if sub.empty:
        base = 12.0
        row = {}
    else:
        row = sub.iloc[0]
        base = float(row.get("base_wastage_percent", 12.0) or 12.0)
    
    if base < 1.0:
        base = base * 100.0
    
    return {
        "rule_base_wastage_percent": base,
        "season_factor": float(row.get("season_factor", 1.0)) if sub.size else 1.0,
        "skill_level": row.get("skill_level", "skilled") if sub.size else "skilled",
        "skill_factor": float(row.get("skill_factor", 1.0)) if sub.size else 1.0,
        "site_complexity": row.get("site_complexity", "medium") if sub.size else "medium",
        "site_complexity_factor": float(row.get("site_complexity_factor", 1.0)) if sub.size else 1.0
    }

def get_substitutions(material_name: str, data: Dict[str, pd.DataFrame]):
    subs = data["substitutions"].copy()
    name = material_name.lower().strip()
    
    if subs.empty:
        return []
    
    exact = subs[subs["material_name"].str.lower().str.strip() == name]
    if not exact.empty:
        matched = exact.copy()
    else:
        KEYWORDS = {
            "wire": ["wire", "cable"],
            "pipe": ["pipe", "cpvc", "upvc", "ppr", "gi"],
            "conduit": ["conduit"],
            "tile": ["tile", "ceramic", "vitrified", "porcelain"],
            "adhesive": ["adhesive", "glue"],
            "grout": ["grout"],
            "plywood": ["plywood", "mdf", "board", "hdhmr"],
            "laminate": ["laminate", "veneer", "acrylic"],
            "valve": ["valve"],
            "switch": ["switch"],
            "socket": ["socket"],
            "clamp": ["clamp"],
            "chemical": ["chemical", "degreaser"],
            "disinfect": ["disinfect", "chlorine", "peroxide"],
            "brush": ["brush"],
            "primer": ["primer"],
            "paint": ["paint", "emulsion"]
        }
        
        matched = pd.DataFrame()
        for keys in KEYWORDS.values():
            if any(k in name for k in keys):
                pattern = "|".join(keys)
                matched = subs[
                    subs["material_name"].str.lower().str.contains(pattern, regex=True)
                ]
                break
    
    if matched.empty:
        return []
    
    matched = matched.copy()
    matched["substitute_material"] = (
        matched["substitute_material"].astype(str)
        .str.replace(r"\s+Variant+", "", regex=True).str.strip()
    )
    
    priority = {"premium": 1, "standard": 2, "economy": 3}
    matched["priority"] = (
        matched["quality_level"].str.lower().map(priority).fillna(3)
    )
    matched = matched.sort_values(
        ["priority", "cost_factor", "performance_factor"]
    )
    matched = matched.drop_duplicates("substitute_material").head(3)
    
    return [
        {
            "substitute_material": r["substitute_material"],
            "quality_level": r["quality_level"],
            "cost_factor": float(r["cost_factor"]),
            "performance_factor": float(r["performance_factor"]),
            "reason": r["reason"]
        }
        for _, r in matched.iterrows()
    ]

def _generate_bom_for_boq_row(boq_row: pd.Series, data: Dict[str, pd.DataFrame],
                             wastage_model: Pipeline, wastage_meta: Dict[str, Any],
                             wbs_usage: Optional[List[Dict[str, Any]]] = None,
                             skill_level: str = "skilled",
                             site_complexity: str = "medium") -> Dict[str, Any]:
    category = str(boq_row.get("category", ""))
    region = str(boq_row.get("region", ""))
    season = str(boq_row.get("season", ""))
    grade = str(boq_row.get("grade", ""))
    default_unit = str(boq_row.get("unit", "nos"))
    work_qty = float(boq_row.get("quantity", 0.0))
    boq_id = str(boq_row.get("boq_id", ""))
    boq_material_text = str(boq_row.get("material", "")).lower()
    
    materials_df = get_candidate_materials(category, data, boq_material_text)
    
    pipe_df = materials_df[
        materials_df["material_name"].str.lower().str.contains("pipe")
    ]
    if not pipe_df.empty:
        priority = ["cpvc", "upvc", "ppr"]
        selected_pipe = None
        for p in priority:
            if p in boq_material_text:
                match = pipe_df[
                    pipe_df["material_name"].str.lower().str.contains(p)
                ]
                if not match.empty:
                    selected_pipe = match.iloc[0]["material_name"]
                    break
        if selected_pipe:
            materials_df = materials_df[
                (materials_df["material_name"] == selected_pipe) |
                (~materials_df["material_name"].str.lower().str.contains("pipe"))
            ]
    
    bom_lines: List[Dict[str, Any]] = []
    anomalies: List[Dict[str, Any]] = []
    
    for _, m in materials_df.iterrows():
        material_name = str(m["material_name"])
        lower_name = material_name.lower()
        
        mat_unit = str(m.get("unit") or default_unit or "nos")
        if any(k in lower_name for k in ["adhesive", "grout", "epoxy", "mortar", "putty", "chemical"]):
            mat_unit = "kg"
        if any(k in lower_name for k in ["paint", "primer", "emulsion"]):
            mat_unit = "liters"
        if "solvent" in lower_name:
            mat_unit = "liters"
        
        base_qty = compute_base_quantity_for_material(
            boq_row, material_name, category, data, wbs_usage
        )
        
        wastage_rule = lookup_wastage_rule(material_name, season, data)
        if skill_level.lower().startswith("unskilled"):
            wastage_rule["skill_factor"] = 1.10
        elif skill_level.lower().startswith("semi"):
            wastage_rule["skill_factor"] = 1.00
        else:
            wastage_rule["skill_factor"] = 0.95
        
        if site_complexity.lower() == "low":
            wastage_rule["site_complexity_factor"] = 0.95
        elif site_complexity.lower() == "high":
            wastage_rule["site_complexity_factor"] = 1.10
        else:
            wastage_rule["site_complexity_factor"] = 1.00
        
        feat_row = {
            "category": category, "material_name": material_name,
            "region": region, "season": season, "grade": grade,
            "base_quantity": base_qty, "unit_rate_inr": 0.0,
            "total_cost_inr": 0.0, "thickness_mm": 0.0,
            "density_kg_m3": 0.0, "unit_weight_kg": 0.0,
            "durability_rating": 2, "brand_popularity": 2,
            "rule_base_wastage_percent": wastage_rule["rule_base_wastage_percent"],
            "base_price_inr": 0.0, "final_price_inr": 0.0
        }
        
        specs = data["specs"]
        ssub = specs[specs["material_name"] == material_name]
        if not ssub.empty:
            srow = ssub.iloc[0]
            for col in ["thickness_mm", "density_kg_m3", "unit_weight_kg"]:
                feat_row[col] = float(srow.get(col, 0.0))
            rating_map = {"Low": 1, "Medium": 2, "High": 3}
            feat_row["durability_rating"] = rating_map.get(
                str(srow.get("durability_rating", "Medium")), 2
            )
            feat_row["brand_popularity"] = rating_map.get(
                str(srow.get("brand_popularity", "Medium")), 2
            )
        
        rate = lookup_rate(material_name, region, grade, data)
        feat_row["unit_rate_inr"] = rate
        feat_row["base_price_inr"] = rate
        feat_row["final_price_inr"] = rate
        
        ml_wastage = predict_wastage_percent(wastage_model, wastage_meta, feat_row)
        combined_wastage = (
            wastage_rule["rule_base_wastage_percent"] *
            wastage_rule.get("season_factor", 1.0) *
            wastage_rule["skill_factor"] *
            wastage_rule["site_complexity_factor"]
        )
        
        final_wastage_pct = np.clip(
            0.6 * ml_wastage + 0.4 * combined_wastage, 10.0, 25.0
        )
        final_qty = base_qty * (1 + final_wastage_pct / 100.0)
        total_cost = final_qty * rate
        
        if abs(final_wastage_pct - wastage_rule["rule_base_wastage_percent"]) > (
            0.5 * wastage_rule["rule_base_wastage_percent"]
        ):
            anomalies.append({
                "material_name": material_name, "boq_id": boq_id,
                "predicted_wastage_pct": round(final_wastage_pct, 2),
                "rule_wastage_pct": round(wastage_rule["rule_base_wastage_percent"], 2),
                "reason": "Wastage deviation > 50% from rule"
            })
        
        bom_lines.append({
            "material_name": material_name,
            "category": category,
            "base_quantity": round(base_qty, 3),
            "unit": mat_unit,
            "predicted_wastage_percent": round(final_wastage_pct, 2),
            "final_quantity": round(final_qty, 3),
            "unit_rate_inr": round(rate, 2),
            "total_cost_inr": round(total_cost, 2),
            "substitutions": get_substitutions(material_name, data)
        })
    
    uniq = {(a["material_name"], a["reason"]): a for a in anomalies}
    return {
        "boq_id": boq_id,
        "category": category,
        "region": region,
        "season": season,
        "grade": grade,
        "work_quantity": work_qty,
        "bom_lines": bom_lines,
        "anomalies": list(uniq.values()),
        "wastage_model_val_mape": wastage_meta["val_mape"]
    }

def generate_bom_from_payload(payload: Dict[str, Any], data: Dict[str, pd.DataFrame],
                             wastage_model: Pipeline, wastage_meta: Dict[str, Any]) -> Dict[str, Any]:
    """Generate BOM from a single BOQ payload"""
    boq = payload.get("boq", {})
    wbs = payload.get("wbs", {})
    wbs_usage = wbs.get("execution_tasks", [])
    
    dims = boq.get("dimensions", {}) or {}
    length_ft = float(dims.get("length_ft", 0.0) or 0.0)
    width_ft = float(dims.get("width_ft", 0.0) or 0.0)
    area_sqft = float(dims.get("area_sqft", 0.0) or 0.0)
    
    if area_sqft <= 0 and length_ft > 0 and width_ft > 0:
        area_sqft = length_ft * width_ft
    
    boq_row_dict = {
        "boq_id": boq.get("boq_id", ""),
        "category": boq.get("category", ""),
        "material": boq.get("material", ""),
        "quantity": float(boq.get("quantity", 0.0) or 0.0),
        "unit": boq.get("unit", ""),
        "length_ft": length_ft,
        "width_ft": width_ft,
        "area_sqft": area_sqft,
        "region": boq.get("region", ""),
        "season": boq.get("season", ""),
        "grade": boq.get("grade", ""),
        "dimensions": dims
    }
    boq_row = pd.Series(boq_row_dict)
    
    project_ctx = boq.get("project_context", {}) or {}
    skill_level = project_ctx.get("skill_level", "skilled")
    site_complexity = project_ctx.get("complexity", "medium")
    
    return _generate_bom_for_boq_row(
        boq_row, data, wastage_model, wastage_meta,
        wbs_usage, skill_level, site_complexity
    )

# ============= CLI Commands =============

_DATA_CACHE = None
_MODEL_CACHE = None
_META_CACHE = None

def initialize_system():
    """Initialize and cache the model and data"""
    global _DATA_CACHE, _MODEL_CACHE, _META_CACHE
    
    if _DATA_CACHE is None:
        try:
            _DATA_CACHE = load_bom_from_dynamodb()
        except Exception as e:
            print(json.dumps({"error": f"Failed to load data: {str(e)}"}), file=sys.stderr)
            sys.exit(1)
    
    if _MODEL_CACHE is None:
        try:
            _MODEL_CACHE, _META_CACHE = build_wastage_model(_DATA_CACHE)
        except Exception as e:
            print(json.dumps({"error": f"Failed to build model: {str(e)}"}), file=sys.stderr)
            sys.exit(1)
    
    return _DATA_CACHE, _MODEL_CACHE, _META_CACHE

def cmd_generate(payload_json: str):
    """Generate BOM from payload"""
    try:
        payload = json.loads(payload_json)
        data, model, meta = initialize_system()
        result = generate_bom_from_payload(payload, data, model, meta)
        print(json.dumps(result, ensure_ascii=False, default=str))
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON: {str(e)}"}), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

def cmd_upload(csv_folder: str):
    """Upload CSV data to DynamoDB"""
    try:
        if not os.path.exists(csv_folder):
            raise ValueError(f"Folder not found: {csv_folder}")
        data = load_bom_datasets_for_upload(csv_folder)
        upload_all_csvs_to_dynamodb(data)
        result = {
            "success": True,
            "message": "CSV data uploaded successfully",
            "tables_uploaded": list(data.keys())
        }
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

def cmd_batch(boqs_json: str):
    """Generate BOM for multiple BOQs"""
    try:
        boqs = json.loads(boqs_json)
        data, model, meta = initialize_system()
        results = []
        for boq_payload in boqs:
            try:
                result = generate_bom_from_payload(boq_payload, data, model, meta)
                results.append({"success": True, "data": result})
            except Exception as e:
                results.append({"success": False, "error": str(e)})
        print(json.dumps({"results": results}, ensure_ascii=False, default=str))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

def cmd_substitutions(material_name: str):
    """Get substitutions for a material"""
    try:
        data, _, _ = initialize_system()
        subs = get_substitutions(material_name, data)
        print(json.dumps({"substitutions": subs}, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

def cmd_wastage(material_json: str):
    """Predict wastage for a material"""
    try:
        material_data = json.loads(material_json)
        data, model, meta = initialize_system()
        wastage_pct = predict_wastage_percent(model, meta, material_data)
        print(json.dumps({
            "material_name": material_data.get("material_name"),
            "predicted_wastage_percent": round(wastage_pct, 2)
        }))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

def main():
    """Main CLI entry point"""
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No command provided"}), file=sys.stderr)
        sys.exit(1)
    
    command = sys.argv[1].lower()
    commands = {
        "generate": lambda: cmd_generate(sys.argv[2] if len(sys.argv) > 2 else "{}"),
        "upload": lambda: cmd_upload(sys.argv[2] if len(sys.argv) > 2 else ""),
        "batch": lambda: cmd_batch(sys.argv[2] if len(sys.argv) > 2 else "[]"),
        "substitutions": lambda: cmd_substitutions(sys.argv[2] if len(sys.argv) > 2 else ""),
        "wastage": lambda: cmd_wastage(sys.argv[2] if len(sys.argv) > 2 else "{}")
    }
    
    if command not in commands:
        print(json.dumps({"error": f"Unknown command: {command}"}), file=sys.stderr)
        sys.exit(1)
    
    commands[command]()

if __name__ == "__main__":
    main()