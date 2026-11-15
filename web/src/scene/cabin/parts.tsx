// OWNER: 3D workstream. The kit of parts the sample spacecraft is furnished with. Each part is a
// handful of wireframe primitives, drawn around its own origin on the deck. Example furniture,
// not NASA hardware: shapes are for recognition only.
import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Box, Cyl, Glow, HOLO, Holo, Ring, Segs, ballGeo, type Vec3 } from './holo'
import { Label } from '../Label'
import { AXIS_Y, BULKHEADS, CEILING, DUCT, GRILLE, HULL, OUTLET, VENTS, type CabinItem } from './spec'

export interface PartLook {
  color: string
  line: number
  fill: number
}

type PartProps = { item: CabinItem; look: PartLook }

const TAU = Math.PI * 2

function Seats({ item, look }: PartProps) {
  const z = item.d / 2 - 0.4
  return (
    <>
      {[-z, z].map((sz) => (
        <group key={sz} position={[0, 0, sz]}>
          <Cyl r={0.08} h={0.4} position={[0, 0.2, 0]} {...look} />
          <Box size={[0.55, 0.12, 0.55]} position={[0, 0.46, 0]} {...look} />
          <Box size={[0.12, 0.75, 0.55]} position={[0.27, 0.86, 0]} rotation={[0, 0, -0.14]} {...look} />
          <Box size={[0.1, 0.2, 0.3]} position={[0.33, 1.3, 0]} {...look} />
        </group>
      ))}
    </>
  )
}

function Console({ item, look }: PartProps) {
  return (
    <>
      <Box size={[item.w, 0.7, item.d]} position={[0, 0.35, 0]} {...look} />
      <Box size={[0.42, 0.04, item.d * 0.94]} position={[0.02, 0.79, 0]} rotation={[0, 0, 0.45]} {...look} />
      {[-0.42, 0, 0.42].map((z) => (
        <Box key={z} size={[0.03, 0.22, 0.34]} position={[-0.1, 0.98, z]} rotation={[0, 0, 0.2]} {...look} fill={0.25} />
      ))}
    </>
  )
}

/** The window dome that closes the flight deck: three rings and twelve ribs. */
const DOME_LINES = (() => {
  const R = HULL.domeR
  const pts: number[] = []
  const at = (lat: number, a: number) => [-R * Math.sin(lat), R * Math.cos(lat) * Math.sin(a), R * Math.cos(lat) * Math.cos(a)]
  for (const lat of [0.52, 1.05]) for (let i = 0; i < 36; i++) pts.push(...at(lat, (i / 36) * TAU), ...at(lat, ((i + 1) / 36) * TAU))
  for (let k = 0; k < 12; k++) for (let j = 0; j < 6; j++) pts.push(...at((j / 6) * (Math.PI / 2), (k / 12) * TAU), ...at(((j + 1) / 6) * (Math.PI / 2), (k / 12) * TAU))
  return pts
})()

function Windows({ item, look }: PartProps) {
  const dome = useMemo(() => new THREE.SphereGeometry(HULL.domeR, 24, 10, 0, TAU, 0, Math.PI / 2).rotateZ(Math.PI / 2), [])
  const offset: Vec3 = [HULL.domeX - item.x, AXIS_Y, 0]
  return (
    <group position={offset}>
      <Segs points={DOME_LINES} color={look.color} opacity={look.line} />
      <Glow geo={dome} color={look.color} opacity={look.fill * 1.4} />
    </group>
  )
}

function Rack({ item, look }: PartProps) {
  const { w, d, h } = item
  return (
    <>
      <Box size={[w, h, d]} position={[0, h / 2, 0]} {...look} />
      {[0.25, 0.5, 0.75].map((k) => (
        <Box key={k} size={[w * 0.92, 0.02, d * 0.9]} position={[0, h * k, 0]} {...look} line={look.line * 0.6} fill={0} />
      ))}
      {[0.125, 0.375, 0.625, 0.875].map((k) => (
        <Box key={k} size={[w * 0.8, h * 0.17, 0.03]} position={[0, h * k, d / 2 + 0.02]} {...look} fill={look.fill * 2} />
      ))}
    </>
  )
}

