// OWNER: 3D workstream. The Simulation page's 3D stage.
//   - no place chosen: the sample spacecraft from outside, turning slowly;
//   - place chosen:    the sample spacecraft with its fuel items coloured by how much NASA evidence
//                      exists (colours arrive as props), or the user's own floor plan flat on a deck;
//   - double-click an object or the deck to place the fire point; after "Simulate" a flame starts
//     there and an illustrated spread reaches the other fuel items, with a timeline to play or drag.
//
// Everything here is an ILLUSTRATION on an EXAMPLE LAYOUT, NOT A NASA DESIGN. The stage works out
// no evidence and no outcome, and where the fire is placed changes nothing about the evidence.
// The spread is a drawing, not a prediction: see cabin/timeline.ts and CLAUDE.md.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { TIER_COLOR, type EvidenceTier } from '../types/layout'
import type { CabinStageProps } from '../types/sim'
import { Label } from './Label'
import { useReducedMotion } from './fire/state'
import { CabinFire, type SpreadClock } from './cabin/CabinFire'
import { Spacecraft } from './cabin/Spacecraft'
import { TimelineBar } from './cabin/TimelineBar'
import { groupItems, hiddenFor } from './cabin/groups'
import { HOLO, Segs } from './cabin/holo'
import { ITEMS, PLAN, deckHalfWidth } from './cabin/spec'
import { NO_SPREAD, planSpread } from './cabin/timeline'
import './scene.css'

const BACKGROUND = '#04070d'
const TIER_OF_COLOR = Object.fromEntries(Object.entries(TIER_COLOR).map(([tier, color]) => [color.toLowerCase(), tier])) as Record<string, EvidenceTier>

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

/** Where the fire will start, before "Simulate" is pressed. */
function FireMarker({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} raycast={() => null}>
        <ringGeometry args={[0.3, 0.38, 48]} />
        <meshBasicMaterial color="#ffcc29" transparent opacity={0.6} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.3, 0]} rotation={[Math.PI, 0, 0]} raycast={() => null}>
        <coneGeometry args={[0.16, 0.45, 16]} />
        <meshBasicMaterial color="#ffcc29" />
      </mesh>
    </group>
  )
}

/** Height at which the fire marker sits: on the fuel item under the point, or on the deck. */
function restingHeight(x: number, z: number) {
  const item = ITEMS.find((i) => i.fuel && Math.abs(x - i.x) <= Math.max(i.w, 0.4) / 2 && Math.abs(z - i.z) <= Math.max(i.d, 0.4) / 2)
  return item ? (item.y ?? 0) + Math.min(item.h, 1) * 0.6 : 0
}

export function CabinStage3D({ placeChosen, markColors, selectedMarkId, imageUrl, point, fuel, lit, fire, onPick }: CabinStageProps) {
  const still = useReducedMotion()
  const [labels, setLabels] = useState(true)
  const [exterior, setExterior] = useState(false)
  const [field, setField] = useState(true)
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

  const fireX = point ? (point.x - 0.5) * w : null
  const fireZ = point ? (point.y - 0.5) * d : null
  const fireAt = useMemo<[number, number, number] | null>(
    () => (fireX === null || fireZ === null ? null : [fireX, upload ? 0 : restingHeight(fireX, fireZ), fireZ]),
    [fireX, fireZ, upload],
  )

  // ---- illustrated spread: which fuel items light, in what order, and the timeline that plays it.
  // The order comes only from distance in this example layout (cabin/timeline.ts), and it does not
  // depend on which furniture is shown. An uploaded plan has no items, so there is nothing to reach
  // and no timeline.
  const plan = useMemo(() => (fireAt && lit && !upload ? planSpread(fireAt[0], fireAt[2]) : NO_SPREAD), [fireAt, lit, upload])
  const clock = useRef<SpreadClock>({ t: 0, playing: false, rate: 1, shown: 0 })
  const [shownT, setShownT] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [rate, setRate] = useState(1)
  // A newly lit fire starts the timeline from step 0 (paused under reduced motion: drag the bar).
  useEffect(() => {
    const c = clock.current
    c.t = c.shown = 0
    c.playing = lit && !still
    setShownT(0)
    setPlaying(c.playing)
  }, [lit, fireX, fireZ, still])
  const togglePlay = () => {
    const c = clock.current
    if (!c.playing && c.t >= plan.steps) c.t = c.shown = 0
    c.playing = !c.playing
    setShownT(c.t)
    setPlaying(c.playing)
  }
  const changeRate = (r: number) => {
    clock.current.rate = r
    setRate(r)
  }
  const scrub = (t: number) => {
    const c = clock.current
    c.t = c.shown = t
    c.playing = false
    setShownT(t)
    setPlaying(false)
  }

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
              showLabels={labels}
              exterior={exterior}
              hiddenIds={hiddenIds}
              showFittings={showFittings}
              pickOn="doubleClick"
              onPickMark={pickItem}
            />
            <PickSurface w={w} d={d} deckOnly onPick={onPick} />
          </>
        )}
        {placeChosen && fireAt && !lit && <FireMarker position={fireAt} />}
        {placeChosen && fireAt && lit && (
          <CabinFire position={fireAt} fuel={fuel} fire={fire} plan={plan} clock={clock} field={field} hiddenIds={hiddenIds} onShow={setShownT} onEnd={() => setPlaying(false)} />
        )}
        <OrbitControls target={[0, 0.8, 0]} enablePan={false} autoRotate={!placeChosen && !still} autoRotateSpeed={0.5} minDistance={5} maxDistance={40} maxPolarAngle={Math.PI * 0.49} />
      </Canvas>

      {placeChosen && !upload && (
        <div className="cabin-b-panel">
          <label className="cabin-b-main">
            <input type="checkbox" checked={labels} onChange={(e) => setLabels(e.target.checked)} /> Labels
          </label>
          <label className="cabin-b-main">
            <input type="checkbox" checked={exterior} onChange={(e) => setExterior(e.target.checked)} /> Outside fittings
          </label>
          <label className="cabin-b-main">
            <input type="checkbox" checked={field} onChange={(e) => setField(e.target.checked)} /> Spread colours
          </label>
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
      {placeChosen && lit && plan.steps > 0 && <TimelineBar t={shownT} steps={plan.steps} playing={playing} rate={rate} onPlay={togglePlay} onRate={changeRate} onScrub={scrub} field={field} />}
      {placeChosen && upload && <div className="cabin-b-tag" style={{ color: HOLO }}>Double-click your plan to place the fire</div>}
    </div>
  )
}
