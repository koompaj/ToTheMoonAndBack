// OWNER: 3D workstream. Distance through a loaded layout (layoutFile.ts): the layout is cut into
// small cells, and from the cell where the fire starts the shortest way to every other cell is
// worked out once, staying inside rooms, passing only open doors, and using the vent duct, which
// a room joins only at its grilles. One table then gives both the order in which items light and
// the cloud (LayoutField.tsx).
//
// THIS IS PLAIN GEOMETRY OF THE USER'S OWN DRAWING, NOT A FIRE RULE (CLAUDE.md, "Spread is an
// illustration, never a result"). That a closed door stops the drawing and a duct carries it is
// our choice for the drawing; the screen says so. Distances here are never shown as numbers.
//
// No three.js here, so it can be checked by a script.
import { DOOR_HEIGHT, GRILLE_SIZE, distanceToDuctLine, roomAt, type Layout3D } from './layoutFile'
import { NO_BIAS, biasFactor, planFrom, type SpreadBias, type SpreadPlan } from './timeline'

/** What a cell is: SOLID, part of the DUCT, or the index of the room it is in. */
export const SOLID = -1
export const DUCT_CELL = -2

export interface LayoutGrid {
  cell: number
  nx: number
  ny: number
  nz: number
  /** The corner of the grid with the smallest x, y, z. */
  min: [number, number, number]
  kind: Int16Array
}

export interface DistanceField {
  /** Shortest way from the fire to each cell, in metres; Infinity where there is none. */
  dist: Float64Array
  /** The cell each cell is reached from; -1 at the start and where there is no way. */
  from: Int32Array
  start: number
}

const MAX_CELLS = 250_000

export function buildGrid(layout: Layout3D): LayoutGrid {
  const [w, d] = layout.size
  const top = layout.ceiling + (layout.duct?.height ?? 0)
  let cell = 0.2
  while (Math.ceil(w / cell) * Math.ceil(d / cell) * Math.ceil(top / cell) > MAX_CELLS) cell += 0.05
  const nx = Math.ceil(w / cell - 1e-9)
  const ny = Math.ceil(top / cell - 1e-9)
  const nz = Math.ceil(d / cell - 1e-9)
  const min: [number, number, number] = [-w / 2, 0, -d / 2]
  const kind = new Int16Array(nx * ny * nz).fill(SOLID)
  for (let k = 0; k < nz; k++)
    for (let i = 0; i < nx; i++) {
      const x = min[0] + (i + 0.5) * cell
      const z = min[2] + (k + 0.5) * cell
      const room = roomAt(layout.rooms, x, z)
      const underDuct = !!layout.duct && distanceToDuctLine(layout.duct.path, x, z) <= layout.duct.halfWidth
      for (let j = 0; j < ny; j++) {
        const y = (j + 0.5) * cell
        if (y < layout.ceiling) kind[i + nx * (j + ny * k)] = room >= 0 ? room : SOLID
        else if (underDuct) kind[i + nx * (j + ny * k)] = DUCT_CELL
      }
    }
  return { cell, nx, ny, nz, min, kind }
}

export const cellCentre = (g: LayoutGrid, index: number): [number, number, number] => {
  const i = index % g.nx
  const j = Math.floor(index / g.nx) % g.ny
  const k = Math.floor(index / (g.nx * g.ny))
  return [g.min[0] + (i + 0.5) * g.cell, g.min[1] + (j + 0.5) * g.cell, g.min[2] + (k + 0.5) * g.cell]
}

const clampInt = (v: number, hi: number) => Math.min(hi - 1, Math.max(0, Math.floor(v)))
export const cellAt = (g: LayoutGrid, x: number, y: number, z: number) =>
  clampInt((x - g.min[0]) / g.cell, g.nx) + g.nx * (clampInt((y - g.min[1]) / g.cell, g.ny) + g.ny * clampInt((z - g.min[2]) / g.cell, g.nz))

/** True when a step straight across the wall between two rooms goes through an open door.
 *  (x, y, z) is the middle of the cell being left; `along` says which way the step goes. */
function throughOpenDoor(layout: Layout3D, a: number, b: number, along: 'x' | 'z', x: number, y: number, z: number) {
  if (y > DOOR_HEIGHT) return false
  const across = along === 'x' ? z : x
  return layout.doors.some((d) => d.open && d.axis === along && ((d.a === a && d.b === b) || (d.a === b && d.b === a)) && across >= d.lo && across <= d.hi)
}

