// SHARED - loads the generated JSON once. Owned by the data workstream.
import type { AppData, DataQuality, Gaps, Habitat, Investigation, OtherTable, OutcomeAnalysis, Test, WaitingPlace } from '../types/data'
import type { FuelOption, Layout } from '../types/layout'

async function get<T>(name: string): Promise<T> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/${name}`)
  if (!res.ok) throw new Error(`Could not load ${name}: ${res.status}`)
  return (await res.json()) as T
}

export async function loadData(): Promise<AppData> {
  const [tests, investigations, habitats, otherTables, quality, outcomes, fuels, gaps, waitingPlaces] = await Promise.all([
    get<Test[]>('tests.json'),
    get<Investigation[]>('investigations.json'),
    get<Habitat[]>('habitats.json'),
    get<OtherTable[]>('other_tables.json'),
    get<DataQuality>('data_quality.json'),
    get<OutcomeAnalysis>('outcomes.json').catch(() => undefined),
    get<FuelOption[]>('fuels.json').catch(() => undefined),
    get<Gaps>('gaps.json').catch(() => undefined),
    get<WaitingPlace[]>('places_waiting.json').catch(() => undefined),
  ])
  return { tests, investigations, habitats, otherTables, quality, outcomes, fuels, gaps, waitingPlaces }
}

/** The example layout for the habitat evidence map (marks only; not a NASA design). */
export async function loadExampleLayout(): Promise<Layout> {
  const res = await fetch(`${import.meta.env.BASE_URL}layouts/example-moon-habitat.json`)
  if (!res.ok) throw new Error(`Could not load the example layout: ${res.status}`)
  return (await res.json()) as Layout
}

/** Airflow range of some tests, leaving out values flagged airflow_negative_in_source (meaning not
 *  stated by NASA). Null when no test records airflow. */
export function airflowRange(tests: Test[]): [number, number] | null {
  const v = tests
    .filter((t) => t.airflow_cm_s !== null && !t.flags.includes('airflow_negative_in_source'))
    .map((t) => t.airflow_cm_s as number)
  return v.length ? [Math.min(...v), Math.max(...v)] : null
}

/** True when every number of a habitat has a checked source (status "from_..."). */
export function isSourced(h: Habitat) {
  return h.status.startsWith('from_')
}

/** How many distinct NASA tests there are: tests.json minus rows that repeat an earlier row. */
export function distinctTestCount(data: Pick<AppData, 'tests' | 'quality'>) {
  return data.quality.distinct_tests ?? data.tests.filter((t) => !t.flags.some((f) => f.startsWith('duplicate_row'))).length
}

/** Tests that cannot be placed on the oxygen/pressure map, and why.
 *  Use this for on-screen counts instead of re-deriving it from flags. */
export function unplacedTests(tests: Test[]) {
  const ambient = tests.filter((t) => t.o2_basis === 'ambient')
  return {
    noPressureInTable: ambient.filter((t) => t.flags.includes('pressure_not_in_table')),
    noOxygenInTable: ambient.filter((t) => t.flags.includes('o2_not_in_table')),
    oxygenRangeOnly: ambient.filter((t) => t.flags.includes('o2_range')),
    pressureUnusable: ambient.filter((t) => t.flags.includes('pressure_missing')),
  }
}

/** How close a test's gravity must be to a place's gravity to count as the same (in g). */
export const GRAVITY_TOLERANCE_G = 0.02

/** Tests inside a habitat's air box that also ran in that habitat's gravity (within
 *  GRAVITY_TOLERANCE_G). Today every PSI test is microgravity, so only the ISS matches; this is
 *  ready for the partial-gravity data NASA expects from LUCI and FM2. A test or habitat with no
 *  gravity value never matches. */
export function testsInHabitatAndGravity(tests: Test[], h: Habitat): Test[] {
  const gs = h.gravity?.g ?? []
  return testsInHabitat(tests, h).filter(
    (t) => t.gravity_g !== undefined && gs.some((g) => Math.abs(t.gravity_g! - g) <= GRAVITY_TOLERANCE_G),
  )
}

/** One plain sentence on how the place's gravity compares with the tests' gravity. */
export function gravityNote(tests: Test[], h: Habitat): string | null {
  if (!h.gravity) return null
  const air = testsInHabitat(tests, h).length
  const both = testsInHabitatAndGravity(tests, h).length
  if (air === 0) return `Gravity here: ${h.gravity.label}. Every test in PSI's tables ran in microgravity.`
  if (both === air) return `Gravity here: ${h.gravity.label}. Air and gravity both match the ${air} tests.`
  if (both === 0) {
    const partial = h.gravity.g.some((g) => g > 0 && g < 1)
    return `Gravity here: ${h.gravity.label}. All ${air} tests in this air ran in microgravity, so none match this gravity${partial ? ' yet' : ''}.`
  }
  return `Gravity here: ${h.gravity.label}. ${both} of the ${air} tests in this air also match this gravity.`
}

/** Tests that sit inside a habitat's oxygen and pressure box.
 *  Only ambient-oxygen tests with both values known can be placed. */
