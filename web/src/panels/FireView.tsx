// OWNER: dashboard + AI workstream.
// Steps 3 and 4 of the flow: one fuel type in one place. The user sets oxygen, pressure, airflow
// and gravity (or, once workstream B's map lands, clicks a point on the habitat map); the page
// shows an illustrated 3D fire (B's component), what the nearest real NASA tests did, and
// data-first answers to the three fire-safety tasks. Nothing here is a physics simulation: the
// "expected behaviour" is what the nearest real tests did, and it says so.
import { useMemo, type ReactNode } from 'react'
import type { AppData, FuelClass } from '../types/data'
import type { FireModelProps, SimPoint } from '../types/sim'
import type { AiContent } from '../ai/content'
import { defaultPoint, expectedBehaviour, nearestTests, taskAnswers, type Statement } from '../ai/fireTasks'
import { fmtPct, PSI_PER_ATM } from '../ai/evidence'
import { SentenceCites, TestCite } from './Cite'
import { useHashParam } from './route'
import { placeArt, placeName } from './places'
import { PlaceArt } from './SpaceArt'
import { Choice, FUEL_LABEL, FUEL_SHORT, FuelDot, PanelHead, FuelIcon } from './ui'

const FUELS: FuelClass[] = ['gas', 'droplet', 'solid']
const BEHAVIOUR_TEXT = {
  'went-out': { label: 'Flames mostly went out', tone: 'evidence' },
  'kept-burning': { label: 'Flames mostly burned to the end', tone: 'gap' },
  mixed: { label: 'No clear outcome nearby', tone: 'accent' },
  unknown: { label: 'No ending recorded nearby', tone: 'muted' },
} as const

function TaskCard({ title, tone, what, items, ai, data }: { title: string; tone: string; what: string; items: Statement[]; ai?: { text: string; cites: string[] }[]; data: AppData }) {
  return (
    <article className={`task-card task-${tone}`}>
      <header>
        <span className="task-dot" aria-hidden />
        <h3>{title}</h3>
      </header>
      <p className="task-what">{what}</p>
      <ul className="task-list">
        {items.map((s, i) => (
          <li key={i} className={s.kind === 'gap' ? 'gap' : ''}>
            {s.text} <SentenceCites sentence={s} data={data} />
          </li>
        ))}
      </ul>
      {ai && ai.length > 0 && (
        <div className="task-ai">
          <span className="badge warn">AI Suggestion, Draft</span>
          {ai.map((s, i) => (
            <p key={i}>
              {s.text} <SentenceCites sentence={s} data={data} />
            </p>
          ))}
        </div>
      )}
    </article>
  )
}

function Slider({ label, value, min, max, step, onChange, show }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; show: string }) {
  return (
    <label className="ctl">
      <span className="ctl-top">
        <span>{label}</span>
        <b className="mono">{show}</b>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} />
    </label>
  )
}

