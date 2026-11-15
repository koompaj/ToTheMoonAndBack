// OWNER: 3D workstream. Reads a 3D layout file the user uploads on the Simulation page (the same
// box that takes a floor-plan picture; CabinStage3D tells the two apart by reading the file): box
// rooms on one floor, doors that are open or closed, one vent duct above the ceiling with its
// grilles, and the objects in the rooms.
//
// A LOADED LAYOUT IS THE USER'S OWN DRAWING, NOT A NASA DESIGN, and nothing in it is NASA data
// except the fuel names, which must be ones NASA's tables cover (ids from fuels.json). A fuel
// that is not in that list is refused, never matched to a near one. The file never leaves the
// browser. It feeds the illustrated spread only: it has no evidence, the page never learns what
// is in it, and its items are coloured by fuel type, not by evidence.
//
// The format is written out in samples/README.md. No three.js here, so it can be checked by a
// script.
import type { FuelClass } from '../../types/data'
import type { SpreadItem } from './timeline'

export const LAYOUT_FORMAT = 'flame-in-freefall-layout'

export interface LayoutRoom {
  id: string
  name: string
  x0: number
  x1: number
  z0: number
  z1: number
}

/** A door in the wall two rooms share. */
export interface LayoutDoor {
  /** Indexes of the two rooms in Layout3D.rooms. */
  a: number
  b: number
  /** 'x': the wall is the plane x = wall and the door spans lo..hi along z. 'z': the other way. */
  axis: 'x' | 'z'
  wall: number
  lo: number
  hi: number
  open: boolean
}

export interface LayoutGrille {
  x: number
  z: number
  /** Index of the room it opens into. */
  room: number
}

export interface LayoutDuct {
  /** Height of the duct above the ceiling, and half its width. */
  height: number
  halfWidth: number
  /** Its centre line, as points on the plan joined by straight pieces along x or z. */
  path: [number, number][]
  grilles: LayoutGrille[]
}

export interface Layout3D {
  name: string
  /** Height of every room. */
  ceiling: number
  rooms: LayoutRoom[]
  doors: LayoutDoor[]
  duct: LayoutDuct | null
  /** Which way the air moves, for the airflow setting, and how the file words it. */
  air: { direction: [number, number, number]; toward: string | null }
  items: SpreadItem[]
  /** Size of the whole plan along x and z. The plan is centred on the origin. */
  size: [number, number]
}

/** Side of a grille. */
export const GRILLE_SIZE = 0.6
/** Height of a doorway. */
export const DOOR_HEIGHT = 2

const LIMIT = { rooms: 12, items: 60, span: 40, minRoom: 1 }
const EPS = 1e-6

type Raw = Record<string, unknown>
const isObject = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v)
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const text = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0
const pair = (v: unknown): v is [number, number] => Array.isArray(v) && v.length === 2 && num(v[0]) && num(v[1])

export const roomAt = (rooms: readonly LayoutRoom[], x: number, z: number) => rooms.findIndex((r) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1)

/** How far a point on the plan is from the duct's centre line. */
export function distanceToDuctLine(path: readonly [number, number][], x: number, z: number) {
  let best = Infinity
  for (let k = 0; k + 1 < path.length; k++) {
    const [ax, az] = path[k]
    const [bx, bz] = path[k + 1]
    const len2 = (bx - ax) ** 2 + (bz - az) ** 2
    const t = len2 > 0 ? Math.min(1, Math.max(0, ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / len2)) : 0
    best = Math.min(best, Math.hypot(x - (ax + (bx - ax) * t), z - (az + (bz - az) * t)))
  }
  return best
}

/** Reads and checks a layout file. Returns the layout, moved so the middle of the plan is at the
 *  origin, or the list of everything wrong with the file in plain words. Nothing is guessed or
 *  repaired: a file with a problem is refused whole. */
