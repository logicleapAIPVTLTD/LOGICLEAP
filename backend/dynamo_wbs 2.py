import os
import json
import numpy as np
import pandas as pd
import boto3
from decimal import Decimal

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.linear_model import LogisticRegression
import joblib

# ======================================================
# CONFIG
# ======================================================
MODEL_DIR = "models"
os.makedirs(MODEL_DIR, exist_ok=True)

TFIDF_FILE = os.path.join(MODEL_DIR, "tfidf_work.joblib")
INDUSTRY_MODEL_FILE = os.path.join(MODEL_DIR, "industry_model.joblib")
INDUSTRY_VECT_FILE = os.path.join(MODEL_DIR, "industry_vector.joblib")

SIMILARITY_THRESHOLD = 0.35
STANDARD_LINEAR_LENGTH = 100

# ======================================================
# DYNAMODB CONFIG
# ======================================================
DDB_TABLE_NAME = "WBS_MASTER_V2"
AWS_REGION = os.getenv("AWS_REGION", "ap-south-2")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID", "")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY", "")

# ======================================================
# HELPERS
# ======================================================
def normalize(text):
    return str(text).lower().strip()

def ddb_to_python(val):
    if isinstance(val, Decimal):
        return float(val)
    return val

# ======================================================
# LOAD DATA FROM DYNAMODB
# ======================================================
def load_wbs_master_from_dynamodb():
    print("🔄 Loading WBS master from DynamoDB...")

    dynamodb = boto3.resource(
        "dynamodb",
        region_name=AWS_REGION,
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY
    )

    table = dynamodb.Table(DDB_TABLE_NAME)

    items = []
    response = table.scan()
    items.extend(response.get("Items", []))

    while "LastEvaluatedKey" in response:
        response = table.scan(
            ExclusiveStartKey=response["LastEvaluatedKey"]
        )
        items.extend(response.get("Items", []))

    if not items:
        raise RuntimeError("❌ No WBS records found in DynamoDB")

    clean_items = []
    for it in items:
        clean_items.append({k: ddb_to_python(v) for k, v in it.items()})

    df = pd.DataFrame(clean_items)

    # normalize column names
    df.columns = df.columns.str.strip().str.lower()

    required_cols = [
        "work",
        "industry",
        "stage",
        "task",
        "wbs_task_id",
        "base_duration_days"
    ]

    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        raise ValueError(f"❌ Missing columns in DynamoDB data: {missing}")

    print(f"✅ Loaded {len(df)} WBS rows from DynamoDB")
    return df

# ======================================================
# LOAD DATA (FINAL)
# ======================================================
df = load_wbs_master_from_dynamodb()

# text normalization column (USED BY ML)
df["work_norm"] = df["work"].apply(normalize)
# ======================================================
# TF-IDF REFERENCE TABLE (UNIQUE WORKS ONLY)
# ======================================================
TFIDF_DF = (
    df[["work", "industry", "work_norm"]]
    .drop_duplicates(subset=["work"])
    .reset_index(drop=True)
)