function Table({ item, look }: PartProps) {
  return (
    <>
      <Box size={[item.w, 0.06, item.d]} position={[0, item.h, 0]} {...look} />
      <Cyl r={0.12} h={item.h - 0.03} position={[0, (item.h - 0.03) / 2, 0]} {...look} />
      <Cyl r={0.4} h={0.04} position={[0, 0.02, 0]} {...look} />
    </>
  )
}

/** Marker above a small item, so a point on the plan is easy to find and to click. */
function Pin({ from, look }: { from: number; look: PartLook }) {
  const points = useMemo(() => [0, from, 0, 0, from + 0.55, 0], [from])
  return (
    <>
      <Segs points={points} color={look.color} opacity={look.line} />
      <Holo geo={ballGeo(0.09)} position={[0, from + 0.64, 0]} color={look.color} line={look.line} fill={0.5} />
    </>
  )
}

function Bottle({ look }: PartProps) {
  return (
    <>
      <Cyl r={0.09} h={0.24} position={[0, 0.12, 0]} {...look} />
      <Cyl r={0.035} h={0.08} position={[0, 0.28, 0]} {...look} />
      <Pin from={0.32} look={look} />
    </>
  )
}

function CableTray({ item, look }: PartProps) {
  const covers = Math.floor(item.w / 0.4)
  return (
    <>
      <Box size={[item.w, 0.1, item.d]} position={[0, 0.05, 0]} {...look} />
      {Array.from({ length: covers }, (_, k) => (
        <Box key={k} size={[0.34, 0.05, item.d * 1.08]} position={[-item.w / 2 + 0.2 + k * 0.4, 0.125, 0]} {...look} fill={look.fill * 2} />
      ))}
    </>
  )
}

function Bunks({ item, look }: PartProps) {
  const { w, d, h } = item
  const front = d / 2
  const pleats = useMemo(() => {
    const pts: number[] = []
    for (let x = -w / 2; x <= w / 2 + 1e-6; x += 0.16) pts.push(x, 0.08, front, x, h - 0.08, front)
    pts.push(-w / 2, h - 0.08, front, w / 2, h - 0.08, front, -w / 2, 0.08, front, w / 2, 0.08, front)
    return pts
  }, [w, h, front])
  const curtain = useMemo(() => new THREE.PlaneGeometry(w, h - 0.16), [w, h])
  return (
    <>
      {[0.42, 1.42].map((y) => (
        <Box key={y} size={[w * 0.96, 0.22, d * 0.8]} position={[0, y, -d * 0.08]} {...look} line={look.line * 0.7} />
      ))}
      {[-1, 1].map((s) => (
        <Box key={s} size={[0.05, h, d * 0.86]} position={[(s * w) / 2, h / 2, -d * 0.06]} {...look} line={look.line * 0.6} fill={0} />
      ))}
      {/* the fabric: a curtain across the open side */}
      <Segs points={pleats} color={look.color} opacity={look.line} />
      <Glow geo={curtain} color={look.color} opacity={look.fill * 1.6} position={[0, h / 2, front]} />
    </>
  )
}

function Bags({ item, look }: PartProps) {
  const sizes: Vec3[] = [
    [0.55, 0.5, 0.55],
    [0.5, 0.38, 0.6],
    [0.55, 0.45, 0.5],
  ]
  return (
    <>
      {sizes.map((s, k) => (
        <group key={k} position={[-item.w / 2 + 0.3 + k * 0.6, s[1] / 2, 0]} rotation={[0, (k - 1) * 0.12, 0]}>
          <Box size={s} {...look} />
          <Box size={[s[0] * 1.02, 0.03, 0.08]} position={[0, s[1] / 2, 0]} {...look} fill={0} />
        </group>
      ))}
    </>
  )
}

