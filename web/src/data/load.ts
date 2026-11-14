// SHARED - loads the generated JSON once. Owned by the data workstream.
import type { AppData, DataQuality, Habitat, Investigation, OtherTable, OutcomeAnalysis, Test } from '../types/data'

async function get<T>(name: string): Promise<T> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/${name}`)
  if (!res.ok) throw new Error(`Could not load ${name}: ${res.status}`)
  return (await res.json()) as T
}

export async function loadData(): Promise<AppData> {
  const [tests, investigations, habitats, otherTables, quality, outcomes] = await Promise.all([
    get<Test[]>('tests.json'),
    get<Investigation[]>('investigations.json'),
    get<Habitat[]>('habitats.json'),
    get<OtherTable[]>('other_tables.json'),
    get<DataQuality>('data_quality.json'),
    get<OutcomeAnalysis>('outcomes.json').catch(() => undefined),
  ])
  return { tests, investigations, habitats, otherTables, quality, outcomes }
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
