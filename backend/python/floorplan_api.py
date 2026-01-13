import os
import sys
import json
import cv2
import pytesseract
import pandas as pd
import re
from collections import defaultdict
import traceback


# ======================================================
# CONFIG
# ======================================================
BASE_PATH = os.path.dirname(os.path.abspath(__file__))
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
# pytesseract.pytesseract.tesseract_cmd = r'/opt/homebrew/bin/tesseract'
SCOPE_MASTER = os.path.join(BASE_PATH, "data", "scope_master.xlsx")

ROOM_WORDS = [
    "bedroom", "kitchen", "living", "hall",
    "balcony", "bathroom", "toilet", "laundry", "dining"
]

# ======================================================
# LOAD SCOPE MASTER
# ======================================================
def load_scope_master():
    """Load scope master data with error handling"""
    try:
        if not os.path.exists(SCOPE_MASTER):
            raise FileNotFoundError(f"Scope master file not found: {SCOPE_MASTER}")
        
        scope_df = pd.read_excel(SCOPE_MASTER)
        scope_df["space_type"] = scope_df["space_type"].astype(str).str.lower().str.strip()
        return scope_df
    except Exception as e:
        raise Exception(f"Failed to load scope master: {str(e)}")

scope_df = load_scope_master()

# ======================================================
# OCR BLOCK EXTRACTION
# ======================================================
def extract_ocr_blocks(image_path):
    """Extract text blocks from image using OCR"""
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found: {image_path}")
    
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Failed to read image: {image_path}")
    
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    data = pytesseract.image_to_data(gray, output_type=pytesseract.Output.DICT)
    blocks = []

    for i, txt in enumerate(data["text"]):
        t = txt.strip().lower()
        if not t:
            continue
        x, y, w, h = data["left"][i], data["top"][i], data["width"][i], data["height"][i]
        blocks.append({
            "text": t,
            "center": (x + w // 2, y + h // 2)
        })
    return blocks

# ======================================================
# DIMENSION TEXT DETECTION
# ======================================================
def extract_dimensions_from_text(text):
    """
    Looks for patterns like:
    5.8 x 6.2
    5800 x 6200
    5.8m x 6.2m

    RETURNS (length_m, width_m) or None
    """
    match = re.search(r'(\d+(\.\d+)?)[ ]*(m|mm)?[ ]*[x×][ ]*(\d+(\.\d+)?)[ ]*(m|mm)?', text)
    if not match:
        return None

    a = float(match.group(1))
    b = float(match.group(4))

    # assume meters if value < 100, else mm
    if a > 100:
        a = a / 1000
    if b > 100:
        b = b / 1000

    return round(a, 2), round(b, 2)

# ======================================================
# ROOM NAME INFERENCE + CONFIDENCE
# ======================================================
def infer_room_name_and_confidence(cnt, ocr_blocks, radius=140):
    """Infer room name and confidence from OCR data near contour"""
    confidence = 0.40  # base for closed geometry
    detected_name = "room"
    dim_found = False

    M = cv2.moments(cnt)
    if M["m00"] == 0:
        return detected_name, confidence, None

    cx = int(M["m10"] / M["m00"])
    cy = int(M["m01"] / M["m00"])

    for b in ocr_blocks:
        if abs(cx - b["center"][0]) < radius and abs(cy - b["center"][1]) < radius:
            # room name
            for w in ROOM_WORDS:
                if w in b["text"]:
                    detected_name = w
                    confidence += 0.25

            # dimension text
            dims = extract_dimensions_from_text(b["text"])
            if dims:
                dim_found = True
                confidence += 0.25

    confidence = min(confidence, 0.95)
    return detected_name, confidence, dim_found

# ======================================================
# CLOSED ROOM DETECTION (GEOMETRY)
# ======================================================
def detect_closed_rooms(image_path):
    """Detect closed room contours using edge detection"""
    img = cv2.imread(image_path)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape
    image_area = h * w

    edges = cv2.Canny(gray, 60, 180)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (11, 11))
    edges = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel)

    contours, hierarchy = cv2.findContours(edges, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

    closed = []
    for i, cnt in enumerate(contours):
        if hierarchy[0][i][3] == -1:
            continue

        area = cv2.contourArea(cnt)
        if area < 0.01 * image_area or area > 0.30 * image_area:
            continue

        x, y, bw, bh = cv2.boundingRect(cnt)
        if x <= 5 or y <= 5 or x + bw >= w - 5 or y + bh >= h - 5:
            continue

        if area / (bw * bh) < 0.65:
            continue

        closed.append(cnt)

    return closed, image_area

# ======================================================
# BOQ WORK FETCH
# ======================================================
def get_works(space_type):
    """Get available works for a space type"""
    rows = scope_df[scope_df["space_type"] == space_type]
    if rows.empty:
        rows = scope_df[scope_df["space_type"] == "room"]
    return rows.to_dict("records")

def get_all_works_for_space(space_type):
    """Get all works for a space type (for automated selection)"""
    works = get_works(space_type)
    return [
        {
            "work_code": w["work_code"],
            "work_name": w["scope_label"]
        }
        for w in works
    ]

# ======================================================
# MAIN PROCESSING FUNCTION
# ======================================================
def process_floorplan(image_path, meter_per_pixel, auto_select_works=True, selected_works=None):
    """
    Main processing function for floor plan analysis
    
    Args:
        image_path: Path to floor plan image
        meter_per_pixel: Scale factor for converting pixels to meters
        auto_select_works: If True, automatically select all available works
        selected_works: Dict mapping space_type to list of work indices (0-based)
    
    Returns:
        Dictionary with rooms, available_works, and boq
    """
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found: {image_path}")
    
    if meter_per_pixel <= 0:
        raise ValueError("meter_per_pixel must be positive")

    # Extract OCR blocks
    ocr_blocks = extract_ocr_blocks(image_path)
    
    # Detect closed rooms
    closed_cnts, total_px = detect_closed_rooms(image_path)

    # Process detected rooms
    rooms = []
    for cnt in closed_cnts:
        name, confidence, dim_found = infer_room_name_and_confidence(cnt, ocr_blocks)
        area_px = cv2.contourArea(cnt)
        sqm = round(area_px * (meter_per_pixel ** 2), 2)
        sqft = round(sqm * 10.7639, 2)

        rooms.append({
            "name": name,
            "sqm": sqm,
            "sqft": sqft,
            "confidence": confidence,
            "area_source": "pixel_geometry",
            "has_dimensions": dim_found
        })

    # Group rooms by type
    grouped = defaultdict(list)
    for r in rooms:
        grouped[r["name"]].append(r)

    # Get available works for each room type
    available_works = {}
    for space in grouped.keys():
        available_works[space] = get_all_works_for_space(space)

    # Generate BOQ
    boq = []
    
    if auto_select_works:
        # Automatically select all works for all rooms
        for space, rs in grouped.items():
            works = get_works(space)
            for w in works:
                for r in rs:
                    boq.append({
                        "space": space.title(),
                        "work_code": w["work_code"],
                        "work_name": w["scope_label"],
                        "qty_sqm": r["sqm"],
                        "qty_sqft": r["sqft"],
                        "area_source": r["area_source"],
                        "confidence": round(r["confidence"], 2)
                    })
    elif selected_works:
        # Use provided work selections
        for space, rs in grouped.items():
            if space not in selected_works:
                continue
            
            works = get_works(space)
            work_indices = selected_works[space]
            
            for idx in work_indices:
                if 0 <= idx < len(works):
                    w = works[idx]
                    for r in rs:
                        boq.append({
                            "space": space.title(),
                            "work_code": w["work_code"],
                            "work_name": w["scope_label"],
                            "qty_sqm": r["sqm"],
                            "qty_sqft": r["sqft"],
                            "area_source": r["area_source"],
                            "confidence": round(r["confidence"], 2)
                        })

    return {
        "rooms": rooms,
        "available_works": available_works,
        "boq": boq,
        "total_rooms": len(rooms),
        "room_summary": {
    space: len(rooms)
    for space, rooms in grouped.items()
}

    }

# ======================================================
# CLI INTERFACE (for API calls)
# ======================================================
def main():
    try:
        print("DEBUG: Script started", file=sys.stderr)

        print(f"DEBUG: argv = {sys.argv}", file=sys.stderr)

        if len(sys.argv) < 3:
            raise Exception("Not enough arguments passed")

        image_path = sys.argv[1]
        meter_per_pixel = float(sys.argv[2])

        auto_select_works = True
        if len(sys.argv) > 3:
            auto_select_works = sys.argv[3].lower() == 'true'

        selected_works = None
        if len(sys.argv) > 4:
            selected_works = json.loads(sys.argv[4])

        print(f"DEBUG: image_path={image_path}", file=sys.stderr)
        print(f"DEBUG: meter_per_pixel={meter_per_pixel}", file=sys.stderr)
        print(f"DEBUG: auto_select_works={auto_select_works}", file=sys.stderr)
        print(f"DEBUG: selected_works={selected_works}", file=sys.stderr)

        result = process_floorplan(
            image_path,
            meter_per_pixel,
            auto_select_works,
            selected_works
        )

        print(json.dumps({
            "success": True,
            "data": result
        }))

    except Exception as e:
        print("❌ PYTHON ERROR:", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)

        print(json.dumps({
            "success": False,
            "error": str(e)
        }))
        sys.exit(1)
if __name__ == "__main__":
    main()
