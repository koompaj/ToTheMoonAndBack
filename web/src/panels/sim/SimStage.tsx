// OWNER: dashboard + AI workstream.
// The Simulation page's 3D stage: a holographic, drag-to-rotate scene. Idle: a slowly turning
// spacecraft module with call-outs to its parts. With a place chosen: that place's example cabin
// (or the user's uploaded floor plan) on a clickable floor; marks are coloured by how much NASA
// evidence exists (teal / amber / coral). After "Simulate" the chosen point lights up. Everything
// here is an ILLUSTRATION: nothing spreads, and position does not change the evidence.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { FuelClass } from '../../types/data'
import type { LayoutMark } from '../../types/layout'
import { HoloLabel } from './HoloLabel'
import { IDLE_CALLOUTS, type CabinTemplate } from './templates'

const HOLO = '#5cc8ff'
const FUEL_HEX: Record<FuelClass, string> = { solid: '#ff8a3d', droplet: '#4fc3f7', gas: '#b388ff' }

function useLine(points: [number, number, number][], color: string, opacity = 0.7) {
  return useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints(points.map((p) => new THREE.Vector3(...p)))
    const m = new THREE.LineBasicMaterial({ color, transparent: true, opacity })
    return new THREE.Line(g, m)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(points), color, opacity])
}

function Callout({ at, to, label }: { at: [number, number, number]; to: [number, number, number]; label: string }) {
  const elbow: [number, number, number] = [to[0] * 0.92, to[1], to[2]]
  const line = useLine([at, elbow, to], HOLO, 0.75)
  return (
    <group>
      <primitive object={line} />
      <mesh position={at}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshBasicMaterial color="#e0f6ff" />
      </mesh>
      <HoloLabel text={label} position={[to[0] + (to[0] > 0 ? 1.4 : -1.4), to[1], to[2]]} />
    </group>
  )
}

function HoloRings({ y, r }: { y: number; r: number }) {
  const ref = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * (y > 0 ? 0.25 : -0.2)
  })
  return (
    <group ref={ref} position={[0, y, 0]}>
      {[1, 0.82, 0.62].map((k, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[r * k - 0.05, r * k, 96, 1, 0, Math.PI * (i === 1 ? 1.6 : 2)]} />
          <meshBasicMaterial color={i === 1 ? '#ffb347' : HOLO} transparent opacity={i === 0 ? 0.7 : 0.45} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[r * 0.55, 64]} />
        <meshBasicMaterial color={HOLO} transparent opacity={0.08} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  )
}

function Starfield() {
  const geo = useMemo(() => {
    const n = 900
    const pos = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const r = 40 + Math.random() * 40
      const t = Math.random() * Math.PI * 2
      const p = Math.acos(2 * Math.random() - 1)
      pos.set([r * Math.sin(p) * Math.cos(t), r * Math.cos(p), r * Math.sin(p) * Math.sin(t)], i * 3)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return g
  }, [])
  return (
    <points geometry={geo}>
      <pointsMaterial color="#ffffff" size={0.18} sizeAttenuation transparent opacity={0.8} />
    </points>
  )
}

function Wire({ geometry, opacity = 0.5, color = HOLO }: { geometry: THREE.BufferGeometry; opacity?: number; color?: string }) {
  const edges = useMemo(() => new THREE.EdgesGeometry(geometry, 12), [geometry])
  return (
    <group>
      <mesh geometry={geometry}>
        <meshBasicMaterial color={color} transparent opacity={0.05} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color={color} transparent opacity={opacity} />
      </lineSegments>
    </group>
  )
}

