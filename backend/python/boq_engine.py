import os
import re
import json
import logging
import boto3
import pandas as pd
import pdfplumber
from docx import Document
from decimal import Decimal
try:
    import google.genai as genai
    GENAI_AVAILABLE = True
except ImportError:
    try:
        import google.generativeai as genai
        GENAI_AVAILABLE = True
    except ImportError:
        GENAI_AVAILABLE = False
        genai = None
        # logger.warning("⚠️ Google GenAI not available. Vision features will be disabled.")
from difflib import get_close_matches
from typing import List, Dict, Optional, Union
from dotenv import load_dotenv

# =========================================================
# 1. SETUP & CONFIGURATION
# =========================================================

# Load environment variables
load_dotenv()

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

# AWS Config
AWS_REGION = os.getenv("AWS_REGION", "ap-south-2")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")

# Gemini Config
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL_NAME = os.getenv("GEMINI_MODEL_NAME", "gemini-2.5-flash")

# DynamoDB Tables
TABLE_WORK_MASTER = os.getenv("DYNAMODB_WORK_TABLE", "work_master")
TABLE_ROOM_MASTER = os.getenv("DYNAMODB_ROOM_TABLE", "room_master")

# Validate Critical Config
if not GEMINI_API_KEY:
    logger.error("❌ Missing GEMINI_API_KEY. Check .env file.")
    exit(1)

# AWS is optional for basic text processing
if not all([AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY]):
    logger.warning("⚠️ AWS credentials not found. DynamoDB features will be disabled.")
    AWS_AVAILABLE = False
else:
    AWS_AVAILABLE = True

# Initialize Clients
if GENAI_AVAILABLE and GEMINI_API_KEY:
    try:
        genai_client = genai.Client(api_key=GEMINI_API_KEY)
        logger.info("✅ Gemini client initialized successfully")
    except Exception as e:
        logger.error(f"❌ Failed to initialize Gemini client: {e}")
        genai_client = None
        GENAI_AVAILABLE = False
else:
    genai_client = None
    logger.warning("⚠️ Gemini API not configured. Vision features will be disabled.")

# =========================================================
# 2. DATA LAYER (DynamoDB)
# =========================================================

class DataLayer:
    def __init__(self):
        if not AWS_AVAILABLE:
            self.dynamodb = None
            return
        self.dynamodb = boto3.resource(
            "dynamodb",
            region_name=AWS_REGION,
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY
        )

    def fetch_table_data(self, table_name: str) -> pd.DataFrame:
        """Fetches all items from a DynamoDB table with pagination."""
        if not AWS_AVAILABLE:
            logger.warning(f"⚠️ AWS not available. Returning empty data for {table_name}.")
            return pd.DataFrame()
            
        logger.info(f"🔌 Connecting to DynamoDB: {table_name}...")
        try:
            table = self.dynamodb.Table(table_name)
            response = table.scan()
            items = response.get("Items", [])

            while "LastEvaluatedKey" in response:
                response = table.scan(ExclusiveStartKey=response["LastEvaluatedKey"])
                items.extend(response.get("Items", []))

            # Helper to convert Decimal to native types
            def convert(val):
                if isinstance(val, Decimal):
                    return int(val) if val % 1 == 0 else float(val)
                return val

            clean_items = [{k: convert(v) for k, v in i.items()} for i in items]
            df = pd.DataFrame(clean_items)
            logger.info(f"✅ Loaded {len(df)} records from {table_name}.")
            return df

        except Exception as e:
            logger.error(f"❌ Database Error ({table_name}): {e}")
            return pd.DataFrame()

# Initialize Global Data Cache
data_layer = DataLayer()
WORK_DF = data_layer.fetch_table_data(TABLE_WORK_MASTER).fillna("")
ROOM_DF = data_layer.fetch_table_data(TABLE_ROOM_MASTER).fillna("")

# Pre-compute lookups
WORK_NAMES = WORK_DF['work_name'].tolist() if not WORK_DF.empty else []
WORK_MAP = dict(zip(WORK_DF['work_name'], WORK_DF['work_code'])) if not WORK_DF.empty else {}

# =========================================================
# 3. TEXT PARSING ENGINE
# =========================================================

