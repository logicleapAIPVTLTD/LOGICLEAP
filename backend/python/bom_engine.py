import os
import json
import boto3
import pandas as pd
import google.genai as genai
import time
import logging
import math
from decimal import Decimal
from typing import List, Dict
from dotenv import load_dotenv
import sys

# =========================================================
# 1. CONFIGURATION
# =========================================================

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

load_dotenv()

AWS_REGION = os.getenv("AWS_REGION", "ap-south-2")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
MODEL_NAME = os.getenv("GEMINI_MODEL_NAME", "gemini-2.5-flash")

# UPDATED: Batch Size reduced to 5 for faster processing
BATCH_SIZE = 5 

if GEMINI_API_KEY:
    pass  # Will configure in class
else:
    logger.error("GEMINI_API_KEY not found.")
    exit(1)

# =========================================================
# 2. GLOBAL CRAWLER
# =========================================================

class GlobalCatalogLoader:
    def __init__(self):
        self.dynamodb = boto3.client(
            "dynamodb",
            region_name=AWS_REGION,
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY
        )
        self.cache_file = "global_id_catalog.csv"

    def list_relevant_tables(self) -> List[str]:
        try:
            paginator = self.dynamodb.get_paginator('list_tables')
            all_tables = []
            for page in paginator.paginate():
                all_tables.extend(page['TableNames'])
            
            keywords = ['Master', 'Item', 'SKU', 'Material', 'Stock', 'Rate', 'Price']
            relevant = [t for t in all_tables if any(k.lower() in t.lower() for k in keywords)]
            excludes = ['Log', 'History', 'Feedback', 'Session', 'User', 'Summary', 'Forecast', 'Project']
            return [t for t in relevant if not any(e.lower() in t.lower() for e in excludes)]
        except Exception as e:
            logger.error(f"Failed to list tables: {e}")
            return []

    def scan_table_to_df(self, table_name: str) -> pd.DataFrame:
        try:
            dynamo_res = boto3.resource('dynamodb', region_name=AWS_REGION, aws_access_key_id=AWS_ACCESS_KEY_ID, aws_secret_access_key=AWS_SECRET_ACCESS_KEY)
            table = dynamo_res.Table(table_name)
            
            items = []
            response = table.scan()
            items.extend(response.get('Items', []))
            
            while 'LastEvaluatedKey' in response:
                response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
                items.extend(response.get('Items', []))

            if not items:
                return pd.DataFrame()

            def convert(val): return float(val) if isinstance(val, Decimal) else val
            clean_items = [{k: convert(v) for k, v in i.items()} for i in items]
            
            df = pd.DataFrame(clean_items)
            return self._standardize_columns(df, table_name)
        except Exception as e:
            logger.warning(f"⚠️ Could not scan {table_name}: {e}")
            return pd.DataFrame()

    def _standardize_columns(self, df: pd.DataFrame, source_table: str) -> pd.DataFrame:
        df.columns = df.columns.str.strip()
        cols = {c.lower(): c for c in df.columns}
        rename_map = {}
        
        # Mapping logic
        id_vars = ['itemid', 'materialid', 'sku_id', 'skuid', 'id', 'code', 'work_id', 'item_id']
        for c in id_vars:
            if c in cols:
                rename_map[cols[c]] = 'MaterialID'
                break
        
        name_vars = ['itemname', 'materialname', 'description', 'name', 'sku_name', 'work_name', 'item_name']
        for c in name_vars:
            if c in cols:
                rename_map[cols[c]] = 'ItemName'
                break
                
        unit_vars = ['unit', 'uom', 'measure', 'unit_of_measurement', 'base_unit']
        for c in unit_vars:
            if c in cols:
                rename_map[cols[c]] = 'Unit'
                break

        if 'MaterialID' in rename_map.values() and 'ItemName' in rename_map.values():
            df.rename(columns=rename_map, inplace=True)
            if 'Unit' not in df.columns: df['Unit'] = 'Unit'
            keep_cols = ['MaterialID', 'ItemName', 'Unit']
            df = df[keep_cols].copy()
            df['SourceTable'] = source_table
            logger.info(f"   ✅ Mapped {source_table}: {len(df)} items.")
            return df
        
        return pd.DataFrame()

    def load_unified_catalog(self, force_refresh=False) -> pd.DataFrame:
        if not force_refresh and os.path.exists(self.cache_file):
            logger.info("📂 Loading ID Catalog from Local Cache...")
            return pd.read_csv(self.cache_file)

        logger.info("Starting Global Scan for Material IDs...")
        tables = self.list_relevant_tables()
        all_dfs = []
        for t in tables:
            df = self.scan_table_to_df(t)
            if not df.empty: all_dfs.append(df)
        
        if not all_dfs:
            return pd.DataFrame(columns=['MaterialID', 'ItemName', 'Unit', 'SourceTable'])

        master_df = pd.concat(all_dfs, ignore_index=True)
        master_df.drop_duplicates(subset=['MaterialID'], keep='first', inplace=True)
        master_df.to_csv(self.cache_file, index=False)
        return master_df

