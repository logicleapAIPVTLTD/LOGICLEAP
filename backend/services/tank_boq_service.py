import google.generativeai as genai
import json
import logging
import pdfplumber
from docx import Document
import io

logger = logging.getLogger(__name__)

class TankBOQService:
    def __init__(self, api_key: str, model_name: str = "gemini-2.5-flash-lite"):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(model_name)
        self.generation_config = genai.types.GenerationConfig(
            temperature=0.1,
            max_output_tokens=8192,
        )

    def extract_text(self, file_bytes: bytes, filename: str) -> str:
        try:
            ext = filename.split('.')[-1].lower()
            if ext == "pdf":
                with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                    return "\n".join([p.extract_text() or "" for p in pdf.pages])
            elif ext == "docx":
                doc = Document(io.BytesIO(file_bytes))
                return "\n".join([p.text for p in doc.paragraphs])
            elif ext == "txt":
                return file_bytes.decode("utf-8")
        except Exception as e:
            logger.error(f"File extraction failed: {e}")
            return ""
        return ""

    def get_identification_prompt(self, context: dict) -> str:
        p_type = context.get('project_type', 'Tank Cleaning')
        location = context.get('location', 'General')
        
        return f"""
        Role: Tank Cleaning & Water Sanitation Specialist.
        
        PROJECT CONTEXT:
        - Project: {context.get('project_name')}
        - Category: {p_type}
        - Location: {location}

        PRE-TASK (IF NEEDED): If the input image/site plan is too big or complex, break it down into individual tanks/sections for better analysis. Upscale thinking to give the best possible output while following the strict output format.

        CRITICAL REQUIREMENT: FOR EACH TANK IDENTIFIED, GENERATE 3 SERVICE OPTIONS:
        1. MANUAL CLEANING - Traditional manual labor-intensive cleaning
        2. SEMI-AUTOMATIC CLEANING - Mix of manual labor + pressure washing equipment
        3. FULLY AUTOMATIC CLEANING - Robotic/automated cleaning systems with minimal manual intervention
        
        This allows clients to choose their preferred service level based on budget and requirements.

        TASK:
        1. IDENTIFY ALL TANKS in the input (Overhead, Underground, Sump, Septic, Industrial, etc.)
        
        2. FOR EACH TANK, CREATE 3 SEPARATE BOQ ITEMS WITH DIFFERENT SERVICE TYPES:
        
        SERVICE TYPE 1 - MANUAL CLEANING:
           - Manual draining with pumps
           - Manual sludge removal with buckets/shovels
           - Manual scrubbing with brushes
           - Basic disinfection (manual chlorination)
           - Manual rinsing
           - Basic water quality testing
           - Lower cost, more labor-intensive, longer duration
        
        SERVICE TYPE 2 - SEMI-AUTOMATIC CLEANING:
           - Electric pump draining
           - Vacuum extraction for sludge
           - High-pressure washing equipment
           - Mechanical scrubbing tools
           - Automated chemical dosing
           - Professional water quality testing
           - Medium cost, faster, better results
        
        SERVICE TYPE 3 - FULLY AUTOMATIC CLEANING:
           - Automated robotic cleaning systems
           - Ultrasonic cleaning technology
           - UV disinfection systems
           - IoT-based monitoring and testing
           - Zero-entry cleaning (no confined space risk)
           - Advanced water quality analysis
           - Higher cost, fastest, safest, most thorough
        
        3. TANK SPECIFICATIONS: Extract or infer:
           - Tank Type (Overhead, Underground, Sump, Septic, Industrial, Water Storage)
           - Capacity (in Liters or Gallons)
           - Dimensions (Length × Width × Height/Depth)
           - Material (Concrete, Plastic, Metal, FRP)
           - Access Type (Manhole, Top Opening, Side Access)
        
        4. TIER: Assign Tier (T1/T2/T3) based on city profile and service complexity.
        
        5. QUANTITY CALCULATION:
           - For surface cleaning: Calculate based on internal surface area (walls + floor)
           - For chemical treatment: Calculate based on tank capacity
           - Adjust pricing based on service type (Manual < Semi-Auto < Fully Auto)
        
        STRICT DOMAIN GUARDRAIL:
        - Focus ONLY on tanks, water storage systems, septic systems, and related water bodies
        - Ignore all building interior, structural, or non-tank related infrastructure
        - If tank specifications are missing, use standard sizes based on building type:
          * Residential: 500-2000 Liters (Overhead), 2000-5000 Liters (Underground)
          * Commercial: 5000-20000 Liters
          * Industrial: 20000+ Liters

        STRICT OUTPUT SCHEMA (JSON LIST ONLY):
        [
          {{
            "Item No.": integer,
            "Work": "string (Tank Type + SERVICE TYPE + Specific Activity, e.g., 'Overhead Tank 1000L - MANUAL CLEANING - Complete Service')",
            "State": "string",
            "Tier": "string",
            "Tank_Type": "string (Overhead/Underground/Sump/Septic/Industrial)",
            "Service_Type": "string (MANUAL/SEMI-AUTOMATIC/FULLY-AUTOMATIC)",
            "Capacity": "number (in Liters)",
            "Length": number (in meters),
            "Width": number (in meters),
            "Height": number (in meters),
            "Quantity": number,
            "Unit": "string (sqm for surface area, Liters for capacity, LS for lumpsum)"
          }}
        ]
        
        EXAMPLE OUTPUT FOR A SINGLE 1000L OVERHEAD TANK:
        [
          {{
            "Item No.": 1,
            "Work": "Overhead Water Tank 1000L - MANUAL CLEANING - Complete Service",
            "State": "Karnataka",
            "Tier": "T1",
            "Tank_Type": "Overhead",
            "Service_Type": "MANUAL",
            "Capacity": 1000,
            "Length": 2.0,
            "Width": 2.0,
            "Height": 2.5,
            "Quantity": 18.0,
            "Unit": "sqm"
          }},
          {{
            "Item No.": 2,
            "Work": "Overhead Water Tank 1000L - SEMI-AUTOMATIC CLEANING - Complete Service",
            "State": "Karnataka",
            "Tier": "T1",
            "Tank_Type": "Overhead",
            "Service_Type": "SEMI-AUTOMATIC",
            "Capacity": 1000,
            "Length": 2.0,
            "Width": 2.0,
            "Height": 2.5,
            "Quantity": 18.0,
            "Unit": "sqm"
          }},
          {{
            "Item No.": 3,
            "Work": "Overhead Water Tank 1000L - FULLY AUTOMATIC CLEANING - Complete Service",
            "State": "Karnataka",
            "Tier": "T1",
            "Tank_Type": "Overhead",
            "Service_Type": "FULLY-AUTOMATIC",
            "Capacity": 1000,
            "Length": 2.0,
            "Width": 2.0,
            "Height": 2.5,
            "Quantity": 18.0,
            "Unit": "sqm"
          }}
        ]
        
        REMEMBER: If input describes 2 tanks, generate 6 items (3 service types × 2 tanks). If 3 tanks, generate 9 items, etc.
        """

    def process(self, content: str, context: dict, image_parts=None):
        sys_prompt = self.get_identification_prompt(context)
        
        try:
            logger.info("Sending request to Gemini for Tank Cleaning BOQ (Multiple Service Options)...")
            if image_parts:
                response = self.model.generate_content([image_parts[0], sys_prompt], generation_config=self.generation_config)
            else:
                response = self.model.generate_content(f"{sys_prompt}\n\nINPUT DATA:\n{content}", generation_config=self.generation_config)

            raw_text = response.text.replace("```json", "").replace("```", "").strip()
            
            start = raw_text.find("[")
            end = raw_text.rfind("]") + 1
            
            if start == -1 or end == 0:
                logger.error(f"Invalid JSON received from AI: {raw_text[:100]}...")
                return []
            
            json_str = raw_text[start:end]
            result = json.loads(json_str)
            
            logger.info(f"✅ Tank Cleaning BOQ Generated: {len(result)} items (including multiple service types per tank)")
            return result
            
        except Exception as e:
            logger.error(f"❌ Tank BOQ Identification Error: {e}")
            return []