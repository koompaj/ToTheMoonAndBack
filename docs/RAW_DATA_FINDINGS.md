# What NASA's raw PSI files add (workstream A, automated scan, 2026-11-15)

Status: **work in progress** (written as the scan runs). Nothing here is applied to the data. Candidate
values are in `data_sourced/raw_candidates.json`, each marked "candidate, not verified". The team
checks them before anything enters `tests.json` or a count.

## What was downloaded

- `scripts/fetch_psi_raw.py` plans every file in each record's `added` list except videos (1,629) and
  ".zip" files in the "Raw Data" folder (5,109 image archives, about 5.9 TB). Plan: **9,502 files,
  9.32 GB**, plus 114 files already in `data_extra/` from `fetch_psi_docs.py`. This matches the
  expected 9,502 files / 9.32 GB exactly.
- One file at a time, two retries per file, `--max-time` 60 s (link) and 900 s (file).
- The first run (in plan order) managed about 3.3 s per file, which would mean about 9 hours. It was
  stopped after 71 files and restarted with the same files in priority order: the investigations whose
  table rows lack pressure or oxygen first (BASS-II, BASS, Saffire, SPICE, FLEX), then documents,
  then the bulk per-test files of ACME and CFI. Files from the first run are counted as "skipped,
  already downloaded" in `data_extra/raw_manifest.json`, not as "ok".
- Final counts: (to be filled in when the download finishes)
- **Failed so far: 8, all known.** They are the 8 files `PSI_DOCUMENTS.md` already lists as broken on
  NASA's side (HTTP 404): BASS Final Report and SPICE Final Report as filed under PSI-26, the Saffire
  offgassing strategy (PSI-98, PSI-100), the Saffire-I image grid document and the three Saffire ICES
  presentations. (A SPICE Final Report filed under PSI-107 does download; see F3.)
- `scripts/summarize_raw.py` writes `data_extra/_raw_summary/<accession>.json` and `INDEX.md`, and the
  text of documents to `data_extra/_text/` (not in git; re-create with the scripts).

## Findings

### F1. BASS: NASA's "as run" test matrix records oxygen, pressure and CO2 for every test (candidate)

This is the main finding. It would give all 121 BASS tests an oxygen value and a pressure, where the
PSI table has neither.

- **File:** `PSI-26_Science Documents_As Run_Test Matrix.xlsx` (BASS, PSI-26). Sheets "as run matrix"
  (all tests), "2012" and "2013" (the same tests split by year) and "TP without Data".
- **Columns:** under a group heading "ISS environment" (row 2), the row-3 headers are
  **"O2 % by volume"** (column AA in "as run matrix"), **"pressure, atm"** (AB) and **"CO2, mm Hg"** (AC).
- **Match:** `scripts/match_bass_conditions.py` ties each table row to matrix rows only when
  As Run Test #, Test # and Sample # are all equal (as text, so "12-R" must equal "12-R").
  **121 of 121 BASS tests match**, each to one set of values. Where a test appears on more than one
  sheet, the values agree. The one table row with no match is row 66, "SOOT Cleaning", which has no
  test numbers and is not a test (it is not in `tests.json`).
- **Checks after matching:** date and material agree for 109 rows. 12 rows have a note: the table's
  date for row 43 is typed "6/29/`12"; rows 67-77 have no date in the matrix's date column (they match
  on all three test numbers). Material differences were only commas versus spaces.
- **Values:** oxygen 0.159-0.227 (the column says "%" but holds fractions: 0.221 means 22.1 %);
  pressure **0.970-1.009 atm** (14.26-14.82 psia); CO2 1.37-3.51 mmHg.
- **67 of the value cells are formulas**, and they show NASA's readings in mmHg. For example cell AA12
  is `=164.7/752.5` (O2 partial pressure / total pressure) and AB12 is `=752.5/760` (total pressure
  in atm). The rest are typed numbers.
- **Caveats (also in each candidate entry):**
  - The values are logged per test, but tests in one session usually share one value, so they describe
    the session's atmosphere, not a reading during the burn.
  - **26 oxygen values are below 19 %** (0.159-0.178). These are BASS's nitrogen-dilution
    ("vitiation") tests in the MSG work volume, not ISS cabin air. NASA's notes on those rows say, for
    example, "Calc 17.07% O2" and "vitiation to 17.3 % o2", so the oxygen is calculated. Each
    candidate carries its row's note.
  - The header says "ISS environment". For the diluted tests the oxygen is plainly the work volume, so
    whether the pressure is the cabin's or the work volume's is not stated.