function Wiring({ item, look }: PartProps) {
  const wires = useMemo(() => {
    const pts: number[] = []
    for (let k = 0; k < 6; k++) {
      const z = -item.d / 2 + 0.1 + (k * (item.d - 0.2)) / 5
      let px = 0
      let py = 0.05
      for (let j = 1; j <= 8; j++) {
        const y = 0.05 + (j / 8) * (item.h - 0.1)
        const x = 0.03 * Math.sin(j * 1.7 + k)
        pts.push(px, py, z, x, y, z)
        px = x
        py = y
      }
    }
    return pts
  }, [item.d, item.h])
  return (
    <>
      <Box size={[0.08, item.h, item.d]} position={[item.w / 2 - 0.04, item.h / 2, 0]} {...look} />
      <Segs points={wires} color={look.color} opacity={look.line} position={[item.w / 2 - 0.14, 0, 0]} />
      <Box size={[0.2, 0.25, item.d * 0.5]} position={[item.w / 2 - 0.16, item.h * 0.55, 0]} {...look} />
    </>
  )
}

function GasBottle({ item, look }: PartProps) {
  const body = item.h - 0.25
  return (
    <>
      <Cyl r={0.2} h={body} position={[0, body / 2, 0]} {...look} />
      <Holo geo={ballGeo(0.2)} position={[0, body, 0]} scale={[1, 0.6, 1]} {...look} />
      <Cyl r={0.05} h={0.14} position={[0, body + 0.18, 0]} {...look} />
      <Ring r={0.23} tube={0.02} position={[0, body * 0.55, 0]} rotation={[Math.PI / 2, 0, 0]} color={look.color} line={look.line * 0.7} />
      <Pin from={item.h} look={look} />
    </>
  )
}

/** A pipe hugging the node's wall, with a valve where the mark sits. */
function GasLine({ item, look }: PartProps) {
  const pipe = useMemo(() => {
    const pts: number[] = []
    const cx = HULL.nodeX - item.x
    const cz = -item.z
    const r = Math.hypot(cx, cz)
    const a0 = Math.atan2(-cz, -cx)
    for (let j = 0; j < 14; j++) {
      const a = a0 - 0.9 + (j / 14) * 1.8
      const b = a0 - 0.9 + ((j + 1) / 14) * 1.8
      pts.push(cx + r * Math.cos(a), 0.9, cz + r * Math.sin(a), cx + r * Math.cos(b), 0.9, cz + r * Math.sin(b))
    }
    pts.push(0, 0, 0, 0, 0.9, 0)
    return pts
  }, [item.x, item.z])
  return (
    <>
      <Segs points={pipe} color={look.color} opacity={look.line} />
      <Ring r={0.12} tube={0.025} position={[0, 0.9, 0]} color={look.color} line={look.line} />
      <Cyl r={0.05} h={0.16} position={[0, 0.9, 0]} rotation={[Math.PI / 2, 0, 0]} {...look} />
      <Pin from={item.h} look={look} />
    </>
  )
}

function Locker({ item, look }: PartProps) {
  const { w, d, h } = item
  return (
    <>
      <Box size={[w, h, d]} position={[0, h / 2, 0]} {...look} />
      <Box size={[w * 0.44, h * 0.9, 0.02]} position={[-w * 0.24, h / 2, d / 2 + 0.015]} {...look} fill={look.fill * 2} />
      <Box size={[w * 0.44, h * 0.9, 0.02]} position={[w * 0.24, h / 2, d / 2 + 0.015]} {...look} fill={look.fill * 2} />
    </>
  )
}

const PART: Record<CabinItem['kind'], (p: PartProps) => ReactNode> = {
  seats: Seats,
  console: Console,
  windows: Windows,
  rack: Rack,
  table: Table,
  bottle: Bottle,
  cableTray: CableTray,
  bunks: Bunks,
  bags: Bags,
  wiring: Wiring,
  gasBottle: GasBottle,
  gasLine: GasLine,
  locker: Locker,
}

export function Part(props: PartProps) {
  const Draw = PART[props.item.kind]
  return <Draw {...props} />
}

// ---- cabin systems: detail only, never fuel, always in the base hologram colour ----

const DIM = { color: HOLO, line: 0.45, fill: 0.04 }

