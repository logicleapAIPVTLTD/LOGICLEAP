import pandas as pd
import boto3
import re
import math
import json
import ast
from decimal import Decimal
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from fuzzywuzzy import fuzz
import sys
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding="utf-8")


# =====================================================================
# ⚙️ CONFIGURATION
# =====================================================================
AWS_REGION = "ap-south-2"
AWS_ACCESS_KEY_ID = "AKIAYH3VJY2ZUOPIZ27O"
AWS_SECRET_ACCESS_KEY = "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"
BOM_TABLE_NAME = "po_bom_input_master"

# =====================================================================
# 🔹 1. DYNAMODB LOADER & MASTER DATA SETUP
# =====================================================================
def load_bom_master_data():
    """Loads and prepares the BOM Master Data from DynamoDB."""
    print("Connecting to DynamoDB for BOM Master Data...")
    try:
        dynamodb = boto3.resource(
            "dynamodb",
            region_name=AWS_REGION,
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY
        )
        table = dynamodb.Table(BOM_TABLE_NAME)
        items = []
        scan_kwargs = {}

        while True:
            response = table.scan(**scan_kwargs)
            items.extend(response.get("Items", []))
            if "LastEvaluatedKey" in response:
                scan_kwargs["ExclusiveStartKey"] = response["LastEvaluatedKey"]
            else:
                break

        if not items:
            raise RuntimeError("❌ BOM Master Table is empty.")

        # Convert Decimal -> float
        def convert(val):
            if isinstance(val, Decimal):
                return int(val) if val % 1 == 0 else float(val)
            return val

        for item in items:
            for k, v in item.items():
                item[k] = convert(v)

        df = pd.DataFrame(items)
        
        # Cleanup & Preprocessing
        drop_cols = ["Category", "Mandatory_Flag", "Input_Parameter"]
        df = df.drop(columns=[c for c in drop_cols if c in df.columns], errors='ignore')
        df = df.fillna("")
        
        print(f"✅ Loaded {len(df)} BOM Master items.")
        return df

    except Exception as e:
        print(f"❌ Error loading DynamoDB: {e}")
        return pd.DataFrame()

# Load Data Once (Global Scope)
BOM_DF = load_bom_master_data()

# =====================================================================
# 🔹 2. AI MATCHING ENGINE (Semantic Work Type Mapping)
# =====================================================================
if not BOM_DF.empty:
    WORK_TYPES = BOM_DF["Work_Type"].unique().tolist()
    
    # Create "Enriched Text" for better matching
    work_text_map = (
        BOM_DF.groupby("Work_Type")["Item_Name"]
        .apply(lambda x: " ".join(x.astype(str)))
        .to_dict()
    )
    WORK_TEXTS = [f"{wt} {work_text_map.get(wt, '')}" for wt in WORK_TYPES]

    # Train TF-IDF Vectorizer
    tfidf_vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2))
    tfidf_matrix = tfidf_vectorizer.fit_transform(WORK_TEXTS)
else:
    print("⚠️ Warning: BOM DataFrame is empty. AI Matching will fail.")

def match_work_type(user_text):
    """Matches the BOQ work name to a Master Work Type using AI."""
    if BOM_DF.empty or not user_text: return None

    user_text = str(user_text).lower()
    user_vec = tfidf_vectorizer.transform([user_text])
    
    scores = []
    for i, wt in enumerate(WORK_TYPES):
        # 1. TF-IDF Score (Semantic)
        tfidf_score = cosine_similarity(user_vec, tfidf_matrix[i])[0][0] * 100
        # 2. Fuzzy Score (String Similarity)
        fuzzy_score = fuzz.token_set_ratio(user_text, wt.lower())
        
        # Weighted Final Score
        final_score = (0.6 * tfidf_score) + (0.4 * fuzzy_score)
        scores.append((wt, final_score))

    scores.sort(key=lambda x: x[1], reverse=True)
    best_wt, best_score = scores[0]
    
    # Threshold to avoid bad matches
    return best_wt if best_score > 35 else None

