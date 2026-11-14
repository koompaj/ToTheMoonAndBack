// OWNER: 3D workstream. The "blue wireframe hologram" look: every shape is its edges plus a faint
// glowing fill. Shapes share geometry through small caches, so repeating a part costs nothing.
import { useMemo } from 'react'
import * as THREE from 'three'
import { HOLO_BLUE } from './spec'

/** Base hologram colour, the same blue as the Simulation page's stage. */
export const HOLO = HOLO_BLUE

export type Vec3 = [number, number, number]

const noRaycast = () => null

const geometries = new Map<string, THREE.BufferGeometry>()
function cached(key: string, make: () => THREE.BufferGeometry) {
  let g = geometries.get(key)
  if (!g) geometries.set(key, (g = make()))
  return g
}
const edgeCache = new WeakMap<THREE.BufferGeometry, THREE.EdgesGeometry>()
function edgesOf(g: THREE.BufferGeometry) {
  let e = edgeCache.get(g)
  if (!e) edgeCache.set(g, (e = new THREE.EdgesGeometry(g, 25)))
  return e
}

export const boxGeo = (w: number, h: number, d: number) => cached(`box ${w} ${h} ${d}`, () => new THREE.BoxGeometry(w, h, d))
export const cylGeo = (r: number, h: number, sides = 16) => cached(`cyl ${r} ${h} ${sides}`, () => new THREE.CylinderGeometry(r, r, h, sides))
export const coneGeo = (r: number, h: number, sides = 16) => cached(`cone ${r} ${h} ${sides}`, () => new THREE.ConeGeometry(r, h, sides, 1, true))
export const ballGeo = (r: number) => cached(`ball ${r}`, () => new THREE.SphereGeometry(r, 12, 8))
export const ringGeo = (r: number, tube: number) => cached(`ring ${r} ${tube}`, () => new THREE.TorusGeometry(r, tube, 6, 40))

interface Look {
  color?: string
  /** Opacity of the edge lines and of the glow fill. */
  line?: number
  fill?: number
}

interface Placement {
  position?: Vec3
  rotation?: Vec3
  scale?: Vec3 | number
}

/** One shape in hologram style. */
export function Holo({ geo, color = HOLO, line = 0.8, fill = 0.07, position, rotation, scale }: { geo: THREE.BufferGeometry } & Look & Placement) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {fill > 0 && (
        <mesh geometry={geo} raycast={noRaycast}>
          <meshBasicMaterial color={color} transparent opacity={fill} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
        </mesh>
      )}
      <lineSegments geometry={edgesOf(geo)} raycast={noRaycast}>
        <lineBasicMaterial color={color} transparent opacity={line} />
      </lineSegments>
    </group>
  )
}

export const Box = ({ size, ...rest }: { size: Vec3 } & Look & Placement) => <Holo geo={boxGeo(...size)} {...rest} />
export const Cyl = ({ r, h, sides, ...rest }: { r: number; h: number; sides?: number } & Look & Placement) => <Holo geo={cylGeo(r, h, sides)} {...rest} />
export const Ring = ({ r, tube = 0.04, ...rest }: { r: number; tube?: number } & Look & Placement) => <Holo geo={ringGeo(r, tube)} fill={0.25} {...rest} />

/** Loose line segments from a flat [x,y,z, x,y,z, ...] list. Pass a stable array (module constant or useMemo). */
export function Segs({ points, color = HOLO, opacity = 0.6, position, rotation }: { points: number[]; color?: string; opacity?: number } & Placement) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
    return g
  }, [points])
  return (
    <lineSegments geometry={geometry} position={position} rotation={rotation} raycast={noRaycast}>
      <lineBasicMaterial color={color} transparent opacity={opacity} />
    </lineSegments>
  )
}

/** A filled surface with no edges, e.g. the deck. */
export function Glow({ geo, color = HOLO, opacity = 0.08, position, rotation }: { geo: THREE.BufferGeometry; color?: string; opacity?: number } & Placement) {
  return (
    <mesh geometry={geo} position={position} rotation={rotation} raycast={noRaycast}>
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
    </mesh>
  )
}