- **What it would change if the team applies it (not applied):** 121 more solid tests placed
  (775 -> 896 placed), all at 0.97-1.01 atm and 16-23 % O2. 38 of them fall inside the ISS / Earth
  control band (19-23 % O2, 14.5-14.9 psi). None reach Moon Base air (>= 30 % O2), so the headline
  ("no solid-material test in the tables reaches 30 % oxygen") does not change.
- **Candidates:** 353 entries `bass-asrun-row<N>-oxygen|pressure|co2` in `raw_candidates.json`
  (121 oxygen, 121 pressure, 111 CO2; 10 tests have no CO2 value), each with sheet, cell, formula,
  header and the cell's exact value.

### F2. BASS-II: the test matrices have no pressure column

- `PSI-25_Science Documents_BASS-II_Test.Matrices.xlsx` has one sheet per researcher (Bhattacharjee
  22, Ferkul 4, Miller 20, Olson 27, Fernandez-Pello 27, T'ien 29: the table's 129 rows). Its columns
  are the same as the PSI table: calibrated initial and final O2, CO2 and CO, **no pressure**.
- `PSI-25_Science Documents_BASS-II_ReadMe.docx` explains the oxygen: "The O2 sensor was out of
  calibration, so the MCA ISS reading was used to correct the initial ISS 'air' reading of the sensor
  for the day via a constant offset."
- The 125 BASS-II "ProofSheet" PDFs are contact sheets of the still camera (frame number, time,
  exposure). None mentions oxygen or pressure.
- So **BASS-II's 78 tests by Ferkul, Miller, Olson and Fernandez-Pello still have no pressure** in
  anything PSI holds. Nothing else in the PSI-25 texts states a pressure besides the Summary Report
  passages already used.

### F3. SPICE: ISS cabin oxygen range stated; no measured pressure

- **Rows:** all 469 SPICE rows, which record neither oxygen nor pressure.
- **Oxygen (candidate `spice-cabin-o2-envelope`):** `PSI-107_Reports_SPICE_FinalReport.pdf`, p. 19
  (pdftotext's page count): "after each two such burns the MSG contents were flushed with ISS cabin
  air. The oxygen mole fraction of this cabin air is maintained within 19 - 24%." (The dash is
  unreadable in the text layer.) This is the range NASA keeps ISS air within, **not a reading for any
  burn**. It could be shown as context, never as a test's `o2_fraction`.
- **Pressure: not found.** Three things look like a pressure and are not measurements:
  - the report's Table 1 footnote, "Parameters ua, uf, and Re assume conditions of 298 K, 101 kPa and
    21+-1% O2": an assumption for a calculation;
  - `PSI-107_Raw Data_SmokePointReview-0g-3.xlsx`, sheets "Smoke Point Datasheet" and
    "Smoke Point Datasheet (2)", column I "Pressure" with unit "(Pa)": **101325 in every row** (61 and
    55 rows), typed in, not a formula. That is exactly one standard atmosphere, used as a constant for
    fuel density;
  - the Science Verification Report: "Experiment is to operate at ambient pressure" and the MSG
    "will nominally operate at a negative pressure of 1.3 mBar relative to ISS cabin Pressure":
    requirements, not readings.
- `PSI-107_Raw Data_Spice Flight Test Data II modified.xls` (old binary Excel), now read cell by cell
  with `scripts/read_xls.py`. Sheet "Data record of Video and Stills", column K, header "Pressure"
  (K3) with unit "(Pa)" (K4): **101325 in all 526 data rows (K5-K530)**, stored as typed numbers
  (RK / MULRK records), not formulas. Like the smoke-point sheets, it is one standard atmosphere used
  as a constant, not a reading. **No SPICE pressure is in PSI's files.**
- The same file's "Reference" sheet gives the burner tube sizes, for example "The 1.6 mm tube inner
  diameter is 0.063 inches or 1.6002 mm. The length is 1.170 inches" (A5). Item 10 already has SPICE's
  nozzle diameters from the table and the Final Report, so nothing new is needed. NASA's A6 says "0.30
  inches or 0.762 mm"; 0.762 mm is 0.030 inches, so "0.30" is a typo in the source (noted, not used).

### F4. SAFFIRE-II and FLEX: nothing in PSI to search

- SAFFIRE-II (PSI-99) and FLEX (PSI-68, PSI-69) list no files besides their tables, so their 9 and 1
  tests without pressure stay without one. (The FLEX row, C11M201, is a closed-chamber test with 35 %
  CO2, not cabin air.)

### F5. Saffire-III: two cabin pressure sensors disagree by about 0.4 psi

