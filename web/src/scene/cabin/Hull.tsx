// OWNER: 3D workstream. The sample spacecraft's shell: hull ribs and stringers, the deck, the
// closed flight deck door, the node hatch, the docking ring, and (optionally) the outside
// fittings. Example layout, not a NASA design.
import { useMemo } from 'react'
import * as THREE from 'three'
import { Box, Cyl, Glow, Holo, Ring, Segs, coneGeo } from './holo'
import { AXIS_Y, BULKHEADS, CEILING, DECK_X0, DECK_X1, HULL, ceilingHalfWidth, deckHalfWidth, hullRadius } from './spec'

const TAU = Math.PI * 2
const STRINGERS = 12
const RIB_SIDES = 48

/** Stations along the craft where a rib is drawn. The dome is left out: the window item draws it. */
function stations() {
  const xs: number[] = [HULL.domeX, -4.6, -4]
  for (let k = 0; k <= 8; k++) xs.push(HULL.coneEndX + (k * (HULL.cabinEndX - HULL.coneEndX)) / 8)
  xs.push(HULL.cabinEndX + 1e-4, 3.2, 3.8, 4.5, 5.2, 5.8, 6.3) // the step at the bulkhead, then the node
  return xs.map((x) => ({ x, r: hullRadius(x) }))
}

function hullSegments() {
  const pts: number[] = []
  const st = stations()
  const at = (x: number, r: number, a: number) => [x, AXIS_Y + r * Math.sin(a), r * Math.cos(a)]
  for (const { x, r } of st) for (let i = 0; i < RIB_SIDES; i++) pts.push(...at(x, r, (i / RIB_SIDES) * TAU), ...at(x, r, ((i + 1) / RIB_SIDES) * TAU))
  for (let k = 0; k < STRINGERS; k++) {
    const a = (k / STRINGERS) * TAU + TAU / 24
    for (let i = 0; i + 1 < st.length; i++) pts.push(...at(st[i].x, st[i].r, a), ...at(st[i + 1].x, st[i + 1].r, a))
  }
  return pts
}

/** Deck outline as [x, z] pairs, going down one side and back up the other. */
function deckOutline() {
  const xs: number[] = []
  for (let x = DECK_X0; x < DECK_X1; x += 0.1) xs.push(x)
  xs.push(HULL.cabinEndX, HULL.cabinEndX + 1e-4, DECK_X1) // keep the doorway step sharp
  xs.sort((a, b) => a - b)
  const near = xs.map((x) => [x, deckHalfWidth(x)] as [number, number])
  const far = xs.map((x) => [x, -deckHalfWidth(x)] as [number, number]).reverse()
  return [...near, ...far]
}

function deckSegments(outline: [number, number][]) {
  const pts: number[] = []
  const y = 0.005
  outline.forEach(([x, z], i) => {
    const [nx, nz] = outline[(i + 1) % outline.length]
    pts.push(x, y, z, nx, y, nz)
  })
  // deck plates: a line across every half unit, and lines along the craft wherever there is deck
  for (let x = Math.ceil(DECK_X0 * 2) / 2; x < DECK_X1; x += 0.5) {
    const hw = deckHalfWidth(x)
    if (hw > 0) pts.push(x, y, -hw, x, y, hw)
  }
  for (let z = -2; z <= 2; z += 0.5) {
    for (let x = DECK_X0; x < DECK_X1; x += 0.1) {
      if (Math.abs(z) <= deckHalfWidth(x) && Math.abs(z) <= deckHalfWidth(x + 0.1)) pts.push(x, y, z, x + 0.1, y, z)
    }
  }
  return pts
}

/** The cabin ceiling: its edge and its panel joints. */
function ceilingSegments() {
  const { y, x0, x1 } = CEILING
  const hw = ceilingHalfWidth()
  const pts = [x0, y, -hw, x1, y, -hw, x1, y, -hw, x1, y, hw, x1, y, hw, x0, y, hw, x0, y, hw, x0, y, -hw]
  for (let k = 1; k < 8; k++) {
    const x = x0 + (k * (x1 - x0)) / 8
    pts.push(x, y, -hw, x, y, hw)
  }
  for (const z of [-hw / 2, hw / 2]) pts.push(x0, y, z, x1, y, z)
  return pts
}

/** Faint spokes on a bulkhead between an inner and an outer radius. */
function spokes(x: number, inner: number, outer: number, n = 16) {
  const pts: number[] = []
  for (let k = 0; k < n; k++) {
    const a = (k / n) * TAU
    pts.push(x, AXIS_Y + inner * Math.sin(a), inner * Math.cos(a), x, AXIS_Y + outer * Math.sin(a), outer * Math.cos(a))
  }
  return pts
}

const FACE_X: [number, number, number] = [0, Math.PI / 2, 0] // turns a ring so it faces along the craft

function Hatch({ x, r }: { x: number; r: number }) {
  return (
    <group position={[x, AXIS_Y, 0]}>
      <Ring r={r} tube={0.06} rotation={FACE_X} />
      <Ring r={r * 0.86} tube={0.025} rotation={FACE_X} line={0.5} />
      {[0, 1, 2, 3, 4, 5].map((k) => {
        const a = (k / 6) * TAU
        return <Box key={k} size={[0.08, 0.16, 0.1]} position={[0, r * Math.sin(a), r * Math.cos(a)]} rotation={[-a, 0, 0]} line={0.7} />
      })}
    </group>
  )
}

