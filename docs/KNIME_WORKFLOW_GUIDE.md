# KNIME Workflow Configuration Guide

## Overview

This project uses KNIME Analytics Platform to process Excel data files and generate JSON exports for the web visualization dashboard. All workflows read from the read-only Excel files in `data/` and output JSON to `web/knime_exports/`.

## Quick Start

### 1. Update All Workflows to Use Correct Paths

Each workflow needs two path updates:

#### Input: Excel Reader Node
- **Current path:** May point to old location
- **New path:** `../../data/police_enforcement_2024_positive_drug_tests.xlsx`
- **How to update:**
  1. Right-click "Excel Reader (#1)" → Configure
  2. Browse to or type the path above
  3. Ensure "Read all data" is checked
  4. Click OK

#### Output: Writer Node  
- **Current:** CSV Writer
- **New:** JSON Writer pointing to `../../web/knime_exports/[filename].json`
- **How to update:**
  1. Delete existing "CSV Writer" node
  2. Add "JSON Writer" node from Node Repository
  3. Connect GroupBy output to JSON Writer input
  4. Configure JSON Writer:
     - Path: `../../web/knime_exports/[workflow_name].json`
     - Write mode: Overwrite
     - Format: Pretty print (optional, for readability)
  5. Click OK

---

## Workflow Details

### Required Workflows (7 total)

| Workflow | Input Excel | Output JSON | Description |
|----------|-------------|-------------|-------------|
| `trend_by_year` | positive_drug_tests.xlsx | `trend_by_year.json` | Total counts by year |
| `jurisdiction_year` | positive_drug_tests.xlsx | `jurisdiction_year.json` | Counts by year + jurisdiction |
| `age_year_drug` | positive_drug_tests.xlsx | `age_year_drug.json` | Demographics by age/drug/year |
| `drug_composition` | positive_drug_tests.xlsx | `drug_composition.json` | Drug mix by jurisdiction |
| `jurisdiction_drug_matrix` | positive_drug_tests.xlsx | `jurisdiction_drug_matrix.json` | Heatmap data |
| `map_by_state_location` | positive_drug_tests.xlsx | `map_by_state_location.json` | Geographic distribution |
| `creative_view` | positive_drug_tests.xlsx | `creative_view.json` | Multi-metric analysis |

---

## Detailed Workflow Configurations

### 1. trend_by_year

**Purpose:** Aggregate total positive tests by year (all jurisdictions combined)

**Expected Output:**
```json
[
  {"YEAR": 2008, "COUNT": 2413},
  {"YEAR": 2009, "COUNT": 2910}
]
```

**Node Configuration:**

