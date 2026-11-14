// OWNER: 3D workstream.
// The fire model on the fire page (docs/PLAN.md section 4): one small burning sample of the chosen
// fuel that responds to oxygen, pressure, airflow, gravity and to what the nearest real tests did.
//
// AN ILLUSTRATION, NOT A SIMULATION. Every visual mapping is a drawing choice (see fire/look.ts);
// no number is derived from the picture and nothing here is physics. The component draws its own
// "Illustration, not a simulation" label (class flame-label); C's fire stage hides it because the
// stage shows the same label itself.
//
// Controlled: it draws from props only and keeps no copy of the fire point.
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { ExpectedBehaviour, FireModelProps, FireParams } from '../types/sim'
import { easeLook, lookFor, pulseLevel, type FlameLook } from './fire/look'
import { useReducedMotion, type FireState } from './fire/state'
import { Droplet, FUEL_FLAME_COLOR, GasBurner, SolidStrip } from './fire/Samples'
import './scene.css'

/** Writes the eased look, clock and pulse into the shared state once per frame. */
function FireDriver({ target, state, still }: { target: MutableRefObject<FlameLook>; state: MutableRefObject<FireState>; still: boolean }) {
  useFrame((_, delta) => {
    const s = state.current
    const dt = Math.min(delta, 0.1)
    s.still = still
    if (!still) s.t += dt
    easeLook(s.look, target.current, dt)
    // Under reduced motion a "went out" flame stays lit but dim instead of pulsing.
    s.vis = s.look.pulse ? (still ? 0.55 : pulseLevel(s.t)) : 1
  })
  return null
}

/**
 * Opaque backdrop drawn inside the canvas (same gradient as the stage). The flame uses additive
 * blending; over a see-through canvas its alpha would darken the page behind it into a grey halo.
 */
function Backdrop() {
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 256
    const ctx = c.getContext('2d')
    if (!ctx) return
    const g = ctx.createRadialGradient(128, 154, 0, 128, 154, 180)
    g.addColorStop(0, '#1d2333')
    g.addColorStop(1, '#0b0f17')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 256, 256)
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    scene.background = tex
    return () => {
      scene.background = null
      tex.dispose()
    }
  }, [scene])
  return null
}

const GRAVITY_WORD = (g: number) => (g <= 0 ? 'microgravity' : g >= 1 ? 'Earth gravity' : `${Math.round(g * 100)} % of Earth gravity`)
const BEHAVIOUR_WORD: Record<ExpectedBehaviour, string> = {
  'kept-burning': 'steady, because the nearest real tests kept burning',
  'went-out': 'pulsing out and relighting, because the nearest real tests went out',
  mixed: 'dimmed, because the nearest real tests had mixed endings',
  unknown: 'dimmed, because the nearest real tests do not record an ending',
}

function describe(p: FireParams, b: ExpectedBehaviour) {
  return (
    `Illustration, not a simulation: a ${p.fuel} flame in ${GRAVITY_WORD(p.gravity)}, ` +
    `${p.airflowCmS > 0 ? 'with air flowing past' : 'in still air'}, drawn ${BEHAVIOUR_WORD[b]}.`
  )
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

/** Still picture for browsers without WebGL: never a blank box. */
function FlameFallback({ params }: { params: FireParams }) {
  const g = Math.min(1, Math.max(0, params.gravity))
  const top = 18 - 12 * g // the tip rises with gravity
  const cool = FUEL_FLAME_COLOR[params.fuel]
  const d = `M50 ${top} C ${68 - 4 * g} ${40 - 8 * g}, 72 62, 50 78 C 28 62, ${32 + 4 * g} ${40 - 8 * g}, 50 ${top} Z`
  return (
    <svg className="fire-b-fallback" viewBox="0 0 100 100" aria-hidden>
      <defs>
        <linearGradient id="fire-b-fb" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={cool} />
          <stop offset={0.35 + 0.3 * (1 - g)} stopColor={cool} />
          <stop offset="1" stopColor={g > 0.3 ? '#ffae3b' : cool} />
        </linearGradient>
      </defs>
      <path d={d} fill="url(#fire-b-fb)" opacity={0.85} />
    </svg>
  )
}

export function FireModel3D({ params, behaviour }: FireModelProps) {
  const still = useReducedMotion()
  const webgl = useMemo(hasWebGL, [])
  const look = lookFor(params, behaviour)
  const target = useRef(look)
  target.current = look
  // Start at the props' look so the first frame does not fade in from nothing.
  const state = useRef<FireState>({ look: { ...look }, vis: 1, t: 0, still })
  const label = describe(params, behaviour)

  return (
    <div className="flame fire-b" role="img" aria-label={label}>
      {webgl ? (
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [0, 0.3, 5.6], fov: 41 }}
          gl={{ antialias: true }}
          fallback={<FlameFallback params={params} />}
        >
          <Backdrop />
          <ambientLight intensity={0.35} />
          <directionalLight position={[2, 3, 4]} intensity={0.6} />
          <FireDriver target={target} state={state} still={still} />
          {params.fuel === 'gas' && <GasBurner state={state} />}
          {params.fuel === 'droplet' && <Droplet state={state} />}
          {params.fuel === 'solid' && <SolidStrip state={state} />}
        </Canvas>
      ) : (
        <FlameFallback params={params} />
      )}
      <div className="flame-label">Illustration, not a simulation</div>
    </div>
  )
}
