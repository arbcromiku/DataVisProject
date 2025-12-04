import json
import pandas as pd

try:
    with open('web/processed_police_data.json', 'r') as f:
        data = json.load(f)
    
    df = pd.DataFrame(data)
    print("Unique LOCATIONS:", df['LOCATION'].unique())
    print("Unique START_DATES (first 10):", df['START_DATE'].unique()[:10])
    print("Unique END_DATES (first 10):", df['END_DATE'].unique()[:10])
    
    # Check if any location is NOT "All regions"
    detailed_locations = df[df['LOCATION'] != 'All regions']
    print(f"Rows with specific locations: {len(detailed_locations)}")
    if not detailed_locations.empty:
        print("Sample detailed locations:", detailed_locations['LOCATION'].unique()[:10])

except Exception as e:
    print(e)
