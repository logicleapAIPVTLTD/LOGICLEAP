# # #!/usr/bin/env python3
# # """
# # WBS API Script - CLI interface for Node.js integration
# # """

# # import sys
# # import json
# # import uuid
# # import warnings
# # from typing import List, Dict, Any, Optional

# # import numpy as np
# # import pandas as pd
# # import boto3
# # from decimal import Decimal

# # from sklearn.feature_extraction.text import TfidfVectorizer
# # from sklearn.preprocessing import MultiLabelBinarizer, OneHotEncoder
# # from sklearn.model_selection import train_test_split
# # from sklearn.linear_model import LogisticRegression
# # from sklearn.multiclass import OneVsRestClassifier
# # from sklearn.ensemble import RandomForestRegressor
# # from sklearn.metrics import mean_absolute_percentage_error

# # warnings.filterwarnings("ignore")

# # # ============= Configuration =============
# # # Prevent multiprocessing issues
# # import os
# # os.environ['LOKY_MAX_CPU_COUNT'] = '1'

# # # Reduce memory usage
# # import gc
# # gc.set_threshold(50, 5, 5)  # More aggressive garbage collection
# # HOURS_PER_DAY = 8.0
# # RANDOM_SEED = 42
# # np.random.seed(RANDOM_SEED)

# # TASK_DURATION_BASE_HOURS = {
# #     "site measurement": 2.0, "layout marking": 3.0, "surface preparation": 6.0,
# #     "putty application": 4.0, "primer application": 3.0, "paint coat 1": 3.0,
# #     "paint coat 2": 3.0, "finishing": 8.0, "touchup": 2.0,
# #     "adhesive application": 4.0, "tile laying": 12.0, "grouting": 6.0,
# #     "edge finishing": 4.0, "frame fabrication": 10.0, "panel installation": 6.0,
# #     "screw fixing": 2.0, "board installation": 6.0, "channel fixing": 4.0,
# #     "joint taping": 3.0, "pipe cutting": 2.0, "pipe installation": 6.0,
# #     "joint sealing": 3.5, "pressure testing": 3.0, "conduit installation": 6.0,
# #     "cable pulling": 6.0, "db fabrication": 8.0, "testing and earthing": 2.5,
# #     "sludge removal": 4.0, "scrubbing": 4.0, "chemical cleaning": 6.0,
# #     "rinsing": 2.0, "disinfection": 2.0, "drying": 1.0, "excavation": 12.0,
# #     "rebar placement": 10.0, "formwork setup": 10.0, "concrete pouring": 12.0,
# #     "curing": 16.0, "__default__": 6.0
# # }

# # # ============= Helper Functions =============

# # def ddb_to_python(value):
# #     """Convert DynamoDB Decimal to Python types"""
# #     if isinstance(value, list):
# #         return [ddb_to_python(v) for v in value]
# #     if isinstance(value, dict):
# #         return {k: ddb_to_python(v) for k, v in value.items()}
# #     if isinstance(value, Decimal):
# #         return float(value)
# #     return value

# # def normalize_text(s: str) -> str:
# #     """Normalize text for consistency"""
# #     if not isinstance(s, str):
# #         return ""
# #     return " ".join(s.strip().lower().replace("_", " ").split())

# # def normalize_subcat_name(s: str) -> str:
# #     """Normalize subcategory name"""
# #     if s is None:
# #         return ""
# #     return str(s).strip().lower().replace(" ", "")

# # def safe_json_load(s: str):
# #     """Safely load JSON"""
# #     try:
# #         return json.loads(s)
# #     except Exception:
# #         return None

# # def parse_stages(cell: str) -> List[int]:
# #     """Parse stages from various formats"""
# #     if pd.isna(cell):
# #         return []
# #     s = str(cell).strip()
# #     v = safe_json_load(s)
# #     if isinstance(v, list):
# #         try:
# #             return [int(x) for x in v]
# #         except:
# #             pass
# #     s2 = s.replace("[","").replace("]","").replace('"',"")
# #     parts = [p.strip() for p in s2.split(",") if p.strip().isdigit()]
# #     return [int(p) for p in parts]

# # def parse_tasks(cell: str) -> List[str]:
# #     """Parse tasks from various formats"""
# #     if pd.isna(cell):
# #         return []
# #     s = str(cell)
# #     v = safe_json_load(s)
# #     if isinstance(v, list):
# #         return [normalize_text(x) for x in v]
# #     if ";" in s:
# #         return [normalize_text(x) for x in s.split(";") if x.strip()]
# #     if "," in s:
# #         return [normalize_text(x) for x in s.split(",") if x.strip()]
# #     return [normalize_text(s)]

# # def generate_fixed_stages(n_tasks: int) -> List[int]:
# #     """Generate fixed stages for tasks"""
# #     stages = []
# #     for i in range(n_tasks):
# #         if i == 0:
# #             stages.append(1)
# #         elif i == 1:
# #             stages.append(2)
# #         elif i == n_tasks - 2:
# #             stages.append(4)
# #         elif i == n_tasks - 1:
# #             stages.append(5)
# #         else:
# #             stages.append(3)
# #     return stages

# # # ============= DynamoDB Functions =============

# # def get_dynamodb_resource():
# #     """Get DynamoDB resource (local or AWS)"""
# #     try:
# #         # endpoint_url = "http://localhost:8000"
# #         dynamodb = boto3.resource(
# #             'dynamodb',
# #             # endpoint_url=endpoint_url,
# #             region_name='ap-south-2',
# #             aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID", ""),
# #             aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY", "")
# #         )
    
# #         return dynamodb
# #     except Exception as e:
# #         print(json.dumps({"error": f"Failed to connect to DynamoDB: {str(e)}"}), file=sys.stderr)
# #         sys.exit(1)

# # def load_boq_dataset_from_dynamodb(table_name="MSME_BOQ_WBS") -> pd.DataFrame:
# #     """Load BOQ dataset from DynamoDB"""
# #     try:
# #         dynamodb = get_dynamodb_resource()
# #         table = dynamodb.Table(table_name)
        
# #         # Test connection
# #         table.load()
        
# #         response = table.scan()
# #         items = response.get("Items", [])
        
# #         # Handle pagination
# #         while "LastEvaluatedKey" in response:
# #             response = table.scan(ExclusiveStartKey=response["LastEvaluatedKey"])
# #             items.extend(response.get("Items", []))
        
# #         if not items:
# #             raise ValueError(f"No data found in table {table_name}")
        
# #         clean_items = [ddb_to_python(i) for i in items]
# #         df = pd.DataFrame(clean_items)
        
# #         df["boq_text"] = df["boq_text"].astype(str)
        
# #         if "subcategory" not in df.columns:
# #             df["subcategory"] = "general"
# #         df["subcategory"] = df["subcategory"].fillna("general").astype(str).apply(normalize_subcat_name)
        
# #         for col in ["quantity", "rate_most", "rate_min", "rate_max", "confidence"]:
# #             if col not in df.columns:
# #                 df[col] = 0.0
# #             df[col] = df[col].apply(lambda x: float(x) if x not in [None, ""] else 0.0)
        
# #         df["tasks_list"] = df["tasks_list"].apply(lambda x: [normalize_text(t) for t in x])
# #         df["stages_list"] = df["stages_list"].apply(lambda x: [int(s) for s in x])
        
# #         # Deduplicate
# #         df = df.drop_duplicates(subset=["boq_text"], keep="first").reset_index(drop=True)
        
# #         # Fix mismatched tasks/stages
# #         for i, r in df.iterrows():
# #             if len(r["tasks_list"]) != len(r["stages_list"]):
# #                 df.at[i, "stages_list"] = generate_fixed_stages(len(r["tasks_list"]))
        
# #         return df
        
# #     except Exception as e:
# #         print(json.dumps({"error": f"Failed to load BOQ data: {str(e)}"}), file=sys.stderr)
# #         sys.exit(1)

# # # ============= Model Training Functions =============

# # def build_subcat_task_map(df: pd.DataFrame) -> Dict[str, List[str]]:
# #     """Build mapping of subcategories to tasks"""
# #     mapping = {}
# #     for _, r in df.iterrows():
# #         sub = r["subcategory"]
# #         if sub not in mapping:
# #             mapping[sub] = set()
# #         mapping[sub].update(r["tasks_list"])
# #     return {k: sorted(list(v)) for k, v in mapping.items()}

# # def detect_subcategory(boq_text: str, subcat_map: Dict[str, List[str]]) -> Optional[str]:
# #     """Detect subcategory from BOQ text"""
# #     text = (boq_text or "").lower()
    
# #     for sub in subcat_map.keys():
# #         if sub in text:
# #             return sub
    
# #     # Keyword-based detection
# #     tiling_kw = ["tile", "tiles", "tiling", "vitrified", "ceramic", "granite", "marble",
# #                  "porcelain", "grout", "grouting", "adhesive", "flooring"]
# #     if any(w in text for w in tiling_kw):
# #         return "tiling"
    
