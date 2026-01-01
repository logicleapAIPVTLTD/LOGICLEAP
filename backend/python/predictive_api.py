#!/usr/bin/env python3
"""
Predictive Intelligence API - CLI interface for Node.js integration
Predicts: delays, cost variance, completion time, profit margin
"""

import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
from rapidfuzz import fuzz, process

from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, roc_auc_score
from sklearn.ensemble import RandomForestRegressor
import xgboost as xgb

# Optional SHAP
try:
    import shap
    SHAP_AVAILABLE = True
except:
    SHAP_AVAILABLE = False

# =====================================================
# PATH CONFIG
# =====================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DATA_DIR = os.path.join(BASE_DIR, "..", "Datas")
ARTIFACTS_DIR = os.path.join(BASE_DIR, "artifacts")
MODELS_DIR = os.path.join(BASE_DIR, "models")

for d in [ARTIFACTS_DIR, MODELS_DIR]:
    os.makedirs(d, exist_ok=True)

FEATURES_PATH = os.path.join(ARTIFACTS_DIR, "features_master.csv")

# =====================================================
# UTILS
# =====================================================
def canonical(x):
    """Normalize text for matching"""
    if pd.isna(x):
        return ""
    return str(x).lower().strip().replace("-", " ")

def safe_read_csv(name):
    """Read CSV with multiple encoding attempts"""
    path = os.path.join(DATA_DIR, name)
    
    if not os.path.exists(path):
        raise FileNotFoundError(f"CSV file not found: {path}")
    
    for enc in ["utf-8", "cp1252", "latin1"]:
        try:
            return pd.read_csv(path, encoding=enc)
        except:
            pass
    raise RuntimeError(f"Cannot read {name}")

def rmse(y, p):
    """Calculate RMSE"""
    return float(np.sqrt(mean_squared_error(y, p)))

