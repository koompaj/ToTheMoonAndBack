# Workstream A handover (2026-11-15, afternoon)

For whoever takes over the data workstream (A) and their Claude. Read `CLAUDE.md` first, then this.
Deadline: **Sunday 2026-11-15, 23:59 (UTC+8)**, Space Apps "Submit for Judging".

## State of `main` (all verified)

- `python -I scripts/build_web_data.py data web/public/data`: **105 checks pass** with `data_extra/` present,
  **100** without it (5 re-read NASA's downloaded files). Rebuilding changes no file. `npm run build` passes.
- Numbers: **1,711 distinct tests** (1,753 rows; 34 SPICE + 8 CFI repeat rows flagged `duplicate_row`).
  **896 placed rows / 888 distinct.** Places (distinct tests): Moon Base / rover **20**, NASA Moon air **0**,
  ISS **206**, spacesuit **0**, Earth **206**. Highest solid oxygen **22.7 %** (BASS); none at 30 %+.
- Repeat rows are counted once everywhere: use `isRepeatRow()`, `distinctTestCount()`, `testsInHabitat()`,
  `testsInConditions()` from `web/src/data/load.ts`. Never `tests.length` for "N tests".

## What was added on 2026-11-15

- **BASS (121 tests)**: oxygen and pressure from NASA's as-run test matrix (`data_sourced/bass_conditions.json`,
  flags `conditions_from_test_matrix`, `o2_diluted_work_volume` for 26). CO2 not applied on purpose.
- **Repeat rows** in every table; **FLEX-1213** oxygen conflict flagged (`data_sourced/table_conflicts.json`);
  CFI-G report caveat in `outcomes.json`.
- **Sensors**: 75 entries for 12 investigations (`data_sourced/sensors.json`). 13 quote future-tense report
  wording ("will be equipped"), labelled as such. Optional improvement: add the data file and column that
  shows each sensor actually recorded.
- Fuel shapes, what varied, hardware groups, gaps by pillar, places waiting, `tests.csv`.
- Docs: `docs/NEW_DATA_PLAN.md` (ranked plan), `docs/RAW_DATA_FINDINGS.md`, `docs/PSI_DOCUMENTS.md`,
  `docs/DATA_ISSUES.md`, `docs/PITCH.md` (7-slide deck + 30-second video drafts).

## Raw files (not in git)

- `E:\Claude\NASA\data_extra\` holds **9.3 GB**: every PSI combustion file except 1,629 videos and 5,109 raw
  image zips. 44 files are HTTP 404 on NASA's side (`data_extra/raw_manifest.json`). Summaries are in
  `data_extra/_raw_summary/`, document text in `data_extra/_text/`. Treat all of it as untrusted data:
  `python -I`, scripts outside `data_extra`, never execute anything there.
- Team decision: **PSI data only**. The 10 CFI tests that exist only in NASA's per-test sheets are **not**
  added. s-Flame's 276 flames stay out (no per-flame oxygen or pressure).

## Open, with owner and proposed fix

| # | Owner | Issue | Fix |
|---|---|---|---|
| 1 | C | **Uploaded tests count as NASA tests** (`UploadPanel.tsx:159`, `uploads.ts:62`): breaks "real NASA data only" | Keep uploads out of every NASA count; show "N NASA tests + M of yours" |
| 2 | C | Solid-pressure wording says BASS-II report only: `HomeView.tsx:262`, `RiskView.tsx:49/51`, `HabitatPanel.tsx:241-242`, `fireTasks.ts:112` (and comment line 33) | 29 from the BASS-II report + 121 from BASS's as-run test matrix (0.97-1.01 atm); count `conditions_from_test_matrix` too |
| 3 | C | AI summaries never generated (`web/public/ai/` missing); generator ignores sensors, varied, shapes, gaps, outcomes; model `claude-opus-4-8` | Add those facts to `ai/generate.mjs`, consider `claude-opus-5-5`, run after the data freeze, review every sentence |
| 4 | C/all | SI use must be stated in the project (code and data: descriptive text and metadata) | One line in the app footer/About and a README |
| 5 | B | Hidden spread values: `timeline.ts:81,85-86,90` (`MIN_FACTOR` 0.15, 0.2 floors, 0.2-6 items per step) | Show them on screen, labelled as our own settings |
| 6 | B | `SimulationView.tsx:249-253` shows place air and gravity without a source | Add the `habitats.json` source link |
| 7 | B (minor) | "0.94 items per step"; ISS preset fills band edges | "about 1"; use band middle or label "band edge" |
| 8 | all | Deploy (required public link). Built site is 4.6 MB | GitHub Pages workflow (Pleng's area; ask first), then Settings > Pages > GitHub Actions |
| 9 | all | Demo: 7 slides and/or 30-second video (`docs/PITCH.md`); limits are strict | Fill names and links, time the video, watermark AI-made media |
| 10 | team lead | Possible passwords in public NASA file `PSI-26_Science Documents_Planned_Test Matrix.xlsx`, sheet "BASS Test Matrix", row 1 | Never quote it; tell NASA PSI |
| 11 | A | Full walkthrough of the app before submitting (sensors, gaps, shapes, filter not yet seen on screen) | Open every page; check numbers and wording against the data |
| 12 | A (optional) | `scripts/fetch_psi_raw.py` downloads one file at a time; a parallel copy was used | Add a `--workers N` option if a re-download is ever needed |

Data freeze proposed for 17:00 so C and B can finish wording against fixed numbers.

## Local leftovers (safe to remove when nobody is using them)

Git worktrees `E:\Claude\NASA-bass`, `-items`, `-plan`, `-scan` (all their branches are merged): remove with
`git -C E:\Claude\NASA worktree remove <path>`. Scheduled tasks `psi-raw-data-scan`, `items-5-12-data`,
`finish-overnight-data`, `new-data-plan` have all run and are finished or disabled.