# #     painting_kw = ["paint", "painting", "primer", "putty", "emulsion", "coat",
# #                    "finish coat", "touchup", "distemper"]
# #     if any(w in text for w in painting_kw):
# #         return "painting"
    
# #     ceiling_kw = ["gypsum", "false ceiling", "ceiling board", "grid ceiling",
# #                   "pop", "channel fixing"]
# #     if any(w in text for w in ceiling_kw):
# #         return "falseceiling"
    
# #     piping_kw = ["pipe", "piping", "plumbing", "upvc", "cpvc", "gi pipe",
# #                  "pressure testing", "valve"]
# #     if any(w in text for w in piping_kw):
# #         return "piping"
    
# #     electrical_kw = ["wiring", "cable", "conduit", "earthing", "mccb", "db",
# #                      "electrical", "switch", "socket", "panel board"]
# #     if any(w in text for w in electrical_kw):
# #         return "wiring"
    
# #     tank_kw = ["sump", "tank", "cleaning", "desludging", "disinfection",
# #                "chlorination", "scrubbing"]
# #     if any(w in text for w in tank_kw):
# #         return "tankcleaning"
    
# #     return None

# # def prepare_task_training(df: pd.DataFrame):
# #     """Prepare data for task training"""
# #     X = df["boq_text"].astype(str).tolist()
# #     mlb = MultiLabelBinarizer()
# #     Y = mlb.fit_transform(df["tasks_list"])
# #     return X, Y, mlb

# # # def train_task_classifier(X, Y):
# # #     """Train task classifier"""
# # #     vec = TfidfVectorizer(ngram_range=(1, 2), min_df=2)
# # #     X_vec = vec.fit_transform(X)
# # #     clf = OneVsRestClassifier(LogisticRegression(max_iter=3000), n_jobs=-1)
# # #     clf.fit(X_vec, Y)
# # #     return {"vectorizer": vec, "classifier": clf}

# # def train_task_classifier(X, Y):
# #     vec = TfidfVectorizer(ngram_range=(1, 2), min_df=2, max_features=1000)  # Limit features
# #     X_vec = vec.fit_transform(X)
# #     clf = OneVsRestClassifier(LogisticRegression(max_iter=1000))  # Remove n_jobs
# #     clf.fit(X_vec, Y)
# #     return {"vectorizer": vec, "classifier": clf}

# # def train_duration_model(X, y):
# #     rf = RandomForestRegressor(
# #         n_estimators=50,  # Reduce from 200
# #         max_depth=10,     # Reduce from 20
# #         random_state=RANDOM_SEED
# #     )
# #     rf.fit(X, y)
# #     return rf

# # def prepare_stage_training(df: pd.DataFrame):
# #     """Prepare data for stage training"""
# #     rows = []
# #     for _, r in df.iterrows():
# #         for t, st in zip(r["tasks_list"], r["stages_list"]):
# #             rows.append((t, st))
# #     X = [x[0] for x in rows]
# #     y = [x[1] for x in rows]
# #     return X, y

# # def train_stage_classifier(X, y):
# #     """Train stage classifier"""
# #     vec = TfidfVectorizer(ngram_range=(1, 2), min_df=1)
# #     X_vec = vec.fit_transform(X)
    
# #     X_train, X_val, y_train, y_val = train_test_split(
# #         X_vec, y, test_size=0.15, random_state=RANDOM_SEED
# #     )
    
# #     clf = LogisticRegression(max_iter=3000, multi_class="auto")
# #     clf.fit(X_train, y_train)
    
# #     return {"vectorizer": vec, "classifier": clf}

# # def compute_synthetic_task_duration_days(task_name: str, qty: float, region: str,
# #                                         season: str, grade: str, rate_most: float,
# #                                         rate_min: float, rate_max: float,
# #                                         confidence: float) -> float:
# #     """Compute synthetic task duration"""
# #     task = normalize_text(task_name)
# #     BASE = TASK_DURATION_BASE_HOURS.get(task, TASK_DURATION_BASE_HOURS["__default__"])
    
# #     qty_factor = 1.0 + np.clip(qty / 100.0, 0, 1.5)
# #     season_mul = {"normal": 1.0, "monsoon": 1.05, "festival": 1.03, "winter": 0.98}.get(
# #         season.lower(), 1.0
# #     )
# #     region_mul = {"central": 1.0, "south": 1.01, "north": 1.02, "east": 1.01, "west": 1.01}.get(
# #         region.lower(), 1.0
# #     )
# #     grade_mul = {"a": 0.97, "b": 1.00, "c": 1.03}.get(str(grade).lower(), 1.0)
    
# #     hours = BASE * qty_factor * season_mul * region_mul * grade_mul
# #     return max(hours / HOURS_PER_DAY, 0.01)

# # def prepare_duration_training(df: pd.DataFrame):
# #     """Prepare duration training data"""
# #     rows = []
# #     for _, r in df.iterrows():
# #         qty = float(r.get("quantity", 1.0) or 1.0)
# #         region = r.get("region", "central")
# #         season = r.get("season", "normal")
# #         grade = r.get("grade", "B")
# #         rate_most = float(r.get("rate_most") if not pd.isna(r.get("rate_most")) else 0.0)
# #         rate_min = float(r.get("rate_min") if not pd.isna(r.get("rate_min")) else 0.0)
# #         rate_max = float(r.get("rate_max") if not pd.isna(r.get("rate_max")) else 0.0)
# #         confidence = float(r.get("confidence") if not pd.isna(r.get("confidence")) else 1.0)
        
# #         for t in r["tasks_list"]:
# #             dur_days = compute_synthetic_task_duration_days(
# #                 t, qty, region, season, grade, rate_most, rate_min, rate_max, confidence
# #             )
# #             rows.append({
# #                 "task": t, "region": region, "season": season, "grade": grade,
# #                 "log_qty": np.log1p(qty), "rate_most": rate_most,
# #                 "rate_min": rate_min, "rate_max": rate_max,
# #                 "confidence": confidence, "duration_days": dur_days
# #             })
    
# #     df_t = pd.DataFrame(rows)
# #     text_vec = TfidfVectorizer(ngram_range=(1, 2), min_df=1)
# #     X_txt = text_vec.fit_transform(df_t["task"])
    
# #     cat_cols = ["region", "season", "grade"]
# #     ohe = OneHotEncoder(handle_unknown="ignore", sparse_output=False)
# #     X_cat = ohe.fit_transform(df_t[cat_cols])
    
# #     num_cols = ["log_qty", "rate_most", "rate_min", "rate_max", "confidence"]
# #     X_num = df_t[num_cols].fillna(0).values
    
# #     X = np.hstack([X_txt.toarray(), X_cat, X_num])
# #     y = df_t["duration_days"].values
    
# #     duration_meta = {
# #         "text_vec": text_vec, "ohe": ohe,
# #         "cat_cols": cat_cols, "num_cols": num_cols
# #     }
    
# #     return X, y, duration_meta

# # def train_duration_model(X, y):
# #     """Train duration model"""
# #     X_train, X_val, y_train, y_val = train_test_split(
# #         X, y, test_size=0.15, random_state=RANDOM_SEED
# #     )
# #     rf = RandomForestRegressor(n_estimators=200, max_depth=20, random_state=RANDOM_SEED, n_jobs=-1)
# #     rf.fit(X_train, y_train)
# #     return rf

# # def predict_tasks(boq_text: str, task_model: Dict[str, Any],
# #                  mlb: MultiLabelBinarizer, top_k: int = 12):
# #     """Predict tasks from BOQ text"""
# #     vec = task_model["vectorizer"].transform([boq_text])
# #     probs = task_model["classifier"].predict_proba(vec)[0]
# #     idx = np.argsort(probs)[::-1]
# #     tasks = [mlb.classes_[i] for i in idx[:top_k]]
# #     return [normalize_text(t) for t in tasks]

# # def duration_features_for_inference(task_name: str, qty: float, region: str,
# #                                    season: str, grade: str, rate_most: float,
# #                                    rate_min: float, rate_max: float,
# #                                    confidence: float, duration_meta: Dict[str, Any]):
# #     """Generate duration features for inference"""
# #     txt = duration_meta["text_vec"].transform([task_name]).toarray()
# #     cat_vals = [[region, season, grade]]
# #     X_cat = duration_meta["ohe"].transform(cat_vals)
# #     X_num = np.array([[np.log1p(qty), float(rate_most or 0.0),
# #                       float(rate_min or 0.0), float(rate_max or 0.0),
# #                       float(confidence or 1.0)]])
# #     return np.hstack([txt, X_cat, X_num])

# # def predict_duration_pert(task_name, qty, region, season, grade,
# #                          rate_most, rate_min, rate_max, confidence,
# #                          duration_model, duration_meta):
# #     """Predict PERT duration"""
# #     X = duration_features_for_inference(
# #         task_name, qty, region, season, grade,
# #         rate_most, rate_min, rate_max, confidence,
# #         duration_meta
# #     )
# #     most_days = float(duration_model.predict(X)[0])
# #     most_days = max(most_days, 0.01)
    
