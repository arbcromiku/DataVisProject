import pandas as pd
import json
import os
from pathlib import Path

# Define the data directory
data_dir = Path(__file__).parent.parent / 'data'

# List of Excel files to convert
excel_files = [
    'police_enforcement_2024_alcohol_drug_tests.xlsx',
    'police_enforcement_2024_fines.xlsx',
    'police_enforcement_2024_positive_breath_tests.xlsx',
    'police_enforcement_2024_positive_drug_tests.xlsx'
]

def convert_excel_to_json(excel_file):
    """Convert an Excel file to JSON format"""
    excel_path = data_dir / excel_file
    json_file = excel_file.replace('.xlsx', '.json')
    json_path = data_dir / json_file
    
    print(f"Converting {excel_file}...")
    
    try:
        # Read all sheets from the Excel file
        excel_data = pd.read_excel(excel_path, sheet_name=None)
        
        # If there's only one sheet, export it directly
        if len(excel_data) == 1:
            sheet_name = list(excel_data.keys())[0]
            df = excel_data[sheet_name]
            # Convert to JSON with records orientation
            json_data = df.to_dict(orient='records')
        else:
            # If multiple sheets, create a dictionary with sheet names as keys
            json_data = {}
            for sheet_name, df in excel_data.items():
                json_data[sheet_name] = df.to_dict(orient='records')
        
        # Write to JSON file
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(json_data, f, indent=2, ensure_ascii=False, default=str)
        
        print(f"[OK] Converted to {json_file}")
        return True
        
    except Exception as e:
        print(f"[ERROR] Error converting {excel_file}: {str(e)}")
        return False

def main():
    print("Starting Excel to JSON conversion...\n")
    
    success_count = 0
    for excel_file in excel_files:
        if convert_excel_to_json(excel_file):
            success_count += 1
    
    print(f"\n{success_count}/{len(excel_files)} files converted successfully!")

if __name__ == "__main__":
    main()