function Fan({ still }: { still: boolean }) {
  const blades = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (!still && blades.current) blades.current.rotation.x += Math.min(dt, 0.1) * 2.2
  })
  return (
    <group position={[VENTS.fan, CEILING.y + DUCT.height / 2, 0]}>
      <Ring r={0.19} tube={0.025} rotation={[0, Math.PI / 2, 0]} line={0.7} />
      <group ref={blades}>
        {[0, 1, 2, 3].map((k) => (
          <Box key={k} size={[0.02, 0.17, 0.07]} position={[0, 0.09 * Math.cos((k * TAU) / 4), 0.09 * Math.sin((k * TAU) / 4)]} rotation={[(k * TAU) / 4, 0, 0]} {...DIM} line={0.7} />
        ))}
      </group>
    </group>
  )
}

const SLATS = [-0.24, -0.12, 0, 0.12, 0.24].flatMap((x) => [x, 0, -0.18, x, 0, 0.18])

/** Vent duct above the ceiling with its fan, the grilles that open into it (two in the cabin's
 *  ceiling, one under its end inside the closed flight deck), lights, smoke detectors,
 *  extinguisher, handrails. */
export function Systems({ still, showLabel = false }: { still: boolean; showLabel?: boolean }) {
  const ductMid = (DUCT.x0 + DUCT.x1) / 2
  return (
    <group>
      <Box size={[DUCT.x1 - DUCT.x0, DUCT.height, DUCT.halfWidth * 2]} position={[ductMid, CEILING.y + DUCT.height / 2, 0]} color={HOLO} line={0.75} fill={0.05} />
      <Fan still={still} />
      {showLabel && <Label text="Vent duct" position={[ductMid, CEILING.y + DUCT.height + 0.4, 0]} color="#9fdcff" height={0.3} />}
      {VENTS.grilles.map((x) => (
        <group key={x} position={[x, CEILING.y, 0]}>
          <Box size={[GRILLE.along, 0.03, GRILLE.across]} color="#dff4ff" line={0.9} fill={0.12} />
          <Segs points={SLATS} opacity={0.7} position={[0, -0.02, 0]} />
        </group>
      ))}
      {/* the same grille, shortened, under the end of the duct inside the flight deck */}
      <group position={[OUTLET.x, CEILING.y, 0]} scale={[OUTLET.along / GRILLE.along, 1, 1]}>
        <Box size={[GRILLE.along, 0.03, GRILLE.across]} color="#dff4ff" line={0.9} fill={0.2} />
        <Segs points={SLATS} opacity={0.7} position={[0, -0.02, 0]} />
      </group>
      {showLabel && <Label text="Vent into flight deck" position={[OUTLET.x - 0.5, CEILING.y - 0.35, 0]} color="#9fdcff" height={0.24} />}
      {showLabel &&
        BULKHEADS.filter((b) => b.closed).map((b) => <Label key={b.x} text="Closed door" position={[b.x, AXIS_Y + 0.35, 1.75]} color="#dff4ff" height={0.3} />)}
      {[-1.05, 1.05].map((z) => (
        <Box key={z} size={[5.6, 0.04, 0.1]} position={[-0.4, CEILING.y - 0.05, z]} color="#dff4ff" line={0.7} fill={0.35} />
      ))}
      {[
        [-1.1, -0.45],
        [1.5, 0.45],
      ].map(([x, z]) => (
        <group key={x} position={[x, CEILING.y - 0.04, z]}>
          <Cyl r={0.12} h={0.06} {...DIM} line={0.7} />
          <Holo geo={ballGeo(0.03)} position={[0, -0.05, 0]} color="#dff4ff" fill={0.8} />
        </group>
      ))}
      <group position={[2.68, 0.75, -1.5]}>
        <Cyl r={0.09} h={0.42} {...DIM} line={0.7} />
        <Cyl r={0.03} h={0.1} position={[0, 0.26, 0]} {...DIM} line={0.7} />
      </group>
      <Box size={[5.6, 0.04, 0.04]} position={[-0.4, 1.15, 2.26]} {...DIM} />
      {[-1.2, 1.2].map((z) => (
        <Box key={z} size={[0.04, 1.1, 0.04]} position={[2.7, 1.1, z]} {...DIM} />
      ))}
    </group>
  )
}