# #     optimistic_days = max(0.3, most_days * 0.70)
# #     pessimistic_days = max(optimistic_days, most_days * 1.40)
# #     expected_days = (optimistic_days + 4 * most_days + pessimistic_days) / 6.0
    
# #     return {
# #         "optimistic_hours": round(optimistic_days * HOURS_PER_DAY, 2),
# #         "most_likely_hours": round(most_days * HOURS_PER_DAY, 2),
# #         "pessimistic_hours": round(pessimistic_days * HOURS_PER_DAY, 2),
# #         "expected_hours": round(expected_days * HOURS_PER_DAY, 2)
# #     }

# # # ============= WBS Generation =============

# # def generate_wbs(item: Dict[str, Any], task_model: Dict[str, Any],
# #                 stage_model: Dict[str, Any], duration_model,
# #                 duration_meta: Dict[str, Any], mlb: MultiLabelBinarizer,
# #                 subcat_map: Dict[str, List[str]]) -> Dict[str, Any]:
# #     """Generate WBS from BOQ item"""
    
# #     boq = item.get("boq_text", "")
# #     qty = float(item.get("quantity", 1.0) or 1.0)
# #     region = item.get("region", "central")
# #     season = item.get("season", "normal")
# #     grade = item.get("grade", "B")
# #     rate_most = float(item.get("rate_most") or 0.0)
# #     rate_min = float(item.get("rate_min") or 0.0)
# #     rate_max = float(item.get("rate_max") or 0.0)
# #     confidence = float(item.get("confidence") or 1.0)
    
# #     # Detect subcategory
# #     input_subcat = item.get("subcategory")
# #     if input_subcat:
# #         input_subcat = normalize_subcat_name(input_subcat)
    
# #     detected_subcat = detect_subcategory(boq, subcat_map)
# #     subcat = detected_subcat or input_subcat or "general"
# #     subcat = normalize_subcat_name(subcat)
    
# #     allowed = subcat_map.get(subcat, [])
    
# #     # Predict tasks
# #     predicted = predict_tasks(boq, task_model, mlb, top_k=20)
    
# #     # Handle short text
# #     if len(boq.strip().split()) <= 2:
# #         tasks = allowed.copy()
# #     else:
# #         tasks = [t for t in allowed if t in predicted]
    
# #     # Fallback if too few tasks
# #     if len(tasks) < 3:
# #         tasks = allowed.copy()
    
# #     final = {
# #         "Planning": [],
# #         "Procurement": [],
# #         "Execution": [],
# #         "QC": [],
# #         "Billing": []
# #     }
    
# #     # Generate tasks
# #     for t in tasks:
# #         orig_stage = int(stage_model["classifier"]
# #                         .predict(stage_model["vectorizer"].transform([t]))[0])
        
# #         bucket = "Planning" if orig_stage in [1, 2] else "Execution"
# #         new_stage = 1 if bucket == "Planning" else 3
        
# #         dur = predict_duration_pert(
# #             t, qty, region, season, grade,
# #             rate_most, rate_min, rate_max, confidence,
# #             duration_model, duration_meta
# #         )
        
# #         final[bucket].append({
# #             "task_id": str(uuid.uuid4())[:6],
# #             "task_name": t,
# #             "stage": new_stage,
# #             "duration": dur
# #         })
    
# #     # Add Procurement
# #     def compute_procurement_duration(qty: float):
# #         base_hours = 1.5
# #         qty_factor = np.log1p(qty) * 0.35
# #         most = base_hours * (1 + qty_factor)
# #         optimistic = max(0.5, most * 0.70)
# #         pessimistic = most * 1.40
# #         expected = (optimistic + 4 * most + pessimistic) / 6.0
# #         return {
# #             "optimistic_hours": round(optimistic, 2),
# #             "most_likely_hours": round(most, 2),
# #             "pessimistic_hours": round(pessimistic, 2),
# #             "expected_hours": round(expected, 2)
# #         }
    
# #     final["Procurement"].append({
# #         "task_id": "PR001",
# #         "task_name": "material_procurement",
# #         "stage": 2,
# #         "duration": compute_procurement_duration(qty)
# #     })
    
# #     # Add QC
# #     final["QC"].append({
# #         "task_id": "QC001",
# #         "task_name": "quality_check",
# #         "stage": 4,
# #         "duration": {
# #             "optimistic_hours": 0.8,
# #             "most_likely_hours": 1.5,
# #             "pessimistic_hours": 2.2,
# #             "expected_hours": 1.23
# #         }
# #     })
    
# #     # Add Billing
# #     final["Billing"].append({
# #         "task_id": "BL001",
# #         "task_name": "final_billing",
# #         "stage": 5,
# #         "duration": {
# #             "optimistic_hours": 0.6,
# #             "most_likely_hours": 1.0,
# #             "pessimistic_hours": 1.6,
# #             "expected_hours": 1.03
# #         }
# #     })
    
# #     return {
# #         "boq_text": boq,
# #         "subcategory": subcat,
# #         "wbs": final,
# #         "wbs_id": str(uuid.uuid4())
# #     }

# # # ============= System Initialization =============

# # _WBS_CACHE = {
# #     "df": None,
# #     "subcat_map": None,
# #     "task_model": None,
# #     "stage_model": None,
# #     "duration_model": None,
# #     "duration_meta": None,
# #     "mlb": None
# # }

# # def initialize_wbs_system():
# #     """Initialize and cache WBS models"""
# #     global _WBS_CACHE
    
# #     if _WBS_CACHE["df"] is None:
# #         _WBS_CACHE["df"] = load_boq_dataset_from_dynamodb()
# #         _WBS_CACHE["subcat_map"] = build_subcat_task_map(_WBS_CACHE["df"])
        
# #         X_text, Y, mlb = prepare_task_training(_WBS_CACHE["df"])
# #         _WBS_CACHE["task_model"] = train_task_classifier(X_text, Y)
# #         _WBS_CACHE["mlb"] = mlb
        
# #         X_stage, y_stage = prepare_stage_training(_WBS_CACHE["df"])
# #         _WBS_CACHE["stage_model"] = train_stage_classifier(X_stage, y_stage)
        
# #         X_dur, y_dur, duration_meta = prepare_duration_training(_WBS_CACHE["df"])
# #         _WBS_CACHE["duration_model"] = train_duration_model(X_dur, y_dur)
# #         _WBS_CACHE["duration_meta"] = duration_meta
    
# #     return _WBS_CACHE

# # # ============= CSV Upload Functions =============

# # def load_wbs_csv(csv_path: str) -> pd.DataFrame:
# #     """Load WBS data from CSV"""
# #     try:
# #         df = pd.read_csv(csv_path)
        
# #         # Print columns for debugging
# #         print(f"CSV columns found: {df.columns.tolist()}", file=sys.stderr)
        
# #         # Normalize column names - remove spaces and convert to lowercase
# #         df.columns = df.columns.str.strip().str.lower().str.replace(' ', '_')
        
# #         # Map common variations to standard names
# #         column_mapping = {
# #             'boq': 'boq_text',
# #             'description': 'boq_text',
# #             'item': 'boq_text',
# #             'material': 'boq_text',
# #             'task': 'tasks',
# #             'task_list': 'tasks',
# #             'stage': 'stages',
# #             'stage_list': 'stages',
# #             'sub_category': 'subcategory',
# #             'sub': 'subcategory',
# #             'qty': 'quantity',
# #             'amount': 'quantity'
# #         }
        
# #         df = df.rename(columns=column_mapping)
        
# #         # Required columns
# #         if 'boq_text' not in df.columns:
# #             raise ValueError(f"CSV must contain 'boq_text' column. Found columns: {df.columns.tolist()}")
# #         if 'tasks' not in df.columns:
# #             raise ValueError(f"CSV must contain 'tasks' column. Found columns: {df.columns.tolist()}")
# #         if 'stages' not in df.columns:
# #             raise ValueError(f"CSV must contain 'stages' column. Found columns: {df.columns.tolist()}")
        
# #         df["boq_text"] = df["boq_text"].fillna("").astype(str)
        
# #         if "subcategory" not in df.columns:
# #             df["subcategory"] = "general"
# #         else:
# #             df["subcategory"] = df["subcategory"].astype(str).str.strip().str.lower().str.replace(" ", "")
        
# #         # Parse tasks and stages
# #         df["tasks_list"] = df["tasks"].apply(parse_tasks)
# #         df["stages_list"] = df["stages"].apply(parse_stages)
        
