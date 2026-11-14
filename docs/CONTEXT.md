# CONTEXT - where the project stands, for a teammate's Claude

Read this after `CLAUDE.md`. It explains what workstream C (dashboard + AI) built on branch
`peach/dashbard` (pull request #2), why it is shaped this way, and how your work plugs into it.
`docs/PLAN.md` is the detailed spec for workstream B's two components; this file is the overview.
Last updated when PR #2 was opened.

---

## 1. The product in one paragraph

A web dashboard for NASA Space Apps 2026, "Flame in Freefall". It answers: **"For a place where a
crew will live (Moon Base, spacesuit, Earth, later ISS and Mars), what does NASA's microgravity fire
data say, what is missing, and how would a fire there be detected, stopped and prevented?"** Every
number comes from NASA's PSI tables (`web/public/data/`, produced by workstream A) and carries a
citation (test row or DOI). Nothing is estimated. The headline: only 20 of 746 placeable tests ran in
Moon Base air, all gas flames from one experiment (ACME CFI-G); no solid material in the tables goes
above 22.2 % oxygen, and none of the 263 solid tests records pressure.

## 2. The user flow (agreed with the team)

| Step | URL hash | What the user sees | Owner |
|---|---|---|---|
| 1 Home | `#map` | Hero ("What does NASA know about fire where crews live?"), number strip, a card per place (plus "waiting for a NASA source" cards), five animated clickable charts | C, done |
| 2 Place | `#place?h=moon_base` | That place's air, tests in it by fuel, closest evidence outside, how flames ended, what is not in the tables; three fuel cards (gas, droplet, solid) | C, done |
| 3 Fire | `#fire?h=moon_base&fuel=gas` | **3D fire (B's slot)** driven by oxygen / pressure / airflow / gravity sliders; "Expected behaviour" = what the 5 nearest real tests did; three task cards: Detection, Suppression, Prevention | Slot: B. Rest: C, done |
| 4 Point | same page, lower | **Clickable habitat map (B's slot)** with the place illustration beside it; a click and the sliders move the same fire point | Slot: B. Wiring: C, done |

Top navigation: **Home · Experiments · Risk**. A right-edge **Earth Benefits** tab opens a drawer on
every page.

## 3. Pages and what each is for

- **Home** (`panels/HomeView.tsx`): the wide summary. Clicks lead into the flow or into Experiments.
- **Place** (`panels/PlaceView.tsx`): reuses `panels/HabitatPanel.tsx` in `embedded` mode for the
  evidence, plus the fuel chooser.
- **Fire** (`panels/FireView.tsx`): the main interactive page. State lives in the URL (`h`, `fuel`,
  `o2`, `p`, `air`, `g`), so links reopen the same fire.
- **Experiments** (`panels/ExperimentsView.tsx` + `panels/InvestigationsView.tsx` + `panels/TestsView.tsx`):
  the 24 PSI investigations as cards with two searches (experiments, tests). `#experiments?id=PSI-25`
  opens one experiment: its PSI text and every test it ran (scrollable table, filters, test detail).
  **Compare**: star up to 3 cards (`?cmp=PSI-25,PSI-69`); the page splits 1/3 cards : 2/3 table
  (`panels/CompareDrawer.tsx`, exports `ComparePanel`), with Expand, Shrink (`?cmpview=split|full|min`)
  and CSV download.
- **Risk** (`panels/RiskView.tsx`): plain-language gaps. A place × fuel grid (coral = not tested),
  six "biggest gaps" cards (what, why it matters, source), then the relevance vs. study-depth ranking
  (`panels/UntappedPanel.tsx`, embedded) with the "signal, not proof" caveat.
- **Earth Benefits drawer** (`panels/EarthDrawer.tsx`, opened by `panels/EdgeTab.tsx`): four spinoff
  cards (paraphrasing the challenge Resources tab), then prevention / suppression / detection
  sub-tabs listing experiments the challenge page places under each pillar.
- Removed on purpose: Data Quality tab, How to Read tab, separate Test Explorer and Compare tabs.
  Old hashes (`#tests`, `#investigations`, `#untapped`, `#compare`, `#earth`, `#quality`) redirect
  (see `ALIASES` in `App.tsx`).

## 4. Code map (C's files)

| File | Purpose |
|---|---|
| `web/src/App.tsx` | Shell, top nav, hash routing, **the two B slots** (`renderFire`, `renderMap`) |
| `web/src/styles.css` | All styling (design tokens at the top) |
| `web/src/ai/evidence.ts` | Pure functions: habitat evidence, headline numbers, investigation stats, relevance score with reasons, reuse links. Type-only imports so Node can run it |
| `web/src/ai/fireTasks.ts` | Pure functions: `nearestTests`, `expectedBehaviour`, `taskAnswers` (detection / suppression / prevention statements, each `kind: 'data' \| 'gap'` with cites), `defaultPoint` |
| `web/src/ai/content.ts` | Loads optional AI JSON from `web/public/ai/` (`habitats.json`, `investigations.json`, `fire.json`) |
| `web/src/types/sim.ts` | **Proposed shared contract** for B's components (`SimPoint`, `FireParams`, `ExpectedBehaviour`, `FireModelProps`, `HabitatSimMapProps`) |
| `web/src/panels/route.ts` | `useHashParam(key, fallback)`: filter state in the URL hash, synced across components via a `hashparams` event |
| `web/src/panels/ui.tsx` | Shared bits: `Choice` (toggle group), `Kpi`, `Step`, `PanelHead`, `ViewHead`, fuel and pillar tags |
| `web/src/panels/Cite.tsx` | `TestCite` (selects a test via the store), `DoiCite`, `SentenceCites` |
| `web/src/panels/charts.tsx` | SVG/CSS charts: `StackRow`, `Histogram`, `Donut` (animated, reduced-motion safe) |
| `web/src/panels/SpaceArt.tsx` | Inline SVG illustrations: Moon, RingedPlanet, Earth, Sun, StarArt, RocketPath, Stars, `PlaceArt` |
| `web/src/panels/places.ts` | `FUTURE_PLACES` (expansion slots, no numbers), display names, which art each place uses |
| `ai/generate.mjs` (+ own `package.json`) | Offline AI generator (see section 7) |
| `docs/PLAN.md`, `docs/DEMO.md` | B's spec; the two-minute demo script |

C does **not** edit `web/src/scene/`, `web/src/data/`, `web/public/data/`, `scripts/`, `data/`.

## 5. How the parts connect

```
data/ (raw NASA, A)  ->  scripts/build_web_data.py (A)  ->  web/public/data/*.json
                                                              |
web/src/data/load.ts (A: loadData, testsInHabitat, unplacedTests)
                                                              |
web/src/ai/evidence.ts, fireTasks.ts (C, pure)  <-  also imported by ai/generate.mjs (Node)
                                                              |
panels/* (C)  --render props-->  scene/* (B)        state/store.ts (shared selection state)
```

- Habitats are **data-driven**: whatever `habitats.json` lists appears everywhere. A future place in
  `FUTURE_PLACES` disappears automatically once a habitat with the same `id` exists.
- B's components get everything through props (`types/sim.ts`); the store still carries
  `selectedHabitatId`, `selectedTestId`, `showBurnerOxidizer`, `view`.
- C imports from `scene/` only in `App.tsx` (CLAUDE.md rule).

## 6. Evidence rules as C applied them

- "Expected behaviour" on the fire page is **what the nearest real tests did**, labelled "not a
  prediction". Distance counts 1 percentage point of oxygen = 1 psi (shown on screen). Solid tests
  have no pressure, so they are compared by oxygen only, and the page says so.
- Gaps are written as "not in the tables", never "never tested", and shown in coral.
- Point habitats (Earth, spacesuit) count exact matches only; the UI leans on "closest evidence"
  instead of inventing a tolerance (CLAUDE.md open question 10).
- Text from PSI records is shown as published (labelled "(PSI)" or "Why it matters"). Spinoff text
  paraphrases the challenge page and links the NASA page.
- Relevance score: +30 pillar named on the challenge page, +25 burns solids, +20 cabin oxygen
  >= 30 %, +15 pressure <= 10.2 psi, +10 records airflow. Every point is listed with its reason on
  screen. Study depth = table rows per paper PSI lists, always with the caveat.
- Inverse-flame tests (`o2_basis: "burner_oxidizer"`) never count toward a habitat.

## 7. The AI layer ("SI-powered")

- The browser never calls a model and never sees a key. `ai/generate.mjs` runs on a laptop:
  builds **fact packs** with the same code the app uses, asks Claude (`claude-opus-4-8`, structured
  JSON output, official `@anthropic-ai/sdk`) for short cited sentences, and **rejects** any sentence
  with a number or citation not in its fact pack (`ai/out/rejected.txt`).
- Outputs: `web/public/ai/habitats.json` (habitat summaries), `investigations.json` (summary +
  research question per experiment), `fire.json` (suggestions per `habitat:fuel` for the three tasks,
  shown as "AI suggestion, not from the tables").
- Files are written with `"reviewed": false`; the UI labels them "draft, not reviewed" until a person
  sets `"reviewed": true` and `"reviewed_by"`.
- **Status: not run yet** (no key on C's machine). `cd ai && npm install && npm run facts` works
  without a key (fact packs only); `npm run generate` needs `ANTHROPIC_API_KEY` or `ant auth login`.

## 8. Design system

- Dark space theme after the Linear DESIGN.md (awesome-design-md), charcoal cards with rounded
  header bars (`PanelHead`: gold circle, title, three colour squares), 16px base type.
- **One colour per meaning, everywhere:**
  fuel: solid `#ff8a3d`, droplet `#4fc3f7`, gas `#b388ff` (match `scene/scale.ts`);
  pillar: prevention `#34d399`, detection `#f472b6`, suppression `#60a5fa`;
  evidence teal `#2dd4bf`, gap coral `#ff6b6b`, caveat amber `#fbbf24`, Moon Base / selected gold `#ffcc29`.
- Plain coloured circles instead of icons (the team found icon tiles looked "AI-made").
- System fonts only, no runtime network assets: the demo must work offline.
- The user asked for Title Case on headings, buttons and tabs; sentence case in body text.

## 9. What each teammate should know

**Workstream B (3D):** build `web/src/scene/FireModel3D.tsx` and `web/src/scene/HabitatSimMap.tsx`
exactly as `docs/PLAN.md` describes, then swap the two lines marked "workstream B slots" in
`App.tsx` (pre-agreed; or ask C). Until then `Flame3D` and `HabitatMap3D` stand in. Review
`web/src/types/sim.ts` and say if you need different props. Home no longer shows the general 3D map;
whether it returns is your call (PLAN.md section 9).

**Workstream A (data):** nothing in C's code hard-codes counts. When you add ISS or Mars to
`habitats.json` (with ids `iss`, `mars_habitat` to replace the slots, or any id), they appear on Home,
Risk and the flow automatically. If you add a "will it go out" analysis, C would show it on the
place and fire pages (CLAUDE.md open question 3). Field renames in `types/data.ts` would break C's
pages, so tell C first.

## 10. Run and check

```bash
cd web && npm install
```

```bash
cd web && npm run dev
```

```bash
cd web && npm run build
```

Build must pass (the >500 kB three.js chunk warning is known, open question 11). There are no
automated tests or CI on GitHub; check by clicking through: Home -> a place card -> a fuel card ->
move sliders; Experiments -> search tests "PMMA" -> star two cards -> CSV; Risk; Earth tab.

## 11. Open items

1. AI layer not run (needs a key) and its output not reviewed.
2. B's `FireModel3D` and `HabitatSimMap` not built yet.
3. `showBurnerOxidizer` has no on-screen toggle since the home map moved (suggested for B's map).
4. ISS / Mars air numbers need a NASA source (A).
5. "Will it go out" pattern not analysed (A then C).
6. Deployment not set up (static build, relative base path).
7. `index.html` has no `theme-color` meta (shared file).
