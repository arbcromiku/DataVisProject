# PRD – Design Book & Report Submission (per rubric)

## Purpose
Produce a Design Book PDF (with supporting KNIME workflows) that demonstrates end-to-end data governance, analysis, design rationale, interactivity planning, and implementation for the Roadside Drug Testing dashboard. This PRD targets the assessment rubric (56 pts) and course prompt.

## Deliverables
- Design Book PDF following course template and rubric.
- KNIME workflows (`.knwf`, team-named) with embedded data; one annotated workflow per chart/output used in the book and website (trend, jurisdiction bars, age distribution, drug composition/stacked area, jurisdiction × drug heatmap, map bubbles, creative chart), plus pipeline for processed JSON/CSV.
- Captured figures: EDA charts, wireframes/storyboards, chart snapshots with annotations, KNIME screenshots, accessibility/validation evidence.
- Links (in submission comment): live Vercel site (D3-only charts) and GitHub repo.
- APA7 reference list and explicit AI declaration.

## Scope
- **In**: BITRE roadside drug testing positives (2008–2024), processed_police_data.json, police_enforcement CSVs; evidence review (2016–present) with 5–7 sources; governance notes; rubric-aligned sections (Intro/Purpose, Data Processing & Governance, EDA, Visualisation & Webpage Design, Interactivity, Iteration & Validation, Implementation, Storytelling, Referencing, AI Declaration).
- **Out**: New data collection; real-time ingestion; non-D3 visualisations on the website.

## Rubric Mapping (must cover)
- **Introduction & Purpose (4 pts)**: audience, motivation, user tasks/benefits, research-backed context.
- **Data Processing & Governance (5 pts)**: sources, governance, quality checks, transformations; KNIME workflows documented/screenshotted; processed outputs saved.
- **Exploratory Data Analysis (4 pts)**: summary stats and insights; EDA figures included.
- **Visualisation & Webpage Design (10 pts)**: chart choices with justification; colour/labels/annotations; wireframes and storyboards.
- **Interactivity (4 pts)**: what/why/how interactions improve understanding; link to website plan.
- **Iteration & Validation (5 pts)**: usability tests/feedback, accessibility checks, improvements recorded.
- **Implementation 1: Coding Practice (5 pts)**: D3 architecture, modularity, performance notes.
- **Implementation 2: Complexity (5 pts)**: advanced/non-standard visuals, rich annotations, multi-dataset joins.
- **Implementation 3: Interactivity & Responsive (5 pts)**: variety of interactions, responsive behavior, smoothness.
- **Implementation 4: Storytelling (5 pts)**: clear narrative arc, guided insights.
- **Referencing (2 pts)**: APA7, accurate, non-fabricated.
- **AI Declaration (2 pts)**: transparent disclosure of AI use.

## Data & Processing Requirements
- Document provenance, time span, coverage, assumptions, missingness, units, transformations.
- KNIME: import raw CSV/JSON; clean labels; handle missing; derive rates (positives/tests, fines per population if available); aggregate by year/state/drug/age/location; export processed JSON/CSV for charts.
- Quality checks: duplicate keys, domain validation (Yes/No/Not applicable), numeric coercion, year-span checks, remoteness coverage (detailed 2023–2024), checksum for raw extracts.
- Store KNIME nodes with annotations; save outputs per chart in version control.

## Content Outline (Design Book)
1) Introduction & Purpose: audience, tasks, motivation, key questions.
2) Evidence Review (2016–present): crash risk (meth vs THC), deterrence vs detection, impairment vs presence/device limits; 5–7 sources with APA7 citations and takeaways.
3) Data Processing & Governance: sources, KNIME workflows (screenshots), field contracts, validation checks, processed outputs.
4) Exploratory Analysis: summary stats, pivots, small multiples; insights that motivate design choices.
5) Visualisation & Webpage Design: chart rationale per task; colour/annotation plan; wireframes/storyboards; accessibility choices.
6) Interactivity: filters, tooltips, cross-highlighting, brushing/zoom (if used); justification.
7) Iteration & Validation: usability sessions, feedback, accessibility audits, changes made.
8) Implementation (coding practice, performance, complexity, interactivity/responsive): D3 module structure, data joins, performance techniques, advanced/creative chart description.
9) Storytelling: narrative arc, key insights, how the site guides users.
10) Referencing & AI Declaration: APA7 list; explicit AI use statement.

## Acceptance Criteria
- Every chart in the website has a matching KNIME workflow/branch exporting its pre-aggregated table; outputs versioned and referenced in the book.
- Rubric criteria explicitly addressed in dedicated sections; figures and screenshots included.
- APA7 compliance; no fabricated references; AI declaration present.
- Links to Vercel site and GitHub provided in submission comment; design book cites them.

## Timeline (suggested)
- D0: Confirm data sources, governance notes, KNIME workflow list per chart.
- D1: Finalize KNIME outputs; capture screenshots; run quality checks.
- D2: Draft Design Book sections (intro, evidence, data, EDA, design, interactivity, implementation, storytelling); paste figures.
- D3: Validation/accessibility pass, APA7 review, AI declaration, assemble PDF, verify links.

## Risks & Mitigations
- Missing KNIME coverage per chart → create branch nodes per visual and export tables; document locations.
- Fabricated/incorrect references → keep source list with URLs/DOIs; cross-check citations.
- Accessibility gaps → run contrast/focus checks; document fixes.
- Performance concerns → pre-aggregate in KNIME; limit DOM churn in D3 (noted in implementation section).
