// OWNER: 3D workstream.
// The sample spacecraft as data: its shape and everything inside it.
//
// THIS IS AN EXAMPLE LAYOUT, NOT A NASA DESIGN. Shapes, sizes and where things sit are made up so
// the Simulation page has a place to show. Object names are labels only. The material named on a
// fuel item is one NASA's tables do cover (an id from fuels.json) or "other"; it says nothing about
// what a real seat or cable cover is made of.
//
// No three.js here, so the layout can be checked by a script (see checkSpec at the bottom).
import type { FuelClass } from '../../types/data'
import type { LayoutMark } from '../../types/layout'

/** Plan rectangle in scene units: x runs along the craft, z across it. A LayoutMark's fractions
 *  (0..1) map onto this rectangle, the same convention the Simulation page uses. */
export const PLAN = { w: 13, d: 5 }

/** The base hologram blue: hull, deck and anything that is not a fuel item. */
export const HOLO_BLUE = '#5cc8ff'

/** Height of the hull's centre line above the deck. */
export const AXIS_Y = 0.9

/** Three joined volumes along x: window dome + cone (flight deck), cylinder (crew cabin),
 *  sphere (node). Units are illustrative. */
export const HULL = { domeX: -5.2, domeR: 1.2, coneEndX: -3.4, cabinR: 2.5, cabinEndX: 2.8, nodeX: 4.5, nodeR: 2 }

/** Hull radius around the centre line at a position along the craft. */
export function hullRadius(x: number) {
  const { domeX, domeR, coneEndX, cabinR, cabinEndX, nodeX, nodeR } = HULL
  if (x < domeX) return Math.sqrt(Math.max(0, domeR * domeR - (x - domeX) * (x - domeX)))
  if (x < coneEndX) return domeR + ((x - domeX) / (coneEndX - domeX)) * (cabinR - domeR)
  if (x <= cabinEndX) return cabinR
  const dx = x - nodeX
  return Math.abs(dx) < nodeR ? Math.sqrt(nodeR * nodeR - dx * dx) : 0
}

/** Half the deck's width at a position along the craft; 0 where there is no deck. */
export function deckHalfWidth(x: number) {
  const r = hullRadius(x)
  return r > AXIS_Y ? Math.sqrt(r * r - AXIS_Y * AXIS_Y) : 0
}

const reach = (r: number) => Math.sqrt(r * r - AXIS_Y * AXIS_Y)
export const DECK_X0 = HULL.domeX - reach(HULL.domeR)
export const DECK_X1 = HULL.nodeX + reach(HULL.nodeR)

export type ZoneId = 'flight' | 'work' | 'quarters' | 'node'

export const ZONES: { id: ZoneId; name: string; x0: number; x1: number }[] = [
  { id: 'flight', name: 'Flight deck', x0: DECK_X0, x1: HULL.coneEndX },
  { id: 'work', name: 'Work area', x0: HULL.coneEndX, x1: -0.3 },
  { id: 'quarters', name: 'Crew quarters', x0: -0.3, x1: HULL.cabinEndX },
  { id: 'node', name: 'Node', x0: HULL.cabinEndX, x1: DECK_X1 },
]

export type ItemKind =
  | 'seats'
  | 'console'
  | 'windows'
  | 'rack'
  | 'table'
  | 'bottle'
  | 'cableTray'
  | 'bunks'
  | 'bags'
  | 'wiring'
  | 'gasBottle'
  | 'gasLine'
  | 'locker'

/** What a fuel item is offered as on the Simulation page. Labels for an example, not facts. */
export interface ItemFuel {
  fuel_class: FuelClass
  /** A FuelOption id from fuels.json, or "other". */
  fuel_option_id: string
  airflow: 'still' | 'vent'
}

export interface CabinItem {
  /** Also the id of the item's mark. */
  id: string
  kind: ItemKind
  zone: ZoneId
  label: string
  /** Centre on the deck, and footprint along x (w) and z (d), in scene units. */
  x: number
  z: number
  w: number
  d: number
  /** Height of the object, and how far above the deck it starts. */
  h: number
  y?: number
  /** Present on things that could burn; absent on plain furniture. */
  fuel?: ItemFuel
}