class TextParser:
    @staticmethod
    def normalize_text(text: str) -> str:
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

    @staticmethod
    def extract_metrics(text: str) -> Dict:
        """Extracts numerical data from a text string."""
        text = TextParser.normalize_text(text)
        metrics = {
            "area": 0.0, "unit": "", "dimensions": "", "length": 0.0, "quantity": 1
        }
        
        # Regex Patterns
        m_area = re.search(r"(\d+(?:\.\d+)?)\s*(sqft|sqm|m2)", text)
        if m_area:
            metrics["area"] = float(m_area.group(1))
            metrics["unit"] = m_area.group(2)
            
        m_dims = re.search(r"(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*(m|ft|mm)?", text)
        if m_dims:
            metrics["dimensions"] = f"{m_dims.group(1)}x{m_dims.group(2)}"
            if not metrics["unit"]: metrics["unit"] = m_dims.group(3) or "mm"
            
        m_len = re.search(r"(\d+(?:\.\d+)?)\s*(rft|rmt|meter)", text)
        if m_len:
            metrics["length"] = float(m_len.group(1))
            metrics["unit"] = m_len.group(2)
            
        m_qty = re.search(r"(\d+)\s*(nos|no|pcs)", text)
        if m_qty:
            metrics["quantity"] = int(m_qty.group(1))
            
        return metrics

    @staticmethod
    def calculate_overlap(input_text: str, db_text: str) -> float:
        if not db_text or not input_text: return 0.0
        in_tokens = set(input_text.lower().split())
        db_tokens = set(db_text.lower().split())
        stop_words = {'and', 'or', 'with', 'for', 'of', 'in', 'the', 'a', 'to', 'providing', 'laying', 'fixing'}
        db_tokens = db_tokens - stop_words
        if not db_tokens: return 0.0
        common = in_tokens.intersection(db_tokens)
        return len(common) / len(db_tokens)

    @staticmethod
    def process_text(full_text: str) -> List[Dict]:
        """Main logic for text-based BOQ extraction."""
        results = []
        lines = full_text.split('\n')
        current_room = "General"
        last_work = None 

        for line in lines:
            line = line.strip()
            if not line: continue
            norm_line = TextParser.normalize_text(line)
            
            # 1. Room Detection
            is_room = False
            for _, r in ROOM_DF.iterrows():
                r_keys = [str(r.get('keyword', '')), str(r.get('room_name', ''))]
                # Check if keyword exists and is significant length
                if any(k.lower() in norm_line for k in r_keys if len(k) > 2):
                    current_room = r['room_name']
                    if last_work: results.append(last_work)
                    last_work = None 
                    is_room = True
                    logger.debug(f"➡️  Room Detected: {current_room}")
                    break
            if is_room: continue 

            # 2. Work Detection (Smart Match)
            best_match = None
            best_score = 0.0
            
            for _, w in WORK_DF.iterrows():
                score_kw = TextParser.calculate_overlap(norm_line, str(w.get('keyword', '')))
                score_name = TextParser.calculate_overlap(norm_line, str(w.get('work_name', '')))
                max_score = max(score_kw, score_name)
                
                if max_score > best_score and max_score >= 0.4:
                    best_score = max_score
                    best_match = w
            
            # 3. Construct or Merge
            if best_match:
                if last_work: results.append(last_work)
                extracted = TextParser.extract_metrics(line)
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
                logger.debug(f"   ✅ Matched: {best_match['work_name']}")
            else:
                # Attempt to merge orphan dimensions into previous item
                line_metrics = TextParser.extract_metrics(line)
                has_data = line_metrics['area'] > 0 or line_metrics['length'] > 0 or line_metrics['dimensions'] != ""
                
                if has_data and last_work:
                    logger.debug(f"   🔗 Merging Dims: {line}")
                    if last_work['area'] == 0: last_work['area'] = line_metrics['area']
                    if last_work['unit'] == "": last_work['unit'] = line_metrics['unit']
                    if last_work['dimensions'] == "": last_work['dimensions'] = line_metrics['dimensions']
                    if last_work['length'] == 0: last_work['length'] = line_metrics['length']

        if last_work: results.append(last_work)
        return results

# =========================================================
# 4. VISION ENGINE (Gemini)
# =========================================================

class VisionEngine:
    def __init__(self):
        if not GENAI_AVAILABLE or not genai_client:
            raise RuntimeError("Google GenAI not available")
        self.client = genai_client
        self.model_name = GEMINI_MODEL_NAME

    def scan_image(self, image_path: str, context: Dict) -> List[Dict]:
        """Sends image + context to Gemini for analysis."""
        if not os.path.exists(image_path):
            logger.error(f"Image not found: {image_path}")
            return []
            
        logger.info(f"👁️  Scanning: {os.path.basename(image_path)} | Context: {context.get('project_type')}")
        
        prompt = f"""
        Role: Senior Quantity Surveyor & Cost Estimator.
        
        PROJECT CONTEXT:
        - Project Name: {context.get('project_name', 'Unknown')}
        - Location: {context.get('location', 'Unknown')}
        - Type: {context.get('project_type', 'General Construction')}
        
        TASK:
        Analyze the provided floor plan/blueprint. Extract a complete Bill of Quantities (BOQ).
        
        STRICT OUTPUT SCHEMA (JSON LIST ONLY):
        You must return a JSON list where every object strictly follows this structure:
        [
          {{
            "room_name": "string (e.g., Master Bedroom)",
            "work_name": "string (e.g., Vitrified Flooring)",
            "description": "string (Detailed spec inferred from context)",
            "area": number (Float, 0.0 if unknown),
            "unit": "string (sqft, sqm, rft, nos)",
            "dimensions": "string (LxW e.g., 10x12)",
            "length": number (Float, 0.0 if unknown),
            "quantity": integer (Default 1)
          }}
        ]
        
        RULES:
        1. Context Awareness: Prioritize items relevant to "{context.get('project_type')}".
        2. Dimensions: Calculate areas from labels (e.g., "10'x12'" -> Area: 120, Dims: "10x12").
        3. Inference: Infer standard materials if not explicitly labeled.
        4. Output: Raw JSON only. No Markdown blocks.
        """
        
        try:
            # Upload file and generate content
            uploaded_file = self.client.files.upload(file=image_path)
            res = self.client.models.generate_content(
                model=self.model_name,
                contents=[uploaded_file, prompt]
            )
            
            # Clean JSON Response
            clean_text = res.text.replace("```json", "").replace("```", "").strip()
            return json.loads(clean_text)
            
        except Exception as e:
            logger.error(f"❌ Vision Engine Error: {e}")
            return []

    def normalize_to_db(self, ai_data: List[Dict]) -> List[Dict]:
        """Maps AI output to official Database Work Codes."""
        final_rows = []
        for item in ai_data:
            # Fuzzy match the AI's "work_name" to our DB's "WORK_NAMES"
            desc = item.get("work_name", item.get("description", ""))
            closest = get_close_matches(desc, WORK_NAMES, n=1, cutoff=0.4)
            
            if closest:
                db_name = closest[0]
                db_code = WORK_MAP.get(db_name, "MISC")
            else:
                db_name = desc 
                db_code = "MANUAL_REVIEW"

            # Enforce Strict Schema Types
            final_rows.append({
                "room_name": item.get("room_name") or "General",
                "work_code": db_code,
                "work_name": db_name,
                "description": item.get("description") or "",
                "area": float(item.get("area") or 0),
                "unit": item.get("unit") or "",
                "dimensions": item.get("dimensions") or "",
                "length": float(item.get("length") or 0),
                "quantity": int(item.get("quantity") or 1),
                "source": "VISION_ENGINE"
            })
        return final_rows

