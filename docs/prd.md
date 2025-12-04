# Product Requirements Document (PRD)

## Product Overview
Australian Police Drug Testing Dashboard: a public, interactive web dashboard that surfaces trends, jurisdictional comparisons, cohorts, and substance mix of roadside drug testing positives (BITRE dataset, 2008–2024). Audience: transport safety policymakers, road policing leads, public health analysts.

## Objectives and Success Metrics
- Reveal where and when drug-positive roadside tests peak, by jurisdiction and year.
- Compare substances (meth/amphetamine, THC, cocaine, MDMA) with evidence context to guide countermeasures.
- Highlight high-risk cohorts (age, location metro vs regional) for targeted enforcement.
- Provide exportable visuals and citeable numbers for policy reports.
- Success: 80% of target users can find jurisdiction + substance insights in <2 minutes; exports used in briefings; zero PII exposure; data recency within 1 quarter of latest BITRE release.

## Users and Use Cases
- Policy analysts: craft briefings, justify enforcement resource allocation.
- Road policing leads: plan targeted operations by jurisdiction/remoteness/age cohort.
- Public health analysts: connect enforcement with harm trends, note legislative gaps (e.g., medicinal cannabis vs zero-tolerance).
- Student assessors: evaluate design/storytelling, interactivity, accessibility per rubric.

## Scope (In)
- Data: processed_police_data.json (aggregated positives 2008–2024), jurisdiction, year, age group, location (metro/regional), drug flags, counts and enforcement outcomes (fines/arrests/charges where present).
- Views: trend over time; jurisdiction comparison; age distribution; drug composition; heatmap (jurisdiction × drug); stacked area for drug evolution; map bubbles for spatial context; creative chart (radial/radar/bubble/stream/timeline per rubric); summary cards for peak metrics; export SVG/PNG.
- Interactivity: filters (jurisdiction, year range, age group, drug); cross-filter between jurisdiction bars and heatmap; responsive layout; tooltips; annotations for peaks and caveats.
- Accessibility: WCAG AA contrast, focus-visible controls, 44px touch targets, keyboardable filters, color redundancy via labels/legends.

## Scope (Out)
- Individual-level data or PII.
- Impairment detection or legal advice; no dose/impairment inference beyond provided evidence notes.
- Real-time updates; alerts/notifications.

## Data and Processing
- Source: BITRE National Road Safety Data Hub roadside drug testing positives.
- Pipeline (existing): KNIME flow + Python helper `scripts/build_processed_data.py` to regenerate processed JSON; domain checks on categorical values; numeric coercion; duplicate-key detection; remoteness limited to ASGS labels; checksum storage for raw extract.
- KNIME coverage: provide a KNIME workflow (or branch) per chart—trend, jurisdiction bars, age distribution, drug composition/stacked area, jurisdiction × drug heatmap, map bubbles, and creative chart—each exporting the pre-aggregated table consumed by its D3 view, with node annotations and saved outputs checked into version control.
- Data quality gates: enforce year span (2008–2024), row counts, categorical domains (Yes/No/Not applicable), numeric fields, remoteness coverage notes (detailed only for 2023–2024).

## Functional Requirements
- Load processed_police_data.json on page load; keep dataset in memory for fast filtering.
- Charts: 
  - Trend line of positives by year (all or filtered jurisdiction).
  - Jurisdiction horizontal bars with counts/shares; click to filter heatmap and other views.
  - Age-group grouped/stacked bars.
  - Drug composition stacked bars/area; heatmap for jurisdiction × drug matrix.
  - Map with metro bubbles (or jurisdiction-level choropleth surrogate) for spatial context.
  - Creative chart to satisfy rubric complexity (radial/radar/bubble/stream/timeline) highlighting substance mix over time or by jurisdiction.
- Filters: jurisdiction dropdown, year range slider, age group select, drug multi-select; reset control.
- Summary cards: peak year, peak jurisdiction share, leading substance, growth rate, note on remoteness coverage.
- Tooltips showing counts and percentages; annotations for NSW 2023 peak and remoteness caveat.
- Export buttons (SVG/PNG or print-ready) per chart; citeable numbers (table or CSV for filtered view if time allows).

## Non-Functional Requirements
- Performance: client-side filtering <150ms; debounce resize; avoid heavy DOM churn; pre-aggregate where possible.
- Responsiveness: charts legible on mobile; adaptive margins/label density; touch-friendly controls.
- Reliability: graceful failure if data load missing; display “data unavailable” message.
- Security/Privacy: no PII; static hosting acceptable; no external tracking.
- Accessibility: keyboard navigation, aria labels, focus order, contrast-safe palette, color redundancy.

## UX Notes
- Light-mode layout; Atkinson Hyperlegible or similar readable type; neutral background with blue + green accents aligned with current design book.
- Filters above charts; summary cards at top; charts ordered narrative: trend → jurisdiction → age → drug mix/heatmap → map → creative view.
- Annotations call out NSW 2023 peak, substance dominance, remoteness limitation.

## Dependencies and Risks
- Library: D3 v7; pdftotext/pypdf only for documentation extraction (not runtime).
- Risk: Source data updates; mitigation: rerun pipeline, version raw extract and processed JSON.
- Risk: Legislative nuance (medicinal cannabis) could be misread; mitigation: include evidence note in context panel.
- Risk: Performance on low-end devices; mitigation: pre-aggregate, avoid heavy transitions.

## Deliverables
- Web dashboard (HTML/JS/CSS) with charts and filters.
- Processed dataset file placed in web data directory.
- Static export capability per chart.
- Documentation: brief readme on data pipeline and regeneration steps.

## Validation
- Check chart values against processed JSON spot samples (counts by jurisdiction/year and drug totals).
- Accessibility smoke test: keyboard-only flow, contrast check, focus-visible.
- Responsive check: desktop and mobile widths.
- Performance check: filter interactions remain responsive with full dataset.

## Timeline (suggested)
- D0–D1: Finalize data pipeline validation; confirm processed JSON.
- D1–D2: Implement core charts (trend, jurisdiction, age, drug composition) with filters.
- D2–D3: Add heatmap, map, creative chart; annotations and summary cards.
- D3: Exports, accessibility pass, responsive tuning, validation.

## Open Questions
- Final hosting URL and path for processed JSON?
- Preferred export format (SVG vs PNG vs CSV tables)?
- Which creative chart variant best fits rubric: radar of substances per jurisdiction or streamgraph over time?