function IdleCabin() {
  const ref = useRef<THREE.Group>(null)
  const hull = useMemo(() => new THREE.CylinderGeometry(1.8, 1.8, 9, 32, 6, true).rotateZ(Math.PI / 2), [])
  const cap = useMemo(() => new THREE.SphereGeometry(1.8, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), [])
  const floor = useMemo(() => new THREE.PlaneGeometry(8.6, 2.6, 12, 4).rotateX(-Math.PI / 2), [])
  const rack = useMemo(() => new THREE.BoxGeometry(1.4, 1.6, 0.8), [])
  const bunk = useMemo(() => new THREE.BoxGeometry(1.2, 1.2, 1), [])
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.12
  })
  return (
    <group ref={ref}>
      <Wire geometry={hull} opacity={0.55} />
      <group position={[4.5, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <Wire geometry={cap} opacity={0.4} />
      </group>
      <group position={[-4.5, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <Wire geometry={cap} opacity={0.4} />
      </group>
      <group position={[0, -0.95, 0]}>
        <Wire geometry={floor} opacity={0.3} />
      </group>
      <group position={[1.6, -0.15, -1]}>
        <Wire geometry={rack} color="#ff8a3d" opacity={0.7} />
      </group>
      <group position={[-3.6, -0.3, -0.6]}>
        <Wire geometry={bunk} color="#ffb347" opacity={0.7} />
      </group>
      {IDLE_CALLOUTS.map((c) => (
        <Callout key={c.label} {...c} />
      ))}
    </group>
  )
}

function Shell({ t }: { t: CabinTemplate }) {
  const geo = useMemo(() => {
    if (t.shape === 'dome') return new THREE.SphereGeometry(Math.max(t.w, t.d) * 0.72, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2)
    if (t.shape === 'module') return new THREE.CylinderGeometry(t.d * 0.72, t.d * 0.72, t.w * 1.05, 32, 4, true).rotateZ(Math.PI / 2).translate(0, t.d * 0.45, 0)
    if (t.shape === 'lab') return new THREE.BoxGeometry(t.w * 1.04, 3, t.d * 1.04).translate(0, 1.5, 0)
    return new THREE.CapsuleGeometry(t.w * 0.38, t.d * 0.55, 8, 24).rotateX(Math.PI / 2).translate(0, 0.6, 0)
  }, [t])
  return <Wire geometry={geo} opacity={0.32} />
}

function SuitOutline({ t }: { t: CabinTemplate }) {
  // A flat suit silhouette on the plan: helmet, torso, arms, legs, backpack.
  const W = t.w
  const D = t.d
  const toV = (x: number, y: number) => new THREE.Vector3((x - 0.5) * W, 0.02, (y - 0.5) * D)
  const loops = useMemo(() => {
    const circle = Array.from({ length: 33 }, (_, i) => {
      const a = (i / 32) * Math.PI * 2
      return toV(0.5 + Math.cos(a) * 0.14, 0.14 + Math.sin(a) * 0.1)
    })
    const rect = (x: number, y: number, w: number, h: number) => [toV(x, y), toV(x + w, y), toV(x + w, y + h), toV(x, y + h), toV(x, y)]
    return [circle, rect(0.28, 0.26, 0.44, 0.44), rect(0.08, 0.28, 0.18, 0.36), rect(0.74, 0.28, 0.18, 0.36), rect(0.3, 0.7, 0.17, 0.27), rect(0.53, 0.7, 0.17, 0.27)]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [W, D])
  return (
    <group>
      {loops.map((pts, i) => (
        <primitive key={i} object={new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: HOLO, transparent: true, opacity: 0.8 }))} />
      ))}
    </group>
  )
}

function Floor({ t, imageUrl, onPick }: { t: CabinTemplate; imageUrl: string | null; onPick: (x: number, y: number) => void }) {
  const [tex, setTex] = useState<THREE.Texture | null>(null)
  useEffect(() => {
    if (!imageUrl) {
      setTex(null)
      return
    }
    const loader = new THREE.TextureLoader()
    const t = loader.load(imageUrl, (loaded) => {
      loaded.colorSpace = THREE.SRGBColorSpace
      setTex(loaded)
    })
    return () => t.dispose()
  }, [imageUrl])
  const grid = useMemo(() => new THREE.GridHelper(1, 12, HOLO, HOLO), [])
  const click = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return // a drag to rotate, not a click
    e.stopPropagation()
    const x = THREE.MathUtils.clamp(e.point.x / t.w + 0.5, 0, 1)
    const y = THREE.MathUtils.clamp(e.point.z / t.d + 0.5, 0, 1)
    onPick(x, y)
  }
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} onClick={click} onPointerOver={() => (document.body.style.cursor = 'crosshair')} onPointerOut={() => (document.body.style.cursor = '')}>
        <planeGeometry args={[t.w, t.d]} />
        {tex ? <meshBasicMaterial map={tex} transparent opacity={0.92} /> : <meshBasicMaterial color="#0b2a44" transparent opacity={0.55} />}
      </mesh>
      {!tex && <primitive object={grid} scale={[t.w, 1, t.d]} position={[0, 0.01, 0]} material-transparent material-opacity={0.18} />}
      <lineSegments position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(t.w, t.d)]} />
        <lineBasicMaterial color={HOLO} />
      </lineSegments>
    </group>
  )
}

