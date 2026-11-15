// OWNER: 3D workstream. The order in which the illustrated spread lights the sample spacecraft's
// fuel items, and how far along each one is at a point on the timeline.
//
// SPREAD IS AN ILLUSTRATION, NEVER A RESULT (CLAUDE.md, "Rules of evidence"). NASA's tables hold
// no spread rates, no room geometry and no partial-gravity data, so:
//   - the order below comes ONLY from distance through this example layout: along its deck and
//     through its open hatch, never through a bulkhead or the closed flight deck door; the closed
//     room is reached along the vent duct (path.ts);
//   - the timeline counts steps: one more item per step. A step is not a length of time;
//   - nothing computed here may be shown as a number, ranking or outcome, or change any evidence.
// Only fuel items light. Plain furniture never does: nothing in the tables says what it is.
//
// No three.js here, so the order can be checked by a script.
import { routeToItem } from './path'
import { CEILING, DUCT, ITEMS, VENTS, type CabinItem } from './spec'

/** What the spread needs to know about an object: where it is, how big, and what it is offered
 *  as. The sample spacecraft's items fit, and so do the items of a layout the user loads. */
export type SpreadItem = Pick<CabinItem, 'id' | 'label' | 'x' | 'z' | 'w' | 'd' | 'h' | 'y' | 'fuel'>

export interface SpreadEntry {
  item: SpreadItem
  /** 0 = the fire starts on this item; otherwise the step at which it has lit. */
  step: number
  /** Set when the way to this item is not a straight line (it runs along a vent duct or through
   *  a door): the points it passes, in order, between the fire and the item. For the line drawn
   *  from the fire to the item only. */
  way?: [number, number, number][]
}

export interface SpreadPlan {
  entries: SpreadEntry[]
  /** How many items the fire has still to reach when it starts. */
  count: number
  /** Items lit per step: 1 unless the user's oxygen or pressure setting changes it. */
  pace: number
  /** The length of the timeline in steps: count / pace. 0 when there is nothing to reach. */
  steps: number
  /** How far from the start the drawing has reached at each whole step (index = step), in scene
   *  units. Only the reach field draws from it; it is never shown as a number. */
  radii: number[]
}

/** Reach around the fire point before anything else has lit, and how far past an item's edge the
 *  drawing goes when that item lights. Drawing choices. */
const START_REACH = 0.7
const PAST_ITEM = 0.35

export const NO_SPREAD: SpreadPlan = { entries: [], count: 0, pace: 1, steps: 0, radii: [START_REACH] }

// ---- settings the user controls (cabin/SpreadSettings.tsx). Each is THE USER'S ASSUMPTION, NOT
// NASA DATA, and starts at 0 = "no effect". With all four at 0 the spread is distance alone. The
// shape of each rule is our own and is written beside its slider; none of it is physics.

/** Strength of each effect as the user set it, 0 (no effect) upward. */
export interface EffectSettings {
  airflow: number
  gravity: number
  oxygen: number
  pressure: number
}
export const NO_EFFECTS: EffectSettings = { airflow: 0, gravity: 0, oxygen: 0, pressure: 0 }

/** The cabin conditions the effects act on, as set on the page. */
export interface CabinConditions {
  o2Fraction: number
  pressureAtm: number
  airflowCmS: number
  /** 0 = microgravity, 1 = Earth. */
  gravity: number
}

/** What the effects are measured against. Reference points for the rules, shown on screen. */
export const AIRFLOW_FULL_CMS = 50 // the top of the page's airflow slider
export const EARTH_AIR_O2 = 0.21
const SEA_LEVEL_ATM = 1

/** How the settings bend the drawing, once the conditions are taken into account. */
export interface SpreadBias {
  /** Share by which something straight downstream of the fire counts as nearer (upstream: farther). */
  downstream: number
  /** The same for straight above the fire against below it. */
  up: number
  /** Items lit per step. */
  pace: number
}
export const NO_BIAS: SpreadBias = { downstream: 0, up: 0, pace: 1 }

