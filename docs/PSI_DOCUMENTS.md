# What NASA's reports, presentations and sensor logs add (workstream A, 2026-11-14)

Beyond the 22 experiment tables, PSI holds reports, presentations, engineering documents and raw
sensor logs. We downloaded a chosen set and searched them. This file says what was checked, what was
found (with file and page), and what it means for the data.

**These findings are not in the app yet.** Adding them is a team decision (end of this file).

## What was checked

- `scripts/fetch_psi_docs.py` chose **122 files (544 MB)** by NASA's own folder labels: every report
  and science document for all 24 investigations; presentations for the solid, smoke, droplet and gas
  experiments; engineering documents for BASS, BASS-II and Saffire (no part drawings); every Saffire
  sensor log. Skipped: videos, zip archives, images, decks over 60 MB (SPICE's 14 presentations,
  about 950 MB), SAME-R's raw image slides, and about 6,300 small per-test raw files.
- **114 downloaded; 8 cannot be downloaded from anywhere NASA links to.** PSI hands out a link to an
  older storage area that answers "the specified key does not exist", and the record's alternative
  server (`psi.ndc.nasa.gov`) no longer exists. Missing: BASS Final Report, SPICE Final Report, the three
  Saffire ICES presentations (45th-47th), the Saffire offgassing strategy (twice) and one Saffire image
  grid document.
- `scripts/extract_docs.py` turned all 114 into text or spreadsheet summaries (about 820,000 words),
  kept in `data_extra/_text/` (not in git; re-create with the two scripts).
- They were searched for pressure, oxygen and sensors, not read page by page.

## Finding 1 - Saffire-I and Saffire-III measured cabin pressure and oxygen

NASA's sensor spreadsheets for each burn have an **"Ambient Pressure"** column whose unit row reads
**PSIA** (cell J2), charted as "Pressure (PSIA)", and an **"O2"** column charted as "Oxygen
Concentration (%)".

| Burn (table row) | Ambient pressure, PSIA (min-max over the log) | O2, % (min-max) | Source file |
|---|---|---|---|
| Saffire-I sample 1 (S1) | 14.82-14.90 | 22.21-22.72 | `PSI-98_Raw Data_Saffire-I Sample 1 Sensor Data Complete TM graphs.xlsx`, sheet "Anemometer Tach and Igniter" |
| Saffire-I sample 2 (S2) | 14.85-14.90 | 22.21-22.45 | `PSI-98_Raw Data_Saffire-I Sample 2 Sensor Data Complete TM graphs.xlsx` |
| Saffire-III sample 1 (S1) | 14.40-14.50 | 19.40-20.08 | `PSI-100_Raw Data_Saffire III Sample 1 Sensors.xlsx` |
| Saffire-III sample 2 (S2) | 14.40-14.44 | 19.69-20.13 | `PSI-100_Raw Data_Saffire III Sample 2 Sensors.xlsx` |

The Cygnus cabin sensor in the Saffire-I telemetry file ("PCM Press (psi)") reads 14.47-14.54 psi.

**Conflict:** NASA's Saffire-I summary table gives 21.5-21.7 % O2 (S1) and about 21.5 % (S2); its own
sensor log reads 22.2-22.7 %. Which one is right is not stated. SAFFIRE-II has no sensor files in PSI.

## Finding 2 - BASS-II pressure, for two of its six researchers' tests

From **NASA/TM-20210011385, BASS-II Summary Report** (`PSI-25_Reports_BASS-II Summary Report.pdf`,
145 pages; the same report NTRS refuses to serve, found inside PSI). The BASS-II table's "PI" column
ties these statements to exact rows:

| Researcher (PI column) | Tests | What the report says | Page |
|---|---|---|---|
| Bhattacharjee | 22 | "The total pressure is also monitored, which varied from 99.2 to 99.5 kPa in the tests reported." (about 14.39-14.43 psia) | p. 46 (chapter 2) |
| T'ien | 29 | "Ambient pressure was 1 atm." | p. 102 (chapter 7) |
| Ferkul, Miller, Olson, Fernandez-Pello | 78 | No pressure stated in their chapters | - |

Chapter 1 uses "pressure P = 1 atm" only as an input to a calculation (p. 19); that is not a
measurement. The report also says oxygen readings were calibrated against the ISS Major Constituents
Analyzer (p. 9).

## Finding 3 - BASS (the first experiment): no per-test pressure

The BASS Overview presentation (`PSI-26_Presentations_BASS_Overview of Recent ISS Results.pdf`) gives
"1 atm" with oxygen for a few burns shown as images (pp. 31, 51, 56, 60), but they cannot be matched to
table rows. The BASS requirements document says "Pressure: Shuttle ambient pressure" (p. 7), a
requirement, not a measurement. The BASS Final Report is one of the 8 broken files.

## Finding 4 - What each experiment measured

How often each measurement is mentioned in the downloaded documents (a keyword count, so a guide to
where to look, not a full list):

| Investigation | Thermo-couples | Radiometers | Pressure sensors | O2 analyzer | Anemometer / flow | Cameras / video | Spectral (PLIF, OH*, CH*) | Smoke / particles | Soot / pyrometry |
|---|---|---|---|---|---|---|---|---|---|
| ACME Flame Design | 89 | 58 | 9 | - | 43 | 381 | 98 | 1 | 144 |
| ACME s-Flame | 114 | 146 | 9 | - | 128 | 683 | 308 | 5 | 156 |
| ACME CFI-G | 31 | 38 | 1 | - | 15 | 175 | 19 | - | 30 |
| BASS-II | - | 53 | - | 62 | 5 | 213 | 16 | - | - |
| BASS | - | 11 | 2 | 8 | 4 | 240 | - | - | 19 |
| CFI | - | 68 | 1 | - | 1 | 98 | 23 | - | 7 |
| SAFFIRE-I / -III | 2 | 29 / 43 | (in sensor log) | (in sensor log) | 13 / 21 | 33 / 32 | - | - | - |
| SPICE | 1 | 6 | - | - | 26 | 122 | 15 | 2 | 9 |
| SAME / SAME-R | - | - | 2 | - | 5 / 6 | 33 / 21 | 7 | 349 / 273 | - |
| DAFT / DAFT-2 | - | - | - | - | - | 28 | 1 | 321 | - |

Saffire's sensor logs list the full set per burn: O2, CO2, two anemometers, ambient pressure, four
radiometers, an inlet temperature, six plume and six sample thermocouples, and humidity.

## Also found

- NASA's records list Saffire-I and Saffire-III as flown on the "International Space Station (ISS)",
  but their own text says the burns happened in Cygnus after it left the station (SAFFIRE-II's record
  says Cygnus). All are microgravity, so no count changes.

## Decision for the team

Findings 1 and 2 would give **55 solid tests** a sourced pressure (4 Saffire, 22 + 29 BASS-II), each
flagged with its source file and page, so solid materials appear on the map for the first time (near
station air, about 14.4-14.9 psia). The Saffire oxygen conflict would be flagged, not resolved. Not yet
done; see the conversation for the options.
