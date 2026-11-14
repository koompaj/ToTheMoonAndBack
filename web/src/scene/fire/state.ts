// OWNER: 3D workstream.
// The one mutable object the fire scene shares between its parts. It is written once per frame
// by <FireDriver> and read by the flame shells and the samples, so nothing allocates per frame.
import { useEffect, useState } from 'react'
import type { FlameLook } from './look'

export interface FireState {
  /** The eased look (moves towards the props' look over about 0.3 s). */
  look: FlameLook
  /** 0..1 visibility from the "went out" pulse (1 when steady). */
  vis: number
  /** Animation clock in seconds; stands still under prefers-reduced-motion. */
  t: number
  /** True under prefers-reduced-motion: no flicker, pulse, shrinking or creeping. */
  still: boolean
}

/** Follows the user's prefers-reduced-motion setting, live. */
export function useReducedMotion() {
  const query = '(prefers-reduced-motion: reduce)'
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches)
  useEffect(() => {
    const mq = window.matchMedia?.(query)
    if (!mq) return
    const on = () => setReduced(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return reduced
}

export const smooth = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/**
 * Visibility at the ends of a looping burn (droplet burns down, solid front reaches the end):
 * fades out over the last 8 % of the loop and relights over the first 8 %.
 */
export const loopFade = (phase: number) => smooth(0, 0.08, phase) * (1 - smooth(0.92, 1, phase))