# #         # Handle optional columns
# #         for col in ["quantity", "region", "season", "grade", "rate_most", "rate_min", "rate_max", "confidence"]:
# #             if col not in df.columns:
# #                 if col == "quantity":
# #                     df[col] = 1.0
# #                 elif col == "region":
# #                     df[col] = "central"
# #                 elif col == "season":
# #                     df[col] = "normal"
# #                 elif col == "grade":
# #                     df[col] = "B"
# #                 elif col in ["rate_most", "rate_min", "rate_max"]:
# #                     df[col] = 0.0
# #                 elif col == "confidence":
# #                     df[col] = 1.0
        
# #         # Convert numeric columns
# #         df["quantity"] = pd.to_numeric(df["quantity"].fillna(1), errors="coerce").fillna(1.0)
# #         for col in ["rate_most", "rate_min", "rate_max", "confidence"]:
# #             df[col] = pd.to_numeric(df[col].fillna(0), errors="coerce").fillna(0.0)
        
# #         # Fix mismatched tasks/stages
# #         for i, r in df.iterrows():
# #             if len(r["tasks_list"]) != len(r["stages_list"]):
# #                 df.at[i, "stages_list"] = generate_fixed_stages(len(r["tasks_list"]))
        
# #         print(f"Successfully loaded {len(df)} rows from CSV", file=sys.stderr)
# #         return df
        
# #     except Exception as e:
# #         raise ValueError(f"Failed to load CSV: {str(e)}")

# # def upload_wbs_csv_to_dynamodb(csv_folder: str):
# #     """Upload WBS CSV data to DynamoDB"""
# #     try:
# #         import os
# #         from decimal import Decimal
        
# #         # Target CSV file
# #         csv_filename = "synthetic_boq_wbs_unique.csv"
# #         csv_path = os.path.join(csv_folder, csv_filename)
        
# #         if not os.path.exists(csv_path):
# #             raise ValueError(f"CSV file not found: {csv_path}")
        
# #         print(f"Loading CSV from: {csv_path}", file=sys.stderr)
# #         df = load_wbs_csv(csv_path)
        
# #         # Connect to DynamoDB
# #         dynamodb = get_dynamodb_resource()
# #         table_name = "MSME_BOQ_WBS"
        
# #         # Create table if it doesn't exist
# #         existing_tables = [t.name for t in dynamodb.tables.all()]
# #         if table_name not in existing_tables:
# #             print(f"Creating table: {table_name}", file=sys.stderr)
# #             table = dynamodb.create_table(
# #                 TableName=table_name,
# #                 KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
# #                 AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
# #                 BillingMode='PAY_PER_REQUEST'
# #             )
# #             table.wait_until_exists()
# #         else:
# #             table = dynamodb.Table(table_name)
        
# #         # Upload data
# #         uploaded = 0
# #         for idx, row in df.iterrows():
# #             item = {
# #                 "id": str(idx + 1),
# #                 "boq_text": str(row["boq_text"]),
# #                 "subcategory": str(row["subcategory"]),
# #                 "tasks_list": row["tasks_list"],
# #                 "stages_list": [int(s) for s in row["stages_list"]],
# #                 "quantity": Decimal(str(row["quantity"])),  # Convert to Decimal
# #                 "region": str(row["region"]),
# #                 "season": str(row["season"]),
# #                 "grade": str(row["grade"]),
# #                 "rate_most": Decimal(str(row["rate_most"])),  # Convert to Decimal
# #                 "rate_min": Decimal(str(row["rate_min"])),  # Convert to Decimal
# #                 "rate_max": Decimal(str(row["rate_max"])),  # Convert to Decimal
# #                 "confidence": Decimal(str(row["confidence"]))  # Convert to Decimal
# #             }
            
# #             table.put_item(Item=item)
# #             uploaded += 1
            
# #             if uploaded % 10 == 0:
# #                 print(f"Uploaded {uploaded} records...", file=sys.stderr)
        
# #         result = {
# #             "success": True,
# #             "message": f"Successfully uploaded {uploaded} records to {table_name}",
# #             "table": table_name,
# #             "records": uploaded
# #         }
        
# #         print(json.dumps(result))
        
# #     except Exception as e:
# #         print(json.dumps({"error": f"Upload failed: {str(e)}"}), file=sys.stderr)
# #         sys.exit(1)

# # # ============= CLI Commands =============

# # def cmd_generate_wbs(payload_json: str):
# #     """Generate WBS from payload"""
# #     try:
# #         payload = json.loads(payload_json)
# #         cache = initialize_wbs_system()
        
# #         result = generate_wbs(
# #             payload,
# #             cache["task_model"],
# #             cache["stage_model"],
# #             cache["duration_model"],
# #             cache["duration_meta"],
# #             cache["mlb"],
# #             cache["subcat_map"]
# #         )
        
# #         print(json.dumps(result, ensure_ascii=False, default=str))
        
# #     except json.JSONDecodeError as e:
# #         print(json.dumps({"error": f"Invalid JSON: {str(e)}"}), file=sys.stderr)
# #         sys.exit(1)
# #     except Exception as e:
# #         print(json.dumps({"error": str(e)}), file=sys.stderr)
# #         sys.exit(1)

# # def cmd_upload(csv_folder: str):
# #     """Upload CSV data to DynamoDB"""
# #     if not csv_folder:
# #         print(json.dumps({"error": "CSV folder path is required"}), file=sys.stderr)
# #         sys.exit(1)
    
# #     upload_wbs_csv_to_dynamodb(csv_folder)

# # def main():
# #     """Main CLI entry point"""
# #     if len(sys.argv) < 2:
# #         print(json.dumps({"error": "No command provided"}), file=sys.stderr)
# #         sys.exit(1)
    
# #     command = sys.argv[1].lower()
    
# #     if command == "generate":
# #         payload = sys.argv[2] if len(sys.argv) > 2 else "{}"
# #         cmd_generate_wbs(payload)
# #     elif command == "upload":
# #         csv_folder = sys.argv[2] if len(sys.argv) > 2 else ""
# #         cmd_upload(csv_folder)
# #     else:
# #         print(json.dumps({"error": f"Unknown command: {command}"}), file=sys.stderr)
# #         sys.exit(1)

# # if __name__ == "__main__":
# #     main()


# #!/usr/bin/env python3
# """
# WBS API Script - Optimized for Production Performance
# """

# import sys
# import json
# import uuid
# import warnings
# from typing import List, Dict, Any, Optional
# from functools import lru_cache

# import numpy as np
# import pandas as pd
# import boto3
# from decimal import Decimal

# from sklearn.feature_extraction.text import TfidfVectorizer
# from sklearn.preprocessing import MultiLabelBinarizer, OneHotEncoder
# from sklearn.model_selection import train_test_split
# from sklearn.linear_model import LogisticRegression
# from sklearn.multiclass import OneVsRestClassifier
# from sklearn.ensemble import RandomForestRegressor

# warnings.filterwarnings("ignore")

# # ============= Configuration =============
# import os
# os.environ['LOKY_MAX_CPU_COUNT'] = '1'
# os.environ['OMP_NUM_THREADS'] = '1'
# os.environ['MKL_NUM_THREADS'] = '1'
# os.environ['OPENBLAS_NUM_THREADS'] = '1'

# import gc
# gc.set_threshold(700, 10, 10)

# HOURS_PER_DAY = 8.0
# RANDOM_SEED = 42
# np.random.seed(RANDOM_SEED)

# # Pre-computed lookup table for task durations
# TASK_DURATION_BASE_HOURS = {
#     "site measurement": 2.0, "layout marking": 3.0, "surface preparation": 6.0,
#     "putty application": 4.0, "primer application": 3.0, "paint coat 1": 3.0,
#     "paint coat 2": 3.0, "finishing": 8.0, "touchup": 2.0,
#     "adhesive application": 4.0, "tile laying": 12.0, "grouting": 6.0,
#     "edge finishing": 4.0, "frame fabrication": 10.0, "panel installation": 6.0,
#     "screw fixing": 2.0, "board installation": 6.0, "channel fixing": 4.0,
#     "joint taping": 3.0, "pipe cutting": 2.0, "pipe installation": 6.0,
#     "joint sealing": 3.5, "pressure testing": 3.0, "conduit installation": 6.0,
#     "cable pulling": 6.0, "db fabrication": 8.0, "testing and earthing": 2.5,
#     "sludge removal": 4.0, "scrubbing": 4.0, "chemical cleaning": 6.0,
#     "rinsing": 2.0, "disinfection": 2.0, "drying": 1.0, "excavation": 12.0,
#     "rebar placement": 10.0, "formwork setup": 10.0, "concrete pouring": 12.0,
#     "curing": 16.0, "__default__": 6.0
# }

# # Multiplier lookup tables
# SEASON_MULTIPLIERS = {"normal": 1.0, "monsoon": 1.05, "festival": 1.03, "winter": 0.98}
# REGION_MULTIPLIERS = {"central": 1.0, "south": 1.01, "north": 1.02, "east": 1.01, "west": 1.01}
# GRADE_MULTIPLIERS = {"a": 0.97, "b": 1.00, "c": 1.03}

# # ============= Helper Functions =============

