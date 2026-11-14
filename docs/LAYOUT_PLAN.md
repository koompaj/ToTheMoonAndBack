# LAYOUT PLAN - the habitat evidence map

**Status: agreed by the team (2026-11-14). Read `CLAUDE.md` first, then this file, then your brief.**
This feature adds to the existing flow (`docs/PLAN.md`); it does not replace it.

---

## 1. The idea in one line

The user uploads a floor plan of a place where a crew lives, marks what could burn and where, and
every mark lights up with **how much NASA evidence exists** for a fire there: what NASA tested, what
happened, and what is not in the tables.

It is an **evidence map, not a fire simulation.** Nothing spreads between marks. The 3D fire on a
mark is an illustration, labelled as one.

## 2. The user journey

| Step | Where | What the user does | What they see |
|---|---|---|---|
| 1 | Home (`#map`) | Picks a place, e.g. "Moon Base (NASA Exploration Air)" | Same as today |
| 2 | Place (`#place?h=moon_base_nasa`) | Clicks **Map Your Layout** | Same page as today, plus that button |
| 3 | Layout (`#layout?h=moon_base_nasa`) | Uploads a floor plan image, or clicks **Use Example Layout** | The plan, a toolbar and an empty list |
| 4 | Layout | Marks things with the three tools (section 3) and picks what each is made of | Each mark turns teal, amber or coral at once |
| 5 | Layout | Reads the summary | e.g. "8 marks: 2 tested in this air, 6 tested only in other air" |
| 6 | Layout | Clicks a mark | Its evidence card (section 5) |
| 7 | Layout | Clicks **Start a Fire Here** on a card | The 3D fire illustration for that fuel, the nearest real tests and the three tasks (detection, suppression, prevention), as on the Fire page today |
| 8 | Layout | Clicks **Download Report** or **Save Layout** | A CSV of every mark with its colour, gaps and sources; a JSON file of the layout to reopen later |

The air (oxygen and pressure) comes from the place chosen in step 1 and is the same for the whole
layout: one sealed cabin has one atmosphere.

## 3. How the user chooses the fuel type

A toolbar above the plan. **The tool chosen is the fuel type**, so users never need the words
"solid / droplet / gas":

```
[ ▭ Material area ]   [ 💧 Liquid point ]   [ 🔥 Gas point ]       ■ tested in this air  ■ other air only  ■ not in the tables
```

| Tool | Fuel type | How it is placed | Means |
|---|---|---|---|
| Material area | `solid` | Drag a box | A surface the cabin is built or furnished with: panels, seats, fabric, cable covers |
| Liquid point | `droplet` | Click once (a pin) | Where a liquid is stored or used: a solvent, a fuel |
| Gas point | `gas` | Click once (a pin) | A flammable gas line or tank |

As soon as a mark is placed, a panel opens:

```
┌ Material area ──────────────────────────┐
│ Name (optional)  [ Crew seats          ] │
│ Made of          [ Nomex · 9 tests    ▾] │
│ Airflow          ( ) still air           │
│                  (•) near a vent         │
│ [ Save ]  [ Delete ]                     │
└──────────────────────────────────────────┘
```

- **The list holds only fuels NASA tested**, each with its test count (section 4), plus one last
  option: **"Other (not in NASA's tables)"**, which always shows coral.
- **The name is free text** and only a label. It never changes the evidence. We do not claim to know
  what a seat is made of; the user picks the material.
- **Airflow** is "still air" or "near a vent". It adds a line to the card (section 5); it does not
  change the colour.
- Clicking a mark again reopens the panel. A list beside the plan shows every mark with its colour,
  so the page works with a keyboard and on a phone.

## 4. What the user can pick (from NASA's tables)

Counts are distinct tests (duplicate rows left out). They come from the data at build time; the app
must read them from `fuels.json` (section 6), never hard-code them. Snapshot 2026-11-14:

**Material area (solid)**

