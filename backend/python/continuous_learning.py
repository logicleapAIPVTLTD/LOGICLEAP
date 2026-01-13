from decimal import Decimal, InvalidOperation
from datetime import datetime, timedelta
import uuid
import boto3
import statistics

# ============================================================
# AWS CONFIG (ONLY CREDENTIALS HARDCODED)
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

FEEDBACK_TABLE = dynamodb.Table("ModelFeedback")
MODEL_REGISTRY = dynamodb.Table("ModelRegistry")

# ============================================================
# THRESHOLDS
# ============================================================
ERROR_THRESHOLD = 0.12
BIAS_THRESHOLD = 0.08
MIN_FEEDBACK_FOR_RETRAIN = 50

# ============================================================
# HELPERS
# ============================================================
def to_decimal(obj):
    try:
        if isinstance(obj, bool):
            return obj
        if isinstance(obj, int):
            return Decimal(obj)
        if isinstance(obj, float):
            return Decimal(str(obj))
        if isinstance(obj, str):
            return obj
        if isinstance(obj, dict):
            return {k: to_decimal(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [to_decimal(i) for i in obj]
        return obj
    except InvalidOperation:
        return None


def get_active_model_version() -> str:
    response = MODEL_REGISTRY.scan(
        FilterExpression="is_active = :v",
        ExpressionAttributeValues={":v": True}
    )
    items = response.get("Items", [])
    return items[0]["model_version"] if items else "v1.0.0"

# ============================================================
# PLACEHOLDER FETCHERS (AUTOMATED SOURCES)
# ============================================================
def fetch_prediction(boq_id):
    # Later connect DS-2.1 output
    return {"material": 1200, "labour": 1100, "overall": 2300}


def fetch_prediction_range(boq_id):
    return {"min": 2000, "max": 2600}


def fetch_actual_cost(boq_id):
    # Later connect execution system
    return {"material": 1350, "labour": 1050, "overall": 2400}

# ============================================================
# ERROR COMPUTATION
# ============================================================
def compute_error(predicted, actual):
    if predicted == 0:
        return None
    return float((Decimal(actual) - Decimal(predicted)) / Decimal(predicted))


def compute_error_metrics(predicted, actual):
    return {
        "material_pct": compute_error(predicted["material"], actual["material"]),
        "labour_pct": compute_error(predicted["labour"], actual["labour"]),
        "overall_pct": compute_error(predicted["overall"], actual["overall"])
    }

# ============================================================
# FEEDBACK INGESTION (USER INPUT: boq_id ONLY)
# ============================================================
def ingest_feedback(boq_id: str) -> dict:
    model_version = get_active_model_version()

    predicted = fetch_prediction(boq_id)
    predicted_range = fetch_prediction_range(boq_id)
    actual = fetch_actual_cost(boq_id)

    errors = compute_error_metrics(predicted, actual)

    confidence_hit = (
        predicted_range["min"] <= actual["overall"] <= predicted_range["max"]
    )

    bias_flag = None
    if errors["material_pct"] and errors["material_pct"] > BIAS_THRESHOLD:
        bias_flag = "material_underestimated"
    elif errors["labour_pct"] and errors["labour_pct"] > BIAS_THRESHOLD:
        bias_flag = "labour_underestimated"

    record = {
        "feedback_id": str(uuid.uuid4()),
        "boq_id": boq_id,
        "model_version": model_version,
        "predicted": predicted,
        "actual": actual,
        "errors": errors,
        "bias_flag": bias_flag,
        "confidence_hit": confidence_hit,
        "created_at": datetime.utcnow().isoformat()
    }

    FEEDBACK_TABLE.put_item(Item=to_decimal(record))
    return record

# ============================================================
# VERIFY
# ============================================================
def fetch_all_feedback(limit=100):
    return FEEDBACK_TABLE.scan(Limit=limit).get("Items", [])

# ============================================================
# DASHBOARD
# ============================================================
def compute_accuracy(records):
    vals = [
        abs(float(r["errors"]["overall_pct"]))
        for r in records if r.get("errors")
    ]
    if not vals:
        return None
    return {
        "MAPE": round(statistics.mean(vals), 4),
        "median_error": round(statistics.median(vals), 4),
        "sample_count": len(vals)
    }


def compute_bias(records):
    bias = {}
    for r in records:
        if r.get("bias_flag"):
            bias[r["bias_flag"]] = bias.get(r["bias_flag"], 0) + 1
    return bias


def dashboard_metrics_active():
    model_version = get_active_model_version()
    records = FEEDBACK_TABLE.scan(
        FilterExpression="model_version = :v",
        ExpressionAttributeValues={":v": model_version}
    ).get("Items", [])

    split = len(records) // 2
    drift = False
    if split > 10:
        old = [abs(float(r["errors"]["overall_pct"])) for r in records[:split]]
        new = [abs(float(r["errors"]["overall_pct"])) for r in records[split:]]
        drift = abs(statistics.mean(new) - statistics.mean(old)) > ERROR_THRESHOLD / 2

    return {
        "model_version": model_version,
        "accuracy": compute_accuracy(records),
        "bias": compute_bias(records),
        "drift_detected": drift
    }

# ============================================================
# RETRAIN DECISION
# ============================================================
def retraining_decision_active():
    model_version = get_active_model_version()
    records = FEEDBACK_TABLE.scan(
        FilterExpression="model_version = :v",
        ExpressionAttributeValues={":v": model_version}
    ).get("Items", [])

    accuracy = compute_accuracy(records)

    retrain = (
        len(records) >= MIN_FEEDBACK_FOR_RETRAIN
        and accuracy
        and accuracy["MAPE"] > ERROR_THRESHOLD
    )

    schedule = None
    if retrain:
        schedule = (datetime.utcnow() + timedelta(days=1)).isoformat()
        MODEL_REGISTRY.put_item(
            Item=to_decimal({
                "model_version": model_version,
                "is_active": True,
                "retrain_triggered": True,
                "scheduled_at": schedule,
                "created_at": datetime.utcnow().isoformat()
            })
        )

    return {
        "model_version": model_version,
        "retrain_required": retrain,
        "scheduled_at": schedule,
        "feedback_count": len(records)
    }
