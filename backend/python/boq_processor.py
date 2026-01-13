import sys
import json
from boq_api import main, process_raw_text, VisionProcessor, extract_text_from_file

def run():
    # Read input from stdin
    input_data = json.loads(sys.stdin.read())
    mode = input_data['mode']
    user_input = input_data['input']
    
    final_data = []
    
    if mode == '1':  # Text
        final_data = process_raw_text(user_input)
    elif mode == '2':  # Document
        raw_text = extract_text_from_file(user_input)
        final_data = process_raw_text(raw_text)
    elif mode == '3':  # Image
        vp = VisionProcessor()
        raw_ai_data = vp.scan_image(user_input)
        final_data = vp.normalize_to_db(raw_ai_data)
    
    # Output JSON to stdout
    print(json.dumps(final_data))

if __name__ == "__main__":
    run()