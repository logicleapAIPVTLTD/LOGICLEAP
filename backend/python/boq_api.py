import os
import re
import json
import boto3
import pandas as pd
import pdfplumber
from docx import Document
from decimal import Decimal
import google.generativeai as genai
from difflib import get_close_matches

# =========================================================
# 1. CONFIGURATION
# =========================================================

# AWS Credentials
AWS_REGION = "ap-south-2"
AWS_ACCESS_KEY_ID = "AKIAYH3VJY2ZUOPIZ27O"
AWS_SECRET_ACCESS_KEY = "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"

# Gemini Config
GEMINI_API_KEY = "AIzaSyDCENYkBEa9Kl4vmB09ibSK66gU_n86aQg"
GEMINI_MODEL_NAME = "gemini-2.5-flash"

# DynamoDB Tables
TABLE_WORK_MASTER = "work_master"
TABLE_ROOM_MASTER = "room_master"

try:
    genai.configure(api_key=GEMINI_API_KEY)
except Exception as e:
    print(f"Warning: Gemini configuration failed: {e}")

# =========================================================
# 2. DYNAMODB LIVE CONNECTION
# =========================================================

def get_dynamodb_data(table_name):
    # print(f"🔌 Connecting to live DB: {table_name}...")
    try:
        dynamodb = boto3.resource(
            "dynamodb",
            region_name=AWS_REGION,
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY
        )
        table = dynamodb.Table(table_name)
        
        items = []
        response = table.scan()
        items.extend(response.get("Items", []))
        
        while "LastEvaluatedKey" in response:
            response = table.scan(ExclusiveStartKey=response["LastEvaluatedKey"])
            items.extend(response.get("Items", []))

        def convert(val):
            if isinstance(val, Decimal):
                return int(val) if val % 1 == 0 else float(val)
            return val

        clean_items = [{k: convert(v) for k, v in i.items()} for i in items]
        return pd.DataFrame(clean_items)

    except Exception as e:
        print(f"❌ Database Connection Failed: {e}")
        return pd.DataFrame()

# LOAD DATA
# print("\n--- SYSTEM BOOT: SYNCING WITH CLOUD ---")
work_df = get_dynamodb_data(TABLE_WORK_MASTER).fillna("")
room_df = get_dynamodb_data(TABLE_ROOM_MASTER).fillna("")

if not work_df.empty:
    WORK_NAMES = work_df['work_name'].tolist()
    WORK_MAP = dict(zip(work_df['work_name'], work_df['work_code']))
else:
    WORK_NAMES = []
    WORK_MAP = {}

# print(f"✅ System Ready: {len(work_df)} Works | {len(room_df)} Rooms loaded.")

# =========================================================
# 3. STANDARDIZED METRIC EXTRACTION
# =========================================================

