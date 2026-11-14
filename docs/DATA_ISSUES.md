# Problems in NASA's source tables

Found by inspecting all 22 downloaded tables (`python -I scripts/inspect_tables.py data`).
The raw files in `data/` are left exactly as NASA published them. Each item below needs handling in
the conversion pipeline (workstream A). Owner updates the Status column.

| # | Where | Problem | Proposed handling | Status |
|---|---|---|---|---|
| 1 | ACME BRE (PSI-20) | Two oxygen cells read `2100%` and `3400%` | Read as 21 and 34 (percent-format artefact); flag the rows | open |
| 2 | ACME CFI-G (PSI-159) | `#DIV/0!` in Tad and Zst; `#VALUE!` in peak burner temp (K); `-` placeholders; some 273.15 K values that look like converted blanks | Treat as missing; check the 273.15 values against the Celsius column | partly done: non-numeric cells become null |
| 3 | FLEX (PSI-69) | Test 114 has pressure 0 mmHg; headers lost subscripts (`O`, `N`, `CO` mean O2, N2, CO2); file is cp1252-encoded, the rest are UTF-8 | Pressure 0 becomes null with a flag; map header names; loader tries both encodings | done in v1 |
| 4 | SAFFIRE-II (PSI-99) | `?-g` headers should be `µ-g`; `Samle Thickness` typo; `037 mm` probably 0.37 mm; `?-g Spread Length` holds rates in mm/s; units inside cells | Rename on load; flag the 037 value; parse units out of cells | open |
| 5 | SAFFIRE-I vs III (PSI-98, PSI-100) | Sample length and width swapped between the two tables (40.6 x 94 against 94 x 40.6) | Check the final report before using either | open |
| 6 | CLD Flame (PSI-21), s-Flame (PSI-23) | Fuel column runs C2H4, C2H5 ... C2H11; atmosphere column runs N2 ... N6 (spreadsheet autofill) | Confirm real values against the record text before correcting; flag | open |
| 7 | E-FIELD Flames (PSI-22) | 11 of 32 rows are continuation rows with only a fuel concentration | Fill from the row above | open |
| 8 | BASS-II (PSI-25), Flame Design inverse (PSI-10) | BASS-II fan and airflow cells hold several settings; 11 Flame Design oxygen cells say `RAMP` or `LOW O2` | Parse multi-value cells as lists; keep labels as labels | partly done: `RAMP`/`LOW O2` become null with flag `o2_not_numeric` |
| 9 | Several | Inconsistent labels: `Inverse`/`inverse`, `Yes`/`yes`/`flash`, `75 % Propylene`/`75% Propylene`, `100%C2H4` | Normalise | open |
| 10 | SAFFIRE, SAME, SLICE, BASS, SAME-R | Rows that are not burns (pre-test flow rows; "same conditions as 1-4"); one malformed SLICE date; one BASS row without test numbers; SAME-R dates without a year | Filter or flag | open |
| 11 | Several | Blank values, e.g. 20 Flame Design rows lack final oxygen and pressure; FLEX extinction diameter filled for 225 of 274 | Keep as null | done for converted fields |
| 12 | BASS-II, BASS, SAFFIRE | No pressure column at all | Needs a sourced cabin-pressure value (CLAUDE.md open question 1) | open |

## Tables that are not one-row-per-test

- Per-day summaries: ACME BRE, CLD Flame, E-FIELD Flames, s-Flame.
- Ranges only: FLEX-2 (8 rows, one per fuel).
- Index of published figures: PSI-142.
- Two sessions only: DAFT / DAFT-2.
- No table in PSI: PSI-60, PSI-62, PSI-115, PSI-117 (ground studies).

## Not downloaded

- Full file inventory per investigation (records list only files added in the latest version).
- Reports, readme files, raw sensor data and video.
- The pages linked from the challenge's Resources tab.
