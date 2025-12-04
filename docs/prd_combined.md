# Combined PRD – Dashboard + Design Book (Rubric-Aligned)

## Purpose & Audience
Deliver a public interactive D3 dashboard and a rubric-compliant Design Book for Australian roadside drug testing positives (BITRE, 2008–2024). Audience: transport safety policymakers, road policing leads, public health analysts, and course assessors.

## Deliverables
- Web dashboard (HTML/JS/CSS, D3-only) with charts, filters, exports.
- Processed dataset file for web (e.g., `web/processed_police_data.json`).
- KNIME workflows (`.knwf`, team-named) with embedded data: one annotated branch per chart/output (trend, jurisdiction bars, age distribution, drug composition/stacked area, jurisdiction × drug heatmap, map bubbles, creative chart) plus pipeline for processed JSON/CSV; outputs versioned.
- Design Book PDF (per course template) containing: evidence review, governance, EDA, design rationale, interactivity, iteration/validation, implementation notes, storytelling, APA7 references, AI declaration; KNIME screenshots and chart snapshots included.
- Links in submission comment: live Vercel site, GitHub repo.

## Scope
- **In**: Aggregated positives by year/jurisdiction/age/location/drug flags; fines/arrests/charges where available; evidence review (2016–present, 5–7 sources); accessibility and performance requirements; rubric-aligned sections.
- **Out**: Individual-level data/PII; non-D3 web charts; real-time ingestion.

## Objectives & Success Metrics
- Users find jurisdiction + substance insights <2 minutes; exports used in briefings.
- Zero PII; data recency within one quarter of latest BITRE release.
- Rubric criteria met across design book and site (see mapping below).

## Functional Requirements (Dashboard)
- Load processed dataset on page load; in-memory filtering.
- Charts: trend line; jurisdiction bars with click-to-filter; age grouped/stacked bars; drug composition stacked bars/area; jurisdiction × drug heatmap; map bubbles/choropleth surrogate; creative chart (radial/radar/bubble/stream/timeline) for complexity; summary cards (peak year/jurisdiction share/leading substance/growth/remoteness note).
- Interactivity: filters (jurisdiction, year range, age group, drug), reset; tooltips; annotations (NSW 2023 peak, remoteness caveat); cross-filter jurisdiction ↔ heatmap.
- Exports: SVG/PNG per chart; citeable numbers/table if feasible.

## Data & Processing
- Source: BITRE National Road Safety Data Hub roadside drug testing positives.
- Pipeline: KNIME + Python helper (`scripts/build_processed_data.py`); clean labels, handle missing, derive rates (positives/tests, fines per population if available), aggregate by year/state/drug/age/location; domain validation (Yes/No/Not applicable), numeric coercion, duplicate-key detection, year-span checks, remoteness coverage note (detailed 2023–2024); checksum raw extracts.
- KNIME coverage: dedicated branch per chart exporting its pre-aggregated table with node annotations; outputs stored in repo and referenced in Design Book.

## Non-Functional
- Performance: filter/redraw <150ms; debounce resize; minimal DOM churn; pre-aggregate.
- Responsiveness: mobile-legible charts; adaptive margins/label density; 44px touch targets.
- Accessibility: WCAG AA contrast, focus-visible, keyboardable controls, color redundancy, aria labels.
- Reliability: graceful failure on missing data; “data unavailable” messaging.
- Security/Privacy: no PII; static hosting acceptable.

## Design Book Outline (Rubric Mapping)
1) Introduction & Purpose (audience, motivation, user tasks, research-backed context).
2) Evidence Review (2016–present): crash risk (meth vs THC), deterrence vs detection, impairment vs presence/device limits; 5–7 sources; APA7.
3) Data Processing & Governance: sources, field contracts, quality checks; KNIME workflows/screenshots; processed outputs.
4) Exploratory Data Analysis: summary stats, pivots, small multiples; insights driving design.
5) Visualisation & Webpage Design: chart choices/justification; colour/labels/annotations; wireframes/storyboards; accessibility choices.
6) Interactivity: what/why/how (filters, tooltips, cross-highlighting, brushing/zoom where used).
7) Iteration & Validation: usability tests, feedback, accessibility audits; changes documented.
8) Implementation (coding practice, complexity, interactivity/responsive, performance): D3 architecture, data joins, advanced/creative chart description.
9) Storytelling: narrative arc, key insights, guidance through site.
10) Referencing & AI Declaration: APA7 list; explicit AI statement.

## Acceptance Criteria
- Each chart has a matching KNIME workflow/branch exporting its table; outputs committed and cited.
- Rubric criteria addressed with figures/screenshots; APA7 compliance; AI declaration present.
- Links to Vercel site and GitHub provided; Design Book references them.
- Dashboard meets functional/non-functional requirements and accessibility/performance checks.

## KNIME Output File Map (source → export → consumer)
- Trend line: `knime/dashboard.knwf` → `data/knime_exports/trend_by_year.csv` → `web/index.html` (`trend-chart`).
- Jurisdiction bars: `knime/dashboard.knwf` (branch `jurisdiction_bars`) → `data/knime_exports/jurisdiction_year.csv` → `jurisdiction-chart`.
- Age distribution: `knime/dashboard.knwf` (branch `age_distribution`) → `data/knime_exports/age_year_drug.csv` → `age-chart`, `stacked-chart`.
- Drug composition/stacked area: `knime/dashboard.knwf` (branch `drug_composition`) → `data/knime_exports/drug_composition.csv` → `drugtype-chart`, `composition-chart`, `evolution-chart`.
- Jurisdiction × drug heatmap: `knime/dashboard.knwf` (branch `heatmap_matrix`) → `data/knime_exports/jurisdiction_drug_matrix.csv` → `heatmap-chart`.
- Map bubbles/choropleth: `knime/dashboard.knwf` (branch `geo_remoteness`) → `data/knime_exports/map_by_state_location.csv` → `map-chart`, `remoteness-chart`.
- Creative chart (radial/stream/radar/bubble/timeline): `knime/dashboard.knwf` (branch `creative_view`) → `data/knime_exports/creative_view.csv` → creative sections.
- Processed JSON/CSV for site: `knime/dashboard.knwf` (branch `processed_json`) → `web/processed_police_data.json` + `data/processed_police_data.json`.

## Timeline (suggested)
- D0: Confirm data sources, governance notes, KNIME list per chart.
- D1: Finalize KNIME outputs; run quality checks; capture screenshots.
- D2: Build dashboard charts/filters; draft Design Book sections with figures.
- D3: Exports, accessibility/performance pass; APA7/AI declaration; assemble PDF; verify links.

## Risks & Mitigations
- Missing KNIME coverage → add branch per visual, export tables, document paths.
- Reference errors → keep source list with URLs/DOIs; cross-check citations; avoid fabrication.
- Accessibility gaps → contrast/focus tests; record fixes.
- Performance issues → pre-aggregate; limit transitions; debounced resize; measure redraws.

## Open Questions
- Final hosting URL/path for processed JSON?
- Preferred export formats (SVG vs PNG vs CSV tables)?
- Which creative chart variant to ship (radar vs streamgraph vs bubble)?