- Saffire's own sensor log (`PSI-100_Raw Data_Saffire III Sample 1 Sensors.xlsx` and `... Sample 2
  Sensors.xlsx`, sheet "Calibrated Data", column J "Ambient Pressure", unit row J2 "PSIA") reads
  **14.40-14.50** (S1) and **14.40-14.44** (S2). These are the ranges already in `solid_conditions.json`.
- The Cygnus vehicle's own sensors in `PSI-100_Raw Data_Saffire-III 1 Hz Telemetry Data.xlsx`, sheet
  "CygnusPressureData", columns D-F "PCM EPS 1 / 2 / 3 Press (psi)", read **13.95-14.06** (1,005 to
  1,013 non-zero readings each; the rest of the 11,449 rows are 0, i.e. no data).
- The two logs are not aligned in time here, so they may cover different periods. Which reading
  applies to the burns is not stated. Proposed fix: before the Saffire-III ranges are shown, line the
  two logs up by time stamp; until then, show the Saffire sensor value and say a second sensor read
  about 0.4 psi lower. (Saffire-I's Cygnus sensor, "PCM Press (psi)", read 14.47-14.54, close to its
  Saffire log; see `PSI_DOCUMENTS.md`.)
- The same telemetry has three accelerometer axes ("acceleration x/y/z axis (m/s^2)"), all within
  about +-0.002 m/s^2 (about 0.0002 g). That supports `gravity_g` 0 for Saffire-III; it is not a
  partial-gravity test.

### F6. Sensors per investigation (item 5, candidates)

`scripts/extract_sensors.py` writes the "sensors" section of `raw_candidates.json` in the `Sensor`
shape (kind, name, detail, source_file, source_where, quote), one line per channel per file, with the
column letter and unit-row cell. Housekeeping channels (avionics voltages, igniter selects, time
stamps, LEDs, camera triggers) are left out. Hand-added lines (`from_text: true`) quote NASA's words.

| Investigation | Lines | Kinds | Source |
|---|---|---|---|
| Saffire-I (PSI-98) | 91 | O2, CO2, two anemometers, ambient pressure, 4 radiometers, 12 thermocouples (6 plume, 6 sample), humidity, smoke detectors, Cygnus pressure | sensor and telemetry spreadsheets |
| Saffire-III (PSI-100) | 152 | the same set, plus Cygnus EPS pressures and accelerometers | sensor and telemetry spreadsheets, raw telemetry CSV |
| BASS-II (PSI-25) | 6 | O2 sensor (offset-corrected with the ISS MCA), CDM CO2 sensor, CSA-CP CO sensor, radiometer (uncalibrated), duct air flow, Nikon still camera | `BASS-II_ReadMe.docx`, with quotes |
| BASS (PSI-26) | 5 | "ISS environment" O2, pressure, CO2; radiometer display; air display | `As Run_Test Matrix.xlsx` header cells |

Many Saffire lines repeat the same channel across files (sample 1, sample 2, telemetry); C may want to
group them by `name`. The other investigations' sensor files are still downloading (see "Left to do").

### F6b. Old .xls files: every pressure column is instrument hardware (SAME, SAME-R)

- `scripts/read_xls.py` (standard library, reads cell values only) now reads all 168 `.xls` files;
  `scripts/summarize_raw.py` summarises them per sheet like `.xlsx`. 0 failed.
- Cells naming pressure or oxygen appear only in SAME (PSI-102, 39 files), SAME-R (PSI-101, 75 files)
  and the SPICE file above. In SAME and SAME-R they are housekeeping channels, row 1 headers such as
  "MFCPressure(PSIA)", "GN2MainPressure[PN02](PSIA)", "GN2RegulatedPressure[PN12](PSIG)",
  "VacuumPressure[VR04](PSIA)", "DriveSidePressure[BN02](PSIA)" and "SampleSidePressure[AT20](PSIA)":
  the instrument's gas supply, vacuum and flow lines, **not cabin air**. SAME's smoke tests are in
  `other_tables.json`, not `tests.json`, so no test row gains a value. Item 5 already lists these as
  sensors on `data/items-5-12`.
- `PSI-102_Engineering Documents_SAME VPRED Matrix PLN-005 Baseline.xls` mentions pressures only as
  design requirements (for example "Two relief valves will keep the pressure below 21 psi downstream").

### F7. Fuel shape and size (item 10)

- **BASS and BASS-II:** NASA's own table text already states the shape for most rows, in
  "Fuel Sample Material": for BASS, 50 spheres, 14 slabs, 2 sheets and 17 candles; for BASS-II, 54 rods,
  13 films, 3 slabs, 2 spheres and 1 candle. That needs no raw file: A can fill `fuel_shape` from those
  words, with the column as `fuel_shape_source`. The other rows ("PMMA 2 cm", "SIBAL 2 cm", "1 cm
  wide PMMA 2 mm thick") give a width but not a shape word, so they stay `shape_not_stated`. The BASS
  drawings are named "Flat.Sample.Frame_1cm" and similar, but they have no text layer and cannot be
  tied to rows, so they are not used.
- **Saffire-I and -III:** the Operations documents (`PSI-98_Engineering Documents_SAFFIRE-I
  Operations.pdf`, `PSI-100_..._SAFFIRE-III Operations.pdf`, p. 1) say "the sample material is a single
  large sample (approx. 0.4 m wide by 0.94 m tall)". The tables already give 40.6 x 94 cm for S1 and S2,
  so this agrees and adds nothing new. "Single large sample" against two table rows (S1 concurrent,
  S2 opposed) is not explained, so it is in the unmatched list.
- **SAFFIRE-II:** "each 5 cm x 29 cm" (`SAFFIRE Objectives, Development and Status.pdf`) agrees with
  its table.

## Searched and not found (so far)

- BASS-II pressure for Ferkul, Miller, Olson, Fernandez-Pello (F2).
- SPICE measured pressure or per-burn oxygen (F3): the .xls is now read cell by cell; its "Pressure"
  column is the 101325 Pa constant.
- Cabin pressure in any old .xls file (F6b): only instrument hardware pressures (SAME, SAME-R).
- SAFFIRE-II and FLEX (F4): no files.

## Unmatched list

- BASS table row 66 "SOOT Cleaning" (8/3/2012, GMT 216): no test numbers; not a test.
- SPICE oxygen range: applies to the whole investigation, not to rows, so it is not a per-row value.
- Saffire-I / -III "single large sample (approx. 0.4 m wide by 0.94 m tall)": the tables have two rows
  (S1, S2) per flight; how one sample relates to two rows is not stated.
- Saffire-III Cygnus EPS pressures (13.95-14.06 psi): not lined up in time with the burns.

## Other things noticed

- **Possible credentials in a NASA file.** `PSI-26_Science Documents_Planned_Test Matrix.xlsx`, sheet
  "BASS Test Matrix", row 1, holds what look like account names and passwords next to a note on the
  video clock. They are not copied here. Proposed fix: tell NASA PSI (the file is public), and never
  quote that cell in the app or the docs.

## Recommended next steps

1. **BASS (F1), the main item:** A opens `PSI-26_Science Documents_As Run_Test Matrix.xlsx`, checks
   a sample of cells against the candidates (for example AA4/AB4 for row 1, AA12/AB12 for row 9 and
   one vitiated row such as AA89), and the team decides:
   - whether a value logged per session counts as a test's condition;
   - how to label the 26 nitrogen-diluted (calculated) oxygen values;
   - whether to treat pressure as cabin air, given the "ISS environment" heading.
   If it is agreed, add the facts to `solid_conditions.json` (with `pressure_source` naming the cell)
   and let `build_web_data.py` and `validate_data.py` apply and check them. Placed tests would go from
   775 to 896, and ISS / Earth from 171 to 209. Moon Base counts would not change.
2. **Credentials cell (Other things noticed):** tell NASA PSI; never quote it.
3. **Saffire-III pressure (F5):** line up the Cygnus EPS and Saffire logs by time before showing ranges.
4. **SPICE (F3): done.** The .xls "Pressure (Pa)" column is the 101325 constant in all 526 rows. SPICE
   has no measured pressure in PSI; leave its rows without one.
5. **BASS-II's 78 tests:** no pressure anywhere in PSI. The researchers' papers listed in the ReadMe
   (for example Olson and Ferkul, Combustion and Flame 180, 2017) are the next place to look. They
   are outside PSI, so use them only with a citation and a check.
6. **Sensors (F6):** C can show the Saffire and BASS lists now. Group repeated channels by name.

## Left to do (when this run stopped)

- The bulk per-test files (ACME, CFI, SAME, SAME-R, DAFT) were still downloading, and their
  summaries and sensor lists were not yet searched. Re-run:
  `python -I scripts/fetch_psi_raw.py data data_extra` (it skips finished files), then
  `python -I scripts/summarize_raw.py data_extra` and `python -I scripts/extract_sensors.py data_extra data_sourced/raw_candidates.json`.
- Priority 4 (partial gravity, conditions that contradict the tables, new tests) was searched only
  in the BASS, BASS-II, Saffire and SPICE files.