# =========================================================
# 3. QUANTITY & MAPPING ENGINE
# =========================================================

class UniversalQuantityEngine:
    def __init__(self, catalog_df: pd.DataFrame):
        self.client = genai.Client(api_key=GEMINI_API_KEY)
        self.master_df = catalog_df.fillna("-")
        self.db_context = self.master_df[['MaterialID', 'ItemName', 'Unit']].to_csv(index=False)

    def generate_quantities(self, wbs_data: List[Dict]) -> List[Dict]:
        logger.info("Calculating Quantities & Mapping IDs...")
        full_bom = []
        
        # 1. Prepare All Requests
        all_requests = []
        for entry in wbs_data:
            work_name = entry.get('boq_reference', 'Unknown')
            qty_info = entry.get('original_qty', "1 Unit") 
            raw_materials = entry.get('stage_2_procurement', entry.get('procurement', []))

            if raw_materials:
                all_requests.append({
                    "wbs_id": entry['wbs_id'],
                    "work_item": work_name,
                    "dimensions": qty_info, 
                    "materials_needed": raw_materials
                })

        if not all_requests:
            return []

        # 2. Process in Batches of 25
        total_batches = math.ceil(len(all_requests) / BATCH_SIZE)
        logger.info(f"Processing {len(all_requests)} items in {total_batches} batches (Size={BATCH_SIZE})...")

        for i in range(0, len(all_requests), BATCH_SIZE):
            batch = all_requests[i : i + BATCH_SIZE]
            logger.info(f"   🚀 Sending Batch {i//BATCH_SIZE + 1}/{total_batches}...")

            prompt = f"""
            Role: Senior Quantity Surveyor.
            Task: 
            1. Calculate exact material quantities required for the work dimensions.
            2. Map each material to the correct ID from the Master Catalog.

            MASTER CATALOG (ID, Name, Unit):
            {self.db_context}

            WORK LIST (Batch):
            {json.dumps(batch, indent=2)}

            RULES:
            1. **Calculations**: Use standard engineering coefficients + 5% wastage.
            2. **Mapping**: Pick the EXACT "MaterialID" from the Master Catalog. If no match, use "LOCAL_PURCHASE".
            3. **Output**: JSON List ONLY.

            OUTPUT SCHEMA:
            [{{ "wbs_id": "...", "work_item": "...", "material_name": "...", "mapped_id": "...", "calculated_qty": 0.0, "unit": "..." }}]
            """

            try:
                response = self.client.models.generate_content(model=MODEL_NAME, contents=prompt)
                clean_json = response.text.replace("```json", "").replace("```", "").strip()
                mapped_results = json.loads(clean_json)

                for item in mapped_results:
                    source = "Estimate"
                    if item.get('mapped_id') != "LOCAL_PURCHASE":
                        row = self.master_df[self.master_df['MaterialID'] == item.get('mapped_id')]
                        if not row.empty:
                            source = row.iloc[0]['SourceTable']

                    full_bom.append({
                        "wbs_id": item.get('wbs_id'),
                        "work_item": item.get('work_item'),
                        "material_id": item.get('mapped_id'),
                        "material_name": item.get('material_name'),
                        "quantity": float(item.get('calculated_qty', 0)),
                        "unit": item.get('unit'),
                        "source_table": source
                    })
                
                # Small sleep to be polite to the API
                time.sleep(1)

            except Exception as e:
                logger.error(f"Batch {i//BATCH_SIZE + 1} Failed: {e}")

        logger.info("✅ Quantity Calculation Complete!")
        return full_bom

