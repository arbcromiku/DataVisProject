import pandas as pd

# Read the Excel file
df = pd.read_excel('police_enforcement_2024_positive_drug_tests.xlsx')

# Display basic information about the data
print("Data shape:", df.shape)
print("\nColumn names:")
print(df.columns.tolist())
print("\nFirst few rows:")
print(df.head())
print("\nData types:")
print(df.dtypes)
print("\nMissing values:")
print(df.isnull().sum())