import os
import json
import time
import math
import google.genai as genai
from typing import List, Dict, Optional
import sys

# =========================================================
# 1. CONFIGURATION
# =========================================================



# API Keys
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
MODEL_NAME = os.getenv("GEMINI_MODEL_NAME", "gemini-2.5-flash")

# Batch Size (Updated to 10 as requested)
BATCH_SIZE = 10 

if not GEMINI_API_KEY:
    print("Error: GEMINI_API_KEY not found in .env")
    exit(1)

class WBSEngine:
    def __init__(self):
        self.client = genai.Client(api_key=GEMINI_API_KEY)

    def generate_wbs_batch(self, items_batch: List[Dict]) -> Dict[str, Dict]:
        """
        Sends a BATCH of unique work items to Gemini in one go.
        Returns a dictionary mapping 'Work Name' -> '5-Stage WBS Details'.
        """
        # Prepare the list for the prompt
        batch_context = []
        for item in items_batch:
            batch_context.append({
                "id": item['work_name'], 
                "spec": item.get('description', ''),
                "qty": f"{item.get('area', 0)} {item.get('unit', '')}" 
            })
        
        print(f"Batching {len(batch_context)} items for 5-Stage Analysis...", end="", flush=True, file=sys.stderr)

        prompt = f"""
        Role: Senior Construction Project Manager.
        Task: Create a detailed 5-Stage Work Breakdown Structure (WBS) for the following construction items.

        INPUT LIST:
        {json.dumps(batch_context, indent=2)}

        REQUIREMENTS FOR EACH ITEM (Generate these 5 specific keys):
        1. **Planning**: Pre-execution tasks (Site survey, marking, permits, safety checks).
        2. **Procurement**: Raw materials list (Cement, Sand, Tiles, Glue).
        3. **Execution**: Step-by-step installation process with estimated hours.
        4. **QC**: Quality Control checks (Level check, slope check, bonding check).
        5. **Billing**: Milestones for raising bills (e.g., "50% on material delivery", "100% on handover").

        OUTPUT FORMAT (Strict JSON):
        Return a single JSON Object where keys are the "id" from the input list.
        Example Structure:
        {{
            "Vitrified Flooring": {{
                "planning": ["Check floor level", "Mark start point"],
                "procurement": ["Vitrified Tiles", "Cement", "Sand"],
                "execution": [
                    {{ "step": 1, "activity": "Surface Cleaning", "hours": 2 }},
                    {{ "step": 2, "activity": "Mortar Bedding", "hours": 4 }}
                ],
                "qc": ["Hollowness check", "Slope check"],
                "billing": ["Material Advance", "Final Measurement"]
            }}
        }}
        """

        try:
            response = self.client.models.generate_content(model=MODEL_NAME, contents=prompt)
            clean_text = response.text.strip().replace("```json", "").replace("```", "").strip()
            print(" Done!", file=sys.stderr)
            return json.loads(clean_text)
        except Exception as e:
            print(f" Batch Failed: {e}", file=sys.stderr)
            return {}

    def process_boq_payload(self, boq_data: List[Dict]) -> List[Dict]:
        """
        Orchestrates Deduplication -> Batching -> Mapping.
        """
        print(f"Processing {len(boq_data)} BOQ items...", file=sys.stderr)

        # 1. DEDUPLICATION
        unique_works = {}
        for item in boq_data:
            w_name = item.get('work_name', 'Unknown')
            # Keep the one with the longest description (likely most detailed)
            if w_name not in unique_works or len(item.get('description', '')) > len(unique_works[w_name].get('description', '')):
                unique_works[w_name] = item
        
        unique_items_list = list(unique_works.values())
        print(f"Optimization: Reduced to {len(unique_items_list)} unique work definitions.", file=sys.stderr)

        # 2. BATCH PROCESSING
        wbs_library = {} 
        
        # Process in chunks of 10
        total_batches = math.ceil(len(unique_items_list) / BATCH_SIZE)
        
        for i in range(0, len(unique_items_list), BATCH_SIZE):
            batch = unique_items_list[i : i + BATCH_SIZE]
            
            # Call AI
            batch_results = self.generate_wbs_batch(batch)
            
            # Merge results into library
            if batch_results:
                wbs_library.update(batch_results)
            
            # Rate Limit safety
            if i + BATCH_SIZE < len(unique_items_list):
                time.sleep(2) 

        # 3. RE-MAPPING (Expand back to full BOQ list)
        final_wbs_plan = []
        
        for i, item in enumerate(boq_data):
            w_name = item.get('work_name', 'Unknown')
            
            # Fetch from library
            node_details = wbs_library.get(w_name)
            
            # Fallback
            if not node_details:
                node_details = {
                    "planning": ["Review Specs"],
                    "procurement": [],
                    "execution": [],
                    "qc": ["Visual Check"],
                    "billing": ["On Completion"]
                }

            wbs_node = {
                "wbs_id": f"WBS_{i+1:03d}",
                "boq_reference": w_name,
                "location": item.get('room_name', 'General'),
                "original_qty": f"{item.get('area', 0)} {item.get('unit', '')}",
                
                # --- THE 5 STAGES ---
                "stage_1_planning": node_details.get("planning", []),
                "stage_2_procurement": node_details.get("procurement", []),
                "stage_3_execution": node_details.get("execution", []),
                "stage_4_qc": node_details.get("qc", []),
                "stage_5_billing": node_details.get("billing", [])
            }
            final_wbs_plan.append(wbs_node)

        return final_wbs_plan

