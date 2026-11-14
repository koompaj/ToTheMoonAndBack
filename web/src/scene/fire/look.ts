// OWNER: 3D workstream.
// Maps the fire page's controls to how the flame is DRAWN.
//
// EVERY MAPPING IN THIS FILE IS A DRAWING CHOICE, NOT PHYSICS AND NOT DATA.
// The numbers below only decide brightness, size, colour and shape on screen, so that moving a
// slider changes the picture in the direction the spec describes (docs/PLAN.md section 4). None of
// them is a flammability limit, a flame speed or anything measured, and nothing here may ever be
// shown to the user as a number. The fire is an illustration, not a simulation.
import type { ExpectedBehaviour, FireParams } from '../../types/sim'

export interface FlameLook {
  /** Overall brightness multiplier, about 0.15 (faint) to 1.3. */
  brightness: number
  /** Size multiplier of the flame body. */
  size: number
  /** 0 = blue (microgravity look), 1 = yellow-orange (sooty, buoyant look). */
  warmth: number
  /** 0..1, how white-hot the core looks (more oxygen). */
  whiteness: number
  /** Stretch upward from buoyancy (gravity). */
  buoyancy: number
  /** Stretch downstream from airflow. */
  drift: number
  /** 0..1 flicker strength (buoyant flames flicker, microgravity flames do not). */
  flicker: number
  /** 0..1 edge softness (low pressure = more diffuse). */
  softness: number
  /** Relative speed of anything that moves over time (solid front, droplet shrinking). */
  pace: number
  /** True when the nearest real tests went out: the flame pulses, fades and relights. */
  pulse: boolean
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a))
  return t * t * (3 - 2 * t)
}

/** The airflow slider runs 0..50 cm/s; the picture saturates at its top. */
const AIRFLOW_FULL_CMS = 50

export function lookFor(params: FireParams, behaviour: ExpectedBehaviour): FlameLook {
  const o2 = Number.isFinite(params.o2Fraction) ? params.o2Fraction : 0.21
  const p = Number.isFinite(params.pressureAtm) && params.pressureAtm > 0 ? params.pressureAtm : 1
  const g = clamp01(Number.isFinite(params.gravity) ? params.gravity : 0)
  const air = clamp01((Number.isFinite(params.airflowCmS) ? params.airflowCmS : 0) / AIRFLOW_FULL_CMS)

  // Oxygen: faint near the bottom of the slider, then brighter, larger and whiter as it rises.
  const o2Cue = smoothstep(0.12, 0.4, o2) // 0 around 12 %, 1 from about 40 %
  const o2Top = smoothstep(0.45, 1.0, o2) // extra push towards pure oxygen

  // Pressure: below 1 atm a little larger, dimmer and softer; above 1 atm a little tighter.
  // log2 keeps the effect small and symmetric (0.25 atm -> +1, 4 atm -> -1).
  const pCue = Math.max(-1, Math.min(1, -Math.log2(p) / 2))

  let brightness = (0.26 + 0.84 * o2Cue + 0.3 * o2Top) * (1 - 0.15 * pCue)
  if (behaviour === 'mixed' || behaviour === 'unknown') brightness *= 0.7

  return {
    brightness,
    size: (0.75 + 0.3 * o2Cue + 0.15 * o2Top) * (1 + 0.12 * pCue),
    warmth: clamp01(0.85 * g + 0.35 * air),
    whiteness: clamp01(0.6 * o2Top + 0.25 * o2Cue * g),
    buoyancy: 2.2 * g,
    drift: 1.3 * air,
    flicker: g,
    softness: clamp01(0.35 + 0.35 * pCue),
    pace: (0.4 + 0.8 * o2Cue) * (1 + 1.5 * g) * (1 + 0.8 * air),
    pulse: behaviour === 'went-out',
  }
}

/** Numeric fields of FlameLook, eased each frame so slider moves look smooth. */
export const EASED_KEYS = [
  'brightness',
  'size',
  'warmth',
  'whiteness',
  'buoyancy',
  'drift',
  'flicker',
  'softness',
  'pace',
] as const satisfies readonly (keyof FlameLook)[]

/** Moves `current` towards `target` in place; settles in about 0.3 s. No allocation. */
export function easeLook(current: FlameLook, target: FlameLook, dt: number) {
  const k = 1 - Math.exp(-dt / 0.09)
  for (const key of EASED_KEYS) current[key] += (target[key] - current[key]) * k
  current.pulse = target.pulse
}

/**
 * Visibility of a flame whose nearest tests went out: burn, fade, stay dark, relight.
 * A 4.5 s loop. Returns 0..1. Drawing choice only, not an extinction time.
 */
export function pulseLevel(t: number) {
  const c = t % 4.5
  if (c < 2.6) return 1
  if (c < 3.4) return 1 - smoothstep(2.6, 3.4, c)
  if (c < 3.8) return 0
  return smoothstep(3.8, 4.5, c)
}