# =========================================================
# 5. FILE UTILITIES
# =========================================================

def extract_text_from_file(path: str) -> str:
    ext = os.path.splitext(path)[1].lower()
    try:
        if ext == ".txt":
            with open(path, "r", encoding="utf-8") as f: return f.read()
        elif ext == ".docx":
            return "\n".join([p.text for p in Document(path).paragraphs])
        elif ext == ".pdf":
            with pdfplumber.open(path) as pdf:
                return "\n".join([p.extract_text() or "" for p in pdf.pages])
    except Exception as e:
        logger.error(f"File Read Error: {e}")
    return ""

# =========================================================
# 6. MAIN CONTROLLER (CLI Interface)
# =========================================================

def main():
    print("\n==========================================")
    print("   LOGICLEAP BOQ ENGINE (Production v1.0)")
    print("==========================================\n")
    
    print("1. Text Paste")
    print("2. Document File (PDF/DOCX)")
    print("3. Image Scan (Frontend Simulation)")
    mode = input("\n>>> Select (1-3): ").strip()
    
    final_data = []

    try:
        # --- OPTION 1: TEXT ---
        if mode == "1":
            print("\n[PASTE TEXT - Enter then Ctrl+Z/D to finish]")
            lines = []
            while True:
                try: lines.append(input())
                except EOFError: break
            final_data = TextParser.process_text("\n".join(lines))

        # --- OPTION 2: FILE ---
        elif mode == "2":
            fpath = input("File Path: ").strip().strip('"')
            if os.path.exists(fpath):
                raw_text = extract_text_from_file(fpath)
                final_data = TextParser.process_text(raw_text)
            else:
                logger.warning("❌ File not found.")

        # --- OPTION 3: IMAGE ---
        elif mode == "3":
            fpath = input("Image Path: ").strip().strip('"')
            
            # Simulate Frontend Context
            print("\n--- FRONTEND CONTEXT ---")
            p_name = input("Project Name: ").strip() or "Untitled Project"
            p_loc = input("Location: ").strip() or "Mumbai, India"
            p_type = input("Project Type (Interior/Civil): ").strip() or "Interior Design"
            
            context_payload = {
                "project_name": p_name,
                "location": p_loc,
                "project_type": p_type
            }
            
            vp = VisionEngine()
            raw_ai = vp.scan_image(fpath, context_payload)
            final_data = vp.normalize_to_db(raw_ai)

        # --- OUTPUT ---
        print("\n" + "-"*80)
        print(f"{'ROOM':<15} | {'WORK ITEM':<30} | {'AREA':<8} | {'DIMS':<10}")
        print("-" * 80)
        
        if final_data:
            for row in final_data:
                # Safe casting for display
                r_name = str(row.get('room_name') or 'General')
                w_name = str(row.get('work_name') or 'Misc')
                area = str(row.get('area') or 0)
                dims = str(row.get('dimensions') or '')
                
                print(f"{r_name:<15} | {w_name[:30]:<30} | {area:<8} | {dims:<10}")
            
            with open("boq_payload.json", "w") as f:
                json.dump(final_data, f, indent=4)
            print("\n✅ Saved JSON payload to 'boq_payload.json'")
        else:
            print("⚠️ No data extracted.")

    except KeyboardInterrupt:
        print("\n\nOperation cancelled by user.")
    except Exception as e:
        logger.error(f"Unexpected System Error: {e}")

if __name__ == "__main__":
    main()