// OWNER: 3D workstream. How far it is from one point in the sample spacecraft to another when you
// cannot pass through a bulkhead or a closed door: straight where nothing is in the way, round
// the edge of an open hatch where a bulkhead is, and otherwise up through a grille, along the
// vent duct and down through another grille. The duct is the only way into a closed room.
//
// This is plain geometry of the EXAMPLE LAYOUT (spec.ts), not a fire rule. The illustrated spread
// uses it for its order ("distance through the example layout": CLAUDE.md, "Spread is an
// illustration, never a result"). That a closed door stops the drawing and a duct carries it is
// our own choice for the drawing, said on screen beside the timeline; it is not a finding.
//
// No three.js here, so it can be checked by a script.
import { BULKHEADS, CEILING, DUCT_OPENINGS, openingHalfWidth, type CabinItem } from './spec'

/** A point on the deck: x along the craft, z across it. */
export type DeckPoint = [number, number]

const length = (a: DeckPoint, b: DeckPoint) => Math.hypot(a[0] - b[0], a[1] - b[1])

/** True when the straight line between two deck points goes through the opening of every
 *  bulkhead it crosses, and none of those has its door shut. A point lying on a bulkhead (an edge
 *  of its opening) counts as through. */
function clear(a: DeckPoint, b: DeckPoint) {
  for (const wall of BULKHEADS) {
    const da = a[0] - wall.x
    const db = b[0] - wall.x
    if (da * db >= 0) continue // both on one side, or an end on the bulkhead
    if (wall.closed) return false
    const z = a[1] + (b[1] - a[1]) * (da / (da - db))
    if (Math.abs(z) > openingHalfWidth(wall) + 1e-9) return false
  }
  return true
}

/** The two edges of each open opening, where a path that bends must turn. */
const TURNS: DeckPoint[] = BULKHEADS.filter((wall) => !wall.closed).flatMap((wall) => {
  const half = openingHalfWidth(wall)
  return [
    [wall.x, -half],
    [wall.x, half],
  ] as DeckPoint[]
})

/** Shortest distance along the deck from a to b, going through open openings and never through a
 *  bulkhead or a closed door. Infinity when a closed door leaves no way along the deck. */
export function deckDistance(a: DeckPoint, b: DeckPoint) {
  if (clear(a, b)) return length(a, b)
  // Few enough points to try every route: a, the edges of the openings, b.
  const nodes: DeckPoint[] = [a, ...TURNS, b]
  const n = nodes.length
  const best = new Array<number>(n).fill(Infinity)
  const done = new Array<boolean>(n).fill(false)
  best[0] = 0
  for (let round = 0; round < n; round++) {
    let u = -1
    for (let i = 0; i < n; i++) if (!done[i] && (u < 0 || best[i] < best[u])) u = i
    if (u < 0 || best[u] === Infinity) break
    done[u] = true
    for (let v = 0; v < n; v++) {
      if (done[v] || !clear(nodes[u], nodes[v])) continue
      const d = best[u] + length(nodes[u], nodes[v])
      if (d < best[v]) best[v] = d
    }
  }
  return best[n - 1]
}

/** Smallest footprint an item is treated as having, so a bottle is as easy to start on as to click. */
const MIN_FOOTPRINT = 0.4

/** Shortest distance along the deck from a point to an item's footprint; 0 when the point is on it. */
export function deckDistanceToItem(item: CabinItem, x: number, z: number) {
  const hw = Math.max(item.w, MIN_FOOTPRINT) / 2
  const hd = Math.max(item.d, MIN_FOOTPRINT) / 2
  const nearestOn = (p: DeckPoint): DeckPoint => [Math.min(item.x + hw, Math.max(item.x - hw, p[0])), Math.min(item.z + hd, Math.max(item.z - hd, p[1]))]
  const from: DeckPoint = [x, z]
  // The closest part of the footprint depends on which way the path comes in: straight from the
  // point, or round the edge of an opening.
  const targets: DeckPoint[] = [nearestOn(from), [item.x, item.z], ...TURNS.map(nearestOn)]
  return Math.min(...targets.map((t) => deckDistance(from, t)))
}

/** A way from the fire point to an item, and its length. `via` is set when the way runs along the
 *  vent duct: where it goes in and where it comes out, as positions along the craft. */
export interface Route {
  distance: number
  via?: [number, number]
}

/** The shortest way from a point (x, z) on the deck, at height y, to an item.
 *
 *  Along the deck when there is a way (the same distance as deckDistanceToItem, so nothing changes
 *  between rooms joined by an open hatch). Otherwise by the vent duct: straight up to a grille,
 *  along the duct, and from another grille down to the nearest part of the item. Going by the
 *  duct between two places the deck already joins is never shorter, so it is only ever the way
 *  into or out of a closed room. */
export function routeToItem(item: CabinItem, x: number, y: number, z: number): Route {
  const direct = deckDistanceToItem(item, x, z)
  if (direct < Infinity) return { distance: direct }
  let best: Route = { distance: Infinity }
  const itemTop = (item.y ?? 0) + item.h
  for (const entry of DUCT_OPENINGS) {
    const up = Math.hypot(deckDistance([x, z], [entry, 0]), CEILING.y - y)
    if (up === Infinity) continue
    for (const exit of DUCT_OPENINGS) {
      if (exit === entry) continue
      const down = Math.hypot(deckDistanceToItem(item, exit, 0), Math.max(0, CEILING.y - itemTop))
      const distance = up + Math.abs(exit - entry) + down
      if (distance < best.distance) best = { distance, via: [entry, exit] }
    }
  }
  return best
}
