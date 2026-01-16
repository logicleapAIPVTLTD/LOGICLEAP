import os
import json
import logging
import pdfplumber
from docx import Document
import google.generativeai as genai
from typing import List, Dict, Any
from dotenv import load_dotenv

# =========================================================
# 1. SETUP & CONFIGURATION
# =========================================================

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - [%(levelname)s] - %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL_NAME = os.getenv("GEMINI_MODEL_NAME", "gemini-2.5-flash")

if not GEMINI_API_KEY:
    logger.error("❌ GEMINI_API_KEY not found in .env file.")
    GENAI_AVAILABLE = False
else:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        GENAI_AVAILABLE = True
        logger.info("✅ Google Generative AI configured")
    except Exception as e:
        logger.error(f"❌ Failed to configure Gemini: {e}")
        GENAI_AVAILABLE = False

# Dummy data for compatibility
data_layer = {}
WORK_DF = {}
ROOM_DF = {}
WORK_NAMES = []
WORK_MAP = {}

# =========================================================
# 2. BOQ IDENTIFICATION ENGINE
# =========================================================

class BOQIdentificationEngine:
    def __init__(self):
        if not GENAI_AVAILABLE:
            raise RuntimeError("Google GenAI not available")
        self.model = genai.GenerativeModel(GEMINI_MODEL_NAME)
        self.generation_config = genai.types.GenerationConfig(
            temperature=0.1,
            max_output_tokens=8192,
        )

    def get_identification_prompt(self, context: Dict) -> str:
        p_type = context.get('project_type', 'Interior')
        location = context.get('location', 'General')
        
        return f"""
        Role: Senior Quantity Surveyor & Interior Estimator.
        
        PROJECT CONTEXT:
        - Project: {context.get('project_name')}
        - Category: {p_type}
        - Location: {location}

        TASK:
        1. COMPREHENSIVE IDENTIFICATION: For every room identified, generate a FULL PACKAGE of work.
        2. STANDARD ITEMS TO INCLUDE (IF INTERIOR):
           - Flooring (PU/Tiles/Marble)
           - Skirting (matched to flooring)
           - False Ceiling (Gypsum/Grid)
           - Internal Wall Painting (Plastic Emulsion/Luster)
           - Electrical Points (Switchboards/Wiring placeholders)
           - Woodwork/Carpentry (Wardrobes, TV Units, or Paneling)
           - Doors & Windows (Frames and Shutters)
        
        3. DIMENSIONS: Extract or infer Length and Width. If only area is given, derive L & W (e.g., 100 sqft -> 10x10).
        4. TIER: Assign Tier (T1/T2/T3) based on city profile.
        
        TIER DEFINITION:
        - T1: Premium/High-end finishes (Urban metros like Mumbai, Delhi, Bangalore)
        - T2: Mid-range finishes (Tier-2 cities like Pune, Hyderabad, Goa)
        - T3: Budget/Basic finishes (Tier-3 cities and rural areas)
        
        STRICT DOMAIN GUARDRAIL:
        - Ignore all road, highway, or external infrastructure data. 
        - If input is an empty floor plan, use standard architectural sizes for the {p_type} project.

        STRICT OUTPUT SCHEMA (JSON LIST ONLY - NO OTHER TEXT):
        [
          {{
            "Item No.": 1,
            "Work": "Master Bedroom Plastic Emulsion Painting",
            "State": "Maharashtra",
            "Tier": "T2",
            "Length": 15.5,
            "Width": 12.0,
            "Quantity": 1,
            "Unit": "sqft"
          }},
          {{
            "Item No.": 2,
            "Work": "Master Bedroom Vitrified Tile Flooring",
            "State": "Maharashtra",
            "Tier": "T2",
            "Length": 15.5,
            "Width": 12.0,
            "Quantity": 186,
            "Unit": "sqft"
          }}
        ]
        
        OUTPUT REQUIREMENTS:
        - Return ONLY valid JSON array, no markdown, no explanations
        - Each item must have ALL fields
        - Item No. must be sequential integers
        - Work field must be descriptive and specific
        - Tier must be T1, T2, or T3
        - Unit must be: sqft, sqm, rft, nos, lft, kg, litre, or piece
        """

    def process(self, content: str, context: Dict, is_image=False) -> List[Dict]:
        sys_prompt = self.get_identification_prompt(context)
        logger.info(f"🧠 Generating Comprehensive BOQ for {context.get('project_type', 'Project')}...")
        
        try:
            if is_image:
                img_file = genai.upload_file(content)
                logger.info(f"📤 Uploaded image: {content}")
                response = self.model.generate_content(
                    [img_file, sys_prompt], 
                    generation_config=self.generation_config
                )
            else:
                response = self.model.generate_content(
                    f"{sys_prompt}\n\nINPUT DATA:\n{content}", 
                    generation_config=self.generation_config
                )

            raw_text = response.text.replace("```json", "").replace("```", "").strip()
            start = raw_text.find("[")
            end = raw_text.rfind("]") + 1
            
            if start == -1:
                logger.warning("⚠️ No JSON array found in response")
                return []
            
            result = json.loads(raw_text[start:end])
            logger.info(f"✅ Generated {len(result)} BOQ items")
            return result
            
        except Exception as e:
            logger.error(f"❌ Identification Error: {e}")
            return []

