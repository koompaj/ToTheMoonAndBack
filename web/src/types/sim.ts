// SHARED CONTRACT (proposed by workstream C, see docs/PLAN.md) - the props of the two components
// workstream B builds for the fire page: the 3D fire model and the clickable habitat map.
// C's fire page owns the state and passes these props; B's components only draw and report clicks.
// Agree any change with B and C before editing.
import type { AppData, FuelClass, Habitat } from './data'

/** One point on the oxygen/pressure map. Cabin-air oxygen as a fraction 0..1, pressure in atm. */
export interface SimPoint {
  o2Fraction: number
  pressureAtm: number
}

/** What the user set with the controls. Everything here drives an ILLUSTRATION, not a simulation. */
export interface FireParams {
  fuel: FuelClass
  o2Fraction: number
  pressureAtm: number
  /** Air speed past the fuel in cm/s; 0 = still air. */
  airflowCmS: number
  /** 0 = microgravity (all PSI tests), 1 = Earth gravity. The Moon is in between and untested in PSI. */
  gravity: number
}

/** What the nearest real NASA tests did, summarised by C. B may use it to tint or shrink the flame. */
export type ExpectedBehaviour = 'kept-burning' | 'went-out' | 'mixed' | 'unknown'

export interface FireModelProps {
  params: FireParams
  behaviour: ExpectedBehaviour
}

export interface HabitatSimMapProps {
  data: AppData
  habitat: Habitat
  fuel: FuelClass
  /** The point being simulated; null until the user picks one. */
  point: SimPoint | null
  /** Tests.json ids of the nearest real tests to the point, to highlight. */
  nearestTestIds: string[]
  /** Called when the user clicks a spot on the map. */
  onPick: (p: SimPoint) => void
}
