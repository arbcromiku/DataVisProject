import json
import pandas as pd

with open('web/processed_police_data.json', 'r') as f:
    data = json.load(f)

df = pd.DataFrame(data)
df['COUNT'] = pd.to_numeric(df['COUNT'])
df = df[df['METRIC'] == 'positive_drug_tests']
df = df[df['NO_DRUGS_DETECTED'] != 'Yes']

# Check which Jurisdictions/Years have detailed locations
detailed = df[df['LOCATION'] != 'All regions']
print("Detailed data available for:")
print(detailed.groupby(['JURISDICTION', 'YEAR']).size())
