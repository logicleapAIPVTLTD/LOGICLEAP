import google.generativeai as genai
import json
import time
import logging
import re

logger = logging.getLogger(__name__)

class CostService:
    def __init__(self, api_key: str, model_name: str = "gemini-2.5-flash-lite"):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(model_name)
        self.config = genai.types.GenerationConfig(
            temperature=0.0,
            response_mime_type="application/json"
        )
        self.BATCH_SIZE = 25

    def clean_json(self, raw_text: str):
        try:
            text = raw_text.replace("```json", "").replace("```", "").strip()
            return json.loads(text)
        except:
            return {}

    def estimate_costs_batch(self, batch_items: list, city_tier: str) -> dict:
        prompt = f"""
        Role: Senior Cost Consultant (QS).
        Location Context: India, {city_tier} City.
        Task: Provide a detailed material and labor cost estimate.

        MARKET BENCHMARKS (2026 BASELINE):
        - Use CPWD DSR 2024 as base + 15% inflation for 2026.
        - Material Rates must include transport to site.
        - Labor Rates should reflect {city_tier} market (Daily wage / Productivity sqft).

        INPUT BOM:
        {json.dumps(batch_items)}

        OUTPUT REQUIREMENTS:
        Return a JSON object where each key is the 'Material' name from the input.
        Provide: 
        1. mat_rate: Market rate per unit.
        2. lab_rate: Labor/Installation rate per unit.
        3. total_item_cost: (mat_rate + lab_rate) * quantity.
        4. logic: Brief justification (e.g., 'Premium Acrylic Paint rate').

        OUTPUT FORMAT:
        {{
          "Material Name": {{
            "rate_material": number,
            "rate_labor": number,
            "subtotal": number,
            "remarks": "string"
          }}
        }}
        """
        try:
            response = self.model.generate_content(prompt, generation_config=self.config)
            return self.clean_json(response.text)
        except Exception as e:
            logger.error(f"Cost Batch Error: {e}")
            return {}

    def process(self, bom_data: list, city_tier: str):
        material_catalog = {}
        for item in bom_data:
            mat_name = item.get("Material")
            if mat_name not in material_catalog:
                material_catalog[mat_name] = {
                    "material": mat_name,
                    "unit": item.get("Unit"),
                    "qty": item.get("Est_Quantity")
                }
        
        unique_mats = list(material_catalog.values())
        price_library = {}
        
        logger.info(f"💰 Pricing {len(unique_mats)} unique materials...")

        for i in range(0, len(unique_mats), self.BATCH_SIZE):
            batch = unique_mats[i : i + self.BATCH_SIZE]
            results = self.estimate_costs_batch(batch, city_tier)
            if results: price_library.update(results)
            time.sleep(1)

        final_estimate = []
        grand_total = 0

        for row in bom_data:
            mat_name = row.get("Material")
            pricing = price_library.get(mat_name, {"rate_material": 0, "rate_labor": 0, "remarks": "Pricing Unavailable"})
            
            qty = float(row.get("Est_Quantity", 0))
            mat_rate = pricing.get("rate_material", 0)
            lab_rate = pricing.get("rate_labor", 0)
            item_total = (mat_rate + lab_rate) * qty
            grand_total += item_total

            final_estimate.append({
                "Room": row.get("Room"),
                "Material": mat_name,
                "Qty": qty,
                "Unit": row.get("Unit"),
                "Rate_Mat": mat_rate,
                "Rate_Lab": lab_rate,
                "Subtotal": round(item_total, 2),
                "Source": pricing.get("remarks")
            })

        return {
            "project_summary": { "city_tier": city_tier, "total_cost": round(grand_total, 2), "currency": "INR" },
            "line_items": final_estimate
        }