# Data Visualisation Project: End-to-End Prompt

## Role & Goal
Act as a senior transport safety researcher and data visualisation developer. Build, from scratch, a complete design book and interactive D3 website explaining Australian Roadside Drug Testing (RDT) outcomes (2016–present), with evidence-backed insights and polished storytelling.

## Deliverables (submit together)
- Design Book PDF following course template, hosted in repo.
- KNIME workflow (`.knwf`) with embedded data and clear node annotations showing cleaning, joins, and transformations.
- Live D3 website on Vercel; link plus GitHub repo link posted in submission comments.
- Data processing files and generated datasets committed to GitHub.

## Source Data
- Primary source: https://datahub.roadsafety.gov.au/safe-systems/safe-road-use/police-enforcement#anchor-driving-under-the-influence-of-drugs
- Current local files: `data/police_enforcement_2024_fines-1.csv`, `data/police_enforcement_2024_positive_drug_tests-1.csv`, `data/police_enforcement_data.json`, `data/processed_police_data.json`, `web/processed_police_data.json`, `web/australian-states.geojson`.
- Ensure governance notes: provenance, time span, coverage, assumptions, missingness, units, and transformations.

## Required Research (Design Book section)
Conduct a literature review (2016–present) with 5–7 academic/government sources (BITRE, CARRS-Q, MUARC, BOCSAR, peer-reviewed). Themes:
1) Crash risk correlation of methylamphetamine and cannabis (quantified crash odds).
2) Deterrence vs detection: does higher RDT volume reduce road trauma or just boost detections?
3) Impairment vs presence: limits of oral-fluid tests, especially with medicinal cannabis (Vic/NSW context).
For each source: APA7 citation, 2-sentence key finding, 1-sentence relevance to drug types or jurisdictional trends.

## Analysis & Data Processing
- In KNIME: import raw CSV/JSON, clean, normalise drug type and jurisdiction labels, handle missing values, derive rates (positives per 1k tests, fines per 1k population where applicable), aggregate by year/state/drug, and export processed JSON/CSV for the website.
- Document governance decisions and validation checks (sum/consistency scripts exist in `scripts/check_sums.py`, `scripts/check_granularity.py`).
- Include exploratory data analysis: summary stats, small multiples, correlations; capture as figures/screens for Design Book.

## Visualisation & Website (D3, `web/`)
- Use D3 for all charts (no charting libs). Implement non-standard/advanced visuals where meaningful (e.g., layered choropleth + small multiples, ridgelines, slopegraphs, beeswarms). Provide rich annotations.
- Required interactions: tooltips, filtering (state, year, drug type), highlighting, brushing/zoom where useful. Ensure responsiveness and good performance on large datasets.
- Storytelling: guide users through context, insight, and conclusion; include navigation and explanatory text. Consider the “deterrence gap” and impairment/presence tension as narrative hooks.
- Accessibility: alt text, keyboard focus order, colour-blind-safe palette, sufficient contrast.

## Design Book Coverage
- Introduction & Purpose: audience, motivation, tasks, benefits; research-backed context.
- Data Processing & Governance: sources, cleaning, transformations, KNIME screenshots, quality checks.
- Exploratory Analysis: insights from EDA figures.
- Visualisation & Webpage Design: chart choices, wireframes/storyboards, colour/annotation rationale.
- Interactivity: what/why/how it aids understanding.
- Iteration & Validation: usability testing, feedback loops, accessibility checks, improvements.
- Implementation: coding practices, performance considerations, D3 architecture, data joins.
- Storytelling: narrative arc and main takeaways.
- Referencing: APA7 throughout; AI declaration detailing tool use.

## Marking Priorities (Rubric Highlights)
- Clarity of audience/purpose with research support.
- Thorough data governance and KNIME documentation.
- Effective EDA leading to insights.
- Well-justified visual choices, wireframes, and annotations; advanced/non-standard charts.
- Interactivity that genuinely improves understanding; responsiveness.
- Iterative validation and accessibility evidence.
- Clean, modular, efficient code; D3-only charts; performance.
- Strong storytelling; accurate APA7 referencing; explicit AI declaration.

## Process Expectations
- Maintain continuity with stand-up milestones; keep progress evidence.
- Post live site + GitHub links in submission comments.
- Avoid fabricated references; ensure Turnitin similarity below threshold.
- Acknowledge all AI assistance transparently.

Use this prompt to steer all workstreams: research, KNIME processing, design book writing, and D3 web implementation from zero to submission-ready.
