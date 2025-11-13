import pandas as pd
import json

# Read the Excel file
df = pd.read_excel('police_enforcement_2024_positive_drug_tests.xlsx')

# Data cleaning and preprocessing
print("Original data shape:", df.shape)

# Convert datetime objects to ISO format strings
df['START_DATE'] = df['START_DATE'].dt.strftime('%Y-%m-%d')
df['END_DATE'] = df['END_DATE'].dt.strftime('%Y-%m-%d')

# Check for any unexpected data types or values
print("\nData types after conversion:")
print(df.dtypes)

# Check for any remaining non-serializable objects
print("\nSample data for verification:")
print(df.head(3))

# Convert to JSON format suitable for D3.js
json_data = df.to_dict(orient='records')

# Save as JSON file
with open('processed_police_data.json', 'w') as f:
    json.dump(json_data, f, indent=2)

print(f"\nData processing completed successfully!")
print(f"Total records processed: {len(json_data)}")
print("File saved as: processed_police_data.json")