# =========================================================
# 3. TEXT PARSER (for backward compatibility)
# =========================================================

class TextParser:
    _engine = None
    
    @classmethod
    def _get_engine(cls):
        if cls._engine is None:
            cls._engine = BOQIdentificationEngine()
        return cls._engine
    
    @classmethod
    def process_text(cls, text: str, context: Dict = None) -> List[Dict]:
        """Process text and return BOQ data"""
        if not text or not text.strip():
            return []
        
        if context is None:
            context = {
                "project_name": "Text Input",
                "project_type": "General",
                "location": "Unknown"
            }
        
        try:
            engine = cls._get_engine()
            return engine.process(text, context, is_image=False)
        except RuntimeError as e:
            logger.error(f"❌ Text processing failed: {e}")
            return []

# =========================================================
# 4. VISION ENGINE (for backward compatibility)
# =========================================================

class VisionEngine:
    def __init__(self):
        self.engine = BOQIdentificationEngine()
    
    def scan_image(self, image_path: str, context: Dict) -> List[Dict]:
        """Process image and return BOQ data"""
        if not os.path.exists(image_path):
            logger.error(f"Image not found: {image_path}")
            return []
        
        return self.engine.process(image_path, context, is_image=True)
    
    def normalize_to_db(self, ai_data: List[Dict]) -> List[Dict]:
        """Normalize AI output (already in correct format)"""
        return ai_data

# =========================================================
# 5. FILE UTILITIES
# =========================================================

def extract_text_from_file(file_path: str) -> str:
    """Extract text from various file formats"""
    ext = os.path.splitext(file_path)[1].lower()
    
    try:
        if ext == ".pdf":
            with pdfplumber.open(file_path) as pdf:
                return "\n".join([p.extract_text() or "" for p in pdf.pages])
        elif ext == ".docx":
            return "\n".join([p.text for p in Document(file_path).paragraphs])
        elif ext == ".txt":
            with open(file_path, "r", encoding="utf-8") as f:
                return f.read()
        elif ext in [".jpg", ".jpeg", ".png"]:
            # For images, just return the path (will be handled by Vision Engine)
            return file_path
        else:
            logger.error(f"Unsupported file type: {ext}")
            return ""
    except Exception as e:
        logger.error(f"Error reading file {file_path}: {e}")
        return ""

# =========================================================
# 6. MAIN (CLI Interface)
# =========================================================

def main():
    print("\n" + "="*75)
    print("  🔍 LOGICLEAP AI: COMPREHENSIVE BOQ IDENTIFIER")
    print("="*75)
    
    p_name = input("Project Name: ").strip() or "Untitled"
    p_type = input("Project Type (Interior/Civil): ").strip() or "Interior"
    p_loc = input("Location (State/City): ").strip() or "Goa"
    
    context = {"project_name": p_name, "project_type": p_type, "location": p_loc}

    print("\n1. Paste Text | 2. Upload File | 3. Image Scan")
    mode = input("Select: ").strip()
    
    engine = BOQIdentificationEngine()
    final_data = []

    try:
        if mode == "1":
            print("[Paste text then Ctrl+Z/D]")
            lines = []
            try:
                while True:
                    lines.append(input())
            except EOFError:
                pass
            final_data = engine.process("\n".join(lines), context)
            
        elif mode == "2":
            path = input("File Path: ").strip().strip('"')
            if os.path.exists(path):
                text = extract_text_from_file(path)
                final_data = engine.process(text, context)
            else:
                logger.error(f"File not found: {path}")
                
        elif mode == "3":
            path = input("Image Path: ").strip().strip('"')
            if os.path.exists(path):
                final_data = engine.process(path, context, is_image=True)
            else:
                logger.error(f"Image not found: {path}")

        if final_data:
            with open("boq_output.json", "w") as f:
                json.dump(final_data, f, indent=4)
            
            print("\n" + "-"*130)
            print(f"{'No.':<4} | {'Work Item':<50} | {'Tier':<4} | {'L':<8} | {'W':<8} | {'Qty':<10} | {'Unit':<8}")
            print("-" * 130)
            for row in final_data:
                print(f"{row.get('Item No.', '-'):<4} | {str(row.get('Work', '-'))[:50]:<50} | "
                      f"{row.get('Tier', '-'):<4} | {row.get('Length', 0):<8.2f} | "
                      f"{row.get('Width', 0):<8.2f} | {row.get('Quantity', 0):<10.2f} | {row.get('Unit', '-'):<8}")
            
            print("-" * 130)
            print(f"✅ Generated {len(final_data)} BOQ items. Saved to 'boq_output.json'")
        else:
            print("⚠️ No items identified.")

    except Exception as e:
        logger.error(f"Error: {e}")

if __name__ == "__main__":
    main()