# =========================================================
# MAIN EXECUTION
# =========================================================
if __name__ == "__main__":
    if len(sys.argv) > 1:
        # API mode: read from command line
        try:
            wbs_data = json.loads(sys.argv[1])
        except json.JSONDecodeError as e:
            print(json.dumps({"error": f"Invalid JSON input: {e}"}))
            sys.exit(1)
    else:
        # Standalone mode: read from file
        INPUT_FILE = "wbs_output.json"
        if not os.path.exists(INPUT_FILE):
            print(json.dumps({"error": f"'{INPUT_FILE}' not found."}))
            sys.exit(1)
        with open(INPUT_FILE, "r") as f:
            wbs_data = json.load(f)

    # 1. Build Universal ID Catalog
    loader = GlobalCatalogLoader()
    unified_df = loader.load_unified_catalog(force_refresh=False) # Use cached if available

    if unified_df.empty:
        # Fallback to force refresh if cache empty
        unified_df = loader.load_unified_catalog(force_refresh=True)

    if unified_df.empty:
        # Mock catalog for testing
        logger.warning("Using mock catalog for testing.")
        mock_data = [
            {"MaterialID": "MAT001", "ItemName": "Cement", "Unit": "bag", "SourceTable": "Mock"},
            {"MaterialID": "MAT002", "ItemName": "Sand", "Unit": "cubic_ft", "SourceTable": "Mock"},
            {"MaterialID": "MAT003", "ItemName": "Ceramic Tiles", "Unit": "sqm", "SourceTable": "Mock"},
            {"MaterialID": "MAT004", "ItemName": "Tile Adhesive", "Unit": "kg", "SourceTable": "Mock"},
            {"MaterialID": "MAT005", "ItemName": "Grout", "Unit": "kg", "SourceTable": "Mock"},
            {"MaterialID": "MAT006", "ItemName": "Primer", "Unit": "liter", "SourceTable": "Mock"},
            {"MaterialID": "LOCAL_PURCHASE", "ItemName": "Local Purchase", "Unit": "unit", "SourceTable": "Mock"}
        ]
        unified_df = pd.DataFrame(mock_data)

    # 2. Generate Quantities
    engine = UniversalQuantityEngine(unified_df)
    final_bom = engine.generate_quantities(wbs_data)

    print(json.dumps(final_bom))





# import os
# import json
# import boto3
# import pandas as pd
# import google.generativeai as genai
# from decimal import Decimal
# from typing import List, Dict
# from dotenv import load_dotenv
# import logging

# # =========================================================
# # 1. CONFIGURATION
# # =========================================================

# # Setup Logging
# logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
# logger = logging.getLogger(__name__)

# load_dotenv()

# # AWS Credentials
# AWS_REGION = os.getenv("AWS_REGION")
# AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
# AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")

# # AI Keys
# GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
# MODEL_NAME = "gemini-2.5-flash"

# # Tables
# TABLE_MATERIAL_MASTER = os.getenv("DYNAMODB_WORK_TABLE", "material_master")

# # Initialize AI
# if GEMINI_API_KEY:
#     genai.configure(api_key=GEMINI_API_KEY)
# else:
#     logger.error("❌ GEMINI_API_KEY not found in environment variables.")
#     exit(1)

# class BOMQuantityEngine:
#     def __init__(self):
#         self.model = genai.GenerativeModel(MODEL_NAME)
#         self.dynamodb = self._connect_dynamodb()
#         self.master_df = self._load_material_master()
        
