# Workstream B - implementation plan

**Status: steps 0 to 7 are merged (pull requests 7, 9, 12, 13 and 14). Of step 9: parts 9a (the
rule change, pull request 21), 9b and 9c (the Cabin Conditions panel and place matching, pull
request 20) are merged. Part 9d (the spread follows the deck through the doorway and hatch) is
built on branch `scene/settings-driven-spread`, uncommitted, waiting for review. Parts 9e and 9f
are not started. Step 8 is not started.**

Built for 9d: `cabin/spec.ts` gains the two bulkheads with their openings, and the vents (grilles,
fan, direction of air) as data; `cabin/path.ts` gives the shortest distance along the deck, going
round the edge of an opening where a bulkhead is in the way; `cabin/timeline.ts` uses it for the
order; the cloud in `cabin/ReachField.tsx` bends through the same openings; the note on the
timeline bar says so. Checked by script: a point in the node 0.8 from a point across the bulkhead
is 2.08 away along the deck; within one room the distance is unchanged. Checked in the browser: a
fire started in the node beside the bulkhead sends its cloud into the cabin through the hatch
only. `npm run build` passes. The vents are data only so far; nothing uses the direction until 9e.
Not checked: a phone, a projector, the cloud's path where it crosses both openings at once.

Also on this branch, asked for by B's human so the spread in the vent can be seen: the crew cabin
now has a **ceiling** (a flat panel between the two bulkheads at `CEILING.y`), with the **vent
duct** lying on top of it and two grilles in the ceiling opening into it (`CEILING`, `DUCT`,
`GRILLE`, `VENTS` in `cabin/spec.ts`). Lights and smoke detectors moved under the ceiling. The
cloud stays under the ceiling in the cabin and gets into the duct only through a grille, then runs
along it. The flight deck and the node have no ceiling. The spread ORDER is unchanged by the duct:
items sit on the deck, and going up through one grille and down through another is never shorter
than the deck. Checked in the browser with a fire under a grille: a coloured band runs along the
duct above the ceiling. With the cloud at its largest the frame rate on B's machine fell from 125
to 92 a second (the cloud now takes 40 samples per line of sight, up from 26, to catch the thin
duct). Not measured on a weaker laptop.

**Part 9e (2026-11-15), built on branch `scene/spread-effects`, uncommitted, waiting for review.**
Pull request 23 (9d and the ceiling) is merged. A "Spread settings" section in the stage's panel
has four sliders, each the user's assumption and each starting at "no effect", with its rule
written beside it (`cabin/SpreadSettings.tsx`, logic in `cabin/timeline.ts`):

| Setting | Rule as written on screen | What it changes |
|---|---|---|
| Airflow effect (0 to 80 %) | With the airflow at 50 cm/s, anything straight downstream counts that much nearer and upstream that much farther; less airflow, less effect | The order, and the cloud leans downstream |
| Gravity effect (0 to 80 %) | At Earth gravity, anything straight above counts that much nearer and below that much farther | The order (slightly: items sit on the deck), and the cloud lifts |
| Oxygen effect (0 to 100 %) | More items light per step as oxygen rises above 21 %, fewer below | The number of steps |
| Pressure effect (0 to 100 %) | The same against 14.7 psi | The number of steps |

A distance is never counted as less than 15 % of itself. When any setting is in use the timeline
label gains "It follows the settings you chose, which are your assumptions, not NASA data."
Checked by script: with every setting at "no effect" the order is identical whatever the
conditions; airflow at 80 % and 50 cm/s moves downstream items earlier and upstream ones last;
airflow effect with 0 cm/s changes nothing; oxygen at 100 % and 34 % gives 1.62 items a step (7
steps for 11 items). Checked in the browser: the panel, the rule text, the added label, and the
cloud leaning downstream. Also checked in the browser, in NASA's Moon Base air (34 % oxygen,
8.2 psi) at Earth gravity: the gravity effect at 80 % lifts the cloud to the ceiling at the same
step and leaves the number of steps at 11; the pressure effect at 100 % gives 0.56 items a step
and 20 steps; with the oxygen effect also at 100 % the two multiply to 13 steps; setting all back
to zero restores 11 steps and the original label. Not checked: a phone, a projector, frame rate
with the wider region the cloud is now drawn in.

Notes from the merges: pull requests 20, 21 and 23 were merged by B's human's request with no
review or comment from A or C on any of them.

