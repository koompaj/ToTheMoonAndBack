// OWNER: 3D workstream. The Simulation page's 3D stage.
//   - no place chosen: the sample spacecraft from outside, turning slowly;
//   - place chosen:    the sample spacecraft with its fuel items coloured by how much NASA evidence
//                      exists (colours arrive as props), or the user's own floor plan flat on a deck;
//   - double-click an object or the deck to place the fire point; after "Simulate" it lights up.
//
// Everything here is an ILLUSTRATION on an EXAMPLE LAYOUT, NOT A NASA DESIGN. The stage works out
// no evidence and no outcome, and where the fire is placed changes nothing about the evidence.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { FuelClass } from '../types/data'
import { TIER_COLOR, type EvidenceTier } from '../types/layout'
import type { CabinStageProps } from '../types/sim'
import { Label } from './Label'
import { useReducedMotion } from './fire/state'
import { Spacecraft } from './cabin/Spacecraft'
import { groupItems, hiddenFor } from './cabin/groups'
import { HOLO, Segs } from './cabin/holo'
import { ITEMS, PLAN, deckHalfWidth } from './cabin/spec'
import './scene.css'

const BACKGROUND = '#04070d'
const TIER_OF_COLOR = Object.fromEntries(Object.entries(TIER_COLOR).map(([tier, color]) => [color.toLowerCase(), tier])) as Record<string, EvidenceTier>
const FLAME_COLOR: Record<FuelClass, string> = { gas: '#8fb8ff', droplet: '#6ad0ff', solid: '#ffb347' }

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const round3 = (v: number) => Math.round(v * 1000) / 1000

function Stars() {
  const geometry = useMemo(() => {
    const n = 700
    const positions = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const r = 45 + Math.random() * 40
      const a = Math.random() * Math.PI * 2
      const b = Math.acos(2 * Math.random() - 1)
      positions.set([r * Math.sin(b) * Math.cos(a), r * Math.cos(b), r * Math.sin(b) * Math.sin(a)], i * 3)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return g
  }, [])
  return (
    <points geometry={geometry} raycast={() => null}>
      <pointsMaterial color="#ffffff" size={0.16} sizeAttenuation transparent opacity={0.75} />
    </points>
  )
}

/** Unseen surface that turns a double-click into a point on the plan (fractions 0..1). */
function PickSurface({ w, d, deckOnly, onPick }: { w: number; d: number; deckOnly: boolean; onPick: (x: number, y: number) => void }) {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.002, 0]}
      onDoubleClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation()
        const { x, z } = e.point
        if (deckOnly && Math.abs(z) > deckHalfWidth(x)) return // beside the spacecraft, not on its deck
        onPick(round3(clamp01(x / w + 0.5)), round3(clamp01(z / d + 0.5)))
      }}
    >
      <planeGeometry args={[w, d]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  )
}

/** The user's floor plan, flat on a plain deck. The picture is never stretched or uploaded anywhere. */
function UploadedPlan({ imageUrl, onSize }: { imageUrl: string; onSize: (w: number, d: number) => void }) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null)
  useEffect(() => {
    let live = true
    const loaded = new THREE.TextureLoader().load(imageUrl, (t) => {
      if (!live) return
      t.colorSpace = THREE.SRGBColorSpace
      setTexture(t)
    })
    return () => {
      live = false
      loaded.dispose()
    }
  }, [imageUrl])

  const image = texture?.image as { width: number; height: number } | undefined
  const aspect = image && image.height > 0 ? image.width / image.height : PLAN.w / PLAN.d
  const w = aspect >= PLAN.w / PLAN.d ? PLAN.w : PLAN.d * aspect
  const d = w / aspect
  useEffect(() => onSize(w, d), [w, d, onSize])
  const border = useMemo(() => {
    const x = w / 2
    const z = d / 2
    return [-x, 0.01, -z, x, 0.01, -z, x, 0.01, -z, x, 0.01, z, x, 0.01, z, -x, 0.01, z, -x, 0.01, z, -x, 0.01, -z]
  }, [w, d])
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <planeGeometry args={[w, d]} />
        {texture ? <meshBasicMaterial map={texture} transparent opacity={0.92} /> : <meshBasicMaterial color="#0b2a44" transparent opacity={0.5} />}
      </mesh>
      <Segs points={border} opacity={0.9} />
      <Label text="Your floor plan" position={[0, 0.02, d / 2 + 0.6]} color="#9fdcff" height={0.34} />
    </group>
  )
}

