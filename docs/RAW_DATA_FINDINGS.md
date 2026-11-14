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
- The SPICE "Spice Flight Test Data II modified.xls" is an old binary Excel file; only its text runs
  could be read (column names such as "GMT ignition", "Fuel Rate", "Air Rate", "Pressure"). Its cell
  values need a proper .xls reader (see next steps).

### F4. SAFFIRE-II and FLEX: nothing in PSI to search

- SAFFIRE-II (PSI-99) and FLEX (PSI-68, PSI-69) list no files besides their tables, so their 9 and 1
  tests without pressure stay without one. (The FLEX row, C11M201, is a closed-chamber test with 35 %
  CO2, not cabin air.)

## Searched and not found (so far)

- BASS-II pressure for Ferkul, Miller, Olson, Fernandez-Pello (F2).
- SPICE measured pressure or per-burn oxygen (F3).
- SAFFIRE-II and FLEX (F4): no files.

## Unmatched list

- BASS table row 66 "SOOT Cleaning" (8/3/2012, GMT 216): no test numbers; not a test.
- SPICE oxygen range: applies to the whole investigation, not to rows, so it is not a per-row value.

## Other things noticed

- **Possible credentials in a NASA file.** `PSI-26_Science Documents_Planned_Test Matrix.xlsx`, sheet
  "BASS Test Matrix", row 1, holds what look like account names and passwords next to a note on the
  video clock. They are not copied here. Proposed fix: tell NASA PSI (the file is public), and never
  quote that cell in the app or the docs.
