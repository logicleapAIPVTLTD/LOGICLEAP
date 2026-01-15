import os
import json
import time
import logging
import math
import boto3
import pandas as pd
import google.genai as genai
from typing import List, Dict, Any
from dotenv import load_dotenv
from botocore.exceptions import ClientError
import sys

# =========================================================
# 1. CONFIGURATION
# =========================================================

# Configure logging to stderr only (keep stdout clean for JSON output)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    stream=sys.stderr  # Send all logs to stderr
)
logger = logging.getLogger(__name__)

# Ensure no other output goes to stdout
import os
# Redirect any accidental stdout prints to stderr for logging
# But keep final JSON output to stdout

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
MODEL_NAME = os.getenv("GEMINI_MODEL_NAME", "gemini-1.5-flash")

# Process items in small batches to ensure high-quality, detailed JSON from Gemini
BATCH_SIZE = 10 

if GEMINI_API_KEY:
    pass  # Will configure in class
else:
    logger.error("GEMINI_API_KEY not found.")
    exit(1)

# =========================================================
# 2. GEMINI ESTIMATOR ENGINE
# =========================================================

class GeminiCostEstimator:
    def __init__(self):
        self.client = genai.Client(api_key=GEMINI_API_KEY)
        
    def estimate_batch(self, batch_items: List[Dict]) -> List[Dict]:
        """
        Sends a batch of BOM items to Gemini to estimate detailed costs.
        """
        
        # Prepare the prompt
        prompt = f"""
        Role: Senior Cost Estimation Engineer (Indian Construction Market).
        Task: Provide a detailed COST BREAKDOWN for the following list of construction materials/works.

        CONTEXT:
        - Location: Tier-1 City, India (e.g., Delhi/Mumbai/Bangalore).
        - Market Rates: Use current market rates (Material + Labor).
        - Project Scale: Residential/Commercial fit-out.
        - Currency: INR.

        INPUT DATA (List of Items):
        {json.dumps(batch_items, indent=2)}

        REQUIREMENTS:
        1. For EACH item, analyze the 'material_name', 'quantity', and 'unit'.
        2. Infer the following costs per unit and total:
           - **Material Cost**: Cost of the item itself.
           - **Labor Cost**: Cost of installation/application (if applicable).
           - **Equipment Cost**: Associated tools/machinery (if applicable).
           - **Overheads**: ~10% (Transport, Handling, Profit).
           - **Contingency**: ~5% (Wastage, Price fluctuation).
        3. If 'material_id' is 'LOCAL_PURCHASE', assume standard local hardware store rates.
        4. Be REALISTIC. Do not underestimate labor for complex items like tiling/painting.

        OUTPUT FORMAT:
        Return a Valid JSON List of Objects. No Markdown. No commentary.
        Structure:
        [
          {{
            "wbs_id": "...",
            "work_item": "...",
            "material_name": "...",
            "quantity": 0.0,
            "unit": "...",
            
            "rate_per_unit_material": 0.0, 
            "rate_per_unit_labor": 0.0,
            
            "total_material_cost": 0.0,
            "total_labor_cost": 0.0,
            "total_equipment_cost": 0.0,
            
            "overheads_and_profit": 0.0,
            "contingency_cost": 0.0,
            
            "grand_total": 0.0,
            
            "confidence_level": "High/Medium/Low",
            "cost_basis": "Unified Market Rate 2025"
          }}
        ]
        """

        retries = 3
        for attempt in range(retries):
            try:
                response = self.client.models.generate_content(model=MODEL_NAME, contents=prompt)
                raw_text = response.text.replace("```json", "").replace("```", "").strip()
                
                # Sanity check: is it JSON?
                if not raw_text.startswith("[") and not raw_text.endswith("]"):
                     # Sometimes Gemini adds intro text
                    start_idx = raw_text.find("[")
                    end_idx = raw_text.rfind("]")
                    if start_idx != -1 and end_idx != -1:
                        raw_text = raw_text[start_idx : end_idx + 1]
                
                estimates = json.loads(raw_text)
                return estimates

            except Exception as e:
                logger.warning(f"⚠️ Batch failed (Attempt {attempt+1}/{retries}): {e}")
                time.sleep(2 * (attempt + 1)) # Exponential backoff
        
        logger.error("Batch failed after all retries.")
        # Return input items with zero costs so pipeline doesn't break
        fallback = []
        for item in batch_items:
            fallback_item = item.copy()
            fallback_item.update({
                "grand_total": 0.0, 
                "confidence_level": "Failed",
                "reason": "AI Error"
            })
            fallback.append(fallback_item)
        return fallback

