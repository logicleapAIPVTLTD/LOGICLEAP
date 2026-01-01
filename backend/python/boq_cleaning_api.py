#!/usr/bin/env python3
"""
BOQ Data Cleaning API - CLI interface for Node.js integration
Extracts entities (material, quantity, unit) from text
"""

import os
import re
import sys
import json
import uuid
from datetime import datetime
from decimal import Decimal
from typing import List, Dict, Any, Optional, Tuple

import boto3
import numpy as np

# ============================================================
# spaCy OPTIONAL
# ============================================================

try:
    import spacy
    SPACY_AVAILABLE = True
except ImportError:
    SPACY_AVAILABLE = False

# ============================================================
# Configuration
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Valid materials dictionary
VALID_MATERIALS = [
    "cement", "sand", "granite", "laminate", "plywood",
    "rebar", "tmt", "tile", "tiles", "paint", "stone",
    "steel", "brick", "bricks", "wood", "glass",
    "copper", "wire", "cable", "pipe", "pvc",
    "adhesive", "grout", "putty", "primer"
]

# ============================================================
# DynamoDB Setup
# ============================================================

def get_dynamodb_resource():
    """Get DynamoDB resource"""
    try:
        dynamodb = boto3.resource(
            "dynamodb",
            region_name='ap-south-2',
            aws_access_key_id="AKIAYH3VJY2ZUOPIZ27O",
            aws_secret_access_key="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"
        )
        return dynamodb
    except Exception as e:
        print(json.dumps({"error": f"Failed to connect to DynamoDB: {str(e)}"}), file=sys.stderr)
        sys.exit(1)

# ============================================================
# Helpers
# ============================================================

