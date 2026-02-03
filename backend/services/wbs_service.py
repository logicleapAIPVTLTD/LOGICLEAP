import google.generativeai as genai
import json
import time
import logging

logger = logging.getLogger(__name__)

class WBSService:
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
        Role: Senior Construction Project Manager & Scheduler.
        Task: Create a 5-Stage Work Breakdown Structure (WBS) with OPTIMIZED execution timelines.
        
        INPUT ITEMS (Work Name & Total Quantity):
        {json.dumps(items_batch, indent=2)}

        FOR EACH ITEM, PROVIDE:
        1. planning: [Site prep steps]
        2. procurement: [Material list]
        3. execution: [
              {{
                "step": integer,
                "activity": "string",
                "estimated_hours": number (Total hours for this specific quantity),
                "optimization_note": "string (How to speed this up)"
              }}
            ]
        4. qc: [Quality check parameters]
        5. billing: [Payment milestones]

        OUTPUT: Return a JSON object where keys are the item names.
        """
        try:
            response = self.model.generate_content(prompt, generation_config=self.config)
            return self.clean_json(response.text)
        except Exception as e:
            logger.error(f"Batch Gen Error: {e}")
            return {}

    def process(self, boq_data: list):
        work_summary = {}
        for item in boq_data:
            name = item.get("Work", "General")
            qty = float(item.get("Quantity", 0))
            unit = item.get("Unit", "units")
            if name not in work_summary:
                work_summary[name] = {"qty": 0, "unit": unit}
            work_summary[name]["qty"] += qty

        unique_items = [{"work_name": k, "total_qty": f"{v['qty']} {v['unit']}"} for k, v in work_summary.items()]
        
        wbs_library = {}
        unique_list = list(unique_items)
        
        logger.info(f"Processing {len(unique_list)} unique items in batches of {self.BATCH_SIZE}...")

        for i in range(0, len(unique_list), self.BATCH_SIZE):
            batch = unique_list[i : i + self.BATCH_SIZE]
            results = self.generate_wbs_batch(batch)
            if results: wbs_library.update(results)
            time.sleep(1)

        final_output = []
        for row in boq_data:
            work_key = row.get("Work", "General")
            defaults = { "planning": [], "procurement": [], "execution": [], "qc": [], "billing": [] }
            wbs_details = wbs_library.get(work_key, defaults)
            
            row.update({
                "Dimensions": f"{row.get('Length')}x{row.get('Width')}",
                "WBS_Planning": wbs_details.get("planning", []),
                "WBS_Procurement": wbs_details.get("procurement", []),
                "WBS_Execution": wbs_details.get("execution", []),
                "WBS_QC": wbs_details.get("qc", []),
                "WBS_Billing": wbs_details.get("billing", [])
            })
            final_output.append(row)
            
        return final_output