def normalize_text(text: str):
    if not text: return ""
    text = text.lower()
    replacements = {
        "sq.ft": "sqft", "square feet": "sqft", "sq m": "sqm", 
        "rft": "rft", "running feet": "rft", "running meter": "rmt"
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    text = re.sub(r"[^a-z0-9.x\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()

def extract_metrics(text: str):
    """
    Returns a FLAT dictionary with guaranteed keys.
    Renamed from extract_metrics_strict to match expected import in boq_processor.py
    """
    text = normalize_text(text)
    
    # DEFAULT SCHEMA (Frontend Contract)
    metrics = {
        "area": 0.0,
        "unit": "",
        "dimensions": "", 
        "length": 0.0,
        "quantity": 1
    }

    # 1. Area (e.g., 150 sqft)
    m_area = re.search(r"(\d+(?:\.\d+)?)\s*(sqft|sqm|m2)", text)
    if m_area:
        metrics["area"] = float(m_area.group(1))
        metrics["unit"] = m_area.group(2)

    # 2. Dimensions (e.g., 600x600)
    m_dims = re.search(r"(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*(m|ft|mm)?", text)
    if m_dims:
        metrics["dimensions"] = f"{m_dims.group(1)}x{m_dims.group(2)}"
        if not metrics["unit"]: 
            metrics["unit"] = m_dims.group(3) or "mm"

    # 3. Running Length (e.g., 50 rft)
    m_len = re.search(r"(\d+(?:\.\d+)?)\s*(rft|rmt|meter)", text)
    if m_len:
        metrics["length"] = float(m_len.group(1))
        metrics["unit"] = m_len.group(2)
        
    # 4. Quantity (e.g. 5 nos)
    m_qty = re.search(r"(\d+)\s*(nos|no|pcs)", text)
    if m_qty:
        metrics["quantity"] = int(m_qty.group(1))

    return metrics

def calculate_overlap_score(input_text, db_text):
    if not db_text or not input_text: return 0
    in_tokens = set(input_text.lower().split())
    db_tokens = set(db_text.lower().split())
    stop_words = {'and', 'or', 'with', 'for', 'of', 'in', 'the', 'a', 'to', 'providing', 'laying', 'fixing'}
    db_tokens = db_tokens - stop_words
    if not db_tokens: return 0
    common = in_tokens.intersection(db_tokens)
    return len(common) / len(db_tokens)

# =========================================================
# 4. CORE PROCESSING LOGIC
# =========================================================

def process_raw_text(full_text):
    results = []
    lines = full_text.split('\n')
    
    current_room = "General"
    last_work = None 

    for line in lines:
        line = line.strip()
        if not line: continue
        
        norm_line = normalize_text(line)
        
        # 1. DETECT ROOM
        is_room = False
        for _, r in room_df.iterrows():
            r_keys = [str(r.get('keyword', '')), str(r.get('room_name', ''))]
            if any(k.lower() in norm_line for k in r_keys if len(k) > 2):
                current_room = r['room_name']
                if last_work: results.append(last_work)
                last_work = None 
                is_room = True
                # print(f"➡️  Room Detected: {current_room}")
                break
        if is_room: continue 
        
        if line.lower().startswith("room"): # Simple fallback
             # If room wasn't detected by DB but looks like a room header
             pass

        # 2. DETECT WORK (Smart Match)
        best_match = None
        best_score = 0.0
        
        for _, w in work_df.iterrows():
            score_kw = calculate_overlap_score(norm_line, str(w.get('keyword', '')))
            score_name = calculate_overlap_score(norm_line, str(w.get('work_name', '')))
            max_score = max(score_kw, score_name)
            
            if max_score > best_score and max_score >= 0.4: 
                best_score = max_score
                best_match = w
        
        # 3. HANDLE MATCH vs DIMS
        if best_match:
            if last_work: results.append(last_work)
            
            extracted = extract_metrics(line)
            last_work = {
                "room_name": current_room,
                "work_code": best_match['work_code'],
                "work_name": best_match['work_name'],
                "description": line,
                "area": extracted['area'],
                "unit": extracted['unit'],
                "dimensions": extracted['dimensions'],
                "length": extracted['length'],
                "quantity": extracted['quantity'],
                "source": "TEXT_PARSER"
            }
            # print(f"   ✅ Matched: {best_match['work_name']}")
        
        else:
            line_metrics = extract_metrics(line)
            has_data = line_metrics['area'] > 0 or line_metrics['length'] > 0 or line_metrics['dimensions'] != ""
            
            if has_data and last_work:
                # print(f"   🔗 Merging Dims: {line}")
                if last_work['area'] == 0: 
                    last_work['area'] = line_metrics['area']
                if last_work['unit'] == "": 
                    last_work['unit'] = line_metrics['unit']
                if last_work['dimensions'] == "": 
                    last_work['dimensions'] = line_metrics['dimensions']
                if last_work['length'] == 0: 
                    last_work['length'] = line_metrics['length']
            
            elif len(line) > 5 and not has_data:
                # print(f"   ❓ Unrecognized: {line}")
                pass

    if last_work: results.append(last_work)

    return results

# =========================================================
# 5. VISION ENGINE (UPDATED FOR FIXED SCHEMA)
# =========================================================

class VisionProcessor:
    def __init__(self):
        self.model = genai.GenerativeModel(GEMINI_MODEL_NAME)

    def scan_image(self, image_path):
        if not os.path.exists(image_path): return []
        # print(f"👁️  Scanning visual data: {os.path.basename(image_path)}...")
        
        prompt = """
        Extract BOQ items from this image as a JSON list.
        Each item MUST have these fields: "room", "description", "area" (number), "unit" (string), "dimensions" (string like '600x600').
        If a field is missing, use null or 0.
        Example:
        [
          {"room": "Bedroom", "description": "Vitrified Flooring", "area": 150, "unit": "sqft", "dimensions": "600x600"}
        ]
        """
        # NO BARE EXCEPT HERE - Allow ResourceExhausted to bubble up
        res = self.model.generate_content([genai.upload_file(image_path), prompt])
        clean = res.text.replace("```json", "").replace("```", "").strip()
        return json.loads(clean)

    def normalize_to_db(self, ai_data):
        final_rows = []
        for item in ai_data:
            # Handle keys explicitly to avoid NoneType error if value is null
            desc = item.get("description") or item.get("desc") or ""
            if not isinstance(desc, str): desc = str(desc)
            
            closest = get_close_matches(desc, WORK_NAMES, n=1, cutoff=0.3)
            
            if closest:
                db_name = closest[0]
                db_code = WORK_MAP.get(db_name, "MISC")
            else:
                db_name = desc 
                db_code = "MANUAL_REVIEW"

            # Strict Schema Mapping - Force types to prevent None
            final_rows.append({
                "room_name": item.get("room") or "General",
                "work_code": db_code,
                "work_name": db_name,
                "description": desc,
                "area": float(item.get("area") or 0),
                "unit": item.get("unit") or "",
                "dimensions": item.get("dimensions") or "",  # FIX: Handle None -> ""
                "length": float(item.get("length") or 0),
                "quantity": int(item.get("quantity") or 1),
                "source": "VISION_ENGINE"
            })
        return final_rows

# =========================================================
# 6. MAIN CONTROLLER
# =========================================================

def extract_text_from_file(path):
    ext = os.path.splitext(path)[1].lower()
    if ext == ".txt": return open(path, "r", encoding="utf-8").read()
    elif ext == ".docx": return "\n".join([p.text for p in Document(path).paragraphs])
    elif ext == ".pdf": 
        with pdfplumber.open(path) as pdf: return "\n".join([p.extract_text() or "" for p in pdf.pages])
    return ""

def main():
    print("\n==========================================")
    print("   LOGICLEAP BOQ ENGINE (v3.0 - STRICT)")
    print("==========================================\n")
    
    print("1. Text Paste")
    print("2. Document File")
    print("3. Image Scan")
    mode = input("\n>>> Select (1-3): ").strip()
    
    final_data = []

    if mode == "1":
        print("\n[PASTE TEXT - Enter then Ctrl+Z/D to finish]")
        lines = []
        while True:
            try: lines.append(input())
            except EOFError: break
        final_data = process_raw_text("\n".join(lines))

    elif mode == "2":
        fpath = input("File Path: ").strip().strip('"')
        if os.path.exists(fpath):
            final_data = process_raw_text(extract_text_from_file(fpath))
        else: print("❌ Not found")

    elif mode == "3":
        fpath = input("Image Path: ").strip().strip('"')
        vp = VisionProcessor()
        final_data = vp.normalize_to_db(vp.scan_image(fpath))

    # --- OUTPUT ---
    print("\n" + "-"*60)
    print(f"{'ROOM':<15} | {'WORK ITEM':<30} | {'AREA':<8} | {'DIMS':<10}")
    print("-" * 60)
    
    if final_data:
        for row in final_data:
            # FIX: Ensure all values are strings before formatting
            r_name = str(row.get('room_name') or '')
            w_name = str(row.get('work_name') or '')
            area = str(row.get('area') or 0)
            dims = str(row.get('dimensions') or '')
            
            print(f"{r_name:<15} | {w_name[:30]:<30} | {area:<8} | {dims:<10}")
        
        with open("boq_payload.json", "w") as f:
            json.dump(final_data, f, indent=4)
        print("\n✅ Saved strictly formatted JSON to 'boq_payload.json'")
    else:
        print("⚠️ No data extracted.")

if __name__ == "__main__":
    main()