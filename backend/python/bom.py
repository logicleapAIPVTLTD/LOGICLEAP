import pandas as pd
import re
import json
import sys
import argparse
from pathlib import Path
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from fuzzywuzzy import fuzz
import math

# =====================================================================
# 🔹 LOAD DATA (OS-INDEPENDENT PATH)
# =====================================================================
BASE_DIR = Path(__file__).resolve().parent
DEFAULT_DATA_PATH = BASE_DIR / "data" / "mat_quan.xlsx"

def load_data(file_path=None):
    """Load Excel data file"""
    if file_path is None:
        file_path = DEFAULT_DATA_PATH
    
    df = pd.read_excel(file_path)
    
    # Remove unnecessary columns if present
    drop_cols = ["Category", "Mandatory_Flag", "Input_Parameter"]
    df = df.drop(columns=[c for c in drop_cols if c in df.columns])
    
    return df

# ---------------------------------------------------------------------
# 🔹 DOMAIN KEYWORDS
# ---------------------------------------------------------------------
DOMAIN_KEYWORDS = {
    "road": ["road", "highway", "pavement", "bitumen", "gsb", "wmm", "km", "resurfacing"],
    "building": ["building", "construction", "civil", "foundation"],
    "interior": ["interior", "renovation", "false ceiling", "painting", "tiling", "flooring", "showroom"],
    "flooring": ["tile", "tiling", "floor", "granite", "marble"],
    "painting": ["paint", "painting", "primer", "putty"],
    "electrical": ["electrical", "wiring", "mcbs", "panel", "lighting", "socket"],
    "plumbing": ["plumbing", "pipe", "bathroom", "kitchen sink", "water line"],
    "tank": ["tank", "sump", "reservoir", "overhead", "underground cleaning"],
    "drainage": ["drainage", "culvert", "storm water", "pipeline"],
    "cleaning": ["cleaning", "office cleaning", "scrubbing"],
    "carpentry": ["carpenter", "wood", "plywood", "wardrobe"],
    "modular": ["modular kitchen", "kitchen cabinets"],
}

def detect_domain(user_text):
    text = user_text.lower()
    domain_scores = {}

    for domain, keywords in DOMAIN_KEYWORDS.items():
        score = 0
        for kw in keywords:
            if kw in text:
                score += 15
            score += fuzz.partial_ratio(text, kw) / 10
        domain_scores[domain] = score

    best_domain = max(domain_scores, key=lambda x: domain_scores[x])
    if domain_scores[best_domain] < 20:
        return None
    return best_domain

def match_work_type(user_text, domain, work_types, work_texts, tfidf, tfidf_matrix):
    user_text = user_text.lower()
    user_vec = tfidf.transform([user_text])
    scores = []

    for i, wt in enumerate(work_types):
        wt_text = work_texts[i].lower()

        if domain and domain not in wt_text:
            continue

        tfidf_score = cosine_similarity(user_vec, tfidf_matrix[i])[0][0] * 100
        fuzzy_score = fuzz.token_set_ratio(user_text, wt_text)

        final_score = (0.6 * tfidf_score) + (0.4 * fuzzy_score)
        scores.append((wt, final_score))

    if not scores:
        return None

    scores.sort(key=lambda x: x[1], reverse=True)
    best_wt, best_score = scores[0]

    return best_wt if best_score >= 30 else None

def ceil_min(val, min_val=1):
    return max(min_val, int(math.ceil(val)))