#         # Context: ID, Name, Unit (NO RATES)
#         if not self.master_df.empty:
#             cols = ['MaterialID', 'ItemName', 'Unit']
#             valid_cols = [c for c in cols if c in self.master_df.columns]
#             self.db_context = self.master_df[valid_cols].to_csv(index=False)
#         else:
#             self.db_context = "MaterialID,ItemName,Unit\n"

#     def _connect_dynamodb(self):
#         return boto3.resource(
#             "dynamodb",
#             region_name=AWS_REGION,
#             aws_access_key_id=AWS_ACCESS_KEY_ID,
#             aws_secret_access_key=AWS_SECRET_ACCESS_KEY
#         )

#     def _load_material_master(self) -> pd.DataFrame:
#         logger.info(f"🔌 Connecting to DynamoDB: {TABLE_MATERIAL_MASTER}...")
#         try:
#             table = self.dynamodb.Table(TABLE_MATERIAL_MASTER)
#             response = table.scan()
#             items = response.get('Items', [])
            
#             while 'LastEvaluatedKey' in response:
#                 response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
#                 items.extend(response.get('Items', []))

#             if not items:
#                 logger.warning("⚠️ Material Master table is empty!")
#                 return pd.DataFrame(columns=['MaterialID', 'ItemName', 'Unit'])

#             # Helper for Decimals
#             def convert_decimal(val):
#                 return float(val) if isinstance(val, Decimal) else val

#             clean_items = [{k: convert_decimal(v) for k, v in i.items()} for i in items]
#             df = pd.DataFrame(clean_items)
            
#             # Normalize Columns
#             df.columns = df.columns.str.lower().str.strip()
#             column_map = {
#                 'material_id': 'MaterialID', 'materialid': 'MaterialID', 'id': 'MaterialID',
#                 'item_name': 'ItemName', 'itemname': 'ItemName', 'name': 'ItemName',
#                 'unit': 'Unit', 'uom': 'Unit'
#             }
#             df.rename(columns=column_map, inplace=True)
            
#             logger.info(f"✅ Loaded {len(df)} materials for mapping context.")
#             return df

#         except Exception as e:
#             logger.error(f"❌ Database Error: {str(e)}")
#             return pd.DataFrame(columns=['MaterialID', 'ItemName', 'Unit'])

#     def generate_bom_quantities(self, wbs_data: List[Dict]) -> List[Dict]:
#         logger.info("🧠 Calculating Material Quantities (Batch Mode)...")
#         full_bom = []

#         # 1. PREPARE BATCH
#         batch_requests = []
#         for entry in wbs_data:
#             work_name = entry.get('boq_reference', 'Unknown')
#             # Dimensions are crucial for quantity calculation
#             qty_info = entry.get('original_qty', "1 Unit") 
            
#             # Look for materials in stage 2 (Procurement)
#             raw_materials = entry.get('stage_2_procurement', entry.get('procurement', []))

#             if raw_materials:
#                 batch_requests.append({
#                     "wbs_id": entry['wbs_id'],
#                     "work_item": work_name,
#                     "dimensions": qty_info, 
#                     "materials_needed": raw_materials
#                 })

#         if not batch_requests:
#             return []

#         logger.info(f"📦 Batching {len(batch_requests)} work items for Quantity Surveying...")

#         # 2. AI PROMPT (Engineering Focus)
#         prompt = f"""
#         Role: Senior Quantity Surveyor / Estimator.
#         Task: Calculate the exact QUANTITIES of materials required based on work dimensions.

#         MASTER INVENTORY (ID, Name, Unit):
#         {self.db_context}

#         WORK ITEMS TO ANALYZE:
#         {json.dumps(batch_requests, indent=2)}

#         RULES:
#         1. **Analyze Dimensions**: Look at the "dimensions" (e.g., "150 sqft", "10 rft").
#         2. **Calculate Quantities**: 
#            - Use civil engineering constants (e.g., 1 bag cement covers X sqft for mortar).
#            - Include standard wastage (e.g., 5-10% for tiles).
#            - Example: For 100 sqft flooring -> Need ~105 sqft Tiles, ~2 Bags Cement.
#         3. **Map to ID**: Pick the correct "MaterialID" from the Master Inventory list.
#         4. **Return JSON ONLY**: A flat list of all materials for all items.