| Option | Tests | Experiments | Oxygen tested | Pressure |
|---|---|---|---|---|
| PMMA (acrylic) | 91 | BASS, BASS-II, SAFFIRE-II | 14.2-22.2 % | not in the tables |
| Cotton-fiberglass fabric (SIBAL) | 45 | BASS, BASS-II, SAFFIRE-I to III | 16.4-22.1 % | not in the tables |
| Japan wax | 11 | BASS, BASS-II | 17.4 % | not in the tables |
| Nomex | 9 | BASS, BASS-II | 21.0-22.2 % | not in the tables |
| Paraffin wax | 7 | BASS | not in the tables | not in the tables |
| Wax (type not stated) | 6 | BASS | not in the tables | not in the tables |
| Silicone | 4 | SAFFIRE-II | 21.5-22.1 % | not in the tables |
| Ultem | 2 | BASS | not in the tables | not in the tables |
| PMMA and Nomex | 1 | SAFFIRE-II | 22.1 % | not in the tables |

(87 more solid tests name only a shape, such as "1/4\" black rod", so they are not offered as a
material.)

**Liquid point (droplet)**

| Option | Tests | Experiments | Oxygen tested | Pressure tested |
|---|---|---|---|---|
| Methanol | 157 | FLEX | 12.0-34.0 % | 10.2-44.9 psi |
| Heptane | 117 | FLEX | 13.0-34.0 % | 10.2-44.9 psi |
| Dodecane (n- and iso- mixes) | 87 | CFI | 17.0-21.0 % | 7.3-73.5 psi |

**Gas point (gas flame)**

| Option | Tests | Experiments | Oxygen tested (cabin air) | Pressure tested |
|---|---|---|---|---|
| Ethylene | 349 | ACME Flame Design, SPICE | 19.8-39.9 % | 6.2-44.2 psi |
| Propylene | 339 | SPICE | not in the tables | not in the tables |
| Propane | 169 | ACME CFI-G, Flame Design, SPICE | 20.9-40.0 % | 8.0-48.0 psi |
| Butane | 140 | ACME CFI-G | 20.7-39.9 % | 7.3-48.0 psi |
| Ethane | 94 | ACME CFI-G | 18.0-40.0 % | 7.2-48.0 psi |
| Methane | 4 | SPICE | not in the tables | not in the tables |

Hydrogen is **not** offered: it appears only in a per-day summary table (ACME s-Flame), never as an
individual test. Rocket propellants are out of scope (challenge page).

## 5. The colours and the evidence card

### The rule (one rule, applied to every mark)

| Colour | Name in data | When |
|---|---|---|
| Teal | `tested_here` | At least one cabin-air test of this exact fuel falls inside the place's oxygen and pressure box |
| Amber | `tested_elsewhere` | This fuel was tested, but no test falls inside the box (or its tests cannot be placed because their table has no pressure or oxygen) |
| Coral | `not_in_tables` | The user picked "Other (not in NASA's tables)" |

**Colours mean "how much evidence", never "how dangerous".** An amber mark is not safer than a coral
one; there is just more data. The legend and the summary must say so.

Expected result (snapshot 2026-11-14):

| Place | Teal | Amber |
|---|---|---|
| Moon Base (challenge box) | Butane (14 tests inside), Ethane (6) | everything else |
| Moon Base (NASA exploration air) | none | everything |
| Space Station (ISS), Earth | Dodecane (28), Methanol (3), Heptane (1), Propane (1), Ethane (1) | all solids, other gases |
| Spacesuit | none | everything |

### The evidence card (one per mark)

Example for a Nomex area in NASA's exploration air (the numbers are real; the row chip is a
placeholder for the cited test):

