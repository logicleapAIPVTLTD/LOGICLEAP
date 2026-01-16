#!/usr/bin/env python3
"""
BOQ Engine API Integration Script
Wrapper for the new boq_engine.py to provide JSON API interface for Node.js backend
"""

import sys
import json
import os
import traceback
from typing import Dict, List, Any

# Import from the new boq_engine.py
try:
    from boq_engine import (
        BOQIdentificationEngine,
        extract_text_from_file
    )
    IMPORTS_OK = True
except Exception as e:
    IMPORTS_OK = False
    IMPORT_ERROR = str(e)
    sys.stderr.write(f"❌ Import failed: {IMPORT_ERROR}\n")

# =========================================================
# API FUNCTIONS
# =========================================================

def process_text_api(text: str, context: Dict[str, Any] = None) -> List[Dict]:
    """Process text input and return BOQ data"""
    if not text or not text.strip():
        return []
    if context is None:
        context = {"project_name": "Text Input", "project_type": "General", "location": "Unknown"}
    
    engine = BOQIdentificationEngine()
    return engine.process(text, context, is_image=False)

def process_file_api(file_path: str, context: Dict[str, Any] = None) -> List[Dict]:
    """Process file input and return BOQ data"""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")
    
    if context is None:
        context = {"project_name": "File Input", "project_type": "General", "location": "Unknown"}

    raw_text = extract_text_from_file(file_path)
    if not raw_text:
        return []

    engine = BOQIdentificationEngine()
    return engine.process(raw_text, context, is_image=False)

def process_image_api(image_path: str, context: Dict[str, Any]) -> List[Dict]:
    """Process image input with context and return BOQ data"""
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found: {image_path}")

    if context is None:
        context = {"project_name": "Image Input", "project_type": "General", "location": "Unknown"}
    
    engine = BOQIdentificationEngine()
    return engine.process(image_path, context, is_image=True)

# =========================================================
# MAIN ENTRY POINT
# =========================================================

def main():
    """Main entry point with enhanced error handling"""

    try:
        # Check imports
        if not IMPORTS_OK:
            output_error(f"Import failed: {IMPORT_ERROR}")
            return

        # Read input from stdin
        sys.stderr.write("📥 Reading input from stdin...\n")
        input_line = sys.stdin.read().strip()

        if not input_line:
            output_error("No input received from stdin")
            return

        sys.stderr.write(f"📄 Received input: {input_line[:100]}...\n")

        # Parse JSON
        try:
            input_data = json.loads(input_line)
        except json.JSONDecodeError as e:
            output_error(f"Invalid JSON input: {e}")
            return

        mode = str(input_data.get('mode', ''))
        user_input = input_data.get('input', '')
        context = input_data.get('context', {})

        sys.stderr.write(f"🔧 Processing mode: {mode}\n")

        if not mode:
            output_error("Missing 'mode' in request")
            return

        final_data = []

        # MODE 1: Text Processing
        if mode == '1':
            if not user_input:
                output_error("Missing 'input' text for mode 1")
                return
            sys.stderr.write("📝 Processing raw text...\n")
            final_data = process_text_api(user_input, context)
            sys.stderr.write(f"✅ Text processing complete: {len(final_data)} items\n")

        # MODE 2: Document Processing
        elif mode == '2':
            if not user_input:
                output_error("Missing 'input' file path for mode 2")
                return
            sys.stderr.write(f"📄 Processing file: {user_input}\n")
            final_data = process_file_api(user_input, context)
            sys.stderr.write(f"✅ File processing complete: {len(final_data)} items\n")

        # MODE 3: Image Processing
        elif mode == '3':
            if not user_input:
                output_error("Missing 'input' image path for mode 3")
                return
            sys.stderr.write(f"🖼️ Processing image: {user_input}\n")
            final_data = process_image_api(user_input, context)
            sys.stderr.write(f"✅ Image processing complete: {len(final_data)} items\n")

        else:
            output_error(f"Invalid mode: {mode}. Supported modes: 1 (text), 2 (file), 3 (image)")
            return

        # Output success
        output_success(final_data)

    except FileNotFoundError as e:
        output_error(f"File error: {e}")
    except Exception as e:
        sys.stderr.write(f"❌ Fatal error: {type(e).__name__}: {e}\n")
        sys.stderr.write(f"Traceback:\n{traceback.format_exc()}\n")
        output_error(f"Processing error: {e}")

def output_success(data: List[Dict]) -> None:
    """Output successful result as JSON to stdout"""
    result = {
        "success": True,
        "data": data,
        "count": len(data)
    }
    print(json.dumps(result, indent=2))
    sys.stderr.write(f"✅ Output sent: {len(data)} items\n")

def output_error(message: str) -> None:
    """Output error as JSON to stdout"""
    result = {
        "success": False,
        "error": message,
        "data": [],
        "count": 0
    }
    print(json.dumps(result, indent=2))
    sys.stderr.write(f"❌ Error output: {message}\n")

if __name__ == "__main__":
    main()