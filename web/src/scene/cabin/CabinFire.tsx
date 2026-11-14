// OWNER: 3D workstream. The fire inside the sample spacecraft after "Simulate": a flame where the
// fire starts, then a glow and a flame on each fuel item as the timeline reaches it.
//
// AN ILLUSTRATION, NOT A SIMULATION, AND THE SPREAD IS NOT A PREDICTION (CLAUDE.md, "Spread is an
// illustration, never a result"). The order comes from timeline.ts (distance in the example layout
// only). The flame reuses the fire page's drawing (fire/look.ts): every mapping is a drawing
// choice. Nothing here reads or changes evidence. Goes inside a react-three-fiber <Canvas>.
import { useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { FuelClass } from '../../types/data'
import type { ExpectedBehaviour, FireParams, StageFire } from '../../types/sim'
import { Label } from '../Label'
import { FlameShell } from '../fire/FlameShell'
import { FUEL_FLAME_COLOR } from '../fire/Samples'
import { easeLook, lookFor, pulseLevel, type FlameLook } from '../fire/look'
import { useReducedMotion, type FireState } from '../fire/state'
import { ReachField } from './ReachField'
import { itemsAt, litAmount, type SpreadBias, type SpreadEntry, type SpreadPlan } from './timeline'

/** The timeline's moving parts, shared with the controls outside the canvas. */
export interface SpreadClock {
  /** Position on the timeline in steps (fractions are the lighting-up in between). */
  t: number
  playing: boolean
  /** Playback multiplier for the animation. Not a physical speed. */
  rate: number
  /** The position last reported to the controls. */
  shown: number
}

/** How long the animation spends on one step at 1x. A pacing choice for the eye, not a duration
 *  of anything real, and never shown. */
const SECONDS_PER_STEP = 1.3

/** Used only when the page gives "near a vent" without a speed: how far the drawn flame leans
 *  (the airflow slider tops out at 50). */
const VENT_LEAN = 25

const GLOW = '#ff7a2f'
const noRaycast = () => null
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

function drive(state: FireState, target: FlameLook, dt: number, still: boolean) {
  state.still = still
  if (!still) state.t += dt
  easeLook(state.look, target, dt)
  state.vis = state.look.pulse ? (still ? 0.55 : pulseLevel(state.t)) : 1
}

function ItemBurn({ entry, from, plan, clock, state }: { entry: SpreadEntry; from: [number, number, number]; plan: SpreadPlan; clock: MutableRefObject<SpreadClock>; state: MutableRefObject<FireState> }) {
  const { item, step } = entry
  const base = item.y ?? 0
  const top = base + Math.min(item.h, 1) * 0.6
  const vis = useRef(0)
  const glow = useRef<THREE.MeshBasicMaterial>(null)
  const linkMaterial = useRef<THREE.LineBasicMaterial>(null)
  const link = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute([from[0], from[1] + 0.2, from[2], from[0], from[1] + 0.2, from[2]], 3))
    return g
  }, [from[0], from[1], from[2]])

  useFrame(() => {
    const a = litAmount(step, itemsAt(plan, clock.current.t))
    vis.current = a
    const s = state.current
    if (glow.current) glow.current.opacity = 0.22 * a * (s.still ? 1 : 0.8 + 0.2 * Math.sin(s.t * 5 + step))
    if (step > 0) {
      // a line from where the fire started, growing as this item lights
      const p = link.attributes.position as THREE.BufferAttribute
      p.setXYZ(1, from[0] + (item.x - from[0]) * a, from[1] + 0.2 + (top - from[1] - 0.2) * a, from[2] + (item.z - from[2]) * a)
      p.needsUpdate = true
      if (linkMaterial.current) linkMaterial.current.opacity = a > 0 ? 0.5 : 0
    }
  })

  return (
    <>
      <mesh position={[item.x, base + item.h / 2, item.z]} raycast={noRaycast}>
        <boxGeometry args={[Math.max(item.w, 0.3), item.h, Math.max(item.d, 0.3)]} />
        <meshBasicMaterial ref={glow} color={GLOW} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <group position={[item.x, top + 0.15, item.z]}>
        <FlameShell state={state} cool={FUEL_FLAME_COLOR[item.fuel!.fuel_class]} scale={[clamp(item.w * 0.35, 0.25, 0.9), 0.3, clamp(item.d * 0.35, 0.25, 0.6)]} extraVis={vis} />
      </group>
      {step > 0 && (
        <lineSegments geometry={link} raycast={noRaycast}>
          <lineBasicMaterial ref={linkMaterial} color="#ffb347" transparent opacity={0} />
        </lineSegments>
      )}
    </>
  )
}

