import pandas as pd
import json
from pathlib import Path

# Define the web/knime_exports directory
knime_exports_dir = Path(__file__).parent.parent / 'web' / 'knime_exports'

# Get all CSV files
csv_files = list(knime_exports_dir.glob('*.csv'))

print(f"Found {len(csv_files)} CSV files to convert\n")

def convert_csv_to_json(csv_path):
    """Convert a CSV file to JSON format"""
    json_path = csv_path.with_suffix('.json')
    
    print(f"Converting {csv_path.name}...")
    
    try:
        # Read CSV file
        df = pd.read_csv(csv_path)
        
        # Convert to JSON with records orientation
        json_data = df.to_dict(orient='records')
        
        # Write to JSON file
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(json_data, f, indent=2, ensure_ascii=False, default=str)
        
        print(f"[OK] Converted to {json_path.name} ({len(json_data)} records)")
        return True
        
    except Exception as e:
        print(f"[ERROR] Error converting {csv_path.name}: {str(e)}")
        return False

def main():
    print("=" * 60)
    print("CSV to JSON Converter for KNIME Exports")
    print("=" * 60 + "\n")
    
    if not csv_files:
        print("No CSV files found in web/knime_exports/")
        return
    
    success_count = 0
    for csv_file in csv_files:
        if convert_csv_to_json(csv_file):
            success_count += 1
    
    print("\n" + "=" * 60)
    print(f"Conversion complete: {success_count}/{len(csv_files)} files converted")
    print("=" * 60)

if __name__ == "__main__":
    main()
