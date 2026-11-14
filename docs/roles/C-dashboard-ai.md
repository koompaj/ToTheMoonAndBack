# Workstream C - Dashboard, panels and AI

You own the words, the ranking and the overall product. Read `CLAUDE.md` first.

## You own

`web/src/panels/`, `web/src/ai/`, `web/public/ai/`, `ai/` (offline AI scripts),
`web/src/App.tsx`, `web/src/main.tsx`, `web/src/styles.css`.

## Where things stand

Branch `peach/dashbard`. **The user flow (Home -> place -> fuel fire -> point on the map) and B's
side of it are specified in `docs/PLAN.md`.**

- **Flow pages**: `HomeView` (animated summary of every place, future places as "waiting for a
  source" slots in `panels/places.ts`), `PlaceView` (`#place?h=`), `FireView` (`#fire?h=&fuel=`,
  with slots for B's `FireModel3D` and `HabitatSimMap`, contract in `web/src/types/sim.ts`).
  `web/src/ai/fireTasks.ts` computes nearest tests, expected behaviour and the three tasks.
- **App shell** (`App.tsx`, `styles.css`): tabs Home (`#map`), Experiments (`#experiments`, the 24 experiments with an experiment search and a
  test search; `?id=PSI-25` opens one experiment with all its tests) and Risk (`#risk`, gaps in plain
  words plus the scrollable relevance ranking). A right-edge Earth Benefits tab opens a drawer
  (spinoff cards, then prevention / suppression / detection). Compare: star up to 3 experiment cards
  (picks in `?cmp=`); the Experiments page then splits 1/3 cards : 2/3 comparison table, which can
  expand, shrink to a strip (`?cmpview=`) and download as CSV.
  Old links (`#tests`, `#investigations`, `#untapped`, `#earth`, `#quality`) redirect. Dark space
  theme, 16px type, one colour per meaning; system fonts only so the demo works offline.
- **Investigation cards** (task 2, done) with **pillar navigation** (task 5, done: pillars only
  where the challenge page states them).
- **Untapped ranking** (task 4, done): relevance points with a stated reason each, rows per listed
  paper, a chart, the reuse network, the caveat on screen.
- **Data quality view**: every table and flag from `data_quality.json`.
- **AI layer** (task 3, built, not yet run): `ai/generate.mjs` writes cited summaries to
  `web/public/ai/` from fact packs and rejects any sentence whose numbers or citations are not in
  them. Needs an API key on a team laptop; see `ai/README.md`. The app shows no AI text until then.
- **Shared logic**: `web/src/ai/evidence.ts` holds every computed number; the app and the AI script
  both use it.
- **Demo script** (task 7): `docs/DEMO.md`. Deployment still open.

## Tasks, in priority order

1. **Habitat panel.** For the selected habitat show: tests inside (by fuel class and investigation,
   each linked and cited), the nearest evidence outside and how far away it is in oxygen and
   pressure, "will it go out" (from workstream A's analysis), and what is untested.
2. **Investigation cards.** Plain-language summary of each of the 24 investigations: what was
   burned, under what conditions, what was measured, DOI and PSI link. The fields are in
   `investigations.json` (`objectives`, `approach`, `hypothesis`, `earth_benefits`, `hardware`).
3. **AI layer.** Default design: an offline script in `ai/` calls the Claude API, writes summaries
   with citations to `web/public/ai/*.json`, and the app only reads that JSON. The API key lives in
   a local `.env` that is never committed, and never reaches the browser. Before writing API code,
   check the current Claude API docs for model names and usage; do not rely on memory.
4. **Untapped-data ranking.** A fire-safety relevance score against how little an investigation has
   been studied, plus the reuse network (which ground studies built on which flight data) and an
   AI-drafted research question per investigation. Always show the "signal, not proof" caveat.
5. **Prevention / detection / suppression** as a way to navigate. `investigations.json` has `pillar`
   only where the challenge page states it; classifying the rest needs a stated reason per case.
6. **Earth benefits** view, if time allows, from the `earth_benefits` field and the spinoff pages.
7. **Demo script and deployment.** A two-minute walk-through that opens on the headline finding.
   Static hosting; the build already uses a relative base path.

## Rules for you

- **Every AI sentence shown to a user carries a citation** (test rows and/or DOI). If the data does
  not cover the question, the text says so. Generated text that states a number must take it from the
  JSON, not from the model's memory.
- Review generated summaries before committing them. A wrong claim in front of judges costs more
  than a missing one.
- Read data only through `web/src/types/data.ts` and `web/src/data/`. Do not import from
  `web/src/scene/` except the two components `App.tsx` already uses.
- Never mix inverse-flame tests into habitat counts.
- Need a new store field or a new library? Both are shared files: agree it first.

## Done means

Someone who has never heard of PSI can pick a habitat and read, with sources, what is known, what
is missing and which data could answer it.
