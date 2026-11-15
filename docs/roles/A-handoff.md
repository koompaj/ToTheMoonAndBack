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

## Done since this note was first written (checked on `main` at 56e6969)

- Uploaded tests no longer change NASA's counts ("NASA's own counts don't change"; own "Your Uploads" group).
- Solid-pressure wording names both the BASS-II report and BASS's test matrix.
- Spread: fixed limits (15 % distance floor, rule floor, 0.2-6 items per step) are on screen; place air and
  gravity show their sources; items per step read "about N"; presets use the middle of a band.
- AI: two live features through server code (Google Gemini: review of an uploaded experiment, floor-plan
  picture to 3D), each labelled as AI output. README states AI use, including Claude's help with the code.
- Site is set up for Vercel (`web/vercel.json`, `web/api/*.js`).

## Still open

| # | Owner | Issue | Fix |
|---|---|---|---|
| 1 | all | **Deploy** and confirm the public link works with no login; the Gemini key goes in Vercel's environment settings, never in the repo | Deploy on Vercel; open the link in a private window; optionally request a FortiGuard classification |
| 2 | C (optional) | Offline Claude summaries (`ai/generate.mjs`) never generated; README says so honestly | Skip, or run it after the data freeze and review every sentence |
| 3 | all | Demo: 7 slides and/or 30-second video (`docs/PITCH.md`); limits are strict | Fill names and links, time the video, watermark AI-made media |
| 4 | team lead | Possible passwords in public NASA file `PSI-26_Science Documents_Planned_Test Matrix.xlsx`, sheet "BASS Test Matrix", row 1 | Never quote it; tell NASA PSI |
| 5 | A | Full walkthrough of the deployed app (sensors, gaps, shapes, filter, uploads, AI labels) | Open every page; check numbers and wording against the data |
| 6 | A (optional) | Sensor entries quoting future-tense report text (13) | Add the data file and column that show each sensor recorded |
| 7 | A (optional) | `scripts/fetch_psi_raw.py` downloads one file at a time | Add `--workers N` if a re-download is ever needed |

Data freeze proposed for 17:00 so C and B can finish wording against fixed numbers.

## Local leftovers (safe to remove when nobody is using them)

Git worktrees `E:\Claude\NASA-bass`, `-items`, `-plan`, `-scan` (all their branches are merged): remove with
`git -C E:\Claude\NASA worktree remove <path>`. Scheduled tasks `psi-raw-data-scan`, `items-5-12-data`,
`finish-overnight-data`, `new-data-plan` have all run and are finished or disabled.
