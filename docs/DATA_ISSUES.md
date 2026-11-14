# Problems in NASA's source tables

Found by inspecting all 22 downloaded tables (`python -I scripts/inspect_tables.py data`).
The raw files in `data/` are left exactly as NASA published them. Each item below is handled, or
still to be handled, in `scripts/build_web_data.py` (workstream A). Owner updates the Status column.

What the pipeline did with every table and row is written to `web/public/data/data_quality.json`.

| # | Where | Problem | Handling | Status |
|---|---|---|---|---|
| 1 | ACME BRE (PSI-20) | Two oxygen cells read `2100%` and `3400%` | Cells published as-is in `other_tables.json`; a `corrections` entry says read as 21 and 34 | done |
| 2 | ACME CFI-G (PSI-159) | `#DIV/0!` in Tad and Zst; `#VALUE!` in peak burner temp (K); `-` placeholders; some 273.15 K values that look like converted blanks | Non-numeric cells become null. Those columns are not converted yet; check the 273.15 values against the Celsius column when they are | partly done |
| 3 | FLEX (PSI-69) | Test 114 has pressure 0 mmHg; headers lost subscripts (`O`, `N`, `CO` mean O2, N2, CO2); file is cp1252-encoded, the rest are UTF-8 | Pressure 0 becomes null with flag `pressure_missing`; loader tries both encodings | done |
| 4 | SAFFIRE-II (PSI-99) | `?-g` headers should be `µ-g`; `Samle Thickness` typo; `037 mm` probably 0.37 mm; `?-g Spread Length` holds rates in mm/s; units inside cells | `?-g` renamed to `µ-g`. Airflow and burn time parsed. Thickness, lengths and spread values kept word-for-word in `source_extra`, typos included, not parsed | partly done: nothing is guessed, but `037 mm` and the mislabelled column are not resolved |
| 5 | SAFFIRE-I vs III (PSI-98, PSI-100) | Sample length and width swapped between the two tables (40.6 x 94 against 94 x 40.6) | Kept word-for-word in `source_extra`. Needs the final report (Gemini task G2f) | open |
| 6 | CLD Flame (PSI-21), s-Flame (PSI-23) | Fuel column runs C2H4, C2H5 ... C2H11; atmosphere column runs N2 ... N6 (spreadsheet autofill) | Published as-is with a `known_issues` warning. Confirm real values against the record text before correcting | open |
| 7 | E-FIELD Flames (PSI-22) | 11 of 32 rows are continuation rows with only a fuel concentration | Published as-is with a `known_issues` note; not filled in | open |
| 8 | BASS-II (PSI-25), Flame Design inverse (PSI-10) | BASS-II fan and airflow cells hold several settings, in display units we cannot identify; 11 Flame Design oxygen cells say `RAMP` or `LOW O2` | `RAMP`/`LOW O2` become null with flag `o2_not_numeric`. BASS-II fan and air displays not converted: units unknown | partly done |
| 9 | Several | Inconsistent labels: `Inverse`/`inverse`, `Yes`/`yes`/`flash`, `75 % Propylene`/`75% Propylene`, `100%C2H4`, `pmma`/`PMMA` | SPICE fuel spacing normalised. Material names (BASS, BASS-II) are still as written | partly done |
| 10 | SAFFIRE, SAME, SLICE, BASS, SAME-R | Rows that are not burns (pre-test flow rows; "same conditions as 1-4"); one malformed SLICE date; one BASS row without test numbers (`SOOT Cleaning`); SAME-R dates without a year | SAFFIRE pre-test rows and the BASS row are left out of `tests.json` and listed in `data_quality.json`. SAME, SAME-R and SLICE are published as-is with notes | done |
| 11 | Several | Blank values, e.g. 20 Flame Design rows lack final oxygen and pressure; FLEX extinction diameter filled for 225 of 274 | Kept as null | done for converted fields |
| 12 | BASS, BASS-II, SAFFIRE, SPICE | No pressure column at all (732 tests); BASS, SAFFIRE-III and SPICE have no oxygen column either (592 tests) | Flags `pressure_not_in_table`, `o2_not_in_table`. Needs sourced values (CLAUDE.md open question 1). Checked 2026-11-14: no openable source states the pressure (NTRS refuses this connection; see `gemini_data/VERIFIED.md` 3b), so nothing is backfilled | open, blocked |
| 13 | SAFFIRE-II (PSI-99) | Four footnote rows (`Note 1` to `Note 4`) sit inside the table; two material cells are blank because the source merged cells (samples 2-6 and 2-9) | Footnote rows left out and listed. Blank material filled from the row above with flag `fuel_from_row_above` | done |
| 14 | SPICE (PSI-107) | 34 rows are exact copies of an earlier row | Kept, each flagged `duplicate_row:<first row>`. Exclude flagged rows when counting distinct tests | done |
| 15 | SPICE (PSI-107) | 8 rows record a negative air rate (-0.28 or -5.92 cm/s) | Kept as written with flag `airflow_negative_in_source`. Meaning not known | open |
| 16 | SPICE (PSI-107) | Time cells use three formats (`14:37:08`, `14.34.57`, `1744`) | Kept word-for-word in `source_extra`, not parsed | open |
| 17 | SAFFIRE-I, SAFFIRE-II | Oxygen given as approximate (`~ 21.5`) or as a range (`21.5 - 21.7`, `22.1 to 22.0`) | Approximate: value kept with flag `o2_approximate`. Range: `o2_fraction` null, `o2_fraction_min`/`max` set, flag `o2_range` | done |

## Where each table went

- **`tests.json` (12 tables, 1,753 tests):** Flame Design normal and inverse, CFI-G normal and
  inverse, SPICE, FLEX, CFI, BASS-II, BASS, SAFFIRE-I, -II, -III.
- **`other_tables.json` (10 tables, 247 rows, cells as published):**
  - Per-day summaries: ACME BRE, CLD Flame, E-FIELD Flames, s-Flame, SLICE.
  - Ranges only: FLEX-2 (8 rows, one per fuel).
  - Index of published figures: PSI-142.
  - Two dust sessions: DAFT / DAFT-2.
  - Smoke tests, not flames: SAME, SAME-R.
- **Left out (9 rows):** 1 BASS row, 4 SAFFIRE pre-test rows, 4 SAFFIRE-II footnotes.
- **No table in PSI:** PSI-60, PSI-62, PSI-115, PSI-117 (ground studies).

2,009 source rows = 1,753 tests + 247 in other tables + 9 left out.

## Not converted yet

- CFI-G: cool flame, hot ignition, peak burner temperature, comments.
- FLEX: droplet diameter, extinction diameter, burning rate.
- BASS-II: fan and air display settings, radiometer gain, carbon dioxide and carbon monoxide readings.
- Flame Design: fuel and nitrogen flow rates, final oxygen and pressure, adiabatic temperature.

## Not downloaded

- Full file inventory per investigation (records list only files added in the latest version).
- Reports, readme files, raw sensor data and video.
- The pages linked from the challenge's Resources tab.