1. **Excel Reader (#1)**
   - File: `../../data/police_enforcement_2024_positive_drug_tests.xlsx`
   - Sheet: Sheet1 (or first sheet)

2. **Column Filter (#2)**
   - Include: YEAR, COUNT, METRIC, NO_DRUGS_DETECTED

3. **Row Filter (#9)** - Filter METRIC
   - Column: METRIC
   - Match: equals "positive_drug_tests"

4. **Row Filter (#10)** - Exclude no drugs
   - Column: NO_DRUGS_DETECTED
   - Match: NOT equals "Yes"

5. **GroupBy (#8)**
   - Group columns: YEAR
   - Aggregation: COUNT → Sum

6. **JSON Writer** 
   - Output: `../../web/knime_exports/trend_by_year.json`

---

### 2. jurisdiction_year

**Purpose:** Aggregate by year AND jurisdiction

**Expected Output:**
```json
[
  {"YEAR": 2008, "JURISDICTION": "NSW", "COUNT": 542},
  {"YEAR": 2008, "JURISDICTION": "QLD", "COUNT": 216}
]
```

**Node Configuration:**

Same as trend_by_year, except:

2. **Column Filter (#2)**
   - Include: YEAR, JURISDICTION, COUNT, METRIC, NO_DRUGS_DETECTED

5. **GroupBy (#8)**
   - Group columns: YEAR, JURISDICTION
   - Aggregation: COUNT → Sum

6. **JSON Writer**
   - Output: `../../web/knime_exports/jurisdiction_year.json`

---

### 3. age_year_drug

**Purpose:** Analyze age groups with drug types

**Expected Output:**
```json
[
  {"YEAR": 2023, "AGE_GROUP": "0-16", "DRUG": "AMPHETAMINE", "COUNT": 29},
  {"YEAR": 2023, "AGE_GROUP": "0-16", "DRUG": "CANNABIS", "COUNT": 50}
]
```

**Node Configuration:**

1. **Excel Reader** - same as above

2. **Column Filter**
   - Include: YEAR, AGE_GROUP, AMPHETAMINE, CANNABIS, COCAINE, ECSTASY, METHYLAMPHETAMINE, COUNT, METRIC, NO_DRUGS_DETECTED

3. **Row Filter (#9)** - positive_drug_tests only

4. **Row Filter (#10)** - Exclude NO_DRUGS_DETECTED = "Yes"

5. **Row Filter** (NEW) - Exclude "All ages"
   - Column: AGE_GROUP
   - Match: NOT equals "All ages"

6. **Unpivot** (NEW NODE - add this)
   - Retained columns: YEAR, AGE_GROUP, COUNT
   - Value columns: AMPHETAMINE, CANNABIS, COCAINE, ECSTASY, METHYLAMPHETAMINE
   - Column name: DRUG
   - Value name: FLAG

7. **Row Filter** (NEW) - Keep only "Yes" flags
   - Column: FLAG
   - Match: equals "Yes"

8. **GroupBy**
   - Group: YEAR, AGE_GROUP, DRUG
   - Aggregation: COUNT → Sum

9. **JSON Writer**
   - Output: `../../web/knime_exports/age_year_drug.json`

---

### 4. drug_composition

**Purpose:** Drug breakdown by jurisdiction and year

**Expected Output:**
```json
[
  {"YEAR": 2023, "JURISDICTION": "NSW", "DRUG": "CANNABIS", "COUNT": 15234}
]
```

**Node Configuration:**

Similar to age_year_drug, but:

2. **Column Filter**
   - Include: YEAR, JURISDICTION, AMPHETAMINE, CANNABIS, COCAINE, ECSTASY, METHYLAMPHETAMINE, COUNT, METRIC, NO_DRUGS_DETECTED

6. **Unpivot**
   - Retained: YEAR, JURISDICTION, COUNT
   - Value columns: Drug columns

8. **GroupBy**
   - Group: YEAR, JURISDICTION, DRUG
   - Aggregation: COUNT → Sum

9. **JSON Writer**
   - Output: `../../web/knime_exports/drug_composition.json`

---

### 5. jurisdiction_drug_matrix

**Purpose:** Same as drug_composition (used for heatmap)

**Configuration:** Identical to drug_composition

**Output:** `../../web/knime_exports/jurisdiction_drug_matrix.json`

---

### 6. map_by_state_location

**Purpose:** Geographic data with location detail (Major Cities, Regional, Remote)

**Expected Output:**
```json
[
  {"YEAR": 2023, "JURISDICTION": "NSW", "LOCATION": "Major Cities", "COUNT": 12345}
]
```

**Node Configuration:**

1. **Excel Reader** - same

2. **Column Filter**
   - Include: YEAR, JURISDICTION, LOCATION, COUNT, METRIC, NO_DRUGS_DETECTED

3-4. **Row Filters** - same as before

5. **GroupBy**
   - Group: YEAR, JURISDICTION, LOCATION
   - Aggregation: COUNT → Sum

6. **JSON Writer**
   - Output: `../../web/knime_exports/map_by_state_location.json`

---

### 7. creative_view

**Purpose:** Multi-metric data for advanced visualizations

**Expected Output:**
```json
[
  {
    "YEAR": 2023,
    "JURISDICTION": "NSW",
    "COUNT": 25678,
    "FINES": 18234,
    "ARRESTS": 1234,
    "CHARGES": 5678
  }
]
```

**Node Configuration:**

1. **Excel Reader** - same

2. **Column Filter**
   - Include: YEAR, JURISDICTION, COUNT, FINES, ARRESTS, CHARGES, METRIC, NO_DRUGS_DETECTED

3-4. **Row Filters** - same

5. **GroupBy**
   - Group: YEAR, JURISDICTION
   - Aggregation: 
     - COUNT → Sum
     - FINES → Sum
     - ARRESTS → Sum
     - CHARGES → Sum

6. **JSON Writer**
   - Output: `../../web/knime_exports/creative_view.json`

---

## Batch Execution

### Option 1: KNIME GUI

1. Open KNIME workspace
2. Select all workflow folders
3. Right-click → Execute All
4. Wait for all to complete (green lights)

### Option 2: Command Line (Headless)

```bash
# Windows
"C:\Program Files\KNIME\knime.exe" -nosplash ^
  -application org.knime.product.KNIME_BATCH_APPLICATION ^
  -workflowDir="knime/trend_by_year" ^
  -reset

# Repeat for each workflow
```

### Option 3: Python Automation Script

Create `scripts/run_knime_workflows.py`:

```python
import subprocess
import os
from pathlib import Path

KNIME_PATH = r"C:\Program Files\KNIME\knime.exe"
PROJECT_ROOT = Path(__file__).parent.parent

workflows = [
    "trend_by_year",
    "jurisdiction_year",
    "age_year_drug",
    "drug_composition",
    "jurisdiction_drug_matrix",
    "map_by_state_location",
    "creative_view"
]

for workflow in workflows:
    workflow_dir = PROJECT_ROOT / "knime" / workflow
    print(f"Executing {workflow}...")
    
    cmd = [
        KNIME_PATH,
        "-nosplash",
        "-application", "org.knime.product.KNIME_BATCH_APPLICATION",
        f"-workflowDir={workflow_dir}",
        "-reset"
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode == 0:
        print(f"  [OK] {workflow}")
    else:
        print(f"  [ERROR] {workflow}")
        print(result.stderr)

print("\nAll workflows executed!")
```

---

## Validation

After running workflows, validate outputs:

```bash
python scripts/validate_json.py
```

Expected output:
```
[OK]   knime_exports/age_year_drug.json
       Valid JSON array with 57 records
[OK]   knime_exports/creative_view.json
       Valid JSON array with 126 records
...
```

---

## Common Issues

### Issue: Excel file not found
**Solution:** Use relative paths from the workflow directory:
- ✅ `../../data/police_enforcement_2024_positive_drug_tests.xlsx`
- ❌ `C:\Users\...\data\police_enforcement_2024_positive_drug_tests.xlsx`

### Issue: GroupBy produces no output
**Solution:** Check that:
- Row filters aren't excluding all data
- Column names match exactly (case-sensitive)
- Data types are correct

### Issue: JSON Writer missing
**Solution:** Install JSON extension:
1. Help → Install New Software
2. Select KNIME Update Site
3. Search for "JSON"
4. Install "KNIME JSON Processing"
5. Restart KNIME

### Issue: Unpivot not working correctly
**Solution:**
- Ensure drug columns are selected in "Value columns"
- Set "Column name" to DRUG
- Set "Value name" to FLAG

---

## Testing Individual Workflows

To test one workflow before running all:

1. Open workflow in KNIME
2. Execute each node sequentially (right-click → Execute)
3. View output after each node (right-click → View: Output Data)
4. Verify final JSON output
5. Compare with expected structure above

---

## Migration Checklist

- [ ] Install KNIME Analytics Platform
- [ ] Install JSON extension
- [ ] Import all 7 workflows
- [ ] Update Excel Reader paths (all workflows)
- [ ] Replace CSV Writers with JSON Writers (all workflows)
- [ ] Execute all workflows
- [ ] Run validation script
- [ ] Verify website loads correctly
- [ ] Test all visualizations

---

## Reference

**Project Structure:**
```
DataVisProject/
├── data/
│   ├── police_enforcement_2024_positive_drug_tests.xlsx  ← INPUT
│   └── converted_json/  (read-only backups)
├── knime/
│   ├── trend_by_year/
│   ├── jurisdiction_year/
│   ├── age_year_drug/
│   ├── drug_composition/
│   ├── jurisdiction_drug_matrix/
│   ├── map_by_state_location/
│   └── creative_view/
└── web/
    └── knime_exports/  ← OUTPUT (JSON files)
        ├── trend_by_year.json
        ├── jurisdiction_year.json
        ├── age_year_drug.json
        ├── drug_composition.json
        ├── jurisdiction_drug_matrix.json
        ├── map_by_state_location.json
        └── creative_view.json
```

---

**Last Updated:** 2025-11-28  
**KNIME Version:** 5.8.0+  
**Author:** DataVisProject Team
