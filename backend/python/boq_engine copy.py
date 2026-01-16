import os
import json
import logging
import pdfplumber
from docx import Document
import google.generativeai as genai
from typing import List, Dict
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
    exit(1)

genai.configure(api_key=GEMINI_API_KEY)

# =========================================================
# 2. IDENTIFICATION ENGINE
# =========================================================

class BOQIdentificationEngine:
    def __init__(self):
        self.model = genai.GenerativeModel(GEMINI_MODEL_NAME)
        self.generation_config = genai.types.GenerationConfig(
            temperature=0.1, # Slightly higher for creative inference of standard works
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
        
        STRICT DOMAIN GUARDRAIL:
        - Ignore all road, highway, or external infrastructure data. 
        - If input is an empty floor plan, use standard architectural sizes for the {p_type} project.

        STRICT OUTPUT SCHEMA (JSON LIST ONLY):
        [
          {{
            "Item No.": integer,
            "Work": "string (Room Name + Specific Work, e.g., Master Bedroom Plastic Emulsion Painting)",
            "State": "string",
            "Tier": "string",
            "Length": number,
            "Width": number,
            "Quantity": number,
            "Unit": "string"
          }}
        ]
        """

    def process(self, content: str, context: Dict, is_image=False) -> List[Dict]:
        sys_prompt = self.get_identification_prompt(context)
        logger.info(f"🧠 Generating Comprehensive BOQ for {context['project_type']}...")
        
        try:
            if is_image:
                img_file = genai.upload_file(content)
                response = self.model.generate_content([img_file, sys_prompt], generation_config=self.generation_config)
            else:
                response = self.model.generate_content(f"{sys_prompt}\n\nINPUT DATA:\n{content}", generation_config=self.generation_config)

            raw_text = response.text.replace("```json", "").replace("```", "").strip()
            start = raw_text.find("[")
            end = raw_text.rfind("]") + 1
            if start == -1: return []
            
            return json.loads(raw_text[start:end])
        except Exception as e:
            logger.error(f"❌ Identification Error: {e}")
            return []

# =========================================================
# 3. UTILITIES & MAIN
# =========================================================

def extract_text(path: str) -> str:
    ext = os.path.splitext(path)[1].lower()
    if ext == ".pdf":
        with pdfplumber.open(path) as pdf:
            return "\n".join([p.extract_text() or "" for p in pdf.pages])
    elif ext == ".docx":
        return "\n".join([p.text for p in Document(path).paragraphs])
    elif ext == ".txt":
        with open(path, "r", encoding="utf-8") as f: return f.read()
    return ""

def main():
    print("\n" + "="*75)
    print("  🔍 LOGICLEAP AI: COMPREHENSIVE ITEM IDENTIFIER")
    print("="*75)
    
    p_name = input("Project Name: ").strip() or "Untitled"
    p_type = input("Project Type (Interior/Civil): ").strip() or "Interior"
    p_loc = input("Location (State/City): ").strip() or "Goa"
    
    context = {"project_name": p_name, "project_type": p_type, "location": p_loc}

    print("\n1. Paste Text | 2. Upload File | 3. Image Scan")
    mode = input("Select: ").strip()
    
    engine = BOQIdentificationEngine()
    final_data = []

    if mode == "1":
        print("[Paste text then Ctrl+Z/D]")
        lines = []
        try:
            while True: lines.append(input())
        except EOFError: pass
        final_data = engine.process("\n".join(lines), context)
    elif mode == "2":
        path = input("File Path: ").strip().strip('"')
        final_data = engine.process(extract_text(path), context)
    elif mode == "3":
        path = input("Image Path: ").strip().strip('"')
        final_data = engine.process(path, context, is_image=True)

    if final_data:
        with open("boq_output.json", "w") as f:
            json.dump(final_data, f, indent=4)
        
        print("\n" + "-"*115)
        print(f"{'No.':<4} | {'Work Item':<50} | {'L':<8} | {'W':<8} | {'Qty':<10} | {'Unit'}")
        print("-" * 115)
        for row in final_data:
            print(f"{row.get('Item No.', '-'):<4} | {row.get('Work', '-')[:50]:<50} | "
                  f"{row.get('Length', 0):<8.2f} | {row.get('Width', 0):<8.2f} | "
                  f"{row.get('Quantity', 0):<10.2f} | {row.get('Unit', '-')}")
        
        print("-" * 115)
        print(f"✅ Generated {len(final_data)} high-detail items. Saved to 'boq_output.json'")
    else:
        print("⚠️ No items identified.")

if __name__ == "__main__":
    main()