# def ddb_to_python(value):
#     """Convert DynamoDB Decimal to Python types - optimized"""
#     if isinstance(value, Decimal):
#         return float(value)
#     if isinstance(value, dict):
#         return {k: ddb_to_python(v) for k, v in value.items()}
#     if isinstance(value, list):
#         return [ddb_to_python(v) for v in value]
#     return value

# @lru_cache(maxsize=1024)
# def normalize_text(s: str) -> str:
#     """Normalize text - cached for performance"""
#     if not s:
#         return ""
#     return " ".join(s.strip().lower().replace("_", " ").split())

# @lru_cache(maxsize=512)
# def normalize_subcat_name(s: str) -> str:
#     """Normalize subcategory - cached"""
#     if not s:
#         return ""
#     return str(s).strip().lower().replace(" ", "")

# def safe_json_load(s: str):
#     """Safely load JSON"""
#     try:
#         return json.loads(s)
#     except:
#         return None

# def parse_stages(cell: str) -> List[int]:
#     """Parse stages - optimized"""
#     if pd.isna(cell):
#         return []
#     s = str(cell).strip()
#     v = safe_json_load(s)
#     if isinstance(v, list):
#         try:
#             return [int(x) for x in v]
#         except:
#             pass
#     s2 = s.replace("[","").replace("]","").replace('"',"")
#     parts = [p.strip() for p in s2.split(",") if p.strip().isdigit()]
#     return [int(p) for p in parts]

# def parse_tasks(cell: str) -> List[str]:
#     """Parse tasks - optimized"""
#     if pd.isna(cell):
#         return []
#     s = str(cell)
#     v = safe_json_load(s)
#     if isinstance(v, list):
#         return [normalize_text(x) for x in v]
#     if ";" in s:
#         return [normalize_text(x) for x in s.split(";") if x.strip()]
#     if "," in s:
#         return [normalize_text(x) for x in s.split(",") if x.strip()]
#     return [normalize_text(s)]

# def generate_fixed_stages(n_tasks: int) -> List[int]:
#     """Generate fixed stages - vectorized"""
#     if n_tasks <= 0:
#         return []
#     stages = [3] * n_tasks
#     if n_tasks >= 1:
#         stages[0] = 1
#     if n_tasks >= 2:
#         stages[1] = 2
#     if n_tasks >= 4:
#         stages[-2] = 4
#     if n_tasks >= 5:
#         stages[-1] = 5
#     return stages

# # ============= DynamoDB Functions =============

# _DYNAMODB_CLIENT = None

# def get_dynamodb_resource():
#     """Get cached DynamoDB resource"""
#     global _DYNAMODB_CLIENT
#     if _DYNAMODB_CLIENT is None:
#         try:
#             _DYNAMODB_CLIENT = boto3.resource(
#                 'dynamodb',
#                 region_name=os.getenv("AWS_REGION", "ap-south-2"),
#                 aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID", "AKIAYH3VJY2ZUOPIZ27O"),
#                 aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY", "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")
#             )
#         except Exception as e:
#             print(json.dumps({"error": f"DynamoDB connection failed: {str(e)}"}), file=sys.stderr)
#             sys.exit(1)
#     return _DYNAMODB_CLIENT

# def load_boq_dataset_from_dynamodb(table_name="MSME_BOQ_WBS") -> pd.DataFrame:
#     """Load BOQ dataset - optimized with batch processing"""
#     try:
#         dynamodb = get_dynamodb_resource()
#         table = dynamodb.Table(table_name)
#         table.load()
        
#         items = []
#         response = table.scan(Limit=100)
#         items.extend(response.get("Items", []))
        
#         while "LastEvaluatedKey" in response:
#             response = table.scan(
#                 ExclusiveStartKey=response["LastEvaluatedKey"],
#                 Limit=100
#             )
#             items.extend(response.get("Items", []))
        
#         if not items:
#             raise ValueError(f"No data in {table_name}")
        
#         # Batch convert decimals
#         clean_items = [ddb_to_python(i) for i in items]
#         df = pd.DataFrame(clean_items)
        
#         # Vectorized operations
#         df["boq_text"] = df["boq_text"].astype(str)
#         df["subcategory"] = df.get("subcategory", "general").fillna("general").astype(str).apply(normalize_subcat_name)
        
#         # Batch numeric conversions
#         numeric_cols = ["quantity", "rate_most", "rate_min", "rate_max", "confidence"]
#         for col in numeric_cols:
#             if col not in df.columns:
#                 df[col] = 0.0
#             df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0.0)
        
#         # List processing
#         df["tasks_list"] = df["tasks_list"].apply(lambda x: [normalize_text(t) for t in x])
#         df["stages_list"] = df["stages_list"].apply(lambda x: [int(s) for s in x])
        
#         df = df.drop_duplicates(subset=["boq_text"], keep="first").reset_index(drop=True)
        
#         # Fix mismatched in batch
#         mask = df.apply(lambda r: len(r["tasks_list"]) != len(r["stages_list"]), axis=1)
#         df.loc[mask, "stages_list"] = df.loc[mask, "tasks_list"].apply(lambda x: generate_fixed_stages(len(x)))
        
#         return df
        
#     except Exception as e:
#         print(json.dumps({"error": f"Load failed: {str(e)}"}), file=sys.stderr)
#         sys.exit(1)

# # ============= Model Training Functions =============

# def build_subcat_task_map(df: pd.DataFrame) -> Dict[str, List[str]]:
#     """Build subcategory mapping - optimized"""
#     mapping = {}
#     for sub, tasks in df.groupby("subcategory")["tasks_list"]:
#         mapping[sub] = sorted(set(task for task_list in tasks for task in task_list))
#     return mapping

# # Pre-compiled keyword sets
# TILING_KEYWORDS = frozenset(["tile", "tiles", "tiling", "vitrified", "ceramic", "granite", 
#                               "marble", "porcelain", "grout", "grouting", "adhesive", "flooring"])
# PAINTING_KEYWORDS = frozenset(["paint", "painting", "primer", "putty", "emulsion", "coat",
#                                 "finish coat", "touchup", "distemper"])
# CEILING_KEYWORDS = frozenset(["gypsum", "false ceiling", "ceiling board", "grid ceiling",
#                                "pop", "channel fixing"])
# PIPING_KEYWORDS = frozenset(["pipe", "piping", "plumbing", "upvc", "cpvc", "gi pipe",
#                               "pressure testing", "valve"])
# ELECTRICAL_KEYWORDS = frozenset(["wiring", "cable", "conduit", "earthing", "mccb", "db",
#                                   "electrical", "switch", "socket", "panel board"])
# TANK_KEYWORDS = frozenset(["sump", "tank", "cleaning", "desludging", "disinfection",
#                             "chlorination", "scrubbing"])

# @lru_cache(maxsize=256)
# def detect_subcategory(boq_text: str, subcat_map_key: str) -> Optional[str]:
#     """Detect subcategory - cached and optimized"""
#     text = boq_text.lower()
#     text_words = frozenset(text.split())
    
#     # Direct match first
#     for sub in subcat_map_key.split("|"):
#         if sub in text:
#             return sub
    
#     # Fast keyword matching using set intersection
#     if TILING_KEYWORDS & text_words:
#         return "tiling"
#     if PAINTING_KEYWORDS & text_words:
#         return "painting"
#     if CEILING_KEYWORDS & text_words:
#         return "falseceiling"
#     if PIPING_KEYWORDS & text_words:
#         return "piping"
#     if ELECTRICAL_KEYWORDS & text_words:
#         return "wiring"
#     if TANK_KEYWORDS & text_words:
#         return "tankcleaning"
    
#     return None

# def prepare_task_training(df: pd.DataFrame):
#     """Prepare task training - optimized"""
#     X = df["boq_text"].values.tolist()
#     mlb = MultiLabelBinarizer()
#     Y = mlb.fit_transform(df["tasks_list"].values)
#     return X, Y, mlb

# def train_task_classifier(X, Y):
#     """Train task classifier - optimized for speed"""
#     vec = TfidfVectorizer(
#         ngram_range=(1, 2), 
#         min_df=2, 
#         max_features=500,  # Reduced from 1000
#         max_df=0.95,
#         strip_accents='unicode'
#     )
#     X_vec = vec.fit_transform(X)
    
#     clf = OneVsRestClassifier(
#         LogisticRegression(
#             max_iter=500,  # Reduced from 1000
#             solver='saga',  # Faster solver
#             random_state=RANDOM_SEED
#         )
#     )
#     clf.fit(X_vec, Y)
#     return {"vectorizer": vec, "classifier": clf}

# def prepare_stage_training(df: pd.DataFrame):
#     """Prepare stage training - vectorized"""
#     rows = [(t, st) for _, r in df.iterrows() 
#             for t, st in zip(r["tasks_list"], r["stages_list"])]
#     X = [x[0] for x in rows]
#     y = [x[1] for x in rows]
#     return X, y

