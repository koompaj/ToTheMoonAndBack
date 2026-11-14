// SHARED CONTRACT (proposed by workstream C, see docs/PLAN.md) - the props of the two components
// workstream B builds for the fire page: the 3D fire model and the clickable habitat map.
// C's fire page owns the state and passes these props; B's components only draw and report clicks.
// Agree any change with B and C before editing.
import type { AppData, FuelClass, Habitat } from './data'
import type { LayoutMark } from './layout'

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

/** What the Simulation page knows about the fire at the chosen point, handed to the 3D stage so
 *  the flame it draws can reflect the place and the user's choices. An ILLUSTRATION only. */
export interface StageFire {
  /** The chosen place's air: cabin-air oxygen as a fraction 0..1, pressure in atm. */
  o2Fraction: number
  pressureAtm: number
  /** "still" when the airflow set is 0, otherwise "vent" (what the evidence line is keyed on). */
  airflow: 'still' | 'vent'
  /** The airflow the user set, in cm/s, and gravity from 0 (microgravity) to 1 (Earth). They only
   *  change how the flame is drawn: every PSI test ran in microgravity. Absent on older callers. */
  airflowCmS?: number
  gravity?: number
  /** What the nearest real NASA tests of the chosen material did. */
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

/** Props of the Simulation page's 3D stage drawn by workstream B (scene/CabinStage3D). The page
 *  owns all state; the stage draws from these and reports a picked point through onPick. */
export interface CabinStageProps {
  /** False until a place is chosen; the stage then shows the sample spacecraft from outside. */
  placeChosen: boolean
  /** The marks on show (the sample spacecraft's, from layouts/example-spacecraft.json). */
  marks: LayoutMark[]
  /** Mark id -> evidence colour (TIER_COLOR). */
  markColors: Record<string, string>
  selectedMarkId: string | null
  /** Object URL of the user's own floor plan; null = show the sample spacecraft. */
  imageUrl: string | null
  /** The fire point in plan fractions (0..1), or null. */
  point: { x: number; y: number } | null
  fuel: FuelClass
  /** True after "Simulate". */
  lit: boolean
  fire?: StageFire | null
  /** Called with plan fractions when the user places the fire point. */
  onPick: (x: number, y: number) => void
}
