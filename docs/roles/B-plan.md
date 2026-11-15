# Workstream B - implementation plan

**Status (2026-11-15): steps 0 to 7 are merged (pull requests 7, 9, 12, 13 and 14). Of step 9:
parts 9a (the rule change, pull request 21), 9b and 9c (the Cabin Conditions panel and place
matching, pull request 20), 9d (the spread follows the room, with a ceiling and vent duct, pull
request 23) and 9e (the spread settings, pull request 24) are merged. Part 9f (a published
formula as a cited preset) is NOT done: no source holding the formula could be opened from this
computer; see section 9f. Step 8 is not started. Of step 10, B's human chose the small version
(choice B): the example spacecraft now has a closed room reached only along the vent duct. It is
built on branch `scene/closed-room` and is not committed. On the same branch, also not
committed: the uploadable layout. The page's floor-plan upload box takes a 3D layout file
(`.json`) as well as a picture, and the L-shaped sample file is in the repo. Evidence colours and
cards for the items of an uploaded layout (the rest of 10e) are not built.**

The paragraphs below were written as each part was built and still say "uncommitted" or "waiting
for review" in places; the status above is the current one.

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
- Done 2026-11-15 (asked for by B's human): `Flame3D.tsx`, `HabitatMap3D.tsx` and the dev-only
  preview page (`cabin/preview/`) were removed, since nothing in the app imported them, and
  `scale.ts` was cut down to the fuel-type colours, the only part still used. All are in git
  history if the all-tests map is wanted again (Q7). `cabin/samples/` is kept: the app does not
  import it, but its files are there for people to upload.
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

**Tried 2026-11-15: not done. Nothing was built.** What happened with each source:

| Source | Result |
|---|---|
| NASA NTRS 20040053557, "Opposed-flow flame spread in microgravity" (Bhattacharjee and others) | 403 Forbidden from this computer, as `CLAUDE.md` already notes for NTRS |
| San Diego State abstract, "Opposed-Flow Flame Spread Over Thin Films of PMMA in a Microgravity Environment" | Opened and read in full. It says closed-form formulas for spread rate over thin and thick fuels in the radiation-dominated microgravity regime exist, and that a computational model and three years of drop-tower tests on thin PMMA films agree with them. It gives no formula. |
| A SciSpace page citing de Ris's expression | Stopped at a "confirm you are human" check, which was not bypassed |
| A Lund University file | Offered a file download instead of a page; not downloaded |

So no formula has been read, and the condition for this part is not met.

Even with the formula in hand, a numeric preset looks hard to defend, for reasons to weigh before
anyone spends time on it (the last two come from search summaries, not from a source read here):

- These formulas give the spread rate along ONE thin sheet of ONE material. The spread settings
  act on fire getting from one object to another across a cabin, which the formulas do not cover.
- They need material properties (thickness, density, heat capacity, vaporisation temperature) and
  a flame temperature. None of those is in the PSI tables, so each would be one more unsourced
  input.
- A 1996 study is reported to have found the classic de Ris formula in error by as much as a
  factor of 10 because of its simplifying assumptions.
- In its simplest regime the classic result is reported to depend on oxygen (through flame
  temperature) but not on flow speed or pressure, which would argue against, not for, presets for
  the airflow and pressure settings.

Ways forward, for B's human to choose: someone on another network opens the NTRS paper and puts
the PDF in the repo for reading; or 9f is closed as not done and the settings stay as the user's
assumptions with no preset.

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

## 10. Step 10 - a second 3D layout the user can upload (DRAFT, not approved)

### What B's human asked for (2026-11-15, 11:30)

"Create another sample 3d on my local so that i can upload and test simulation on the web. I want
it to have diff shape from the sample one, and also have 1 closed door/room but still have vent
that connected to the closed room."

### Decision (2026-11-15): choice B, with the flight deck as the closed room

B's human chose choice B from the table at the end of this section, said any upload format that
is easy will do, said no pull request is needed for the rule's wording (10a), and asked for the
second sample to be simpler, with no lab (10f is changed to match).

Choice B was written as "close the node hatch". That cannot take a duct: just behind that
bulkhead the node is only as wide as the hatch (hull radius 1.05 at x = 2.8, the same as the
hatch's opening), so there is nowhere for a duct to pass. B's human agreed to close the **flight
deck door** instead, where the hull is wide enough for the ceiling duct to run straight on.

Built on `scene/closed-room` (B's folder only, not committed):

- `cabin/spec.ts`: the flight deck bulkhead is `closed`; the duct runs on through it above the
  door and ends 0.48 inside the flight deck (`DUCT.x0` = -3.88), with a short grille under its end
  (`OUTLET`); `DUCT_OPENINGS` lists the three ways into the duct; `checkSpec` now checks that the
  duct stays inside the hull and that each grille is under it and not across a bulkhead.
- `cabin/path.ts`: a closed door cannot be passed along the deck. `routeToItem` gives the way to
  an item: along the deck where there is one (unchanged), otherwise up to a grille, along the
  duct and down from another grille.
- `cabin/timeline.ts`: the order uses `routeToItem`; an entry records when its way is the duct.
- `cabin/ReachField.tsx`: the cloud stops at the closed door and reaches the other side in
  through one grille, along the duct and out through another.
- `cabin/Hull.tsx`, `cabin/parts.tsx`: the door is drawn shut (pale panel, bars, hand wheel) with
  a "Closed door" label; the outlet grille and a "Vent into flight deck" label.
- `cabin/CabinFire.tsx`: the line from the fire to an item behind the door runs up to the duct,
  along it and down, not through the door.
- `cabin/TimelineBar.tsx`: the note now says the door is drawn closed, that the drawing gets in
  and out of the flight deck only along the duct, and that this is our choice, not a finding.

Checked by script (`closed.cjs` in the session's scratch folder): no way along the deck across
the closed door; from 263 start points on the deck every fuel item can be reached; a fire in the
cabin or node lights the two flight deck items by the duct and nothing else by it; a fire in the
flight deck lights its own two items first and the other nine by the duct; on one side of the
door the distances are exactly what they were; the airflow setting still changes the order.
Checked in the browser: the door and labels; a fire in the flight deck fills it, stops at the
door, runs along the duct and comes down into the cabin under the first grille; no console
errors. `npm run build` passes.

Not checked: the line that runs along the duct (too thin to make out in the screenshots), the
gravity setting with this layout, a phone, a projector, a weaker laptop, reduced motion.

**Open issue, reported not fixed.** `CLAUDE.md` words the source of the order as "distance
through the example layout (along its deck and through its doorways)". The duct now decides the
order for the closed room, which those words in brackets do not mention. The screen does say it.
B's human decided no change to `CLAUDE.md` is needed; A and C have not been asked.

### Built 2026-11-15: the small version of the uploadable layout (B's folder only)

B's human asked again for the L-shaped sample to load and test, and chose the small version: the
file is loaded inside the 3D view, so C's page and the shared `types/sim.ts` are not touched. The
cost, agreed: the page never learns what is in a loaded layout, so it has no evidence colours and
no cards, and its fire is placed and started in the view, not with the page's fire point and
"Simulate".

- `cabin/samples/l-shaped-habitat.layout.json`: the sample (main hall, crew quarters, a storage
  room with a closed door, a duct with a grille in each room, 7 fuel items and 2 plain ones).
  `cabin/samples/README.md` describes the format.
- `cabin/layoutFile.ts`: reads and checks a file. A file with any problem is refused whole and
  each problem is listed; nothing is guessed. A fuel that is not in `fuels.json` is refused. Every
  room must be reachable by an open door or a grille.
- `cabin/layoutGrid.ts`: cuts the layout into 0.2 m cells and works out the shortest way from the
  fire to every cell (inside rooms, through open doors only, into the duct only at a grille). One
  table gives the order and the cloud.
- `cabin/LayoutModel.tsx`, `cabin/LayoutField.tsx`: the drawing and the cloud for a loaded layout.
- `CabinStage3D.tsx`: the load button, "Back to the example spacecraft", "Clear the fire", the
  note saying what a loaded layout does not have, and the list of problems when a file is refused.
- Shared spread code made general so both layouts count steps the same way: `planFrom` and
  `SpreadItem` in `cabin/timeline.ts`; the line to an item now follows `way` points; the airflow
  rule and the note under the timeline have wording for a loaded layout.

Checked by script (`layout.cjs` in the session's scratch folder) on the sample: from a fire in
each room all 13,862 open cells and all 7 fuel items are reached; the storage room's items are
reached only by way of the duct; two points 0.4 m apart across the closed door are 9.5 m apart
by the only way there is; the table takes about 45 ms; eight broken files are each refused with
the right message. The spacecraft's own checks give the same results as before.
Checked in the browser: the sample loads and draws; a fire in the hall fills the hall, passes
the open door, runs along the duct and reaches the storage room last, with a sharp edge at the
closed door; a file naming `solid:wood` is refused and the layout on show stays; no console
errors. `npm run build` passes.

Not checked: choosing the file through the real file dialog (the test put the file into the
input by script), a fire started in the storage room in the browser, the spread settings with a
loaded layout in the browser (by script only), a phone, a projector, a weaker laptop, reduced
motion.

**Changed the same day, asked for by B's human** after trying the page's upload box with the
`.json` (it was shown as an empty picture, and the button inside the view was not found):

- The page's floor-plan upload box now lists `.json` and says so (two lines in C's
  `SimulationView.tsx`; B's human has leave to edit C's files; C has not seen it). The shared
  `types/sim.ts` is not touched: the page still hands the view one file as `imageUrl`.
- `CabinStage3D.tsx` reads that file to tell a picture from a layout (`readUpload`). A layout is
  drawn in 3D; a layout with a problem shows the list of problems in the middle of the view and
  is never drawn as an empty plan; anything else is treated as a picture, as before.
- A layout's fire is now placed and started like every other: double-click a floor, then the
  page's "Simulate". The page's cards describe the fuel chosen in step 2, as for a picture.
- Removed, as asked: the "Load 3D layout", "Back to the example spacecraft" and "Clear the fire"
  buttons and the paragraph under them. "Example Cabin" on the page goes back to the spacecraft
  and "Clear Point" clears the fire.

Checked in the browser after the change: the sample goes in through the page's box and draws; a
fire in the hall and "Simulate" give 7 steps, with the storage room reached last; the file naming
`solid:wood` shows the problem list; a PNG still shows as a flat plan; no console errors. The
file was put into the input by script, not through the real file dialog.

**Reported, not fixed:** with the paragraph removed, nothing in the view's panel says that a
layout's items are coloured by fuel type and not by evidence. The colour key in the panel names
the fuel types, and the label under the layout says "Your layout file, not a NASA design". After
a refused file, a fire point left from before leaves the page's "Simulate" button enabled; it
draws nothing.

Known limits: the panel covers the right-hand end of a wide layout until the view is turned;
distances follow the 0.2 m cells, so the cloud's edge is a little blocky under its ragged
texture; one ceiling height and one duct per layout.

### What exists today, and why this is a new feature

- **The upload takes a picture only.** `SimulationView.tsx` accepts PNG or JPG. The stage lays the
  picture flat on a plain deck and lets the user place the fire. It has no walls, doors, vents or
  items, so **no spread is drawn on an upload** (`CabinStage3D.tsx`: "An uploaded plan has no
  items").
- **The one 3D layout is code, not a file.** The spacecraft is `cabin/spec.ts`, read by nine scene
  files. Its shape (a body of revolution with two bulkheads) is written into the distance code
  (`path.ts`) and into the cloud's shader (`ReachField.tsx`). A different shape cannot be dropped
  in as data.
- **A 3D model file (glTF, OBJ) would not help.** A mesh does not say which gap is a door, which
  door is shut, where the duct runs or what an object is made of. The spread and the evidence both
  need that, so the file has to be our own format.

So "upload a 3D layout" means: a layout file format, a second way of working out distance that
reads any layout, a drawing of any layout, and an upload that accepts the file.

### 10a. The rule's wording (shared file, all three humans)

`CLAUDE.md` says the order comes from "distance through the example layout (along its deck and
through its doorways)". Two things in this step go beyond those words:

1. The layout may be the user's own file, not only our example.
2. A closed room is reached only through its vent duct, so the duct becomes part of the distance
   that decides the order. (Today the duct carries the cloud but never changes the order.)

Proposed wording: "distance through the layout on screen (along its floor, through its open
doorways and along its vent ducts)". A closed door stopping the drawing and a duct carrying it are
shapes of our own and must be written on screen as such, like the other effects. Nothing else in
the rule changes: steps not time, nothing derived, evidence does not move.

### 10b. The layout file

One JSON file, lengths in metres, every value the author's own. It is a drawing aid, so the file
and the screen both say "Example layout, not a NASA design" (or "Your layout" for an upload).

| Part | Fields |
|---|---|
| Rooms | `id`, `name`, a box on the floor (`x0`, `x1`, `z0`, `z1`), `height` |
| Doors | the two rooms it joins, position along the shared wall, `width`, `open: true / false` |
| Ducts | a run of straight pieces above the ceiling, and its grilles (each names the room it opens into) |
| Air | the direction the air moves, for the airflow setting |
| Items | `id`, `label`, box, and either a fuel id from `fuels.json` or `plain` |

Checks on load, with a plain message for each failure and no guessing: rooms that overlap, a door
not on a shared wall, a grille outside its room, an item outside every room, a fuel id that is not
one of the 18 tested options (the item is refused, never mapped to a near match).

### 10c. Distance through any layout (B, new files)

A grid of small cells (about 0.2 m) over the layout. A cell is open if it is inside a room, in an
open doorway or inside a duct; a grille joins a duct to its room. From the fire's cell, the
shortest way to every other open cell is worked out once per fire point, with the same four
settings as today (`biasFactor`). That one table gives both the order of the items and the cloud.
The largest layout we would accept is about 60 x 60 x 20 cells, which takes a few milliseconds.

- A closed door is simply not open cells, so the only way into the closed room is the duct.
- `planSpread` gains a form that takes distances from the table instead of from `path.ts`.
- The cloud samples the table as a 3D texture, so it needs no shape written into the shader.

The spacecraft stays on its existing code. Moving it to the grid is not part of this step.

### 10d. Drawing any layout (B, new files)

Same blue wireframe: room outlines, walls with a gap at each open door, a closed door drawn as a
filled panel labelled "Closed", the duct and its grilles, items as labelled boxes. Not included
for these layouts: the detailed furniture kit, the outside view, the fittings toggle.

### 10e. The upload (C's page, one shared type)

- The upload input also accepts `.json`. A picture behaves as it does now.
- `CabinStageProps` (shared, `web/src/types/sim.ts`) gains two optional fields: the file's text
  going in, and a callback giving back the layout's marks or an error message. All reading and
  checking stays in B's folder; C's page takes the marks and colours them with A's
  `markEvidence()` exactly as it does for the example.
- The file never leaves the browser.

### 10f. The second sample: an L-shaped surface habitat (simplified: no lab)

EXAMPLE LAYOUT, NOT A NASA DESIGN. Flat walls and box rooms, so it does not look like the
spacecraft. Three rooms only, as B's human asked. Saved in the repo at
`web/src/scene/cabin/samples/l-shaped-habitat.layout.json`, so B's human can pick it in the upload
dialog. Not built.

```
z
10.5 +-----------+
     |  STORAGE  |   closed door; one grille from the duct
 8   +---XXXX----+   XXXX = closed door
     |           |
     |   CREW    |   duct runs above the ceiling:
     | QUARTERS  |   hall -> quarters -> storage
 4   +--     ----+-----------+
     |                       |
     |       MAIN HALL       |
 0   +-----------------------+
     0           4           6   x
```

Three rooms, two doors (one open, one closed), one duct with three grilles, about seven items
using fuels from `fuels.json` (for example PMMA panels, a methanol bottle and silicone cable
covers in the hall, cotton-blend bedding and Nomex in the quarters, a butane bottle and stowage
bags in the closed storage room). What it should show: start a fire in the hall and the storage
room's items light last, by way of the duct, with the cloud running along the duct and out of
the grille.

### Size, order and the freeze

| Part | Branch | Files | Owner | Size |
|---|---|---|---|---|
| 10a | `docs/layout-rule` | `CLAUDE.md`, `docs/LAYOUT_PLAN.md` | shared | 15 min plus agreement |
| 10b, 10c | `scene/layout-grid` | new files in `web/src/scene/cabin/`, `timeline.ts` | B | about 2 h |
| 10d, 10f | same | new files in `web/src/scene/cabin/`, `CabinStage3D.tsx` | B | about 2 h |
| 10e | `app/upload-layout` | `SimulationView.tsx`, `types/sim.ts` | C, shared | about 1 h |

About five to six hours with checks. It was drafted at 11:30 on Sunday; the feature freeze is 3
p.m. the same day and submission is 9 p.m. **It does not fit before the freeze.**

Smaller choices:

| Choice | What you get | What you do not | Size |
|---|---|---|---|
| A. All of step 10 | Upload a layout file; the L-shaped sample; closed room reached by the duct | Nothing merged before the freeze | 5 to 6 h |
| B. Close the node hatch on the spacecraft and run its duct into the node (**chosen; built with the flight deck door instead, see the decision above**) | A closed room reached only through the vent, in the layout already on screen | A different shape; an upload | about 1.5 h |
| C. Step 10 without the upload: the L-shaped sample as a second built-in layout | A different shape and the closed room | An upload; C's page still needs a switch and the marks | about 4 h |

B still needs 10a, because the duct starts to decide the order.

### A picture drawn in 3D by AI (2026-11-15, asked for by B's human; branch `app/plan-to-3d`)

After uploading a PNG or JPG floor plan, "Draw this plan in 3D with AI" in the page's "Your Own
Floor Plan" card sends the picture to Google Gemini through C's local helper and draws the answer
as a layout. (The button was first inside the 3D view; B's human asked for it in the card.)

- `ai/risk-server.mjs` (C's): a new endpoint, `POST /api/plan-to-layout`, with its own key,
  `API_FOR_SIMULATION` in the local `.env`. A GitHub secret cannot be used: only a GitHub Actions
  workflow can read one, and the repo has none. `/api/health` now also says whether that key is
  there. `ai/README.md` describes it. C has not seen this.
- `panels/sim/planToLayout.ts` (in C's folder, because the button is on the page): shrinks the
  picture, asks the helper, throws away anything the model says about materials, and marks the
  answer `drawn_by_ai`. The page hands the stage that file in place of the picture, the same way
  it hands over an uploaded file, so no shared type changes.
- `cabin/planFromPicture.ts`: the stage's side: reads the `drawn_by_ai` mark, and writes the
  drawing out as a layout file with the chosen fuels.
- `cabin/layoutFile.ts`: a `draft` option for the model's answer: any fuel in it is ignored and
  having none is allowed. Every other check is unchanged, and an answer with a problem is refused
  whole, with the problems listed and the choice to ask again or save the answer and fix it.
- `CabinStage3D.tsx`: the fuel picker (each object: "Not a fuel" or one of the 18 fuels in
  `fuels.json`) and "Save as a layout file".
- `SimulationView.tsx` (C's): the button, its notice, "Asking the AI...", "Back to the picture",
  the helper's error if it fails; the upload box says the file stays on the computer unless the
  button is pressed. `web/src/scene/cabin/samples/made-up-floor-plan.png` is the test picture.

How it keeps to the rules of evidence: the drawing is labelled "Drawn by AI from your picture.
Check it. Not a NASA design" in the scene and in the panel; **the model is told not to say what
anything is made of, and the user chooses every fuel**, labelled "Your choice, not NASA data";
the model's sentence about the scale it used is shown as the model's words; the picture leaves
the computer only when the button is pressed, and the button says where it goes.

Checked end to end with a made-up plan (three rooms, two doorways, four labelled objects, two
dimensions written on it) and the real key, which was already in the local `.env`: Gemini
(`gemini-3.5-flash`) answered in about half a minute, read the scale from the dimensions, found
the four objects, and the answer passed every check; fuels chosen for three objects; a fire
placed and "Simulate" gave a 2-step timeline with the cloud drawn. `npm run build` passes.

Not checked: a real floor plan (photo, scan or architect's drawing); a plan with no dimensions;
the refusal box with a real bad answer; "Save as a layout file"; what the model does with a
picture that is not a floor plan. `CLAUDE.md` says "The team no longer uses Gemini"; C's risk
review and this both do, so that line is out of date (shared file, not changed here).

### A's review of the spread against the rule (2026-11-15), and the fixes

A (Chai) checked the spread against "Spread is an illustration, never a result". It mostly
passes; four points, all fixed on branch `app/spread-review-fixes`:

| A's point | Fix | File |
|---|---|---|
| Three fixed values change the spread and are not on screen: a distance never counts as less than 15 % of itself; each of the oxygen and pressure rules gives at least 0.2; items per step stay between 0.2 and 6. | One labelled line in the Spread settings panel, "Fixed limits of this drawing (ours, not NASA data, and not yours to set)". The numbers are read from the constants the code uses (`MIN_FACTOR`, `RULE_FLOOR`, `PACE_LIMITS`). | `cabin/timeline.ts`, `cabin/SpreadSettings.tsx` |
| The place's air and gravity are shown without a source. | A "Source for the air of ..." line with the place's `source`, its `source_urls` and its gravity source, all from `habitats.json`. | C's `SimulationView.tsx` |
| "0.94 items per step" reads like a measured rate. | To the nearest half, with "about": "about 1 item per step". | `cabin/SpreadSettings.tsx` |
| Choosing the ISS fills in the edge of its band (19 %, 14.9 psi). | A place drawn as NASA's control band (no wider than 4 % oxygen and 0.4 psi) fills in the middle: 21 % / 14.7 psi for the ISS and Earth, 34 % / 8.2 psi for Moon Base (NASA air). Other places are unchanged. A line says what was filled in and the place's range. `defaultPoint()` is not changed: C's Fire page uses it. | C's `SimulationView.tsx` |

Checked in the browser: all five places fill in the values above and show their sources and
links; the limits line shows; with both effects at 100 % in NASA's Moon Base air the panel says
"about 1.5 items per step" and "about 0.5 items per step"; no console errors. `npm run build`
passes. Not checked: that each source link opens.

A also reported new counts after the BASS pressures (896 tests placed; 209 for the ISS and
Earth). Nothing in `web/src/scene/` or `web/src/panels/` hard-codes the old counts. `CLAUDE.md`
still says 775 and 171; that is A's to change.

---

## 11. Questions

### Open

| # | Question | Who | Affects |
|---|---|---|---|
| Q15 | Step 10, answered by B's human 2026-11-15: choice B (built with the flight deck as the closed room); any easy upload format; no wording change. Still open: A and C have not seen that the duct now decides the order for the closed room (10a). | **A and C** | Step 10 |
| Q11 | Do all three humans agree to change the rule again (9a), so settings on screen may change the order of spread? | **Whole team** | Steps 9d, 9e |
| Q12 | What should the task cards show when the values are not the air of any listed place? | C | Step 9b |
| Q13 | Single-point places match only at exactly their values (open question 10 in `CLAUDE.md`). Keep exact matching, or agree a tolerance? | A, C | Step 9c |
| Q14 | Is the form of each rule in 9e acceptable, given that only its strength is the user's? | B's human, team | Step 9e |
| Q7 | Answered 2026-11-15 by B's human: `HabitatMap3D.tsx` and `Flame3D.tsx` are deleted. Bringing an all-tests 3D map back would start from git history. | Team | Step 8 |
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

## 12. Not in this plan

- A physics model of fire, or any time, speed or number derived from the picture. (Whether an
  illustrated spread is allowed at all is Q2.)
- Detecting rooms, walls or materials from an uploaded image.
- A "Moon gravity" preset.
- Changes to the data, the evidence functions, the panels' text or `styles.css`.
