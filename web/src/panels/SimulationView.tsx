// OWNER: dashboard + AI workstream.
// "Simulation": pick a place, see its example cabin in 3D (or upload your own floor plan), choose
// what is burning, click where the fire starts, press Simulate. The point lights up and the side
// bar shows what NASA's tables say: evidence for that material in that air (markEvidence, from
// workstream A), what the nearest real tests did, and the three tasks (detection, suppression,
// prevention), every line cited. The fire is an illustration: NASA's tables do not model spread,
// and where the fire starts does not change the evidence, because one cabin shares one air.
// The tab name "Simulation" was the team lead's call (see the pull request).
import { useEffect, useMemo, useState } from 'react'
import type { AppData, FuelClass } from '../types/data'
import type { Layout, LayoutMark } from '../types/layout'
import { OTHER_FUEL, TIER_COLOR, TIER_LABEL } from '../types/layout'
import { fuelOptionsFor, markEvidence } from '../data/layoutEvidence'
import { defaultPoint, expectedBehaviour, nearestTests, taskAnswers, type Statement } from '../ai/fireTasks'
import { fmtPct, PSI_PER_ATM } from '../ai/evidence'
import { SentenceCites, TestCite } from './Cite'
import { useHashParam } from './route'
import { placeArt, placeName } from './places'
import { PlaceArt } from './SpaceArt'
import { Choice, FUEL_LABEL, FUEL_SHORT, FuelDot, PanelHead, FuelIcon } from './ui'
import { SimStage } from './sim/SimStage'
import { templateFor } from './sim/templates'

const FUELS: FuelClass[] = ['gas', 'droplet', 'solid']

function Lines({ items, data }: { items: Statement[]; data: AppData }) {
  if (!items.length) return null
  return (
    <ul className="sim-lines">
      {items.map((s, i) => (
        <li key={i} className={s.kind === 'gap' ? 'gap' : ''}>
          {s.text} <SentenceCites sentence={s} data={data} />
        </li>
      ))}
    </ul>
  )
}

function inside(m: LayoutMark, x: number, y: number) {
  if (m.kind === 'area') return x >= m.shape.x && x <= m.shape.x + (m.shape.w ?? 0) && y >= m.shape.y && y <= m.shape.y + (m.shape.h ?? 0)
  return Math.hypot(x - m.shape.x, y - m.shape.y) < 0.06
}

