// OWNER: 3D workstream. Development preview of the sample spacecraft, so it can be looked at
// before it is wired into the Simulation page. Not imported by the app and not in the built site.
// Colours here are real: they come from workstream A's markEvidence for the place chosen.
import { StrictMode, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { createRoot } from 'react-dom/client'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { AppData } from '../../../types/data'
import { TIER_COLOR, type EvidenceTier } from '../../../types/layout'
import { loadData } from '../../../data/load'
import { layoutProblems, markEvidence } from '../../../data/layoutEvidence'
import { Spacecraft } from '../Spacecraft'
import { groupItems, hiddenFor } from '../groups'
import { ITEMS, SAMPLE_MARKS, SAMPLE_NOTE, checkSpec } from '../spec'

const bar: CSSProperties = { position: 'absolute', left: 12, top: 12, right: 12, display: 'flex', flexWrap: 'wrap', gap: '8px 16px', alignItems: 'center', pointerEvents: 'none' }
const chip: CSSProperties = { pointerEvents: 'auto', background: 'rgba(4,12,24,.8)', border: '1px solid rgba(92,200,255,.35)', borderRadius: 8, padding: '4px 10px', color: 'inherit', font: 'inherit' }
const panel: CSSProperties = { position: 'absolute', left: 12, top: 56, display: 'grid', gap: 4, background: 'rgba(4,12,24,.8)', border: '1px solid rgba(92,200,255,.35)', borderRadius: 8, padding: '8px 12px' }
const note: CSSProperties = { position: 'absolute', left: 12, bottom: 12, right: 12, color: '#8fb4cc', fontSize: 13 }

function Preview() {
  const [data, setData] = useState<AppData | null>(null)
  const [place, setPlace] = useState('')
  const [labels, setLabels] = useState(true)
  const [exterior, setExterior] = useState(false)
  const [picked, setPicked] = useState<string | null>(null)
  const [furniture, setFurniture] = useState(true)
  const [off, setOff] = useState<ReadonlySet<string>>(new Set())

  useEffect(() => {
    loadData().then(setData, (e) => console.error(e))
  }, [])

  const habitat = data?.habitats.find((h) => h.id === place) ?? null
  const tiers = useMemo(() => {
    const out: Record<string, EvidenceTier> = {}
    if (data && habitat) for (const m of SAMPLE_MARKS) out[m.id] = markEvidence(data, habitat, m).tier
    return out
  }, [data, habitat])
  const colors = useMemo(() => (habitat ? Object.fromEntries(Object.entries(tiers).map(([id, t]) => [id, TIER_COLOR[t]])) : undefined), [tiers, habitat])

  const problems = useMemo(() => {
    const own = checkSpec(data?.fuels?.map((f) => f.id))
    const theirs = data ? layoutProblems(data, { version: 1, habitat_id: place || data.habitats[0].id, image_name: null, note: SAMPLE_NOTE, marks: SAMPLE_MARKS }) : []
    return [...own, ...theirs]
  }, [data, place])

  const pickedItem = ITEMS.find((i) => i.id === picked)

  // one group per colour on screen: fuel types with no place chosen, evidence with one
  const groups = useMemo(() => groupItems(habitat ? tiers : null), [habitat, tiers])
  const { hiddenIds, showFittings } = useMemo(() => hiddenFor(groups, furniture, off), [groups, furniture, off])
  const toggleGroup = (id: string) =>
    setOff((prev) => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      <Canvas camera={{ position: [1.5, 9.5, 13.5], fov: 42 }} dpr={[1, 2]} onPointerMissed={() => setPicked(null)}>
        <color attach="background" args={['#04070d']} />
        <Spacecraft markColors={colors} selectedMarkId={picked} showLabels={labels} exterior={exterior} hiddenIds={hiddenIds} showFittings={showFittings} onPickMark={setPicked} />
        <OrbitControls target={[0, 0.8, 0]} enablePan={false} minDistance={5} maxDistance={40} maxPolarAngle={Math.PI * 0.49} />
      </Canvas>

      <div style={bar}>
        <b>Sample spacecraft preview</b>
        <label style={chip}>
          Place{' '}
          <select value={place} onChange={(e) => setPlace(e.target.value)}>
            <option value="">none (fuel-type colours)</option>
            {data?.habitats.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </label>
        <label style={chip}>
          <input type="checkbox" checked={labels} onChange={(e) => setLabels(e.target.checked)} /> labels
        </label>
        <label style={chip}>
          <input type="checkbox" checked={exterior} onChange={(e) => setExterior(e.target.checked)} /> outside fittings
        </label>
      </div>

      <div style={panel}>
        <label style={{ fontWeight: 600 }}>
          <input type="checkbox" checked={furniture} onChange={(e) => setFurniture(e.target.checked)} /> Furniture
        </label>
        {groups.map((g) => (
          <label key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 18, opacity: furniture ? 1 : 0.45 }}>
            <input type="checkbox" disabled={!furniture} checked={!off.has(g.id)} onChange={() => toggleGroup(g.id)} />
            <i style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: g.color }} />
            {g.name} <span style={{ color: '#8fb4cc' }}>{g.itemIds.length}</span>
          </label>
        ))}
        <small style={{ color: '#8fb4cc', maxWidth: 250 }}>
          {habitat ? 'Colours show how much NASA evidence exists for each item in this air.' : 'Colours show the fuel type. Choose a place to colour by NASA evidence.'} Neither ranks how easily
          something burns.
        </small>
      </div>

      <div style={note}>
        {SAMPLE_NOTE}. {ITEMS.length} objects, {SAMPLE_MARKS.length} fuel items.{' '}
        {problems.length === 0 ? 'Layout checks: no problems.' : `Layout checks: ${problems.join('; ')}`}
        {pickedItem?.fuel && ` Picked: ${pickedItem.label} (${pickedItem.fuel.fuel_option_id}, ${pickedItem.fuel.airflow === 'vent' ? 'near a vent' : 'still air'}).`}
        {habitat && ' Colours show how much NASA evidence exists, not how dangerous.'}
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Preview />
  </StrictMode>,
)
