import json
from pathlib import Path

# Define the web directory
web_dir = Path(__file__).parent.parent / 'web'

# List of JSON files to validate
json_files = [
    'knime_exports/age_year_drug.json',
    'knime_exports/creative_view.json',
    'knime_exports/drug_composition.json',
    'knime_exports/jurisdiction_drug_matrix.json',
    'knime_exports/jurisdiction_year.json',
    'knime_exports/map_by_state_location.json',
    'knime_exports/trend_by_year.json',
    'australian-states.geojson',
    'police_data.json'
]

def validate_json_file(file_path):
    """Validate that a JSON file is valid and can be loaded"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if isinstance(data, list):
            return True, f"Valid JSON array with {len(data)} records"
        elif isinstance(data, dict):
            return True, f"Valid JSON object with {len(data)} keys"
        else:
            return True, f"Valid JSON ({type(data).__name__})"
            
    except json.JSONDecodeError as e:
        return False, f"Invalid JSON: {str(e)}"
    except FileNotFoundError:
        return False, "File not found"
    except Exception as e:
        return False, f"Error: {str(e)}"

def main():
    print("=" * 70)
    print("JSON Validation Report")
    print("=" * 70 + "\n")
    
    all_valid = True
    
    for json_file in json_files:
        file_path = web_dir / json_file
        is_valid, message = validate_json_file(file_path)
        
        status = "[OK]  " if is_valid else "[FAIL]"
        print(f"{status} {json_file}")
        print(f"       {message}\n")
        
        if not is_valid:
            all_valid = False
    
    print("=" * 70)
    if all_valid:
        print("All JSON files are valid and ready to use!")
    else:
        print("Some JSON files have errors - please check above.")
    print("=" * 70)

if __name__ == "__main__":
    main()
