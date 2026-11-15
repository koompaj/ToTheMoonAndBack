# What NASA's raw PSI files add (workstream A, automated scan, 2026-11-15)

Status: download **finished** (see "What was downloaded"); the search of the bulk files is partly done (see "Left to do"). Only F1 (BASS) has been applied, on its own branch; nothing else here is applied to the data. Candidate
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
- **Final (download finished by 12:13 on 2026-11-15):** `data_extra/raw_manifest.json` of the last run:
  **7,828 ok, 1,744 skipped (already there), 44 failed**, so **9,572 files** are on disk out of 9,616.
  Earlier runs' manifests: `raw_manifest_run1.json`, `raw_manifest_run2.json`.
- **All 44 failures are HTTP 404 from NASA's side:**
  - the 8 documents already listed as broken (BASS and SPICE Final Reports under PSI-26, the Saffire
    offgassing strategy under PSI-98 and PSI-100, the Saffire-I image grid file, three Saffire ICES
    presentations);
  - 4 SAME files that PSI lists as **0 bytes** (`PSI-102_Analyzed Data_16904___9.xml`, `16912`, `16937`,
    `16942`);
  - **32 CFI raw files (PSI-39):** the whole F173E01-E03 set (data, chamber readings, radiometer
    readings, camera and test point settings, comments, filter positions, and 4 INTNS metadata files),
    plus F121A01E (3 metadata files), F163A04D, F195D07D and F205D01 (C, D and 3 metadata files).
  - **Retried once (12:30-12:45), one file at a time: 0 of 36 came through, all 404 again.** For every
    file PSI's API (`.../studies/<acc>/download?...&redirect=false`) issues a download link, but the
    storage behind the link answers 404. So PSI lists files that are not in its storage. Each was
    tried at the record's version and at version 1, three times each. Result:
    `data_extra/raw_retry_2026-11-15.json` (not in git). Proposed: report all 44 to NASA PSI as broken
    links, with this list.
- **3 size warnings** (downloaded size differs from the listed size): the metadata zips
  `PSI-39_metadata_PSI-118_CFI.zip` (7,569 vs 10,237 bytes), `PSI-102_metadata_PSI-170_SAME.zip`
  (10,753 vs 13,127) and `PSI-115_metadata_PSI-185_Utilization of the S.zip` (8,200 vs 7,021). These
  are probably regenerated on request; they hold metadata only. Not used in any finding.
- **Takeover at about 11:00:** another session on the team stopped this run's single-file download
  (PID 9956) and continues it 4 files at a time from its own copy of the script
  (`fetch_psi_raw_parallel.py --workers 4`, kept outside the repo), at the team lead's request to
  finish faster. It writes the same `data_extra/raw_manifest.json` and skips files already there.
  Note: this brief asked for one file at a time; running 4 at once was the team lead's decision, not
  this run's. Do not start another download while it runs. To check:
  `Get-CimInstance Win32_Process -Filter "Name like 'python%'" | Where-Object { $_.CommandLine -like '*fetch_psi*' }`.
- Each run rewrites the manifest and counts earlier files as "skipped"; copies of earlier manifests
  are `raw_manifest_run1.json` and `raw_manifest_run2.json`. At the takeover the manifest planned
  8,397 files with 1,219 skipped, so a complete download is about **9,608** files (ok + skipped) plus
  the 8 known failures.
- **Failed so far: 8, all known.** They are the 8 files `PSI_DOCUMENTS.md` already lists as broken on
  NASA's side (HTTP 404): BASS Final Report and SPICE Final Report as filed under PSI-26, the Saffire
  offgassing strategy (PSI-98, PSI-100), the Saffire-I image grid document and the three Saffire ICES
  presentations. (A SPICE Final Report filed under PSI-107 does download; see F3.)
- `scripts/summarize_raw.py` writes `data_extra/_raw_summary/<accession>.json` and `INDEX.md`, and the
  text of documents to `data_extra/_text/` (not in git; re-create with the scripts).

## Findings

### F1. BASS: NASA's "as run" test matrix records oxygen, pressure and CO2 for every test (applied 2026-11-15)

**Applied** on branch `data/bass-conditions` after a 10-row hand check (oxygen and pressure only; CO2 not applied). See the
last "Done" section of `docs/PSI_DOCUMENTS.md`.

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
- **What it changes (now applied):** 121 more solid tests placed
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

### F8. ACME s-Flame (PSI-23): 276 flames, only per-day summaries in PSI (conditions nominal only)