/** A distance is never counted as less than this share of itself, however strong an effect. */
export const MIN_FACTOR = 0.15
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export function biasFrom(effects: EffectSettings, c: CabinConditions): SpreadBias {
  const oxygen = Math.max(0.2, 1 + effects.oxygen * (c.o2Fraction / EARTH_AIR_O2 - 1))
  const pressure = Math.max(0.2, 1 + effects.pressure * (c.pressureAtm / SEA_LEVEL_ATM - 1))
  return {
    downstream: effects.airflow * clamp(c.airflowCmS / AIRFLOW_FULL_CMS, 0, 1),
    up: effects.gravity * clamp(c.gravity, 0, 1),
    pace: clamp(oxygen * pressure, 0.2, 6),
  }
}

/** What a distance is multiplied by for something lying in direction (dx, dy, dz) from the fire.
 *  1 when no effect is in use. Air moves along `air` (the sample spacecraft's vents unless a
 *  loaded layout says otherwise); "up" is away from the deck. */
export function biasFactor(bias: SpreadBias, dx: number, dy: number, dz: number, air: readonly [number, number, number] = VENTS.direction) {
  const len = Math.hypot(dx, dy, dz)
  if (len < 1e-6) return 1
  const along = (dx * air[0] + dy * air[1] + dz * air[2]) / len
  return Math.max(MIN_FACTOR, 1 - bias.downstream * along - bias.up * (dy / len))
}

/** The smallest factor any direction can get: used to size the region the cloud is drawn in. */
export const smallestFactor = (bias: SpreadBias) => Math.max(MIN_FACTOR, 1 - Math.hypot(bias.downstream, bias.up))

/** Fuel items in the order the illustration lights them, starting from a point (x, z) on the
 *  deck at height y. Every fuel item is in the order whether or not it is shown: hiding furniture
 *  is a choice about the view, not about where the fire goes. With no bias the order is distance
 *  through the layout alone (path.ts). */
export function planSpread(x: number, z: number, y = 0, bias: SpreadBias = NO_BIAS): SpreadPlan {
  const inDuct = CEILING.y + DUCT.height / 2
  return planFrom(
    ITEMS.filter((i) => i.fuel).map((item) => {
      const route = routeToItem(item, x, y, z)
      const middle = (item.y ?? 0) + item.h / 2
      const way = route.via?.map((along): [number, number, number] => [along, inDuct, 0])
      return { item, way, distance: route.distance * biasFactor(bias, item.x - x, middle - y, item.z - z) }
    }),
    bias.pace,
  )
}

/** Turns "how far each item is" into the order and the timeline. Shared by the sample spacecraft
 *  and a loaded layout, so both count steps the same way. */
export function planFrom(reached: { item: SpreadItem; distance: number; way?: [number, number, number][] }[], pace: number): SpreadPlan {
  const ranked = reached
    .filter((r) => r.distance < Infinity) // an item with no way to it is left out, never guessed at
    .sort((a, b) => a.distance - b.distance) // stable: equal distances keep the layout's order
  let count = 0
  const radii = [START_REACH]
  const entries = ranked.map(({ item, way, distance }): SpreadEntry => {
    if (distance === 0) return { item, step: 0 }
    radii.push(Math.max(radii[radii.length - 1], distance + PAST_ITEM)) // the edge arrives as the item lights
    return { item, step: ++count, way }
  })
  return { entries, count, pace, steps: count / pace, radii }
}

/** How many items the timeline has got through at position t (fractions: one is part lit). */
export const itemsAt = (plan: SpreadPlan, t: number) => t * plan.pace

/** How far the drawing has reached at timeline position t: it moves from one item to the next. */
export function reachAt(plan: SpreadPlan, t: number) {
  const u = itemsAt(plan, t)
  const k = Math.min(plan.count, Math.max(0, Math.floor(u)))
  const next = Math.min(plan.count, k + 1)
  return plan.radii[k] + (plan.radii[next] - plan.radii[k]) * Math.min(1, Math.max(0, u - k))
}

/** 0..1: how lit the item numbered `step` is once `items` items have been got through
 *  (itemsAt). It lights while the count runs up to its own number. */
export function litAmount(step: number, items: number) {
  return step === 0 ? 1 : Math.min(1, Math.max(0, items - (step - 1)))
}

/** The whole step the timeline has reached, and the last whole step, for the read-out. */
export const lastStep = (steps: number) => Math.max(1, Math.ceil(steps - 1e-6))
export const stepReached = (t: number, steps: number) => (t >= steps - 1e-6 ? lastStep(steps) : Math.floor(t + 1e-6))
