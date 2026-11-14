// SHARED - loads the generated JSON once. Owned by the data workstream.
import type { AppData, Habitat, Investigation, Test } from '../types/data'

async function get<T>(name: string): Promise<T> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/${name}`)
  if (!res.ok) throw new Error(`Could not load ${name}: ${res.status}`)
  return (await res.json()) as T
}

export async function loadData(): Promise<AppData> {
  const [tests, investigations, habitats] = await Promise.all([
    get<Test[]>('tests.json'),
    get<Investigation[]>('investigations.json'),
    get<Habitat[]>('habitats.json'),
  ])
  return { tests, investigations, habitats }
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