/** True for a row that repeats an earlier row of the same NASA table cell for cell (flag duplicate_row).
 *  It is the same test, so every count of tests leaves it out. */
export function isRepeatRow(t: Test): boolean {
  return t.flags.some((f) => f.startsWith('duplicate_row'))
}

export function testsInHabitat(tests: Test[], h: Habitat): Test[] {
  return tests.filter(
    (t) =>
      !isRepeatRow(t) &&
      t.o2_basis === 'ambient' &&
      t.o2_fraction !== null &&
      t.pressure_atm !== null &&
      t.o2_fraction >= h.o2_fraction[0] &&
      t.o2_fraction <= h.o2_fraction[1] &&
      t.pressure_atm >= h.pressure_atm[0] &&
      t.pressure_atm <= h.pressure_atm[1],
  )
}

// ---- Item 12: any air the user types in (docs/roles/C-tasks-5-12.md) ----

/** Air and gravity to match tests against. o2 is a fraction, psi in psi. */
export interface Conditions {
  o2: [number, number]
  psi: [number, number]
  /** Optional exact pressure range in atm. conditionsFromHabitat sets it so a preset matches the
   *  place card exactly; otherwise psi is converted (1 atm = 14.6959 psi). */
  atm?: [number, number]
  /** null or missing = any gravity; otherwise within GRAVITY_TOLERANCE_G. */
  gravity_g?: number | null
}

export interface ConditionsResult {
  /** Cabin-air tests inside the oxygen and pressure range (and gravity, when given). */
  inside: Test[]
  /** Cabin-air tests missing oxygen or pressure: they cannot be checked, which is not "outside". */
  unknown: Test[]
  /** Inverse-flame rows left out: their oxygen is burner gas, not cabin air. */
  inverse_excluded: number
}

const PSI_PER_ATM = 14.6959

export function testsInConditions(tests: Test[], c: Conditions): ConditionsResult {
  const inside: Test[] = []
  const unknown: Test[] = []
  let inverse = 0
  const g = c.gravity_g
  for (const t of tests) {
    if (isRepeatRow(t)) continue // the same test as an earlier row: counted once
    if (t.o2_basis !== 'ambient') {
      inverse++
      continue
    }
    if (t.o2_fraction === null || t.pressure_atm === null) {
      unknown.push(t)
      continue
    }
    const atm = c.atm ?? [c.psi[0] / PSI_PER_ATM, c.psi[1] / PSI_PER_ATM]
    if (t.o2_fraction < c.o2[0] || t.o2_fraction > c.o2[1] || t.pressure_atm < atm[0] || t.pressure_atm > atm[1]) continue
    if (g !== null && g !== undefined && (t.gravity_g === undefined || Math.abs(t.gravity_g - g) > GRAVITY_TOLERANCE_G)) continue
    inside.push(t)
  }
  return { inside, unknown, inverse_excluded: inverse }
}

/** The k placed cabin-air tests closest to the range, outside it. Gaps are 0 on an axis that is
 *  already inside. o2_gap_points is in percentage points; psi_gap in psi. Distance ranks by
 *  oxygen points plus psi, an ordering only, not a physical measure. Gravity is not used. */
export function nearestOutside(tests: Test[], c: Conditions, k = 5): { test: Test; o2_gap_points: number; psi_gap: number }[] {
  const gap = (v: number, [lo, hi]: [number, number]) => (v < lo ? lo - v : v > hi ? v - hi : 0)
  return tests
    .filter((t) => t.o2_basis === 'ambient' && t.o2_fraction !== null && t.pressure_atm !== null && !isRepeatRow(t))
    .map((t) => ({
      test: t,
      o2_gap_points: gap(t.o2_fraction! * 100, [c.o2[0] * 100, c.o2[1] * 100]),
      psi_gap: c.atm ? gap(t.pressure_atm!, c.atm) * PSI_PER_ATM : gap(t.pressure_atm! * PSI_PER_ATM, c.psi),
    }))
    .filter((x) => x.o2_gap_points > 0 || x.psi_gap > 0)
    .sort((a, b) => a.o2_gap_points + a.psi_gap - (b.o2_gap_points + b.psi_gap))
    .slice(0, k)
}

/** A place's air as Conditions (gravity left as "any", like the card counts). */
export function conditionsFromHabitat(h: Habitat): Conditions {
  return {
    o2: [h.o2_fraction[0], h.o2_fraction[1]],
    psi: [h.pressure_psi[0], h.pressure_psi[1]],
    atm: [h.pressure_atm[0], h.pressure_atm[1]],
    gravity_g: null,
  }
}

/** Item 10: how many tests have each fuel shape (null shapes left out). */
export function shapeCounts(tests: Test[]): [string, number][] {
  const m = new Map<string, number>()
  for (const t of tests) if (t.fuel_shape) m.set(t.fuel_shape, (m.get(t.fuel_shape) ?? 0) + 1)
  return [...m.entries()].sort((a, b) => b[1] - a[1])
}