# =====================================================================
# 🔹 3. DYNAMIC BOQ PARSER (The Integration Bridge)
# =====================================================================
def parse_boq_output_item(boq_item):
    """
    Parses a single item from the BOQ Engine's output list.
    Standardizes units (sqft->sqm, ft->m) for calculation.
    """
    # 1. Extract Name
    work_name = boq_item.get("work_name") or boq_item.get("work_code") or "Unknown Work"
    
    # 2. Extract Dimensions Dictionary
    dims = boq_item.get("dimensions", {})
    
    # Initialize Metrics
    metrics = {
        "area_sqm": 0.0,
        "length_m": 0.0,
        "volume_m3": 0.0,
        "quantity_nos": 1.0, # Default for 'job' based items
        "tank_capacity": None
    }

    # --- PARSE AREA ---
    if "area" in dims and dims["area"]:
        for d in dims["area"]:
            val = float(d.get("value", 0))
            unit = str(d.get("unit", "")).lower()
            
            if "sqft" in unit or "sft" in unit:
                metrics["area_sqm"] += val / 10.7639
            elif "sqm" in unit or "m2" in unit:
                metrics["area_sqm"] += val
            else:
                metrics["area_sqm"] += val # Fallback

    # --- PARSE LENGTH ---
    if "length" in dims and dims["length"]:
        for d in dims["length"]:
            val = float(d.get("value", 0))
            unit = str(d.get("unit", "")).lower()
            
            if "ft" in unit or "feet" in unit:
                metrics["length_m"] += val * 0.3048
            elif "m" in unit:
                metrics["length_m"] += val

    # --- PARSE VOLUME / CAPACITY ---
    if "volume" in dims and dims["volume"]:
        metrics["volume_m3"] = float(dims["volume"][0].get("value", 0))
    
    if "capacity" in dims and dims["capacity"]:
        metrics["tank_capacity"] = float(dims["capacity"][0].get("value", 0))

    # --- PARSE QUANTITY (Count) ---
    if "quantity" in dims and dims["quantity"]:
        metrics["quantity_nos"] = float(dims["quantity"][0].get("value", 1))

    # --- LOGIC: ESTIMATION FALLBACKS ---
    # If we have Area but need Length (e.g., for Skirting/Cornice)
    if metrics["length_m"] == 0 and metrics["area_sqm"] > 0:
        metrics["length_m"] = math.sqrt(metrics["area_sqm"]) * 4 # Approximation (Perimeter)
        
    return work_name, metrics

# =====================================================================
# 🔹 4. QUANTITY CALCULATION RULES
# =====================================================================
def ceil_min(val, min_val=1):
    return max(min_val, int(math.ceil(val)))

def calculate_material_qty(row, metrics, project_days=15):
    """
    Applies logic norms to the standardized metrics.
    """
    item = str(row["Item_Name"]).lower()
    unit = str(row["Unit"]).lower()
    norm = float(row["Norm_Value"]) if pd.notna(row["Norm_Value"]) and row["Norm_Value"] != "" else 0
    work_type = str(row["Work_Type"]).lower()
    
    area = metrics["area_sqm"]
    length = metrics["length_m"]
    vol = metrics["volume_m3"]
    nos = metrics["quantity_nos"]
    cap = metrics["tank_capacity"]

    # ---------------- SPECIFIC RULES ----------------
    
    # 1. TANK CLEANING
    if "tank" in work_type:
        eff_cap = cap if cap else (area * 100) # Estimate if cap missing
        if "chemical" in item: return ceil_min(eff_cap / 5000)
        if "staff" in item: return ceil_min(eff_cap / (20000 * project_days))
        return 1

    # 2. FLOORING & TILING
    if "floor" in work_type or "tile" in work_type:
        if "tile" in item: return ceil_min(area * 1.05) # 5% Waste
        if "adhesive" in item: return ceil_min(area * 0.25)
        if "grout" in item: return ceil_min(area / 50)
        if "mason" in item: return ceil_min(area / (25 * project_days))
        return ceil_min(area * norm)

    # 3. PAINTING
    if "paint" in work_type:
        if "primer" in item: return ceil_min(area * 0.1) # Liters
        if "putty" in item: return ceil_min(area * 0.5)  # Kg
        if "paint" in item: return ceil_min(area * 0.15) # Liters
        if "painter" in item: return ceil_min(area / (35 * project_days))
        return ceil_min(area * norm)

    # 4. INTERIOR / CARPENTRY
    if "interior" in work_type or "wood" in work_type:
        if "plywood" in item: return ceil_min(area)
        if "laminate" in item: return ceil_min(area)
        if "glue" in item: return ceil_min(area / 20)
        if "carpenter" in item: return ceil_min(area / (15 * project_days))
        return ceil_min(area * norm)

    # 5. ELECTRICAL
    if "electrical" in work_type:
        points = nos if nos > 1 else ceil_min(area / 15) 
        if "wire" in item: return ceil_min(area * 1.5)
        if "switch" in item or "socket" in item: return points
        if "electrician" in item: return ceil_min(points / (10 * project_days))
        return 1

    # 6. ROAD / CIVIL
    if "road" in work_type:
        if "bitumen" in item: return ceil_min(area * 1.2)
        if "paver" in item: return ceil_min(area / (800 * project_days))
        return ceil_min(area * norm)

    # ---------------- GENERIC FALLBACK ----------------
    if unit in ["m3", "cum", "truck"]:
        if vol > 0: return ceil_min(vol * norm)
        return ceil_min(area * 0.1 * norm) 
        
    if unit in ["m", "rft", "meter"]:
        if length > 0: return ceil_min(length * norm)
        return ceil_min(math.sqrt(area) * 4 * norm)

    return ceil_min(area * norm)

