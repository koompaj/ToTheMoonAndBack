// OWNER: 3D workstream.
// A few faint streaks that drift in the direction of the air, so the airflow slider reads at a
// glance. Hidden in still air. Drawing only: the streak speed is not the air speed.
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { FireState } from './state'

const N = 14
const LEN = 0.35

/** Fixed pseudo-random lanes, so the streaks look the same on every load. */
function lanes() {
  const out: { a: number; b: number; o: number }[] = []
  let s = 7
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  for (let i = 0; i < N; i++) out.push({ a: rnd() * 2 - 1, b: rnd() * 2 - 1, o: rnd() })
  return out
}

export function FlowStreaks({
  state,
  axis,
  span = 4.4,
  spread = [1.4, 0.6],
}: {
  state: MutableRefObject<FireState>
  /** 'x': air moves left to right. '-y': air moves top to bottom. */
  axis: 'x' | '-y'
  span?: number
  /** Half-size of the region the lanes fill, across the flow. */
  spread?: [number, number]
}) {
  const lane = useMemo(lanes, [])
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 6), 3))
    return g
  }, [])
  const material = useMemo(
    () => new THREE.LineBasicMaterial({ color: '#9fb6d9', transparent: true, opacity: 0, depthWrite: false }),
    [],
  )
  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )
  const lines = useRef<THREE.LineSegments>(null)

  useFrame(() => {
    const { look, t } = state.current
    const strength = Math.min(1, look.drift / 1.3)
    material.opacity = 0.32 * strength
    if (lines.current) lines.current.visible = strength > 0.02
    if (strength <= 0.02) return
    const pos = geometry.attributes.position as THREE.BufferAttribute
    const arr = pos.array as Float32Array
    for (let i = 0; i < N; i++) {
      const { a, b, o } = lane[i]
      // Position along the flow, wrapping across the span.
      const u = (((o + t * (0.25 + 0.5 * strength)) % 1) - 0.5) * span
      const k = i * 6
      if (axis === 'x') {
        arr[k] = u; arr[k + 1] = a * spread[0]; arr[k + 2] = b * spread[1]
        arr[k + 3] = u + LEN; arr[k + 4] = a * spread[0]; arr[k + 5] = b * spread[1]
      } else {
        arr[k] = a * spread[0]; arr[k + 1] = -u; arr[k + 2] = b * spread[1]
        arr[k + 3] = a * spread[0]; arr[k + 4] = -u - LEN; arr[k + 5] = b * spread[1]
      }
    }
    pos.needsUpdate = true
  })

  return <lineSegments ref={lines} geometry={geometry} material={material} frustumCulled={false} />
}