- **File:** `PSI-23_Engineering Documents_s-Flame_data_interpretation_20210920.pdf` (NASA's data guide),
  pdftotext page 3 (printed page 3): "A total of 276 flames were ignited for the s-Flame experiment,
  with 29, 116, and 131 respectively ignited during Increments 60, 61, and 63." Page 4: the first round
  "featured 145 flames (nominally) in which the fuel and oxygen (i.e., in the chamber atmosphere) were
  diluted with nitrogen"; the second "featured 131 flames (nominally) ... diluted with helium".
- **Table 1** (pdftotext page 5, "Flames ignited for the s-Flame experiment") is the same table PSI
  publishes as `PSI-23_Experimental table_ACME s-Flame.csv`: 18 rows, one per test day, flames per day
  adding up to **276**, which agrees with the text. It is in `other_tables.json` as a per-day summary,
  so **none of the 276 flames is a row in `tests.json`**. The atmosphere is only **"~21% O2"** or
  **"~30% O2"** with N2 or He; footnote 2: "Atmosphere is ~1 atm but pressure increases and O2% drops
  with vitiation."
- **Agrees with a correction we already make:** the guide's Table 1 reads "with N2" where PSI's CSV
  has the autofill values "N3" to "N6" (`docs/DATA_ISSUES.md` item 6). NASA's own report therefore
  confirms that `rows_read_as` is right to read them as N2. Proposed: cite this page in that
  correction's reason.
- **Why it matters:** these are gas flames in the CIR chamber atmosphere (like CFI-G's "ambient"
  rows), at about 1 atm, so they would **not** change the Moon Base counts (pressure far above
  10.2 psi). The "~" values are nominal, so they are **not** usable as test values, and no candidate
  is written.
- **Where per-test values would be:** the same guide (pdftotext page 19) says the "chamber calculator
  provides the chamber pressure before and after each operation", is "the more reliable source of the
  chamber pressure" (CIR transducers checked every six months, averaged from PT16 and PT17 after PT28
  proved an outlier), and "also provides concentration estimates" of O2, N2, He, CO2 and H2O. Those
  files were expected among PSI-23's bulk files. **Checked after the download: the file named in the
  guide, "ACME Chamber Calculator - 2018-03-08 to 2020-07-08.xlsx", is not in PSI-23's file list** (nor
  in any zip listing). PSI's records list only the files added in the latest version (CLAUDE.md open
  question 7), so it may be in an earlier version. Calculators for Flame Design and CFI-G are there (F11).
  PSI-23's raw files do have per-test `<test point>_data.csv` files with chamber pressure channels
  "PTA1", "PTA2", "PTA3" in raw volts (about 0.92 V), which need NASA's
  `ACMEFlowAndPressuresRawDataConversion.xlsx` (inside `PSI-23_Engineering Documents_ACME Gas flow.zip`,
  not extracted); the guide says PTA3's transducer "has not been calibrated in years".
  The two "ACME Daily Test Point Log" spreadsheets hold image counts and downlink sizes only.
- **Next:** when PSI-23's files are down, find the chamber calculator file and the daily test point
  logs ("19254 daily test point log.pdf" and so on), and match flames to test points (for example
  "Test Point: 20190A1"). Only then could s-Flame flames be proposed as test rows, and that needs the
  team's agreement, because PSI's table does not list them one by one.

### F9. CFI (PSI-39): the report describes more tests than the table holds

- **File:** `PSI-39_Reports_CFI Science Final Report.pdf`, pdftotext page 6: "Over two hundred tests
  were carried out during the CFI experimental campaign." The PSI table has **87** CFI rows, so most
  CFI tests are **not in the tables** (the tables are summaries).
- Same page, the list of experiments: "Pure n-dodecane at 0.5, 0.75, 1, 1.25, 2, 3, and 5 atm";
  "Helium dilution by 29% and 59% with O2 mole fraction at 0.21"; "Farnesane: from 0.75 to 3 atm".
  This agrees with the table (0.5-5 atm, O2 0.17-0.21, helium 0.29 and 0.59 at O2 0.21). The stated
  objective, "a rage [sic] of pressure from 0.25 atm to 5 atm", is an aim: no 0.25 atm test is listed
  or in the table. Not a conflict.
- **Figure 1** caption, pdftotext page 7: "FLEX-1223: N-dodecane at 1.25 atm pressure in air" **agrees** with
  CFI table row 16 (test 1223, 1.25 atm, O2 0.21, no helium).
- **Figure 3** caption, pdftotext page 8: "FLEX-1268 ... N-dodecane at 3 atm burning in 12%O2 ... 50% N2
  ... 29% Helium". Test 1268 is **not in the CFI table**, and 12 % is below the table's lowest CFI oxygen
  (17 %). The stated mix adds up to only 91 %, so the caption is not usable as a test's values. This is
  in the unmatched list.