# =========================================================
# MAIN EXECUTION
# =========================================================
if __name__ == "__main__":
    if len(sys.argv) > 1:
        # API mode: input from command line
        try:
            sample_data = json.loads(sys.argv[1])
        except json.JSONDecodeError as e:
            print(json.dumps({"error": f"Invalid JSON input: {e}"}))
            sys.exit(1)
    else:
        # Standalone mode: read from file
        INPUT_FILE = "boq_payload.json"
        if not os.path.exists(INPUT_FILE):
            print(json.dumps({"error": f"'{INPUT_FILE}' not found."}))
            sys.exit(1)
        with open(INPUT_FILE, "r") as f:
            sample_data = json.load(f)

    engine = WBSEngine()
    wbs_output = engine.process_boq_payload(sample_data)

    print(json.dumps(wbs_output))







# import os
# import json
# import time
# import google.generativeai as genai
# from typing import List, Dict, Optional

# # =========================================================
# # 1. CONFIGURATION
# # =========================================================

# # API Keys (Load from Environment in Production)
# GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyAgDp3z1g2flb2bWcgIL6ru5xWQbCjW3Jo")
# MODEL_NAME = "gemini-2.5-flash"

# # Configure AI
# genai.configure(api_key=GEMINI_API_KEY)

# class WBSEngine:
#     def __init__(self):
#         self.model = genai.GenerativeModel(MODEL_NAME)

#     def generate_wbs_node(self, boq_item: Dict) -> Optional[Dict]:
#         """
#         Generates a WBS node for a single BOQ item using GenAI.
#         """
#         work_name = boq_item.get('work_name', 'Unknown Work')
#         print(f"🤖 Analyzing: {work_name}...", end="", flush=True)

#         # --- THE ENGINEER PROMPT ---
#         # Highly specific prompt to ensure strictly formatted JSON output
#         prompt = f"""
#         Role: Senior Construction Project Manager.
#         Task: Create a detailed Work Breakdown Structure (WBS) for a specific Bill of Quantities (BOQ) item.

#         INPUT CONTEXT:
#         - Work Item: {work_name}
#         - Specification: {boq_item.get('description', '')}
#         - Quantity: {boq_item.get('area', 0)} {boq_item.get('unit', '')}
#         - Location: {boq_item.get('room_name', 'General')}

