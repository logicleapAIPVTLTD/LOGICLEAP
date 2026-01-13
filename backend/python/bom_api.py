
#!/usr/bin/env python3
"""
BOM API Integration Wrapper
Handles stdin/stdout communication with Node.js controller
Wraps the existing bom.py functionality
"""

import sys
import json
import os
from datetime import datetime
from io import StringIO

# Create a custom StringIO that has a no-op reconfigure method
class SafeStringIO(StringIO):
    def reconfigure(self, **kwargs):
        """No-op method to make it compatible with sys.stdout.reconfigure()"""
        pass

# Suppress all print statements from bom.py during import
original_stdout = sys.stdout
original_stderr = sys.stderr

# Replace with our custom StringIO
sys.stdout = SafeStringIO()
sys.stderr = SafeStringIO()

try:
    # Import the main BOM module functions
    from bom import (
        generate_bom_from_boq_output,
        BOM_DF,
        match_work_type,
        WORK_TYPES
    )
    import_success = True
except ImportError as e:
    import_success = False
    import_error = str(e)
except Exception as e:
    import_success = False
    import_error = str(e)
finally:
    # Restore stdout/stderr
    sys.stdout = original_stdout
    sys.stderr = original_stderr

if not import_success:
    print(json.dumps({
        "success": False,
        "error": f"Failed to import bom.py module: {import_error}"
    }), file=sys.stderr)
    sys.exit(1)

def suppress_prints(func):
    """Decorator to suppress all prints from a function"""
    def wrapper(*args, **kwargs):
        old_stdout = sys.stdout
        old_stderr = sys.stderr
        sys.stdout = SafeStringIO()
        sys.stderr = SafeStringIO()
        try:
            result = func(*args, **kwargs)
            return result
        finally:
            sys.stdout = old_stdout
            sys.stderr = old_stderr
    return wrapper

def main():
    """
    Main entry point for Node.js integration
    Reads JSON from stdin, processes, outputs JSON to stdout
    """
    try:
        # Read command line argument if provided
        if len(sys.argv) > 1:
            command = sys.argv[1]
            
            # Handle special commands
            if command == 'health':
                handle_health_check()
                return
            elif command == 'stats':
                handle_stats()
                return
            elif command == 'test-match':
                handle_test_match()
                return
        
        # Read input from stdin
        input_line = sys.stdin.read().strip()
        
        if not input_line:
            output_error("No input received")
            return
        
        input_data = json.loads(input_line)
        boq_data = input_data.get('boq_data', [])
        project_days = input_data.get('project_days', 15)
        
        if not boq_data:
            output_error("Missing 'boq_data' in request")
            return
        
        if not isinstance(boq_data, list):
            output_error("'boq_data' must be a list")
            return
        
        # Suppress prints during BOM generation
        old_stdout = sys.stdout
        old_stderr = sys.stderr
        sys.stdout = SafeStringIO()
        sys.stderr = SafeStringIO()
        
        try:
            # Generate BOM (with prints suppressed)
            result_df = generate_bom_from_boq_output(boq_data, project_days)
        finally:
            # Restore stdout/stderr
            sys.stdout = old_stdout
            sys.stderr = old_stderr
        
        if result_df is None or result_df.empty:
            output_error("No BOM items generated. Check if work names match master data.")
            return
        
        # Convert DataFrame to list of dictionaries
        bom_items = result_df.to_dict('records')
        
        # Generate unique filename
        timestamp = int(datetime.now().timestamp())
        excel_filename = f"Final_Project_BOM_{timestamp}.xlsx"
        excel_path = os.path.join(os.path.dirname(__file__), excel_filename)
        
        # Save to Excel
        result_df.to_excel(excel_path, index=False)
        
        # Calculate summary statistics
        work_types = result_df['Ref_BOQ_Scope'].unique().tolist() if 'Ref_BOQ_Scope' in result_df.columns else []
        total_materials = len(result_df['Item_Name'].unique()) if 'Item_Name' in result_df.columns else len(result_df)
        
        # Output success response
        output_success({
            "items": bom_items,
            "total_items": len(bom_items),
            "total_materials": total_materials,
            "work_types": work_types,
            "excel_file": excel_filename
        })
        
    except json.JSONDecodeError as e:
        output_error(f"Invalid JSON input: {e}")
    except Exception as e:
        output_error(f"Processing error: {str(e)}")

