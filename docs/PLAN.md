# PLAN - the user flow, and what workstream B builds

Written by workstream C (dashboard + AI) for workstream B (3D map and flame) and B's Claude.
Read `CLAUDE.md` and `docs/roles/B-3d.md` first; this file **adds** to B's brief and, where they
differ, replaces B's tasks 4 to 6 (2D view, inverse flames, flame) with the components below.
Branch with C's side of this: `peach/dashbard`.

---

## 1. The flow the team agreed

The user moves through four steps. Steps 1 and 2 are C's and are built. Steps 3 and 4 are on C's
fire page, which is built **around two empty slots that B fills**.

| Step | URL | What the user does | What they see | Built by |
|---|---|---|---|---|
| 1 | `#map` (Home) | Lands on the site | Animated summary across every place: tests per place by fuel, what burned, cabin-oxygen histogram, how tests ended, fire-safety pillars. Clicking a place opens step 2. | C, done |
| 2 | `#place?h=moon_base` | Picks a place (Moon Base, spacesuit, Earth, more later) | That place's air, the NASA tests that ran in it, the closest evidence outside it, how flames ended, what is not in the tables. Three fuel cards: gas, droplet, solid. | C, done |
| 3 | `#fire?h=moon_base&fuel=gas` | Picks a fuel; moves sliders for oxygen, pressure, airflow, gravity | **A 3D fire for that fuel (B)**, the expected behaviour from the 5 nearest real tests (C), and the three tasks: detection, suppression, prevention (C). | B: fire model. C: everything else, done |
| 4 | same page, lower section | Clicks a point on the place's map to say "the fire starts here" | **A clickable map of that place (B)** with the place illustration beside it (C). The click moves the same fire point as the sliders, so the fire model, behaviour and tasks all update. | B: map. C: wiring and side panel, done |

Places are data-driven: `habitats.json` (workstream A) decides which places exist. Future places
(ISS, spacecraft cabin, lunar lander, Mars habitat) show on Home as "waiting for a NASA source" and
become real automatically when A adds them. **Never hard-code a habitat in B's components.**

## 2. Rules that do not change

- Real NASA data only; nothing invented. B draws what C passes in; B never computes outcomes.
- The fire model is an **illustration, not a simulation**. The label "Illustration, not a
  simulation" must be visible whenever the model is on screen (C already shows it on the stage;
  keep yours too if your component is ever used elsewhere).
- No network at runtime (fonts, models, textures): the demo may be offline. Procedural geometry and
  shaders only, or assets committed under `web/src/scene/`.
- Inverse-flame tests (`o2_basis: "burner_oxidizer"`) never count toward a habitat; draw them only
  when the store's `showBurnerOxidizer` is on, and visibly different.
- Talk to C only through props (below) and the store. Do not import from `web/src/panels/`.

## 3. The contract: `web/src/types/sim.ts`

C created this file. It is shared (agree changes with C). It holds every prop B's two components
receive.

```ts
interface SimPoint      { o2Fraction: number; pressureAtm: number }           // 0..1, atm
interface FireParams    { fuel: FuelClass; o2Fraction: number; pressureAtm: number;
                          airflowCmS: number; gravity: number }               // gravity 0 = micro, 1 = Earth
type ExpectedBehaviour = 'kept-burning' | 'went-out' | 'mixed' | 'unknown'
interface FireModelProps    { params: FireParams; behaviour: ExpectedBehaviour }
interface HabitatSimMapProps { data: AppData; habitat: Habitat; fuel: FuelClass;
                               point: SimPoint | null; nearestTestIds: string[];
                               onPick: (p: SimPoint) => void }
```

C's fire page owns all state (it lives in the URL: `o2`, `p`, `air`, `g`, `fuel`, `h`), so a reload
or a shared link reopens the same fire. B's components are controlled: draw from props, report
clicks through `onPick`, keep no copy of the point.

## 4. Component A: `FireModel3D` (step 3)

