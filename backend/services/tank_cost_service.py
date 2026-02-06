import google.generativeai as genai
import json
import time
import logging
import re

logger = logging.getLogger(__name__)

class TankCostService:
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
        Role: Tank Cleaning & Sanitation Cost Specialist.
        Location Context: India, {city_tier} City.
        
        Task: Provide detailed cost estimates for tank cleaning materials, chemicals, labor, and equipment.

        MARKET BENCHMARKS (2026 BASELINE):
        - Use industry-standard rates for cleaning chemicals and equipment
        - Material costs include transport and handling charges
        - Labor rates for specialized tank cleaning (confined space certified workers)
        - Equipment rental rates (pumps, safety gear, testing kits)
        - Waste disposal charges as per municipal guidelines
        
        TANK CLEANING COST COMPONENTS:
        1. CHEMICALS & CONSUMABLES:
           - Disinfectants (Sodium Hypochlorite, Chlorine tablets)
           - Detergents and degreasers
           - Water treatment chemicals
           - pH adjusters and flocculants
           
        2. SAFETY EQUIPMENT (Rental/Usage):
           - Confined space entry equipment
           - Gas detectors (H2S, CO, O2)
           - Safety harnesses and lifelines
           - PPE (Gloves, boots, masks, coveralls)
           - Ventilation fans
           
        3. CLEANING EQUIPMENT:
           - Submersible pumps
           - Pressure washers
           - Scrubbing brushes and tools
           - Vacuum equipment
           - Water quality testing kits
           
        4. LABOR:
           - Skilled tank cleaners (confined space certified)
           - Safety supervisors
           - Quality testing personnel
           - Waste disposal handlers
           
        5. SERVICES:
           - Water quality testing (pre & post)
           - Sludge disposal
           - Waste water treatment
           - Certification fees

        TIER-BASED PRICING ({city_tier}):
        - T1: Metro cities (Higher rates due to stricter regulations)
        - T2: Tier-2 cities (Moderate rates)
        - T3: Smaller towns (Lower rates, limited specialized services)

        INPUT BOM:
        {json.dumps(batch_items)}

        OUTPUT REQUIREMENTS:
        Return a JSON object where each key is the 'Material' name from the input.
        Provide: 
        1. mat_rate: Material/Chemical/Equipment cost per unit
        2. lab_rate: Labor/Service charge per unit
        3. total_item_cost: (mat_rate + lab_rate) * quantity
        4. logic: Brief justification (e.g., 'Industrial grade disinfectant with disposal')

        EXAMPLE RATES FOR REFERENCE:
        - Sodium Hypochlorite (10% solution): ₹80-120/Liter (material) + ₹30/Liter (handling)
        - Tank scrubbing labor: ₹500-800/sqm (T1), ₹300-500/sqm (T2), ₹200-350/sqm (T3)
        - Water quality testing: ₹1500-3000/test
        - Sludge disposal: ₹50-80/kg
        - Confined space safety equipment: ₹500-1000/day (rental)

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
            logger.error(f"Tank Cost Batch Error: {e}")
            return {}

    def process(self, bom_data: list, city_tier: str):
        material_catalog = {}
        for item in bom_data:
            mat_name = item.get("Material")
            if mat_name not in material_catalog:
                material_catalog[mat_name] = {
                    "material": mat_name,
                    "unit": item.get("Unit"),
                    "qty": item.get("Est_Quantity"),
                    "tank_area": item.get("Tank/Area", "N/A")  # Tank-specific field
                }
        
        unique_mats = list(material_catalog.values())
        price_library = {}
        
        logger.info(f"💰 Pricing {len(unique_mats)} unique tank cleaning materials & services...")
        for i in range(0, len(unique_mats), self.BATCH_SIZE):
            batch = unique_mats[i : i + self.BATCH_SIZE]
            results = self.estimate_costs_batch(batch, city_tier)
            if results: 
                price_library.update(results)
            time.sleep(1)

        final_estimate = []
        grand_total = 0
        
        # Track costs by category
        category_totals = {
            "Chemicals & Consumables": 0,
            "Safety Equipment": 0,
            "Cleaning Equipment": 0,
            "Labor & Services": 0,
            "Testing & Disposal": 0
        }
        
        for row in bom_data:
            mat_name = row.get("Material")
            pricing = price_library.get(mat_name, {
                "rate_material": 0, 
                "rate_labor": 0, 
                "remarks": "Pricing Unavailable"
            })
            
            qty = float(row.get("Est_Quantity", 0))
            mat_rate = pricing.get("rate_material", 0)
            lab_rate = pricing.get("rate_labor", 0)
            item_total = (mat_rate + lab_rate) * qty
            grand_total += item_total
            
            # Categorize costs (basic categorization logic)
            category = self._categorize_material(mat_name)
            category_totals[category] += item_total
            
            final_estimate.append({
                "Tank/Area": row.get("Tank/Area", "N/A"),  # Changed from "Room"
                "Material": mat_name,
                "Category": category,
                "Qty": qty,
                "Unit": row.get("Unit"),
                "Rate_Mat": mat_rate,
                "Rate_Lab": lab_rate,
                "Subtotal": round(item_total, 2),
                "Source": pricing.get("remarks")
            })
        
        logger.info(f"✅ Tank Cleaning Cost Estimate Complete. Total: ₹{round(grand_total, 2)}")
        
        return {
            "project_summary": {
                "service_type": "Tank Cleaning",
                "city_tier": city_tier,
                "total_cost": round(grand_total, 2),
                "currency": "INR",
                "category_breakdown": {k: round(v, 2) for k, v in category_totals.items()}
            },
            "line_items": final_estimate
        }
    
    def _categorize_material(self, material_name: str) -> str:
        """Categorize materials based on their name"""
        material_lower = material_name.lower()
        
        if any(word in material_lower for word in ['chlorine', 'disinfect', 'chemical', 'detergent', 'bleach', 'acid']):
            return "Chemicals & Consumables"
        elif any(word in material_lower for word in ['harness', 'ppe', 'glove', 'mask', 'detector', 'safety']):
            return "Safety Equipment"
        elif any(word in material_lower for word in ['pump', 'brush', 'washer', 'vacuum', 'tool', 'equipment']):
            return "Cleaning Equipment"
        elif any(word in material_lower for word in ['test', 'disposal', 'waste', 'certification']):
            return "Testing & Disposal"
        else:
            return "Labor & Services"