export interface CabinFireProps {
  /** Where the fire starts, in scene units. */
  position: [number, number, number]
  fuel: FuelClass
  /** The place's air, the airflow choice and what the nearest tests did; null = neutral look. */
  fire: StageFire | null | undefined
  /** Which items light, and at which step. Empty on an uploaded plan. */
  plan: SpreadPlan
  clock: MutableRefObject<SpreadClock>
  /** How the user's spread settings bend the drawing; the cloud leans the same way as the order. */
  bias: SpreadBias
  /** Draw the coloured cloud that shows how far the spread has reached. */
  field: boolean
  /** Items the user has hidden. They stay in the order, but no glow or flame is drawn on them. */
  hiddenIds?: ReadonlySet<string>
  /** Called a few times a second with the timeline position, for the controls. */
  onShow: (t: number) => void
  /** Called once when the timeline reaches its last step. */
  onEnd: () => void
}

export function CabinFire({ position, fuel, fire, plan, bias, clock, field, hiddenIds, onShow, onEnd }: CabinFireProps) {
  const still = useReducedMotion()
  const params: FireParams = {
    fuel,
    o2Fraction: fire?.o2Fraction ?? 0.21,
    pressureAtm: fire?.pressureAtm ?? 1,
    airflowCmS: fire?.airflowCmS ?? (fire?.airflow === 'vent' ? VENT_LEAN : 0),
    gravity: fire?.gravity ?? 0, // 0 unless the user set it: every PSI test ran in microgravity
  }
  const behaviour: ExpectedBehaviour = fire?.behaviour ?? 'unknown'
  // Where the fire starts, the flame follows what the nearest real tests of that material did.
  // The items it reaches make no such claim: they are drawn steady and dimmed ("unknown").
  const startLook = lookFor(params, behaviour)
  const reachLook = lookFor(params, 'unknown')
  const startTarget = useRef(startLook)
  const reachTarget = useRef(reachLook)
  startTarget.current = startLook
  reachTarget.current = reachLook
  const start = useRef<FireState>({ look: { ...startLook }, vis: 1, t: 0, still })
  const reach = useRef<FireState>({ look: { ...reachLook }, vis: 1, t: 0, still })
  const ring = useRef<THREE.Mesh>(null)

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1)
    drive(start.current, startTarget.current, dt, still)
    drive(reach.current, reachTarget.current, dt, still)

    const c = clock.current
    if (c.playing && plan.steps > 0) {
      c.t = Math.min(plan.steps, c.t + (dt * c.rate) / SECONDS_PER_STEP)
      if (c.t >= plan.steps) {
        c.playing = false
        onEnd()
      }
    }
    if (Math.abs(c.t - c.shown) > 0.04 || (c.t !== c.shown && (c.t === 0 || c.t >= plan.steps))) {
      c.shown = c.t
      onShow(c.t)
    }

    if (ring.current && !still) {
      const k = (start.current.t * 0.8) % 1
      ring.current.scale.setScalar(0.4 + k * 2.6)
      ;(ring.current.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - k)
    }
  })

  return (
    <group>
      <group position={position}>
        <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} raycast={noRaycast}>
          <ringGeometry args={[0.3, 0.38, 48]} />
          <meshBasicMaterial color={GLOW} transparent opacity={0.6} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0.4, 0]} raycast={noRaycast}>
          <sphereGeometry args={[0.55, 24, 24]} />
          <meshBasicMaterial color={GLOW} transparent opacity={0.12} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
        <group position={[0, 0.4, 0]}>
          <FlameShell state={start} cool={FUEL_FLAME_COLOR[fuel]} scale={[0.42, 0.42, 0.42]} />
        </group>
        <Label text="Fire starts here · illustration" position={[0, 1.35, 0]} color="#ffd9a0" height={0.32} />
      </group>
      {field && plan.entries.length > 0 && <ReachField start={position} plan={plan} bias={bias} clock={clock} still={still} />}
      {plan.entries
        .filter((entry) => !hiddenIds?.has(entry.item.id))
        .map((entry) => (
        <ItemBurn key={entry.item.id} entry={entry} from={position} plan={plan} clock={clock} state={reach} />
      ))}
    </group>
  )
}