```
┌ Crew seats · Nomex · near a vent ─────────────────── AMBER ┐
│ What NASA tested                                          │
│  9 Nomex tests (BASS, BASS-II) at 21.0-22.2 % oxygen.     │
│  Pressure: not in the tables.             [BASS-II · row n]│
│ The gap                                                   │
│  This air: 32-36 % oxygen, 8.0-8.4 psi. The highest       │
│  Nomex test is 22.2 %: about 10 points short.             │
│ Airflow                                                   │
│  No Nomex test records airflow. Near a vent is not in the │
│  tables.                                                  │
│ How the tests ended   not recorded for Nomex              │
│ [ Start a Fire Here ]                  doi:10.60555/...   │
└───────────────────────────────────────────────────────────┘
```

Every line carries a citation (test row or DOI), as everywhere else in the app. Gap lines are coral
and say "not in the tables", never "never tested".

## 6. Data contract (workstream A provides; B and C read)

New, produced by `scripts/build_web_data.py` and checked by `scripts/validate_data.py`:

- **`web/public/data/fuels.json`**: the options in section 4.
- **`web/src/types/layout.ts`** (shared contract; agree changes with all three).
- **`web/src/data/layoutEvidence.ts`**: `markEvidence(data, habitat, mark)` returns the colour and
  the card lines. Pure function, no React, so the AI script can reuse it.

```ts
// web/src/types/layout.ts (proposed)
export interface FuelOption {
  id: string                    // "solid:nomex", "droplet:methanol", "gas:butane"
  fuel_class: FuelClass
  name: string                  // "Nomex"
  test_ids: string[]            // distinct tests (duplicates left out)
  test_count: number
  investigations: string[]      // accessions
  o2_range: [number, number] | null        // cabin-air oxygen fraction
  pressure_psi_range: [number, number] | null
  airflow_range: [number, number] | null   // via airflowRange(): negative values left out
  endings: Record<string, number>          // as NASA records them
  note: string | null           // e.g. "Pressure is not in these tables."
}

export interface LayoutMark {
  id: string
  kind: 'area' | 'point'        // area = solid; point = droplet or gas
  fuel_class: FuelClass
  fuel_option_id: string | 'other'
  label: string                 // free text, never used for evidence
  airflow: 'still' | 'vent'
  // position on the plan as fractions of its width and height (0..1)
  shape: { x: number; y: number; w?: number; h?: number }
}

export interface Layout {
  version: 1
  habitat_id: string
  image_name: string | null     // the image itself is never saved or uploaded
  marks: LayoutMark[]
}

export type EvidenceTier = 'tested_here' | 'tested_elsewhere' | 'not_in_tables'

export interface MarkEvidence {
  tier: EvidenceTier
  tested: Statement[]           // "What NASA tested"  (Statement as in ai/fireTasks.ts)
  gap: Statement[]              // "The gap"
  airflow: Statement[]          // "Airflow"
  endings: Record<string, number>
  inside_test_ids: string[]     // tests inside the place's box
  nearest_test_id: string | null
}
```

Workstream A also provides **`web/public/layouts/example-moon-habitat.json`**: an example layout
(marks only) with one or more marks of each type, labelled "Example layout, not a NASA design".

## 7. Who builds what

### Workstream A (data) - tonight

1. `fuels.json` built from `tests.json` with whole-word fuel matching (so "methane" is never read as
   "ethane"), distinct tests only.
2. `layout.ts` and `layoutEvidence.ts` exactly as section 6.
3. The example layout JSON.
4. New checks in `validate_data.py`: every option's counts match `tests.json`; the colour of every
   option for every place matches section 5's table; no option is offered without a test.

Done when: `npm run build` passes, the validator passes, and C can import `markEvidence`.

### Workstream B (3D) - `web/src/scene/LayoutCanvas.tsx`

A controlled component (draws from props, reports through callbacks, like `docs/PLAN.md` section 3):