def to_decimal(value):
    """Convert values to DynamoDB-compatible types"""
    if value is None:
        return None
    if isinstance(value, (bool, np.bool_)):
        return bool(value)
    if isinstance(value, (int, float, np.integer, np.floating)):
        return Decimal(str(value))
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        return {k: to_decimal(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [to_decimal(v) for v in value]
    return str(value)

# ============================================================
# DynamoDB Client
# ============================================================

class DynamoDBClient:
    def __init__(self):
        dynamodb = get_dynamodb_resource()
        
        # Create tables if they don't exist
        self._ensure_tables(dynamodb)
        
        self.raw_ingestion = dynamodb.Table("raw_ingestion")
        self.processed_logs = dynamodb.Table("processed_logs")
        self.extracted_entities = dynamodb.Table("extracted_entities")

    def _ensure_tables(self, dynamodb):
        """Create tables if they don't exist"""
        existing_tables = [t.name for t in dynamodb.tables.all()]
        
        tables_config = {
            "raw_ingestion": "raw_id",
            "processed_logs": "processed_id",
            "extracted_entities": "entity_id"
        }
        
        for table_name, key_name in tables_config.items():
            if table_name not in existing_tables:
                try:
                    table = dynamodb.create_table(
                        TableName=table_name,
                        KeySchema=[{"AttributeName": key_name, "KeyType": "HASH"}],
                        AttributeDefinitions=[{"AttributeName": key_name, "AttributeType": "S"}],
                        BillingMode='PAY_PER_REQUEST'
                    )
                    table.wait_until_exists()
                    print(f"Created table: {table_name}", file=sys.stderr)
                except Exception as e:
                    print(f"Warning: Could not create table {table_name}: {e}", file=sys.stderr)

    def save_raw_ingestion(self, source_type: str, channel: str, payload: Dict) -> str:
        """Save raw ingestion data"""
        raw_id = str(uuid.uuid4())
        item = {
            "raw_id": raw_id,
            "source_type": source_type,
            "channel": channel,
            "payload": json.dumps(payload),
            "created_at": datetime.now().isoformat(),
        }
        self.raw_ingestion.put_item(Item=to_decimal(item))
        return raw_id

    def save_processed_log(self, raw_id: str, status: str, message: str) -> str:
        """Save processing log"""
        pid = str(uuid.uuid4())
        item = {
            "processed_id": pid,
            "raw_id": raw_id,
            "status": status,
            "message": message,
            "processed_at": datetime.now().isoformat(),
        }
        self.processed_logs.put_item(Item=to_decimal(item))
        return pid

    def save_extracted_entity(self, processed_id: str, ent: Dict):
        """Save extracted entity"""
        eid = str(uuid.uuid4())
        item = {
            "entity_id": eid,
            "processed_id": processed_id,
            "created_at": datetime.now().isoformat(),
            **ent,
        }
        self.extracted_entities.put_item(Item=to_decimal(item))

# ============================================================
# Entity Extraction
# ============================================================

# Initialize spaCy if available
nlp = None
SPACY_READY = False
NER_MODEL_PATH = os.path.join(BASE_DIR, "..", "models", "ner_model-best")

if SPACY_AVAILABLE:
    try:
        if os.path.exists(NER_MODEL_PATH):
            nlp = spacy.load(NER_MODEL_PATH)
            SPACY_READY = True
            print("spaCy model loaded", file=sys.stderr)
        else:
            print("spaCy model not found, using regex-only mode", file=sys.stderr)
    except Exception as e:
        print(f"spaCy init failed, using regex-only mode: {e}", file=sys.stderr)

def clean_material(mat: str) -> Optional[str]:
    """Clean and validate material name"""
    if not mat:
        return None
    mat = mat.lower().strip()
    
    # Direct match
    if mat in VALID_MATERIALS:
        return mat
    
    # Partial match
    for valid in VALID_MATERIALS:
        if valid in mat or mat in valid:
            return valid
    
    return None

def regex_extract(text: str) -> Tuple[Optional[str], Optional[str]]:
    """Extract quantity and unit using regex"""
    qty = None
    unit = None

    # Extract quantity (number with optional decimal)
    q = re.search(r"(\d+(?:\.\d+)?)", text)
    
    # Extract unit
    u = re.search(r"\b(kg|sft|sqft|mm|cm|meter|m|liters?|bags?|nos?|pcs?|pieces?)\b", text, re.I)

    if q:
        qty = q.group(1)
    if u:
        unit = u.group(1).lower()

    return qty, unit

def extract_entities(text: str) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """Extract material, quantity, and unit from text"""
    material = qty = unit = None

    # Try spaCy if available and trained
    if nlp and SPACY_READY:
        try:
            doc = nlp(text)
            for ent in doc.ents:
                if ent.label_ == "MATERIAL" and not material:
                    material = clean_material(ent.text)
                elif ent.label_ == "QTY" and not qty:
                    qty = ent.text
                elif ent.label_ == "UNIT" and not unit:
                    unit = ent.text
        except Exception as e:
            print(f"spaCy extraction failed: {e}", file=sys.stderr)

    # Regex fallback
    rq, ru = regex_extract(text)
    qty = qty or rq
    unit = unit or ru

    # Dictionary fallback for material
    if not material:
        material = clean_material(text)

    return material, qty, unit

# ============================================================
# Cleaning Logic
# ============================================================

def clean_records(records: List[Dict]) -> List[Dict]:
    """Clean and structure extracted records"""
    cleaned = []
    for r in records:
        cleaned.append({
            "material": r.get("material"),
            "qty": r.get("qty"),
            "unit": r.get("unit"),
            "is_valid": r.get("material") is not None,
            "source_type": r.get("source_type"),
            "raw_text": r.get("text"),
            "confidence": 0.8 if r.get("material") else 0.3
        })
    return cleaned

# ============================================================
# Processing Pipeline
# ============================================================

def process_text_record(source_type: str, channel: str, text: str, 
                       save_to_db: bool = True) -> List[Dict]:
    """Process a single text record"""
    try:
        material, qty, unit = extract_entities(text)

        raw_entity = {
            "material": material,
            "qty": qty,
            "unit": unit,
            "text": text,
            "source_type": source_type,
        }

        cleaned = clean_records([raw_entity])
        
        # Save to DynamoDB if requested
        if save_to_db:
            try:
                db = DynamoDBClient()
                raw_id = db.save_raw_ingestion(source_type, channel, {"text": text})
                pid = db.save_processed_log(raw_id, "success", "processed")
                
                for ent in cleaned:
                    db.save_extracted_entity(pid, ent)
            except Exception as e:
                print(f"Warning: Could not save to DynamoDB: {e}", file=sys.stderr)
        
        return cleaned
        
    except Exception as e:
        return [{
            "error": str(e),
            "text": text,
            "is_valid": False
        }]

def process_batch_text(source_type: str, channel: str, texts: List[str],
                      save_to_db: bool = True) -> List[Dict]:
    """Process multiple text records"""
    results = []
    for t in texts:
        results.extend(process_text_record(source_type, channel, t, save_to_db))
    return results

# ============================================================
# CLI Commands
# ============================================================

def cmd_extract(payload_json: str):
    """Extract entities from text"""
    try:
        payload = json.loads(payload_json)
        
        source_type = payload.get("source_type", "api")
        channel = payload.get("channel", "http")
        text = payload.get("text", "")
        save_to_db = payload.get("save_to_db", False)
        
        if not text:
            raise ValueError("Text is required")
        
        results = process_text_record(source_type, channel, text, save_to_db)
        
        output = {
            "success": True,
            "extracted": results
        }
        
        print(json.dumps(output, ensure_ascii=False, default=str))
        
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON: {str(e)}"}), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

def cmd_batch(payload_json: str):
    """Extract entities from multiple texts"""
    try:
        payload = json.loads(payload_json)
        
        source_type = payload.get("source_type", "api")
        channel = payload.get("channel", "http")
        texts = payload.get("texts", [])
        save_to_db = payload.get("save_to_db", False)
        
        if not texts or not isinstance(texts, list):
            raise ValueError("Texts array is required")
        
        results = process_batch_text(source_type, channel, texts, save_to_db)
        
        output = {
            "success": True,
            "total_processed": len(texts),
            "extracted": results
        }
        
        print(json.dumps(output, ensure_ascii=False, default=str))
        
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON: {str(e)}"}), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

def cmd_health():
    """Health check"""
    try:
        output = {
            "success": True,
            "spacy_available": SPACY_AVAILABLE,
            "spacy_ready": SPACY_READY,
            "valid_materials_count": len(VALID_MATERIALS)
        }
        print(json.dumps(output))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

def main():
    """Main CLI entry point"""
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No command provided"}), file=sys.stderr)
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    if command == "extract":
        payload = sys.argv[2] if len(sys.argv) > 2 else "{}"
        cmd_extract(payload)
    elif command == "batch":
        payload = sys.argv[2] if len(sys.argv) > 2 else "{}"
        cmd_batch(payload)
    elif command == "health":
        cmd_health()
    else:
        print(json.dumps({"error": f"Unknown command: {command}"}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()