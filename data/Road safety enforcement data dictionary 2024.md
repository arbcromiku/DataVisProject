# Police Enforcement Data Dictionary 2024

[cite\_start]**Australian Government** [cite: 1]
[cite\_start]**Department of Infrastructure, Transport, Regional Development, Communications and the Arts** [cite: 2]

[cite\_start]**Release date:** 27/05/2025 [cite: 32]

-----

## About the Data

[cite\_start]The department works with the following agencies from each state and territory to report on police enforcement[cite: 5]:

  * [cite\_start]NSW Police Force and NSW Revenue [cite: 6]
  * [cite\_start]Victoria Police [cite: 7]
  * [cite\_start]Queensland Police Service and Department of Transport and Main Roads [cite: 8]
  * [cite\_start]South Australia Police Force [cite: 9]
  * [cite\_start]Western Australia Police Force [cite: 10]
  * [cite\_start]Tasmania Police Force [cite: 11]
  * [cite\_start]North Territory Police Force [cite: 12]
  * [cite\_start]Australian Federal Police and Access Canberra [cite: 13]

### Limitations

[cite\_start]There are a number of limitations that exist in the data[cite: 14]:

1.  [cite\_start]**Partial Data Collection:** Some police agencies only collect a part of police enforcement data[cite: 15]. [cite\_start]Some states collect both police and camera-issued fines, but some may have different government agencies collecting camera-issued fines[cite: 16]. [cite\_start]For example, Access Canberra collects data on seatbelt fines detected by camera instead of ACT Police[cite: 17].
2.  [cite\_start]**Public Availability:** Not all states and territories who own police enforcement data have their data publicly available[cite: 18]. [cite\_start]Some states share their police enforcement data publicly, while others do not, which makes it difficult to get a complete and accurate picture of national police enforcement[cite: 19]. [cite\_start]For example, NSW Police collects police-issued fines, but camera fines are publicly available and collected by NSW Revenue[cite: 20].

### 2023 Data Structure Changes

[cite\_start]Since the collection of 2023 data, the data structure has changed to allow for more detailed information[cite: 21]. [cite\_start]The following data was new for 2023[cite: 22]:

  * [cite\_start]Monthly granularity, where available [cite: 23]
  * [cite\_start]Age groups, where available [cite: 24]
  * [cite\_start]Remoteness area, where available [cite: 25]
  * [cite\_start]Details on detection method used, where available [cite: 26]
  * [cite\_start]Details on drug type for positive drug tests [cite: 27]
  * [cite\_start]Unlicensed driving [cite: 28]
  * [cite\_start]Number of charges and arrests [cite: 29]

[cite\_start]**Note:** Data is subject to revision[cite: 30].

-----

## Category and Measure Definitions

| Field | Type | Definition |
| :--- | :--- | :--- |
| **Start date and end date** | Category | [cite\_start]Period of the offence or when legal action was taken in format YYYY-MM-DD. [cite: 35] |
| **Location** | Category | [cite\_start]Remoteness area of the incident or the issuing officer's station depending on the reporting state or territory, if available. [cite: 35] |
| **Detection Method** | Category | [cite\_start]Collection method of the metric. [cite: 35] |
| **Jurisdiction** | Category | [cite\_start]State or territory. [cite: 35] |
| **Age group** | Category | Age of the vehicle operator at the time of offence. For charges, age is calculated at the time the brief was created. For breath and drug tests, age is calculated at the time the test was administered. [cite\_start]Age groups are categorised in life stages. [cite: 35] |
| **Fines** | Measure | Includes legal actions involving an infringement notice. [cite\_start]Blanks mean the measure does not apply to the state or territory. [cite: 35] |
| **Arrests** | Measure | Total offences where an arrest took place as a result. Generally, not applicable for New South Wales and Tasmania. [cite\_start]Blanks mean the measure does not apply to the state or territory. [cite: 35] |
| **Charges** | Measure | Total of charged offences, including legal actions involving a Court Attendance Notice. [cite\_start]Blanks mean the measure does not apply to the state or territory. [cite: 35] |

-----

## Metric Definitions

