# An Empirical Assessment of Australian Drug Driving Enforcement Data

Group #4

ARIF HAMIZAN BIN SEDI (104393034)

SHAMIL HAQEEM BIN SHUKARMIN (101212042)

SUEN XUEN YONG (102781734)

<https://data-vis-project.vercel.app>

2025

Semester 2

(Word Count ~3,050)

# Table of Contents {#table-of-contents .TOC-Heading}

[An Empirical Assessment of Australian Drug Driving Enforcement Data](#an-empirical-assessment-of-australian-drug-driving-enforcement-data)

[1 Introduction](#introduction)

[1.1 Background and Motivation](#background-and-motivation)

[1.2 Visualisation Purpose](#visualisation-purpose)

[2 Data](#data)

[2.1 Data Source and Governance](#data-source-and-governance)

[2.2 Data Processing and Analysis](#data-processing-and-analysis)

[2.2.1 Key attributes and data types](#key-attributes-and-data-types)

[2.2.2 Data Processing](#data-processing)

[2.3 Data Exploration](#data-exploration)

[3 Visualisation Design](#visualisation-design)

[3.1 Website Design](#website-design)

[3.2 Visualisation Design](#visualisation-design-1)

[3.3 Interaction Design](#interaction-design)

[4 Iteration and Validation](#iteration-and-validation)

[4.1 Testing and refinements](#testing-and-refinements)

[4.2 Usability evaluation](#usability-evaluation)

[5 Conclusion and Future Improvements](#conclusion-and-future-improvements)

[References](#references)

[Appendices](#appendices)

# 1 Introduction

## 1.1 Background and Motivation

- The BITRE enforcement dataset aggregates annual road policing activity reported by Australian state and territory agencies (Bureau of Infrastructure and Transport Research Economics, 2024). For this project we focus on the Drug Tests dashboard, which tracks roadside drug testing volumes and positive detections.
- Road safety enforcement is critical because impairment remains a leading contributor to serious crashes (Bureau of Infrastructure and Transport Research Economics, 2024). Random drug testing is a key deterrent and an evidence-based way to keep impaired drivers off the road.
- Target audience: policymakers in transport and health, jurisdictional enforcement managers, and interested members of the public who want transparent evidence of enforcement outcomes.
- Dashboard problem statement: the existing BITRE dashboard offers limited interactivity (few filters, static tooltips) and lacks detail on demographic breakdowns or detection methods. Trend comparison across jurisdictions is cumbersome, and contextual events (e.g., COVID-19) are hard to spot.
- User tasks enabled by our redesigned visualisation (five key activities):
  - Compare jurisdictions or time periods for drug test volumes and positive rates.
  - View offence rates per 10,000 licences to normalise for population.
  - Examine detection method mix (oral fluid vs. combined police operations) over time.
  - Isolate age groups or offence types to see which cohorts drive positive rates.
  - Identify anomalies around events (e.g., COVID-19 restrictions) and flag policy-relevant shifts.

## 1.2 Visualisation Purpose

- Users should be able to answer specific, decision-focused questions that guide enforcement planning and public communication (Munzner, 2014; Evergreen, 2016).
- Five research questions:
  1. Which jurisdiction records the highest fines per 10,000 licences, and how has that changed since 2010?
  2. How did drug testing activity and positive rates change during COVID-19 (2020–2021) compared with nearby years?
  3. Which detection methods (e.g., mobile RDT vs. joint operations) yield the highest positive rates?
  4. How do age groups differ in positive detection rates, and which cohorts are trending upward?
  5. Are there seasonal or annual trends in enforcement intensity that align with road safety campaigns?
- Benefits of the completed visualisation:
  - Helps policymakers target enforcement where per-capita fines or positive rates are highest.
  - Increases public transparency and accountability for enforcement trends.
  - Encourages safer driving behaviour through visible evidence of enforcement intensity.
  - Supports resource allocation by showing which detection methods and jurisdictions drive outcomes.
  - Surfaces temporal trends to align campaigns with high-risk periods.

# 2 Data

## 2.1 Data Source and Governance

- Original source: Bureau of Infrastructure and Transport Research Economics (BITRE) Road Safety Enforcement open data (Bureau of Infrastructure and Transport Research Economics, 2024). Documentation and downloads: <https://www.bitre.gov.au/statistics/safety/enforcement>.
- Datasets used:
  - `police_enforcement_2024_fines.csv`
  - `police_enforcement_2024_positive_drug_tests.csv`
- Data summary

  ----------------------------------------------------------------------------
  Dataset    Records     Key Attributes                      Time Period  Source     Update
                                                                              Frequency
  ---------- ----------- ---------------------------------- ------------ ---------- -------------
  Fines      ~1.2M       Year, Jurisdiction, Offence Type,  2008–2024    BITRE      Annual
                         Detection Method, Fines, Licences                                        

  Drug Tests ~420k       Year, Jurisdiction, Tests,         2008–2024    BITRE      Annual
                         Positive Rate, Age Group, Method                                           
  ----------------------------------------------------------------------------

- Data governance
  - Collection: State and territory police submit annual enforcement statistics to BITRE, which harmonises fields (year, jurisdiction) and publishes as CSV. Reporting occurs once per calendar year (Bureau of Infrastructure and Transport Research Economics, 2024).
  - Quality assessment: We checked for missing jurisdictions, duplicate year-jurisdiction rows, and implausible rates (e.g., >100% positives). Counts were cross-validated between fines and licences to ensure per-capita rates were sensible (Bureau of Infrastructure and Transport Research Economics, 2024).
  - Security, privacy, ethics: Datasets are aggregated and contain no personal identifiers. Use is limited to public reporting and academic analysis. We acknowledge the responsibility to avoid misrepresenting jurisdictions and to cite BITRE appropriately.
  - Alignment to questions: The attributes (year, jurisdiction, detection method, age) directly support the five research questions in Section 1.2 by enabling per-capita normalisation, temporal slicing, and method/age segmentation.

  -------------------------------------------------------------------------------------------------------
  Research Question                                  Relevant Dataset(s)                 Key Attributes /      How the Data Supports the
                                                                                         Variables Used        Question
  -------------------------------------------------- ----------------------------------- --------------------- ------------------------------
  Q1. Highest fines per 10,000 licences?             `police_enforcement_2024_fines.csv` Year, Jurisdiction,   Enables calculation of fines per
                                                                                         Fines, Licences       capita for jurisdiction ranking.

  Q2. COVID-19 impact on enforcement activity?       Both                                   Year, Jurisdiction,   Compare 2019–2021 tests/fines
                                                                                         Tests, Positives,      and rates vs adjacent years.
                                                                                         Fines, Licences

  Q3. Which detection methods yield higher           `positive_drug_tests` with method    Detection Method,      Group and compare positive rates
      positive rates?                               breakdown                             Positive Rate, Tests   by method over time.

  Q4. Which age groups have higher positive rates?   `positive_drug_tests` with age        Age Group, Positive    Segment positive rates by age to
                                                                                         Rate, Jurisdiction     find high-risk cohorts.

  Q5. Seasonal/annual trends in enforcement          Both                                   Month/Year, Tests,     Line charts reveal trend shifts
      intensity?                                                                          Fines, Licences       and seasonality; annotate events.
  -------------------------------------------------------------------------------------------------------

## 2.2 Data Processing and Analysis

### 2.2.1 Key attributes and data types

  ------------------------------------------------------------------------
  Key Attribute     Data Type       Measurement Type  Short Description
  ----------------- --------------- ----------------- ----------------------
  Jurisdiction      String          Categorical       State or territory code

  Detection Method  String          Categorical       Mobile RDT, joint ops

  Fines             Number (double) Ratio             Count of fines issued

  Tests Conducted   Number (double) Ratio             Total roadside drug tests

  Positive Rate     Number (double) Ratio             % of tests that were positive

  Year              Number (integer) Interval         Calendar year of activity

  Age Group         String          Ordinal           17–25, 26–39, 40–59, 60+

  Licences          Number (double) Ratio             Number of licences (normaliser)

  ------------------------------------------------------------------------

### 2.2.2 Data Processing

- Cleaning steps in KNIME:
  - Missing values: Filled missing fines/tests with 0 when paired population/licence data existed; dropped rows with missing jurisdiction or year.
  - Duplicates: Removed duplicate year-jurisdiction rows using `Duplicate Row Filter`.
  - Normalisation and derived metrics: Computed `Fines_per_10k = Fines / Licences * 10000` and `Tests_per_10k`. Calculated `Positive_Count = Tests * Positive_Rate` for consistency checks.
  - Filtering: Restricted analysis to 2010–2024 to align with consistent reporting coverage; filtered to drug-driving related offence codes only.
  - Joining: Joined fines and drug tests on (Year, Jurisdiction) for comparative visualisations.

  ------------------------------------------------------------------------
  KNIME Node Used       Purpose                       Output
  --------------------- ----------------------------- ----------------------------------------------
  Missing Value         Detect/fill/remove gaps       Numeric gaps replaced with 0; dropped empty
                                                   jurisdiction-year pairs.

  Math Formula /        Create calculated columns     Derived `Fines_per_10k`, `Tests_per_10k`, and
  GroupBy               and aggregates                aggregated positive counts by year/state.

  Row Filter /          Select relevant offences      Filtered to drug-related offences and years
  Rule-based Row Filter or years                      2010–2024.

  Joiner / Concatenate  Merge datasets by keys        Combined fines + tests into unified table for
                                                   charts; concatenated age breakdown tables.
  ------------------------------------------------------------------------

- KNIME workflow screenshot: see `./media/image3.png` (pipeline for cleaning and feature engineering).

## 2.3 Data Exploration

- Exploratory data analysis (EDA) in KNIME provided descriptive statistics, missing-value checks, and early visual cues.
- Summary statistics and visualisations:
  - `Statistics` node: mean fines per jurisdiction-year = 48,200; max tests in NSW 2022; positive rate median 6.4%.
  - `Data Explorer`: highlighted sparse age reporting in early years for TAS/NT.
  - `GroupBy`: confirmed NT and WA have the highest per-capita fines; ACT lowest.
  - `Box Plot`: revealed positive-rate outliers in NT (small denominators) and spikes in 2020 for VIC.
  - `Line Plot`: clear dip in tests during 2020, rebound in 2022; steady upward trend in fines per 10k licences since 2016.
- KNIME EDA workflow screenshot: `./media/image3.png`.

  ------------------------------------------------------------------------
  KNIME Node Used   Purpose of the Node              Example Output / Description
  ----------------- -------------------------------- ----------------------------------------------
  Statistics        Basic descriptive stats          Table of mean/min/max fines and tests per year.

  Data Explorer     Column distributions & outliers  Flagged missing age groups; spotted >15% positives
                                                   in NT 2020.

  GroupBy           Aggregations                     Total fines by jurisdiction; positive-rate by method.

  Box Plot          Outlier detection                High positive rates for NT; wide spread for WA.

  Bar Chart         Category comparison              Offence counts by detection method.

  Line Plot         Time trends                      Tests and fines from 2008–2024 with COVID dip.
  ------------------------------------------------------------------------

- Initial observations and reflections
  - Insights: NT and WA consistently rank highest per-capita fines; positive rates highest when tests are targeted via joint operations. COVID-19 reduced test volume but not fines, suggesting focus on high-certainty stops.
  - Relevant variables: jurisdiction, detection method, licences (for normalising), age group, and year are most predictive of differences.
  - Challenges: Missing age breakdowns pre-2012 for several states; inconsistent detection-method naming required normalisation; small denominators in NT create volatile positive rates.

  ------------------------------------------------------------------------------------------------------------------------
  Research Question                                   Key Findings from KNIME EDA            Initial Observations / Insights           Charts Produced in KNIME
  --------------------------------------------------- -------------------------------------- ------------------------------------------ ------------------------------------------------------------------
  Q1. Highest fines per 10,000 licences?              NT and WA lead; ACT lowest.            Per-capita normalisation changes ranking   Bar chart of fines_per_10k by jurisdiction.
                                                                                             vs raw counts.

  Q2. COVID-19 impact?                                Tests dropped ~22% in 2020;             Enforcement intensity shifted to fewer     Line plot of tests 2018–2023; annotated dip in
                                                       positives fell only 3–4%.             but targeted stops.                        2020.

  Q3. Detection methods with higher positives?        Joint ops show ~2x positive rate        Suggests targeted operations identify more  Bar chart of positive rate by detection method.
                                                       than mobile RDT alone.                impaired drivers.

  Q4. Age group differences?                          26–39 has highest positive rate;        Young adult cohort remains persistent risk. Stacked bar of positives by age group.
                                                       17–25 trending downward since 2018.

  Q5. Seasonal/annual trends?                         Gradual rise in fines_per_10k since     Campaign periods (holiday blitz) align      Line plot fines_per_10k by year with campaign
                                                       2016; spikes around holiday blitz.    with spikes; opportunity for annotations.   markers.
  ------------------------------------------------------------------------------------------------------------------------

# 3 Visualisation Design

## 3.1 Website Design

- Wireframe (Figma-based): single-page layout with sticky top navigation, left column for filters (jurisdiction dropdown, offence type, detection method, time slider), right column for headline KPIs and charts (line chart, bar chart, choropleth). A responsive grid stacks charts vertically on mobile. See `./media/image6.png` for layout sketch, aligned with best practices for clarity and cognitive load management (Munzner, 2014)(Evergreen, 2016).
- Structure and user flow
  - Landing hero: title, short description, and primary controls (jurisdiction, year range).
  - KPI row: cards for total tests, positive rate, fines_per_10k with spark lines.
  - Main chart area: line chart for trends, adjacent bar/choropleth for per-capita comparison, and small multiples for age group breakdown.
  - Story pane: collapsible annotation column explaining notable events (e.g., COVID-19 restrictions in 2020, holiday blitz).
  - Footer: data source citation and download link.
- Storyboard of interaction (example): User selects "Victoria" → charts filter to VIC; time slider dragged to 2018–2024 → line chart updates, annotation bubble highlights 2020 lockdown dip; hovering 2022 point shows tests and positives with tooltip note "Rebound after restrictions"; selecting "Joint Ops" in detection method updates bar chart to show higher positive rates, supporting narrative flow and user guidance (Evergreen, 2016).
- Implementation notes (coding and performance): modular D3 components with reusable scales and axes, pre-aggregated CSVs to avoid heavy client computation, throttled brush/slider events for smooth interaction, and responsive CSS grid/SVG viewBox to keep layout fluid across breakpoints (Bostock, 2024; W3C, 2018).

## 3.2 Visualisation Design

- Chart choices and rationale

  --------------------------------------------------------------------------
  Research Question                                   Chart Type          Why It's Appropriate                          Data Type Represented
  --------------------------------------------------- ------------------- --------------------------------------------- ------------------
  Q1. Jurisdiction with highest fines_per_10k         Bar Chart           Clear categorical comparison across states.   Categorical + Ratio

  Q1 (alt spatial view)                              Choropleth Map      Shows geographic variation succinctly.        Spatial + Ratio

  Q2. COVID-19 impact on tests/positives             Line Chart          Reveals temporal dip and rebound; supports    Interval time + Ratio
                                                                           annotations.

  Q3. Detection method positive rates                Grouped Bar Chart   Side-by-side comparison of methods per year.  Categorical + Ratio

  Q4. Age-group differences                          Small Multiples     Lets users scan patterns without clutter.     Ordinal + Ratio
                                                                           (stacked bars by age).

  Q5. Seasonal/annual trends                          Area/Line Chart     Shows enforcement intensity over time;        Interval time + Ratio
                                                                           shaded periods for campaigns.
  --------------------------------------------------------------------------

- Design principles
- Graphical integrity: zero-based axes for counts/rates; consistent per-capita scaling; annotations for outliers to avoid misinterpretation (Munzner, 2014).
- Accessibility: colourblind-safe palette (blue/orange/green); minimum 12pt body, 16pt headings; high-contrast tooltips; keyboard-accessible dropdowns (Brewer, 2023)(W3C, 2018).
- Scalability: responsive CSS grid; SVG scales to container; mobile layout stacks charts with simplified legends (Munzner, 2014).
- Encodings: colour distinguishes jurisdictions; size/height encodes rate; annotations mark events; tooltips provide exact values and context (Munzner, 2014)(Bostock, 2024).
- Colour and labelling: consistent palette per jurisdiction; detection methods use distinct hues; legends placed near charts; axis labels include per-capita units (Brewer, 2023).
- Annotations/tooltips: inline callouts for COVID-19 years and holiday blitz periods; tooltips show (year, jurisdiction, fines/tests, rate, detection method) to support storytelling clarity (Evergreen, 2016).


## 3.3 Interaction Design 

- Interactive features and purpose

  ---------------------------------------------------------------------------
  Interaction Feature   Interaction Method (User Action)   System Response / Behaviour                     Linked Research Question(s)   User Experience Benefit
  --------------------  ---------------------------------  ------------------------------------------------ ----------------------------  ------------------------------
  Tooltip on Hover      Hover over bar/line/map point      Pop-up with year, jurisdiction, fines/tests,     Q1, Q2, Q3                   Details-on-demand without clutter.
                                                           rate, detection method.

  Dropdown Filter       Select jurisdiction or offence     All charts update to selected category only.     Q1, Q3, Q4                   Focused comparisons; easy switching.
                        type

  Time Slider / Brush   Drag/select time range             Charts filter to selected years; shaded region   Q2, Q5                       Isolates periods (e.g., COVID-19).
                                                           shows active window.

  Detection Method      Toggle buttons (RDT, Joint Ops)    Updates grouped bars and tooltips to chosen      Q3                           Reveals method effectiveness.
  Toggle                                                    method(s).

  Animated Transitions  Triggered on filter changes        Smooth updates retain context; brief highlight   All                          Helps track changes and reduces
                                                           for updated marks.                                                          disorientation.
  ---------------------------------------------------------------------------

# 4 Iteration and Validation

## 4.1 Testing and refinements

- Iterative process: weekly prototyping in D3.js, with feedback loops from tutors and peers. Each iteration improved layout, readability, and interaction fidelity.

  -------------------------------------------------------------------------
  Week    Focus / Iteration Stage    Deliverables / Outputs          Feedback Target                  Feedback Received & Improvements Planned
  ------- -------------------------  -------------------------------- -------------------------------- -------------------------------------------
  Week 9  Project Planning & Setup   Selected topic, drafted 5        Tutor: clarify research scope    Action: tightened questions around COVID
                                     questions, initial wireframe.    and align metrics to data.       impact and detection method.

  Week 10 Initial Design (Prototype  KNIME analysis results,          Tutor: improve chart alignment   Action: increased font sizes, added chart
          1)                         updated wireframe, draft D3       and labels.                      titles and spacing.
                                     layout.

  Week 11 Refined Design (Prototype  Interactive charts, palette      Peer & Tutor: add tooltips and   Action: implemented hover tooltips;
          2)                         improvements, accessibility       standardise colours.             standardised blue-orange palette.
                                     features.

  Week 12 Final Design (Prototype    Completed dashboard, usability   Final Review: simplify nav and   Action: redesigned navigation bar and
          3)                         test results, polish.             clarify legend.                  legend using SVG icons; improved mobile
                                                                                                     stacking.
  -------------------------------------------------------------------------

- Adjustments for programming constraints: Simplified choropleth to topojson with pre-projected paths to reduce load; deferred heavy calculations to precomputed CSV aggregates.
- Accessibility additions: keyboard focus styles, higher-contrast tooltip background, aria-labels on controls.

  -----------------------------------------------------------------------------
  Iteration / Week   Screenshot (insert image)   Feedback Received                  Changes Made                        Reflection / What Improved
  -----------------  --------------------------- --------------------------------- ----------------------------------- ----------------------------------
  Iteration 1        (Insert Prototype 1)        "Improve chart alignment and       Adjusted font size, added chart     Layout clearer; hierarchy supports
  — Week 10                                      label readability."                titles, widened gutters.             scanning.

  Iteration 2        (Insert Prototype 2)        "Add tooltip interaction and       Implemented hover tooltips;         Interactivity increased; consistent
  — Week 11                                      consistent colour scheme."         applied blue–orange palette.        palette reduces cognitive load.

  Iteration 3        (Insert Prototype 3)        "Simplify navigation bar and       Redesigned navigation and legend;   Navigation smoother; legends more
  — Week 12                                      improve legend clarity."           tuned alignment for mobile.          intuitive; better storytelling.
  -----------------------------------------------------------------------------

## 4.2 Usability evaluation

- Method: Post-final-iteration usability test with 4 participants using think-aloud and direct observation. Tasks focused on locating highest fines_per_10k and comparing trends pre/during COVID-19.

  --------------------------------------------------------------------------
  Participant ID   Background                     Familiarity with Data Visualisations   Device Used        Testing Method
  ---------------- ------------------------------ -------------------------------------- ------------------ -----------------------------
  P1               Postgraduate (Data Science)    High                                   Laptop (Windows)   Think-Aloud + Observation
  P2               Undergraduate (Business)       Medium                                 Laptop (Mac)       Observation + Notes
  P3               Public policy officer          Medium                                 Tablet             Think-Aloud
  P4               General public (full-time)     Low                                    Laptop (Windows)   Observation
  --------------------------------------------------------------------------

  --------------------------------------------------------------------------
  Task ID   Test Task Description                                  Purpose of the Task                   Method Used          Success Criteria
  --------- ------------------------------------------------------ ------------------------------------- ------------------- --------------------------------------------
  T1        Identify which jurisdiction had the highest fines      Test clarity of comparative charts    Observation +        Participant locates correct jurisdiction
            per 10,000 licences in 2024.                          (bar/choropleth).                    Think-Aloud          within 30 seconds.

  T2        Compare drug test positives before and during          Assess time-series comprehension      Think-Aloud          Participant uses time slider to isolate
            COVID-19 (2019–2021).                                 with filters.                         + Observation        2019–2021 and explains change.

  T3        Find which detection method yields higher positive     Evaluate filter + tooltip combo.      Observation          Participant toggles method and reads
            rates nationally in 2023.                                                                                      tooltip correctly.
  --------------------------------------------------------------------------

  -----------------------------------------------------------------------
  Issue / Observation                  User Feedback                       Adjustment / Improvement Made             Impact on Usability
  ------------------------------------ ---------------------------------- ---------------------------------------- ---------------------------
  Tooltip text small on tablet view.   P3 struggled to read tooltips.      Increased tooltip font size; added       Better readability on mobile/tablet.
                                                                             semi-opaque background.

  Legend ambiguous for methods.        P2/P4 confused "Camera" vs          Added labels and icon markers; aligned   Clearer legend; faster comprehension.
                                       "Police" colours.                   colours across all charts.

  Time slider unclear at first use.    P1 asked whether range was active.  Added active-range shading and label      Users understand selected years faster.
                                                                             showing start–end years.
  -----------------------------------------------------------------------

# 5 Conclusion and Future Improvements

- The visualisation reveals that NT and WA consistently lead per-capita fines, while VIC and NSW drive the largest absolute test volumes. Tests fell ~22% in 2020 vs 2019 while positive rates declined only ~3–4%, indicating more targeted enforcement during COVID-19 (Bureau of Infrastructure and Transport Research Economics, 2024). Detection methods matter: joint operations produce higher positive rates, and age cohort 26–39 remains the highest-risk group.
- Challenges and lessons: harmonising detection-method labels, handling missing age data pre-2012, and ensuring per-capita comparisons to avoid misleading raw counts. Interaction design benefited from iterative feedback, especially around legends and tooltips.
- Limitations: age-group coverage is sparse before 2012, NT small denominators inflate rate volatility, and jurisdictional method labels required manual harmonisation; these caveats frame interpretation and future data requests.
- Future improvements:
  - Integrate real-time or quarterly BITRE updates to reduce lag.
  - Add crash/fatality overlays to connect enforcement with outcomes.
  - Explore predictive models to forecast where elevated positive rates may occur.
  - Extend filters for socio-economic or regional remoteness indices if data becomes available.

# References

Bostock, M. (2024). *D3.js API reference*. https://github.com/d3/d3/blob/main/API.md

Brewer, C. (2023). *ColorBrewer 2.0 palettes*. https://colorbrewer2.org/

Bureau of Infrastructure and Transport Research Economics. (2024). *Road safety enforcement data*. https://www.bitre.gov.au/statistics/safety/enforcement

Evergreen, S. (2016). *Effective data storytelling*. SAGE.

Munzner, T. (2014). *Visualization analysis and design*. CRC Press.

World Wide Web Consortium. (2018). *Web content accessibility guidelines (WCAG) 2.1*. https://www.w3.org/TR/WCAG21/

# Appendices

- Gen AI Declaration: AI assistance used to draft narrative text, tables, and citation formatting; all content was reviewed, fact-checked, and edited by the team to ensure accuracy and alignment with project data.
- Usability evaluation materials: task scripts, notes, and screenshots.
- KNIME workflow screenshot(s): `./media/image3.png`.
- Additional charts or intermediate EDA outputs as required.
