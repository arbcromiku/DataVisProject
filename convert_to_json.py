import pandas as pd
import json
from datetime import datetime

# Read the Excel file
df = pd.read_excel('police_enforcement_2024_positive_drug_tests.xlsx')

# Convert datetime objects to ISO format strings for JSON compatibility
df['START_DATE'] = df['START_DATE'].dt.strftime('%Y-%m-%d')
df['END_DATE'] = df['END_DATE'].dt.strftime('%Y-%m-%d')

# Convert to JSON format suitable for D3.js
json_data = df.to_dict(orient='records')

# Save as JSON file
with open('police_enforcement_data.json', 'w') as f:
    json.dump(json_data, f, indent=2)

print("Data converted to JSON format successfully!")
print(f"Total records: {len(json_data)}")