| Field | Definition | Notes |
| :--- | :--- | :--- |
| **Breath tests conducted** | [cite\_start]Number of random roadside breath tests conducted by testing a sample of a person's breath to determine whether or not a person's blood alcohol content is at least above a predetermined level. [cite: 37] | [cite\_start]**Western Australia:** In response to the COVID-19 pandemic, the WA Police Force suspended Random Breath Testing policy on 17 March 2020. [cite: 37] [cite\_start]As a result, mass breath testing operations including the RTTA funded Operation Perception ceased, and 'business as usual' tests changed to a targeted model based on driver behaviour, observations and officer safety. [cite: 37] [cite\_start]The policy recommenced from 06 June 2020 at a reduced rate with additional protective measures in place for officers. [cite: 37] [cite\_start]This has contributed to a lower than usual number of random breath tests in 2020 and 2021. [cite: 37] |
| **Breath tests positive** | [cite\_start]Number of roadside breath tests where the driver's blood alcohol was above the legal limit for their licence type. [cite: 37] | **Australian Capital Territory:** Fines data is not recorded by ACT Police. [cite\_start]Charges data was used as proxy for count. [cite: 37][cite\_start]<br>**New South Wales:** Section 6 includes Law Part Codes in the COMPASS Offence Category 'PCA/DUI Offences'. [cite: 37][cite\_start]<br>**Victoria:** Fines, arrests and charges data cannot be provided since the database only provides detection data. [cite: 37]<br>**Queensland:** Fines data is not recorded. [cite\_start]Charges data was used as a proxy for count. [cite: 37][cite\_start]<br>**Tasmania:** 2020 to 2022 Tasmanian data is unavailable due to significant data quality issues. [cite: 37]<br>**Missing data:** Not all states and territories could provide counts, fines, arrests and charges. To ensure a measure could be consistently used for reporting, a proxy for count was created using the sum of fines and charges where count data was missing. [cite\_start]This applied to New South Wales, South Australia and Western Australia for 2023. [cite: 37, 41] |
| **Drug tests conducted** | Number of roadside drug tests conducted. It is an oral fluid sample indicating whether an illicit substance is present in a driver's oral fluid. [cite\_start]The data are not necessarily restricted to random roadside tests. [cite: 41] | [cite\_start]**Missing data:** Data prior to 2021, 2023 and 2024 Northern Territory data are unavailable due to significant data quality issues. [cite: 41] |
| **Drug tests positive** | [cite\_start]Number of roadside drug test results where the oral fluid sample indicates an illicit substance is present in a driver's oral fluid. [cite: 41] | [cite\_start]**Usage:** To ensure accurate counts of positive drug tests, filter for `BEST_DETECTION_METHOD = 'Yes'`. [cite: 41] [cite\_start]It is not appropriate to sum Fines and Charges from all stages as a single incident can undergo 3 stages of drug testing. [cite: 41]<br>**Stages:** The 3 stages of drug testing are: roadside (indicator or Stage 1), secondary confirmatory (Stage 2) and laboratory adjusted results (Stage 3). [cite\_start]From 2023, positive drug test results from each stage was requested, but not all states and territories could provide data for all three stages. [cite: 41]<br>**Victoria:** Fines, arrests and charges data cannot be provided since the database only provides detection data. The Road Policing Drug and Alcohol Unit is only able to provide detection data to the 3 substances (MDMA, Amphetamine, THC) tested roadside. [cite\_start]Drugs other than the 3 substances is detected through collision bloods, which is not included as part of the data provision. [cite: 41][cite\_start]<br>**Missing data:** To ensure a measure could be consistently used for reporting, a proxy for count was created from the sum of fines and charges where count data was missing. [cite: 41] [cite\_start]Since September 2024, secondary confirmatory tests for New South Wales have been discontinued. [cite: 41] |
| **Mobile phone non-compliance fines** | [cite\_start]Number of fines issued for using a mobile phone and/or portable devices while driving. [cite: 41] | [cite\_start]**Tasmania:** Mobile speed cameras were enhanced to detect seatbelt and mobile phone offences from August 2023. [cite: 41][cite\_start]<br>**Missing data:** 2024 Victorian data volumes were low because of Protected Industrial Action (PIA). [cite: 41] |
| **Non-wearing seatbelt fines** | [cite\_start]Number of fines issued for non-wearing of seatbelts and unrestrained passenger offences. [cite: 41] | [cite\_start]**Tasmania:** Mobile speed cameras were enhanced to detect seatbelt and mobile phone offences from August 2023. [cite: 41][cite\_start]<br>**Missing data:** 2024 Victorian data volumes were low because of Protected Industrial Action (PIA). [cite: 41] |
| **Speeding fines** | Speeding fines capture the offending vehicles that are speeding over the legal speed limit. [cite\_start]The department collects both camera-issued and police-issued fines, with police-issued fines collected from 2017. [cite: 41] | [cite\_start]**New South Wales:** Up to 2019, speed camera fines issued include only fixed and mobile cameras and excludes fines issued by red light or speed cameras identified as red-light camera offences. [cite: 41] [cite\_start]On 1 July 2009, speed bands for exceeding the speed limit by up to 30 km/h were changed. [cite: 41] [cite\_start]As at 1 June 2023, the speed bands are: 'exceed speed 10 km/h or under', 'exceed speed over 10 km/h', 'exceed speed over 20 km/h'. [cite: 41] [cite\_start]Camera-issued fines are detected by RMS Static Speed Cameras, RMS Red Light Cameras, RMS Mobile Speed Cameras and RMS Combined Cameras. [cite: 41]<br>**Queensland:** Detections from cameras are assessed by an accredited Traffic Camera Office staff member to ensure that there is enough evidence to issue an infringement notice. Therefore, not all detections from road safety cameras result in an infringement notice. [cite\_start]Figures are reported from mobile speed cameras (overt, covert and portable), analogue fixed speed cameras, digital fixed speed cameras, digital combined speed/red light cameras. [cite: 41, 45]<br>**Tasmania:** In 2012, civilian speed camera operators were not used. [cite\_start]Additionally, aged equipment and software issues has impacted on the number of speed camera detections. [cite: 45][cite\_start]<br>**Western Australia:** Detection modes include On-The-Spot (OTS), mobile camera, fixed camera, average speed camera and red-light camera. [cite: 45]<br>**Missing data:** 2022 Australian Capital Territory data is not available. [cite\_start]2024 Victorian data volumes were low because of Protected Industrial Action (PIA). [cite: 45] |
| **Unlicensed driving** | Number of fines issued for not having a valid license while driving. [cite\_start]This is a new field collected for data reported from 2023. [cite: 45] | [cite\_start]**Queensland:** Fines reported for Queensland include both arrests and charges, as these cannot be separated. [cite: 45][cite\_start]<br>**Missing data:** 2024 Victorian data volumes were low because of Protected Industrial Action (PIA). [cite: 45] |