# def train_stage_classifier(X, y):
#     """Train stage classifier - optimized"""
#     vec = TfidfVectorizer(
#         ngram_range=(1, 2), 
#         min_df=1,
#         max_features=300,
#         max_df=0.95
#     )
#     X_vec = vec.fit_transform(X)
    
#     X_train, X_val, y_train, y_val = train_test_split(
#         X_vec, y, test_size=0.15, random_state=RANDOM_SEED
#     )
    
#     clf = LogisticRegression(
#         max_iter=500,
#         solver='saga',
#         multi_class="auto",
#         random_state=RANDOM_SEED
#     )
#     clf.fit(X_train, y_train)
    
#     return {"vectorizer": vec, "classifier": clf}

# @lru_cache(maxsize=512)
# def compute_synthetic_task_duration_days(task_name: str, qty: float, region: str,
#                                         season: str, grade: str) -> float:
#     """Compute duration - cached with lookup tables"""
#     task = normalize_text(task_name)
#     BASE = TASK_DURATION_BASE_HOURS.get(task, TASK_DURATION_BASE_HOURS["__default__"])
    
#     qty_factor = 1.0 + min(qty / 100.0, 1.5)
#     season_mul = SEASON_MULTIPLIERS.get(season.lower(), 1.0)
#     region_mul = REGION_MULTIPLIERS.get(region.lower(), 1.0)
#     grade_mul = GRADE_MULTIPLIERS.get(grade.lower(), 1.0)
    
#     hours = BASE * qty_factor * season_mul * region_mul * grade_mul
#     return max(hours / HOURS_PER_DAY, 0.01)

# def prepare_duration_training(df: pd.DataFrame):
#     """Prepare duration training - optimized"""
#     rows = []
#     for _, r in df.iterrows():
#         qty = float(r.get("quantity", 1.0) or 1.0)
#         region = r.get("region", "central")
#         season = r.get("season", "normal")
#         grade = r.get("grade", "B")
#         rate_most = float(r.get("rate_most") or 0.0)
#         rate_min = float(r.get("rate_min") or 0.0)
#         rate_max = float(r.get("rate_max") or 0.0)
#         confidence = float(r.get("confidence") or 1.0)
        
#         for t in r["tasks_list"]:
#             dur_days = compute_synthetic_task_duration_days(t, qty, region, season, grade)
#             rows.append({
#                 "task": t, "region": region, "season": season, "grade": grade,
#                 "log_qty": np.log1p(qty), "rate_most": rate_most,
#                 "rate_min": rate_min, "rate_max": rate_max,
#                 "confidence": confidence, "duration_days": dur_days
#             })
    
#     df_t = pd.DataFrame(rows)
    
#     # Optimize TF-IDF
#     text_vec = TfidfVectorizer(
#         ngram_range=(1, 2), 
#         min_df=1,
#         max_features=300,
#         max_df=0.95
#     )
#     X_txt = text_vec.fit_transform(df_t["task"]).toarray()
    
#     cat_cols = ["region", "season", "grade"]
#     ohe = OneHotEncoder(handle_unknown="ignore", sparse_output=False)
#     X_cat = ohe.fit_transform(df_t[cat_cols])
    
#     num_cols = ["log_qty", "rate_most", "rate_min", "rate_max", "confidence"]
#     X_num = df_t[num_cols].fillna(0).values
    
#     X = np.hstack([X_txt, X_cat, X_num])
#     y = df_t["duration_days"].values
    
#     duration_meta = {
#         "text_vec": text_vec, "ohe": ohe,
#         "cat_cols": cat_cols, "num_cols": num_cols
#     }
    
#     return X, y, duration_meta

# def train_duration_model(X, y):
#     """Train duration model - optimized"""
#     X_train, X_val, y_train, y_val = train_test_split(
#         X, y, test_size=0.15, random_state=RANDOM_SEED
#     )
    
#     rf = RandomForestRegressor(
#         n_estimators=50,  # Reduced from 200
#         max_depth=10,
#         min_samples_split=5,
#         min_samples_leaf=2,
#         max_features='sqrt',
#         random_state=RANDOM_SEED,
#         n_jobs=1  # Single job for Render
#     )
#     rf.fit(X_train, y_train)
#     return rf

# def predict_tasks(boq_text: str, task_model: Dict[str, Any],
#                  mlb: MultiLabelBinarizer, top_k: int = 12):
#     """Predict tasks - optimized"""
#     vec = task_model["vectorizer"].transform([boq_text])
#     probs = task_model["classifier"].predict_proba(vec)[0]
#     idx = np.argpartition(probs, -top_k)[-top_k:]  # Faster than argsort
#     idx = idx[np.argsort(probs[idx])[::-1]]
#     tasks = [mlb.classes_[i] for i in idx]
#     return [normalize_text(t) for t in tasks]

# def duration_features_for_inference(task_name: str, qty: float, region: str,
#                                    season: str, grade: str, rate_most: float,
#                                    rate_min: float, rate_max: float,
#                                    confidence: float, duration_meta: Dict[str, Any]):
#     """Generate duration features - optimized"""
#     txt = duration_meta["text_vec"].transform([task_name]).toarray()
#     cat_vals = [[region, season, grade]]
#     X_cat = duration_meta["ohe"].transform(cat_vals)
#     X_num = np.array([[
#         np.log1p(qty), 
#         float(rate_most or 0.0),
#         float(rate_min or 0.0), 
#         float(rate_max or 0.0),
#         float(confidence or 1.0)
#     ]])
#     return np.hstack([txt, X_cat, X_num])

# def predict_duration_pert(task_name, qty, region, season, grade,
#                          rate_most, rate_min, rate_max, confidence,
#                          duration_model, duration_meta):
#     """Predict PERT duration - optimized"""
#     X = duration_features_for_inference(
#         task_name, qty, region, season, grade,
#         rate_most, rate_min, rate_max, confidence,
#         duration_meta
#     )
#     most_days = max(float(duration_model.predict(X)[0]), 0.01)
    
#     # Pre-computed constants
#     optimistic_days = max(0.3, most_days * 0.70)
#     pessimistic_days = max(optimistic_days, most_days * 1.40)
#     expected_days = (optimistic_days + 4 * most_days + pessimistic_days) * 0.1667  # /6
    
#     return {
#         "optimistic_hours": round(optimistic_days * HOURS_PER_DAY, 2),
#         "most_likely_hours": round(most_days * HOURS_PER_DAY, 2),
#         "pessimistic_hours": round(pessimistic_days * HOURS_PER_DAY, 2),
#         "expected_hours": round(expected_days * HOURS_PER_DAY, 2)
#     }

# # ============= WBS Generation =============

# # Pre-computed procurement durations by quantity ranges
# PROCUREMENT_CACHE = {}

# def compute_procurement_duration(qty: float):
#     """Compute procurement - with caching"""
#     qty_bucket = int(qty / 10) * 10  # Round to nearest 10
#     if qty_bucket in PROCUREMENT_CACHE:
#         return PROCUREMENT_CACHE[qty_bucket]
    
#     base_hours = 1.5
#     qty_factor = np.log1p(qty) * 0.35
#     most = base_hours * (1 + qty_factor)
#     optimistic = max(0.5, most * 0.70)
#     pessimistic = most * 1.40
#     expected = (optimistic + 4 * most + pessimistic) * 0.1667
    
#     result = {
#         "optimistic_hours": round(optimistic, 2),
#         "most_likely_hours": round(most, 2),
#         "pessimistic_hours": round(pessimistic, 2),
#         "expected_hours": round(expected, 2)
#     }
    
#     PROCUREMENT_CACHE[qty_bucket] = result
#     return result

# # Pre-computed fixed durations
# QC_DURATION = {
#     "optimistic_hours": 0.8,
#     "most_likely_hours": 1.5,
#     "pessimistic_hours": 2.2,
#     "expected_hours": 1.23
# }

# BILLING_DURATION = {
#     "optimistic_hours": 0.6,
#     "most_likely_hours": 1.0,
#     "pessimistic_hours": 1.6,
#     "expected_hours": 1.03
# }

# def generate_wbs(item: Dict[str, Any], task_model: Dict[str, Any],
#                 stage_model: Dict[str, Any], duration_model,
#                 duration_meta: Dict[str, Any], mlb: MultiLabelBinarizer,
#                 subcat_map: Dict[str, List[str]]) -> Dict[str, Any]:
#     """Generate WBS - optimized"""
    
#     boq = item.get("boq_text", "")
#     qty = float(item.get("quantity", 1.0) or 1.0)
#     region = item.get("region", "central")
#     season = item.get("season", "normal")
#     grade = item.get("grade", "B")
#     rate_most = float(item.get("rate_most") or 0.0)
#     rate_min = float(item.get("rate_min") or 0.0)
#     rate_max = float(item.get("rate_max") or 0.0)
#     confidence = float(item.get("confidence") or 1.0)
    
#     # Detect subcategory
#     input_subcat = item.get("subcategory")
#     if input_subcat:
#         input_subcat = normalize_subcat_name(input_subcat)
    
