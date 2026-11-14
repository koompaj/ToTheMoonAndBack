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

**Headline finding (reproduced by `scripts/build_web_data.py`):** of the tests whose tables record
cabin-air oxygen and pressure, only **20** sit in Moon Base conditions (oxygen >= 30 %, pressure
<= 10.2 psi). All 20 are gas flames from one investigation (ACME CFI-G, PSI-159). **No solid-material
test in the tables reaches 30 % oxygen** (BASS-II tops out at 22.2 %).

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
`python -I scripts/fetch_psi.py data` re-downloads the raw data; you should not need it.

## Git workflow

- Branch per piece of work: `data/<topic>`, `scene/<topic>`, `app/<topic>`.
- Pull `main` before starting and before opening a pull request. Small pull requests, merged often.
- Never commit to `main` directly, never force-push it, never commit secrets or `node_modules`.
- Before opening a pull request: `npm run build` passes, and for A the build script's checks print
  the expected numbers.

## Current state of the baseline

- Raw data downloaded: 24 Combustion Science records and 22 experimental tables (2,009 rows).
- `tests.json`: **1,753 real tests from 12 tables** (263 solid, 361 droplet, 1,129 gas).
  274 are inverse-flame (burner-oxidizer) rows. Of the 1,479 cabin-air tests, 884 record an oxygen
  value, 746 record oxygen and pressure, 270 are at >= 30 % oxygen, and 20 are inside the Moon Base
  envelope. 457 tests record airflow.
- `other_tables.json`: the 10 tables that are not one-row-per-burn (per-day summaries, ranges,
  smoke tests), cells exactly as published.
- `data_quality.json`: what happened to every table and row, and what each flag means.
- All 22 tables are accounted for: 2,009 source rows = 1,753 tests + 247 in other tables + 9 left
  out (listed with reasons). Remaining source problems: `docs/DATA_ISSUES.md`.
- The web app builds and shows: a stub 3D map, a stub flame, a habitat panel with live counts, and a
  stub untapped-data table. Stubs are marked `BASELINE STUB` at the top of the file.

## Open questions (owner in brackets)

1. **[A] Pressure for solid-material tests.** BASS-II, BASS and SAFFIRE tables have no pressure
   column, so none of the 263 solid tests can be placed on the map (140 of them do record oxygen,
   highest 22.2 %). Needs a sourced cabin-pressure value (Gemini task G2).
2. **[A] Habitat numbers.** The challenge gives numbers for the Moon Base, spacesuit and Earth
   pressure only. ISS and Mars habitat boxes need a NASA source. A candidate Moon Base nominal point
   (8.2 psi, 34 % oxygen) is unverified: confirm against a NASA source before using it.
3. **[A then C] "Will it go out".** Nobody has checked whether FLEX and CFI-G outcomes form a clear
   enough pattern to chart.
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
10. **[A and C] Single-point habitats.** Earth sea level and the spacesuit are one oxygen value and one
    pressure value, so `testsInHabitat` matches only tests with exactly those numbers (34 for Earth,
    0 for the spacesuit). Decide a tolerance and state it on screen, or show nearest tests instead.
11. **[B or C] Bundle size.** The build warns that the script is over 500 kB (three.js). Harmless
    now; loading the 3D scene lazily would fix it.
12. **[B] Library warning.** The browser console shows "THREE.Clock is deprecated", raised inside
    react-three-fiber with the newest three.js. Nothing in our code triggers it directly.