/** A shut door filling a bulkhead's opening: a pale panel with bars and a hand wheel, so it reads
 *  as closed without its label. Only the part above the deck is drawn. */
function ClosedDoor({ x, r }: { x: number; r: number }) {
  const first = Math.asin(-AXIS_Y / r) // where the opening's circle meets the deck
  const panel = useMemo(() => {
    const pts: number[] = []
    const n = 40
    for (let k = 0; k < n; k++) {
      const a = first + (k / n) * (Math.PI - 2 * first)
      const b = first + ((k + 1) / n) * (Math.PI - 2 * first)
      pts.push(x, AXIS_Y, 0, x, AXIS_Y + r * Math.sin(a), r * Math.cos(a), x, AXIS_Y + r * Math.sin(b), r * Math.cos(b))
    }
    pts.push(x, AXIS_Y, 0, x, 0, -r * Math.cos(first), x, 0, r * Math.cos(first)) // down to the deck
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return g
  }, [x, r, first])
  const bars = useMemo(() => {
    const pts: number[] = []
    for (const y of [-0.6, -0.2, 0.2, 0.6, 1]) {
      const half = Math.sqrt(r * r - y * y)
      pts.push(x, AXIS_Y + y, -half, x, AXIS_Y + y, half)
    }
    return pts
  }, [x, r])
  return (
    <group>
      <Glow geo={panel} color="#dff4ff" opacity={0.2} />
      <Segs points={bars} color="#dff4ff" opacity={0.75} />
      <Ring r={r} tube={0.06} position={[x, AXIS_Y, 0]} rotation={FACE_X} color="#dff4ff" />
      <Ring r={0.26} tube={0.03} position={[x, AXIS_Y, 0]} rotation={FACE_X} color="#dff4ff" line={0.9} />
    </group>
  )
}

function Exterior() {
  const wings = [-1, 1]
  return (
    <group>
      {wings.map((s) => (
        <group key={s} position={[-0.3, AXIS_Y, s * 4.75]}>
          <Box size={[0.12, 0.12, 1.5]} position={[0, 0, -s * 1.5]} line={0.5} />
          {[-2, -1, 0, 1, 2].map((k) => (
            <Box key={k} size={[0.96, 0.03, 1.5]} position={[k, 0, 0]} line={0.55} fill={0.1} />
          ))}
        </group>
      ))}
      <group position={[HULL.nodeX, AXIS_Y + HULL.nodeR, 0]}>
        <Cyl r={0.03} h={0.7} position={[0, 0.35, 0]} line={0.6} />
        <Holo geo={coneGeo(0.5, 0.25)} position={[0, 0.8, 0]} rotation={[Math.PI, 0, 0]} line={0.6} />
      </group>
    </group>
  )
}

export function Hull({ exterior = false }: { exterior?: boolean }) {
  const hull = useMemo(hullSegments, [])
  const outline = useMemo(deckOutline, [])
  const deckLines = useMemo(() => deckSegments(outline), [outline])
  const deckFill = useMemo(() => {
    const shape = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, z)))
    return new THREE.ShapeGeometry(shape).rotateX(Math.PI / 2) // (x, z) on the page becomes (x, 0, z)
  }, [outline])
  const [doorway, hatch] = BULKHEADS
  const bulkhead = useMemo(() => spokes(hatch.x, hatch.opening, HULL.cabinR), [hatch])
  const frame = useMemo(() => spokes(doorway.x, doorway.opening, HULL.cabinR, 8), [doorway])
  const ceiling = useMemo(ceilingSegments, [])
  const ceilingFill = useMemo(
    () => new THREE.PlaneGeometry(CEILING.x1 - CEILING.x0, ceilingHalfWidth() * 2).rotateX(Math.PI / 2).translate((CEILING.x0 + CEILING.x1) / 2, CEILING.y, 0),
    [],
  )

  return (
    <group>
      <Segs points={hull} opacity={0.3} />
      <Glow geo={deckFill} opacity={0.1} />
      <Segs points={deckLines} opacity={0.32} />

      {/* the cabin's ceiling; the vent duct lies on top of it (parts.tsx) */}
      <Glow geo={ceilingFill} opacity={0.07} />
      <Segs points={ceiling} opacity={0.4} />

      {/* door between the flight deck and the cabin (shut in this example), hatch between the cabin and the node */}
      <Segs points={frame} opacity={0.22} />
      {doorway.closed ? <ClosedDoor x={doorway.x} r={doorway.opening} /> : <Ring r={doorway.opening} tube={0.04} position={[doorway.x, AXIS_Y, 0]} rotation={FACE_X} line={0.5} />}
      <Segs points={bulkhead} opacity={0.22} />
      <Hatch x={hatch.x} r={hatch.opening} />

      {/* docking ring at the far end of the node */}
      <group position={[6.3, AXIS_Y, 0]}>
        <Ring r={hullRadius(6.3)} tube={0.07} rotation={FACE_X} />
        <Ring r={1.05} tube={0.035} position={[0.14, 0, 0]} rotation={FACE_X} line={0.6} />
        {[0, 1, 2].map((k) => {
          const a = (k / 3) * TAU + 0.5
          return <Box key={k} size={[0.3, 0.1, 0.3]} position={[0.12, 0.95 * Math.sin(a), 0.95 * Math.cos(a)]} rotation={[-a, 0, 0]} line={0.7} />
        })}
      </group>

      {exterior && <Exterior />}
    </group>
  )
}
