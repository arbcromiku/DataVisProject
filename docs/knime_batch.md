# KNIME Headless Checks (NodePit Batch)

Use NodePit Batch to validate each per-chart workflow headlessly. This surfaces node errors without opening the KNIME GUI.

## Install NodePit Batch (once per KNIME install)
Run in your KNIME installation directory (match the repository version to your KNIME version):

```
knime.exe -nosplash -consoleLog -noexit ^
  -application org.eclipse.equinox.p2.director ^
  -repository https://download.nodepit.com/5.4 ^
  -installIUs com.nodepit.batch.feature.feature.group
```

## Run a workflow headless (per chart)
From the repo root, supply the workflow file and reset to force re-execution:

```
"C:\Program Files\KNIME\knime.exe" -nosplash -application com.nodepit.batch.application.NodePitBatchExecutor ^
  -workflowFile="knime/dashboard.knwf" ^
  -reset
```

If you split flows per chart, point `-workflowFile` to the specific `.knwf` (e.g., `knime/trend_by_year.knwf`).

## Suggested checks per exported table
- Trend:     run `knime/dashboard.knwf` branch `trend_by_year` → verifies `data/knime_exports/trend_by_year.csv`
- Jurisdiction bars: branch `jurisdiction_bars` → `jurisdiction_year.csv`
- Age distribution / stacked: branch `age_distribution` → `age_year_drug.csv`
- Drug composition/heatmap: branch `drug_composition` or `heatmap_matrix` → `drug_composition.csv` / `jurisdiction_drug_matrix.csv`
- Map/remoteness: branch `geo_remoteness` → `map_by_state_location.csv`
- Creative view: branch `creative_view` → `creative_view.csv`
- Processed JSON: branch `processed_json` → `web/processed_police_data.json`

## Tips
- Add `-consoleLog` to see node-level errors; non-zero exit will signal failures in CI.
- Include `-reset` to avoid cached results when iterating on transformations.
- If workflows expect variables, pass them with `-workflow.variable=name,value,type` (type: String, Integer, Double).