- **After the download:** no file in PSI-39 is named for test 1268. The per-test files named by FLEX
  number (`FLEX-12xx_TestSheet`, `_DropletData`, `_Summary.pdf` and so on) cover 44 tests, the
  highest near 1268 being FLEX-1261 and FLEX-1264. A second set of 123 test points is named by an
  instrument ID such as "F068A03" (`_Chamber_Readings.txt`, `_MDCA_CFI_Testpoint_Settings.txt`, ...,
  430 `F<id>.txt` data files). Those files do not mention a FLEX number (0 of the test point
  settings files contain "FLEX"), so they cannot yet be tied to table rows. Matching them by date and
  time to the table would be the next step; until then they are not used.

### F10. ACME flame counts: reports and tables nearly agree (differences noted, not resolved)

- **Flame Design (PSI-10):** `PSI-10_Reports_FinalRpt_ACMEFlameDesign.pdf`, pdftotext page 45: "A total
  of 326 flames were ignited for the Flame Design experiment during Increments 59/50 [sic] and 66,
  where 188 and 138 flames were ignited". The table has **327** rows with 327 distinct test labels,
  one more than the report's count. Not explained in either source. Proposed fix: none to the data;
  list it in `docs/DATA_ISSUES.md` as "report says 326 flames, table has 327 rows" so nobody quotes
  "326" and "327" as the same thing.
- **CFI-G (PSI-159):** `PSI-159_Reports_FinalRpt_ACME.CFI-G.pdf`, pdftotext page 38: "A total of 280 hot
  flames were ignited (or in some cases naturally reignited)". The table has 333 rows, with hot ignition
  "yes" in 263, "flash" in 8 and "no" in 62. The report counts reignitions too, so 280 and 263 are not
  the same measure. No conflict claimed.
- **CLD Flame (PSI-21):** the same CFI-G report, pdftotext page 51: "the over 300 that were ignited for
  all of CLD Flame". PSI's CLD Flame table has 32 rows, one per test day (`other_tables.json`), so no
  CLD flame is a row in `tests.json`.

### F11. ACME chamber calculators confirm the table pressures, and the Moon Base headline

NASA's "Final ACME Chamber Calculator" spreadsheets log every chamber fill, vent and test point
(sheet "EventData": row 3 headers "TPID", "Pstart (psia)", "Pend (psia)"; row 4 names the sensor
**"FCU_MP_PT28"**). Matched to table rows by test label with spaces removed ("21088 B1" = "21088B1").

- **Flame Design (PSI-10):** `PSI-10_Raw Data_Final ACME Chamber Calculator - 2019-04-09 to 2019-08-13.xlsx`
  and `... - 2021-10-28 to 2022-02-04.xlsx`. 207 of 327 rows match (187 + 20); **all agree within
  0.11 psi** (table atm x 14.6959 against "Pstart"). 120 rows have no calculator entry under the same
  label (for example the 21301 series).