#     subcat_map_key = "|".join(subcat_map.keys())
#     detected_subcat = detect_subcategory(boq, subcat_map_key)
#     subcat = normalize_subcat_name(detected_subcat or input_subcat or "general")
    
#     allowed = subcat_map.get(subcat, [])
    
#     # Predict tasks
#     predicted = predict_tasks(boq, task_model, mlb, top_k=20)
    
#     # Handle short text
#     if len(boq.strip().split()) <= 2:
#         tasks = allowed.copy()
#     else:
#         allowed_set = set(allowed)
#         tasks = [t for t in predicted if t in allowed_set]
    
#     if len(tasks) < 3:
#         tasks = allowed.copy()
    
#     final = {
#         "Planning": [],
#         "Procurement": [],
#         "Execution": [],
#         "QC": [],
#         "Billing": []
#     }
    
#     # Batch stage predictions
#     if tasks:
#         stage_vec = stage_model["vectorizer"].transform(tasks)
#         stages = stage_model["classifier"].predict(stage_vec)
        
#         # Generate all tasks at once
#         for t, orig_stage in zip(tasks, stages):
#             bucket = "Planning" if int(orig_stage) in [1, 2] else "Execution"
#             new_stage = 1 if bucket == "Planning" else 3
            
#             dur = predict_duration_pert(
#                 t, qty, region, season, grade,
#                 rate_most, rate_min, rate_max, confidence,
#                 duration_model, duration_meta
#             )
            
#             final[bucket].append({
#                 "task_id": str(uuid.uuid4())[:6],
#                 "task_name": t,
#                 "stage": new_stage,
#                 "duration": dur
#             })
    
#     # Add fixed tasks
#     final["Procurement"].append({
#         "task_id": "PR001",
#         "task_name": "material_procurement",
#         "stage": 2,
#         "duration": compute_procurement_duration(qty)
#     })
    
#     final["QC"].append({
#         "task_id": "QC001",
#         "task_name": "quality_check",
#         "stage": 4,
#         "duration": QC_DURATION
#     })
    
#     final["Billing"].append({
#         "task_id": "BL001",
#         "task_name": "final_billing",
#         "stage": 5,
#         "duration": BILLING_DURATION
#     })
    
#     return {
#         "boq_text": boq,
#         "subcategory": subcat,
#         "wbs": final,
#         "wbs_id": str(uuid.uuid4())
#     }

# # ============= System Initialization =============

# _WBS_CACHE = {
#     "df": None,
#     "subcat_map": None,
#     "task_model": None,
#     "stage_model": None,
#     "duration_model": None,
#     "duration_meta": None,
#     "mlb": None
# }

# def initialize_wbs_system():
#     """Initialize and cache WBS models - optimized"""
#     global _WBS_CACHE
    
#     if _WBS_CACHE["df"] is None:
#         _WBS_CACHE["df"] = load_boq_dataset_from_dynamodb()
#         _WBS_CACHE["subcat_map"] = build_subcat_task_map(_WBS_CACHE["df"])
        
#         X_text, Y, mlb = prepare_task_training(_WBS_CACHE["df"])
#         _WBS_CACHE["task_model"] = train_task_classifier(X_text, Y)
#         _WBS_CACHE["mlb"] = mlb
        
#         X_stage, y_stage = prepare_stage_training(_WBS_CACHE["df"])
#         _WBS_CACHE["stage_model"] = train_stage_classifier(X_stage, y_stage)
        
#         X_dur, y_dur, duration_meta = prepare_duration_training(_WBS_CACHE["df"])
#         _WBS_CACHE["duration_model"] = train_duration_model(X_dur, y_dur)
#         _WBS_CACHE["duration_meta"] = duration_meta
        
#         # Trigger garbage collection after initialization
#         gc.collect()
    
#     return _WBS_CACHE

# # ============= CSV Upload Functions =============

# def load_wbs_csv(csv_path: str) -> pd.DataFrame:
#     """Load WBS CSV - optimized"""
#     try:
#         df = pd.read_csv(csv_path, low_memory=False)
        
#         print(f"CSV columns: {df.columns.tolist()}", file=sys.stderr)
        
#         df.columns = df.columns.str.strip().str.lower().str.replace(' ', '_')
        
#         column_mapping = {
#             'boq': 'boq_text', 'description': 'boq_text', 'item': 'boq_text',
#             'material': 'boq_text', 'task': 'tasks', 'task_list': 'tasks',
#             'stage': 'stages', 'stage_list': 'stages', 'sub_category': 'subcategory',
#             'sub': 'subcategory', 'qty': 'quantity', 'amount': 'quantity'
#         }
        
#         df = df.rename(columns=column_mapping)
        
#         if 'boq_text' not in df.columns:
#             raise ValueError(f"Missing 'boq_text'. Found: {df.columns.tolist()}")
#         if 'tasks' not in df.columns:
#             raise ValueError(f"Missing 'tasks'. Found: {df.columns.tolist()}")
#         if 'stages' not in df.columns:
#             raise ValueError(f"Missing 'stages'. Found: {df.columns.tolist()}")
        
#         df["boq_text"] = df["boq_text"].fillna("").astype(str)
#         df["subcategory"] = df.get("subcategory", "general").fillna("general").astype(str).str.strip().str.lower().str.replace(" ", "")
        
#         df["tasks_list"] = df["tasks"].apply(parse_tasks)
#         df["stages_list"] = df["stages"].apply(parse_stages)
        
#         defaults = {
#             "quantity": 1.0, "region": "central", "season": "normal", "grade": "B",
#             "rate_most": 0.0, "rate_min": 0.0, "rate_max": 0.0, "confidence": 1.0
#         }
        
#         for col, default in defaults.items():
#             if col not in df.columns:
#                 df[col] = default
        
#         # Batch numeric conversion
#         numeric_cols = ["quantity", "rate_most", "rate_min", "rate_max", "confidence"]
#         for col in numeric_cols:
#             df[col] = pd.to_numeric(df[col], errors="coerce").fillna(defaults.get(col, 0.0))
        
#         # Fix mismatched in batch
#         mask = df.apply(lambda r: len(r["tasks_list"]) != len(r["stages_list"]), axis=1)
#         df.loc[mask, "stages_list"] = df.loc[mask, "tasks_list"].apply(lambda x: generate_fixed_stages(len(x)))
        
#         print(f"Loaded {len(df)} rows", file=sys.stderr)
#         return df
        
#     except Exception as e:
#         raise ValueError(f"CSV load failed: {str(e)}")

# def upload_wbs_csv_to_dynamodb(csv_folder: str):
#     """Upload WBS CSV - optimized with batch writes"""
#     try:
#         import os
#         from decimal import Decimal
        
#         csv_filename = "synthetic_boq_wbs_unique.csv"
#         csv_path = os.path.join(csv_folder, csv_filename)
        
#         if not os.path.exists(csv_path):
#             raise ValueError(f"CSV not found: {csv_path}")
        
#         print(f"Loading: {csv_path}", file=sys.stderr)
#         df = load_wbs_csv(csv_path)
        
#         dynamodb = get_dynamodb_resource()
#         table_name = "MSME_BOQ_WBS"
        
#         existing_tables = [t.name for t in dynamodb.tables.all()]
#         if table_name not in existing_tables:
#             print(f"Creating table: {table_name}", file=sys.stderr)
#             table = dynamodb.create_table(
#                 TableName=table_name,
#                 KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
#                 AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
#                 BillingMode='PAY_PER_REQUEST'
#             )
#             table.wait_until_exists()
#         else:
#             table = dynamodb.Table(table_name)
        
#         # Batch write for faster upload
#         uploaded = 0
#         with table.batch_writer() as batch:
#             for idx, row in df.iterrows():
#                 item = {
#                     "id": str(idx + 1),
#                     "boq_text": str(row["boq_text"]),
#                     "subcategory": str(row["subcategory"]),
#                     "tasks_list": row["tasks_list"],
#                     "stages_list": [int(s) for s in row["stages_list"]],
#                     "quantity": Decimal(str(row["quantity"])),
#                     "region": str(row["region"]),
#                     "season": str(row["season"]),
#                     "grade": str(row["grade"]),
#                     "rate_most": Decimal(str(row["rate_most"])),
#                     "rate_min": Decimal(str(row["rate_min"])),
#                     "rate_max": Decimal(str(row["rate_max"])),
#                     "confidence": Decimal(str(row["confidence"]))
#                 }
                
#                 batch.put_item(Item=item)
#                 uploaded += 1
                
#                 if uploaded % 50 == 0:
#                     print(f"Uploaded {uploaded}...", file=sys.stderr)
        
#         result = {
#             "success": True,
#             "message": f"Uploaded {uploaded} records to {table_name}",
#             "table": table_name,
#             "records": uploaded
#         }
        
#         print(json.dumps(result))
        