#         OUTPUT SCHEMA:
#         [
#           {{
#             "wbs_id": "WBS_001",
#             "work_item": "Flooring",
#             "material_name": "Cement",
#             "mapped_id": "CIV-cem-01",
#             "calculated_qty": 3.5,
#             "unit": "Bag"
#           }}
#         ]
#         """

#         try:
#             response = self.model.generate_content(prompt)
#             clean_json = response.text.replace("```json", "").replace("```", "").strip()
#             mapped_results = json.loads(clean_json)

#             # 3. FORMAT OUPUT (No Costs)
#             for item in mapped_results:
#                 full_bom.append({
#                     "wbs_id": item.get('wbs_id'),
#                     "work_item": item.get('work_item'),
#                     "material_id": item.get('mapped_id'),
#                     "material_name": item.get('material_name'),
#                     "quantity": float(item.get('calculated_qty', 0)),
#                     "unit": item.get('unit'),
#                     "status": "Quantity Estimated"
#                 })

#             logger.info("✅ Quantity Calculation Complete!")

#         except Exception as e:
#             logger.error(f"❌ Batch Calculation Failed: {e}")

#         return full_bom

# # =========================================================
# # MAIN EXECUTION
# # =========================================================
# if __name__ == "__main__":
#     print("\n==========================================")
#     print("   AI BOM QUANTITY ENGINE (No Costing)")
#     print("==========================================\n")

#     INPUT_FILE = "wbs_output.json"
#     OUTPUT_FILE = "bom_quantities.json"

#     if not os.path.exists(INPUT_FILE):
#         logger.error(f"'{INPUT_FILE}' not found. Please run WBS Engine first.")
#         exit(1)

#     with open(INPUT_FILE, "r") as f:
#         wbs_data = json.load(f)

#     engine = BOMQuantityEngine()
#     final_bom = engine.generate_bom_quantities(wbs_data)

#     with open(OUTPUT_FILE, "w") as f:
#         json.dump(final_bom, f, indent=4)

#     if final_bom:
#         df_out = pd.DataFrame(final_bom)
#         print("\n" + "="*80)
#         # Check columns before printing
#         cols = ['work_item', 'material_name', 'quantity', 'unit', 'material_id']
#         existing = [c for c in cols if c in df_out.columns]
#         if existing:
#             df_out.sort_values(by='work_item', inplace=True)
#             print(df_out[existing].head(20).to_string(index=False))
#         print("="*80)
    
#     logger.info(f"BOM Quantities saved to '{OUTPUT_FILE}'")




# # import os
# # import json
# # import boto3
# # import pandas as pd
# # import google.generativeai as genai
# # from decimal import Decimal
# # from typing import List, Dict
# # from dotenv import load_dotenv

# # # =========================================================
# # # 1. CONFIGURATION
# # # =========================================================

# # load_dotenv()

# # # AWS Credentials
# # AWS_REGION = os.getenv("AWS_REGION")
# # AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
# # AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")

# # # AI Keys
# # GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
# # MODEL_NAME = "gemini-2.5-flash"

# # # Tables
# # TABLE_MATERIAL_MASTER = os.getenv("DYNAMODB_WORK_TABLE", "material_master")

# # # Initialize
# # if GEMINI_API_KEY:
# #     genai.configure(api_key=GEMINI_API_KEY)

# # class BOMEngine:
# #     def __init__(self):
# #         self.model = genai.GenerativeModel(MODEL_NAME)
# #         self.dynamodb = self._connect_dynamodb()
# #         self.master_df = self._load_material_master()
        
# #         # Prepare context for AI (Lightweight CSV string)
# #         if not self.master_df.empty:
# #             # Check required columns exist before accessing
# #             required_cols = ['MaterialID', 'ItemName', 'Unit']
# #             available_cols = [c for c in required_cols if c in self.master_df.columns]
            
# #             if len(available_cols) == 3:
# #                 self.db_context = self.master_df[required_cols].to_csv(index=False)
# #             else:
# #                 print(f"⚠️ Warning: Missing columns for AI Context. Found: {self.master_df.columns.tolist()}")
# #                 self.db_context = self.master_df.to_csv(index=False) # Fallback to all columns
# #         else:
# #             self.db_context = "MaterialID,ItemName,Unit\n"