# =====================================================
# FEATURE ENGINEERING
# =====================================================
def build_features():
    """Build feature matrix from input CSVs"""
    try:
        print("Loading input files...", file=sys.stderr)

        # Load CSVs
        actual = safe_read_csv("actual_boq.csv")
        planned = safe_read_csv("planned_boq.csv")
        dpr = safe_read_csv("dpr.csv")
        bom = safe_read_csv("bom.csv")

        # Normalize item names
        for df, cols in [
            (actual, ["item_name", "normalized_item"]),
            (planned, ["input_material", "normalized_material"]),
            (dpr, ["item_name"]),
            (bom, ["material_name", "normalized_material"])
        ]:
            col = next((c for c in cols if c in df.columns), None)
            df["canonical"] = df[col].apply(canonical) if col else ""

        print("Building fuzzy anchors...", file=sys.stderr)
        
        # Build fuzzy matching dictionary
        names = set()
        for df in [actual, planned, dpr, bom]:
            names.update(df["canonical"].dropna().tolist())
        names = [n for n in names if n]

        anchors = {}
        for n in names:
            anchors[n] = n
            for m, score, _ in process.extract(n, names, scorer=fuzz.ratio, limit=10):
                if score >= 75:
                    anchors[m] = n

        for df in [actual, planned, dpr, bom]:
            df["canonical"] = df["canonical"].map(lambda x: anchors.get(x, x))

        # Clean numeric columns
        for df, cols in [
            (actual, ["actual_quantity", "actual_cost"]),
            (planned, ["qty", "total_cost_most_likely"]),
            (dpr, ["achieved_qty"]),
            (bom, ["final_quantity", "unit_rate_inr"])
        ]:
            for c in cols:
                if c in df.columns:
                    df[c] = pd.to_numeric(df[c], errors="coerce").fillna(0)

        # Aggregate by canonical name
        dpr_agg = dpr.groupby("canonical").agg(
            dpr_total_qty=("achieved_qty", "sum"),
            dpr_reports=("achieved_qty", "count")
        ).reset_index()

        bom["bom_cost"] = bom["final_quantity"] * bom["unit_rate_inr"]
        bom_agg = bom.groupby("canonical").agg(
            mean_bom_cost=("bom_cost", "sum")
        ).reset_index()

        planned_agg = planned.groupby("canonical").agg(
            planned_qty=("qty", "sum"),
            planned_cost=("total_cost_most_likely", "sum")
        ).reset_index()

        actual_agg = actual.groupby("canonical").agg(
            actual_qty=("actual_quantity", "sum"),
            actual_cost=("actual_cost", "sum")
        ).reset_index()

        # Merge all
        master = (
            planned_agg
            .merge(actual_agg, on="canonical", how="outer")
            .merge(dpr_agg, on="canonical", how="left")
            .merge(bom_agg, on="canonical", how="left")
            .fillna(0)
        )

        # Calculate features
        master["qty_variance"] = (master["actual_qty"] - master["planned_qty"]) / (master["planned_qty"] + 1e-9)
        master["cost_variance"] = (master["actual_cost"] - master["planned_cost"]) / (master["planned_cost"] + 1e-9)
        master["delay_flag"] = np.where(
            (master["qty_variance"] < -0.2) | (master["cost_variance"] > 0.2), 1, 0
        )

        master["days_to_complete_label"] = np.where(
            master["delay_flag"] == 1,
            np.random.randint(7, 20, len(master)),
            np.random.randint(1, 6, len(master))
        )

        master.to_csv(FEATURES_PATH, index=False)
        
        return {
            "success": True,
            "message": "Features built successfully",
            "features_file": FEATURES_PATH,
            "total_items": len(master),
            "columns": master.columns.tolist()
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

# =====================================================
# TRAIN MODELS
# =====================================================
def train_models():
    """Train all predictive models"""
    try:
        if not os.path.exists(FEATURES_PATH):
            return {
                "success": False,
                "error": "Features not built. Run build_features first."
            }

        print("Training models...", file=sys.stderr)
        df = pd.read_csv(FEATURES_PATH)

        numeric_cols = df.select_dtypes(include=np.number).columns.tolist()
        X = df[numeric_cols].fillna(0)

        results = {}

        # 1. Delay Model
        print("Training delay model...", file=sys.stderr)
        Xd, yd = X, df["delay_flag"]
        Xtr, Xte, ytr, yte = train_test_split(Xd, yd, test_size=0.2, stratify=yd, random_state=42)
        delay_model = xgb.XGBClassifier(eval_metric="logloss", random_state=42)
        delay_model.fit(Xtr, ytr)
        delay_auc = roc_auc_score(yte, delay_model.predict_proba(Xte)[:, 1])
        
        joblib.dump(
            {"model": delay_model, "features": numeric_cols},
            os.path.join(MODELS_DIR, "delay_model.joblib")
        )
        results["delay"] = {"auc": round(delay_auc, 3)}

        # 2. Cost Variance Model
        print("Training cost variance model...", file=sys.stderr)
        Xc, yc = X, df["cost_variance"]
        Xtr, Xte, ytr, yte = train_test_split(Xc, yc, test_size=0.2, random_state=42)
        cost_model = xgb.XGBRegressor(objective="reg:squarederror", random_state=42)
        cost_model.fit(Xtr, ytr)
        cost_rmse = rmse(yte, cost_model.predict(Xte))
        
        joblib.dump(
            {"model": cost_model, "features": numeric_cols},
            os.path.join(MODELS_DIR, "cost_model.joblib")
        )
        results["cost"] = {"rmse": round(cost_rmse, 3)}

        # 3. Completion Time Model
        print("Training completion time model...", file=sys.stderr)
        ycp = df["days_to_complete_label"]
        Xtr, Xte, ytr, yte = train_test_split(X, ycp, test_size=0.2, random_state=42)
        
        xgb_model = xgb.XGBRegressor(objective="reg:squarederror", random_state=42)
        rf_model = RandomForestRegressor(random_state=42)
        
        xgb_model.fit(Xtr, ytr)
        rf_model.fit(Xtr, ytr)
        
        completion_rmse = rmse(yte, xgb_model.predict(Xte))
        
        joblib.dump(
            {"model_xgb": xgb_model, "model_rf": rf_model, "features": numeric_cols},
            os.path.join(MODELS_DIR, "completion_model.joblib")
        )
        results["completion"] = {"rmse": round(completion_rmse, 3)}

        # 4. Profit Margin Model
        print("Training profit margin model...", file=sys.stderr)
        df["revenue"] = df["planned_cost"] * 1.15
        df["profit_margin"] = (df["revenue"] - df["actual_cost"]) / (df["revenue"] + 1e-9)
        
        Xp, yp = X, df["profit_margin"]
        Xtr, Xte, ytr, yte = train_test_split(Xp, yp, test_size=0.2, random_state=42)
        profit_model = xgb.XGBRegressor(objective="reg:squarederror", random_state=42)
        profit_model.fit(Xtr, ytr)
        profit_rmse = rmse(yte, profit_model.predict(Xte))
        
        joblib.dump(
            {"model": profit_model, "features": numeric_cols},
            os.path.join(MODELS_DIR, "profit_model.joblib")
        )
        results["profit"] = {"rmse": round(profit_rmse, 3)}

        return {
            "success": True,
            "message": "All models trained successfully",
            "results": results,
            "features_count": len(numeric_cols)
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

# =====================================================
# PREDICT
# =====================================================
def predict(model_type, features_dict):
    """Make prediction using trained model"""
    try:
        model_path = os.path.join(MODELS_DIR, f"{model_type}_model.joblib")
        
        if not os.path.exists(model_path):
            return {
                "success": False,
                "error": f"Model not found: {model_type}. Train the model first."
            }

        bundle = joblib.load(model_path)
        feature_names = bundle["features"]
        
        # Prepare input data
        input_data = {}
        for f in feature_names:
            input_data[f] = float(features_dict.get(f, 0.0))
        
        X = pd.DataFrame([input_data])
        
        # Make prediction
        if model_type == "delay":
            model = bundle["model"]
            prob = float(model.predict_proba(X)[0, 1])
            pred = int(model.predict(X)[0])
            
            return {
                "success": True,
                "model": model_type,
                "prediction": {
                    "delay_probability": round(prob, 3),
                    "will_delay": bool(pred),
                    "risk_level": "High" if prob > 0.7 else "Medium" if prob > 0.4 else "Low"
                }
            }
        
        elif model_type == "completion":
            xgb_model = bundle["model_xgb"]
            rf_model = bundle["model_rf"]
            
            xgb_pred = float(xgb_model.predict(X)[0])
            rf_pred = float(rf_model.predict(X)[0])
            ensemble_pred = (xgb_pred + rf_pred) / 2
            
            return {
                "success": True,
                "model": model_type,
                "prediction": {
                    "days_to_complete": round(ensemble_pred, 1),
                    "xgb_prediction": round(xgb_pred, 1),
                    "rf_prediction": round(rf_pred, 1)
                }
            }
        
        else:  # cost or profit
            model = bundle["model"]
            pred = float(model.predict(X)[0])
            
            return {
                "success": True,
                "model": model_type,
                "prediction": {
                    f"{model_type}_variance" if model_type == "cost" else f"{model_type}_margin": round(pred, 3),
                    "percentage": f"{round(pred * 100, 2)}%"
                }
            }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

def predict_all(features_dict):
    """Make predictions using all models"""
    try:
        results = {}
        
        for model_type in ["delay", "cost", "completion", "profit"]:
            model_path = os.path.join(MODELS_DIR, f"{model_type}_model.joblib")
            if os.path.exists(model_path):
                result = predict(model_type, features_dict)
                if result["success"]:
                    results[model_type] = result["prediction"]
        
        if not results:
            return {
                "success": False,
                "error": "No trained models found. Train models first."
            }
        
        return {
            "success": True,
            "predictions": results
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

# =====================================================
# CLI COMMANDS
# =====================================================
def cmd_build_features():
    """Build features command"""
    try:
        result = build_features()
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

def cmd_train():
    """Train models command"""
    try:
        result = train_models()
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

def cmd_predict(payload_json):
    """Predict command"""
    try:
        payload = json.loads(payload_json)
        
        model_type = payload.get("model_type")
        features = payload.get("features", {})
        
        if not model_type:
            raise ValueError("model_type is required (delay, cost, completion, profit)")
        
        if model_type not in ["delay", "cost", "completion", "profit"]:
            raise ValueError(f"Invalid model_type: {model_type}")
        
        result = predict(model_type, features)
        print(json.dumps(result, ensure_ascii=False, default=str))
        
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON: {str(e)}"}), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

def cmd_predict_all(payload_json):
    """Predict all command"""
    try:
        payload = json.loads(payload_json)
        features = payload.get("features", {})
        
        result = predict_all(features)
        print(json.dumps(result, ensure_ascii=False, default=str))
        
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON: {str(e)}"}), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

def cmd_health():
    """Health check command"""
    try:
        models_exist = {}
        for model_type in ["delay", "cost", "completion", "profit"]:
            model_path = os.path.join(MODELS_DIR, f"{model_type}_model.joblib")
            models_exist[model_type] = os.path.exists(model_path)
        
        features_exist = os.path.exists(FEATURES_PATH)
        
        output = {
            "success": True,
            "features_built": features_exist,
            "models_trained": models_exist,
            "shap_available": SHAP_AVAILABLE
        }
        print(json.dumps(output))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

def main():
    """Main CLI entry point"""
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No command provided"}), file=sys.stderr)
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    if command == "build":
        cmd_build_features()
    elif command == "train":
        cmd_train()
    elif command == "predict":
        payload = sys.argv[2] if len(sys.argv) > 2 else "{}"
        cmd_predict(payload)
    elif command == "predict_all":
        payload = sys.argv[2] if len(sys.argv) > 2 else "{}"
        cmd_predict_all(payload)
    elif command == "health":
        cmd_health()
    else:
        print(json.dumps({"error": f"Unknown command: {command}"}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()