const FABRIC = 'solid:sibal-cotton-fiberglass-blend'

export const ITEMS: CabinItem[] = [
  // flight deck
  { id: 'windows', kind: 'windows', zone: 'flight', label: 'Window frame and panels', x: -5.52, z: 0, w: 0.55, d: 0.8, h: 2, fuel: { fuel_class: 'solid', fuel_option_id: 'solid:pmma', airflow: 'still' } },
  { id: 'console', kind: 'console', zone: 'flight', label: 'Console', x: -4.85, z: 0, w: 0.5, d: 1.4, h: 0.9 },
  { id: 'seats', kind: 'seats', zone: 'flight', label: 'Crew seats', x: -4, z: 0, w: 0.7, d: 1.9, h: 1.4, fuel: { fuel_class: 'solid', fuel_option_id: 'solid:nomex', airflow: 'still' } },
  // work area
  { id: 'exp-rack', kind: 'rack', zone: 'work', label: 'Experiment rack', x: -2.6, z: -1.85, w: 1.2, d: 0.6, h: 2 },
  { id: 'equip-rack', kind: 'rack', zone: 'work', label: 'Equipment rack', x: -1.25, z: -1.85, w: 1.2, d: 0.6, h: 2, fuel: { fuel_class: 'solid', fuel_option_id: 'solid:ultem', airflow: 'still' } },
  { id: 'table', kind: 'table', zone: 'work', label: 'Work table', x: -1.9, z: 0.35, w: 1.5, d: 0.8, h: 0.75 },
  { id: 'solvent', kind: 'bottle', zone: 'work', label: 'Cleaning solvent', x: -2.3, z: 0.35, w: 0.2, d: 0.2, h: 0.3, y: 0.78, fuel: { fuel_class: 'droplet', fuel_option_id: 'droplet:methanol', airflow: 'still' } },
  { id: 'fuel-sample', kind: 'bottle', zone: 'work', label: 'Lab fuel sample', x: -1.5, z: 0.3, w: 0.2, d: 0.2, h: 0.3, y: 0.78, fuel: { fuel_class: 'droplet', fuel_option_id: 'droplet:heptane', airflow: 'still' } },
  { id: 'cable-covers', kind: 'cableTray', zone: 'work', label: 'Cable covers', x: -1.7, z: 1.9, w: 3, d: 0.3, h: 0.15, fuel: { fuel_class: 'solid', fuel_option_id: 'solid:silicone', airflow: 'vent' } },
  // crew quarters
  { id: 'sleep-fabric', kind: 'bunks', zone: 'quarters', label: 'Sleep station fabric', x: 1.2, z: -1.6, w: 2.2, d: 1, h: 2, fuel: { fuel_class: 'solid', fuel_option_id: FABRIC, airflow: 'still' } },
  { id: 'stowage-bags', kind: 'bags', zone: 'quarters', label: 'Fabric stowage bags', x: 1.1, z: 1.65, w: 1.8, d: 0.7, h: 0.55, fuel: { fuel_class: 'solid', fuel_option_id: FABRIC, airflow: 'vent' } },
  { id: 'wiring', kind: 'wiring', zone: 'quarters', label: 'Wiring insulation', x: 2.45, z: 1.5, w: 0.45, d: 0.8, h: 1.3, fuel: { fuel_class: 'solid', fuel_option_id: 'other', airflow: 'still' } },
  // node
  { id: 'gas-bottle', kind: 'gasBottle', zone: 'node', label: 'Experiment gas bottle', x: 3.9, z: -1, w: 0.45, d: 0.45, h: 1.05, fuel: { fuel_class: 'gas', fuel_option_id: 'gas:butane', airflow: 'vent' } },
  { id: 'gas-line', kind: 'gasLine', zone: 'node', label: 'Gas supply line', x: 5.3, z: 1, w: 0.3, d: 0.3, h: 1, fuel: { fuel_class: 'gas', fuel_option_id: 'gas:propane', airflow: 'still' } },
  { id: 'locker', kind: 'locker', zone: 'node', label: 'Stowage locker', x: 5.1, z: -1, w: 0.7, d: 0.6, h: 1.3 },
]

