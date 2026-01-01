import pandas as pd
import re
import json
import sys
import argparse
import os
from pathlib import Path

# ============================================================
# FILE PATHS (relative to script location - data folder)
# ============================================================
SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR / "data"
BOM_FILE = DATA_DIR / "predicted_bom.xlsx"
ITEM_RATE_FILE = DATA_DIR / "ITEM_RATE_BASE_MASTER.xlsx"
LABOUR_RATE_FILE = DATA_DIR / "Labour_Base_Rates.xlsx"
MACHINE_RATE_FILE = DATA_DIR / "Machinery_Base_Rates.xlsx"
STATE_FILE = DATA_DIR / "STATE_CITY_INDEX_MASTER.xlsx"
MAPPING_FILE = DATA_DIR / "ITEM_CLASSIFICATION_MASTER.xlsx"

# ============================================================
# HELPERS
# ============================================================
def norm(text):
    """Normalize text for comparison"""
    return re.sub(r"[^a-z0-9]", "", str(text).lower())

def singular_fallback(key):
    """Convert plural to singular for fallback matching"""
    if key.endswith("es"):
        return key[:-2]
    if key.endswith("s"):
        return key[:-1]
    return key

# ============================================================
# VALIDATION
# ============================================================
def validate_master_files():
    """Validate that all required master files exist"""
    files = {
        "BOM": BOM_FILE,
        "Item Rates": ITEM_RATE_FILE,
        "Labour Rates": LABOUR_RATE_FILE,
        "Machine Rates": MACHINE_RATE_FILE,
        "State Index": STATE_FILE,
        "Item Mapping": MAPPING_FILE
    }
    
    validation = {"status": "success", "files": {}}
    
    for name, filepath in files.items():
        exists = filepath.exists()
        validation["files"][name] = {
            "exists": exists,
            "path": str(filepath)
        }
        if not exists:
            validation["status"] = "error"
    
    return validation