**File:** `web/src/scene/FireModel3D.tsx`, `export function FireModel3D(props: FireModelProps)`.
It fills its parent (C's stage is 320 px tall, full card width; on phones about 300 px wide).

**What it shows:** one small burning sample of the chosen fuel, in a dark chamber, that responds to
the four parameters. Three looks, one per fuel:

| Fuel | Sample | Microgravity look (`gravity` = 0) | Earth look (`gravity` = 1) |
|---|---|---|---|
| `gas` | A small round burner nozzle (ACME-style) | Near-spherical, dim blue-violet flame around the nozzle | Tall yellow teardrop rising from the nozzle, flickering |
| `droplet` | A single sphere of liquid on a thin fibre (FLEX/MDCA-style) | Spherical blue flame shell standing off from the droplet; the droplet slowly shrinks while burning | Flame stretched upward around the droplet |
| `solid` | A thin flat strip of material (BASS/SAFFIRE-style) | A low, blue-tinged flame front creeping along the strip, leaning **into** the airflow | Flame climbing the strip, yellow, faster |

**How the parameters change it** (qualitative, illustrative only; state it in a code comment):

- `o2Fraction`: more oxygen = brighter, whiter, larger, faster flame. Below about 15 % make it
  faint. This is a visual cue, not a flammability limit; never show a number derived from it.
- `pressureAtm`: lower pressure = a slightly larger, dimmer, more diffuse flame.
- `airflowCmS`: 0 = still air (spherical in microgravity). Higher = flame stretched downstream,
  more yellow. For `solid`, show the flame front advancing.
- `gravity`: blends the microgravity look into the Earth look (teardrop, flicker, upward plume).
  The Moon is about one sixth of Earth's gravity, but PSI has **no** partial-gravity data: do not
  add a "Moon" preset that implies tested behaviour.
- `behaviour` (from the nearest real tests, computed by C): `'went-out'` = let the flame pulse and
  fade out every few seconds, then re-ignite; `'kept-burning'` = steady; `'mixed'` or `'unknown'`
  = steady but dimmer. Optional, but it ties the picture to the data nicely.

**Quality bar:** smooth on a laptop, legible on a projector, respects `prefers-reduced-motion`
(stop flicker and pulsing, keep a still flame). No text inside the canvas except via `Label.tsx`.

## 5. Component B: `HabitatSimMap` (step 4)

**File:** `web/src/scene/HabitatSimMap.tsx`, `export function HabitatSimMap(props: HabitatSimMapProps)`.
It fills its parent (C's stage is 460 px tall, about 900 px wide on desktop; 340 px tall on
phones). C draws the place illustration (moon, Earth, ...) to the right of it.

**What it shows:** the oxygen/pressure map **zoomed to the chosen place**, for the chosen fuel only.

1. Axes with real units: cabin oxygen in % (x) and pressure in psi with atm in brackets (y, log
   scale is fine; `scale.ts` already has one). Pick the visible range so the habitat box and the
   nearest tests are both on screen; pad generously.
2. The habitat as a see-through box (or a cross-hair for single-point habitats such as Earth sea
   level and the spacesuit), labelled with the habitat name.
3. Every placed test of `props.fuel` as a dot in that fuel's colour (`FUEL_COLOR` in `scale.ts`).
   Tests with `pressure_atm === null` are **not** placed (all solid tests today): for `solid`,
   show a clear empty state such as "Solid-material tables record no pressure, so these tests
   cannot be placed yet" and still let the user pick a point.
4. The tests in `props.nearestTestIds` highlighted (ring or glow), so the user sees which real
   tests the expected behaviour comes from.
5. The picked point (`props.point`) as a fire marker (a small animated flame or pulsing dot).
6. **Click anywhere** in the plotting area -> call `props.onPick({ o2Fraction, pressureAtm })`.
   Clamp to 0.1..1.0 oxygen and 0.2..5 atm (the sliders' range). Keyboard: arrow keys nudge the
   point when the map is focused (1 point of oxygen, 0.1 psi), Enter confirms.
7. Hover on a test dot: investigation, fuel, oxygen, pressure, ending. Click on a dot may also
   call `onPick` with that test's values (handy for "start the fire where this test ran").
8. A 2D view is enough here (CLAUDE.md requires one anyway). 3D is a bonus, not required.

## 6. Wiring (one change in a C file)

When the components exist, replace the two stand-in lines near the top of `web/src/App.tsx`:

```tsx
// now (stand-ins)
const renderFire = (p: FireModelProps) => <Flame3D gravity={p.params.gravity} />
const renderMap = (p: HabitatSimMapProps) => <HabitatMap3D data={p.data} />
// after
const renderFire = (p: FireModelProps) => <FireModel3D {...p} />
const renderMap = (p: HabitatSimMapProps) => <HabitatSimMap {...p} />
```

plus the two imports. That small edit to `App.tsx` is pre-agreed with C: make it alone in its own
pull request, or ask C to make it. Nothing else in C's files needs to change.

## 7. What C already provides (so B does not rebuild it)

- `web/src/ai/fireTasks.ts`: `nearestTests`, `expectedBehaviour`, `taskAnswers`, `defaultPoint`.
  The fire page calls these; B receives the results through props.
- Sliders for oxygen, pressure, airflow and gravity, the "Inside/Outside <place> air" badge, a
  reset button, the expected-behaviour list with citations, and the three task cards.
- The place illustration beside the map and the point read-out.
- Colours: fuel colours match `scale.ts`; the selected point and Moon Base use gold `#ffcc29`.

## 8. Done means (B)

- `#fire?h=moon_base&fuel=gas`, `...&fuel=droplet`, `...&fuel=solid` each show a recognisably
  different fire that reacts to all four sliders, with the illustration label visible.
- Clicking the map moves the fire point: the sliders, the expected behaviour and the three tasks all
  update, and the URL changes.
- Works offline, smooth on a laptop, readable on a projector, still under reduced motion.
- `npm run build` passes.

## 9. Open questions for the team

1. Should the home page also show the full 3D map of all tests (the original idea 1)? Today it is
   reachable only inside step 4. C suggests B decides after the two components land.
2. `showBurnerOxidizer` has no on-screen toggle since the home map moved. B's `HabitatSimMap` is
   the natural place for it (inverse flames are gas only).
3. AI suggestions for the three tasks come from `ai/generate.mjs` (needs an API key on a team
   laptop). Until it runs, the task cards show NASA data and gaps only.
