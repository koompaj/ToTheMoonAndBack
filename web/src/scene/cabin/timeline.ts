// OWNER: 3D workstream. The order in which the illustrated spread lights the sample spacecraft's
// fuel items, and how far along each one is at a point on the timeline.
//
// SPREAD IS AN ILLUSTRATION, NEVER A RESULT (CLAUDE.md, "Rules of evidence"). NASA's tables hold
// no spread rates, no room geometry and no partial-gravity data, so:
//   - the order below comes ONLY from distance through this example layout: along its deck and
//     through its doorway and hatch, never through a bulkhead (path.ts);
//   - the timeline counts steps: one more item per step. A step is not a length of time;
//   - nothing computed here may be shown as a number, ranking or outcome, or change any evidence.
// Only fuel items light. Plain furniture never does: nothing in the tables says what it is.
//
// No three.js here, so the order can be checked by a script.
import { deckDistanceToItem } from './path'
import { ITEMS, type CabinItem } from './spec'

export interface SpreadEntry {
  item: CabinItem
  /** 0 = the fire starts on this item; otherwise the step at which it has lit. */
  step: number
}

export interface SpreadPlan {
  entries: SpreadEntry[]
  /** The last step. 0 when there is nothing for the fire to reach. */
  steps: number
  /** How far from the start the drawing has reached at each whole step (index = step), in scene
   *  units. Only the reach field draws from it; it is never shown as a number. */
  radii: number[]
}

/** Reach around the fire point before anything else has lit, and how far past an item's edge the
 *  drawing goes when that item lights. Drawing choices. */
const START_REACH = 0.7
const PAST_ITEM = 0.35

export const NO_SPREAD: SpreadPlan = { entries: [], steps: 0, radii: [START_REACH] }

/** Distance along the deck from a point to an item's footprint; 0 when the point is on it. */
export const distanceToItem = (item: CabinItem, x: number, z: number) => deckDistanceToItem(item, x, z)

/** Fuel items in the order the illustration lights them, starting from a point on the deck.
 *  Every fuel item is in the order whether or not it is shown: hiding furniture is a choice about
 *  the view, not about where the fire goes. */
export function planSpread(x: number, z: number): SpreadPlan {
  const ranked = ITEMS.filter((i) => i.fuel)
    .map((item) => ({ item, distance: distanceToItem(item, x, z) }))
    .sort((a, b) => a.distance - b.distance) // stable: equal distances keep the layout's order
  let step = 0
  const radii = [START_REACH]
  const entries = ranked.map(({ item, distance }) => {
    if (distance === 0) return { item, step: 0 }
    radii.push(Math.max(radii[radii.length - 1], distance + PAST_ITEM)) // the edge arrives as the item lights
    return { item, step: ++step }
  })
  return { entries, steps: step, radii }
}

/** How far the drawing has reached at timeline position t: it moves between the whole steps. */
export function reachAt(plan: SpreadPlan, t: number) {
  const k = Math.min(plan.steps, Math.max(0, Math.floor(t)))
  const next = Math.min(plan.steps, k + 1)
  return plan.radii[k] + (plan.radii[next] - plan.radii[k]) * Math.min(1, Math.max(0, t - k))
}

/** 0..1: how lit an item is at timeline position t. It lights during the step before its own. */
export function litAmount(step: number, t: number) {
  return step === 0 ? 1 : Math.min(1, Math.max(0, t - (step - 1)))
}

/** The whole step the timeline has reached, for the read-out. */
export const stepReached = (t: number, steps: number) => Math.min(steps, Math.floor(t + 1e-6))