# ======================================================
# ALIAS MAP (INDUSTRY-FOCUSED)
# ======================================================
ALIAS_MAP = {
    # ---- Plumbing / Pipeline ----
    "cpvc": ["plumbing", "pipeline", "pipe"],
    "pvc": ["plumbing", "pipeline", "pipe"],
    "hdpe": ["pipeline", "pipe"],
    "gi": ["pipeline", "pipe"],
    "piping": ["pipeline", "pipe"],
    "pipes": ["pipeline", "pipe"],
    "waterline": ["pipeline"],
    "pipeline": ["pipeline"],
    "sewer": ["sewer"],
    "manhole": ["sewer"],
    "drain": ["drainage"],
    "drainage": ["drainage"],

    # ---- Roads / Infrastructure ----
    "road": ["road"],
    "highway": ["road"],
    "street": ["road"],
    "bitumen": ["road"],
    "asphalt": ["road"],
    "concrete road": ["road"],
    "footpath": ["footpath"],
    "culvert": ["culvert"],
    "bridge": ["bridge"],
    "canal": ["canal"],
    "retaining": ["retaining"],

    # ---- Interior ----
    "wiring": ["electrical"],
    "cable": ["electrical"],
    "switch": ["electrical"],
    "lighting": ["lighting"],
    "false ceiling": ["ceiling"],
    "gypsum": ["ceiling"],
    "painting": ["painting"],
    "paint": ["painting"],
    "tiles": ["flooring"],
    "tiling": ["flooring"],
    "floor": ["flooring"],
    "plumbing": ["plumbing"],
    "kitchen": ["kitchen"],
    "carpentry": ["carpentry"],
    "furniture": ["furniture"],
    "partition": ["partition"],

    # ---- Tank Cleaning ----
    "sump": ["sump"],
    "oht": ["oht"],
    "overhead tank": ["oht"],
    "septic": ["septic"],
    "stp": ["stp"],
    "etp": ["etp"],
    "tank cleaning": ["tank"],
    "sludge": ["sludge"],
    "disinfection": ["disinfection"],
    "pipeline flushing": ["pipeline"],

    # ---- Service MSME ----
    "repair": ["service"],
    "maintenance": ["service"],
    "ac": ["ac"],
    "air conditioner": ["ac"],
    "housekeeping": ["housekeeping"],
    "facility": ["facility"],
    "pest": ["pest"],
    "solar": ["solar"],
    "lift": ["lift"],
    "fire": ["fire"],
    "cctv": ["cctv"],
    "security": ["security"],
    "cleaning": ["cleaning"]
}

# ======================================================
# AUTO DATASET KEYWORDS (FINAL AUTHORITY)
# ======================================================
KEYWORD_WORK_MAP = {}
for work in df["work"].unique():
    tokens = normalize(work).replace("-", " ").split()
    for t in tokens:
        if len(t) >= 4:
            KEYWORD_WORK_MAP.setdefault(t, set()).add(work)

# ======================================================
# INDUSTRY CLASSIFIER (CACHED)
# ======================================================
if os.path.exists(INDUSTRY_MODEL_FILE) and os.path.exists(INDUSTRY_VECT_FILE):
    industry_model = joblib.load(INDUSTRY_MODEL_FILE)
    industry_vector = joblib.load(INDUSTRY_VECT_FILE)
else:
    industry_vector = TfidfVectorizer(ngram_range=(1, 2))
    X = industry_vector.fit_transform(df["work_norm"])
    y = df["industry"]

    industry_model = LogisticRegression(max_iter=1000)
    industry_model.fit(X, y)

    joblib.dump(industry_model, INDUSTRY_MODEL_FILE)
    joblib.dump(industry_vector, INDUSTRY_VECT_FILE)

def predict_industry(text):
    return industry_model.predict(
        industry_vector.transform([normalize(text)])
    )[0]

# ======================================================
# TF-IDF WORK MATCHING
# ======================================================
if os.path.exists(TFIDF_FILE):
    tfidf, tfidf_matrix = joblib.load(TFIDF_FILE)
else:
    tfidf = TfidfVectorizer(ngram_range=(1, 2))
    tfidf_matrix = tfidf.fit_transform(TFIDF_DF["work_norm"])

    joblib.dump((tfidf, tfidf_matrix), TFIDF_FILE)