# ============================================================
# GET LOCATIONS
# ============================================================
def get_available_locations():
    """Get all available state codes and city tiers"""
    try:
        state_df = pd.read_excel(STATE_FILE)
        state_df.columns = state_df.columns.str.strip()
        state_df["State_Code"] = state_df["State_Code"].str.upper()
        state_df["City_Tier"] = state_df["City_Tier"].str.upper()
        
        locations = state_df.groupby("State_Code")["City_Tier"].apply(list).to_dict()
        
        return {
            "status": "success",
            "locations": locations,
            "states": list(locations.keys()),
            "tiers": ["T1", "T2", "T3"]
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

# ============================================================
# MAIN ESTIMATION FUNCTION
# ============================================================
def calculate_estimation(state_code, city_tier, bom_file=None, detailed=False):
    """
    Calculate price estimation
    """
    try:
        # Use custom BOM file if provided
        if bom_file:
            bom_path = Path(bom_file)
            if not bom_path.exists():
                # Try in data directory
                bom_path = DATA_DIR / bom_file
                if not bom_path.exists():
                    # Try in script directory
                    bom_path = SCRIPT_DIR / bom_file
        else:
            bom_path = BOM_FILE
        
        # Load data
        bom_df = pd.read_excel(bom_path)
        item_rates = pd.read_excel(ITEM_RATE_FILE)
        labour_rates = pd.read_excel(LABOUR_RATE_FILE)
        machine_rates = pd.read_excel(MACHINE_RATE_FILE)
        state_df = pd.read_excel(STATE_FILE)
        mapping = pd.read_excel(MAPPING_FILE)

        # Clean column names
        for df in [item_rates, labour_rates, machine_rates, state_df, mapping]:
            df.columns = df.columns.str.strip()

        # Create normalized keys
        mapping["Item_Key"] = mapping["Item_Name"].apply(norm)
        mapping["Rate_Key"] = mapping["Rate_Key"].apply(norm)

        item_rates["Rate_Key"] = item_rates["Item_Category"].apply(norm)
        labour_rates["Rate_Key"] = labour_rates["Labour_Type"].apply(norm)
        machine_rates["Rate_Key"] = machine_rates["Machine_Type"].apply(norm)

        state_df["State_Code"] = state_df["State_Code"].str.upper()
        state_df["City_Tier"] = state_df["City_Tier"].str.upper()

        # Get location factors
        loc_rows = state_df[
            (state_df["State_Code"] == state_code) &
            (state_df["City_Tier"] == city_tier)
        ]

        if loc_rows.empty:
            return {
                "status": "error",
                "message": f"Location not found: {state_code} - {city_tier}"
            }

        loc = loc_rows.iloc[0]
        MAT_FACTOR = loc["City_Multiplier"] * loc["Material_Index"]
        LAB_FACTOR = loc["City_Multiplier"] * loc["Labour_Index"]
        MAC_FACTOR = loc["City_Multiplier"] * loc["Machinery_Index"]

        # Initialize totals
        totals = {
            "Material": {"min": 0, "likely": 0, "max": 0},
            "Labour": {"min": 0, "likely": 0, "max": 0},
            "Machinery": {"min": 0, "likely": 0, "max": 0},
        }

        missing_items = []
        item_details = []

        # Process each BOM item
        for _, row in bom_df.iterrows():
            item_name = row["Item_Name"]
            qty = row["Predicted_Quantity"]

            key = norm(item_name)
            map_row = mapping[mapping["Item_Key"] == key]

            # Try singular fallback if not found
            if map_row.empty:
                key = singular_fallback(key)
                map_row = mapping[mapping["Item_Key"] == key]

            if map_row.empty:
                missing_items.append(item_name)
                continue

            map_row = map_row.iloc[0]
            component = map_row["Cost_Component"]
            rate_key = map_row["Rate_Key"]

            # Select appropriate rate table and factor
            if component == "Material":
                rate_df = item_rates
                factor = MAT_FACTOR
            elif component == "Labour":
                rate_df = labour_rates
                factor = LAB_FACTOR
            else:
                rate_df = machine_rates
                factor = MAC_FACTOR

            rate_row = rate_df[rate_df["Rate_Key"] == rate_key]

            if rate_row.empty:
                missing_items.append(item_name)
                continue

            rate = rate_row.iloc[0]

            # Calculate costs
            min_cost = qty * rate["Base_Min"] * factor
            likely_cost = qty * rate["Base_Likely"] * factor
            max_cost = qty * rate["Base_Max"] * factor

            totals[component]["min"] += min_cost
            totals[component]["likely"] += likely_cost
            totals[component]["max"] += max_cost

            if detailed:
                item_details.append({
                    "item_name": item_name,
                    "quantity": float(qty),
                    "component": component,
                    "min_cost": round(min_cost, 2),
                    "likely_cost": round(likely_cost, 2),
                    "max_cost": round(max_cost, 2)
                })

        # Calculate grand totals
        grand_min = sum(v["min"] for v in totals.values())
        grand_likely = sum(v["likely"] for v in totals.values())
        grand_max = sum(v["max"] for v in totals.values())

        # Format response
        response = {
            "status": "success",
            "location": {
                "state_code": state_code,
                "city_tier": city_tier,
                "factors": {
                    "material": round(MAT_FACTOR, 4),
                    "labour": round(LAB_FACTOR, 4),
                    "machinery": round(MAC_FACTOR, 4)
                }
            },
            "summary": {
                "material": {
                    "min": round(totals["Material"]["min"], 2),
                    "likely": round(totals["Material"]["likely"], 2),
                    "max": round(totals["Material"]["max"], 2)
                },
                "labour": {
                    "min": round(totals["Labour"]["min"], 2),
                    "likely": round(totals["Labour"]["likely"], 2),
                    "max": round(totals["Labour"]["max"], 2)
                },
                "machinery": {
                    "min": round(totals["Machinery"]["min"], 2),
                    "likely": round(totals["Machinery"]["likely"], 2),
                    "max": round(totals["Machinery"]["max"], 2)
                }
            },
            "grand_total": {
                "min": round(grand_min, 2),
                "likely": round(grand_likely, 2),
                "max": round(grand_max, 2)
            }
        }

        if detailed:
            response["items"] = item_details

        if missing_items:
            response["missing_items"] = sorted(set(missing_items))
            response["warning"] = f"{len(set(missing_items))} items need master data update"

        return response

    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

# ============================================================
# CLI INTERFACE
# ============================================================
def main():
    parser = argparse.ArgumentParser(description='Construction Price Estimation')
    
    parser.add_argument('--state', type=str, help='State code')
    parser.add_argument('--tier', type=str, help='City tier (T1/T2/T3)')
    parser.add_argument('--bom-file', type=str, help='BOM file path')
    parser.add_argument('--detailed', action='store_true', help='Include item-level details')
    parser.add_argument('--get-locations', action='store_true', help='Get available locations')
    parser.add_argument('--validate', action='store_true', help='Validate master files')
    
    args = parser.parse_args()
    
    # Handle different commands
    if args.validate:
        result = validate_master_files()
    elif args.get_locations:
        result = get_available_locations()
    elif args.state and args.tier:
        result = calculate_estimation(
            args.state.upper(),
            args.tier.upper(),
            args.bom_file,
            args.detailed
        )
    else:
        result = {
            "status": "error",
            "message": "Missing required arguments. Use --state and --tier, or --get-locations, or --validate"
        }
    
    # Output JSON
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()