def handle_health_check():
    """Handle health check request"""
    try:
        health_data = {
            "db_connected": not BOM_DF.empty,
            "master_loaded": not BOM_DF.empty,
            "work_types_count": len(WORK_TYPES) if WORK_TYPES else 0,
            "materials_count": len(BOM_DF) if not BOM_DF.empty else 0
        }
        print(json.dumps(health_data, indent=2))
    except Exception as e:
        print(json.dumps({
            "db_connected": False,
            "master_loaded": False,
            "error": str(e)
        }))

def handle_stats():
    """Handle statistics request"""
    try:
        if BOM_DF.empty:
            output_error("Master data not loaded")
            return
        
        stats = {
            "total_work_types": len(BOM_DF['Work_Type'].unique()) if 'Work_Type' in BOM_DF.columns else 0,
            "total_materials": len(BOM_DF),
            "work_type_breakdown": BOM_DF.groupby('Work_Type').size().to_dict() if 'Work_Type' in BOM_DF.columns else {},
            "unit_distribution": BOM_DF.groupby('Unit').size().to_dict() if 'Unit' in BOM_DF.columns else {},
            "items_per_work_type": BOM_DF.groupby('Work_Type')['Item_Name'].count().to_dict() if 'Work_Type' in BOM_DF.columns and 'Item_Name' in BOM_DF.columns else {}
        }
        
        print(json.dumps(stats, indent=2))
    except Exception as e:
        output_error(f"Error generating stats: {e}")

def handle_test_match():
    """Handle work type matching test"""
    try:
        input_line = sys.stdin.read().strip()
        if not input_line:
            output_error("No input for matching test")
            return
        
        input_data = json.loads(input_line)
        work_name = input_data.get('work_name', '')
        
        if not work_name:
            output_error("Missing 'work_name' in request")
            return
        
        # Suppress prints during matching
        old_stdout = sys.stdout
        sys.stdout = SafeStringIO()
        
        try:
            matched_type = match_work_type(work_name)
        finally:
            sys.stdout = old_stdout
        
        # Get top 3 alternatives with scores
        try:
            from sklearn.feature_extraction.text import TfidfVectorizer
            from sklearn.metrics.pairwise import cosine_similarity
            from fuzzywuzzy import fuzz
            
            if not BOM_DF.empty:
                work_types = BOM_DF["Work_Type"].unique().tolist()
                work_text_map = (
                    BOM_DF.groupby("Work_Type")["Item_Name"]
                    .apply(lambda x: " ".join(x.astype(str)))
                    .to_dict()
                )
                work_texts = [f"{wt} {work_text_map.get(wt, '')}" for wt in work_types]
                
                tfidf_vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2))
                tfidf_matrix = tfidf_vectorizer.fit_transform(work_texts)
                user_vec = tfidf_vectorizer.transform([work_name.lower()])
                
                scores = []
                for i, wt in enumerate(work_types):
                    tfidf_score = cosine_similarity(user_vec, tfidf_matrix[i])[0][0] * 100
                    fuzzy_score = fuzz.token_set_ratio(work_name.lower(), wt.lower())
                    final_score = (0.6 * tfidf_score) + (0.4 * fuzzy_score)
                    scores.append({"work_type": wt, "score": round(final_score, 2)})
                
                scores.sort(key=lambda x: x['score'], reverse=True)
                alternatives = scores[1:4] if len(scores) > 1 else []
                best_score = scores[0]['score'] if scores else 0
            else:
                alternatives = []
                best_score = 0
        except Exception:
            alternatives = []
            best_score = 0
        
        result = {
            "matched_type": matched_type or "No Match",
            "score": best_score,
            "alternatives": alternatives
        }
        
        print(json.dumps(result, indent=2))
        
    except Exception as e:
        output_error(f"Error in matching test: {e}")

def output_success(data):
    """Output successful result as JSON"""
    result = {
        "success": True,
        "data": data.get("items", []),
        "total_items": data.get("total_items", 0),
        "total_materials": data.get("total_materials", 0),
        "work_types": data.get("work_types", []),
        "excel_file": data.get("excel_file", None)
    }
    print(json.dumps(result, indent=2))

def output_error(message):
    """Output error as JSON"""
    result = {
        "success": False,
        "error": message,
        "data": [],
        "total_items": 0
    }
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()