# ======================================================
# MATCH WORK (4-STAGE GUARANTEED)
# ======================================================
def match_work(user_text, industry):
    user_text_norm = normalize(user_text)

    # ---------- 1. TF-IDF SEMANTIC ----------
    user_vec = tfidf.transform([user_text_norm])
    candidates = TFIDF_DF[TFIDF_DF["industry"] == industry]

    if not candidates.empty:
        cand_matrix = tfidf_matrix[candidates.index]
        scores = cosine_similarity(user_vec, cand_matrix)[0]
        best_idx = scores.argmax()
        best_score = scores[best_idx]

        if best_score >= SIMILARITY_THRESHOLD:
            return candidates.iloc[best_idx]["work"], best_score, "semantic"

    # ---------- 2. ALIAS-BASED MATCH ----------
    expanded_tokens = set(user_text_norm.split())
    for t in list(expanded_tokens):
        expanded_tokens.update(ALIAS_MAP.get(t, []))

    for token in expanded_tokens:
        for work in KEYWORD_WORK_MAP.get(token, []):
            if df[df["work"] == work]["industry"].iloc[0] == industry:
                return work, 0.60, "alias_based"

    # ---------- 3. DATASET KEYWORD RULE ----------
    for token in user_text_norm.split():
        if token in KEYWORD_WORK_MAP:
            for work in KEYWORD_WORK_MAP[token]:
                if df[df["work"] == work]["industry"].iloc[0] == industry:
                    return work, 0.50, "rule_based"

    # ---------- 4. SAFE FALLBACK ----------
    safe_work = df[df["industry"] == industry]["work"].iloc[0]
    return safe_work, 0.40, "safe_fallback"

# ======================================================
# PROJECT SCALE
# ======================================================
def project_scale(length, breadth):
    if length is None:
        return "Small", 1.0

    area = length * (breadth if breadth else 1)
    if area < 1000:
        return "Small", 0.7
    elif area < 5000:
        return "Medium", 1.0
    return "Large", 1.4

def is_linear_task(task):
    return any(k in task.lower() for k in ["laying", "excavation", "installation", "construction"])

# ======================================================
# WBS GENERATION
# ======================================================
def generate_wbs(work_input, length=None, breadth=None, season="normal"):
    industry = predict_industry(work_input)

    matched_work, confidence, match_type = match_work(work_input, industry)

    scale, scale_factor = project_scale(length, breadth)
    length_factor = max(1, (length or STANDARD_LINEAR_LENGTH) / STANDARD_LINEAR_LENGTH)
    season_factor = {"normal": 1.0, "monsoon": 1.2, "festival": 1.1}.get(season, 1.0)

    wbs_df = df[df["work"] == matched_work].copy()

    # ======================================================
    # FIX: ENFORCE LOGICAL WBS STAGE ORDER (NO LOGIC CHANGE)
    # ======================================================
    STAGE_ORDER = {
        "planning": 1,
        "ordering materials": 2,
        "execution": 3,
        "qc check": 4,
        "qc": 4,
        "billing": 5
    }

    wbs_df["stage_order"] = (
        wbs_df["stage"]
        .str.lower()
        .map(STAGE_ORDER)
        .fillna(99)
    )

    wbs_df = wbs_df.sort_values(["stage_order", "wbs_task_id"])

    # ======================================================
    # WBS CALCULATION (UNCHANGED)
    # ======================================================
    output, total_days = [], 0

    for _, r in wbs_df.iterrows():
        days = r["base_duration_days"] * scale_factor * season_factor
        if is_linear_task(r["task"]):
            days *= length_factor

        days = int(np.ceil(days))
        total_days += days

        output.append({
            "stage": r["stage"],
            "task_id": r["wbs_task_id"],
            "task": r["task"],
            "final_days": days
        })

    return {
        "input_work": work_input,
        "industry": industry,
        "matched_work": matched_work,
        "match_type": match_type,
        "confidence": round(confidence, 2),
        "total_days": total_days,
        "wbs": output
    }

# ======================================================
# CLI
# ======================================================
if __name__ == "__main__":
    work = input("Enter work: ").strip()
    length = input("Length: ").strip()
    breadth = input("Breadth: ").strip()
    season = input("Season (normal/monsoon/festival): ").strip() or "normal"

    result = generate_wbs(
        work,
        float(length) if length else None,
        float(breadth) if breadth else None,
        season
    )

    print("\n========== WBS OUTPUT ==========\n")
    print(json.dumps(result, indent=2))
