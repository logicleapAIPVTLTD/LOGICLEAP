#!/usr/bin/env python3
"""
BOQ Rate Prediction API - CLI interface for Node.js integration
"""

import os
import sys
import json
import re
import pickle
from typing import List, Dict, Any

import pandas as pd
from rapidfuzz import process
from xgboost import XGBRegressor
from sklearn.preprocessing import LabelEncoder

# ============================================================
# CONFIG
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "models")

MODEL_PATH = os.path.join(MODEL_DIR, "rate_model.json")
ENCODER_PATH = os.path.join(MODEL_DIR, "material_encoder.pkl")
FEATURES_PATH = os.path.join(MODEL_DIR, "feature_columns.pkl")

os.makedirs(MODEL_DIR, exist_ok=True)

# ============================================================
# BOQ EXTRACTION
# ============================================================

class BOQExtractor:
    def __init__(self):
        self.qty_pattern = r"(\d+(?:\.\d+)?)"

    def extract(self, text: str) -> List[Dict[str, Any]]:
        """Extract BOQ items from text"""
        items = []

        for line in text.split("\n"):
            line = line.strip()

            # Filter garbage
            if len(line) < 5:
                continue
            if "total" in line.lower():
                continue
            if re.fullmatch(r"[\d\s.,]+", line):
                continue

            qty_match = re.search(self.qty_pattern, line)
            qty = float(qty_match.group(1)) if qty_match else 1

            items.append({
                "material": line,
                "qty": qty,
                "unit": "NOS"
            })

        return items

# ============================================================
# RATE MODEL TRAINING
# ============================================================

def train_rate_model():
    """Train rate prediction model with sample data"""
    try:
        # Sample material rates (you can expand this)
        materials = [
            "cement", "steel", "sand", "aggregate", "bricks",
            "paint", "tiles", "copper wire", "pvc pipe", "plywood"
        ]
        rates = [
            380, 62000, 1200, 900, 8000,
            450, 50, 55, 80, 1800
        ]

        df = pd.DataFrame({
            "material": materials,
            "qty": [1] * len(materials),
            "vendor_rate": rates
        })

        le = LabelEncoder()
        df["material_encoded"] = le.fit_transform(df["material"])

        X = df[["material_encoded", "qty"]]
        y = df["vendor_rate"]

        model = XGBRegressor(objective="reg:squarederror", n_estimators=50)
        model.fit(X, y)

        model.save_model(MODEL_PATH)
        pickle.dump(le, open(ENCODER_PATH, "wb"))
        pickle.dump(["material_encoded", "qty"], open(FEATURES_PATH, "wb"))

        return {
            "success": True,
            "message": "Model trained successfully",
            "materials_count": len(materials)
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

# ============================================================
# RATE PREDICTOR
# ============================================================

class RatePredictor:
    def __init__(self):
        if not os.path.exists(MODEL_PATH):
            # Auto-train if model doesn't exist
            result = train_rate_model()
            if not result.get("success"):
                raise Exception("Failed to train model")

        self.model = XGBRegressor()
        self.model.load_model(MODEL_PATH)

        self.encoder = pickle.load(open(ENCODER_PATH, "rb"))
        self.features = pickle.load(open(FEATURES_PATH, "rb"))

    def predict(self, material: str, qty: float) -> Dict[str, Any]:
        """Predict rate for a material"""
        try:
            # Find closest match from known materials
            norm = process.extractOne(material.lower(), self.encoder.classes_)[0]
            enc = int(self.encoder.transform([norm])[0])

            df = pd.DataFrame([{
                "material_encoded": enc,
                "qty": qty
            }])[self.features]

            rate = float(self.model.predict(df)[0])

            return {
                "material": material,
                "matched_material": norm,
                "qty": qty,
                "rate_most_likely": round(rate, 2),
                "rate_min": round(rate * 0.9, 2),
                "rate_max": round(rate * 1.1, 2),
                "confidence": 0.75
            }

        except Exception as e:
            # Fallback to default rate
            return {
                "material": material,
                "matched_material": "unknown",
                "qty": qty,
                "rate_most_likely": 100.0,
                "rate_min": 90.0,
                "rate_max": 110.0,
                "confidence": 0.3,
                "error": str(e)
            }

# ============================================================
# COST ENGINE
# ============================================================

class CostEngine:
    def compute_item_cost(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """Compute costs for a single item"""
        qty = item["qty"]
        item["total_cost_min"] = round(item["rate_min"] * qty, 2)
        item["total_cost_most_likely"] = round(item["rate_most_likely"] * qty, 2)
        item["total_cost_max"] = round(item["rate_max"] * qty, 2)
        return item

    def project_summary(self, items: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Compute project-level summary"""
        return {
            "total_items": len(items),
            "project_cost_min": round(sum(i["total_cost_min"] for i in items), 2),
            "project_cost_most_likely": round(sum(i["total_cost_most_likely"] for i in items), 2),
            "project_cost_max": round(sum(i["total_cost_max"] for i in items), 2),
        }

# ============================================================
# CLI COMMANDS
# ============================================================

def cmd_train():
    """Train the rate model"""
    try:
        result = train_rate_model()
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

def cmd_predict(payload_json: str):
    """Predict rates for BOQ items"""
    try:
        payload = json.loads(payload_json)
        
        predictor = RatePredictor()
        cost_engine = CostEngine()
        
        items = payload.get("items", [])
        if not items:
            raise ValueError("No items provided")
        
        results = []
        for item in items:
            material = item.get("material", "")
            qty = float(item.get("qty", 1.0))
            
            # Predict rate
            rate_info = predictor.predict(material, qty)
            
            # Compute costs
            full_item = {**item, **rate_info}
            results.append(cost_engine.compute_item_cost(full_item))
        
        # Project summary
        summary = cost_engine.project_summary(results)
        
        output = {
            "success": True,
            "items": results,
            "summary": summary
        }
        
        print(json.dumps(output, ensure_ascii=False, default=str))
        
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON: {str(e)}"}), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

def cmd_extract(text: str):
    """Extract BOQ from text"""
    try:
        extractor = BOQExtractor()
        predictor = RatePredictor()
        cost_engine = CostEngine()
        
        # Extract items from text
        raw_items = extractor.extract(text)
        
        if not raw_items:
            raise ValueError("No BOQ items found in text")
        
        # Predict rates for each item
        results = []
        for item in raw_items:
            rate_info = predictor.predict(item["material"], item["qty"])
            full_item = {**item, **rate_info}
            results.append(cost_engine.compute_item_cost(full_item))
        
        # Project summary
        summary = cost_engine.project_summary(results)
        
        output = {
            "success": True,
            "items": results,
            "summary": summary
        }
        
        print(json.dumps(output, ensure_ascii=False, default=str))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

def main():
    """Main CLI entry point"""
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No command provided"}), file=sys.stderr)
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    if command == "train":
        cmd_train()
    elif command == "predict":
        payload = sys.argv[2] if len(sys.argv) > 2 else "{}"
        cmd_predict(payload)
    elif command == "extract":
        text = sys.argv[2] if len(sys.argv) > 2 else ""
        cmd_extract(text)
    else:
        print(json.dumps({"error": f"Unknown command: {command}"}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()