```ts
interface LayoutCanvasProps {
  imageUrl: string | null       // object URL of the uploaded image, or the example plan
  marks: LayoutMark[]
  tiers: Record<string, EvidenceTier>   // mark id -> colour
  selectedId: string | null
  tool: 'area' | 'point-liquid' | 'point-gas' | 'select'
  onAdd: (shape: LayoutMark['shape'], tool: string) => void
  onSelect: (id: string | null) => void
  onMove: (id: string, shape: LayoutMark['shape']) => void
}
```

- Draw the plan image scaled to fit; boxes for areas, pins for points; fill by tier
  (teal `#2dd4bf`, amber `#fbbf24`, coral `#ff6b6b`), outline in the fuel colour from `scene/scale.ts`.
- Drag to draw a box (area tool), click to drop a pin (point tools), drag to move, click to select.
- Keyboard: Tab through marks, arrow keys move the selected mark, Delete calls back to C.
- A 2D canvas is enough. The **Start a Fire Here** illustration reuses `FireModel3D` from
  `docs/PLAN.md` (C places it beside the plan).
- No text in the canvas except via `Label.tsx`; no network at runtime.

Done when: a user can draw, drop, move and select marks on an uploaded image and on the example
plan, and colours update from `tiers`.

### Workstream C (dashboard) - `web/src/panels/LayoutView.tsx`

- Route `#layout?h=<habitat>`; a **Map Your Layout** button on the Place page.
- Upload: `<input type="file" accept="image/png,image/jpeg">` read with `URL.createObjectURL`.
  **The image never leaves the browser** (no server, works offline). Show "Your image stays on this
  computer".
- **Use Example Layout**: loads the example JSON and an example floor-plan picture (C draws it as an
  SVG in the app style, labelled "Example layout, not a NASA design").
- The toolbar, the mark panel (section 3; the list comes from `fuels.json`), the list of marks, the
  summary line, the legend with "colours show how much evidence, not how dangerous".
- The evidence card from `markEvidence` (section 5), with `Cite` chips.
- **Start a Fire Here**: the same parts as the Fire page (fire illustration, nearest tests, three
  tasks) for that mark's fuel type at the place's air.
- **Download Report** (CSV: label, type, fuel, colour, gap lines, sources) and **Save / Open Layout**
  (the `Layout` JSON).

Done when: the journey in section 2 works end to end on the example layout and on an uploaded image.

## 8. Rules that do not change

- Real NASA data only. Every number on a card comes from `fuels.json` or `markEvidence`.
- Colours mean evidence, not danger. Say "not in the tables", never "never tested".
- Only tested fuels can be picked, plus the explicit "Other (not in NASA's tables)".
- Position on the plan changes nothing physical: no spread, no heat between marks, no distances.
- The fire is "Illustration, not a simulation", visible whenever it is on screen.
- The uploaded image stays in the browser and is not saved in the layout file.
- Inverse-flame tests never count toward a place (as everywhere else).

## 9. Out of scope

- Fire spreading across the layout over time.
- Detecting materials or objects from the image.
- Partial gravity (PSI has none), and pressure for solid materials (not in the tables).

## 10. Timeline (deadline Sunday 15 November, 11:59 p.m. local)

| When | What |
|---|---|
| Saturday night | A: section 6 data, functions, example layout, checks; pushed and merged |
| Sunday morning | B: `LayoutCanvas`. C: `LayoutView`, upload, panel, cards, report |
| Sunday noon | Wire together; test on the example and on one uploaded image |
| Sunday 3 p.m. | Feature freeze; record the 30-second video or build the 7 slides |
| Sunday 9 p.m. | Submit (about 3 hours spare) |

## 11. Demo idea (fits the 30-second video)

1. Moon Base (NASA exploration air) -> **Use Example Layout**.
2. The plan lights up almost entirely amber: "NASA tested these materials, but not in this air."
3. Click the crew seats (Nomex): "highest Nomex test 22.2 % oxygen; this cabin is 34 %."
4. Click **Start a Fire Here**: illustration plus what the nearest real tests did.
