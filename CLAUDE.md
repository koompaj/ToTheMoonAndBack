# To The Moon And Back - Flame in Freefall

NASA Space Apps 2026 hackathon project. Three people, each working with their own Claude,
build one web dashboard in this repo. Read this file first, then your role brief in `docs/roles/`.

**If your human has not told you which workstream you are (A, B or C), ask before changing anything.**

## The challenge

"Flame in Freefall: SI-Powered Fire Safety Insights from Microgravity Combustion Data."
Build an AI-powered, web-based dashboard that **summarizes, ranks and interprets** the combustion
investigations in NASA's Physical Sciences Informatics (PSI) database to give fire-safety insight for
places where crews live (spacecraft, stations, Moon/Mars bases, pressurized rovers).
Audience: professors, students, aerospace researchers and engineers. Full notes: `docs/CHALLENGE.md`.

## Our idea

**Show what NASA knows about fire for the place a crew will live, and what it has not learned yet.**

1. **3D habitat map.** Every real NASA test is a dot: x = oxygen, y = pressure, z = fuel-type layer
   (solid, droplet, gas). Each habitat is a see-through 3D box. A 2D toggle is required.
2. **Habitat panel.** Click a box: tests inside, nearest evidence outside and how far away it is,
   whether flames go out there, what is untested.
3. **3D flame.** A small flame that goes from Earth teardrop to microgravity blue sphere.
   It is an **illustration, not a simulation**, and must always be labelled as one.
4. **Untapped-data ranking.** Investigations scored by fire-safety relevance against how little they
   have been studied, with an AI-drafted research question.
5. **Cited AI summaries.** Every statement links to a test row and the investigation DOI.
6. **Habitat evidence map** (agreed 2026-11-14): the user uploads a floor plan, marks materials,
   liquids and gas points, and each mark is coloured by how much NASA evidence exists there. An
   evidence map, not a fire simulation: the evidence never depends on where a fire starts. Full
   spec and who builds what: **`docs/LAYOUT_PLAN.md`**.
7. **Illustrated spread** (agreed 2026-11-14): on the Simulation tab the user sets where a fire
   starts and can play, pause and scrub a timeline that shows it reaching more objects in the
   example layout. It is a drawing, not a model, and is bound by the rule "Spread is an
   illustration, never a result" below.

