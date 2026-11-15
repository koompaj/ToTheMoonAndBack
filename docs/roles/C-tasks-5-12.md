# Tasks 5-12 for workstream C (Pleng) - written by workstream A, 2026-11-14

Read `CLAUDE.md` first. These are display tasks. Workstream A is building the data for them at the
same time, so this file fixes the **field names and shapes now**, and you can build against them
before the data lands.

## How we split the work

- **A makes every number.** Counts, ranges, matches and gaps come from `web/public/data/*.json` or
  from helpers in `web/src/data/`. A panel never works out a number by itself. If you need a
  number that isn't there, ask A; don't compute it in a panel.
- **Every new field is optional.** If it is missing (because A hasn't shipped it yet, or NASA's
  files say nothing), **hide that box or line.** Don't show an empty box, a zero or "unknown".
- **Every item on screen is cited:** a test row (`TestCite`) or an investigation DOI (`DoiCite`).
  For a sensor or shape from a report: the file and page A gives.
- **Wording rules:** say "not in NASA's tables", never "never tested". Inverse flames stay out of
  every count. Show the caveats wherever a finding appears.

## Order

1. **A's first pull request changes only the contract:** the new optional fields below in
   `web/src/types/data.ts` and the helper signatures in `web/src/data/load.ts`, with stub bodies.
   Merge it quickly, then branch from `main`.
2. **Start with 6, 11 and 12.** 6 needs only `outcomes.json`, which already exists. 11 and 12 need
   only the helpers. Then 7 and 9, then 5, 8 and 10 (their data comes last).
3. **Branches:** `app/<topic>`, one per item or a small group. Small pull requests, merged often.
   `npm run build` must pass.

---

## 5. "What NASA Measured" (experiment page)

**Data (A):** `Investigation.sensors?: Sensor[]`

```ts
export type SensorKind = 'thermocouple' | 'radiometer' | 'pressure' | 'oxygen' | 'co2' | 'flow'
  | 'camera' | 'spectral' | 'smoke' | 'soot' | 'humidity' | 'other'
export interface Sensor {
  kind: SensorKind
  name: string            // as NASA names it, e.g. "Ambient Pressure"
  detail: string | null   // e.g. "6 plume thermocouples", "unit PSIA"
  source_file: string     // PSI file name
  source_where: string    // "p. 46" or "sheet X, cell J2"
  quote: string | null    // NASA's own words, when from a report
}
```

**You:** a "What NASA measured" box on `ExperimentDetail` (`ExperimentsView.tsx`). Group the list
by `kind`, and show `source_file` and `source_where` on each line, with `quote` in a tooltip.
Use the heading "From NASA's reports and sensor logs". Hide the box if `sensors` is missing or empty.

**Done when:** Saffire-I shows its sensor-log list, and an experiment without `sensors` shows no box.

## 6. "Will It Go Out?" panel and CSV download

**Data (A):** `outcomes.json` exists now (`OutcomeAnalysis` in `types/data.ts`). A adds
`web/public/data/tests.csv` (one line per test row, with `source_table`, `source_row` and the
investigation DOI).

**You:**
- Show each study on the fire and place pages, using:
  - `question`, then `finding` (one sentence with counts);
  - a small bar per group (`went_out / recorded`, labelled with `label`);
  - `verdict`, and the matched-group results under a "Does it hold at the same pressure / within
    each fuel?" toggle.
- Show **all** of `caveats` under it, every time.
- Make each group's count open its `test_ids` as `TestCite` chips.
- CFI-G must say "no clear pattern" (its `verdict`); don't hide it.
- Add a "Download all tests (CSV)" link to `data/tests.csv`, relative path, on the Tests page, with
  the line "Every row cites its NASA table row and DOI".

**Done when:** FLEX shows 17 of 17 at 12-14 % and 0 of 9 at 34-36 %, with the caveats visible, and
the CSV downloads.

## 7. "What Varied" (experiment page)

**Data (A):** `Investigation.varied?: VariedCondition[]`

```ts
export interface VariedCondition {
  field: string            // the Test key, e.g. "o2_fraction", "airflow_cm_s", "fuel"
  label: string            // "Oxygen (cabin air)"
  unit: string | null      // "%", "psi", "cm/s", null for text
  min: number | null       // null for text fields
  max: number | null
  values: string[] | null  // text fields: the distinct values (up to 12)
  distinct: number         // how many different values
  recorded: number         // tests that record it
  total: number            // tests in this experiment
}
```

**You:** a "What varied between tests" list: label, then the range (or values), then "recorded in
`recorded` of `total` tests". Leave out a condition when `distinct` is 1. List those separately as
"Held fixed: …".

## 8. "Research Needed" by pillar (Risk page)

**Data (A):** `web/public/data/gaps.json`, loaded as `AppData.gaps?`

```ts
export interface GapStatement { text: string; test_ids: string[]; investigations: string[] }
export interface PillarGaps {
  pillar: Pillar           // prevention | detection | suppression
  tested: GapStatement[]   // what the tables do cover
  not_in_tables: GapStatement[]
}
export interface Gaps { generated_by: string; caveats: string[]; pillars: PillarGaps[] }
```