export function FireView({
  data,
  ai,
  renderFire,
}: {
  data: AppData
  ai: AiContent
  renderFire: (p: FireModelProps) => ReactNode
}) {
  const [hid] = useHashParam('h', 'moon_base')
  const [fuelStr, setFuel] = useHashParam('fuel', 'gas')
  const hab = data.habitats.find((h) => h.id === hid) ?? data.habitats[0]
  const fuel = (FUELS.includes(fuelStr as FuelClass) ? fuelStr : 'gas') as FuelClass
  const def = defaultPoint(hab)
  const [o2Str, setO2] = useHashParam('o2', def.o2Fraction.toFixed(3))
  const [pStr, setP] = useHashParam('p', def.pressureAtm.toFixed(3))
  const [airStr, setAir] = useHashParam('air', '0')
  const [gStr, setG] = useHashParam('g', '0')
  const point: SimPoint = { o2Fraction: Number(o2Str) || def.o2Fraction, pressureAtm: Number(pStr) || def.pressureAtm }
  const airflow = Number(airStr) || 0
  const gravity = Number(gStr) || 0

  const near = useMemo(() => nearestTests(data, fuel, point, 5), [data, fuel, point.o2Fraction, point.pressureAtm])
  const exp = expectedBehaviour(near)
  const tasks = useMemo(() => taskAnswers(data, hab, fuel, point), [data, hab, fuel, point.o2Fraction, point.pressureAtm])
  const aiTasks = ai.fire?.items[`${hab.id}:${fuel}`]
  const inBox =
    point.o2Fraction >= hab.o2_fraction[0] && point.o2Fraction <= hab.o2_fraction[1] && point.pressureAtm >= hab.pressure_atm[0] && point.pressureAtm <= hab.pressure_atm[1]
  const name = placeName(hab.id, hab.name)
  const pick = (p: SimPoint) => {
    setO2(p.o2Fraction.toFixed(3))
    setP(p.pressureAtm.toFixed(3))
  }
  const reset = () => pick(def)
  const b = BEHAVIOUR_TEXT[exp.behaviour]

  return (
    <section className="view" aria-labelledby="fire-title">
      <nav className="crumbs" aria-label="Breadcrumb">
        <a href="#map">Home</a> <span aria-hidden>›</span> <a href={`#place?h=${hab.id}`}>{name}</a> <span aria-hidden>›</span>{' '}
        <span aria-current="page">{FUEL_LABEL[fuel]}</span>
      </nav>

      <div className="fire-head">
        <div>
          <p className="eyebrow">Step 3 · Fire Illustration</p>
          <h1 id="fire-title">
            <FuelDot fuel={fuel} /> {FUEL_SHORT[fuel]} Fire in {name}
          </h1>
        </div>
        <div className="fuel-switch">
          <span className="fuel-switch-label">What is burning?</span>
          <Choice
            label="Fuel type"
            value={fuel}
            onChange={(f) => setFuel(f)}
            className="big"
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
        </div>
      </div>

      <div className="fire-grid">
        <div className="panel fire-model">
          <PanelHead title="Fire Model" />
          <div className="fire-stage">
            {renderFire({ params: { fuel, o2Fraction: point.o2Fraction, pressureAtm: point.pressureAtm, airflowCmS: airflow, gravity }, behaviour: exp.behaviour })}
            <span className="fire-label">Illustration, not a simulation</span>
          </div>
          <div className="controls">
            <Slider label="Cabin oxygen" value={point.o2Fraction} min={0.1} max={1} step={0.005} onChange={(v) => setO2(v.toFixed(3))} show={fmtPct(point.o2Fraction)} />
            <Slider
              label="Pressure"
              value={point.pressureAtm}
              min={0.2}
              max={5}
              step={0.01}
              onChange={(v) => setP(v.toFixed(3))}
              show={`${(point.pressureAtm * PSI_PER_ATM).toFixed(1)} psi`}
            />
            <Slider label="Airflow" value={airflow} min={0} max={50} step={1} onChange={(v) => setAir(String(v))} show={`${airflow} cm/s`} />
            <Slider label="Gravity" value={gravity} min={0} max={1} step={0.01} onChange={(v) => setG(v.toFixed(2))} show={gravity === 0 ? 'Microgravity' : gravity === 1 ? 'Earth' : `${Math.round(gravity * 100)} % of Earth`} />
          </div>
          <div className="ctl-foot">
            <span className={`badge ${inBox ? 'accent' : ''}`}>{inBox ? `Inside ${name} air` : `Outside ${name} air`}</span>
            <button type="button" className="btn btn-quiet" onClick={reset}>
              Reset to {name} Air
            </button>
          </div>
          <p className="footnote">Airflow and gravity change only the illustration: every PSI test here ran in microgravity.</p>
        </div>

        <div className="panel behaviour">
          <PanelHead title="Expected Behaviour" />
          <p className={`behaviour-verdict t-${b.tone}`}>{b.label}</p>
          {exp.recorded > 0 && (
            <p className="behaviour-counts">
              {Object.entries(exp.counts)
                .sort((a, z) => z[1] - a[1])
                .map(([o, c]) => `${c} ${o}`)
                .join(' · ')}
            </p>
          )}
          <p className="muted small">
            From the {near.length} nearest real NASA {fuel} tests to this point
            {near[0]?.oxygenOnly ? ' (by oxygen only: solid tables record no pressure)' : ''}. What they did, not a prediction.
          </p>
          <ul className="near-tests">
            {near.map((n) => (
              <li key={n.test.id}>
                <span className="nt-cond mono">
                  {n.test.o2_fraction !== null ? fmtPct(n.test.o2_fraction) : '–'}
                  {n.test.pressure_atm !== null ? ` · ${(n.test.pressure_atm * PSI_PER_ATM).toFixed(1)} psi` : ''}
                </span>
                <span className="nt-out">{n.test.outcome ?? <span className="muted">no ending recorded</span>}</span>
                <span className="nt-gap muted small">
                  {n.o2Points.toFixed(1)} pts{n.oxygenOnly ? '' : ` · ${n.psiGap.toFixed(1)} psi`} away
                </span>
                <TestCite test={n.test} />
              </li>
            ))}
            {near.length === 0 && <li className="muted">No {fuel} test in the tables records oxygen.</li>}
          </ul>
        </div>
      </div>

      <a className="btn-sim cta-sim" href={`#simulation?h=${hab.id}&fuel=${fuel}`}>
        Simulate Your Project!
        <small>Place this fire in a 3D cabin or your own floor plan</small>
      </a>

      <section aria-labelledby="tasks-title">
        <h2 id="tasks-title" className="section-title">
          The Three Fire-Safety Tasks
        </h2>
        <div className="task-grid">
          <TaskCard title="Detection" tone="detection" what="How to spot this fire early." items={tasks.detection} ai={aiTasks?.detection} data={data} />
          <TaskCard title="Suppression" tone="suppression" what="How to stop it once it starts." items={tasks.suppression} ai={aiTasks?.suppression} data={data} />
          <TaskCard title="Prevention" tone="prevention" what="How to keep it from starting." items={tasks.prevention} ai={aiTasks?.prevention} data={data} />
        </div>
        <p className="footnote">Grey chips open the NASA row or record behind each line. Coral lines are gaps: not in the tables.</p>
      </section>

    </section>
  )
}
