// OWNER: dashboard + AI workstream.
// Example cabins for the Simulation page, one per place. Each is a shape for the 3D stage plus
// example marks (areas and points) on a flat plan. These are EXAMPLE LAYOUTS, NOT NASA DESIGNS:
// names are labels only, and each mark's material is a fuel NASA tested (fuels.json ids) or
// "other". The Moon layouts use workstream A's example (web/public/layouts/example-moon-habitat.json).
import type { LayoutMark } from '../../types/layout'

export type CabinShape = 'dome' | 'module' | 'suit' | 'lab'

export interface CabinTemplate {
  shape: CabinShape
  title: string
  /** Plan size in scene units (x = width, z = depth). */
  w: number
  d: number
  /** null = load A's example layout file instead. */
  marks: LayoutMark[] | null
}

const area = (id: string, label: string, fuel_option_id: string, x: number, y: number, w: number, h: number, airflow: 'still' | 'vent' = 'still'): LayoutMark => ({
  id,
  kind: 'area',
  fuel_class: 'solid',
  fuel_option_id,
  label,
  airflow,
  shape: { x, y, w, h },
})
const point = (id: string, label: string, fuel_class: 'droplet' | 'gas', fuel_option_id: string, x: number, y: number, airflow: 'still' | 'vent' = 'still'): LayoutMark => ({
  id,
  kind: 'point',
  fuel_class,
  fuel_option_id,
  label,
  airflow,
  shape: { x, y },
})

const MODULE: LayoutMark[] = [
  area('s1', 'Sleep station fabric', 'solid:sibal-cotton-fiberglass-blend', 0.05, 0.1, 0.18, 0.3),
  area('s2', 'Experiment rack panels', 'solid:pmma', 0.3, 0.06, 0.22, 0.2, 'vent'),
  area('s3', 'Cable bundles', 'solid:silicone', 0.6, 0.7, 0.3, 0.14, 'vent'),
  area('s4', 'Crew clothing locker', 'solid:nomex', 0.75, 0.08, 0.18, 0.26),
  area('s5', 'Foam padding', 'other', 0.08, 0.72, 0.22, 0.16),
  point('s6', 'Solvent bottle', 'droplet', 'droplet:heptane', 0.45, 0.5),
  point('s7', 'Experiment gas bottle', 'gas', 'gas:ethylene', 0.62, 0.42, 'vent'),
]

const SUIT: LayoutMark[] = [
  area('u1', 'Outer fabric layers', 'solid:nomex', 0.28, 0.32, 0.44, 0.34),
  area('u2', 'Helmet visor', 'solid:pmma', 0.36, 0.06, 0.28, 0.16),
  area('u3', 'Backpack wiring', 'solid:silicone', 0.72, 0.36, 0.18, 0.24, 'vent'),
  area('u4', 'Cooling garment tubes', 'other', 0.32, 0.7, 0.36, 0.14),
]

const LAB: LayoutMark[] = [
  area('e1', 'Lab bench top', 'solid:pmma', 0.1, 0.1, 0.36, 0.16),
  area('e2', 'Curtains', 'solid:sibal-cotton-fiberglass-blend', 0.7, 0.08, 0.22, 0.2),
  area('e3', 'Wax samples', 'solid:paraffin-wax', 0.12, 0.66, 0.2, 0.14),
  point('e4', 'Solvent cabinet', 'droplet', 'droplet:methanol', 0.55, 0.62),
  point('e5', 'Gas cylinder', 'gas', 'gas:propane', 0.84, 0.66, 'vent'),
]

export const TEMPLATES: Record<string, CabinTemplate> = {
  moon_base: { shape: 'dome', title: 'Example Moon habitat', w: 9, d: 9, marks: null },
  moon_base_nasa: { shape: 'dome', title: 'Example Moon habitat', w: 9, d: 9, marks: null },
  iss: { shape: 'module', title: 'Example station module', w: 11, d: 4.2, marks: MODULE },
  spacesuit: { shape: 'suit', title: 'Example spacesuit layout', w: 5.5, d: 8, marks: SUIT },
  earth_sea_level: { shape: 'lab', title: 'Example Earth lab', w: 10, d: 7, marks: LAB },
}

export const DEFAULT_TEMPLATE: CabinTemplate = { shape: 'module', title: 'Example cabin', w: 11, d: 4.2, marks: MODULE }

export function templateFor(habitatId: string): CabinTemplate {
  return TEMPLATES[habitatId] ?? DEFAULT_TEMPLATE
}

/** Callouts for the idle hologram, before a place is chosen: parts of a cabin where fire matters. */
export const IDLE_CALLOUTS: { label: string; at: [number, number, number]; to: [number, number, number] }[] = [
  { label: 'Crew quarters · fabric', at: [-3.6, 0.6, -0.6], to: [-6.2, 3.4, -1] },
  { label: 'Ventilation fan · airflow', at: [-1, 1.7, 0], to: [-2.6, 4.4, 0] },
  { label: 'Experiment rack · plastics', at: [1.6, 0.4, -1.2], to: [3.2, 4.1, -1.6] },
  { label: 'Smoke detector', at: [3.8, 1.6, 0], to: [6.4, 3.2, 0] },
  { label: 'Fire extinguisher · CO₂', at: [4.6, 0.2, 1.1], to: [6.8, -1.6, 1.6] },
  { label: 'Gas line · experiment gas', at: [-2.4, -0.9, 1.2], to: [-5.6, -2.6, 1.6] },
]
