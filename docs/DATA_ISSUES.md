# Problems in NASA's source tables

Found by inspecting all 22 downloaded tables (`python -I scripts/inspect_tables.py data`).
The raw files in `data/` are left exactly as NASA published them. Every item below is handled in
`scripts/build_web_data.py`, and `scripts/validate_data.py` checks each fix against the raw files
(80 checks, run at the end of every build; the build stops if one fails).

What the pipeline did with every table and row is in `web/public/data/data_quality.json`; what each
flag means is in its `flag_meanings`.

| # | Where | Problem | Handling | Status |
|---|---|---|---|---|
| 1 | ACME BRE (PSI-20) | Two oxygen cells read `2100%` and `3400%`; one fuel cell reads `100%C2H4` | Cells published as-is; `corrections` and `rows_read_as` give 21, 34 and `100% C2H4` | done |
| 2 | ACME CFI-G (PSI-159) | `#DIV/0!` in Tad and Zst; `#VALUE!` and `-` placeholders in peak burner temperature; one 273.15 K beside an empty Celsius cell | `peak_burner_temp_c` from the Celsius column; placeholders null with flag `temperature_placeholder` (49). The 273.15 K is the converted blank. Celsius and Kelvin agree everywhere else (checked) | done |
| 3 | FLEX (PSI-69) | Test 114 has pressure 0 mmHg; headers lost subscripts (`O`, `N`, `CO` mean O2, N2, CO2); file is cp1252-encoded | Pressure 0 is null with flag `pressure_missing`; header mapping in the build; loader reads both encodings | done |
| 4 | SAFFIRE-II (PSI-99) | `?-g` headers should be `µ-g`; `Samle Thickness` typo; `037 mm` three times; dimension cells with units, two values or a figure reference | `µ` restored. Typed `sample_thickness_mm` / `sample_length_cm` / `sample_width_cm` where a cell is one value; `037 mm` left null with flag `thickness_typo_suspected` (3); `0.85 and 0.37 mm`, `5 and 24 cm` and `See Fig. 5` left null with flag `value_not_single`. All cells also kept word-for-word in `source_extra` | done |
| 5 | SAFFIRE-I vs III (PSI-98, PSI-100) | Length and width swapped between the two tables | NASA's Saffire fact sheet: the sample "measured 0.4 m wide by 1 meter long". SAFFIRE-I typed as 94 cm long, 40.6 cm wide with flag `dimensions_swapped_in_source`; SAFFIRE-III already right | done |
| 6 | CLD Flame (PSI-21), s-Flame (PSI-23) | Fuel runs CH4, CH5 ... CH14 and C2H4 ... C2H11; atmosphere and fuel run N2 ... N6 (spreadsheet autofill) | NASA's records name only methane and ethylene (PSI-21) and nitrogen, helium, CO2 (PSI-23). `rows_read_as` gives CH4 / C2H4 matching each row's test type, and N2; each correction gives its reason | done |
| 7 | E-FIELD Flames (PSI-22) | 11 of 32 rows carry only a fuel concentration | `rows_read_as` repeats that test day's other cells; `Flames Ignited` is not repeated, so daily counts stay the same (checked) | done |
| 8 | BASS-II (PSI-25), Flame Design inverse (PSI-10) | BASS-II fan and air display cells hold several settings in display units NASA does not state; 11 Flame Design oxygen cells say `RAMP` or `LOW O2` | Fan and air cells kept as written in `source_extra` (no unit, so no typed value). `RAMP` / `LOW O2` null with flag `o2_not_numeric` | done (units not knowable from the table) |
| 9 | Several | Inconsistent labels | Fuel names: runs of spaces collapsed (line breaks in the cell), SPICE `75 % Propylene` = `75% Propylene`. Solid materials normalised in `fuel_material` (PMMA, SIBAL, Nomex, Ultem, silicone, waxes); 87 cells name only a shape and are flagged `material_not_stated`. CFI-G hot ignition `Yes`/`yes`/`No`/`no` normalised. `Inverse`/`inverse` is carried by `o2_basis` | done |
| 10 | SAFFIRE, SAME, SLICE, BASS, SAME-R | Rows that are not burns; SAME rows say "same conditions as 1-4"; SLICE date cells hold stray text; SAME-R dates have no year | SAFFIRE pre-test rows and the BASS `SOOT Cleaning` row left out and listed. SAME and SLICE: `rows_read_as` keeps the material and the date; SAME's blank cells stay blank because samples 1-4 used several settings. SAME-R years are not in the table, so they stay as written | done |
| 11 | Several | Blank values, e.g. 20 Flame Design rows lack final oxygen and pressure; FLEX extinction diameter filled for 225 of 274 | Kept as null | done |
| 12 | BASS, BASS-II, SAFFIRE, SPICE | No pressure column at all (732 tests); BASS, SAFFIRE-III and SPICE have no oxygen column either (592 tests) | Partly resolved from NASA's own files in PSI (`data_sourced/solid_conditions.json`, `docs/PSI_DOCUMENTS.md`): the BASS-II Summary Report (NASA/TM-20210011385) gives **1 atm** for T'ien's 29 tests (p. 102; now placed, flag `pressure_from_report`) and **99.2-99.5 kPa** for Bhattacharjee's 22 (p. 46; range, flag `pressure_range_from_report`); Saffire-I and -III sensor logs give ambient pressure in PSIA and oxygen for their 4 burns (range, flags `pressure_range_from_sensor_log`, `o2_from_sensor_log`; Saffire-I's sensor oxygen does not overlap its table, flag `o2_differs_from_sensor_log`). Still no pressure: BASS (121), BASS-II's other 78 (Ferkul, Miller, Olson, Fernandez-Pello), SAFFIRE-II (9), SPICE (435) | partly resolved (55 of 732) |
| 13 | SAFFIRE-II (PSI-99) | Four footnote rows inside the table; two material cells blank (merged cells) | Footnotes left out and listed; blank material filled from the row above with flag `fuel_from_row_above` | done |
| 14 | SPICE (PSI-107) and CFI (PSI-39) | 34 SPICE rows and 8 CFI rows (80-87 repeat 23-30) exactly repeat an earlier row | Kept, flagged `duplicate_row:<first row>` (every test table is checked); `distinct_tests` (1,711) in `data_quality.json` | done |
| 15 | SPICE (PSI-107) | 8 rows record a negative air rate (-0.28 or -5.92 cm/s) | Kept as written, flagged `airflow_negative_in_source`; `airflowRange()` in `web/src/data/load.ts` leaves them out. What NASA meant is not stated | done (meaning not knowable from the table) |
| 16 | SPICE (PSI-107) | Time cells in `14:37:08`, `14.34.57` and `1744` forms, plus `Ku LOS`, `no ku`, `n/a` | `ignition_time` / `flame_off_time` as `HH:MM:SS` where unambiguous; `1744` and the no-signal cells stay null with flag `time_not_recorded` (18). Flame duration from the two times in 435 tests, flag `burn_time_from_gmt_times` | done |
| 17 | SAFFIRE-I, SAFFIRE-II | Oxygen given as approximate or as a range | Approximate: value kept, flag `o2_approximate`. Range: `o2_fraction_min` / `max`, flag `o2_range` | done |
| 18 | FLEX (PSI-69) | Test 129: extinction diameter 3.34 mm, initial droplet 3.33 mm | Within the table's 0.01 mm step, in a flame that went out after 0.55 s. Kept as written, flag `extinction_diameter_above_initial` | done |
| 19 | E-FIELD Flames (PSI-22) | Test day 18319 appears twice with identical cells (rows 25-28 and 29-32) | Listed in the table's `known_issues`; which one is right is not stated | noted (not knowable from the table) |
| 20 | FLEX (PSI-69) | Burning-rate header gives the unit only as `mm` | `burning_rate` kept as written, flag `burning_rate_unit_unclear` | done (unit not knowable from the table) |
| 21 | CFI (PSI-39) | Row 7 (FLEX-1213) gives oxygen 0.17 and nitrogen 0.83; NASA's test sheet for the same test (`PSI-39_Raw Data_FLEX-1213_TestSheet.txt`, same date and CIR test F086A04) gives 0.21 and 0.79 | Table value kept, flagged `o2_differs_from_test_sheet:0.21` (`data_sourced/table_conflicts.json`); NASA does not say which is right | flagged |

## Where each table went

- **`tests.json` (12 tables, 1,753 rows, 1,711 distinct tests):** Flame Design normal and inverse,
  CFI-G normal and inverse, SPICE, FLEX, CFI, BASS-II, BASS, SAFFIRE-I, -II, -III. Every source column
  is kept: typed fields where the unit is clear, `source_extra` (word-for-word) for the rest.
- **`other_tables.json` (10 tables, 247 rows):** cells exactly as published in `rows`, and the same
  rows with corrections applied in `rows_read_as`.
  - Per-day summaries: ACME BRE, CLD Flame, E-FIELD Flames, s-Flame, SLICE.
  - Ranges only: FLEX-2 (8 rows, one per fuel).
  - Index of published figures: PSI-142.
  - Two dust sessions: DAFT / DAFT-2.
  - Smoke tests, not flames: SAME, SAME-R.
- **Left out (9 rows):** 1 BASS row, 4 SAFFIRE pre-test rows, 4 SAFFIRE-II footnotes.
- **No table in PSI:** PSI-60, PSI-62, PSI-115, PSI-117 (ground studies).

2,009 source rows = 1,753 tests + 247 in other tables + 9 left out.

## Not downloaded

- Full file inventory per investigation (records list only files added in the latest version).
- Video (1,629 files) and raw image zips (5,109). Every other file in each record's latest version was
  downloaded on 2026-11-15 into `data_extra/` (not in git; `scripts/fetch_psi_raw.py`), except 44 that
  NASA's storage answers with HTTP 404 (`data_extra/raw_manifest.json`: 32 CFI raw files, 4 SAME analysed
  XML files and the 8 listed in `docs/PSI_DOCUMENTS.md`).
- The pages linked from the challenge's Resources tab.