def calculate_quantity(row, area_sqm, length, project_days, tank_capacity=None):
    """Calculate quantity for each BOM item - EXACT LOGIC FROM ORIGINAL"""
    item = row["Item_Name"].lower()
    unit = row["Unit"].lower()
    norm = float(row["Norm_Value"]) if pd.notna(row["Norm_Value"]) else 0
    work = row["Work_Type"].lower()

    # TANK CLEANING
    if "tank" in work:
        if not tank_capacity:
            tank_capacity = area_sqm * 100
        
        if "cleaning chemical" in item:
            return ceil_min(tank_capacity / 5000)
        if "disinfectant" in item:
            return ceil_min(tank_capacity / 10000)
        if "bleaching" in item:
            return ceil_min(tank_capacity / 20000)
        if "blower" in item:
            return 1
        if "staff" in item:
            return ceil_min(tank_capacity / (20000 * project_days))
        if unit in ["numbers", "sets"]:
            return ceil_min(tank_capacity / 1500)
        return 1

    # FLOORING / TILING
    if "tiling" in work or "floor" in work:
        if "tile" in item and unit in ["sqft", "sqm"]:
            return ceil_min(area_sqm)
        if "adhesive" in item:
            return ceil_min(area_sqm * 0.25)
        if "grout" in item or "levelling" in item:
            return ceil_min(area_sqm / 50)
        if "cutter" in item:
            return ceil_min(area_sqm / (200 * project_days))
        if "mason" in item:
            return ceil_min(area_sqm / (30 * project_days))
        return ceil_min(area_sqm * norm)

    # INTERIOR DESIGN
    if "interior" in work:
        if unit in ["sqft", "sqm"] and ("plywood" in item or "laminate" in item):
            return ceil_min(area_sqm)
        if "edge band" in item:
            return ceil_min(area_sqm * 1)
        if "adhesive" in item:
            return ceil_min(area_sqm / 20)
        if "carpenter" in item:
            return ceil_min(area_sqm / (20 * project_days))
        if unit in ["numbers", "sets"]:
            return ceil_min(area_sqm / 10)
        return ceil_min(area_sqm * norm)

    # CARPENTRY
    if "carpentry" in work:
        if "carpenter" in item:
            return ceil_min(area_sqm / (20 * project_days))
        return ceil_min(area_sqm * norm)

    # INDUSTRIAL CLEANING
    if "industrial cleaning" in work:
        staff = ceil_min(area_sqm / (10 * project_days))
        staff = min(staff, 40)
        if "staff" in item or "crew" in item:
            return staff
        if unit in ["sets", "numbers"]:
            return ceil_min(staff * 2)
        if "jet" in item or "pressure" in item:
            return ceil_min(area_sqm / 100)
        return ceil_min(area_sqm * norm)

    # CLEANING
    if "cleaning" in work:
        if "hospital" in work:
            staff = ceil_min(area_sqm / (25 * project_days))
        else:
            staff = ceil_min(area_sqm / (200 * project_days))
        
        if "staff" in item:
            return staff
        if unit in ["sets", "numbers"]:
            return ceil_min(staff * 2)
        if "vacuum" in item:
            return ceil_min(area_sqm / 1000)
        return ceil_min(area_sqm * norm)

    # ROAD
    if "road" in work:
        if unit not in ["machine-days", "man-days"]:
            return round(area_sqm * norm, 2)
        if "paver" in item:
            return ceil_min(area_sqm / (800 * project_days))
        if "roller" in item:
            return ceil_min(area_sqm / (600 * project_days))
        if "tipper" in item:
            volume = area_sqm * 0.15
            return ceil_min(volume / (50 * project_days))
        if "labor" in item:
            return ceil_min(area_sqm / (25 * project_days))
        return 1

    # BUILDING
    if "building" in work:
        thickness = 0.15
        volume = area_sqm * thickness
        
        if unit in ["bags", "m3", "kg"]:
            return ceil_min(volume * norm)
        if unit == "numbers":
            return ceil_min(norm * 10)
        if "excavator" in item:
            return ceil_min(area_sqm / 2000)
        if "labor" in item:
            return ceil_min(area_sqm / (40 * project_days))
        return 1

    # PLUMBING
    if "plumbing" in work:
        fixtures = ceil_min(area_sqm / 30)
        if "pipe" in item:
            return ceil_min(length * norm)
        if unit in ["numbers", "sets"]:
            return fixtures
        if "plumber" in item:
            return ceil_min(fixtures / 6)
        return 1

    # PAINTING
    if "paint" in work:
        if "painter" in item:
            return ceil_min(area_sqm / (30 * project_days))
        return ceil_min(area_sqm * norm)

    # ELECTRICAL
    if "electrical" in work:
        wire_per_sqm = 1.25
        conduit_per_sqm = 1.1
        points = ceil_min(area_sqm / 12)
        
        if "wire" in item:
            return ceil_min(area_sqm * wire_per_sqm)
        if "conduit" in item:
            return ceil_min(area_sqm * conduit_per_sqm)
        if "junction" in item or "switch" in item:
            return points
        if "electrician" in item:
            return max(8, ceil_min(points / (12 * project_days)))
        if "tape" in item:
            return ceil_min(points / 40)
        return 1

    # FALLBACK
    return ceil_min(area_sqm * norm)

