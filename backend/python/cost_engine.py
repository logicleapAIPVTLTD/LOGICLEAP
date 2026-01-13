# from decimal import Decimal
# import re
# import boto3

# # ============================================================
# # 🔐 AWS CONFIG (REGION: ap-south-2)
# # ============================================================
# AWS_REGION = "ap-south-2"
# AWS_ACCESS_KEY_ID = "AKIAYH3VJY2ZUOPIZ27O"
# AWS_SECRET_ACCESS_KEY = "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"

# dynamodb = boto3.resource(
#     "dynamodb",
#     region_name=AWS_REGION,
#     aws_access_key_id=AWS_ACCESS_KEY_ID,
#     aws_secret_access_key=AWS_SECRET_ACCESS_KEY
# )

# client = dynamodb.meta.client

# # ============================================================
# # 🛡️ REQUIRED TABLE CHECK (NO AUTO CREATION)
# # ============================================================
# REQUIRED_TABLES = [
#     "ItemRateMaster",
#     "LabourRateMaster",
#     "MachineryRateMaster",
#     "ItemMappingMaster",
#     "StateCityIndexMaster"
# ]

# for table in REQUIRED_TABLES:
#     client.describe_table(TableName=table)

# # ============================================================
# # 📦 TABLE HANDLES
# # ============================================================
# ITEM_RATE = dynamodb.Table("ItemRateMaster")
# LABOUR_RATE = dynamodb.Table("LabourRateMaster")
# MACHINE_RATE = dynamodb.Table("MachineryRateMaster")
# ITEM_MAP = dynamodb.Table("ItemMappingMaster")
# CITY_INDEX = dynamodb.Table("StateCityIndexMaster")

# # ============================================================
# # 🔧 HELPERS
# # ============================================================
# def norm(text: str) -> str:
#     return re.sub(r"[^a-z0-9]", "", text.lower())

# def decimal_to_float(obj):
#     if isinstance(obj, Decimal):
#         return float(obj)
#     if isinstance(obj, dict):
#         return {k: decimal_to_float(v) for k, v in obj.items()}
#     if isinstance(obj, list):
#         return [decimal_to_float(i) for i in obj]
#     return obj

# def get_rate(rate_key: str, component: str) -> dict:
#     table = {
#         "Material": ITEM_RATE,
#         "Labour": LABOUR_RATE,
#         "Machinery": MACHINE_RATE
#     }[component]

#     res = table.get_item(Key={"Rate_Key": norm(rate_key)})
#     if "Item" not in res:
#         raise ValueError(f"Rate missing for '{rate_key}'")
#     return res["Item"]

# # ============================================================
# # ❌ LEARNING AUTOMATION — HARD DISABLED (SCOPE SAFE)
# # ============================================================
# def get_learning_factor(*args, **kwargs) -> Decimal:
#     return Decimal("1.0")

# # ============================================================
# # 🧮 COST ENGINE
# # ============================================================
# def estimate_cost(payload: dict) -> dict:
#     state_tier = payload["state_tier"].replace("-", "#")
#     city_res = CITY_INDEX.get_item(Key={"StateTier": state_tier})

#     if "Item" not in city_res:
#         raise ValueError(f"City index not found for '{payload['state_tier']}'")

#     city = city_res["Item"]

#     project_totals = {
#         "material": {"min": Decimal(0), "likely": Decimal(0), "max": Decimal(0)},
#         "labour": {"min": Decimal(0), "likely": Decimal(0), "max": Decimal(0)},
#         "machinery": {"min": Decimal(0), "likely": Decimal(0), "max": Decimal(0)}
#     }

#     boq_results = []
#     explainability = {
#         "material_share_pct": 0,
#         "labour_share_pct": 0,
#         "city_tier": payload["state_tier"],
#         "dominant_cost_driver": None
#     }

#     for boq in payload["boq_items"]:
#         boq_totals = {
#             "Material": {"min": Decimal(0), "likely": Decimal(0), "max": Decimal(0)},
#             "Labour": {"min": Decimal(0), "likely": Decimal(0), "max": Decimal(0)},
#             "Machinery": {"min": Decimal(0), "likely": Decimal(0), "max": Decimal(0)}
#         }

#         buckets = {"Material": [], "Labour": [], "Machinery": []}

