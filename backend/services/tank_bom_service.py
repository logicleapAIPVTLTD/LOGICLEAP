import google.generativeai as genai
import json
import time
import logging
import re

logger = logging.getLogger(__name__)

class TankBOMService:
    def __init__(self, api_key: str, model_name: str = "gemini-2.5-flash-lite"):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(model_name)
        self.config = genai.types.GenerationConfig(
            temperature=0.1,
            max_output_tokens=8192,
            response_mime_type="application/json"
        )
        self.BATCH_SIZE = 10

    def clean_and_parse_json(self, raw_text: str):
        try:
            text = raw_text.replace("```json", "").replace("```", "").strip()
            text = re.sub(r',\s*\}', '}', text)
            text = re.sub(r',\s*\]', ']', text)
            return json.loads(text)
        except json.JSONDecodeError:
            try:
                match = re.search(r'\[[\s\S]*\]', text)
                if match: return json.loads(match.group(0))
            except: pass
        return []

    def calculate_bom_batch(self, batch_items: list) -> dict:
        item = batch_items[0]
        prompt = f"""
        Role: Tank Cleaning & Maintenance Specialist.
        Task: Calculate exact material and chemical quantities for: "{item['work_name']}".
        
        INPUT DATA:
        {json.dumps(item, indent=2)}

        INSTRUCTIONS:
        1. Ignore empty 'materials' lists. INFER standard tank cleaning materials, chemicals, PPE, and equipment for "{item['work_name']}".
        2. For tank cleaning, include:
           - Cleaning chemicals (detergents, disinfectants, degreasers)
           - Safety equipment (PPE, harnesses, gas detectors)
           - Cleaning tools (brushes, pumps, vacuum equipment)
           - Water requirements
           - Waste disposal materials
        3. Apply 10% wastage for chemicals and consumables, 5% for equipment.
        4. Consider tank type (water tank, septic tank, industrial tank) and size for quantity calculations.
        5. Keep "note" brief (max 10 words). NO special characters or ellipses (...).
        
        OUTPUT FORMAT:
        Return ONLY a JSON LIST of objects. Do not wrap in a dictionary.
        [
            {{ "material": "string", "quantity": number, "unit": "string", "note": "string" }}
        ]
        
        Example materials for tank cleaning:
        - Sodium Hypochlorite (bleach)
        - Industrial Detergent
        - Protective Gloves
        - Safety Harness
        - Submersible Pump
        - Scrubbing Brushes
        - Potable Water
        - Waste Disposal Bags
        """
        try:
            response = self.model.generate_content(prompt, generation_config=self.config)
            return self.clean_and_parse_json(response.text)
        except Exception as e:
            logger.error(f"Tank BOM Generation Error: {e}")
            return []

    def process(self, wbs_data: list):
        unique_tasks = {}
        for item in wbs_data:
            name = item.get("Work", "General")
            if name not in unique_tasks:
                unique_tasks[name] = {
                    "dimensions": f"{item.get('Quantity')} {item.get('Unit')}",
                    "materials": item.get("WBS_Procurement", []),
                    "tank_type": item.get("Tank_Type", "Water Tank"),  # Tank-specific field
                    "capacity": item.get("Capacity", "N/A")  # Tank capacity
                }
        
        task_list = [
            {
                "work_name": k, 
                "dims": v["dimensions"], 
                "materials": v["materials"],
                "tank_type": v.get("tank_type", "Water Tank"),
                "capacity": v.get("capacity", "N/A")
            } 
            for k, v in unique_tasks.items()
        ]
        
        logger.info(f"📍 Generating Tank Cleaning BOM for {len(task_list)} unique work items...")

        bom_library = {}
        for i in range(0, len(task_list), self.BATCH_SIZE):
            batch = task_list[i : i + self.BATCH_SIZE]
            
            materials_list = self.calculate_bom_batch(batch)
            work_name = batch[0]['work_name']
            
            if materials_list and isinstance(materials_list, list):
                bom_library[work_name] = materials_list
            else:
                logger.warning(f"⚠️ Failed to generate Tank BOM for {work_name}")
                bom_library[work_name] = []
            
            time.sleep(1.0)

        final_bom = []
        for row in wbs_data:
            work_name = row.get("Work", "General")
            materials = bom_library.get(work_name, [])
            
            if not materials:
                materials = [
                    { 
                        "material": f"Standard Cleaning Materials for {work_name}", 
                        "quantity": 1, 
                        "unit": "LS", 
                        "note": "Estimated Lumpsum" 
                    }
                ]

            for m in materials:
                final_bom.append({
                    "Item No.": row.get("Item No."),
                    "Location": row.get("State", "General"),
                    "Tank/Area": row.get("Work", "N/A"),  # Changed from "Room" to "Tank/Area"
                    "Material": m.get("material"),
                    "Est_Quantity": m.get("quantity"),
                    "Unit": m.get("unit"),
                    "Calculation_Basis": m.get("note")
                })
        
        logger.info(f"✅ Tank Cleaning BOM Complete. Total Material Lines: {len(final_bom)}")
        return final_bom