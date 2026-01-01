import pandas as pd
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR / "data"
MAPPING_FILE = DATA_DIR / "ITEM_CLASSIFICATION_MASTER.xlsx"

# Load the mapping file
mapping_df = pd.read_excel(MAPPING_FILE)

# Check if Scrubbers already exists
if 'Scrubbers' in mapping_df['Item_Name'].values:
    print("✓ Scrubbers already in mapping file")
else:
    # Add Scrubbers as Machinery
    new_row = pd.DataFrame({
        'Item_Name': ['Scrubbers'],
        'Cost_Component': ['Machinery'],
        'Rate_Key': ['Vacuum_Cleaner']  # Using similar equipment rate
    })
    
    mapping_df = pd.concat([mapping_df, new_row], ignore_index=True)
    
    # Save back
    mapping_df.to_excel(MAPPING_FILE, index=False)
    print("✓ Added Scrubbers to mapping file")
    print("  Component: Machinery")
    print("  Rate Key: Vacuum_Cleaner")

print("\nNow run your estimation again!")