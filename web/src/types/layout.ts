// SHARED CONTRACT - the habitat evidence map (docs/LAYOUT_PLAN.md section 6).
// Produced by workstream A (fuels.json, markEvidence), read by B (LayoutCanvas) and C (LayoutView).
// Change only by agreement of all three workstreams.
import type { FuelClass } from './data'

/** One fuel a user can pick for a mark: a material, a liquid or a gas NASA actually tested. */
export interface FuelOption {
  id: string // "solid:nomex", "droplet:methanol", "gas:butane"
  fuel_class: FuelClass
  name: string // "Nomex"
  test_ids: string[] // distinct tests (duplicate rows left out)
  test_count: number
  investigations: string[] // accessions, e.g. "PSI-25"
  acronyms: string[] // e.g. "BASS-II"
  o2_range: [number, number] | null // cabin-air oxygen fraction; null = not in the tables
  pressure_psi_range: [number, number] | null // null = not in the tables
  airflow_range: [number, number] | null // cm/s, NASA's unexplained negative values left out
  airflow_test_count: number
  still_air_test_count: number // tests recorded at 0 cm/s
  endings: Record<string, number> // as NASA's tables record them
  /** Test ids inside each habitat's oxygen/pressure box (cabin air only). Non-empty = teal. */
  inside_by_habitat: Record<string, string[]>
  /** Closest test to each habitat's box when none is inside (1 point of oxygen = 1 psi).
   *  oxygen_only: the tests record no pressure, so only oxygen could be compared. */
  nearest_by_habitat: Record<string, { test_id: string; o2_points: number; psi_gap: number; oxygen_only: boolean } | null>
  note: string | null // e.g. "Pressure is not in these tables."
}

/** "Other (not in NASA's tables)": always coral. */
export const OTHER_FUEL = 'other' as const

export interface LayoutMark {
  id: string
  kind: 'area' | 'point' // area = solid; point = droplet or gas
  fuel_class: FuelClass
  fuel_option_id: string // a FuelOption id, or OTHER_FUEL
  label: string // free text, never used for evidence
  airflow: 'still' | 'vent'
  /** Position on the plan as fractions of its width and height (0..1). Areas have w and h. */
  shape: { x: number; y: number; w?: number; h?: number }
}

export interface Layout {
  version: 1
  habitat_id: string
  image_name: string | null // the image itself is never saved or uploaded
  /** Shown with the layout; the example layout says it is not a NASA design. */
  note?: string
  marks: LayoutMark[]
}

/** Colours mean how much evidence exists, never how dangerous a place is. */
export type EvidenceTier = 'tested_here' | 'tested_elsewhere' | 'not_in_tables'

/** One line of an evidence card. Same shape as Statement in web/src/ai/fireTasks.ts. */
export interface EvidenceStatement {
  text: string
  cites: string[] // tests.json ids and/or PSI accessions
  kind: 'data' | 'gap'
}

export interface MarkEvidence {
  tier: EvidenceTier
  option: FuelOption | null // null for OTHER_FUEL or an unknown id
  tested: EvidenceStatement[] // "What NASA tested"
  gap: EvidenceStatement[] // "The gap"
  airflow: EvidenceStatement[] // "Airflow"
  endings: Record<string, number>
  inside_test_ids: string[]
  nearest_test_id: string | null
}

export const TIER_LABEL: Record<EvidenceTier, string> = {
  tested_here: 'Tested in this air',
  tested_elsewhere: 'Tested only in other air',
  not_in_tables: 'Not in the tables',
}

/** Teal / amber / coral, the app's evidence, caveat and gap colours. */
export const TIER_COLOR: Record<EvidenceTier, string> = {
  tested_here: '#2dd4bf',
  tested_elsewhere: '#fbbf24',
  not_in_tables: '#ff6b6b',
}