- **CFI-G (PSI-159):** `PSI-159_Raw Data_Final ACME Chamber Calculator - 2021-03-09 to 2021-10-21.xlsx`.
  179 of 333 rows match. 157 agree within 0.25 psi and 22 differ by 0.25-0.56 psi. In 19 of those 22
  the calculator is higher (for example 21125K3: table 1.0 atm = 14.70 psia, calculator Pstart 15.26),
  and the pressure climbs test by test through a day. In the other 3 (21130N3-N5, table 3.0001 atm =
  44.09 psia, calculator 43.79-43.80) it is about 0.3 psi lower. The table's CFI-G pressures are **nominal**
  (1.0, 2.0001, 0.5 atm) while the calculator records the actual start pressure, which rises with
  vitiation (the s-Flame guide's words: "pressure increases and O2% drops with vitiation"). This is
  a difference of meaning, not an error. 154 rows (for example the 21196 series) have no entry under
  the same label.
- **Moon Base headline confirmed:** all **20** Moon Base tests (CFI-G days 21106, 21153, 21174) are
  in the calculator (EventData rows 73-81, 236-241, 286-290). Their start pressures are **7.35-7.58
  psia** and end pressures **7.46-7.82 psia**, all far below the 10.2 psi limit. So the 20 stay in
  the Moon Base box on NASA's measured pressures, not only on the table's nominal 0.5 atm.
- **Caveats:**
  - The sensor named is PT28. The s-Flame guide (pdftotext page 19) says PT28 "was clearly an outlier"
    and that "the average pressure recorded in the chamber calculator file was later based on just
    PT16 and PT17". Which sensor these CFI-G and Flame Design values come from is not stated beyond
    the PT28 label.
  - The size of PT28's offset is visible in a CFI chamber log: `PSI-39_Raw Data_F068A03_Chamber_Readings.txt`
    (2017-03-09 18:02:36, columns "FCU_MP_PT16(PSIA)", "FCU_MP_PT17(PSIA)", "FCU_MP_PT28(PSIA)",
    "FCU_MP_PT29(PSIA)") reads **15.11, 15.07, 14.43, 15.05**: PT28 about 0.65 psi below the others at
    about 1 atm. That is one reading in 2017, so it says nothing exact about 2021, but it shows the kind
    of error. The Moon Base margin (highest 7.82 psia against a 10.2 psi limit, 2.4 psi) is far larger,
    so the headline does not depend on it.
  - Nothing is applied. Proposed: add a validator check that the 20 Moon Base tests stay at or below
    10.2 psi in the calculator, with the file, sheet and row as the source; and let the team decide
    whether to show the measured CFI-G pressures beside the nominal ones.
  - The calculators' oxygen estimates (sheet "SourceTable" and later EventData columns) were not
    compared yet.

## Searched and not found (so far)

- BASS-II pressure for Ferkul, Miller, Olson, Fernandez-Pello (F2).
- SPICE measured pressure or per-burn oxygen (F3): the .xls is now read cell by cell; its "Pressure"
  column is the 101325 Pa constant.
- Cabin pressure in any old .xls file (F6b): only instrument hardware pressures (SAME, SAME-R).
- Partial-gravity data in every downloaded document's text (all accessions): none. The hits are aims,
  such as ACME BRE's aim "to assess the relevance of existing flammability test methods for low and
  partial-gravity environments" (`PSI-10_Science Documents_ACME_ISRD.pdf`), and a roadmap heading
  "Partial Gravity testing" in `PSI-102_Presentations_SAME_EarlyResults.ppt`. No test was run at
  partial gravity in these files.
- SAFFIRE-II and FLEX (F4): no files.

## Unmatched list

- BASS table row 66 "SOOT Cleaning" (8/3/2012, GMT 216): no test numbers; not a test.
- SPICE oxygen range: applies to the whole investigation, not to rows, so it is not a per-row value.
- Saffire-I / -III "single large sample (approx. 0.4 m wide by 0.94 m tall)": the tables have two rows
  (S1, S2) per flight; how one sample relates to two rows is not stated.
- Saffire-III Cygnus EPS pressures (13.95-14.06 psi): not lined up in time with the burns.

- CFI test 1268 (F9): a figure caption only ("3 atm ... 12%O2 ... 50% N2 ... 29% Helium", adds to 91 %);
  no table row.
- s-Flame (F8): 276 flames with nominal conditions only; PSI's table has one row per test day.

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

## Left to do (updated 2026-11-15, 12:20; this run stopped at about 64 % of the 5-hour usage limit)

- **Download: finished** (9,572 of 9,616 files; 44 are 404s on NASA's side, see "What was downloaded").
  The 36 new 404s were retried once and failed again (storage 404). Proposed: report all 44 to PSI.
- **Summaries: done** over all 9,572 files (finished 12:26; `data_extra/_raw_summary/INDEX.md`
  rewritten). Files not read are instrument binaries and images, for example 610 `.mdipsug` files and
  2 images in CFI-G (PSI-159).
- **Not yet re-run:** `python -I scripts/extract_sensors.py data_extra data_sourced/raw_candidates.json`
  over the new files (ACME and CFI-G sensors). The chamber logs show sensor names such as
  "FCU_MP_PT16(PSIA)" to "FCU_MP_PT29(PSIA)" and "FCU_MP_TM1(Deg C)" to "TM4" (F11).
- **Searches still open:**
  - s-Flame (F8): the chamber calculator named in NASA's guide is not in PSI-23's file list; look for
    it in earlier PSI versions or ask PSI. The raw PTA1-PTA3 volts need NASA's conversion sheet
    (inside a zip, not extracted).
  - CFI (F9): tie the 123 "F<id>" test points to table rows by date and time.
  - ACME chamber calculators (F11): compare their oxygen estimates with the tables, and look for the
    154 CFI-G and 120 Flame Design rows with no calculator entry under the same label.
  - Flame Design: the one row more than the report's 326 flames (F10).
- **Proposed, for the team (nothing applied):**
  - a validator check that the 20 Moon Base tests stay at or below 10.2 psi in the CFI-G chamber
    calculator (F11);
  - `docs/DATA_ISSUES.md`: add "report says 326 flames, table has 327 rows" (F10), and cite the
    s-Flame guide's Table 1 ("with N2") in the N3-N6 autofill correction (F8).
- **Done in this run:** chamber calculators checked against the tables, with PT28's offset seen in a CFI
  log (F11); SPICE's .xls read cell by cell (F3); all 168 old .xls files read (F6b); partial-gravity
  search of all document text (none found); s-Flame (F8); CFI (F9); ACME counts (F10); final download
  counts.
