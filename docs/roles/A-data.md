# Workstream A - Data

You own the truth of every number in the app. Read `CLAUDE.md` first.

## You own

`data/` (read-only raw files), `scripts/`, `web/public/data/`, `web/src/data/`, `docs/DATA_ISSUES.md`,
`gemini_data/`.

## Gemini research

The team uses Gemini to find facts missing from the tables (prompt and tasks in
`gemini_data/PROMPT.md`). You are the gate: open each item's `source_url`, find the quote and the
value, and log the result in `gemini_data/VERIFIED.md`. Only verified items may enter the pipeline,
each carrying its source URL. Tasks G1 and G2 answer your tasks 1 and 2 below.

## Where things stand

`scripts/build_web_data.py` accounts for all 22 tables: 12 become `tests.json` (1,753 tests), 10 are
published as-is in `other_tables.json`, and 9 non-test rows are left out with reasons in
`data_quality.json`. It also writes `investigations.json` and `habitats.json`. It prints checks at
the end; the Moon Base count must stay at 20 unless you can explain the change.

Done so far: task 2 (ISS, Earth and NASA's Moon Base box; other places stay "waiting"), task 3
(tables), task 4 (airflow, except BASS-II whose display units are unknown), task 5
(`outcomes.json`), task 7 (`data_quality.json`, with the distinct-test count), the Gemini check
(`gemini_data/VERIFIED.md`) and the data part of the submission (`docs/SUBMISSION_DATA.md`).
Still open: task 1 (blocked: no openable source), task 6 inputs beyond what `investigations.json`
already gives, and the columns under "Not converted yet" in `docs/DATA_ISSUES.md`.

## Tasks, in priority order

1. **Unblock the solid layer.** Find a NASA source for the pressure of the BASS-II tests (they ran in
   the Microgravity Science Glovebox on the ISS). Record the value, the source and its URL, and add
   it with a flag such as `pressure_from_source`, not as if the table said it. Until then the 129
   solid tests cannot be placed on the map.
2. **Habitat boxes.** Add ISS and Mars habitat to `habitats.json` only with a NASA source. Verify or
   drop the candidate Moon Base nominal point (8.2 psi, 34 % oxygen).
3. **Convert the remaining tables,** working through `docs/DATA_ISSUES.md`. Suggested order:
   SAFFIRE-I/II/III and BASS (solid materials), SPICE and SAME-R (airflow), then the per-day ACME
   tables, FLEX-2 and SLICE. Decide per table whether a row is a test; if it is a per-day summary or
   a range, give it its own clearly named file rather than forcing it into `tests.json`.
4. **Fill `airflow_cm_s`** where tables record it (BASS-II, SAFFIRE, SPICE, SAME, SAME-R).
5. **"Will it go out" analysis.** Check whether FLEX (`outcome`, `co2_fraction`, `he_fraction`,
   oxygen) and CFI-G (`outcome`) show a pattern clear enough to chart. Report what you find, including
   if the answer is no. Hand a small JSON to workstream C.
6. **Untapped-data inputs.** Per investigation: test count, publications listed, release date,
   relevance signals. Hand to workstream C.
7. **Data-quality report.** A page or JSON listing every source problem and what the pipeline did
   about it. This is a deliverable in its own right.

## Rules for you

- Python standard library only, run with `python -I`.
- Never edit files in `data/`. Never hand-edit files in `web/public/data/`.
- A value you cannot read exactly becomes `null` with a flag. No guessing "037 mm" into 0.37 without
  a flag saying so.
- Any change to field names or meanings is a change to `web/src/types/data.ts`, which is a shared
  file: agree it with B and C first. Adding a new optional field is the low-friction path.
- When you change the output, re-run the build script and paste its checks into the pull request.

## Done means

All 22 tables accounted for (converted, or listed with the reason they are not tests), every null
explained by a flag, and the checks reproducible by anyone with one command.
