# Workstream B - implementation plan

**Status: steps 0 to 2 approved and built (2026-11-14), not yet committed. Steps 3 to 6 not started.**
Written 2026-11-14 from `main` at `4022394` (layout spec and workstream A's layout data merged).

This is B's own working plan. The specs it follows are `CLAUDE.md`, `docs/roles/B-3d.md`,
`docs/PLAN.md` (written by C for B) and `docs/LAYOUT_PLAN.md`. Where this file and a spec disagree,
the spec wins and this file is wrong.

Change log:
- 2026-11-14: order changed at B's human's request: `FireModel3D` first, then `HabitatSimMap`, then
  `LayoutCanvas`. The separate "shared helpers" step is folded into the components that need it.

---

## 1. What B has to deliver

| # | Component | Spec | Where it appears | State today |
|---|---|---|---|---|
| 1 | `FireModel3D` | `docs/PLAN.md` section 4 | Fire page (`#fire?h=...&fuel=...`), top stage, 320 px tall. Reused by the Layout page's "Start a Fire Here". | Not built. The baseline `Flame3D` stands in and only reacts to gravity. |
| 2 | `HabitatSimMap` | `docs/PLAN.md` section 5 | Fire page, "Step 4 - Pick Where the Fire Starts", 460 px tall (340 px on phones) | Not built. The baseline `HabitatMap3D` stands in; clicking it does nothing. |
| 3 | `LayoutCanvas` | `docs/LAYOUT_PLAN.md` section 7 | New Layout page (`#layout?h=...`), which C builds | Not built. No longer blocked: A's `types/layout.ts`, `fuels.json` and `layoutEvidence.ts` are on `main`. |
| 4 | Wiring | `docs/PLAN.md` section 6 | Two lines and two imports in C's `web/src/App.tsx` | Pre-agreed with C. |

`docs/PLAN.md` replaces tasks 4 to 6 of B's brief (2D view, inverse flames, flame) with components
1 and 2. Tasks 1 to 3 of the brief (readable map, interaction, show the gap) now apply inside
`HabitatSimMap`. The all-tests 3D map (`HabitatMap3D`) is shown nowhere once component 2 is wired
in; whether it comes back on the home page is open question Q3 below.

### Rules B must keep (from the specs)

- B draws what C passes in. B never computes an outcome, a nearest test or a count that C or A
  already provides.
- Both fire pictures are **illustrations, not simulations**. No number is ever derived from the
  picture. Nothing spreads; no physics model.
- B's components are controlled: draw from props, report clicks through callbacks, keep no copy of
  the fire point or the marks.
- Never hard-code a habitat. `habitats.json` has 5 today and A may add more.
- Tests with `pressure_atm === null` are never given a position (all 263 solid tests today).
- Inverse flames are drawn only when the store's `showBurnerOxidizer` is on, visibly different, and
  never counted toward a habitat.
- No network at runtime: procedural geometry and shaders only.
- B edits only `web/src/scene/` and this brief. No imports from `web/src/panels/` or `web/src/ai/`.
- Shared files (`types/sim.ts`, `types/layout.ts`, `types/data.ts`, `state/store.ts`,
  `package.json`) change only by agreement.

---

## 2. Order of work and branches

| Step | What | Branch | Depends on | Size |
|---|---|---|---|---|
| 0 | Environment check | none | - | No code |
| 1 | `FireModel3D` | `scene/fire-model` | - | Large |
| 2 | Wire the fire slot | `app/wire-fire-slot` | step 1 merged; C's go-ahead | One line in C's file |
| 3 | `HabitatSimMap` | `scene/sim-map` | - | Medium |
| 4 | Wire the map slot | `app/wire-map-slot` | step 3 merged; C's go-ahead | One line in C's file |
| 5 | `LayoutCanvas` | `scene/layout-canvas` | step 1 (C's panel reuses the fire) | Medium |
| 6 | Polish | `scene/polish` | all above | Small |

Why this order: B's human asked for the fire first (2026-11-14). It also matches the brief, which
says `LayoutCanvas` comes after `FireModel3D` because the Layout page reuses it, and it is the
piece every visitor to the fire page sees first.

Cost of this order: until step 3 lands, step 4 of the demo ("pick where the fire starts") still
shows the stand-in map, where clicking does nothing. The sliders already move the fire point, so
the page works without it.

Steps 3 and 5 do not depend on each other. Which comes first is open question Q2.

Each step is its own pull request. `npm run build` must pass before each one. The two wiring steps
can be one pull request if C prefers; they are split here so the fire can go live without waiting
for the map.

### Step 0 - environment (no code)

- `cd web && npm install`. On this Windows machine npm skips a native package and Vite will not
  start; fix locally with `npm install --no-save @rolldown/binding-win32-x64-msvc@<rolldown version>`
  (does not touch the shared lockfile).
- Vite warns that it wants Node 20.19+; this machine has 20.17. It runs anyway.
- Open `#fire?h=moon_base&fuel=gas` and note what the two stand-ins look like, for before/after.

---

## 3. Step 1 - `FireModel3D` (`scene/fire-model`)

File: `web/src/scene/FireModel3D.tsx`, plus `web/src/scene/fire/` for shaders and the three samples.
Props: `FireModelProps` from `web/src/types/sim.ts`, unchanged.

**Rendering choice:** one react-three-fiber canvas, procedural geometry, a custom flame shader
(layered additive shells).

### 3.1 Structure

- `FireModel3D.tsx`: the canvas, camera, and the mapping from props to "look" values.
- `fire/look.ts`: a pure function `lookFor(params, behaviour)` returning brightness, size, colour
  warmth, stretch, lean, flicker and pulse. Pure, so it can be checked without a browser. A comment
  at the top states that every mapping is a drawing choice, not physics or data.
- `fire/FlameShell.tsx`: the shader material and mesh, shared by all three fuels.
- `fire/GasBurner.tsx`, `fire/Droplet.tsx`, `fire/SolidStrip.tsx`: the sample for each fuel.
- `scene.css` (new): B's own stylesheet for anything outside the canvas, imported by B's
  components. Classes prefixed `fire-b-`, `simmap-b-`, `layout-b-` so they cannot collide with C's
  `styles.css`. Colours reuse C's CSS variables where they exist (`--accent` is the gold `#ffcc29`).

### 3.2 The three looks (from the spec's table)

| Fuel | Sample | Microgravity (`gravity` 0) | Earth (`gravity` 1) |
|---|---|---|---|
| gas | Small round burner nozzle | Near-spherical dim blue-violet flame around the nozzle | Tall yellow teardrop, flickering |
| droplet | Liquid sphere on a thin fibre | Blue flame shell standing off the droplet; droplet slowly shrinks, then resets | Flame stretched upward around the droplet |
| solid | Thin flat strip | Low blue-tinged flame front creeping along the strip, leaning into the airflow | Yellow flame climbing the strip, faster |

### 3.3 How each parameter changes the picture

| Input | Effect | Limits |
|---|---|---|
| `o2Fraction` | Brighter, whiter, larger, faster as it rises; faint below about 15 % | A visual cue only. No threshold is shown and no number is derived. |
| `pressureAtm` | Lower = slightly larger, dimmer, more diffuse | Small effect on purpose |
| `airflowCmS` | 0 = still. Higher = flame stretched downstream and more yellow; the solid flame front advances | Direction of flow is drawn with a few faint streaks |
| `gravity` | Blends the microgravity look into the Earth look (teardrop, flicker, upward plume) | No "Moon" preset: PSI has no partial-gravity data |
| `behaviour` | `went-out`: pulse, fade out every few seconds, relight. `kept-burning`: steady. `mixed` / `unknown`: steady but dimmer | Comes from C; B does not compute it |

All changes are eased over about 0.3 s so dragging a slider looks smooth.

### 3.4 Quality bar

- Fills its parent (C's stage is `position: relative`, 320 px tall; about 300 px wide on phones).
- `prefers-reduced-motion`: no flicker, no pulse, no shrinking droplet; a still flame that still
  responds to the sliders.
- No text in the canvas. C's stage already shows "Illustration, not a simulation"; the component
  also takes an optional `showLabel` and draws its own label when used elsewhere (the Layout page).
  `showLabel` is a new optional prop: agree it with C before adding it to `types/sim.ts` (Q4).
- One draw loop, no allocation per frame, device pixel ratio capped at 2.
- If WebGL is unavailable: a still SVG flame of the right colour, never a blank box.

### 3.5 Build order inside this step

1. `look.ts` and the shader with the gas burner only; check all four sliders and `behaviour`.
2. Droplet sample.
3. Solid strip sample.
4. Reduced motion, WebGL fallback, phone width.

To see it before the wiring step, B temporarily swaps the `renderFire` line in a local, uncommitted
copy of `App.tsx`. That edit is never committed on this branch.

### 3.6 Checks before the pull request

- With the local swap: `#fire?h=moon_base&fuel=gas`, `...droplet`, `...solid` look clearly
  different from each other.
- Each of the four sliders visibly changes each of the three.
- At a point where C reports `went-out`, the flame pulses and relights.
- Reduced motion, phone width, projector zoom 125 %.
- `npm run build`; no new console errors (the existing "THREE.Clock is deprecated" warning stays).

---

## 4. Step 2 - wire the fire slot (`app/wire-fire-slot`)

One pull request touching only `web/src/App.tsx` (C's file; the change is pre-agreed in
`docs/PLAN.md` section 6): one import and the `renderFire` line. Tell C before opening it, or ask C
to make the change.

---

## 5. Step 3 - `HabitatSimMap` (`scene/sim-map`)

Files: `web/src/scene/HabitatSimMap.tsx`, `simMapData.ts` for the pure parts, `scale.ts` (extend).
Props: `HabitatSimMapProps` from `web/src/types/sim.ts`, unchanged.

**Rendering choice: SVG, 2D.** The spec says 2D is enough and 3D is a bonus. SVG gives exact
values, crisp text on a projector, real keyboard focus and no second WebGL canvas on the page.

### 5.1 Additions to `scale.ts` (pure functions)

- `PSI_PER_ATM` (unit conversion). C has the same constant in `web/src/ai/evidence.ts`, which B may
  not import. Propose to A later that one copy lives in `web/src/data/` (Q6).
- `fmtPct`, `fmtPsi`, `fmtAtm` formatters so every read-out uses the same rounding.
- A `linearScale` / `logScale` pair that takes a domain and a pixel range, with `invert`, so the
  map can turn a click back into oxygen and pressure. The existing `xOf` / `yOf` stay as they are
  because `HabitatMap3D` still uses them.
- `niceTicks(domain)` for axis ticks.

### 5.2 What is drawn

1. **Which tests.** Cabin-air tests of `props.fuel` with oxygen and pressure both recorded. Today
   that is 386 gas and 360 droplet tests and 0 solid tests. Rows flagged `duplicate_row` are left
   out so a repeated SPICE row is not drawn twice (to confirm with A: Q5).
2. **Visible range.** Computed, never fixed: the union of the habitat box, the picked point and the
   tests in `nearestTestIds`, padded by 25 % on each side (in log space for pressure), then clamped
   to the sliders' range (oxygen 10 to 100 %, pressure 0.2 to 5 atm). A "Show all tests" button
   widens it to the full slider range; "Fit to place" returns.
3. **Axes.** x: cabin oxygen in %. y: pressure in psi with atm in brackets, log scale. Grid lines at
   the ticks.
4. **The habitat.** A see-through gold box with its name and its bounds written out ("oxygen
   32-36 %, 8.0-8.4 psi"). When the box is a single point (ISS, spacesuit, Earth sea level today) a
   cross-hair with a ring instead. The rule is "both ranges have zero width", not a list of ids.
5. **Test dots.** Fuel colour from `FUEL_COLOR`. Tests that share one oxygen and pressure value are
   drawn as one larger mark whose tooltip lists them.
6. **Nearest tests.** The ids in `nearestTestIds` get a white ring and a thin line to the fire
   point, so the user sees where "expected behaviour" comes from.
7. **Fire point.** `props.point` as a small flame marker in gold, pulsing gently (still under
   `prefers-reduced-motion`).
8. **Solid.** No solid test can be placed. The plot still draws the habitat and the fire point, with
   a clear message in the plot area: "Solid-material tables record no pressure, so these tests
   cannot be placed yet." Optionally, below the x axis, a detached strip shows the solid tests that
   do record oxygen, placed by oxygen only and labelled as such: Q1.
9. **Inverse flames.** Gas only. A small checkbox in the map's corner bound to the store's
   `showBurnerOxidizer`. When on: hollow diamonds, a label "oxygen is burner gas, not cabin air",
   and never highlighted as nearest.
10. **Read-out line** under the plot: how many tests are drawn, how many of this fuel cannot be
    placed and why, from `unplacedTests()` in `web/src/data/load.ts`.

### 5.3 Interaction

- **Click or tap** in the plot area: `onPick({ o2Fraction, pressureAtm })`, clamped to 0.1..1.0 and
  0.2..5 atm, rounded to the sliders' steps (0.005 and 0.01).
- **Drag** the fire marker: same callback while dragging.
- **Click a test dot:** `onPick` with that test's own values ("start the fire where this test ran").
- **Hover or focus a dot:** card with investigation, test label, fuel, oxygen, pressure, ending
  ("not recorded in the table" when null), source table and row, DOI.
- **Keyboard:** the plot is focusable (`role="application"`, labelled). Arrow keys nudge the point
  by 1 point of oxygen or 0.1 psi; Shift makes it 5 times larger; Enter confirms. Tab moves through
  the nearest tests.
- The component holds no copy of the point. Hover state is the only local state.

### 5.4 Checks before the pull request

- For each of the 5 habitats and 3 fuels the box and the nearest tests are on screen.
- Clicking changes the URL (`o2`, `p`), the sliders, the expected behaviour and the task cards.
- The number of dots drawn equals the count from a one-line script over `tests.json`.
- Solid shows the empty-state message and still accepts a click.
- Phone width (340 px stage), keyboard only, reduced motion.
- `npm run build`.

---

## 6. Step 4 - wire the map slot (`app/wire-map-slot`)

Same as step 2 for the `renderMap` line. After it merges, `Flame3D` and `HabitatMap3D` are no
longer imported anywhere. They stay in the repo until Q3 is answered.

---

## 7. Step 5 - `LayoutCanvas` (`scene/layout-canvas`)

File: `web/src/scene/LayoutCanvas.tsx`. Props: `LayoutCanvasProps` exactly as in
`docs/LAYOUT_PLAN.md` section 7. Types (`LayoutMark`, `EvidenceTier`) and the three tier colours
(`TIER_COLOR`) come from `web/src/types/layout.ts`; B does not redefine them.

**Rendering choice: SVG over an `<img>`.** Marks are few, need focus and keyboard, and must stay
sharp when the plan is scaled.

1. **Plan image** scaled to fit, letterboxed, never stretched. With `imageUrl === null`: a neutral
   grid and the hint "Upload a floor plan or use the example layout".
2. **Marks.** Areas are boxes, points are pins. Fill by tier from `TIER_COLOR`; outline in the fuel
   colour from `scale.ts`. The selected mark gets a gold ring and resize handles (areas only).
   Positions are fractions of the image (0..1) in and out, so a resize never moves a mark.
3. **Tools.** `area`: drag to draw a box, `onAdd` on release (ignored under a minimum size).
   `point-liquid` / `point-gas`: click drops a pin, `onAdd`. `select`: click selects, drag moves
   (`onMove` on release), click on empty space calls `onSelect(null)`.
4. **Keyboard.** Tab through marks in list order, arrow keys move the selected mark (Shift for
   larger steps), Delete or Backspace reports a delete request. The spec's props have no delete
   callback: Q7.
5. **No evidence logic.** Colours come only from `props.tiers`. No distances, no spread between
   marks.
6. **Start a Fire Here** is C's panel; it reuses `FireModel3D` from step 1 with `showLabel`.

Test data: `web/public/layouts/example-moon-habitat.json` (10 marks, via `loadExampleLayout()`).

Checks: draw, drop, move and select on an uploaded image and on the example plan; colours follow
`tiers`; touch input; keyboard only; `npm run build`.

---

## 8. Step 6 - polish (`scene/polish`)

- Lazy-load the 3D code (`React.lazy` inside `web/src/scene/`) so the home page does not pay for
  three.js. Removes the build's bundle-size warning.
- Projector pass on real hardware: text sizes, contrast, the gold on dark.
- Performance pass on a laptop on battery.
- Update `docs/roles/B-3d.md` "Where things stand".

---

## 9. Questions

### Open

| # | Question | Who | Affects |
|---|---|---|---|
| Q0 | `docs/LAYOUT_PLAN.md` gives a submission deadline of Sunday 15 November, 11:59 p.m., with a feature freeze at 3 p.m., and puts `LayoutCanvas` on Sunday morning. Is that still the timeline? If so, steps 1, 3 and 5 must fit in under a day and step 6 may be cut. | B's human | Everything |
| Q1 | Solid tests on the sim map: show the "by oxygen only" strip below the axis, or only the empty-state message? The brief says not to give unplaced tests a position; the strip gives no pressure. | B's human, A | Step 3 detail |
| Q2 | After the fire: `HabitatSimMap` and then `LayoutCanvas` (this plan), or `LayoutCanvas` first because C's Layout page is waiting on it? | B's human, C | Order of steps 3 and 5 |
| Q3 | After both slots are wired, the all-tests 3D map is shown nowhere. Bring it back on the home page (`docs/PLAN.md` open question 1), or retire it? | Team | Step 6 |
| Q5 | Should the map leave out rows flagged `duplicate_row` (34 SPICE rows)? | A | Step 3 detail |
| Q6 | `PSI_PER_ATM` exists in C's `ai/evidence.ts`; B needs it too. One shared copy in `web/src/data/`? | A, C | None (B keeps its own until agreed) |
| Q7 | `LayoutCanvasProps` has no `onDelete`. Add one to the contract, or leave delete to C's panel only? | C | Step 5 detail |
| Q8 | C's fire page labels step 3 "Fire Simulation" and step 4 "Simulation Map", while the rule is "illustration, not a simulation". Worth telling C. | C | None |

### Answered

- Is `docs/LAYOUT_PLAN.md` final? Yes: merged into `main` (pull request #4).
- Has A delivered the layout data? Yes: `types/layout.ts`, `fuels.json`, `layoutEvidence.ts` and the
  example layout are on `main` (pull request #5).
- Fire or map first? Fire first (B's human, 2026-11-14).
- Q4 (`showLabel`): not needed. `FireModel3D` always draws its own label with C's existing class
  `flame-label`; C's `styles.css` already hides `.fire-stage .flame-label`, so the fire page shows
  one label and any other page shows the component's own. No contract change.

## 10. Not in this plan

- Any physics or fire-spread model. Both specs rule it out ("Nothing spreads between marks", "an
  evidence map, not a fire simulation").
- A "Moon gravity" preset, or any number derived from the fire picture.
- Changes to the data, the panels, `styles.css` or the store.