# #     def _connect_dynamodb(self):
# #         return boto3.resource(
# #             "dynamodb",
# #             region_name=AWS_REGION,
# #             aws_access_key_id=AWS_ACCESS_KEY_ID,
# #             aws_secret_access_key=AWS_SECRET_ACCESS_KEY
# #         )

# #     def _load_material_master(self) -> pd.DataFrame:
# #         print(f"🔌 Connecting to DynamoDB: {TABLE_MATERIAL_MASTER}...")
# #         try:
# #             table = self.dynamodb.Table(TABLE_MATERIAL_MASTER)
# #             response = table.scan()
# #             items = response.get('Items', [])
            
# #             while 'LastEvaluatedKey' in response:
# #                 response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
# #                 items.extend(response.get('Items', []))

# #             if not items:
# #                 print("⚠️ Warning: Material Master table is empty!")
# #                 return pd.DataFrame(columns=['MaterialID', 'ItemName', 'Unit', 'Rate'])

# #             # Convert Decimal to Float
# #             def convert_decimal(val):
# #                 return float(val) if isinstance(val, Decimal) else val

# #             clean_items = [{k: convert_decimal(v) for k, v in i.items()} for i in items]
# #             df = pd.DataFrame(clean_items)
            
# #             print(f"   🔍 Found Columns: {df.columns.tolist()}")

# #             # --- COLUMN NORMALIZATION FIX ---
# #             # 1. Lowercase everything to make matching easier
# #             df.columns = df.columns.str.lower().str.strip()
            
# #             # 2. Map known variations to Standard Names
# #             # Adjust these mapping keys based on what you see in the "Found Columns" print output
# #             column_map = {
# #                 # ID mappings
# #                 'material_id': 'MaterialID', 'materialid': 'MaterialID', 'id': 'MaterialID', 'code': 'MaterialID',
                
# #                 # Name mappings
# #                 'item_name': 'ItemName', 'itemname': 'ItemName', 'name': 'ItemName', 'material_name': 'ItemName', 'materialname': 'ItemName',
                
# #                 # Unit mappings
# #                 'unit': 'Unit', 'uom': 'Unit',
                
# #                 # Rate mappings
# #                 'rate': 'Rate', 'price': 'Rate', 'cost': 'Rate', 'unit_price': 'Rate'
# #             }
            
# #             df.rename(columns=column_map, inplace=True)
            
# #             # 3. Verify Mapping
# #             final_cols = df.columns.tolist()
# #             if 'MaterialID' not in final_cols or 'ItemName' not in final_cols:
# #                 print("❌ CRITICAL: Could not auto-map columns! Please update the 'column_map' dict in the script.")
# #                 print(f"   Current standardized columns: {final_cols}")
# #             else:
# #                 print(f"✅ Loaded {len(df)} materials. Columns mapped successfully.")

# #             return df

# #         except Exception as e:
# #             print(f"❌ Database Error: {str(e)}")
# #             return pd.DataFrame(columns=['MaterialID', 'ItemName', 'Unit', 'Rate'])

# #     def generate_bom(self, wbs_data: List[Dict]) -> List[Dict]:
# #         print("\n🧠 Mapping WBS items to Inventory (Optimized Batch)...")
# #         full_bom = []

# #         # 1. PREPARE BATCH REQUEST
# #         batch_requests = []
# #         for entry in wbs_data:
# #             work_name = entry.get('boq_reference', 'Unknown')
# #             # Check 5-stage key first, then fallback
# #             raw_materials = entry.get('stage_2_procurement', entry.get('procurement', []))
            
# #             if raw_materials:
# #                 batch_requests.append({
# #                     "wbs_id": entry['wbs_id'],
# #                     "location": entry['location'],
# #                     "work_item": work_name,
# #                     "materials": raw_materials
# #                 })

# #         if not batch_requests:
# #             return []

# #         print(f"📦 Batching {len(batch_requests)} work packages for single AI analysis...")