Built for 9b and 9c: `web/src/data/placeMatch.ts` (A's folder), the panel in C's
`SimulationView.tsx` and `styles.css`, two optional fields on `StageFire` in the shared
`types/sim.ts` (airflow speed and gravity), and `cabin/CabinFire.tsx` reading them. Checked in the
browser: a place fills in its air; typed and slider values move together; values inside a place
name it (and say which one the evidence is for when several match); values outside every place
show the warning, switch the evidence colours off and list the nearest tests with distances; the
stage receives all four conditions. `npm run build` and A's 79 data checks pass. Differences from
the draft below: the airflow value is in the URL as `flow` (the old `air` key meant still/vent);
the place list reads "Custom values" once the sliders leave the picked place; task cards for
values outside every place use the values themselves (answering Q12). Not checked: a phone, the
uploaded plan, old links that carry `air=vent`.

Also on this branch, a fix to step 5 found by B's human: hiding furniture no longer removes items
from the spread. Every fuel item stays in the order whether or not it is shown; a hidden item gets
no glow or flame, and the cloud and timeline carry on. (Before, hiding all furniture left only the
start flame, and for a while a "nothing to reach" note.)
Rewritten 2026-11-14 from `main` at `2e243fe` (C's Simulation tab merged).

This is B's own working plan. The specs it follows are `CLAUDE.md`, `docs/roles/B-3d.md`,
`docs/PLAN.md` and `docs/LAYOUT_PLAN.md`. Where this file and a spec disagree, the spec wins and
this file is wrong.

Change log:
- 2026-11-14 (a): order changed at B's human's request: `FireModel3D` first.
- 2026-11-14 (b): steps 1 and 2 merged (pull requests #7 and #9).
- 2026-11-14 (c): C moved step 4 of the flow into a new Simulation tab and wrote that B no longer
  needs `HabitatSimMap` or `LayoutCanvas`. Both are dropped from this plan. At B's human's request
  the plan now adds a detailed sample 3D spacecraft layout, then the fire illustration inside it.
- 2026-11-14 (d): B's human answered the open questions: C agreed to the hand-over; one sample
  layout for every place; blue wireframe; an uploaded plan stays an image on the deck; the Sunday
  deadline stands. Step 4 built. B's human also asked for fire that spreads over time with a
  timeline bar: recorded in section 5 as a proposal that needs the team to change a rule.
- 2026-11-14 (e): B's human reports the whole team agrees to fire spread with a timeline (option C).
  The sample's marks go in a new example layout file in A's folder. C passes oxygen, airflow and
  behaviour to the stage: it was not implemented on any branch, so B added it (uncommitted). The
  cabin gained a furniture toggle with one sub-toggle per colour group. Branch brought up to
  `main` at `e2cd384`.
- 2026-11-14 (f): at B's human's request the cabin was wired into the Simulation tab ahead of the
  fire step, so steps 6 and 7 came before step 5. The fire in the cabin is still the plain glow
  marker. Checked in the browser: the tab shows the spacecraft with evidence colours, a
  double-click on an object or the deck places the fire and picks the object's material, Simulate
  shows the results, and the idle view loads. Not checked: the uploaded-plan view, a phone, a
  projector. Workstream A's validator does not check `example-spacecraft.json` yet.
- 2026-11-14 (g): pull requests 12 (cabin in the Simulation tab) and 13 (the rule change) merged.
  No reviewer changed the rule's wording. Step 5 built as option C:
  - `cabin/timeline.ts`: the order, from distance in the example layout only. The item the fire
    starts on is step 0; each later step lights the next nearest fuel item. Only fuel items light.
  - `cabin/CabinFire.tsx`: the fire page's flame where the fire starts (it follows the place's
    oxygen, the still/vent choice and what the nearest tests did), then a glow, a flame and a line
    from the start on each item as it lights. Items the fire reaches are drawn steady and dimmed:
    no claim is made about how they would burn.
  - `cabin/TimelineBar.tsx`: play/pause, playback rate (1x, 2x, 4x), a bar to drag, "Step n of N",
    and the fixed label. It counts steps, never time.
  - Hidden groups are left out of the order. An uploaded plan has no items, so no spread and no bar.
  Checked in the browser on the Space Station: the bar appears after Simulate, plays to the last
  step, offers replay, pauses when dragged, and the rate button changes the pace; no console
  errors; `npm run build` passes. Not checked: reduced motion, a phone, a projector, the uploaded
  plan. The flame itself is faint at 21 % oxygen; the orange glow is the main cue.
- 2026-11-14 (h): B's human found the spread hard to see and asked for something like a fire-model
  slice (a NIST cross-section coloured by air speed). Added `cabin/ReachField.tsx`, first as two
  flat slices, then, because that did not read as 3D, as a true volume: a coloured cloud filling
  the inside of the hull, drawn by stepping along each line of sight, red at the start to blue at
  the edge. It passes straight through bulkheads, as the order it follows is straight-line distance.
  The edge sits where `timeline.ts` says the spread has reached; the ragged texture is decoration.
  Measured on B's machine at full reach: no drop in frame rate with the cloud on. Not measured on
  a weaker laptop.
- 2026-11-14 (i): pull request 14 (step 5) merged. Workstream A has since added sourced pressure
  for 55 solid tests (29 now placed) and a validator check for `example-spacecraft.json`.
  B's human found that every run looks alike, because the spread depends only on the start point
  and the layout, and asked for a spread that reacts to oxygen, pressure, airflow and gravity, set
  by the user, with the room's geometry counted. Drafted as step 9 below. B's human has permission
  from A and C to edit their files for it.
  It has no scale and no units, and the bar carries a key: "Colour is distance from the start in
  this drawing. It is not heat, smoke or air speed." A "Spread colours" checkbox turns it off. When
  every fuel item is hidden the bar now says there is nothing for the fire to reach.
  Risk to raise with the team: it looks like the output of a real fire model, so the label and
  the key carry more weight than before.

---

## 1. Where things stand

### Done

| Step | What | Result |
|---|---|---|
| 0 | Environment check | Done |
| 1 | `FireModel3D` (`web/src/scene/FireModel3D.tsx`, `web/src/scene/fire/`) | Merged, pull request #7 |
| 2 | Wire the fire slot in `App.tsx` | Merged, pull request #9 |

### What C changed on `main` (pull request #6)

- **Fire page.** "Step 4 - Pick Where the Fire Starts" is gone. In its place is a button,
  **Simulate Your Project!**, that opens `#simulation?h=<place>&fuel=<fuel>`.
- **New Simulation tab**, built by C in `web/src/panels/SimulationView.tsx` and
  `web/src/panels/sim/`. The user: (1) chooses a place, (2) chooses the map, **Example Cabin** or
  **Your Floor Plan** (uploads a PNG or JPG), (3) chooses what burns (fuel type, a material NASA
  tested, still air or near a vent), (4) clicks the floor to place the fire point, (5) presses
  **Simulate**. The side bar then shows the evidence colour, the nearest real tests and the three
  tasks, all cited.
- **The 3D stage is C's `SimStage.tsx`.** Today it draws a blue wireframe shell per place (dome,
  module, suit outline, lab box), a flat floor, the example marks as flat boxes and pins coloured by
  evidence, and the fire as a plain glowing sphere. An uploaded image becomes the floor texture and
  the example marks are hidden.
- **`docs/PLAN.md` now says:** "B no longer needs `HabitatSimMap` or `LayoutCanvas`; `FireModel3D`
  is still wanted for the Fire page."

### Dropped from this plan

| Component | Why |
|---|---|
| `HabitatSimMap` | Its slot no longer exists: `renderMap` was removed from `App.tsx` and `FireView.tsx`. |
| `LayoutCanvas` | There is no `#layout` page. C's Simulation tab covers that journey in 3D. |

**Should the map and the layout canvas be one thing?** Yes, and on `main` they already are: one
stage that shows either the example layout or the uploaded plan, and takes the fire point. What is
left for B is what that stage looks like: the sample layout in 3D, and the fire inside it.

### Rules B must keep

- **Illustration, not a simulation.** The tab is called "Simulation" (the team lead's call), but
  nothing is modelled: nothing spreads, there is no heat between objects, no timing, and no number
  is derived from the picture. C's page says so on screen and B's stage must not contradict it.
- **Position changes nothing.** One cabin shares one air, so where the fire starts does not change
  the evidence. B never computes evidence, colours or nearest tests; they arrive as props.
- **Example layouts are not NASA designs.** The label "Example layout, not a NASA design" stays
  visible, object names are labels only, and no size or arrangement is presented as real.
- **Colours mean how much evidence exists, never how dangerous.**
- No network at runtime: procedural geometry and shaders only.
- B edits only `web/src/scene/` and its own brief. No imports from `web/src/panels/` or
  `web/src/ai/`. Shared files change only by agreement.
- Never hard-code a place. `habitats.json` decides which places exist.

---

## 2. Remaining steps

| Step | What | Branch | Depends on | Size |
|---|---|---|---|---|
| 3 | Agree the hand-over with C (and A if a layout file is needed) | none | - | **C agreed** (B's human, 2026-11-14) |
| 4 | **Sample 3D spacecraft layout** | `scene/sample-spacecraft` | step 3 | **Built, in the pull request** |
| 4a | Pass oxygen, airflow and behaviour to the stage | same branch, own commit | C agreed | **Built, in the pull request** (C's and shared files) |
| 4b | Example layout file for the sample's marks | same branch | A's folder, as B's human decided | **Built, in the pull request**; A's validator still to cover it |
| 6, 7 | `CabinStage3D` and its wiring (done before step 5) | same branch | steps 4, 4a, 4b | **Built, in the pull request** |
| 4c | Change the rule in the shared documents | `docs/illustrated-spread` | all three humans | **Merged** (pull request 13) |
| 5 | Fire in the cabin: start point, spread over time, timeline | `scene/cabin-fire` | steps 1, 4, 4a, 4c | **Merged** (pull request 14) |
| 9 | Conditions the user sets, and a spread that reacts to them | several, see section 9 | team agreement on the rule | **Draft, not started** |
| 6 | `CabinStage3D`: the full stage (example and uploaded plan) | `scene/cabin-stage` | steps 4 and 5 | Medium |
| 7 | Wiring in C's files | `app/wire-cabin-stage` | step 6 merged; C's go-ahead | Small |
| 8 | Polish and housekeeping | `scene/polish` | all above | Small |

Each step is its own pull request and `npm run build` must pass before each one. **After every
step B stops and shows the result; the next step starts only when B's human approves it.**

---

## 3. Step 3 - agree the hand-over (no code)

C built the stage and wrote that B is finished. Before B writes anything for the Simulation tab,
three things need a yes from C:

1. **B takes over the 3D stage's content.** B builds `CabinStage3D` in `web/src/scene/`; C's
   `SimStage.tsx` stays as the fallback until it lands.
2. **The props move to the shared contract.** `SimStageProps` and `CabinTemplate` are defined in
   C's folder, which B may not import. They move to `web/src/types/sim.ts` unchanged, so both
   stages type-check against one definition.
3. **A render prop, like the fire slot.** `SimulationView` takes `renderStage` and `App.tsx` passes
   B's component, because `panels/` may not import from `scene/`.

If C says no to any of these, steps 4 and 5 still stand on their own (a model and a flame B can
show), and steps 6 and 7 are re-planned.

---

## 4. Step 4 - sample 3D spacecraft layout (`scene/sample-spacecraft`)

**Goal:** one example spacecraft that is simple to read as a layout (a few joined shapes) but
detailed enough to look like a place people live. It is generated by code: no model files, no
textures, nothing downloaded.

Files: `web/src/scene/cabin/`.

**Built (2026-11-14), in blue wireframe as B's human chose:**

| File | What it is |
|---|---|
| `cabin/spec.ts` | The craft as data: hull profile, 4 zones, 15 objects (11 of them fuel items), the marks they offer, and `checkSpec()` |
| `cabin/holo.tsx` | The hologram look: edges plus a faint glow, with shared geometry |
| `cabin/Hull.tsx` | Ribs and stringers, deck with plates, doorway, hatch, docking ring, optional solar wings and antenna |
| `cabin/parts.tsx` | The kit: seats, console, window dome, racks, table, bottles, cable tray, bunks with curtain, bags, wiring panel, gas bottle, gas line, locker; plus duct, fan, grilles, lights, smoke detectors, extinguisher, handrails |
| `cabin/Spacecraft.tsx` | The assembled craft. Props: `markColors`, `selectedMarkId`, `showLabels`, `exterior`, `onPickMark` |
| `cabin/preview/` | A development page, not in the built site: `/src/scene/cabin/preview/index.html` on the dev server |

Checked: `checkSpec()` reports no problems against `fuels.json`; A's `layoutProblems()` accepts the
11 marks; evidence colours from A's `markEvidence()` show per place (Space Station: 3 teal, 7 amber,
1 coral); clicking an item picks it; `npm run build` passes. Not checked: a projector, a phone, and
frame rate on a laptop on battery.

Added on review (2026-11-14): a **Furniture** toggle with one sub-toggle per colour group
(`cabin/groups.ts`; `Spacecraft` props `hiddenIds` and `showFittings`). The groups follow the
colour on screen: with no place chosen they are the fuel types (solid materials, liquids, gases);
with a place chosen they are the evidence levels (tested in this air, tested only in other air,
not in the tables); plus furniture and fittings that are not fuel items. They are not a
flammability ranking: NASA's tables do not rank these objects by how easily they burn.

Differences from the text below: the cutaway is not needed in wireframe (the inside shows through
the hull), and the count is 15 named objects plus the cabin systems rather than 40 to 60.

### 4.1 Shape: three joined volumes

| Volume | Shape | Role |
|---|---|---|
| Crew cabin | Cylinder lying on its side, with a flat deck | The main room: most of the layout |
| Node / airlock | Sphere, joined by a hatch ring | Storage, gas bottles, suit port |
| Flight deck | Truncated cone ending in a window dome | Seats, console, windows |

The plan view is one rectangle (about 12 by 5 units), so every object keeps a position in plan
fractions (0..1), the same convention `LayoutMark` uses. Sizes are illustrative and never shown as
real dimensions.

### 4.2 Detail (target: 40 to 60 objects, built from a small kit of parts)

| Zone | Objects |
|---|---|
| Flight deck | 2 crew seats, console, window frame and panels |
| Work area | Table, experiment rack, equipment rack, lab fuel sample, cleaning solvent bottle |
| Crew quarters | 2 bunks with fabric curtains, fabric stowage bags |
| Systems | Cable trays with covers along one wall, wiring bundle, vent duct with fan and two grilles |
| Node | Experiment gas bottle, gas supply line, hatch with ring |
| Safety (detail only, not fuel) | Smoke detector, fire extinguisher, light strips, handrails |

- **Kit of parts** (`cabin/parts/`): hull section, deck, hatch, window, seat, bunk, rack, bag,
  bottle, cable tray, duct and fan, detector, extinguisher, console, handrail, light strip. Each is
  a few primitives; repeated parts are instanced.
- **Cutaway.** The half of the hull facing the camera is drawn as ribs and panel lines only, so the
  inside is always visible while rotating.
- **Exterior** (seen in the idle view): panel seams, a docking ring, two solar wings, an antenna.
- **Text** only through `Label.tsx`: zone names and "Example layout, not a NASA design".

### 4.3 How the model ties to the data

The ten fuel items above are the same ten materials and fuels as workstream A's example layout
(Nomex seats, cotton-fiberglass fabric, PMMA panels, silicone cable covers, Ultem rack, "other"
wiring insulation, methanol, heptane, butane, propane). Each 3D object is bound to one mark id, so:

- its footprint on the deck is the mark's `shape`;
- its tint and outline come from the evidence colour C passes in (`markColors`);
- clicking it picks that mark, exactly as clicking a mark does today.

The model itself holds no evidence and no fuel data. Where the marks for this cabin live is Q3:
a new `web/public/layouts/example-spacecraft.json` checked by A's validator (recommended), or
binding to marks that already exist.

### 4.4 Structure

- `cabin/spec.ts`: the whole spacecraft as data (volumes, zones, objects with plan footprints,
  mark ids). Pure, no three.js, so it can be checked by a script.
- `cabin/parts/*.tsx`: the kit.
- `cabin/Spacecraft.tsx`: builds the scene from the spec; props `markColors`, `selectedMarkId`,
  `cutaway`, `onPickMark`.
- `cabin/check.ts`: every object lies inside the deck, no two fuel objects overlap, every mark id
  has exactly one object.

### 4.5 Build order and review points

1. Hull, deck and the three volumes with the cutaway. **Show B's human; adjust the shape.**
2. Kit of parts and the zones.
3. Binding to marks: tint, outline, click.
4. Exterior detail, labels, lighting.

To see it before wiring, B swaps the stage in a local, uncommitted copy of C's file. That edit is
never committed on this branch.

### 4.6 Checks before the pull request

- `cabin/check.ts` passes.
- Readable from the default camera in 10 seconds: three volumes, the zones, where the fuel items are.
- Smooth on a laptop; legible on a projector at 125 % zoom; still under `prefers-reduced-motion`.
- The "not a NASA design" label is visible in every view.
- `npm run build`.

---

## 5. Step 5 - fire in the cabin (`scene/cabin-fire`)

### What B's human asked for (2026-11-14)

- **Double-click** the 3D model to set where the fire starts.
- The fire starts there: a glow on the burning object, then it **spreads through the model**.
- A **timeline bar** along the bottom: scrub to any moment since the fire started, with play/stop
  and a speed button.

### Decision (2026-11-14): option C, illustrated spread

B's human reports that all three workstreams agree. Before B builds it, step 4c changes the
wording below in the shared files, in its own pull request that all three humans see.

### The rule being changed

Spread changes a rule the whole team agreed and that C's page states on screen:

- `CLAUDE.md`: the fire is "an illustration, not a simulation"; "Real NASA data only. Never invent,
  estimate or fill in a value"; "an unlabelled assumption is a bug".
- `docs/LAYOUT_PLAN.md` section 8: "no spread, no heat between marks, no distances"; section 9 lists
  "Fire spreading across the layout over time" as out of scope.
- `SimulationView.tsx` tells the user: "NASA's tables do not model how fire spreads."

NASA's tables hold no spread rates between objects, no room geometry and no partial-gravity data, so
any spread shown is made up by us. A timeline in seconds would also be a number without a source.
`CLAUDE.md` and `docs/LAYOUT_PLAN.md` are shared files: B does not change them alone.

### The three options that were considered (C was chosen)

| Option | What the user sees | What it claims | Rule change needed |
|---|---|---|---|
| A. No spread | Flame at the point, glow on that object. No timeline. | Nothing new | None |
| B. Evidence replay | The timeline steps through what the nearest real tests of that material did: lit, burned, went out or burned to the end. Only the object at the fire point changes. | "This is what the nearest NASA tests did", cited | Small: C passes the nearest tests' endings to the stage |
| C. Illustrated spread (what B's human asked for) | From the start point the glow moves to neighbouring objects in order of distance, scrubbed with a timeline in steps, not seconds. Each object that lights shows its own evidence colour and whether NASA has any test of it. | "An illustration of a fire reaching more items. Not a prediction: NASA's tables do not model spread." Always on screen. | Yes: the team must allow spread as a labelled illustration, and `CLAUDE.md` / `LAYOUT_PLAN.md` are edited to say so |

Under option C, B would hold to these limits: no seconds, minutes or speeds in real units; the
order comes only from distance in the example layout and is labelled as such; no object is shown
as "safe" or "destroyed"; nothing is derived from the animation; the label never leaves the screen.

### Pieces common to every option

- `cabin/CabinFire.tsx`: the flame at the point, reusing `FlameShell` and `lookFor` from
  `FireModel3D`, in the microgravity look (every PSI test ran in microgravity).
- Double-click on the deck or on an object reports the point (plan fractions) and, for an object,
  its mark id.
- Label via `Label.tsx`: "Fire starts here - illustration".

### Extra pieces for options B and C

- `cabin/timeline.ts`: pure function from (start point, layout, step) to the state of each object.
- `cabin/TimelineBar.tsx`: play/stop, speed (1x, 2x, 4x), a scrub bar, keyboard arrows; pauses
  under `prefers-reduced-motion`.

Checks: three fuels look different at the point; the label is visible at every step; reduced
motion; `npm run build`.

---

## 6. Step 6 - `CabinStage3D` (`scene/cabin-stage`)

File: `web/src/scene/CabinStage3D.tsx`. Props: exactly C's `SimStageProps` (from `types/sim.ts`
once moved). It fills its parent (C's stage is the window height minus 110 px, 60 % of the window
on phones).

| State | What is drawn |
|---|---|
| No place chosen | The sample spacecraft from outside, turning slowly, with call-outs |
| Place chosen, Example Cabin | The sample spacecraft cutaway with its objects coloured by evidence; click an object or the deck to place the fire |
| Place chosen, Your Floor Plan | The uploaded image flat on the deck of a plain open shell, no furniture; double-click to place the fire (confirmed by B's human) |
| After Simulate | Step 5's flame at the point |

- Every place shows the same sample spacecraft (B's human, 2026-11-14): the place changes the air,
  and so the evidence colours, not the layout. Every place reads the sample's marks from the new
  example layout file (step 4b), where today C's page has a different set per place.
- A **Furniture** toggle with one sub-toggle per colour group, as in the preview.
- Drag to rotate, scroll to zoom, a "Top view" button for placing a point precisely, keyboard
  arrows to nudge the point.
- If WebGL is unavailable: a flat 2D plan of the same layout, never a blank box.

Checks: every place in `habitats.json`; example and upload; click, keyboard, touch; `npm run build`.

---

## 7. Step 7 - wiring (`app/wire-cabin-stage`)

The three changes agreed in step 3, in C's and shared files, as one small pull request that C
reviews: move the two types to `types/sim.ts`, add `renderStage` to `SimulationView`, pass
`CabinStage3D` from `App.tsx`.

---

## 8. Step 8 - polish and housekeeping (`scene/polish`)

- Lazy-load the 3D code so the home page does not pay for three.js (removes the bundle warning).
- `Flame3D.tsx` and `HabitatMap3D.tsx` are imported nowhere now: delete them, or keep the map if
  the team wants the all-tests view back (Q7).
- Rewrite `docs/roles/B-3d.md`: it still lists `LayoutCanvas` and the old tasks.
- Projector and laptop-on-battery passes on real hardware.

---

## 9. Step 9 - conditions the user sets, and a spread that reacts to them (DRAFT)

### What B's human asked for (2026-11-14)

- Oxygen, pressure, airflow and gravity are inputs the user sets, with sliders and typed values.
- The places become a dropdown that fills in starting values; the user can then change anything.
- The spread should react to those conditions and to the room's geometry.
- No made-up rates or physics rules hidden in the code: anything of that kind goes on screen as a
  parameter.

### What exists, and why none of it drops in

| Model | What it is | Use here |
|---|---|---|
| NIST Fire Dynamics Simulator (FDS) | Full fluid-dynamics fire model. NASA uses it for spacecraft fires, including Saffire-IV, at Earth, Mars, lunar and zero gravity. | Cannot run in a web page. |
| Zone models (NIST CFAST) | Each room is a hot upper layer and a cool lower layer. | NASA's own paper says terrestrial large-scale models are of limited use for spacecraft. |
| Flame-spread formulas (de Ris 1969; Bhattacharjee and others) | Spread rate and extinction limit along ONE flat piece of fuel, including in microgravity. | Covers one surface, not fire getting from one piece of furniture to another across open air; needs material properties the PSI tables do not hold. |

None of these papers has been opened and checked; only search summaries were read. Nothing from
them goes into the app until someone reads the source, as `CLAUDE.md` requires.

PSI has **no partial-gravity data**. None can be added to the sample. Gravity can only be a setting.

### The approach: every rate is a setting on screen

- **Sourced values** show their source: each place's oxygen and pressure (`habitats.json`).
- **Unsourced values** are the user's: how strongly each condition changes the spread. Each is a
  slider labelled "your assumption, not NASA data", and each starts at "no effect". With every one
  at "no effect" the result is exactly today's spread.
- **The result** is labelled as the outcome of the user's settings, never as a NASA finding.

### 9a. Change the rule again (shared files, all three humans)

`CLAUDE.md` and `docs/LAYOUT_PLAN.md` say "the order comes only from distance in the example
layout". It would become: the order comes from distance along the deck of the example layout and
from the settings shown on screen; every setting without a source is labelled as the user's
assumption and starts at "no effect"; the timeline still counts steps; nothing is derived from the
animation; evidence does not change with it. Own pull request, as for #13.

### 9b. The conditions panel (C's `SimulationView.tsx`; C agreed)

"1 Choose a Location" becomes **"1 Cabin Conditions"**:

| Control | Range | Notes |
|---|---|---|
| Place | every place in `habitats.json` | Picking one fills in its oxygen and pressure (`defaultPoint`). Not required: the sliders work without it. |
| Cabin oxygen | 10 to 100 % | Slider and typed value |
| Pressure | 0.2 to 5 atm, shown in psi | Slider and typed value |
| Airflow | 0 to 50 cm/s | Replaces "Still Air / Near a Vent". 0 counts as still air for the evidence line. |
| Gravity | 0 (microgravity) to 1 (Earth) | "% of Earth". No preset implies a tested condition: every PSI test ran in microgravity. |

The values live in the URL (`o2`, `p`, `air`, `g`), as on the Fire page, so a link reopens the same
settings. Under the sliders:

- **Inside a place's range:** "These values are the air of: <place>". Evidence works as today.
- **Outside every place's range:** "Not the air of any listed place. Evidence colours are off. The
  nearest real tests are listed with how far away they are." (Not "no research": NASA may have
  tests at those values that are not tied to a named place.)

### 9c. Which place the values belong to (A's `web/src/data/`; A agreed)

Evidence is worked out per named place (`inside_by_habitat` in `fuels.json`), so custom values
change the evidence only by changing which place they fall in. A small pure helper:

- `placesContaining(habitats, o2, pressure)`: every place whose oxygen and pressure range holds
  the values.
- When several match (the Space Station and Earth are identical; NASA's Moon Base air sits inside
  the challenge's Moon Base range, with 0 tests against 20): use the place last picked from the
  dropdown while the values are still inside it, otherwise the narrowest range. The line under the
  sliders names all of them and says which one the evidence is for.
- Three places are a single point, so they match only at exactly their values. That is
  `CLAUDE.md` open question 10; this step keeps exact matching and says so on screen.
- To check before building: `taskAnswers()` takes a place. What it does with none is not yet read.

### 9d. Geometry in the sample (B)

- **Distance along the deck.** Today the spread goes in a straight line, through bulkheads. It
  would follow the deck through the doorway and the hatch. Pure geometry of the example layout.
- **Vents.** The supply grilles and the fan already drawn become data, giving airflow a direction
  along the craft. Example layout, labelled as such.
- **Down.** Toward the deck.

### 9e. Settings that change the spread (B)

Each is a strength from "no effect" upward, set by the user, with its rule written beside it:

| Setting | What it changes on screen when turned up |
|---|---|
| Airflow effect | Items downstream of the fire count as nearer and those upstream as farther, in proportion to the airflow set; the cloud leans downstream. |
| Gravity effect | The cloud lifts toward the ceiling in proportion to the gravity set; items above the fire count as nearer. |
| Oxygen effect | How far the spread gets before it stops: lower oxygen, fewer items lit. |
| Pressure effect | The same, for pressure. |

The form of each rule is ours and is stated on screen; the strength is the user's. None is physics.

### 9f. Stretch: a published formula, once checked

Open one of the flame-spread papers, confirm the formula and what it applies to, and offer it as a
cited preset for the oxygen and airflow settings on a single surface. Only if the source can be
opened and read.

### Order, branches and size

| Part | Branch | Files | Owner |
|---|---|---|---|
| 9a | `docs/settings-driven-spread` | `CLAUDE.md`, `docs/LAYOUT_PLAN.md` | shared |
| 9b, 9c | `app/cabin-conditions` | `SimulationView.tsx`, a helper in `web/src/data/`, `types/sim.ts` | C, A, shared |
| 9d, 9e | `scene/settings-driven-spread` | `web/src/scene/cabin/` | B |
| 9f | later | - | B, checked by A |

9b and 9c are useful on their own and come first. 9d and 9e need 9a agreed. This is the largest
change since the cabin itself; the feature freeze is Sunday 15 November, 3 p.m.

---

## 10. Questions

### Open

| # | Question | Who | Affects |
|---|---|---|---|
| Q11 | Do all three humans agree to change the rule again (9a), so settings on screen may change the order of spread? | **Whole team** | Steps 9d, 9e |
| Q12 | What should the task cards show when the values are not the air of any listed place? | C | Step 9b |
| Q13 | Single-point places match only at exactly their values (open question 10 in `CLAUDE.md`). Keep exact matching, or agree a tolerance? | A, C | Step 9c |
| Q14 | Is the form of each rule in 9e acceptable, given that only its strength is the user's? | B's human, team | Step 9e |
| Q7 | Delete `HabitatMap3D.tsx` and `Flame3D.tsx`, or bring the all-tests map back somewhere? | Team | Step 8 |
| Q9 | Who writes the new wording for `CLAUDE.md` and `docs/LAYOUT_PLAN.md` (step 4c)? B can draft it; all three humans must see it. | Team | Step 5 |
| Q10 | In the illustrated spread, should a liquid or gas point light up the same way as a solid area, and should plain furniture ever light? This plan: only fuel items light; furniture never does. | B's human | Step 5 |

### Step 4a in detail (built, uncommitted)

Checked first: on every remote branch the stage received only the fuel type and whether Simulate
was pressed. Added:

- `web/src/types/sim.ts` (shared): `StageFire` = the place's oxygen and pressure, the still/vent
  choice, and what the nearest real tests of the chosen material did.
- `web/src/panels/sim/SimStage.tsx` (C's): optional `fire` prop. C's stage does not draw from it.
- `web/src/panels/SimulationView.tsx` (C's): passes `fire` from values the page already had.

Verified in the browser: for the Space Station with "Near a Vent" the stage receives oxygen 0.21,
pressure 1 atm, airflow "vent", behaviour "unknown". These three files belong in their own pull
request, separate from the cabin.

### Step 4b in detail (not started)

`web/public/layouts/example-spacecraft.json`: the 11 marks from `cabin/spec.ts` (`SAMPLE_MARKS`)
as a `Layout`, with the note "Example layout, not a NASA design". It is in A's folder, so it goes
in a small pull request for A, ideally with a check in A's validator. A's `layoutProblems()`
already accepts the marks.

### Answered

- Wording when values are outside every place? "Not the air of any listed place", with the nearest
  real tests listed (B's human, 2026-11-14).
- Several places match? The place last picked while the values are still inside it, otherwise the
  narrowest range (B's human, 2026-11-14; taken from "do as you suggest").
- Fire spread and a timeline? Yes, option C: the whole team agrees (B's human, 2026-11-14).
- Where do the sample's marks live? A new example layout file in A's folder (step 4b).
- Does C pass oxygen, airflow and behaviour to the stage? Yes; built as step 4a.
- Has C agreed that B rebuilds the Simulation tab's 3D stage? Yes (B's human, 2026-11-14).
- Is the Sunday 15 November deadline still right? Yes.
- Which places show the spacecraft? All of them: one sample layout.
- Look of the model? Blue wireframe hologram.
- Uploaded plan? An image on the deck where the user places a point; no drawing of marks.
- Did C change "Step 4 - Pick Where the Fire Starts"? Yes: it is now the button "Simulate Your
  Project!" leading to the Simulation tab (pull request #6).
- Should `HabitatSimMap` and `LayoutCanvas` be one thing? Yes; C's stage already is. Both dropped.
- Fire or map first? Fire first; done.
- `showLabel` on the fire: not needed; `FireModel3D` draws its own label and C's CSS hides the
  duplicate on the fire page.

## 11. Not in this plan

- A physics model of fire, or any time, speed or number derived from the picture. (Whether an
  illustrated spread is allowed at all is Q2.)
- Detecting rooms, walls or materials from an uploaded image.
- A "Moon gravity" preset.
- Changes to the data, the evidence functions, the panels' text or `styles.css`.