#         for bom in boq["bom_items"]:
#             item_key = norm(bom["item_name"])
#             map_res = ITEM_MAP.get_item(Key={"Item_Key": item_key})

#             if "Item" not in map_res:
#                 raise ValueError(f"Item mapping missing for '{bom['item_name']}'")

#             mapping = map_res["Item"]
#             rate = get_rate(mapping["Rate_Key"], mapping["Cost_Component"])

#             qty = Decimal(str(bom["quantity"]))
#             index = city[f"{mapping['Cost_Component']}_Index"]
#             lf = Decimal("1.0")

#             min_cost = qty * rate["Base_Min"] * index * lf
#             likely_cost = qty * rate["Base_Likely"] * index * lf
#             max_cost = qty * rate["Base_Max"] * index * lf

#             buckets[mapping["Cost_Component"]].append({
#                 "item_name": bom["item_name"],
#                 "quantity": float(qty),
#                 "unit": rate["Unit"],
#                 "learning_factor": 1.0,
#                 "cost": {
#                     "min": round(min_cost, 2),
#                     "likely": round(likely_cost, 2),
#                     "max": round(max_cost, 2)
#                 }
#             })

#             for k, v in zip(["min", "likely", "max"], [min_cost, likely_cost, max_cost]):
#                 boq_totals[mapping["Cost_Component"]][k] += v
#                 project_totals[mapping["Cost_Component"].lower()][k] += v

#         boq_results.append({
#             "boq_id": boq["boq_id"],
#             "boq_name": boq["boq_name"],
#             "material": {
#                 "items": buckets["Material"],
#                 "total": {k: round(v, 2) for k, v in boq_totals["Material"].items()}
#             },
#             "labour": {
#                 "items": buckets["Labour"],
#                 "total": {k: round(v, 2) for k, v in boq_totals["Labour"].items()}
#             },
#             "machinery": {
#                 "items": buckets["Machinery"],
#                 "total": {k: round(v, 2) for k, v in boq_totals["Machinery"].items()}
#             },
#             "boq_total_cost": {
#                 k: round(
#                     boq_totals["Material"][k]
#                     + boq_totals["Labour"][k]
#                     + boq_totals["Machinery"][k],
#                     2
#                 )
#                 for k in ["min", "likely", "max"]
#             }
#         })

#     overall_likely = (
#         project_totals["material"]["likely"]
#         + project_totals["labour"]["likely"]
#         + project_totals["machinery"]["likely"]
#     )

#     if overall_likely > 0:
#         explainability["material_share_pct"] = round(
#             (project_totals["material"]["likely"] / overall_likely) * 100, 2
#         )
#         explainability["labour_share_pct"] = round(
#             (project_totals["labour"]["likely"] / overall_likely) * 100, 2
#         )
#         explainability["dominant_cost_driver"] = (
#             "Material" if project_totals["material"]["likely"] >
#             project_totals["labour"]["likely"] else "Labour"
#         )

#     result = {
#         "project_cost": {
#             "material": project_totals["material"],
#             "labour": project_totals["labour"],
#             "machinery": project_totals["machinery"],
#             "overall": {
#                 k: round(
#                     project_totals["material"][k]
#                     + project_totals["labour"][k]
#                     + project_totals["machinery"][k],
#                     2
#                 )
#                 for k in ["min", "likely", "max"]
#             }
#         },
#         "boq_items": boq_results,
#         "explainability": explainability
#     }

#     return decimal_to_float(result)


from decimal import Decimal
import re
import boto3

# ============================================================
# 🔐 AWS CONFIG (REGION: ap-south-2)
# ============================================================
AWS_REGION = "ap-south-2"
AWS_ACCESS_KEY_ID = "AKIAYH3VJY2ZUOPIZ27O"
AWS_SECRET_ACCESS_KEY = "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"

dynamodb = boto3.resource(
    "dynamodb",
    region_name=AWS_REGION,
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY
)

client = dynamodb.meta.client

# ============================================================
# 🛡️ REQUIRED TABLE CHECK (NO AUTO CREATION)
# ============================================================
REQUIRED_TABLES = [
    "ItemRateMaster",
    "LabourRateMaster",
    "MachineryRateMaster",
    "ItemMappingMaster",
    "StateCityIndexMaster"
]

for table in REQUIRED_TABLES:
    client.describe_table(TableName=table)