/** The shortest way from the fire point to every cell (Dijkstra over the cells). */
export function distanceField(layout: Layout3D, g: LayoutGrid, start: [number, number, number]): DistanceField {
  const n = g.kind.length
  const dist = new Float64Array(n).fill(Infinity) // not 32-bit: a rounded entry would never match the value queued for it
  const from = new Int32Array(n).fill(-1)
  const grille = Math.max(GRILLE_SIZE, g.cell * 1.01) / 2
  const overGrille = (x: number, z: number) => !!layout.duct?.grilles.some((q) => Math.abs(x - q.x) <= grille && Math.abs(z - q.z) <= grille)

  let s = cellAt(g, start[0], Math.max(start[1], g.cell / 2), start[2])
  if (g.kind[s] < 0) s = cellAt(g, start[0], g.cell / 2, start[2]) // a point above an item's top is still in the room
  if (g.kind[s] < 0) return { dist, from, start: -1 }

  // a small binary heap of [distance, cell]
  const heapD: number[] = []
  const heapI: number[] = []
  const push = (d: number, i: number) => {
    let c = heapD.length
    heapD.push(d)
    heapI.push(i)
    while (c > 0) {
      const p = (c - 1) >> 1
      if (heapD[p] <= heapD[c]) break
      ;[heapD[p], heapD[c]] = [heapD[c], heapD[p]]
      ;[heapI[p], heapI[c]] = [heapI[c], heapI[p]]
      c = p
    }
  }
  const pop = () => {
    const top: [number, number] = [heapD[0], heapI[0]]
    const lastD = heapD.pop()!
    const lastI = heapI.pop()!
    if (heapD.length) {
      heapD[0] = lastD
      heapI[0] = lastI
      let c = 0
      for (;;) {
        const l = 2 * c + 1
        const r = l + 1
        let m = c
        if (l < heapD.length && heapD[l] < heapD[m]) m = l
        if (r < heapD.length && heapD[r] < heapD[m]) m = r
        if (m === c) break
        ;[heapD[m], heapD[c]] = [heapD[c], heapD[m]]
        ;[heapI[m], heapI[c]] = [heapI[c], heapI[m]]
        c = m
      }
    }
    return top
  }

  dist[s] = 0
  push(0, s)
  while (heapD.length) {
    const [dHere, here] = pop()
    if (dHere > dist[here]) continue
    const i = here % g.nx
    const j = Math.floor(here / g.nx) % g.ny
    const k = Math.floor(here / (g.nx * g.ny))
    const kindHere = g.kind[here]
    const [x, y, z] = cellCentre(g, here)
    for (let dk = -1; dk <= 1; dk++)
      for (let dj = -1; dj <= 1; dj++)
        for (let di = -1; di <= 1; di++) {
          if (!di && !dj && !dk) continue
          const [ni, nj, nk] = [i + di, j + dj, k + dk]
          if (ni < 0 || nj < 0 || nk < 0 || ni >= g.nx || nj >= g.ny || nk >= g.nz) continue
          const next = ni + g.nx * (nj + g.ny * nk)
          const kindNext = g.kind[next]
          if (kindNext === SOLID) continue
          if (kindNext !== kindHere) {
            const straight = Math.abs(di) + Math.abs(dj) + Math.abs(dk) === 1
            if (!straight) continue // no cutting a corner into another room or into the duct
            if (kindHere === DUCT_CELL || kindNext === DUCT_CELL) {
              if (!dj || !overGrille(x, z)) continue // the duct is entered only up or down through a grille
            } else if (dj || !throughOpenDoor(layout, kindHere, kindNext, di ? 'x' : 'z', x, y, z)) continue
          }
          const d = dHere + g.cell * Math.hypot(di, dj, dk)
          if (d < dist[next]) {
            dist[next] = d
            from[next] = here
            push(d, next)
          }
        }
  }
  return { dist, from, start: s }
}

/** Fuel items of a loaded layout in the order the illustration lights them, from a fire at
 *  `start`. The same counting as the sample spacecraft (timeline.ts, planFrom); the distance is
 *  the shortest way to any part of the item, changed only by the spread settings on screen. */
export function planLayoutSpread(layout: Layout3D, g: LayoutGrid, field: DistanceField, start: [number, number, number], bias: SpreadBias = NO_BIAS): SpreadPlan {
  if (field.start < 0) return planFrom([], bias.pace)
  const startKind = g.kind[field.start]
  return planFrom(
    layout.items
      .filter((item) => item.fuel)
      .map((item) => {
        const base = item.y ?? 0
        const hw = Math.max(item.w, 0.4) / 2
        const hd = Math.max(item.d, 0.4) / 2
        if (Math.abs(start[0] - item.x) <= hw && Math.abs(start[2] - item.z) <= hd) return { item, distance: 0 }
        // the nearest cell that touches the item
        let best = -1
        const half = g.cell / 2
        const lo = cellAt(g, item.x - hw - half, base, item.z - hd - half)
        const hi = cellAt(g, item.x + hw + half, base + item.h + half, item.z + hd + half)
        const [i0, j0, k0] = [lo % g.nx, Math.floor(lo / g.nx) % g.ny, Math.floor(lo / (g.nx * g.ny))]
        const [i1, j1, k1] = [hi % g.nx, Math.floor(hi / g.nx) % g.ny, Math.floor(hi / (g.nx * g.ny))]
        for (let k = k0; k <= k1; k++)
          for (let j = j0; j <= j1; j++)
            for (let i = i0; i <= i1; i++) {
              const c = i + g.nx * (j + g.ny * k)
              if (g.kind[c] >= 0 && (best < 0 || field.dist[c] < field.dist[best])) best = c
            }
        if (best < 0 || field.dist[best] === Infinity) return { item, distance: Infinity }
        // the way there, for the line drawn from the fire: only when it leaves the fire's room
        const cells: number[] = []
        for (let c = best; c >= 0 && c !== field.start; c = field.from[c]) cells.push(c)
        const leavesRoom = cells.some((c) => g.kind[c] !== startKind)
        const way = leavesRoom ? cells.reverse().filter((_, n) => n % 3 === 2).map((c) => cellCentre(g, c)) : undefined
        const middle = base + item.h / 2
        return { item, way, distance: field.dist[best] * biasFactor(bias, item.x - start[0], middle - start[1], item.z - start[2], layout.air.direction) }
      }),
    bias.pace,
  )
}
