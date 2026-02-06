import google.generativeai as genai
import json
import time
import logging

logger = logging.getLogger(__name__)

class TankWBSService:
    def __init__(self, api_key: str, model_name: str = "gemini-2.5-flash-lite"):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(model_name)
        self.config = genai.types.GenerationConfig(
            temperature=0.1,
            max_output_tokens=8192,
            response_mime_type="application/json"
        )
        self.BATCH_SIZE = 5

    def clean_json(self, raw_text: str):
        try:
            clean_text = raw_text.replace("```json", "").replace("```", "").strip()
            return json.loads(clean_text)
        except json.JSONDecodeError as e:
            logger.error(f"JSON Parse Error: {e}")
            logger.error(f"Faulty Text: {raw_text[:500]}...") 
            return {}

    def generate_wbs_batch(self, items_batch: list) -> dict:
        prompt = f"""
        Role: Senior Tank Cleaning & Sanitation Project Manager.
        
        Task: Create a 5-Stage Work Breakdown Structure (WBS) for TANK CLEANING operations with OPTIMIZED safety and execution timelines.
        
        INPUT ITEMS (Tank Cleaning Work & Specifications):
        {json.dumps(items_batch, indent=2)}

        TANK CLEANING WBS FRAMEWORK:
        
        FOR EACH TANK CLEANING ITEM, PROVIDE:
        
        1. planning: [
              - Safety risk assessment
              - Site access evaluation
              - Confined space entry permit requirements
              - Water supply & drainage planning
              - Waste disposal arrangement
              - Team briefing & PPE checklist
              - Emergency response protocol setup
           ]
        
        2. procurement: [
              - Cleaning chemicals (disinfectants, detergents, degreasers)
              - Safety equipment (harnesses, gas detectors, ventilation fans)
              - Cleaning tools (pumps, brushes, pressure washers)
              - PPE (gloves, boots, masks, coveralls)
              - Water quality testing kits
              - Waste disposal containers
              - First aid & emergency equipment
           ]
        
        3. execution: [
              {{
                "step": integer,
                "activity": "string (Specific tank cleaning step)",
                "estimated_hours": number (Total hours for this specific tank/quantity),
                "safety_requirements": "string (Required safety measures)",
                "optimization_note": "string (How to execute efficiently while maintaining safety)"
              }}
           ]
           
           STANDARD TANK CLEANING EXECUTION STEPS:
           - Step 1: Site setup & safety barrier installation
           - Step 2: Initial inspection & documentation
           - Step 3: Water evacuation/draining
           - Step 4: Sludge removal & extraction
           - Step 5: Interior surface scrubbing/pressure washing
           - Step 6: Disinfection & sanitization (chlorination)
           - Step 7: Final rinse & flushing
           - Step 8: Water quality testing
           - Step 9: Tank refilling
           - Step 10: Final inspection & certification
        
        4. qc: [
              - Pre-cleaning water quality test (pH, TDS, bacteria count)
              - Sludge depth measurement
              - Surface cleanliness inspection (visual & touch)
              - Chlorine residual level check
              - Post-cleaning water quality test (bacteriological analysis)
              - Structural integrity check (cracks, leaks)
              - Overflow & drainage system functionality
              - Final certification & documentation
           ]
        
        5. billing: [
              - Advance payment: 20% (on work order)
              - After water evacuation & sludge removal: 30%
              - After cleaning & disinfection completion: 30%
              - Final payment after water quality test clearance: 20%
              - Include itemized breakdown (labor, chemicals, equipment, disposal)
           ]

        SAFETY & COMPLIANCE CONSIDERATIONS:
        - Confined space entry protocols (for underground/overhead tanks)
        - Gas detection (H2S, CO, O2 levels) before entry
        - Minimum 2-person team for confined spaces
        - Ventilation requirements (air changes per hour)
        - Emergency rescue equipment standby
        - Local municipal water authority guidelines
        - IS standards for potable water (IS 10500:2012)

        ESTIMATION GUIDELINES:
        - Small tanks (<2000L): 4-6 hours
        - Medium tanks (2000-10000L): 6-10 hours
        - Large tanks (>10000L): 10-16 hours
        - Septic tanks: Add 30% time for sludge handling
        - Industrial tanks: Add 50% time for specialized cleaning

        OUTPUT FORMAT:
        Return a JSON object where keys are the work item names.
        
        Example structure:
        {{
          "Overhead Water Tank - Complete Cleaning": {{
            "planning": [...],
            "procurement": [...],
            "execution": [...],
            "qc": [...],
            "billing": [...]
          }}
        }}
        """
        try:
            response = self.model.generate_content(prompt, generation_config=self.config)
            return self.clean_json(response.text)
        except Exception as e:
            logger.error(f"Tank WBS Batch Gen Error: {e}")
            return {}

    def process(self, boq_data: list):
        work_summary = {}
        for item in boq_data:
            name = item.get("Work", "General")
            qty = float(item.get("Quantity", 0))
            unit = item.get("Unit", "units")
            tank_type = item.get("Tank_Type", "Water Tank")
            capacity = item.get("Capacity", "N/A")
            
            if name not in work_summary:
                work_summary[name] = {
                    "qty": 0, 
                    "unit": unit,
                    "tank_type": tank_type,
                    "capacity": capacity
                }
            work_summary[name]["qty"] += qty
        
        unique_items = [
            {
                "work_name": k, 
                "total_qty": f"{v['qty']} {v['unit']}",
                "tank_type": v['tank_type'],
                "capacity": v['capacity']
            } 
            for k, v in work_summary.items()
        ]
        
        wbs_library = {}
        unique_list = list(unique_items)
        
        logger.info(f"🔧 Processing {len(unique_list)} unique tank cleaning items in batches of {self.BATCH_SIZE}...")
        
        for i in range(0, len(unique_list), self.BATCH_SIZE):
            batch = unique_list[i : i + self.BATCH_SIZE]
            results = self.generate_wbs_batch(batch)
            if results: 
                wbs_library.update(results)
            time.sleep(1)
        
        final_output = []
        for row in boq_data:
            work_key = row.get("Work", "General")
            
            # Tank-specific defaults
            defaults = {
                "planning": [
                    "Safety risk assessment",
                    "Confined space entry permit",
                    "PPE checklist verification",
                    "Emergency response setup"
                ],
                "procurement": [
                    "Cleaning chemicals",
                    "Safety equipment",
                    "Water testing kits",
                    "Waste disposal containers"
                ],
                "execution": [
                    {
                        "step": 1,
                        "activity": "Water evacuation",
                        "estimated_hours": 2,
                        "safety_requirements": "Proper drainage setup",
                        "optimization_note": "Use submersible pump for faster drainage"
                    },
                    {
                        "step": 2,
                        "activity": "Interior cleaning & disinfection",
                        "estimated_hours": 4,
                        "safety_requirements": "Confined space protocol",
                        "optimization_note": "Pressure washing for efficient cleaning"
                    }
                ],
                "qc": [
                    "Water quality testing (pre & post)",
                    "Surface cleanliness inspection",
                    "Chlorine residual check"
                ],
                "billing": [
                    "Advance: 20%",
                    "After cleaning: 60%",
                    "Final payment: 20%"
                ]
            }
            
            wbs_details = wbs_library.get(work_key, defaults)
            
            # Tank-specific dimensions format
            dimensions = f"{row.get('Length', 'N/A')}x{row.get('Width', 'N/A')}x{row.get('Height', 'N/A')}m"
            if row.get('Capacity'):
                dimensions += f" ({row.get('Capacity')}L)"
            
            row.update({
                "Dimensions": dimensions,
                "Tank_Specifications": f"{row.get('Tank_Type', 'N/A')} - {row.get('Capacity', 'N/A')}L",
                "WBS_Planning": wbs_details.get("planning", []),
                "WBS_Procurement": wbs_details.get("procurement", []),
                "WBS_Execution": wbs_details.get("execution", []),
                "WBS_QC": wbs_details.get("qc", []),
                "WBS_Billing": wbs_details.get("billing", [])
            })
            final_output.append(row)
        
        logger.info(f"✅ Tank Cleaning WBS Complete. {len(final_output)} items processed.")
        return final_output