export function parseLayout(source: string, knownFuelIds: ReadonlySet<string>): { layout: Layout3D } | { problems: string[] } {
  let raw: unknown
  try {
    raw = JSON.parse(source)
  } catch (e) {
    return { problems: [`The file is not valid JSON (${e instanceof Error ? e.message : 'could not be read'}).`] }
  }
  if (!isObject(raw) || raw.format !== LAYOUT_FORMAT) return { problems: [`This is not a layout file: it must have "format": "${LAYOUT_FORMAT}".`] }
  const problems: string[] = []

  // ---- rooms
  const rooms: LayoutRoom[] = []
  const rawRooms = Array.isArray(raw.rooms) ? raw.rooms : []
  if (rawRooms.length === 0) problems.push('The file has no rooms.')
  if (rawRooms.length > LIMIT.rooms) problems.push(`The file has ${rawRooms.length} rooms; at most ${LIMIT.rooms} are drawn.`)
  rawRooms.slice(0, LIMIT.rooms).forEach((r, k) => {
    if (!isObject(r) || !text(r.id) || !num(r.x0) || !num(r.x1) || !num(r.z0) || !num(r.z1)) return problems.push(`Room ${k + 1} needs an id and the numbers x0, x1, z0, z1.`)
    if (r.x1 - r.x0 < LIMIT.minRoom || r.z1 - r.z0 < LIMIT.minRoom) return problems.push(`Room "${r.id}" must be at least ${LIMIT.minRoom} m along x and z (x0 < x1, z0 < z1).`)
    if (rooms.some((o) => o.id === r.id)) return problems.push(`Two rooms are called "${r.id}".`)
    rooms.push({ id: r.id, name: text(r.name) ? r.name : r.id, x0: r.x0, x1: r.x1, z0: r.z0, z1: r.z1 })
  })
  for (let a = 0; a < rooms.length; a++)
    for (let b = a + 1; b < rooms.length; b++) {
      const [p, q] = [rooms[a], rooms[b]]
      if (Math.min(p.x1, q.x1) - Math.max(p.x0, q.x0) > EPS && Math.min(p.z1, q.z1) - Math.max(p.z0, q.z0) > EPS) problems.push(`Rooms "${p.id}" and "${q.id}" overlap.`)
    }
  if (rooms.length === 0) return { problems }
  const bounds = { x0: Math.min(...rooms.map((r) => r.x0)), x1: Math.max(...rooms.map((r) => r.x1)), z0: Math.min(...rooms.map((r) => r.z0)), z1: Math.max(...rooms.map((r) => r.z1)) }
  if (bounds.x1 - bounds.x0 > LIMIT.span || bounds.z1 - bounds.z0 > LIMIT.span) problems.push(`The plan is larger than ${LIMIT.span} m; it would be too coarse to draw.`)

  const ceiling = raw.ceiling === undefined ? 2.4 : raw.ceiling
  if (!num(ceiling) || ceiling < 1.8 || ceiling > 5) problems.push('"ceiling" must be a height between 1.8 and 5 m.')
  const height = num(ceiling) ? ceiling : 2.4

  // ---- doors
  const doors: LayoutDoor[] = []
  ;(Array.isArray(raw.doors) ? raw.doors : []).forEach((d, k) => {
    const name = `Door ${k + 1}`
    if (!isObject(d) || !Array.isArray(d.between) || d.between.length !== 2 || !num(d.at) || !num(d.width) || typeof d.open !== 'boolean')
      return problems.push(`${name} needs "between" (two room ids), "at", "width" and "open" (true or false).`)
    const [first, second] = d.between as unknown[]
    const a = rooms.findIndex((r) => r.id === first)
    const b = rooms.findIndex((r) => r.id === second)
    if (a < 0 || b < 0 || a === b) return problems.push(`${name} must join two different rooms that exist.`)
    if (d.width < 0.4) return problems.push(`${name} must be at least 0.4 m wide.`)
    const [p, q] = [rooms[a], rooms[b]]
    const lo = d.at - d.width / 2
    const hi = d.at + d.width / 2
    // the shared wall: the rooms touch along x (a wall at x = const) or along z
    const wallX = Math.abs(p.x1 - q.x0) < EPS ? p.x1 : Math.abs(q.x1 - p.x0) < EPS ? p.x0 : null
    const wallZ = Math.abs(p.z1 - q.z0) < EPS ? p.z1 : Math.abs(q.z1 - p.z0) < EPS ? p.z0 : null
    if (wallX !== null && lo >= Math.max(p.z0, q.z0) - EPS && hi <= Math.min(p.z1, q.z1) + EPS) return doors.push({ a, b, axis: 'x', wall: wallX, lo, hi, open: d.open })
    if (wallZ !== null && lo >= Math.max(p.x0, q.x0) - EPS && hi <= Math.min(p.x1, q.x1) + EPS) return doors.push({ a, b, axis: 'z', wall: wallZ, lo, hi, open: d.open })
    problems.push(`${name} is not on a wall that "${p.id}" and "${q.id}" share ("at" is its middle along that wall).`)
  })

  // ---- duct
  let duct: LayoutDuct | null = null
  if (raw.duct !== undefined && raw.duct !== null) {
    const d = raw.duct
    const path = isObject(d) && Array.isArray(d.path) ? d.path.filter(pair) : []
    if (!isObject(d) || path.length < 2 || path.length !== (d.path as unknown[]).length) problems.push('"duct" needs a "path" of at least two [x, z] points.')
    else {
      const width = d.width === undefined ? 0.6 : d.width
      const tall = d.height === undefined ? 0.4 : d.height
      if (!num(width) || width < 0.3 || width > 1.5) problems.push('The duct\'s "width" must be between 0.3 and 1.5 m.')
      if (!num(tall) || tall < 0.2 || tall > 1) problems.push('The duct\'s "height" must be between 0.2 and 1 m.')
      for (let k = 0; k + 1 < path.length; k++) if (Math.abs(path[k][0] - path[k + 1][0]) > EPS && Math.abs(path[k][1] - path[k + 1][1]) > EPS) problems.push(`Piece ${k + 1} of the duct must run straight along x or along z.`)
      for (const [x, z] of path) if (x < bounds.x0 - EPS || x > bounds.x1 + EPS || z < bounds.z0 - EPS || z > bounds.z1 + EPS) problems.push(`The duct leaves the plan at (${x}, ${z}).`)
      const halfWidth = num(width) ? width / 2 : 0.3
      const grilles: LayoutGrille[] = []
      const rawGrilles = Array.isArray(d.grilles) ? d.grilles : []
      if (rawGrilles.length < 2) problems.push('The duct needs at least two grilles, or it joins nothing.')
      rawGrilles.forEach((g, k) => {
        if (!pair(g)) return problems.push(`Grille ${k + 1} must be an [x, z] point.`)
        const room = roomAt(rooms, g[0], g[1])
        if (room < 0) return problems.push(`Grille ${k + 1} at (${g[0]}, ${g[1]}) is not inside a room.`)
        if (distanceToDuctLine(path, g[0], g[1]) > halfWidth + EPS) return problems.push(`Grille ${k + 1} at (${g[0]}, ${g[1]}) is not under the duct.`)
        grilles.push({ x: g[0], z: g[1], room })
      })
      duct = { height: num(tall) ? tall : 0.4, halfWidth, path, grilles }
    }
  }

  // ---- every room must be reachable from every other, by open doors or by the duct
  const group = rooms.map((_, k) => k)
  const find = (k: number): number => (group[k] === k ? k : (group[k] = find(group[k])))
  const join = (a: number, b: number) => (group[find(a)] = find(b))
  doors.filter((d) => d.open).forEach((d) => join(d.a, d.b))
  duct?.grilles.forEach((g) => join(g.room, duct!.grilles[0].room))
  rooms.forEach((r, k) => {
    if (find(k) !== find(0)) problems.push(`Room "${r.id}" cannot be reached from "${rooms[0].id}": it needs an open door or a duct grille.`)
  })

  // ---- air
  let direction: [number, number, number] = [1, 0, 0]
  let toward: string | null = null
  if (raw.air !== undefined) {
    if (!isObject(raw.air) || !pair(raw.air.direction) || Math.hypot(...raw.air.direction) < EPS) problems.push('"air" needs a "direction" as [x, z], not zero.')
    else {
      const len = Math.hypot(...raw.air.direction)
      direction = [raw.air.direction[0] / len, 0, raw.air.direction[1] / len]
      if (text(raw.air.toward)) toward = raw.air.toward.trim()
    }
  }

  // ---- items
  const items: SpreadItem[] = []
  const rawItems = Array.isArray(raw.items) ? raw.items : []
  if (rawItems.length > LIMIT.items) problems.push(`The file has ${rawItems.length} items; at most ${LIMIT.items} are drawn.`)
  rawItems.slice(0, LIMIT.items).forEach((it, k) => {
    if (!isObject(it) || !text(it.id) || !text(it.label) || !num(it.x) || !num(it.z) || !num(it.w) || !num(it.d) || !num(it.h)) return problems.push(`Item ${k + 1} needs an id, a label and the numbers x, z, w, d, h.`)
    const name = `Item "${it.id}"`
    if (items.some((o) => o.id === it.id)) return problems.push(`Two items are called "${it.id}".`)
    if (it.w <= 0 || it.d <= 0 || it.h <= 0) return problems.push(`${name} must have a size above zero.`)
    const y = it.y === undefined ? 0 : it.y
    if (!num(y) || y < 0 || y + it.h > height + EPS) return problems.push(`${name} does not fit under the ceiling.`)
    const room = roomAt(rooms, it.x, it.z)
    const r = rooms[room]
    if (room < 0 || it.x - it.w / 2 < r.x0 - EPS || it.x + it.w / 2 > r.x1 + EPS || it.z - it.d / 2 < r.z0 - EPS || it.z + it.d / 2 > r.z1 + EPS) return problems.push(`${name} is not wholly inside one room.`)
    let fuel: SpreadItem['fuel']
    if (it.fuel !== undefined && it.fuel !== null) {
      if (!text(it.fuel) || !knownFuelIds.has(it.fuel))
        return problems.push(`${name} names the fuel "${String(it.fuel)}", which is not one of the fuels in NASA's tables (see fuels.json). Leave "fuel" out for an object that is not a fuel.`)
      fuel = { fuel_class: it.fuel.split(':')[0] as FuelClass, fuel_option_id: it.fuel, airflow: 'still' }
    }
    items.push({ id: it.id, label: it.label.trim(), x: it.x, z: it.z, w: it.w, d: it.d, h: it.h, y, fuel })
  })
  if (!items.some((i) => i.fuel)) problems.push('No item names a fuel, so there is nothing for the drawing to reach.')

  if (problems.length) return { problems }

  // ---- move the middle of the plan to the origin
  const cx = (bounds.x0 + bounds.x1) / 2
  const cz = (bounds.z0 + bounds.z1) / 2
  return {
    layout: {
      name: text(raw.name) ? raw.name.trim().slice(0, 60) : 'Untitled layout',
      ceiling: height,
      rooms: rooms.map((r) => ({ ...r, x0: r.x0 - cx, x1: r.x1 - cx, z0: r.z0 - cz, z1: r.z1 - cz })),
      doors: doors.map((d) => (d.axis === 'x' ? { ...d, wall: d.wall - cx, lo: d.lo - cz, hi: d.hi - cz } : { ...d, wall: d.wall - cz, lo: d.lo - cx, hi: d.hi - cx })),
      duct: duct && {
        ...duct,
        path: duct.path.map(([x, z]): [number, number] => [x - cx, z - cz]),
        grilles: duct.grilles.map((g) => ({ ...g, x: g.x - cx, z: g.z - cz })),
      },
      air: { direction, toward },
      items: items.map((i) => ({ ...i, x: i.x - cx, z: i.z - cz })),
      size: [bounds.x1 - bounds.x0, bounds.z1 - bounds.z0],
    },
  }
}
