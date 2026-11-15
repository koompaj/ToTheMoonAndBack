# New data plan (workstream A, 2026-11-15, written 12:20 UTC+8)

What the overnight download and scan found, what is worth putting in the app before the deadline
(**Sunday 2026-11-15, 23:59 UTC+8**), and how. Everything here was read from `origin/main` at `c60fa16`
(raw scan, items 5-12 and BASS conditions all merged) and from `E:\Claude\NASA\data_extra\` (read-only).
Nothing in this file changes data or app files.

## State at the start

- **Download complete** (`data_extra/raw_manifest.json`): 7,828 downloaded this run, 1,744 already there,
  **44 failed**, all HTTP 404 on NASA's side: 32 CFI (PSI-39) Raw Data files (per-test settings and
  radiometer files), 4 SAME (PSI-102) Analyzed Data XML files (`16904___9.xml`, `16912___9.xml`,
  `16937___9.xml`, `16942___9.xml`), and the 8 known broken files (`docs/PSI_DOCUMENTS.md`). Excluded by
  plan: 1,629 videos and 5,109 raw image zips.
- **Already applied, not re-proposed:** BASS oxygen and pressure (121 tests; placed 775 -> 896; ISS / Earth
  171 -> 209; highest solid oxygen 22.7 %). Items 5, 8, 10 data (`sensors.json`, `gaps.json`, `shapes.json`).
- **`docs/ITEMS_5_12_STATUS.md` does not exist** on `origin/main` or `origin/data/items-5-12`. The items task
  recorded its results in `docs/PSI_DOCUMENTS.md` ("Done ... items 10, 5 and 8") and in `CLAUDE.md` instead,
  so nothing is lost, but there is no separate status report. Items 6, 7, 9, 11, 12 data were in the earlier
  contract work; whether each is shown on screen is C's (see Open items).
- **`summarize_raw.py` re-run:** another session started it at 12:14 (PID 23424). This plan did **not** start a
  second copy. At 12:17 it had rewritten PSI-10, -20 and -21; PSI-23, -39 and -159 (the bulk) were still to
  come. So the searches below read the downloaded files directly, with readers kept in the scratchpad.

## Spot-check of the scan's claims (10 checked: 10 confirmed, 0 wrong, 0 unclear)

`raw_candidates.json` holds 354 facts: 353 BASS entries (already applied after a 10-row hand check, see
`PSI_DOCUMENTS.md`) and 1 SPICE entry. So the 10 checked here are the scan's claims that are **not** yet
applied and that the plan depends on. Each was re-read from the cited file with a reader written for this
check (not `summarize_raw.py`), except no. 2, which used the repo's `scripts/read_xls.py`.

| # | Claim (`RAW_DATA_FINDINGS.md`) | File and place | Result |
|---|---|---|---|
| 1 | SPICE cabin O2 "maintained within 19 - 24%" (candidate `spice-cabin-o2-envelope`) | `PSI-107_Reports_SPICE_FinalReport.pdf`, pdftotext p. 19 | **confirmed** (dash unreadable in the text layer, as noted) |
| 2 | SPICE flight-data "Pressure (Pa)" is 101325 in every row (F3) | `PSI-107_Raw Data_Spice Flight Test Data II modified.xls`, sheet "Data record of Video and Stills", K3/K4, K5-K530 | **confirmed**: 526 cells, one value, 101325 |
| 3 | Smoke-point sheets' "Pressure (Pa)" is 101325 (F3) | `PSI-107_Raw Data_SmokePointReview-0g-3.xlsx`, sheets "Smoke Point Datasheet" and "(2)", column I | **confirmed**: 61 and 55 cells, all 101325, typed (no formula) |
| 4 | Saffire-III Cygnus EPS pressures 13.95-14.06 psi (F5) | `PSI-100_Raw Data_Saffire-III 1 Hz Telemetry Data.xlsx`, sheet "CygnusPressureData", D-F | **confirmed**: 13.953-14.059 psi; 1,005 / 1,013 / 1,009 non-zero of 11,449 rows |
| 5 | s-Flame: "A total of 276 flames were ignited" (F8) | `PSI-23_Engineering Documents_s-Flame_data_interpretation_20210920.pdf` p. 3 | **confirmed**; the same sentence is in the s-Flame final report (p. 59) and 30-day report (p. 3) |
| 6 | CFI: "Over two hundred tests were carried out" vs 87 table rows (F9) | `PSI-39_Reports_CFI Science Final Report.pdf` p. 6; `tests.json` | **confirmed** (87 CFI rows) |
| 7 | CFI Figure 1 "FLEX-1223: N-dodecane at 1.25 atm pressure in air" = table row 16 (F9) | same report p. 7; `tests.json` `PSI-39:cfi:16` | **confirmed**: row 16, 1.25 atm, O2 0.21 |
| 8 | FLEX-1268 caption, test not in the CFI table, 12 % below table's lowest 17 % (F9) | same report p. 8; `tests.json` | **confirmed** |
| 9 | Flame Design report "326 flames" vs table 327 rows (F10) | `PSI-10_Reports_FinalRpt_ACMEFlameDesign.pdf` p. 45; `tests.json` | **confirmed**: 327 rows (207 ambient, 120 burner-oxidizer) |
| 10 | CFI-G "280 hot flames" vs 263 "yes" (F10) | `PSI-159_Reports_FinalRpt_ACME.CFI-G.pdf` p. 38; `tests.json` | **confirmed**: 263 yes, 62 no, 8 flash |

Also re-found: the BASS-II ReadMe sentence on the O2 sensor offset (F2 / F6), word for word. Not checked here:
the Saffire-III accelerometer range (F5), which changes nothing in the data.

## What's new (found in this run, beyond `RAW_DATA_FINDINGS.md`)

### N1. CFI table has 8 exact repeat rows that are not flagged (bug in our counts)

- `data/tables/PSI-39/PSI-39_Experimental table_CFI.csv`: **rows 80-87 repeat rows 23-30 cell for cell**
  (tests 1285-1289 and 1295-1297, 22 and 28 June 2017, CIR f173e01 ... f179e05). Checked by comparing every
  cell. No other test table has repeats except SPICE's known 34.
- `build_web_data.py` only looks for repeats in SPICE (`spice()`, line ~438), so these 8 have **no
  `duplicate_row` flag**. Today's numbers therefore count them twice:
  - distinct tests: `data_quality.json` says **1,719**; it should be **1,711** (1,753 rows - 34 SPICE - 8 CFI);
  - placed tests: **896 rows, 888 distinct** (all 8 repeats have oxygen 0.17 and 1 atm, so they are placed);
  - place counts do **not** change: 17 % O2 is outside every place's box (ISS / Earth band is 19-23 %).
  - CFI: 87 rows, **79 distinct tests**.

### N2. CFI per-test "Test Sheets": ambient pressure and O2 for 23 CFI tests, 11 of them not in the table

- Files: `PSI-39_Raw Data_FLEX-<n>_TestSheet.txt` (22 files) and `.rtf` (22 files), section "AMBIENT
  ENVIRONMENT": "Pressure (atm) =", "O2 Mole Fraction =", N2, CO2, He mole fractions, temperature (K), plus
  fuel, D0 (mm), Dext (mm), fiber, CIR test number and NASA's comments (e.g. "Radiative extinction, cool-flame
  burning and extinction").
- **12 sheets match a table row** (by FLEX number). Pressure agrees in all 12 (sheet 1.01-1.02 or 1.25 atm vs
  table "1 atm" or "1.25 atm"). Oxygen agrees in **11 of 12**.
- **Conflict, FLEX-1213 (table row 7):** the table gives O2 0.17, N2 0.83; the sheet gives O2 0.21, N2 0.79
  (same date, 27 March 2017, same CIR test F086A04). Which is right is not stated. Not resolved; flag it.
- **10 sheets are for tests not in the CFI table** (the table jumps from 1229 to 1285):

  | FLEX | Pressure (atm) | O2 | He | Fuel |
  |---|---|---|---|---|
  | 1231, 1232 | 2.97 | 0.17 | 0 | Dodecane |
  | 1238, 1240 | 0.51 | 0.21 | 0 | Dodecane |
  | 1248, 1250, 1253 | 1.01 | 0.21 | 0 | Dodecane |
  | 1249 | 1.01 | 0.21 | 0 | Dodecane (read from the `.rtf`: the `.txt` is 564 bytes of binary as downloaded) |
  | 1261 | 4.97 | 0.21 | 0 | Dodecane |
  | 1264 | 1.00 | 0.21 | 0.29 | Dodecane |

- Also present: `PSI-39_Analyzed Data_FLEX-<n>_Summary.pdf` for 25 tests, including **1239 and 1393**, which
  have neither a sheet nor a table row. Not read yet (their text is not extracted until `summarize_raw.py`
  reaches PSI-39).
- FLEX-1268 (report Figure 3) has no sheet and no summary. Still unmatched.

### N3. s-Flame (PSI-23) per-flame logs: end reason per flame, but no per-flame chamber air

- 266 `PSI-23_Raw Data_<test point>_TP.txt` files give each flame's script times and, when it stopped early,
  "Reason:": **219 "EXTINCTION DETECTED"**, **29 "Burner temperature limit exceeded for specified duration"**
  (the other 18 have no reason line). Also 286 `_data.csv` (time series: flows, PTA1-3, PMTs, thermocouples,
  radiometers), 286 `_mfcSetpoints.csv`, 279 `as run*.txt` (camera and igniter settings) and 276
  `_Comments.txt` (image notes).
- **No per-flame chamber oxygen or pressure** in any of them: the Comments files never mention oxygen,
  pressure, psia or kPa (0 of 276); "ACME Daily Test Point Log 1/2.xlsx" is a downlink image budget;
  "ACME Gas flow.zip" holds only calculator templates (`ACMEFlowCalculator.xlsx`, `Inside gas mix
  calculator.xls`), listed, not opened. The "chamber calculator" output the data guide describes (p. 19) is
  **not in the downloaded files**.
- So s-Flame flames still cannot be placed or used in the "will it go out" analysis.

### N4. CFI-G: radiative extinction count in the report

- `PSI-159_Reports_FinalRpt_ACME.CFI-G.pdf` p. 44: "A total of 280 hot diffusion flames were observed. Among
  them, 189 flames experienced radiative extinction, and the rest were extinguished when their flow was
  terminated". This is a report-level count (not per row), relevant to `outcomes.json`'s CFI-G caveats.

### N5. Sensor files for item 5 not yet read

- ACME (PSI-10, -23, -159) `_data.csv` headers name every channel (for example "TCA ... TCD, TC200A/B,
  TCBurner, Radiometer+60 ... Radiometer-60, IonCurrent, PTA1-3, PMT1-3"). PSI-23 also has "ACME non-imaging
  data file description.pdf", which should say what each is.
- CFI per-test files: RadiometerData (24), DropletData (24), ColorCamData (24), CoolFlameData (17).
- `PSI_DOCUMENTS.md` lists s-Flame and the other ACME records as "not read for sensors yet".

## What it changes in the app, ranked by value to the challenge

The challenge asks the app to summarise, rank and interpret PSI's combustion investigations for crew habitats.
A wrong number on screen hurts that most, then evidence that moves a place card, then completeness.

| Rank | Item | Counts that change | Screens | `CLAUDE.md` wording to change |
|---|---|---|---|---|
| 1 | **Flag CFI's 8 repeat rows (N1)** | distinct tests 1,719 -> **1,711**; CFI 87 rows -> 79 distinct; placed 896 rows (888 distinct); place counts unchanged (20 / 0 / 209 / 0 / 209) | Home and Experiments totals ("1,719 tests"), CFI experiment page, Tests page, CSV | "1,719 distinct (34 SPICE rows repeat...)" -> "1,711 distinct (34 SPICE rows and 8 CFI rows repeat an earlier row)"; "896 tests can be placed" -> say rows vs distinct |
| 2 | **Fix the stale wording on screen** (Open items C1-C5) | none (text only) | Home, Risk gaps, Habitat panel, fire tasks | none |
| 3 | **Fix the 2 spread-rule gaps** (Open items B1-B2) | none | Simulation tab | none |
| 4 | **Add the 10 CFI tests from NASA's test sheets (N2)**, needs team agreement | rows 1,753 -> 1,763; distinct 1,711 -> 1,721; droplet 361 -> 371; placed 896 -> 906; **ISS / Earth 209 -> 214** (1248, 1249, 1250, 1253 at 1.01 atm = 14.84 psi, 21 %, and 1264 at 1.00 atm, 21 %, 29 % helium: the CFI table's own helium-diluted rows at 1 atm / 21 % already fall inside the box, so 1264 would too; A confirms with the build). Moon counts unchanged (none at >= 30 % O2) | place cards, Experiments (CFI), Tests, CSV, `gaps.json`, the 2D/3D map (new dots at 0.51 and 4.97 atm) | "1,753 test rows from 12 tables" -> "... from 12 tables and 10 CFI test sheets"; all place counts |
| 5 | **Record the FLEX-1213 conflict (N2)** | none (flag only) | CFI row 7 detail | none |
| 6 | **s-Flame / ACME / CFI sensors for item 5 (N5)** | `Investigation.sensors` 11 -> up to 13 investigations | Experiments page "What NASA measured" | "Sensors (item 5): ... 11 investigations (55 entries)" |
| 7 | **CFI-G 189 of 280 radiative extinction (N4)** as an `outcomes.json` caveat line | none | Will-it-go-out panel (CFI-G) | none |
| 8 | **SPICE ISS-air range 19-24 % (candidate)** as context on the SPICE page, never as a test value | none | SPICE experiment page | none |
| 9 | Data-issue notes: Flame Design 326 vs 327 (F10), s-Flame per-flame end reasons exist but no chamber air (N3), Saffire-III two pressure sensors (F5) | none | `DATA_ISSUES.md` only | none |

## How to use it

| Rank | Steps | Who | Hours | Risk under the rules of evidence |
|---|---|---|---|---|
| 1 | In `build_web_data.py`, move the "seen row" check from `spice()` into a shared helper used by every test table (so CFI rows 80-87 get `duplicate_row:23` ... `:30`). Re-run the build. Add a validator check: for every test table, rows identical to an earlier row carry `duplicate_row:<first>`, and `distinct_tests` = 1,711. Update `DATA_ISSUES.md` item 14 and `CLAUDE.md` numbers (shared file: tell B and C, own small PR). | A | 0.75 | None: exact cell-for-cell repeat, nothing estimated. Check that no helper or panel uses `tests.length` where it means distinct tests. |
| 2 | Edit the 5 lines in Open items C1-C5 to say where the pressures come from now (BASS-II report for 29, BASS test matrix for 121; 0.97-1.01 atm, not "all at 1 atm"). Update C's brief's "ISS preset gives 171" to 209. | C (A updates the brief) | 0.5 | Low; every new number must come from `tests.json` fields (`pressure_source`, flags), not typed in. |
| 3 | Put every value that changes the spread on screen: `MIN_FACTOR` 0.15 (`timeline.ts:81`), the 0.2 floors in `biasFrom` (lines 85-86), the `pace` clamp 0.2-6 (line 90) and how many items light per step, each labelled as our own setting. Give the place line in `SimulationView.tsx` (lines 249-253, "These values are the air of ...") its source (`habitats.json` `source_urls`). | B | 1 | This is a "non-negotiable" rule ("No hidden rates. Every value that changes the spread is on screen"). |
| 4 | Ask the team first (it adds tests that are not in PSI's table). If yes: write `data_sourced/cfi_testsheets.json`, one entry per sheet (file, the exact lines "Pressure (atm) = 1.01", "O2 Mole Fraction = 0.21", N2, He, CO2, fuel, D0, Dext, fiber, CIR number, comment). In the build, add them as `Test` rows with `source_table` = the TestSheet file, `source_row` = null or 1, flag `from_test_sheet_not_in_table`. Validator: re-read each sheet when `data_extra/` is present; check that 12 sheets agree with their table rows except 1213. For 1249 read the `.rtf`. | A | 1.5-2 | Medium. Values are exact NASA text, one file per test, so the row match is unambiguous. But the data contract says tests come from tables; the screen must say "from NASA's per-test sheet, not in PSI's table". Do not use the 25 Summary PDFs until read. |
| 5 | Add flag `o2_differs_from_test_sheet` to `PSI-39:cfi:7` with both values in `source_extra`/notes; line in `DATA_ISSUES.md`. Do not change the table's value. | A | 0.25 | None: flag only. |
| 6 | Read `ACME non-imaging data file description.pdf` (after `summarize_raw.py` finishes) and the `_data.csv` headers; add s-Flame (PSI-23) and, if the description covers them, CFI-G / Flame Design channels to `data_sourced/sensors.json` with file, page and quote. Validator already re-finds sensor quotes. | A | 1 | Low if every channel is quoted from the description; channel names alone (e.g. "PTA1") are not explained, so leave them out unless the document explains them. |
| 7 | Add the p. 44 sentence to CFI-G's caveats in `scripts/outcome_analysis.py`, with file and page. | A | 0.25 | Low; it is a report total, not per test, and must say so. |
| 8 | If C wants it: a line on the SPICE page, "NASA's SPICE report says the ISS cabin air was kept within 19-24 % oxygen (p. 19); no reading per burn", sourced from the candidate entry once marked verified. | A verifies (done above), C shows | 0.25 | Must never become `o2_fraction` or place a SPICE test. |
| 9 | Three short rows in `DATA_ISSUES.md`. | A | 0.25 | None. |

## Cut list (not before the deadline)

- **s-Flame's 276 flames as test rows:** no per-flame chamber oxygen or pressure in the downloaded files (N3);
  the "~21 % / ~30 %" values are nominal. Adding them would mean estimating.
- **Using s-Flame's 219 "EXTINCTION DETECTED" lines in the outcome analysis:** without each flame's air there
  is nothing to group them by. (Could be one sentence in a later version.)
- **Lining up Saffire-III's Cygnus and Saffire pressure logs by time (F5):** real work with time stamps, and it
  changes no count (both are ranges, not placed). Keep showing the Saffire sensor range and the note.
- **BASS-II's other 78 tests from outside papers:** outside PSI; would need a citation check each.
- **BASS CO2 (F1):** `co2_fraction` means CO2 added as a suppressant; BASS's is cabin CO2. Needs a new field.
- **SPICE 101325 Pa as a pressure:** never; it is a constant (confirmed above).
- **Opening `.pxp`, `.mdipsug`, `.next`, image zips, or extracting any zip:** not needed and not safe to execute.
- **Partial gravity:** nothing in PSI (scan searched all document text); nothing to add.
- **Re-downloading the 44 failed files:** 404 on NASA's side.
- **The 25 CFI Summary PDFs** beyond a quick read for 1239 and 1393: only if time remains after rank 4.

## Today's schedule (12:30-23:59 UTC+8)

The usage limit is shared and resets at 15:40, so the heavier reading (rank 6) waits until after that.

1. **12:30-13:15 A:** rank 1 (CFI repeats) on `data/cfi-duplicates`: build, validator, `DATA_ISSUES.md`;
   then the shared `CLAUDE.md` number change as its own PR, after telling B and C.
2. **13:15 A:** message the team about rank 4 (below). Meanwhile rank 5 and rank 9 notes (13:15-13:45).
3. **13:45-15:30 A:** rank 4 if agreed (otherwise only the flag and a `DATA_ISSUES.md` line saying the sheets
   exist). Rank 7 (15 min).
4. **15:40-17:00 A:** once `summarize_raw.py` has finished, rank 6 (sensors); read the CFI Summary PDFs for
   1239 and 1393.
5. **17:00 A: data freeze.** No more count changes after this, so C and B can finish wording against fixed
   numbers. Final `CLAUDE.md` numbers PR.
6. **17:00-21:00 C and B:** wording and spread fixes, demo run-through. **21:00-23:00:** `npm run build` on
   `main`, submission text (`docs/SUBMISSION_DATA.md`), deploy. Leave the last hour free.

**Tell Pleng (C):**
- Five lines on screen still say pressures come only from the BASS-II report (C1-C5 below). Since BASS was
  added, 150 solid tests are placed at 0.97-1.01 atm: 29 from the BASS-II report, 121 from BASS's test matrix.
  Please reword from the `pressure_source` field rather than fixed text.
- Distinct test count will become 1,711 (8 CFI repeat rows). Use `distinctTestCount()`, don't type the number.
- Your brief's "ISS preset gives 171" is now 209 (A will fix the brief).
- Optional: CFI-G caveat line (rank 7) and SPICE context line (rank 8).

**Tell Koompa (B):**
- Two spread-rule gaps (B1, B2 below): put `MIN_FACTOR`, the 0.2 floors, the pace clamp and the per-step limit
  on screen as labelled settings, and source the "These values are the air of" line. The rule says every
  value that changes the spread must be on screen.
- If rank 4 is agreed, new CFI dots at 0.51 and 4.97 atm will appear on the map; nothing else in the scene
  changes.

## Open items

From the update and the two overnight reports, each unfinished or unsure:

- **C1** `web/src/panels/RiskView.tsx:49`: "... all at 1 atm (14.7 psi), from NASA's BASS-II report. The rest
  have none." Now wrong (BASS placed at 0.97-1.01 atm from its test matrix). **C1b** line 51, the gap's
  `source`: "BASS, BASS-II and SAFFIRE tables have no pressure column; the placed tests use NASA/TM-20210011385
  p. 102" also needs the BASS test matrix.
- **C2** `web/src/panels/HabitatPanel.tsx:241-242`: counts only `pressure_from_report` tests and says "using
  the pressure in NASA's BASS-II report"; BASS tests carry `conditions_from_test_matrix`, so the 121 are
  missing from that sentence.
- **C3** `web/src/panels/HomeView.tsx:262` (was 189 before PR #28): "Their pressure is from NASA's BASS-II
  report; the other solid tables have no pressure."
- **C4** `web/src/ai/fireTasks.ts:33` (comment: "29 BASS-II tests take 1 atm from NASA's BASS-II report") and
  line ~112, which calls every non-table pressure "from NASA's reports, not the tables"; BASS's comes from a
  science document (test matrix). Suggest "from NASA's reports and test matrix, not the tables".
- **C5** `docs/roles/C-tasks-5-12.md` item 12 "The ISS preset gives 171" -> 209 (A edits).
- **B1** `web/src/scene/cabin/timeline.ts`: hidden values `MIN_FACTOR = 0.15` (line 81), the 0.2 floors on
  oxygen and pressure factors (85-86), `pace` clamp 0.2-6 (90), and the items-per-step limit.
- **B2** `web/src/panels/SimulationView.tsx:249-253`: the place-match line and gravity label show no source.
- **Download:** 44 failed (404): 32 CFI Raw Data, 4 SAME Analyzed Data XML, 8 known. 3 small metadata zips
  differ from PSI's listed size (as reported in the 12:15 update; on disk they match the manifest's own byte
  counts, so the difference is against PSI's listing; not checked further).
- **`summarize_raw.py`** is still running (another session, started 12:14); `INDEX.md` and the PSI-23/-39/-159
  summaries were not rewritten yet when this was written. Then run `extract_sensors.py` too
  (`RAW_DATA_FINDINGS.md`, "Left to do"), and fill in the final download counts there.
- **`docs/ITEMS_5_12_STATUS.md`** was never written (see "State at the start").
- **CFI:** 8 repeat rows (N1); FLEX-1213 oxygen conflict (N2); FLEX-1249 `.txt` is binary as downloaded (use
  the `.rtf`); FLEX-1239, -1393 only in Summary PDFs; FLEX-1268 only in a figure caption; report's "over two
  hundred tests" vs 79 distinct in the table plus 10 sheets.
- **s-Flame:** chamber calculator output not found (N3); 276 flames stay out of `tests.json`. Cite the data
  guide p. 5 in `DATA_ISSUES.md` item 6's reason (the guide's Table 1 reads "with N2"), as F8 proposed.
- **Flame Design:** 326 (report) vs 327 (table), unexplained (F10).
- **Saffire-III:** two pressure sensors about 0.4 psi apart, not aligned in time (F5). Saffire-I oxygen
  conflict (table 21.5-21.7 % vs sensor 22.2-22.7 %) still flagged, not resolved.
- **BASS-II:** 78 tests (Ferkul, Miller, Olson, Fernandez-Pello) still have no pressure in PSI (F2).
- **SAFFIRE-II (9) and SPICE (469 rows):** no pressure in PSI (F3, F4).
- **Possible credentials** in `PSI-26_Science Documents_Planned_Test Matrix.xlsx`, sheet "BASS Test Matrix",
  row 1: tell NASA PSI; never quote it (raw scan, "Other things noticed"). Not done yet.
- **Sensors:** not read yet for FLEX, FLEX-2, DAFT, s-Flame and the other ACME records, SLICE, PSI-115 / -117 /
  -142 (`PSI_DOCUMENTS.md`). The 243 Saffire candidate sensor lines in `raw_candidates.json` repeat channels
  across files; group by name if shown.
- **Items 6, 7, 9, 11, 12 on screen:** C's; not checked in this run.
- **Bundle size and THREE.Clock warning** (`CLAUDE.md` open questions 11, 12): unchanged.