#         REQUIREMENTS:
#         1. **Execution Steps**: Logical, sequential construction steps (e.g., Site Prep -> Install -> Finish).
#         2. **Procurement**: Comprehensive list of raw materials required (e.g., Cement, Sand, Tiles).
#         3. **Dependencies**: Pre-requisites (what must be done before) and Post-requisites.
#         4. **Quality Checks**: Critical inspections required upon completion.

#         OUTPUT FORMAT (Strict JSON):
#         Return ONLY a JSON object. No Markdown. Structure:
#         {{
#             "procurement_list": ["Material 1", "Material 2"],
#             "pre_requisites": ["Task A", "Task B"],
#             "execution_steps": [
#                 {{"step": 1, "activity": "Description of step", "est_hours": 4.0}},
#                 {{"step": 2, "activity": "Description of step", "est_hours": 8.0}}
#             ],
#             "quality_check": "Specific inspection criteria"
#         }}
#         """

#         try:
#             # Generate Content
#             response = self.model.generate_content(prompt)
            
#             # Robust JSON Cleaning
#             clean_text = response.text.strip()
#             if clean_text.startswith("```json"):
#                 clean_text = clean_text[7:]
#             if clean_text.endswith("```"):
#                 clean_text = clean_text[:-3]
            
#             wbs_data = json.loads(clean_text.strip())
#             print(" ✅ Done!")
#             return wbs_data

#         except json.JSONDecodeError:
#             print(f" ❌ JSON Parsing Failed for {work_name}")
#             return None
#         except Exception as e:
#             print(f" ❌ AI Error: {str(e)}")
#             return None

#     def process_boq_payload(self, boq_data: List[Dict]) -> List[Dict]:
#         """
#         Orchestrates the WBS generation for the entire BOQ list.
#         """
#         final_wbs_plan = []
        
#         for i, item in enumerate(boq_data):
#             # Generate AI details
#             node_details = self.generate_wbs_node(item)
            
#             # Fallback for failed generation
#             if not node_details:
#                 node_details = {
#                     "procurement_list": [],
#                     "pre_requisites": [],
#                     "execution_steps": [],
#                     "quality_check": "Manual Review Required"
#                 }

#             # Structure the final WBS Node
#             wbs_node = {
#                 "wbs_id": f"WBS_{i+1:03d}",
#                 "boq_reference": item.get('work_name', 'Unknown'),
#                 "location": item.get('room_name', 'General'),
#                 "original_boq_data": item, # Keep original context
#                 "procurement": node_details.get("procurement_list", []),
#                 "pre_requisites": node_details.get("pre_requisites", []),
#                 "execution_plan": node_details.get("execution_steps", []),
#                 "qc_criteria": node_details.get("quality_check", "")
#             }
#             final_wbs_plan.append(wbs_node)
            
#             # Rate Limiting (Prevent 429 Errors)
#             time.sleep(1.0) 

#         return final_wbs_plan

# # =========================================================
# # MAIN EXECUTION (CLI / TEST)
# # =========================================================
# if __name__ == "__main__":
#     print("\n==========================================")
#     print("   AI WBS ENGINE (Production Ready)")
#     print("==========================================\n")

#     INPUT_FILE = "boq_payload.json"
#     OUTPUT_FILE = "wbs_output.json"

#     # 1. Load Input
#     if not os.path.exists(INPUT_FILE):
#         print(f"❌ Error: '{INPUT_FILE}' not found. Please run the BOQ Engine first.")
#         # Create dummy data for testing if file missing
#         sample_data = [
#             {"room_name": "Test Room", "work_name": "False Ceiling", "description": "Gypsum board ceiling", "area": 100, "unit": "sqft"}
#         ]
#         print("⚠️ Using DUMMY data for test run...")
#     else:
#         with open(INPUT_FILE, "r") as f:
#             sample_data = json.load(f)

#     # 2. Run Engine
#     engine = WBSEngine()
#     wbs_output = engine.process_boq_payload(sample_data)

#     # 3. Save Output
#     with open(OUTPUT_FILE, "w") as f:
#         json.dump(wbs_output, f, indent=4)
    
#     print(f"\n✅ WBS Generated: Saved to '{OUTPUT_FILE}'")