# ============================================================
# 📦 TABLE HANDLES
# ============================================================
ITEM_RATE = dynamodb.Table("ItemRateMaster")
LABOUR_RATE = dynamodb.Table("LabourRateMaster")
MACHINE_RATE = dynamodb.Table("MachineryRateMaster")
ITEM_MAP = dynamodb.Table("ItemMappingMaster")
CITY_INDEX = dynamodb.Table("StateCityIndexMaster")

# ============================================================
# 🔧 HELPERS
# ============================================================
def norm(text: str) -> str:
    """Normalize text by removing non-alphanumeric characters and converting to lowercase"""
    return re.sub(r"[^a-z0-9]", "", text.lower())

def decimal_to_float(obj):
    """Recursively convert Decimal objects to float for JSON serialization"""
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, dict):
        return {k: decimal_to_float(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [decimal_to_float(i) for i in obj]
    return obj

def get_rate(rate_key: str, component: str) -> dict:
    """
    Retrieve rate data from DynamoDB with fallback mechanism.
    
    Strategy:
    1. Try normalized key (e.g., "cement" -> "cement")
    2. If not found, try raw key (for legacy data like "Screws")
    3. If still not found, raise error with clear message
    
    Args:
        rate_key: The rate key to look up
        component: Cost component type ("Material", "Labour", or "Machinery")
        
    Returns:
        dict: Rate item from DynamoDB
        
    Raises:
        ValueError: If rate not found in database
    """
    table = {
        "Material": ITEM_RATE,
        "Labour": LABOUR_RATE,
        "Machinery": MACHINE_RATE
    }[component]

    normalized_key = norm(rate_key)

    # 1️⃣ Try normalized lookup (primary method)
    res = table.get_item(Key={"Rate_Key": normalized_key})
    if "Item" in res:
        return res["Item"]

    # 2️⃣ Try raw key (fallback for legacy data)
    res = table.get_item(Key={"Rate_Key": rate_key})
    if "Item" in res:
        return res["Item"]

    # 3️⃣ Fail cleanly with detailed error message
    raise ValueError(
        f"Rate missing for '{rate_key}' (normalized='{normalized_key}') "
        f"in {component} rate table. Please ensure the rate exists in DynamoDB."
    )

# ============================================================
# ❌ LEARNING AUTOMATION — HARD DISABLED (SCOPE SAFE)
# ============================================================
def get_learning_factor(*args, **kwargs) -> Decimal:
    """
    Learning factor is disabled for deterministic cost calculation.
    Always returns 1.0 (no learning curve adjustment).
    """
    return Decimal("1.0")

# ============================================================
# 🧮 COST ENGINE
# ============================================================
def estimate_cost(payload: dict) -> dict:
    """
    Main cost estimation engine with semantic data mapping.
    
    Process:
    1. Validate and retrieve city/state index data
    2. For each BOQ item:
       - Process BOM items through semantic mapper
       - Apply regional cost indices
       - Calculate min/likely/max cost ranges
    3. Aggregate costs by component type (Material/Labour/Machinery)
    4. Generate explainability metrics
    
    Args:
        payload: Dictionary containing:
            - state_tier: State and tier (e.g., "Maharashtra-Tier1")
            - boq_items: List of BOQ items with BOM details
            
    Returns:
        dict: Comprehensive cost breakdown with explainability
        
    Raises:
        ValueError: If validation fails or required data is missing
    """
    # Convert state_tier format for DynamoDB lookup (e.g., "Maharashtra-Tier1" -> "Maharashtra#Tier1")
    state_tier = payload["state_tier"].replace("-", "#")
    city_res = CITY_INDEX.get_item(Key={"StateTier": state_tier})

    if "Item" not in city_res:
        raise ValueError(
            f"City index not found for '{payload['state_tier']}'. "
            f"Please verify the state_tier format (e.g., 'Maharashtra-Tier1')"
        )

    city = city_res["Item"]

    # Initialize project-level totals
    project_totals = {
        "material": {"min": Decimal(0), "likely": Decimal(0), "max": Decimal(0)},
        "labour": {"min": Decimal(0), "likely": Decimal(0), "max": Decimal(0)},
        "machinery": {"min": Decimal(0), "likely": Decimal(0), "max": Decimal(0)}
    }

    boq_results = []
    explainability = {
        "material_share_pct": 0,
        "labour_share_pct": 0,
        "city_tier": payload["state_tier"],
        "dominant_cost_driver": None
    }

    # Process each BOQ item
    for boq in payload["boq_items"]:
        # Initialize BOQ-level totals
        boq_totals = {
            "Material": {"min": Decimal(0), "likely": Decimal(0), "max": Decimal(0)},
            "Labour": {"min": Decimal(0), "likely": Decimal(0), "max": Decimal(0)},
            "Machinery": {"min": Decimal(0), "likely": Decimal(0), "max": Decimal(0)}
        }

        # Buckets for organizing items by component type
        buckets = {"Material": [], "Labour": [], "Machinery": []}

        # Process each BOM item within the BOQ
        for bom in boq["bom_items"]:
            # Step 1: Semantic mapping - normalize item name and look up mapping
            item_key = norm(bom["item_name"])
            map_res = ITEM_MAP.get_item(Key={"Item_Key": item_key})

            if "Item" not in map_res:
                raise ValueError(
                    f"Item mapping missing for '{bom['item_name']}' (normalized: '{item_key}'). "
                    f"Please add this item to ItemMappingMaster table."
                )

            mapping = map_res["Item"]
            
            # Step 2: Retrieve rate data for the mapped rate key
            rate = get_rate(mapping["Rate_Key"], mapping["Cost_Component"])

            # Step 3: Calculate costs with regional index
            qty = Decimal(str(bom["quantity"]))
            index = city[f"{mapping['Cost_Component']}_Index"]
            lf = Decimal("1.0")  # Learning factor (currently disabled)

            min_cost = qty * rate["Base_Min"] * index * lf
            likely_cost = qty * rate["Base_Likely"] * index * lf
            max_cost = qty * rate["Base_Max"] * index * lf

            # Step 4: Add to appropriate bucket
            buckets[mapping["Cost_Component"]].append({
                "item_name": bom["item_name"],
                "quantity": float(qty),
                "unit": rate["Unit"],
                "learning_factor": 1.0,
                "cost": {
                    "min": round(min_cost, 2),
                    "likely": round(likely_cost, 2),
                    "max": round(max_cost, 2)
                }
            })

            # Step 5: Accumulate totals
            for k, v in zip(["min", "likely", "max"], [min_cost, likely_cost, max_cost]):
                boq_totals[mapping["Cost_Component"]][k] += v
                project_totals[mapping["Cost_Component"].lower()][k] += v

        # Compile BOQ-level results
        boq_results.append({
            "boq_id": boq["boq_id"],
            "boq_name": boq["boq_name"],
            "material": {
                "items": buckets["Material"],
                "total": {k: round(v, 2) for k, v in boq_totals["Material"].items()}
            },
            "labour": {
                "items": buckets["Labour"],
                "total": {k: round(v, 2) for k, v in boq_totals["Labour"].items()}
            },
            "machinery": {
                "items": buckets["Machinery"],
                "total": {k: round(v, 2) for k, v in boq_totals["Machinery"].items()}
            },
            "boq_total_cost": {
                k: round(
                    boq_totals["Material"][k]
                    + boq_totals["Labour"][k]
                    + boq_totals["Machinery"][k],
                    2
                )
                for k in ["min", "likely", "max"]
            }
        })

    # Calculate explainability metrics
    overall_likely = (
        project_totals["material"]["likely"]
        + project_totals["labour"]["likely"]
        + project_totals["machinery"]["likely"]
    )

    if overall_likely > 0:
        explainability["material_share_pct"] = round(
            (project_totals["material"]["likely"] / overall_likely) * 100, 2
        )
        explainability["labour_share_pct"] = round(
            (project_totals["labour"]["likely"] / overall_likely) * 100, 2
        )
        explainability["dominant_cost_driver"] = (
            "Material" if project_totals["material"]["likely"] >
            project_totals["labour"]["likely"] else "Labour"
        )

    # Compile final result
    result = {
        "project_cost": {
            "material": project_totals["material"],
            "labour": project_totals["labour"],
            "machinery": project_totals["machinery"],
            "overall": {
                k: round(
                    project_totals["material"][k]
                    + project_totals["labour"][k]
                    + project_totals["machinery"][k],
                    2
                )
                for k in ["min", "likely", "max"]
            }
        },
        "boq_items": boq_results,
        "explainability": explainability
    }

    return decimal_to_float(result)