**You:** three columns or tabs on `RiskView`, one per pillar: "In the tables" and "Not in the
tables", each sentence with its cites. Any AI wording you add must only rephrase these statements
and keep their cites. It must not add claims. Show `caveats`.

## 9. Group by hardware (Experiments page)

**Data (A):** `Investigation.hardware_group?: { id: string; label: string; source: string }`, e.g.
`{ id: "cir_mdca", label: "Combustion Integrated Rack, droplet apparatus (MDCA)", source: "PSI record hardware field" }`.

**You:** a "Group by: pillar / hardware" toggle on `InvestigationsView`, kept in the URL
(`#experiments?group=hardware`). Experiments without `hardware_group` go in "Hardware not listed".

## 10. Fuel shape and size

**Data (A):** on `Test`:

```ts
fuel_shape?: string | null       // "rod", "flat sheet", "cylinder", "droplet", "gas burner (sphere)" ...
fuel_size_text?: string | null   // NASA's words, e.g. "1 cm diameter rod"
fuel_shape_source?: string | null // where it was read: column name, or file + page
```

A fills it only where NASA's text says so. Otherwise it's `null`, with the flag `shape_not_stated`.

**You:** add "Shape" and "Size" rows to `testRows()` in `TestDetail.tsx`. Show them only when they
aren't null. Add a "Fuel shapes" line on the experiment page (distinct `fuel_shape` values with
counts; count via a helper A provides, `shapeCounts(tests)`).

## 11. Places we can't place yet (Places page)

**Data (A):**
- The challenge Moon Base card is renamed **"Moon Base and pressurized rovers"**, because the
  challenge puts rovers in the same range (its note says so).
- New `web/public/data/places_waiting.json`, loaded as `AppData.waitingPlaces?`:

```ts
export interface WaitingPlace {
  id: string               // "spacecraft_cabin", "mars_habitat"
  name: string
  why: string              // why there is no card
  what_would_change: string
  source_urls: string[]
}
```

**You:** a short "Places we can't show yet" section under the cards, one line per place: `name`,
`why`, then `what_would_change`. Add a link to the conditions filter (item 12) saying "Try your own
values". Don't draw these places as cards.

## 12. Air-conditions filter (Experiments and Tests pages)

**Helpers (A, in `web/src/data/load.ts`):**

```ts
export interface Conditions {
  o2: [number, number]           // fraction, e.g. [0.30, 1.0]
  psi: [number, number]
  gravity_g?: number | null      // null or missing = any gravity; tolerance 0.02 g, as in testsInHabitatAndGravity
}
export interface ConditionsResult {
  inside: Test[]                 // cabin-air tests inside o2 AND psi (AND gravity when given)
  unknown: Test[]                // cabin-air tests missing oxygen or pressure: can't be checked
  inverse_excluded: number       // burner-oxidizer rows left out
}
export function testsInConditions(tests: Test[], c: Conditions): ConditionsResult
export function nearestOutside(tests: Test[], c: Conditions, k?: number):
  { test: Test; o2_gap_points: number; psi_gap: number }[]   // 0 when that axis is inside
export function conditionsFromHabitat(h: Habitat): Conditions
```

For every place, A's validator checks that a preset gives exactly that place card's count.

**You:**
- Add oxygen min-max (%) and pressure min-max (psi) inputs and a gravity choice to the
  Experiments page and the Tests page.
  - Gravity choices: any / microgravity 0 / Moon 0.165 / Earth 1 / custom.
  - Don't add Mars 0.38 until A has a source for it.
- Keep the conditions in the URL: `#experiments?o2=30-100&psi=4.3-10.2&g=0.165`.
- Presets come from `conditionsFromHabitat()` for each habitat, plus "Custom".
- Experiment cards show only experiments with at least one test in `inside`, with "N tests in this
  air". The Tests table shows `inside`.
- Always show "`unknown.length` tests can't be checked: oxygen or pressure not in NASA's tables" and
  "`inverse_excluded` inverse-flame rows left out (burner gas, not cabin air)".
- **No match:** show "No test in NASA's tables in this air", then the `nearestOutside()` list
  ("22.2 % O2, 8 points below"). Never show a bare empty page.
- **Gravity other than 0:** add "Every test in PSI ran in microgravity; no partial-gravity tests in
  PSI yet (LUCI and FM2 may add some)."

**Done when:**
- The Moon preset gives 20 tests, all CFI-G.
- The ISS preset gives 209 (171 before the BASS conditions were added).
- The NASA Moon box gives 0 and shows the nearest tests.
- Moon gravity gives 0 with the gravity note.

---

## Files

All of yours: `ExperimentsView.tsx`, `InvestigationsView.tsx`, `TestsView.tsx`, `TestDetail.tsx`,
`RiskView.tsx`, `FireView.tsx`, `PlaceView.tsx` / `HomeView.tsx`, `styles.css`. Don't edit
`web/src/data/`, `web/src/types/` or `web/public/data/`. Ask A instead. Spread rules for the
Simulation tab are unchanged.

## Questions

If a field's meaning is unclear or a number looks wrong, ask A rather than guessing. A field
missing from the JSON means "not shipped yet" or "NASA's files don't say". In both cases, hide it.