# #         # 2. SINGLE API CALL (Batched)
# #         prompt = f"""
# #         Role: Procurement Officer.
# #         Task: Map raw construction material requirements to the Approved Material Master List.

# #         MASTER DATABASE (Available Items):
# #         {self.db_context}

# #         RAW REQUIREMENTS (Batch List):
# #         {json.dumps(batch_requests, indent=2)}

# #         RULES:
# #         1. Iterate through every item in the "RAW REQUIREMENTS" list.
# #         2. For every string in the "materials" list, find the closest matching "MaterialID".
# #         3. If "Cement" is needed, map to "CIV-cem-01" (or similar from DB).
# #         4. If the item is "Water" or "Rags" (not in DB), use "LOCAL_PURCHASE".
# #         5. Return a SINGLE JSON list containing all mapped items for all WBS IDs.

# #         OUTPUT SCHEMA:
# #         [
# #           {{
# #             "wbs_id": "WBS_001",
# #             "work_item": "Flooring",
# #             "raw_req": "Cement",
# #             "mapped_id": "CIV-cem-01",
# #             "mapped_name": "Cement - OPC 53 Grade",
# #             "unit": "Bag"
# #           }}
# #         ]
# #         """

# #         try:
# #             response = self.model.generate_content(prompt)
# #             clean_json = response.text.replace("```json", "").replace("```", "").strip()
# #             mapped_results = json.loads(clean_json)

# #             # 3. ENRICH DATA LOCALLY
# #             for item in mapped_results:
# #                 rate = 0.0
# #                 status = "Cash Purchase"
                
# #                 if item.get('mapped_id') != "LOCAL_PURCHASE":
# #                     # Check if mapped_id exists in our DataFrame
# #                     if 'MaterialID' in self.master_df.columns:
# #                         row = self.master_df[self.master_df['MaterialID'] == item.get('mapped_id')]
# #                         if not row.empty:
# #                             rate = float(row.iloc[0]['Rate']) if 'Rate' in row.columns else 0.0
# #                             status = "Ready to Order"

# #                 full_bom.append({
# #                     "wbs_reference_id": item.get('wbs_id', 'Unknown'),
# #                     "work_item": item.get('work_item', 'Unknown'),
# #                     "material_id": item.get('mapped_id', 'Unknown'),
# #                     "material_name": item.get('mapped_name', 'Unknown'),
# #                     "raw_requirement": item.get('raw_req', ''),
# #                     "unit": item.get('unit', '-'),
# #                     "estimated_rate": rate,
# #                     "status": status
# #                 })

# #             print(" ✅ Mapping Complete!")

# #         except Exception as e:
# #             print(f" ❌ Batch Mapping Failed: {e}")

# #         return full_bom

# # # =========================================================
# # # MAIN EXECUTION
# # # =========================================================
# # if __name__ == "__main__":
# #     print("\n==========================================")
# #     print("   AI BOM ENGINE (Batch Optimized)")
# #     print("==========================================\n")

# #     INPUT_FILE = "wbs_output.json"
# #     OUTPUT_FILE = "bom_output.json"

# #     if not os.path.exists(INPUT_FILE):
# #         print(f"❌ Error: '{INPUT_FILE}' not found. Run WBS Engine first.")
# #         exit(1)

# #     with open(INPUT_FILE, "r") as f:
# #         wbs_data = json.load(f)

# #     engine = BOMEngine()
# #     final_bom = engine.generate_bom(wbs_data)

# #     with open(OUTPUT_FILE, "w") as f:
# #         json.dump(final_bom, f, indent=4)

# #     if final_bom:
# #         df_out = pd.DataFrame(final_bom)
# #         print("\n" + "="*80)
# #         # Safe printing - check if columns exist
# #         cols = ['material_id', 'material_name', 'estimated_rate', 'status']
# #         existing = [c for c in cols if c in df_out.columns]
# #         if existing:
# #             print(df_out[existing].head(15).to_string(index=False))
# #         print("="*80)
    
# #     print(f"\n✅ BOM Generated: Saved to '{OUTPUT_FILE}'")