function Mark({ m, t, color, selected }: { m: LayoutMark; t: CabinTemplate; color: string; selected: boolean }) {
  const cx = (m.shape.x + (m.shape.w ?? 0) / 2 - 0.5) * t.w
  const cz = (m.shape.y + (m.shape.h ?? 0) / 2 - 0.5) * t.d
  if (m.kind === 'area') {
    const w = (m.shape.w ?? 0.1) * t.w
    const d = (m.shape.h ?? 0.1) * t.d
    return (
      <group position={[cx, 0.12, cz]}>
        <mesh>
          <boxGeometry args={[w, 0.22, d]} />
          <meshBasicMaterial color={color} transparent opacity={selected ? 0.55 : 0.32} depthWrite={false} />
        </mesh>
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(w, 0.22, d)]} />
          <lineBasicMaterial color={FUEL_HEX[m.fuel_class]} />
        </lineSegments>
        <HoloLabel text={m.label} position={[0, 0.7, 0]} height={0.32} />
      </group>
    )
  }
  return (
    <group position={[cx, 0, cz]}>
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.9, 8]} />
        <meshBasicMaterial color={FUEL_HEX[m.fuel_class]} />
      </mesh>
      <mesh position={[0, 0.95, 0]}>
        <sphereGeometry args={[selected ? 0.2 : 0.15, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <HoloLabel text={m.label} position={[0, 1.45, 0]} height={0.32} />
    </group>
  )
}

function FirePoint({ x, y, t, fuel, lit }: { x: number; y: number; t: CabinTemplate; fuel: FuelClass; lit: boolean }) {
  const core = useRef<THREE.Mesh>(null)
  const ring = useRef<THREE.Mesh>(null)
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  useFrame(({ clock }) => {
    if (reduce) return
    const s = clock.elapsedTime
    if (core.current) core.current.scale.setScalar(lit ? 1 + Math.sin(s * 6) * 0.08 : 1)
    if (ring.current) {
      const k = (s * 0.8) % 1
      ring.current.scale.setScalar(lit ? 0.4 + k * 2.6 : 1)
      ;(ring.current.material as THREE.MeshBasicMaterial).opacity = lit ? 0.7 * (1 - k) : 0.6
    }
  })
  const px = (x - 0.5) * t.w
  const pz = (y - 0.5) * t.d
  // Microgravity flames are near-spherical and blue-tinged (challenge page); the colour hints the fuel.
  const flame = fuel === 'gas' ? '#8fb8ff' : fuel === 'droplet' ? '#6ad0ff' : '#ffb347'
  return (
    <group position={[px, 0, pz]}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[0.35, 0.45, 48]} />
        <meshBasicMaterial color={lit ? '#ff7a2f' : '#ffcc29'} transparent opacity={0.6} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {lit ? (
        <group position={[0, 0.7, 0]}>
          <mesh ref={core}>
            <sphereGeometry args={[0.38, 32, 32]} />
            <meshBasicMaterial color={flame} transparent opacity={0.9} />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.7, 32, 32]} />
            <meshBasicMaterial color="#ff7a2f" transparent opacity={0.22} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
          <pointLight color="#ff9a40" intensity={6} distance={6} />
          <HoloLabel text="Fire starts here · illustration" position={[0, 1.2, 0]} color="#ffd9a0" height={0.34} />
        </group>
      ) : (
        <mesh position={[0, 0.5, 0]}>
          <coneGeometry args={[0.18, 0.5, 16]} />
          <meshBasicMaterial color="#ffcc29" />
        </mesh>
      )}
    </group>
  )
}

export interface SimStageProps {
  template: CabinTemplate | null
  marks: LayoutMark[]
  markColors: Record<string, string>
  selectedMarkId: string | null
  imageUrl: string | null
  point: { x: number; y: number } | null
  fuel: FuelClass
  lit: boolean
  onPick: (x: number, y: number) => void
}

export function SimStage({ template, marks, markColors, selectedMarkId, imageUrl, point, fuel, lit, onPick }: SimStageProps) {
  const idle = !template
  const span = template ? Math.max(template.w, template.d) : 10
  return (
    <Canvas key={idle ? 'idle' : `place-${span}`} camera={{ position: idle ? [0, 4, 21] : [0, span * 1.05, span * 1.35], fov: 45 }} dpr={[1, 2]}>
      <color attach="background" args={['#04070d']} />
      <fog attach="fog" args={['#04070d', 30, 90]} />
      <ambientLight intensity={0.4} />
      <Starfield />
      <HoloRings y={idle ? -2.8 : -0.6} r={idle ? 6.5 : span * 0.75} />
      {idle && <HoloRings y={3.6} r={5.2} />}
      {idle ? (
        <IdleCabin />
      ) : (
        <group>
          <Shell t={template} />
          <Floor t={template} imageUrl={imageUrl} onPick={onPick} />
          {template.shape === 'suit' && !imageUrl && <SuitOutline t={template} />}
          {!imageUrl && marks.map((m) => <Mark key={m.id} m={m} t={template} color={markColors[m.id] ?? '#fbbf24'} selected={m.id === selectedMarkId} />)}
          {point && <FirePoint x={point.x} y={point.y} t={template} fuel={fuel} lit={lit} />}
        </group>
      )}
      <OrbitControls enablePan={false} autoRotate={idle} autoRotateSpeed={0.5} minDistance={5} maxDistance={40} maxPolarAngle={Math.PI * 0.49} />
    </Canvas>
  )
}
