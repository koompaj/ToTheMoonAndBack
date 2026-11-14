// OWNER: dashboard + AI workstream.
// "Simulation": set the cabin's conditions (oxygen, pressure, airflow, gravity; a place fills in
// its own air as a starting point), see the example cabin in 3D (or upload your own floor plan),
// choose what is burning, place the fire, press Simulate. The side bar shows what NASA's tables
// say: evidence for that material in that air (markEvidence, from workstream A), what the nearest
// real tests did, and the three tasks (detection, suppression, prevention), every line cited.
// Evidence is worked out per listed place, so hand-set values change it only by changing which
// place they fall in (data/placeMatch.ts); outside every place the evidence colours are off and
// the nearest real tests are listed with how far away they are. The fire is an illustration:
// NASA's tables do not model spread, and where the fire starts does not change the evidence.
// The tab name "Simulation" was the team lead's call (see the pull request).
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AppData, FuelClass, Habitat } from '../types/data'
import type { Layout, LayoutMark } from '../types/layout'
import type { CabinStageProps, SimPoint, StageFire } from '../types/sim'
import { OTHER_FUEL, TIER_COLOR, TIER_LABEL } from '../types/layout'
import { fuelOptionsFor, markEvidence } from '../data/layoutEvidence'
import { evidencePlace, placesContaining } from '../data/placeMatch'
import { defaultPoint, expectedBehaviour, nearestTests, taskAnswers, type Statement } from '../ai/fireTasks'
import { fmtPct, PSI_PER_ATM } from '../ai/evidence'
import { SentenceCites, TestCite } from './Cite'
import { useHashParam } from './route'
import { placeName } from './places'
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

const clampTo = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
/** A number from the URL, or the fallback when it is missing or not a number. */
const numberOr = (text: string, fallback: number, lo: number, hi: number) => (text !== '' && Number.isFinite(Number(text)) ? clampTo(Number(text), lo, hi) : fallback)

/** One condition: a typed value and a slider that move together. */
function Condition({ label, unit, value, min, max, step, digits, onChange }: { label: string; unit: string; value: number; min: number; max: number; step: number; digits: number; onChange: (v: number) => void }) {
  // While a value is being typed, keep the text as typed; apply it as soon as it is in range.
  const [draft, setDraft] = useState<string | null>(null)
  const shown = value.toFixed(digits)
  return (
    <div className="cond">
      <label className="cond-top">
        <span>{label}</span>
        <span className="cond-value">
          <input
            type="number"
            className="cond-num mono"
            value={draft ?? shown}
            min={min}
            max={max}
            step={step}
            aria-label={`${label}, ${unit}`}
            onChange={(e) => {
              setDraft(e.target.value)
              const v = Number(e.target.value)
              if (e.target.value !== '' && Number.isFinite(v) && v >= min && v <= max) onChange(v)
            }}
            onBlur={() => setDraft(null)}
          />
          <span className="cond-unit">{unit}</span>
        </span>
      </label>
      <input type="range" min={min} max={max} step={step} value={clampTo(value, min, max)} onChange={(e) => onChange(Number(e.target.value))} aria-label={`${label} slider`} />
    </div>
  )
}

function inside(m: LayoutMark, x: number, y: number) {
  if (m.kind === 'area') return x >= m.shape.x && x <= m.shape.x + (m.shape.w ?? 0) && y >= m.shape.y && y <= m.shape.y + (m.shape.h ?? 0)
  return Math.hypot(x - m.shape.x, y - m.shape.y) < 0.06
}

/** `renderStage` draws workstream B's cabin stage (passed in by App.tsx, because panels/ does not
 *  import from scene/). Without it the page falls back to its own SimStage and example templates. */