#     except Exception as e:
#         print(json.dumps({"error": f"Upload failed: {str(e)}"}), file=sys.stderr)
#         sys.exit(1)

# # ============= CLI Commands =============

# def cmd_generate_wbs(payload_json: str):
#     """Generate WBS - optimized"""
#     try:
#         payload = json.loads(payload_json)
#         cache = initialize_wbs_system()
        
#         result = generate_wbs(
#             payload,
#             cache["task_model"],
#             cache["stage_model"],
#             cache["duration_model"],
#             cache["duration_meta"],
#             cache["mlb"],
#             cache["subcat_map"]
#         )
        
#         print(json.dumps(result, ensure_ascii=False, default=str))
        
#     except json.JSONDecodeError as e:
#         print(json.dumps({"error": f"Invalid JSON: {str(e)}"}), file=sys.stderr)
#         sys.exit(1)
#     except Exception as e:
#         print(json.dumps({"error": str(e)}), file=sys.stderr)
#         sys.exit(1)

# def cmd_upload(csv_folder: str):
#     """Upload CSV"""
#     if not csv_folder:
#         print(json.dumps({"error": "CSV folder required"}), file=sys.stderr)
#         sys.exit(1)
    
#     upload_wbs_csv_to_dynamodb(csv_folder)

# def main():
#     """Main CLI"""
#     if len(sys.argv) < 2:
#         print(json.dumps({"error": "No command"}), file=sys.stderr)
#         sys.exit(1)
    
#     command = sys.argv[1].lower()
    
#     if command == "generate":
#         payload = sys.argv[2] if len(sys.argv) > 2 else "{}"
#         cmd_generate_wbs(payload)
#     elif command == "upload":
#         csv_folder = sys.argv[2] if len(sys.argv) > 2 else ""
#         cmd_upload(csv_folder)
#     else:
#         print(json.dumps({"error": f"Unknown command: {command}"}), file=sys.stderr)
#         sys.exit(1)

# if __name__ == "__main__":
#     main()


import os
import sys
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
AWS_REGION = "ap-south-2"
AWS_ACCESS_KEY_ID = "AKIAYH3VJY2ZUOPIZ27O"
AWS_SECRET_ACCESS_KEY = "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"

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
        raise RuntimeError("No WBS records found in DynamoDB")

    clean_items = []
    for it in items:
        clean_items.append({k: ddb_to_python(v) for k, v in it.items()})

    df = pd.DataFrame(clean_items)
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
        raise ValueError(f"Missing columns in DynamoDB data: {missing}")

    return df

# ======================================================
# LOAD STATE INDEX MASTER
# ======================================================
def load_state_index_master():
    dynamodb = boto3.resource(
        "dynamodb",
        region_name=AWS_REGION,
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY
    )

    table = dynamodb.Table("STATE_CITY_INDEX_MASTER")

    items = []
    resp = table.scan()
    items.extend(resp.get("Items", []))

    while "LastEvaluatedKey" in resp:
        resp = table.scan(ExclusiveStartKey=resp["LastEvaluatedKey"])
        items.extend(resp.get("Items", []))

    state_map = {}

    for it in items:
        key = (it["state_name"].strip().lower(), it["city_tier"].upper())
        state_map[key] = float(it.get("final_labour_factor", 1.0))

    return state_map

# ======================================================
# LOAD DATA (INITIALIZATION)
# ======================================================
df = load_wbs_master_from_dynamodb()
STATE_INDEX_CACHE = load_state_index_master()

df["work_norm"] = df["work"].apply(normalize)

# ======================================================
# TF-IDF REFERENCE TABLE
# ======================================================
TFIDF_DF = (
    df[["work", "industry", "work_norm"]]
    .drop_duplicates(subset=["work"])
    .reset_index(drop=True)
)

# ======================================================
# ALIAS MAP
# ======================================================
ALIAS_MAP = {
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
# KEYWORD WORK MAP
# ======================================================
KEYWORD_WORK_MAP = {}
for work in df["work"].unique():
    tokens = normalize(work).replace("-", " ").split()
    for t in tokens:
        if len(t) >= 4:
            KEYWORD_WORK_MAP.setdefault(t, set()).add(work)

# ======================================================
# INDUSTRY CLASSIFIER
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
# MATCH WORK
# ======================================================
def match_work(user_text, industry):
    user_text_norm = normalize(user_text)

    # TF-IDF SEMANTIC
    user_vec = tfidf.transform([user_text_norm])
    candidates = TFIDF_DF[TFIDF_DF["industry"] == industry]

    if not candidates.empty:
        cand_matrix = tfidf_matrix[candidates.index]
        scores = cosine_similarity(user_vec, cand_matrix)[0]
        best_idx = scores.argmax()
        best_score = scores[best_idx]

        if best_score >= SIMILARITY_THRESHOLD:
            return candidates.iloc[best_idx]["work"], best_score, "semantic"

    # ALIAS-BASED MATCH
    expanded_tokens = set(user_text_norm.split())
    for t in list(expanded_tokens):
        expanded_tokens.update(ALIAS_MAP.get(t, []))

    for token in expanded_tokens:
        for work in KEYWORD_WORK_MAP.get(token, []):
            if df[df["work"] == work]["industry"].iloc[0] == industry:
                return work, 0.60, "alias_based"

    # DATASET KEYWORD RULE
    for token in user_text_norm.split():
        if token in KEYWORD_WORK_MAP:
            for work in KEYWORD_WORK_MAP[token]:
                if df[df["work"] == work]["industry"].iloc[0] == industry:
                    return work, 0.50, "rule_based"

    # SAFE FALLBACK
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
def generate_wbs(work_input, length=None, breadth=None, state=None, tier=None):
    industry = predict_industry(work_input)
    matched_work, confidence, match_type = match_work(work_input, industry)
    scale, scale_factor = project_scale(length, breadth)
    length_factor = max(1, (length or STANDARD_LINEAR_LENGTH) / STANDARD_LINEAR_LENGTH)

    # STATE FACTOR
    state_factor = 1.0
    if state and tier:
        key = (state.strip().lower(), tier.strip().upper())
        state_factor = STATE_INDEX_CACHE.get(key, 1.0)

    wbs_df = df[df["work"] == matched_work].copy()

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

    HOURS_PER_DAY = 8
    output = []
    total_hours = 0

    for _, r in wbs_df.iterrows():
        days = r["base_duration_days"] * scale_factor
        if is_linear_task(r["task"]):
            days *= length_factor

        task_suffix = int("".join(filter(str.isdigit, r["wbs_task_id"])) or 1)
        task_factor = 0.85 + (task_suffix * 0.07)
        days *= task_factor

        hours = days * HOURS_PER_DAY * state_factor
        total_hours += hours

        output.append({
            "stage": r["stage"],
            "task_id": r["wbs_task_id"],
            "task": r["task"],
            "duration": {
                "optimistic_hours": round(hours * 0.6, 2),
                "most_likely_hours": round(hours, 2),
                "pessimistic_hours": round(hours * 1.6, 2),
                "expected_hours": round(
                    (hours * 0.6 + 4 * hours + hours * 1.6) / 6, 2
                )
            }
        })

    return {
        "input_work": work_input,
        "industry": industry,
        "matched_work": matched_work,
        "match_type": match_type,
        "confidence": round(confidence, 2),
        "state": state,
        "tier": tier,
        "state_factor": round(state_factor, 3),
        "total_hours": round(total_hours, 2),
        "wbs": output
    }

# ======================================================
# MAIN (FOR EXPRESS INTEGRATION)
# ======================================================
if __name__ == "__main__":
    try:
        # Read JSON input from command line argument
        if len(sys.argv) < 2:
            raise ValueError("No input arguments provided")
        
        input_data = json.loads(sys.argv[1])
        mode = input_data.get("mode", "single")
        
        if mode == "single":
            # Single WBS generation
            result = generate_wbs(
                work_input=input_data.get("work"),
                length=input_data.get("length"),
                breadth=input_data.get("breadth"),
                state=input_data.get("state"),
                tier=input_data.get("tier")
            )
            print(json.dumps(result))
            
        elif mode == "batch":
            # Batch WBS generation
            projects = input_data.get("projects", [])
            results = []
            
            for project in projects:
                try:
                    wbs_result = generate_wbs(
                        work_input=project.get("work"),
                        length=project.get("length"),
                        breadth=project.get("breadth"),
                        state=project.get("state"),
                        tier=project.get("tier")
                    )
                    results.append({
                        "success": True,
                        "data": wbs_result
                    })
                except Exception as e:
                    results.append({
                        "success": False,
                        "error": str(e),
                        "input": project
                    })
            
            print(json.dumps({
                "batch_results": results,
                "total": len(results),
                "successful": sum(1 for r in results if r.get("success"))
            }))
        
        else:
            raise ValueError(f"Invalid mode: {mode}")
            
    except Exception as e:
        error_output = {
            "error": str(e),
            "type": type(e).__name__
        }
        print(json.dumps(error_output))
        sys.exit(1)