def generate_bom(user_work, length, breadth, project_days=10, tank_capacity=None, data_file=None):
    """Generate BOM prediction - EXACT LOGIC FROM ORIGINAL"""
    
    # Load data
    df = load_data(data_file)
    
    # Extract work types
    work_types = df["Work_Type"].unique().tolist()
    
    # Build enriched text per work type
    work_text_map = (
        df.groupby("Work_Type")["Item_Name"]
          .apply(lambda x: " ".join(x.astype(str)))
          .to_dict()
    )
    
    work_texts = [
        f"{wt} {work_text_map.get(wt, '')}"
        for wt in work_types
    ]
    
    # Build TF-IDF model
    tfidf = TfidfVectorizer(stop_words="english", ngram_range=(1, 2))
    tfidf_matrix = tfidf.fit_transform(work_texts)
    
    # Detect domain and work type
    domain = detect_domain(user_work)
    work_type = match_work_type(user_work, domain, work_types, work_texts, tfidf, tfidf_matrix)
    
    if work_type is None:
        work_type = match_work_type(user_work, None, work_types, work_texts, tfidf, tfidf_matrix)
    
    if work_type is None:
        return {
            "error": "No suitable Work Type found",
            "domain": domain
        }
    
    area = length * breadth
    
    # Filter BOM items
    subset = df[df["Work_Type"] == work_type].copy()
    
    if subset.empty:
        return {
            "error": "No BOM items found for work type",
            "work_type": work_type,
            "domain": domain
        }
    
    # Calculate quantities
    subset["Predicted_Quantity"] = subset.apply(
        lambda row: calculate_quantity(
            row=row,
            area_sqm=area,
            length=length,
            project_days=project_days,
            tank_capacity=tank_capacity
        ),
        axis=1
    )
    
    # Unit conversion
    subset.loc[subset["Unit"].str.lower() == "machine-days", "Unit"] = "machines"
    subset.loc[subset["Unit"].str.lower() == "man-days", "Unit"] = "persons"
    
    result = subset[["Item_Name", "Unit", "Predicted_Quantity"]]
    
    # Convert to JSON-serializable format
    bom_items = result.to_dict('records')
    
    return {
        "domain": domain,
        "work_type": work_type,
        "area_sqm": area,
        "length": length,
        "breadth": breadth,
        "project_days": project_days,
        "tank_capacity": tank_capacity,
        "bom_items": bom_items,
        "total_items": len(bom_items)
    }

def main():
    parser = argparse.ArgumentParser(description='BOM Prediction System')
    parser.add_argument('--user-work', type=str, help='Work description')
    parser.add_argument('--length', type=float, help='Length in meters')
    parser.add_argument('--breadth', type=float, help='Breadth in meters')
    parser.add_argument('--project-days', type=int, default=10, help='Project duration in days')
    parser.add_argument('--tank-capacity', type=float, help='Tank capacity in liters')
    parser.add_argument('--data-file', type=str, help='Custom data file path')
    parser.add_argument('--get-work-types', action='store_true', help='Get all work types')
    parser.add_argument('--get-domains', action='store_true', help='Get all domains')
    parser.add_argument('--health-check', action='store_true', help='Health check')
    
    args = parser.parse_args()
    
    try:
        if args.health_check:
            df = load_data()
            result = {
                "status": "healthy",
                "python_version": sys.version,
                "data_loaded": True,
                "total_records": len(df)
            }
            print(json.dumps(result))
            sys.exit(0)
        
        if args.get_work_types:
            df = load_data()
            work_types = df["Work_Type"].unique().tolist()
            result = {"work_types": work_types}
            print(json.dumps(result))
            sys.exit(0)
        
        if args.get_domains:
            result = {"domains": list(DOMAIN_KEYWORDS.keys())}
            print(json.dumps(result))
            sys.exit(0)
        
        # Generate BOM
        result = generate_bom(
            user_work=args.user_work,
            length=args.length,
            breadth=args.breadth,
            project_days=args.project_days,
            tank_capacity=args.tank_capacity,
            data_file=args.data_file
        )
        
        print(json.dumps(result))
        sys.exit(0)
        
    except Exception as e:
        error_result = {
            "error": str(e),
            "type": type(e).__name__
        }
        print(json.dumps(error_result), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()