function FirePoint({ position, fuel, lit }: { position: [number, number, number]; fuel: FuelClass; lit: boolean }) {
  const still = useReducedMotion()
  const core = useRef<THREE.Mesh>(null)
  const ring = useRef<THREE.Mesh>(null)
  const time = useRef(0)
  useFrame((_, dt) => {
    if (still || !lit) return
    time.current += Math.min(dt, 0.1)
    const t = time.current
    core.current?.scale.setScalar(1 + Math.sin(t * 6) * 0.08)
    if (ring.current) {
      const k = (t * 0.8) % 1
      ring.current.scale.setScalar(0.4 + k * 2.6)
      ;(ring.current.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - k)
    }
  })
  return (
    <group position={position}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} raycast={() => null}>
        <ringGeometry args={[0.3, 0.38, 48]} />
        <meshBasicMaterial color={lit ? '#ff7a2f' : '#ffcc29'} transparent opacity={0.6} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {lit ? (
        <group position={[0, 0.45, 0]}>
          <mesh ref={core} raycast={() => null}>
            <sphereGeometry args={[0.3, 32, 32]} />
            <meshBasicMaterial color={FLAME_COLOR[fuel]} transparent opacity={0.9} />
          </mesh>
          <mesh raycast={() => null}>
            <sphereGeometry args={[0.6, 32, 32]} />
            <meshBasicMaterial color="#ff7a2f" transparent opacity={0.22} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
          <Label text="Fire starts here · illustration" position={[0, 1.05, 0]} color="#ffd9a0" height={0.32} />
        </group>
      ) : (
        <mesh position={[0, 0.3, 0]} rotation={[Math.PI, 0, 0]} raycast={() => null}>
          <coneGeometry args={[0.16, 0.45, 16]} />
          <meshBasicMaterial color="#ffcc29" />
        </mesh>
      )}
    </group>
  )
}

/** Height at which the fire marker sits: on the fuel item under the point, or on the deck. */
function restingHeight(x: number, z: number) {
  const item = ITEMS.find((i) => i.fuel && Math.abs(x - i.x) <= Math.max(i.w, 0.4) / 2 && Math.abs(z - i.z) <= Math.max(i.d, 0.4) / 2)
  return item ? (item.y ?? 0) + Math.min(item.h, 1) * 0.6 : 0
}

export function CabinStage3D({ placeChosen, markColors, selectedMarkId, imageUrl, point, fuel, lit, onPick }: CabinStageProps) {
  const still = useReducedMotion()
  const [furniture, setFurniture] = useState(true)
  const [off, setOff] = useState<ReadonlySet<string>>(new Set())
  const [planSize, setPlanSize] = useState<[number, number]>([PLAN.w, PLAN.d])
  const upload = placeChosen && !!imageUrl
  const [w, d] = upload ? planSize : [PLAN.w, PLAN.d]

  // The page sends colours, not their meaning; read the evidence level back from the colour so
  // the groups match what is on screen.
  const tiers = useMemo(() => {
    const out: Record<string, EvidenceTier> = {}
    for (const [id, color] of Object.entries(markColors)) {
      const tier = TIER_OF_COLOR[color.toLowerCase()]
      if (tier) out[id] = tier
    }
    return Object.keys(out).length ? out : null
  }, [markColors])
  const groups = useMemo(() => groupItems(tiers), [tiers])
  const { hiddenIds, showFittings } = useMemo(() => hiddenFor(groups, furniture, off), [groups, furniture, off])
  const toggleGroup = (id: string) =>
    setOff((prev) => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })

  const pickItem = (id: string) => {
    const item = ITEMS.find((i) => i.id === id)
    if (item) onPick(round3(item.x / PLAN.w + 0.5), round3(item.z / PLAN.d + 0.5))
  }

  const fireAt = point ? ([(point.x - 0.5) * w, 0, (point.y - 0.5) * d] as [number, number, number]) : null
  if (fireAt && !upload) fireAt[1] = restingHeight(fireAt[0], fireAt[2])

  return (
    <div className="cabin-b">
      <Canvas key={placeChosen ? 'place' : 'idle'} camera={{ position: placeChosen ? [1.5, 9.5, 13.5] : [2, 6, 19], fov: 42 }} dpr={[1, 1.5]}>
        <color attach="background" args={[BACKGROUND]} />
        <Stars />
        {!placeChosen ? (
          <Spacecraft exterior showLabels={false} />
        ) : upload ? (
          <>
            <UploadedPlan imageUrl={imageUrl!} onSize={(pw, pd) => setPlanSize((prev) => (prev[0] === pw && prev[1] === pd ? prev : [pw, pd]))} />
            <PickSurface w={w} d={d} deckOnly={false} onPick={onPick} />
          </>
        ) : (
          <>
            <Spacecraft
              markColors={Object.keys(markColors).length ? markColors : undefined}
              selectedMarkId={selectedMarkId}
              hiddenIds={hiddenIds}
              showFittings={showFittings}
              pickOn="doubleClick"
              onPickMark={pickItem}
            />
            <PickSurface w={w} d={d} deckOnly onPick={onPick} />
          </>
        )}
        {placeChosen && fireAt && <FirePoint position={fireAt} fuel={fuel} lit={lit} />}
        <OrbitControls target={[0, 0.8, 0]} enablePan={false} autoRotate={!placeChosen && !still} autoRotateSpeed={0.5} minDistance={5} maxDistance={40} maxPolarAngle={Math.PI * 0.49} />
      </Canvas>

      {placeChosen && !upload && (
        <div className="cabin-b-panel">
          <label className="cabin-b-main">
            <input type="checkbox" checked={furniture} onChange={(e) => setFurniture(e.target.checked)} /> Furniture
          </label>
          {groups.map((g) => (
            <label key={g.id} className={furniture ? 'cabin-b-group' : 'cabin-b-group off'}>
              <input type="checkbox" disabled={!furniture} checked={!off.has(g.id)} onChange={() => toggleGroup(g.id)} />
              <i style={{ background: g.color }} />
              {g.name} <span>{g.itemIds.length}</span>
            </label>
          ))}
        </div>
      )}
      {placeChosen && upload && <div className="cabin-b-tag" style={{ color: HOLO }}>Double-click your plan to place the fire</div>}
    </div>
  )
}