# =====================================================================
# 🔹 5. MAIN EXECUTION FUNCTION (API Entry Point)
# =====================================================================
def generate_bom_from_boq_output(boq_data_list, project_days=15):
    """
    Main entry point. Call this function with the list output from the BOQ Engine.
    """
    print("\n======== 🏗️ BOM GENERATION ENGINE ========")
    
    if BOM_DF.empty:
        print("❌ Error: Master Data not loaded.")
        return None

    if not boq_data_list:
        print("⚠️ Warning: Received empty BOQ list.")
        return pd.DataFrame()

    all_bom_data = []

    for i, boq_item in enumerate(boq_data_list):
        work_name, metrics = parse_boq_output_item(boq_item)
        print(f"\n🔹 Item {i+1}: {work_name}")
        print(f"   Input Metrics: {metrics}")

        matched_type = match_work_type(work_name)
        if not matched_type:
            print(f"   ❌ Could not match '{work_name}' to any Master Work Type.")
            continue
        
        print(f"   ✅ Matched Master Type: '{matched_type}'")

        subset = BOM_DF[BOM_DF["Work_Type"] == matched_type].copy()
        if subset.empty:
            print("   ⚠️ No materials defined for this Work Type.")
            continue

        subset["Predicted_Quantity"] = subset.apply(
            lambda row: calculate_material_qty(row, metrics, project_days),
            axis=1
        )

        subset["Ref_BOQ_Scope"] = work_name
        subset["Ref_Area_SQM"] = round(metrics["area_sqm"], 2)
        
        result_cols = ["Ref_BOQ_Scope", "Ref_Area_SQM", "Item_Name", "Unit", "Predicted_Quantity"]
        all_bom_data.append(subset[result_cols])

    if all_bom_data:
        final_df = pd.concat(all_bom_data, ignore_index=True)
        
        # Save to Excel
        output_file = "Final_Project_BOM.xlsx"
        final_df.to_excel(output_file, index=False)
        print(f"\n✅ BOM Generation Complete. Saved to: {output_file}")
        print(final_df)
        return final_df
    else:
        print("\n❌ No valid BOM items generated.")
        return pd.DataFrame()

# =====================================================================
# 🔹 6. MANUAL TESTING BLOCK (UPDATED)
# =====================================================================
if __name__ == "__main__":
    print("\n🔹 Manual Testing Mode")
    print("Paste your BOQ Output Dictionary below.")
    print("Supported formats:")
    print("1. Full Dict: {'work_name': 'Ceiling', 'dimensions': {...}}")
    print("2. Partial: dimensions : {'area': [...]}")
    print("-" * 50)
    
    raw_input = input("INPUT > ").strip()
    
    try:
        data_to_process = []
        
        # CASE A: User pasted "dimensions : {...}"
        if raw_input.startswith("dimensions") and ":" in raw_input:
            print("ℹ️ Detected Partial Dimensions Input.")
            
            # Extract the dictionary part after the colon
            _, dict_part = raw_input.split(":", 1)
            dimensions_dict = ast.literal_eval(dict_part.strip())
            
            # We need a work name to proceed
            work_name_input = input("⚠️ Work Name Missing. Enter Work Name > ").strip()
            
            # Construct the proper object
            data_to_process = [{
                "work_name": work_name_input,
                "dimensions": dimensions_dict
            }]
            
        # CASE B: User pasted a Full List or Dictionary
        else:
            parsed_input = ast.literal_eval(raw_input)
            if isinstance(parsed_input, dict):
                data_to_process = [parsed_input]
            elif isinstance(parsed_input, list):
                data_to_process = parsed_input
                
        # Run Engine
        generate_bom_from_boq_output(data_to_process)
        
    except Exception as e:
        print(f"❌ Input Error: {e}")
        print("Tip: Ensure you are pasting valid Python Dictionary syntax (keys/values in quotes).")

# READ FOR THE TESTING INPUTS BELOW

"""
Some sample inputs can copy/paste into the INPUT > prompt to test it.

1: Full Input (Recommended)
when there will be a complete ouput from the boq

{'work_name': 'False Ceiling Gypsum', 'dimensions': {'area': [{'value': 180.0, 'unit': 'sqft'}], 'length': [{'value': 15.0, 'unit': 'ft'}]}, 'confidence': 0.95}


2: Road Work Sample
this tests metric conversion (sqm) and heavy machinery logic

{'work_name': 'Asphalt Road Laying', 'dimensions': {'area': [{'value': 500.0, 'unit': 'sqm'}]}, 'source': 'TEXT_INPUT'}


3: Partial Input (Simulates debugging)
if you paste this the script will pause and ask you for the "Work Name" manually so that it can work even if anything goes wrong

dimensions : {'area': [{'value': 250.0, 'unit': 'sqft'}], 'quantity': [{'value': 1, 'unit': 'job'}]}

"""