export function SimulationView({ data, renderStage }: { data: AppData; renderStage?: (p: CabinStageProps) => ReactNode }) {
  const [hid, setHid] = useHashParam('h', '')
  const [mapMode, setMapMode] = useHashParam('map', 'example')
  const [fuelStr, setFuel] = useHashParam('fuel', 'solid')
  const [opt, setOpt] = useHashParam('opt', '')
  const [o2Str, setO2] = useHashParam('o2', '')
  const [pStr, setP] = useHashParam('p', '')
  const [flowStr, setFlow] = useHashParam('flow', '0')
  const [gStr, setG] = useHashParam('g', '0')
  const [pxStr, setPx] = useHashParam('px', '')
  const [pyStr, setPy] = useHashParam('py', '')
  const [run, setRun] = useHashParam('run', '0')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageName, setImageName] = useState<string | null>(null)
  const [exampleMarks, setExampleMarks] = useState<LayoutMark[]>([])
  const [cabinMarks, setCabinMarks] = useState<LayoutMark[]>([])

  // ---- cabin conditions. A place only fills in starting values; the sliders are the truth.
  const picked = data.habitats.find((h) => h.id === hid) ?? null
  const start = defaultPoint(picked ?? data.habitats[0])
  const o2 = numberOr(o2Str, start.o2Fraction, 0.1, 1)
  const pAtm = numberOr(pStr, start.pressureAtm, 0.2, 5)
  const flow = numberOr(flowStr, 0, 0, 50)
  const gravity = numberOr(gStr, 0, 0, 1)
  const started = hid !== '' || o2Str !== '' || pStr !== ''
  // Evidence is per listed place: find the place these values are the air of, if any.
  const matches = useMemo(() => placesContaining(data.habitats, o2, pAtm), [data.habitats, o2, pAtm])
  const hab = started ? evidencePlace(matches, hid) : null
  // The list shows a place only while the values are still its air.
  const pickedFits = matches.some((m) => m.id === hid)
  const air0: SimPoint = { o2Fraction: o2, pressureAtm: pAtm }
  const fuel = (FUELS.includes(fuelStr as FuelClass) ? fuelStr : 'solid') as FuelClass
  const template = started ? templateFor(hab?.id ?? '') : null
  const point = pxStr && pyStr ? { x: Number(pxStr), y: Number(pyStr) } : null
  const lit = run === '1' && !!point

  // Moon layouts use workstream A's example file.
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}layouts/example-moon-habitat.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((l: Layout | null) => l && setExampleMarks(l.marks))
      .catch(() => undefined)
    // B's sample spacecraft: one example layout shown for every place.
    fetch(`${import.meta.env.BASE_URL}layouts/example-spacecraft.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((l: Layout | null) => l && setCabinMarks(l.marks))
      .catch(() => undefined)
  }, [])
  useEffect(() => () => void (imageUrl && URL.revokeObjectURL(imageUrl)), [imageUrl])

  const marks = !template ? [] : renderStage ? cabinMarks : (template.marks ?? exampleMarks)
  const layoutTitle = renderStage ? 'example spacecraft' : template?.title.toLowerCase()
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
    }
  }
  /** Picking a place fills in its air. The fire point and the run are left as they are. */
  const choosePlace = (id: string) => {
    setHid(id)
    const place = data.habitats.find((h) => h.id === id)
    if (!place) return
    const d = defaultPoint(place)
    setO2(d.o2Fraction.toFixed(4))
    setP(d.pressureAtm.toFixed(4))
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
    airflow: flow > 0 ? 'vent' : 'still',
    shape: { x: point?.x ?? 0.5, y: point?.y ?? 0.5, ...(fuel === 'solid' ? { w: 0, h: 0 } : {}) },
  }
  const ev = hab ? markEvidence(data, hab, mark) : null
  // The task answers are worked out for the values set; they need a place only as a name.
  const psiNow = pAtm * PSI_PER_ATM
  const namedPlace: Habitat = hab ?? { id: 'custom', name: 'Your values', o2_fraction: [o2, o2], pressure_psi: [psiNow, psiNow], pressure_atm: [pAtm, pAtm], note: '', source: '', status: 'custom' }
  const tasks = started ? taskAnswers(data, namedPlace, fuel, air0) : null
  // Nearest real tests of the chosen material when NASA tested it; otherwise of the whole fuel type.
  const chosen = optId === OTHER_FUEL ? null : options.find((o) => o.id === optId) ?? null
  const pool = chosen ? { ...data, tests: data.tests.filter((t) => chosen.test_ids.includes(t.id)) } : data
  const near = started ? nearestTests(pool, fuel, air0, 3) : []
  const exp = expectedBehaviour(near)
  const stageFire: StageFire | null = started ? { o2Fraction: o2, pressureAtm: pAtm, airflow: flow > 0 ? 'vent' : 'still', airflowCmS: flow, gravity, behaviour: exp.behaviour } : null
  const placeLabel = hab ? placeName(hab.id, hab.name) : 'your values'
  const optName = optId === OTHER_FUEL ? "Other (not in NASA's tables)" : options.find((o) => o.id === optId)?.name ?? optId
  // Step 4 (your own plan) is optional, so a chosen point makes Simulate the current step.
  const step = !started ? 1 : !point ? 3 : lit ? 6 : 5

  return (
    <div className="sim-page">
      <div className="sim-head">
        <div>
          <p className="eyebrow">Simulation</p>
          <h1>Simulate Your Project</h1>
          <p className="lead">Set the cabin&rsquo;s air, choose what could burn, place a fire, and see what NASA&rsquo;s tables say about detecting, stopping and preventing it.</p>
        </div>
        <ol className="sim-steps" aria-label="Progress">
          {['Conditions', 'What burns', 'Fire point', 'Your plan', 'Simulate'].map((s, i) => (
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
              <span className="sim-n">1</span>Cabin Conditions
            </h2>
            <label className="select sim-select">
              <span>Start from a place (optional)</span>
              <select value={pickedFits ? hid : ''} onChange={(e) => choosePlace(e.target.value)} name="place">
                <option value="">{started && !pickedFits ? 'Custom values (choose a place to reset)' : 'Choose a place to fill in its air'}</option>
                {data.habitats.map((h) => (
                  <option key={h.id} value={h.id}>
                    {placeName(h.id, h.name)}
                  </option>
                ))}
              </select>
            </label>
            <Condition label="Cabin oxygen" unit="%" value={o2 * 100} min={10} max={100} step={0.5} digits={1} onChange={(v) => setO2((v / 100).toFixed(4))} />
            <Condition label="Pressure" unit="psi" value={psiNow} min={3} max={73.4} step={0.1} digits={1} onChange={(v) => setP((v / PSI_PER_ATM).toFixed(4))} />
            <Condition label="Airflow" unit="cm/s" value={flow} min={0} max={50} step={1} digits={0} onChange={(v) => setFlow(String(v))} />
            <Condition label="Gravity" unit="% of Earth" value={gravity * 100} min={0} max={100} step={1} digits={0} onChange={(v) => setG((v / 100).toFixed(2))} />
            {!started ? (
              <p className="muted small">Pick a place or move a slider to begin.</p>
            ) : hab ? (
              <p className="sim-match">
                These values are the air of: <b>{matches.map((m) => placeName(m.id, m.name)).join(', ')}</b>.
                {matches.length > 1 && <> Evidence is shown for {placeName(hab.id, hab.name)}.</>}
              </p>
            ) : (
              <p className="sim-warn" role="status">
                Not the air of any listed place. Evidence colours are off. The nearest real tests are listed with how far away they are.
              </p>
            )}
            <p className="muted small">
              A place is matched at the values shown (oxygen to 0.1 %, pressure to 0.1 psi). Gravity changes only the picture: every PSI test ran in microgravity. Airflow above 0 counts as
              &ldquo;near a vent&rdquo; for the evidence; its speed changes only the picture.
            </p>
          </section>

          <section className={`panel sim-card${started ? '' : ' locked'}`} aria-disabled={!started}>
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
          </section>

          <section className={`panel sim-card${started ? '' : ' locked'}`} aria-disabled={!started}>
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

          <section className={`panel sim-card${started ? '' : ' locked'}`} aria-disabled={!started}>
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
                <input type="file" accept="image/png,image/jpeg" onChange={(e) => upload(e.target.files?.[0])} disabled={!started} />
                <span>{imageName ? `Using ${imageName}` : 'Upload a PNG or JPG floor plan'}</span>
                <small>Your image stays on this computer.</small>
              </label>
            )}
            {template && !usingUpload && <p className="muted small">Now showing the {layoutTitle} (example layout, not a NASA design). Upload your own plan to place the fire on it instead.</p>}
          </section>

          <button type="button" className="btn-sim" disabled={!started || !point} onClick={() => setRun('1')}>
            {lit ? 'Simulated ✓' : 'Simulate'}
          </button>
        </aside>

        <section className="sim-stage-wrap" aria-label="3D cabin">
          <div className="sim-stage">
            {renderStage ? (
              renderStage({ placeChosen: started, marks: shownMarks, markColors, selectedMarkId: hit?.id ?? null, imageUrl: usingUpload ? imageUrl : null, point, fuel, lit, fire: stageFire, onPick: pick })
            ) : (
              <SimStage
                template={template}
                marks={shownMarks}
                markColors={markColors}
                selectedMarkId={hit?.id ?? null}
                imageUrl={usingUpload ? imageUrl : null}
                point={point}
                fuel={fuel}
                lit={lit}
                fire={stageFire}
                onPick={pick}
              />
            )}
            <div className="sim-hint">
              {!started ? 'Drag to rotate · set the cabin conditions to begin' : renderStage ? 'Drag to rotate · scroll to zoom · double-click the cabin to place the fire' : 'Drag to rotate · scroll to zoom · click the floor to place the fire'}
            </div>
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
          {!lit || !started || !tasks ? null : (
            <>
              <div className="panel sim-card">
                <PanelHead title="Fire Started" />
                <h2 className="sim-res-title">
                  <FuelDot fuel={fuel} /> {mark.label}
                </h2>
                <p className="muted small">
                  {optName} · {placeLabel} · {fmtPct(o2)} oxygen, {psiNow.toFixed(1)} psi · {flow > 0 ? `${flow} cm/s airflow` : 'still air'}
                </p>
                {ev ? (
                  <>
                    <span className="tier-badge" style={{ ['--tier' as string]: TIER_COLOR[ev.tier] }}>
                      {TIER_LABEL[ev.tier]}
                    </span>
                    <Lines items={[...ev.tested, ...ev.gap, ...ev.airflow]} data={data} />
                  </>
                ) : (
                  <p className="sim-warn" role="status">
                    Not the air of any listed place, so there is no place-based evidence for these values. The nearest real tests are below, with how far away they are.
                  </p>
                )}
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
                      <span className="muted small">
                        {n.o2Points.toFixed(1)} pts{n.oxygenOnly ? '' : ` · ${n.psiGap.toFixed(1)} psi`} away
                      </span>
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
