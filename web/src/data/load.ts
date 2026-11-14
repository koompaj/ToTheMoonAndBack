// SHARED - loads the generated JSON once. Owned by the data workstream.
import type { AppData, DataQuality, Habitat, Investigation, OtherTable, OutcomeAnalysis, Test } from '../types/data'
import type { FuelOption, Layout } from '../types/layout'

async function get<T>(name: string): Promise<T> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/${name}`)
  if (!res.ok) throw new Error(`Could not load ${name}: ${res.status}`)
  return (await res.json()) as T
}

export async function loadData(): Promise<AppData> {
  const [tests, investigations, habitats, otherTables, quality, outcomes, fuels] = await Promise.all([
    get<Test[]>('tests.json'),
    get<Investigation[]>('investigations.json'),
    get<Habitat[]>('habitats.json'),
    get<OtherTable[]>('other_tables.json'),
    get<DataQuality>('data_quality.json'),
    get<OutcomeAnalysis>('outcomes.json').catch(() => undefined),
    get<FuelOption[]>('fuels.json').catch(() => undefined),
  ])
  return { tests, investigations, habitats, otherTables, quality, outcomes, fuels }
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
export function testsInHabitat(tests: Test[], h: Habitat): Test[] {
  return tests.filter(
    (t) =>
      t.o2_basis === 'ambient' &&
      t.o2_fraction !== null &&
      t.pressure_atm !== null &&
      t.o2_fraction >= h.o2_fraction[0] &&
      t.o2_fraction <= h.o2_fraction[1] &&
      t.pressure_atm >= h.pressure_atm[0] &&
      t.pressure_atm <= h.pressure_atm[1],
  )
}
