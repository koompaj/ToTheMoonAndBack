// OWNER: 3D workstream.
// The three burning samples, one per fuel class (docs/PLAN.md section 4):
//   gas     - a small round burner nozzle (ACME-style)
//   droplet - one droplet of liquid on a thin fibre (FLEX-style); it shrinks while it burns
//   solid   - a thin flat strip (BASS/SAFFIRE-style); a flame front creeps along it
// Shapes, sizes and speeds are drawing choices. Nothing here is measured or derived from data.
import { useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { FlameLight, FlameShell } from './FlameShell'
import { FlowStreaks } from './FlowStreaks'
import { loopFade, type FireState } from './state'

type S = MutableRefObject<FireState>

export const FUEL_FLAME_COLOR = {
  gas: '#6c5cff', // blue-violet
  droplet: '#3f7dff', // blue
  solid: '#4f8dff', // blue-tinged
} as const

// ---------------------------------------------------------------- gas

const NOZZLE_TOP = -0.62

export function GasBurner({ state }: { state: S }) {
  return (
    <group>
      <mesh position={[0, NOZZLE_TOP - 0.55, 0]}>
        <cylinderGeometry args={[0.11, 0.13, 1.1, 32]} />
        <meshStandardMaterial color="#8a93a3" metalness={0.65} roughness={0.35} />
      </mesh>
      <mesh position={[0, NOZZLE_TOP + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.05, 0.11, 32]} />
        <meshStandardMaterial color="#2a2f38" metalness={0.4} roughness={0.6} side={THREE.DoubleSide} />
      </mesh>
      <group position={[0, NOZZLE_TOP + 0.36, 0]}>
        <FlameShell state={state} cool={FUEL_FLAME_COLOR.gas} scale={[0.52, 0.52, 0.52]} />
      </group>
      <FlameLight state={state} cool={FUEL_FLAME_COLOR.gas} position={[0.2, NOZZLE_TOP + 0.5, 0.6]} />
      <FlowStreaks state={state} axis="x" />
    </group>
  )
}

// ---------------------------------------------------------------- droplet

const DROP_R0 = 0.13
/** Flame shell radius as a multiple of the droplet radius (drawn well clear of the droplet). */
const STANDOFF = 3.6
/** Seconds for one droplet to burn down at pace 1. */
const DROP_LOOP_S = 9

export function Droplet({ state }: { state: S }) {
  const phase = useRef(0.25)
  const fade = useRef(1)
  const drop = useRef<THREE.Mesh>(null)
  const flame = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    const { look, still } = state.current
    if (!still) phase.current = (phase.current + (Math.min(delta, 0.1) * look.pace) / DROP_LOOP_S) % 1
    const s = still ? 0.25 : phase.current
    // Diameter-squared falls linearly while it burns (the classic droplet picture), drawn to 20 %.
    const r = DROP_R0 * Math.sqrt(1 - 0.8 * s)
    fade.current = still ? 1 : loopFade(s)
    drop.current?.scale.setScalar(r)
    flame.current?.scale.setScalar((r * STANDOFF) / 0.42)
  })

  return (
    <group position={[0, -0.35, 0]}>
      {/* Two crossed support fibres. */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.007, 0.007, 4, 8]} />
        <meshStandardMaterial color="#9aa4b4" roughness={0.6} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.007, 0.007, 3, 8]} />
        <meshStandardMaterial color="#9aa4b4" roughness={0.6} />
      </mesh>
      <mesh ref={drop}>
        <sphereGeometry args={[1, 40, 28]} />
        <meshStandardMaterial color="#c9def7" roughness={0.08} metalness={0.05} transparent opacity={0.92} />
      </mesh>
      <group ref={flame}>
        <FlameShell state={state} cool={FUEL_FLAME_COLOR.droplet} scale={[0.42, 0.42, 0.42]} extraVis={fade} />
      </group>
      <FlameLight state={state} cool={FUEL_FLAME_COLOR.droplet} position={[0.3, 0.3, 0.6]} extraVis={fade} />
      <FlowStreaks state={state} axis="x" />
    </group>
  )
}

// ---------------------------------------------------------------- solid

const STRIP_W = 0.46
const STRIP_T = 0.025
const STRIP_BOTTOM = -1.45
const STRIP_TOP = 1.25
const FRONT_FROM = STRIP_BOTTOM + 0.12
const FRONT_TO = STRIP_TOP - 0.2
/** Seconds for the front to cross the strip at pace 1. */
const STRIP_LOOP_S = 14

export function SolidStrip({ state }: { state: S }) {
  const phase = useRef(0.35)
  const fade = useRef(1)
  const char = useRef<THREE.Mesh>(null)
  const ember = useRef<THREE.Mesh>(null)
  const front = useRef<THREE.Group>(null)
  const light = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    const { look, still } = state.current
    if (!still) phase.current = (phase.current + (Math.min(delta, 0.1) * look.pace) / STRIP_LOOP_S) % 1
    const s = still ? 0.35 : phase.current
    const y = FRONT_FROM + s * (FRONT_TO - FRONT_FROM)
    fade.current = still ? 1 : loopFade(s)
    const charH = Math.max(0.001, y - STRIP_BOTTOM)
    if (char.current) {
      char.current.scale.y = charH
      char.current.position.y = STRIP_BOTTOM + charH / 2
    }
    if (ember.current) {
      ember.current.position.y = y
      ;(ember.current.material as THREE.MeshBasicMaterial).opacity = 0.85 * fade.current * Math.min(1, state.current.vis + 0.25)
    }
    front.current?.position.set(0, y, 0)
    light.current?.position.set(0, y + 0.2, 0)
  })

  return (
    <group rotation={[0, 0.45, 0]}>
      {/* The sample, held top and bottom. Air (if any) comes from above, against the spread. */}
      <mesh position={[0, (STRIP_BOTTOM + STRIP_TOP) / 2, 0]}>
        <boxGeometry args={[STRIP_W, STRIP_TOP - STRIP_BOTTOM, STRIP_T]} />
        <meshStandardMaterial color="#a99d84" roughness={0.95} />
      </mesh>
      <mesh ref={char}>
        <boxGeometry args={[STRIP_W + 0.004, 1, STRIP_T + 0.006]} />
        <meshStandardMaterial color="#231d1a" roughness={1} />
      </mesh>
      <mesh ref={ember}>
        <boxGeometry args={[STRIP_W + 0.008, 0.025, STRIP_T + 0.01]} />
        <meshBasicMaterial color="#ff7a2e" transparent opacity={0.85} />
      </mesh>
      {[STRIP_BOTTOM, STRIP_TOP].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <boxGeometry args={[STRIP_W + 0.18, 0.1, 0.12]} />
          <meshStandardMaterial color="#3a404c" metalness={0.5} roughness={0.5} />
        </mesh>
      ))}
      <group ref={front}>
        <FlameShell
          state={state}
          cool={FUEL_FLAME_COLOR.solid}
          up={[0, 1, 0]}
          flow={[0, -1, 0]}
          scale={[0.34, 0.24, 0.26]}
          extraVis={fade}
        />
      </group>
      <group ref={light}>
        <FlameLight state={state} cool={FUEL_FLAME_COLOR.solid} position={[0, 0, 0.9]} extraVis={fade} strength={1.1} />
      </group>
      <FlowStreaks state={state} axis="-y" span={3.2} spread={[0.9, 0.5]} />
    </group>
  )
}