/** Solids are areas; liquids and gases are points (docs/LAYOUT_PLAN.md section 3). */
export function markOf(item: CabinItem): LayoutMark | null {
  if (!item.fuel) return null
  const area = item.fuel.fuel_class === 'solid'
  const r3 = (v: number) => Math.round(v * 1000) / 1000
  const fx = (v: number) => r3(v / PLAN.w + 0.5)
  const fy = (v: number) => r3(v / PLAN.d + 0.5)
  return {
    id: item.id,
    kind: area ? 'area' : 'point',
    fuel_class: item.fuel.fuel_class,
    fuel_option_id: item.fuel.fuel_option_id,
    label: item.label,
    airflow: item.fuel.airflow,
    shape: area ? { x: fx(item.x - item.w / 2), y: fy(item.z - item.d / 2), w: r3(item.w / PLAN.w), h: r3(item.d / PLAN.d) } : { x: fx(item.x), y: fy(item.z) },
  }
}

/** The marks this layout offers. Proposed by B; where they finally live is agreed with A and C. */
export const SAMPLE_MARKS: LayoutMark[] = ITEMS.map(markOf).filter((m): m is LayoutMark => m !== null)

export const SAMPLE_NOTE = 'Example layout, not a NASA design'

/** Problems with the layout itself; an empty list means it is sound.
 *  Pass the ids from fuels.json to also check that every fuel named here is one NASA tested. */
export function checkSpec(knownFuelIds?: Iterable<string>): string[] {
  const problems: string[] = []
  const known = knownFuelIds ? new Set(knownFuelIds) : null
  const seen = new Set<string>()
  const corners = (i: CabinItem) => [
    [i.x - i.w / 2, i.z - i.d / 2],
    [i.x + i.w / 2, i.z - i.d / 2],
    [i.x - i.w / 2, i.z + i.d / 2],
    [i.x + i.w / 2, i.z + i.d / 2],
  ]
  for (const item of ITEMS) {
    if (seen.has(item.id)) problems.push(`duplicate id ${item.id}`)
    seen.add(item.id)
    for (const [x, z] of corners(item)) {
      if (Math.abs(z) > deckHalfWidth(x) + 1e-6) problems.push(`${item.id} reaches off the deck at x=${x.toFixed(2)}, z=${z.toFixed(2)}`)
      if (Math.abs(x) > PLAN.w / 2 || Math.abs(z) > PLAN.d / 2) problems.push(`${item.id} is outside the plan rectangle`)
    }
    const zone = ZONES.find((zn) => zn.id === item.zone)!
    if (item.x < zone.x0 || item.x > zone.x1) problems.push(`${item.id} is not in its zone (${zone.name})`)
    // nothing may poke through the hull above the deck
    const top = (item.y ?? 0) + item.h
    if (item.kind !== 'windows') {
      for (const [x, z] of corners(item)) {
        if (Math.hypot(z, top - AXIS_Y) > hullRadius(x) + 1e-6) problems.push(`${item.id} pokes through the hull at its top`)
      }
    }
    if (item.fuel && known && item.fuel.fuel_option_id !== 'other' && !known.has(item.fuel.fuel_option_id)) {
      problems.push(`${item.id} names ${item.fuel.fuel_option_id}, which is not in fuels.json`)
    }
    if (item.fuel && item.fuel.fuel_option_id !== 'other' && !item.fuel.fuel_option_id.startsWith(`${item.fuel.fuel_class}:`)) {
      problems.push(`${item.id}: ${item.fuel.fuel_option_id} is not a ${item.fuel.fuel_class} fuel`)
    }
  }
  // two solid areas must not overlap, or a click could mean either
  const areas = ITEMS.filter((i) => i.fuel?.fuel_class === 'solid')
  for (let a = 0; a < areas.length; a++)
    for (let b = a + 1; b < areas.length; b++) {
      const p = areas[a]
      const q = areas[b]
      if (Math.abs(p.x - q.x) < (p.w + q.w) / 2 && Math.abs(p.z - q.z) < (p.d + q.d) / 2) problems.push(`${p.id} overlaps ${q.id}`)
    }
  return problems
}