**Headline finding (reproduced by `scripts/build_web_data.py`):** of the tests whose tables record
cabin-air oxygen and pressure, only **20** sit in Moon Base conditions (oxygen >= 30 %, pressure
<= 10.2 psi). All 20 are gas flames from one investigation (ACME CFI-G, PSI-159). **No solid-material
test in the tables reaches 30 % oxygen** (BASS-II tops out at 22.2 %), and only 29 solid tests have a pressure
(from NASA's BASS-II report, at 1 atm). In NASA's own exploration
atmosphere box (8.2 psia / 34 % O2, +-0.2 psia / +-2 %), the tables hold **0** tests. NASA did burn
materials at other pressures and oxygen levels in Saffire-IV to VI, but those results are not in PSI:
say "not in the tables", never "never tested".

## Rules of evidence (non-negotiable)

- **Real NASA data only.** Never invent, estimate or fill in a value. Missing or unusable in the
  source means `null` plus a flag.
- **Everything is traceable.** Each test carries `source_table` and `source_row`; each investigation
  carries its DOI and PSI page. PSI requires DOI citation.
- **`data/` is read-only.** It is NASA's files exactly as downloaded. Fixes go in scripts, never in
  the raw files.
- **Say "not in the tables", not "never tested".** The tables are summaries; reports may hold more.
- **Keep inverse flames separate.** Their oxygen value is burner gas (`o2_basis: "burner_oxidizer"`),
  not cabin air. Never mix them into habitat counts.
- **Publication counts are a signal, not proof.** They are only what PSI lists, and newer releases
  have had less time to be studied. Show this caveat wherever the ranking appears.
- **`gemini_data/` is unverified.** Nothing from it reaches the app or an AI summary until workstream
  A has opened the cited source and confirmed the quote and value (`gemini_data/README.md`).
- **A number shown without a source is a bug.** So is an unlabelled assumption.
- **Spread is an illustration, never a result.** NASA's tables hold no spread rates between
  objects, no room geometry and no partial-gravity data, so any spread we show is our own drawing.
  It is allowed only on the Simulation tab and only within these limits:
  - The order in which objects light comes only from distance in the example layout, and the screen
    says so. It is never presented as what a real fire would do.
  - The timeline counts steps. It never shows seconds, minutes, speeds or any other real unit.
  - No number, ranking, outcome or "safe / destroyed" state is derived from the animation.
  - Evidence does not move with it: colours, card lines, nearest tests and task answers are the
    same wherever the fire starts and whatever step the timeline is on.
  - This label stays on screen whenever spread is shown: "Illustration of spread, not a
    prediction. NASA's tables do not model how fire spreads."
- **Report every issue you find**, however small, with a proposed fix. Do not silently drop one.

## Out of scope

- Video and raw sensor files (about 16,000 GB). We link to PSI instead.
- Rocket and propellant fire safety (the challenge excludes it).

## Repo layout and ownership

| Path | Owner | What it is |
|---|---|---|
| `data/` | A | Raw NASA download. Read-only for everyone. |
| `scripts/` | A | Python (standard library only) that downloads and converts the data. |
| `web/public/data/` | A | Generated JSON the app reads. Never edit by hand. |
| `web/src/data/` | A | Loader and data helpers. |
| `gemini_data/` | A | **Unverified** research answers from Gemini. See its README. |
| `web/src/scene/` | B | 3D map and 3D flame. |
| `web/src/panels/`, `web/src/ai/`, `web/public/ai/`, `ai/` | C | Panels, AI layer and its offline scripts. |
| `web/src/App.tsx`, `main.tsx`, `styles.css` | C | App shell and layout. |
| `docs/` | shared | Briefs and notes. Each role edits its own brief. |

**Only edit files you own.** If you need a change in someone else's area, ask their human, or open
a small pull request that touches only that change.

### Shared files (change only by agreement of all three)

`CLAUDE.md`, `web/src/types/data.ts` (the data contract), `web/src/state/store.ts` (selection state),
`web/package.json` and its lockfile, `web/index.html`, `web/vite.config.ts`, `web/tsconfig.json`,
`.gitignore`. To change one: tell the other two humans first, make that change alone in its own pull
request, and merge it quickly so nobody builds on a stale copy.

## How the three parts connect

- **Data contract:** `web/src/types/data.ts` describes `tests.json`, `investigations.json`,
  `habitats.json`, `other_tables.json` and `data_quality.json`. A produces them; B and C only read
  them. Count unplaced tests with `unplacedTests()` in `web/src/data/load.ts`.
- **Selection state:** `web/src/state/store.ts`. The 3D scene and the panels talk to each other only
  through this store (selected habitat, selected test, inverse-flame toggle, 2D/3D view).
- B and C never import from each other's folders, except `App.tsx` importing the two scene components.

## Commands

```bash
python -I scripts/build_web_data.py data web/public/data
```

```bash
cd web && npm install
```

```bash
cd web && npm run dev
```

```bash
cd web && npm run build
```

`npm run build` type-checks and builds. It must pass on `main` at all times.
The data build ends by running `scripts/validate_data.py` (99 independent checks against the raw
files; 96 when `data_extra/` is absent, because 3 of them re-find quotes in NASA's downloaded documents);
it stops on any failure. To run the checks alone:

```bash
python -I scripts/validate_data.py data web/public/data
```
`python -I scripts/fetch_psi.py data` re-downloads the raw data; you should not need it.

## Git workflow

- Branch per piece of work: `data/<topic>`, `scene/<topic>`, `app/<topic>`.
- Pull `main` before starting and before opening a pull request. Small pull requests, merged often.
- Never commit to `main` directly, never force-push it, never commit secrets or `node_modules`.
- Before opening a pull request: `npm run build` passes, and for A the build script's checks print
  the expected numbers.

## Current state of the baseline

- Raw data downloaded: 24 Combustion Science records and 22 experimental tables (2,009 rows).
- `tests.json`: **1,753 test rows from 12 tables, 1,719 distinct** (34 SPICE rows repeat an earlier
  row; say "1,719 tests", via `distinctTestCount()`) (263 solid, 361 droplet, 1,129 gas).
  274 are inverse-flame (burner-oxidizer) rows. Of the 1,479 cabin-air tests, 884 record an oxygen
  value, 746 record oxygen and pressure, 270 are at >= 30 % oxygen, and 20 are inside the Moon Base
  envelope. 457 tests record airflow. With pressures from NASA's own reports and sensor logs
  (`data_sourced/solid_conditions.json`), **775** tests can be placed, 29 of them solid (BASS-II, 1 atm).
- Every source column is in `tests.json`: typed fields where the unit is clear (solid
  `fuel_material`, SAFFIRE sample size, FLEX droplet and extinction diameters, CFI-G hot ignition and
  peak burner temperature, SPICE ignition and flame-off times), `source_extra` word-for-word for the
  rest. Use `airflowRange()` for airflow ranges (it leaves out NASA's unexplained negative values).
- `other_tables.json`: the 10 tables that are not one-row-per-burn (per-day summaries, ranges,
  smoke tests): `rows` exactly as published, `rows_read_as` with each correction applied and explained.
- `data_quality.json`: what happened to every table and row, what each flag means, and the
  distinct-test count.
- `habitats.json`: 5 places, every number from a source workstream A opened and checked
  (`source_urls`; `gemini_data/VERIFIED.md`): Moon Base (challenge box, 20 tests), Moon Base (NASA
  exploration air, 0 tests), ISS (171), spacesuit (0), Earth sea level (171). ISS and Earth are boxes:
  NASA's +-2 % O2 / +-0.2 psia control band (NASA/TP-2010-216134 p. 11) around 21 % / 14.7 psia, so
  19-23 % and 14.5-14.9 psi; applying that band to these places is our step and the note says so.
- Gravity: every test has `gravity_g` 0 (its PSI record says "Microgravity Investigation"); every
  place has a sourced `gravity` (Moon 0.165 g from the NASA NSSDC Moon Fact Sheet, ISS 0, Earth 1,
  spacesuit 0 or 0.165). `testsInHabitatAndGravity()` (tolerance 0.02 g) matches air and gravity:
  today only the ISS matches (171); it is ready for partial-gravity data (LUCI, FM2 may add some).
  Counts on screen still match air only; each card and place page says whether gravity matches.
- `outcomes.json`: the "will it go out" analysis (`scripts/outcome_analysis.py`). FLEX droplet
  flames went out less often as oxygen rose (17 of 17 at 12-14 %, 0 of 9 at 34-36 %), and the trend
  holds within each fuel and at matched pressure. CFI-G shows no clear pattern. Show its caveats.
- `gemini_data/`: Gemini's answers plus workstream A's check. The team no longer uses Gemini.
- `fuels.json` + `web/src/data/layoutEvidence.ts` + `web/src/types/layout.ts`: the data side of the
  habitat evidence map (18 tested fuel options, their evidence in every place, `markEvidence()`), and
  an example layout in `web/public/layouts/`. See `docs/LAYOUT_PLAN.md` section 6.
- `tests.csv`: every `tests.json` row as one CSV line with its table, row, DOI, oxygen, pressure, shape and flags.
- `places_waiting.json`: places without a card yet (spacecraft cabin, Mars habitat), why, and what would change it.
- Fuel shape (item 10): `Test.fuel_shape`, `fuel_size_text`, `fuel_shape_source`, only where the row or a NASA
  report says so (1,646 rows have a shape, 1,608 a size). BASS and BASS-II shapes come from the row's own fuel cell;
  ACME burners, SPICE nozzles and CFI droplets from reports quoted with page (`data_sourced/shapes.json`); FLEX from
  its droplet-diameter column. SAFFIRE has sizes but no stated shape. The rest are null with `shape_not_stated`.
- Sensors (item 5): `Investigation.sensors` for 11 investigations (55 entries, `data_sourced/sensors.json`), each
  with file, page or sheet and column, and NASA's words. Saffire-I and -III come from the burn sensor logs (header
  and unit rows). An investigation without `sensors` has not been read for them yet.
- `gaps.json` (item 8, `scripts/gaps_analysis.py`): per pillar (prevention, detection, suppression), 27
  statements of what the tables cover and what is not in them, each with its test ids, investigations and caveats.
  Investigations without a stated pillar (ACME, SPICE, CFI) are in no column.
- All 22 tables are accounted for: 2,009 source rows = 1,753 tests + 247 in other tables + 9 left
  out (listed with reasons). Remaining source problems: `docs/DATA_ISSUES.md`.
- The web app builds and shows: a stub 3D map, a stub flame, a habitat panel with live counts, and a
  stub untapped-data table. Stubs are marked `BASELINE STUB` at the top of the file.

## Open questions (owner in brackets)

1. **[A] Pressure for solid-material tests (partly resolved).** NASA's own files in PSI give it for 55 of the
   263 solid tests: 29 BASS-II at 1 atm (now placed), 22 BASS-II as a 99.2-99.5 kPa range and 4 Saffire burns as
   sensor-log ranges (not placed). BASS's 121 tests and BASS-II's other 78 still have none; the BASS Final
   Report is a broken link on NASA's side. See `docs/PSI_DOCUMENTS.md`.
2. **[A] Habitat numbers.** Done for ISS, Earth and NASA's Moon Base box. Spacecraft cabin
   (Orion), lunar lander and Mars habitat stay "waiting": only superseded 2010-11 proposals found.
3. **[C] "Will it go out" on screen.** The analysis is in `outcomes.json` (verdicts, counts, test
   ids, caveats). Showing it on the place and fire pages is C's call.
4. **[C] AI layer.** Default: summaries generated offline by a script and saved as JSON with
   citations, so no API key is ever in the browser or the repo. Live question-answering needs a small
   server function and is a stretch goal.
5. **[B] 2D view.** Required, because exact values are hard to read in 3D.
6. **[C] Resources-tab pages** (Researcher's Guide, NASA Combustion Science overview, incident pages)
   are not downloaded. Fetch them if the AI summaries need them.
7. **[A] Full file inventory per investigation** is not downloaded (records list only the files added
   in the latest version). Needed only for file-level links.
8. **[all] Judging criteria.** Check the official Space Apps 2026 criteria and tune the demo to them.
9. **[C] Deployment.** Not set up. The build is a static site with a relative base path.
10. **[A and C] Single-point habitats.** Resolved 2026-11-14 for ISS and Earth: they use NASA's
    control band (19-23 % O2, 14.5-14.9 psi; 171 tests each), labelled as our step. The spacesuit
    stays one point (100 % O2, 4.3 psi; 0 tests), which the habitat panel words as "exactly these values".
11. **[B or C] Bundle size.** The build warns that the script is over 500 kB (three.js). Harmless
    now; loading the 3D scene lazily would fix it.
12. **[B] Library warning.** The browser console shows "THREE.Clock is deprecated", raised inside
    react-three-fiber with the newest three.js. Nothing in our code triggers it directly.