# =========================================================
# 3. AGGREGATION & PIPELINE
# =========================================================

class CostPipeline:
    def __init__(self, bom_data: List[Dict]):
        self.bom_data = bom_data
        self.estimator = GeminiCostEstimator()
        
    def run(self):
        logger.info("Starting Cost Prediction Engine...")
        
        # 1. Use provided BOM data
        bom_data = self.bom_data
        logger.info(f"Loaded {len(bom_data)} BOM items.")
        
        # 2. Batch Process
        final_estimates = []
        total_batches = math.ceil(len(bom_data) / BATCH_SIZE)
        
        for i in range(0, len(bom_data), BATCH_SIZE):
            batch = bom_data[i : i + BATCH_SIZE]
            
            # Prepare minimal payload for AI to save tokens
            ai_payload = []
            for item in batch:
                ai_payload.append({
                    "wbs_id": item.get("wbs_id"),
                    "work_item": item.get("work_item"),
                    "material_name": item.get("material_name"),
                    "quantity": item.get("quantity"),
                    "unit": item.get("unit"),
                    "material_id": item.get("material_id") # Context for local vs catalog
                })
            
            logger.info(f"   ⚙️ Processing Batch {i//BATCH_SIZE + 1}/{total_batches} ({len(batch)} items)...")
            
            batch_results = self.estimator.estimate_batch(ai_payload)
            
            # Merge AI results back with original data (so we keep source_table, etc.)
            # We match by wbs_id + materials_name or index essentially. 
            # Since AI returns list in same order usually, we can zip, but key matching is safer.
            # For simplicity in this v1, we assume 1:1 mapping order from AI.
            
            if len(batch_results) != len(batch):
                logger.warning(f"   ⚠️ Mismatch in result count ({len(batch_results)} vs {len(batch)}). Using sequential mapping.")
            
            for original, result in zip(batch, batch_results):
                merged = original.copy()
                # Update with cost data
                merged.update(result)
                final_estimates.append(merged)
                
            time.sleep(1) # Rate limit politeness

        # 3. Return Detailed Estimates
        logger.info("Cost estimation completed.")
        return final_estimates
        
    def generate_summary(self, detailed_data: List[Dict]):
        logger.info("📊 Generating Cost Summary...")
        
        total_project_cost = 0.0
        wbs_summary = {}
        
        for item in detailed_data:
            cost = item.get("grand_total", 0.0)
            if isinstance(cost, (int, float)):
                total_project_cost += cost
                
            wbs_id = item.get("wbs_id", "UNKNOWN")
            if wbs_id not in wbs_summary:
                wbs_summary[wbs_id] = {
                    "wbs_id": wbs_id,
                    "work_item": item.get("work_item", "Various"),
                    "total_cost": 0.0,
                    "items_count": 0
                }
            
            wbs_summary[wbs_id]["total_cost"] += cost
            wbs_summary[wbs_id]["items_count"] += 1
            
        summary_report = {
            "project_total_cost": round(total_project_cost, 2),
            "currency": "INR",
            "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "wbs_breakdown": list(wbs_summary.values())
        }
        
        with open(self.summary_path, 'w') as f:
            json.dump(summary_report, f, indent=4)
            
        logger.info(f"✅ Summary saved to {self.summary_path}")
        logger.info(f"💰 PROJECT TOTAL: ₹ {total_project_cost:,.2f}")

# =========================================================
# MAIN EXECUTION
# =========================================================

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        # API mode: read from command line
        try:
            bom_data = json.loads(sys.argv[1])
        except json.JSONDecodeError as e:
            print(json.dumps({"error": f"Invalid JSON input: {e}"}))
            sys.exit(1)
    else:
        # Standalone mode: read from file
        BASE_DIR = os.path.dirname(os.path.abspath(__file__))
        INPUT_FILE = os.path.join(BASE_DIR, "bom_quantities_final.json")
        if not os.path.exists(INPUT_FILE):
            print(json.dumps({"error": f"'{INPUT_FILE}' not found."}))
            sys.exit(1)
        with open(INPUT_FILE, "r") as f:
            bom_data = json.load(f)

    # Run the pipeline
    pipeline = CostPipeline(bom_data)
    result = pipeline.run()
    print(json.dumps(result))