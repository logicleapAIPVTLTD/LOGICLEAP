# import sys
# import json
# from boq_api import main, process_raw_text, VisionProcessor, extract_text_from_file

# def run():
#     # Read input from stdin
#     input_data = json.loads(sys.stdin.read())
#     mode = input_data['mode']
#     user_input = input_data['input']
    
#     final_data = []
    
#     if mode == '1':  # Text
#         final_data = process_raw_text(user_input)
#     elif mode == '2':  # Document
#         raw_text = extract_text_from_file(user_input)
#         final_data = process_raw_text(raw_text)
#     elif mode == '3':  # Image
#         vp = VisionProcessor()
#         raw_ai_data = vp.scan_image(user_input)
#         final_data = vp.normalize_to_db(raw_ai_data)
    
#     # Output JSON to stdout
#     print(json.dumps(final_data))

# if __name__ == "__main__":
#     run()

#!/usr/bin/env python3
"""
BOQ API Integration Script - FIXED VERSION
Added comprehensive error handling and debug logging
"""

import sys
import json
import os
import re
import traceback
from difflib import get_close_matches
from google.api_core.exceptions import ResourceExhausted
try:
    import google.generativeai as genai
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False
    sys.stderr.write("⚠️ google.generativeai not found. Install with: pip install google-generativeai\n")


# Import from your existing boq_api.py
try:
    from boq_api import (
        process_raw_text, 
        extract_text_from_file,
        work_df,
        WORK_NAMES,
        WORK_MAP,
        extract_metrics,
        GEMINI_API_KEY,
        GEMINI_MODEL_NAME,
        VisionProcessor
    )
    IMPORTS_OK = True
except Exception as e:
    IMPORTS_OK = False
    IMPORT_ERROR = str(e)

# =========================================================
# VISION PROCESSOR WITH ENHANCED ERROR HANDLING
# =========================================================

# VisionProcessor imported from boq_api

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
        
        # Read input
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
        
        sys.stderr.write(f"🔧 Processing mode: {mode}\n")
        sys.stderr.write(f"📝 Input: {user_input[:100] if isinstance(user_input, str) else user_input}\n")
        
        if not mode or not user_input:
            output_error("Missing 'mode' or 'input' in request")
            return
        
        final_data = []
        
        # MODE 1: Text Processing
        if mode == '1':
            sys.stderr.write("📝 Processing raw text...\n")
            final_data = process_raw_text(user_input)
            sys.stderr.write(f"✅ Text processing complete: {len(final_data)} items\n")
        
        # MODE 2: Document Processing
        elif mode == '2':
            sys.stderr.write(f"📄 Extracting text from: {user_input}\n")
            raw_text = extract_text_from_file(user_input)
            sys.stderr.write(f"✅ Extracted {len(raw_text)} characters\n")
            final_data = process_raw_text(raw_text)
            sys.stderr.write(f"✅ Document processing complete: {len(final_data)} items\n")
        
        # MODE 3: Image Processing
        elif mode == '3':
            sys.stderr.write(f"🖼️ Processing image: {user_input}\n")
            vp = VisionProcessor()
            
            raw_ai_data = vp.scan_image(user_input)
            sys.stderr.write(f"📊 Gemini extracted {len(raw_ai_data)} raw items\n")
            
            if raw_ai_data:
                final_data = vp.normalize_to_db(raw_ai_data)
                sys.stderr.write(f"✅ Vision processing complete: {len(final_data)} items\n")
            else:
                sys.stderr.write("⚠️ No data extracted from image\n")
                final_data = []
        
        else:
            output_error(f"Invalid mode: {mode}")
            return
        
        # Output success
        output_success(final_data)
        
    except ResourceExhausted:
        error_msg = "Gemini API Quota Exceeded. Please try again later or upgrade your plan."
        sys.stderr.write(f"❌ {error_msg}\n")
        output_error(error_msg)
    except Exception as e:
        sys.stderr.write(f"❌ Fatal error: {type(e).__name__}: {e}\n")
        sys.stderr.write(f"Traceback:\n{traceback.format_exc()}\n")
        output_error(f"Processing error: {e}")

def output_success(data):
    """Output successful result as JSON to stdout"""
    result = {
        "success": True,
        "data": data,
        "count": len(data)
    }
    print(json.dumps(result, indent=2))
    sys.stderr.write(f"✅ Output sent: {len(data)} items\n")

def output_error(message):
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