export function SimulationView({ data }: { data: AppData }) {
  const [hid, setHid] = useHashParam('h', '')
  const [mapMode, setMapMode] = useHashParam('map', 'example')
  const [fuelStr, setFuel] = useHashParam('fuel', 'solid')
  const [opt, setOpt] = useHashParam('opt', '')
  const [air, setAir] = useHashParam('air', 'still')
  const [pxStr, setPx] = useHashParam('px', '')
  const [pyStr, setPy] = useHashParam('py', '')
  const [run, setRun] = useHashParam('run', '0')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageName, setImageName] = useState<string | null>(null)
  const [exampleMarks, setExampleMarks] = useState<LayoutMark[]>([])

  const hab = data.habitats.find((h) => h.id === hid) ?? null
  const fuel = (FUELS.includes(fuelStr as FuelClass) ? fuelStr : 'solid') as FuelClass
  const template = hab ? templateFor(hab.id) : null
  const point = pxStr && pyStr ? { x: Number(pxStr), y: Number(pyStr) } : null
  const lit = run === '1' && !!point

  // Moon layouts use workstream A's example file.
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}layouts/example-moon-habitat.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((l: Layout | null) => l && setExampleMarks(l.marks))
      .catch(() => undefined)
  }, [])
  useEffect(() => () => void (imageUrl && URL.revokeObjectURL(imageUrl)), [imageUrl])

  const marks = template ? (template.marks ?? exampleMarks) : []
  const usingUpload = mapMode === 'upload' && !!imageUrl
  const shownMarks = usingUpload ? [] : marks
  const markColors = useMemo(() => {
    const out: Record<string, string> = {}
    if (hab) for (const m of shownMarks) out[m.id] = TIER_COLOR[markEvidence(data, hab, m).tier]
    return out
  }, [data, hab, shownMarks])

  const options = fuelOptionsFor(data, fuel)
  const optId = opt && (opt === OTHER_FUEL || options.some((o) => o.id === opt)) ? opt : options[0]?.id ?? OTHER_FUEL
  const hit = point ? shownMarks.find((m) => inside(m, point.x, point.y)) ?? null : null

  const resetRun = () => setRun('0')
  const pick = (x: number, y: number) => {
    setPx(x.toFixed(3))
    setPy(y.toFixed(3))
    resetRun()
    const m = shownMarks.find((mm) => inside(mm, x, y))
    if (m) {
      setFuel(m.fuel_class)
      setOpt(m.fuel_option_id)
      setAir(m.airflow)
    }
  }
  const choosePlace = (id: string) => {
    setHid(id)
    setPx('')
    setPy('')
    resetRun()
  }
  const upload = (f: File | undefined) => {
    if (!f) return
    if (imageUrl) URL.revokeObjectURL(imageUrl)
    setImageUrl(URL.createObjectURL(f))
    setImageName(f.name)
    setMapMode('upload')
    resetRun()
  }

  // ---- results (computed from NASA data; the point's position does not change them)
  const mark: LayoutMark = {
    id: 'sim',
    kind: fuel === 'solid' ? 'area' : 'point',
    fuel_class: fuel,
    fuel_option_id: optId,
    label: hit?.label ?? 'Your fire point',
    airflow: air === 'vent' ? 'vent' : 'still',
    shape: { x: point?.x ?? 0.5, y: point?.y ?? 0.5, ...(fuel === 'solid' ? { w: 0, h: 0 } : {}) },
  }
  const ev = hab ? markEvidence(data, hab, mark) : null
  const air0 = hab ? defaultPoint(hab) : null
  const tasks = hab && air0 ? taskAnswers(data, hab, fuel, air0) : null
  // Nearest real tests of the chosen material when NASA tested it; otherwise of the whole fuel type.
  const chosen = optId === OTHER_FUEL ? null : options.find((o) => o.id === optId) ?? null
  const pool = chosen ? { ...data, tests: data.tests.filter((t) => chosen.test_ids.includes(t.id)) } : data
  const near = hab && air0 ? nearestTests(pool, fuel, air0, 3) : []
  const exp = expectedBehaviour(near)
  const optName = optId === OTHER_FUEL ? "Other (not in NASA's tables)" : options.find((o) => o.id === optId)?.name ?? optId
  // Step 4 (your own plan) is optional, so a chosen point makes Simulate the current step.
  const step = !hab ? 1 : !point ? 3 : lit ? 6 : 5

  return (
    <div className="sim-page">
      <div className="sim-head">
        <div>
          <p className="eyebrow">Simulation</p>
          <h1>Simulate Your Project</h1>
          <p className="lead">Pick a place, choose what could burn, click where a fire starts, and see what NASA&rsquo;s tables say about detecting, stopping and preventing it.</p>
        </div>
        <ol className="sim-steps" aria-label="Progress">
          {['Place', 'What burns', 'Fire point', 'Your plan', 'Simulate'].map((s, i) => (
            <li key={s} className={step > i + 1 ? 'done' : step === i + 1 ? 'now' : ''}>
              <span>{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
      </div>

      <div className={`sim-grid${lit ? ' has-results' : ''}`}>
        <aside className="sim-controls">
          <section className="panel sim-card">
            <h2>
              <span className="sim-n">1</span>Choose a Location
            </h2>
            <div className="sim-places">
              {data.habitats.map((h) => (
                <button key={h.id} type="button" aria-pressed={h.id === hid} className={`sim-place${h.id === hid ? ' on' : ''}`} onClick={() => choosePlace(h.id)}>
                  <PlaceArt kind={placeArt(h.id)} size={34} />
                  <span>{placeName(h.id, h.name)}</span>
                </button>
              ))}
            </div>
          </section>

          <section className={`panel sim-card${hab ? '' : ' locked'}`} aria-disabled={!hab}>
            <h2>
              <span className="sim-n">2</span>What Is Burning?
            </h2>
            <Choice
              label="Fuel type"
              value={fuel}
              onChange={(f) => {
                setFuel(f)
                setOpt('')
                resetRun()
              }}
              className="full"
              options={FUELS.map((f) => ({
                id: f,
                tone: f,
                label: (
                  <>
                    <FuelIcon fuel={f} /> {FUEL_SHORT[f]}
                  </>
                ),
              }))}
            />
            <label className="select sim-select">
              <span>{fuel === 'solid' ? 'Material' : fuel === 'droplet' ? 'Liquid' : 'Gas'} (only what NASA tested)</span>
              <select
                value={optId}
                onChange={(e) => {
                  setOpt(e.target.value)
                  resetRun()
                }}
                name="fuel-option"
              >
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} · {o.test_count} tests
                  </option>
                ))}
                <option value={OTHER_FUEL}>Other (not in NASA&rsquo;s tables)</option>
              </select>
            </label>
            <Choice
              label="Airflow"
              value={air === 'vent' ? 'vent' : 'still'}
              onChange={(v) => {
                setAir(v)
                resetRun()
              }}
              className="full"
              options={[
                { id: 'still', label: 'Still Air' },
                { id: 'vent', label: 'Near a Vent' },
              ]}
            />
            {hab && (
              <p className="sim-air mono">
                Cabin air: {hab.o2_fraction[0] === hab.o2_fraction[1] ? fmtPct(hab.o2_fraction[0], 0) : `${fmtPct(hab.o2_fraction[0], 0)} – ${fmtPct(hab.o2_fraction[1], 0)}`} oxygen ·{' '}
                {hab.pressure_psi[0] === hab.pressure_psi[1] ? `${hab.pressure_psi[0]} psi` : `${hab.pressure_psi[0]} – ${hab.pressure_psi[1]} psi`}
              </p>
            )}
          </section>

          <section className={`panel sim-card${hab ? '' : ' locked'}`} aria-disabled={!hab}>
            <h2>
              <span className="sim-n">3</span>Fire Point
            </h2>
            {point ? (
              <p>
                <b>{hit ? hit.label : 'Your fire point'}</b>
                <span className="muted small"> · {FUEL_LABEL[fuel]}, {optName}</span>
              </p>
            ) : (
              <p className="muted">Click the floor in the 3D view to place the fire. Clicking a marked item picks its material.</p>
            )}
            {point && (
              <button
                type="button"
                className="btn btn-quiet"
                onClick={() => {
                  setPx('')
                  setPy('')
                  resetRun()
                }}
              >
                Clear Point
              </button>
            )}
          </section>

          <section className={`panel sim-card${hab ? '' : ' locked'}`} aria-disabled={!hab}>
            <h2>
              <span className="sim-n">4</span>Your Own Floor Plan <small className="sim-opt">optional</small>
            </h2>
            <Choice
              label="Map"
              value={usingUpload ? 'upload' : 'example'}
              onChange={(v) => {
                setMapMode(v)
                resetRun()
              }}
              className="full"
              options={[
                { id: 'example', label: 'Example Cabin' },
                { id: 'upload', label: 'Your Floor Plan' },
              ]}
            />
            {mapMode === 'upload' && (
              <label className="sim-upload">
                <input type="file" accept="image/png,image/jpeg" onChange={(e) => upload(e.target.files?.[0])} disabled={!hab} />
                <span>{imageName ? `Using ${imageName}` : 'Upload a PNG or JPG floor plan'}</span>
                <small>Your image stays on this computer.</small>
              </label>
            )}
            {template && !usingUpload && <p className="muted small">Now showing the {template.title.toLowerCase()} (example layout, not a NASA design). Upload your own plan to place the fire on it instead.</p>}
          </section>

          <button type="button" className="btn-sim" disabled={!hab || !point} onClick={() => setRun('1')}>
            {lit ? 'Simulated ✓' : 'Simulate'}
          </button>
        </aside>

        <section className="sim-stage-wrap" aria-label="3D cabin">
          <div className="sim-stage">
            <SimStage
              template={template}
              marks={shownMarks}
              markColors={markColors}
              selectedMarkId={hit?.id ?? null}
              imageUrl={usingUpload ? imageUrl : null}
              point={point}
              fuel={fuel}
              lit={lit}
              onPick={pick}
            />
            <div className="sim-hint">{hab ? 'Drag to rotate · scroll to zoom · click the floor to place the fire' : 'Drag to rotate · choose a location to begin'}</div>
            {hab && !usingUpload && (
              <div className="sim-legend">
                {(['tested_here', 'tested_elsewhere', 'not_in_tables'] as const).map((t) => (
                  <span key={t}>
                    <i style={{ background: TIER_COLOR[t] }} />
                    {TIER_LABEL[t]}
                  </span>
                ))}
                <small>Colours show how much NASA evidence exists, not how dangerous.</small>
              </div>
            )}
          </div>
        </section>

        <aside className="sim-results" aria-live="polite">
          {!lit || !hab || !ev || !tasks ? null : (
            <>
              <div className="panel sim-card">
                <PanelHead title="Fire Started" />
                <h2 className="sim-res-title">
                  <FuelDot fuel={fuel} /> {mark.label}
                </h2>
                <p className="muted small">
                  {optName} · {placeName(hab.id, hab.name)} · {air === 'vent' ? 'near a vent' : 'still air'}
                </p>
                <span className="tier-badge" style={{ ['--tier' as string]: TIER_COLOR[ev.tier] }}>
                  {TIER_LABEL[ev.tier]}
                </span>
                <Lines items={[...ev.tested, ...ev.gap, ...ev.airflow]} data={data} />
              </div>

              <div className="panel sim-card">
                <h3>What the Nearest Real {chosen ? chosen.name : FUEL_SHORT[fuel]} Tests Did</h3>
                <ul className="sim-near">
                  {near.map((n) => (
                    <li key={n.test.id}>
                      <span className="mono">
                        {n.test.o2_fraction !== null ? fmtPct(n.test.o2_fraction) : '–'}
                        {n.test.pressure_atm !== null ? ` · ${(n.test.pressure_atm * PSI_PER_ATM).toFixed(1)} psi` : ''}
                      </span>
                      <span className="cap">{n.test.outcome ?? 'no ending recorded'}</span>
                      <TestCite test={n.test} />
                    </li>
                  ))}
                </ul>
                <p className="footnote">
                  {exp.recorded ? Object.entries(exp.counts).map(([o, c]) => `${c} ${o}`).join(' · ') : 'No ending recorded nearby.'} What they did, not a prediction.
                </p>
              </div>

              {(
                [
                  ['detection', 'Detection', 'How to spot it early', tasks.detection],
                  ['suppression', 'Suppression', 'How to stop it', tasks.suppression],
                  ['prevention', 'Prevention', 'How to keep it from starting', tasks.prevention],
                ] as const
              ).map(([k, title, what, items]) => (
                <div key={k} className={`panel sim-card task-${k}`}>
                  <h3 className="sim-task-title">
                    <span className="task-dot" aria-hidden />
                    {title}
                    <small>{what}</small>
                  </h3>
                  <Lines items={items as Statement[]} data={data} />
                </div>
              ))}
              <p className="footnote">
                Where you start the fire does not change the evidence: one cabin shares one air. NASA&rsquo;s tables do not model how fire spreads; the glow is an illustration.
              </p>
            </>
          )}
        </aside>
      </div>
    </div>
  )
}
