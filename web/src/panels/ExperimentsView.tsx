// OWNER: dashboard + AI workstream.
// "Experiments": one page for NASA's fire experiments and the tests they ran.
//   #experiments              the 24 experiments as cards (pillar and search filters)
//   #experiments?tq=PMMA      experiments that hold a test matching PMMA
//   #experiments?id=PSI-25    one experiment: what it was for, and every test it ran
import type { AppData, Investigation, Sensor, SensorKind, Test } from '../types/data'
import { shapeCounts } from '../data/load'
import type { AiContent } from '../ai/content'
import { fmtPct, fmtPsi, investigationStats, shortName } from '../ai/evidence'
import { DoiCite, UserMark } from './Cite'
import { isUserInvestigation } from './uploads'
import { InvestigationsView } from './InvestigationsView'
import { TestsView } from './TestsView'
import { useHashParam } from './route'
import { RingedPlanet } from './SpaceArt'
import { FuelTag, PanelHead, PillarTag } from './ui'


const SENSOR_LABEL: Record<SensorKind, string> = {
  thermocouple: 'Temperature (thermocouples)',
  radiometer: 'Radiant heat (radiometers)',
  pressure: 'Pressure',
  oxygen: 'Oxygen',
  co2: 'Carbon dioxide',
  flow: 'Airflow',
  camera: 'Cameras',
  spectral: 'Spectral',
  smoke: 'Smoke',
  soot: 'Soot',
  humidity: 'Humidity',
  other: 'Other',
}

/** Item 5: what NASA measured, grouped by kind, each line with its file and page. Hidden when absent. */
function Sensors({ inv }: { inv: Investigation }) {
  const list = inv.sensors ?? []
  if (!list.length) return null
  const groups = new Map<SensorKind, Sensor[]>()
  for (const x of list) groups.set(x.kind, [...(groups.get(x.kind) ?? []), x])
  return (
    <article className="panel exp-text">
      <h2>What NASA Measured</h2>
      <p className="muted small">From NASA&rsquo;s reports and sensor logs.</p>
      <div className="sensor-groups">
        {[...groups.entries()].map(([kind, items]) => (
          <div key={kind}>
            <h3>{SENSOR_LABEL[kind] ?? kind}</h3>
            <ul className="sensor-list">
              {items.map((x, i) => (
                <li key={i} title={x.quote ?? undefined}>
                  <b>{x.name}</b>
                  {x.detail && <span className="muted"> · {x.detail}</span>}
                  <span className="cite sensor-src">
                    {x.source_file} · {x.source_where}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </article>
  )
}

/** Item 7: conditions that changed between tests, and those held fixed. Hidden when absent. */
function Varied({ inv }: { inv: Investigation }) {
  const list = inv.varied ?? []
  if (!list.length) return null
  const changed = list.filter((v) => v.distinct > 1)
  const fixed = list.filter((v) => v.distinct === 1)
  const range = (v: (typeof list)[number]) =>
    v.min !== null && v.max !== null
      ? `${v.min}${v.unit && v.unit !== '%' ? ' ' : ''}${v.unit ?? ''} to ${v.max}${v.unit && v.unit !== '%' ? ' ' : ''}${v.unit ?? ''}`
      : (v.values ?? []).join(', ') + (v.values && v.distinct > v.values.length ? ` (+${v.distinct - v.values.length} more)` : '')
  return (
    <article className="panel exp-text">
      <h2>What Varied Between Tests</h2>
      {changed.length > 0 && (
        <ul className="varied-list">
          {changed.map((v) => (
            <li key={v.field}>
              <b>{v.label}</b>
              <span>{range(v)}</span>
              <span className="muted small">
                recorded in {v.recorded} of {v.total} tests
              </span>
            </li>
          ))}
        </ul>
      )}
      {fixed.length > 0 && (
        <p className="muted small">
          Held fixed: {fixed.map((v) => `${v.label} ${range(v)}`).join('; ')}.
        </p>
      )}
    </article>
  )
}

/** Item 10: distinct fuel shapes with counts (A's shapeCounts). Hidden when no shape is stated. */
function Shapes({ tests }: { tests: Test[] }) {
  const counts = shapeCounts(tests)
  if (!counts.length) return null
  return (
    <p className="fuel-shapes">
      <b>Fuel shapes:</b> {counts.map(([shape, n]) => `${shape} (${n})`).join(', ')}
    </p>
  )
}

function ExperimentDetail({ data, id }: { data: AppData; id: string }) {
  const s = investigationStats(data).find((x) => x.inv.accession === id)
  if (!s)
    return (
      <section className="view">
        <p className="empty-state">
          No experiment {id}. <a href="#experiments">Back to all experiments</a>
        </p>
      </section>
    )
  const { inv } = s
  const fuels = [...new Set(s.tests.map((t) => t.fuel_class))]
  const other = data.otherTables.filter((o) => o.investigation === id)
  const related = inv.related.map((r) => data.investigations.find((i) => i.accession === r)).filter((i) => i !== undefined)
  const text: [string, string | null][] = [
    ['What it was for', inv.objectives],
    ['How it was done', inv.approach],
    ['What it expected', inv.hypothesis],
    ['Why it matters (space and Earth)', inv.earth_benefits],
  ]

  return (
    <section className="view" aria-labelledby="exp-title">
      <nav className="crumbs" aria-label="Breadcrumb">
        <a href="#experiments">Experiments</a> <span aria-hidden>›</span> <span aria-current="page">{shortName(inv)}</span>
      </nav>
      <div className="view-hero">
        <PanelHead title={`Experiment · ${inv.accession}`} />
        <div className="view-head">
          <div className="view-head-text">
            <h1 id="exp-title">{shortName(inv)}</h1>
            {inv.acronym && <p className="lead">{inv.title}</p>}
            <div className="chips">
              {isUserInvestigation(inv) && <UserMark label="User-uploaded, not NASA data" />}
              <PillarTag pillar={inv.pillar} />
              {fuels.map((f) => (
                <FuelTag key={f} fuel={f} />
              ))}
              {inv.flight_platform && <span className="tag tag-none">{inv.flight_platform}</span>}
            </div>
            <dl className="facts">
              <div>
                <dt>Tests</dt>
                <dd>{s.tests.length || '–'}</dd>
              </div>
              <div>
                <dt>Max oxygen</dt>
                <dd>{s.maxAmbientO2 !== null ? fmtPct(s.maxAmbientO2) : '–'}</dd>
              </div>
              <div>
                <dt>Min pressure</dt>
                <dd>{s.minPressureAtm !== null ? fmtPsi(s.minPressureAtm) : '–'}</dd>
              </div>
              <div>
                <dt>Papers in PSI</dt>
                <dd>{s.pubs}</dd>
              </div>
            </dl>
            <div className="exp-links">
              <DoiCite inv={inv} />
              <a className="link" href={inv.page} target="_blank" rel="noreferrer">
                Open NASA's Record ↗
              </a>
            </div>
          </div>
          <div className="view-art">
            <RingedPlanet size={180} />
          </div>
        </div>
      </div>

      <div className="exp-grid">
        {text
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <article key={k} className="panel exp-text">
              <h2>{k}</h2>
              <p>{v}</p>
            </article>
          ))}
        <article className="panel exp-text">
          <h2>Hardware and Links</h2>
          <p>
            {inv.hardware_link ? (
              <a href={inv.hardware_link} target="_blank" rel="noreferrer">
                {inv.hardware ?? 'Hardware'}
              </a>
            ) : (
              inv.hardware ?? 'Hardware not listed'
            )}
            {inv.flight_platform ? `, ${inv.flight_platform}` : ''}.
          </p>
          {related.length > 0 && (
            <p>
              Related:{' '}
              {related.map((r, i) => (
                <span key={r.accession}>
                  {i > 0 && ', '}
                  <a href={`#experiments?id=${r.accession}`}>{shortName(r)}</a>
                </span>
              ))}
            </p>
          )}
          {inv.publications.length > 0 && (
            <details>
              <summary>Papers Listed in PSI ({inv.publications.length})</summary>
              <ul className="pub-list">
                {inv.publications.map((p, i) => (
                  <li key={i}>{p.doi ? <a href={`https://doi.org/${p.doi}`} target="_blank" rel="noreferrer">{p.title ?? p.doi}</a> : p.title}</li>
                ))}
              </ul>
            </details>
          )}
        </article>
      </div>

      <div className="exp-grid">
        <Varied inv={inv} />
        <Sensors inv={inv} />
      </div>
      <Shapes tests={s.tests} />

      {s.tests.length > 0 ? (
        <div className="panel">
          <TestsView data={data} lockedInv={id} embedded />
        </div>
      ) : (
        <div className="panel">
          <h2>Tests</h2>
          {other.length === 0 ? (
            <p className="muted">This experiment has no experimental table in NASA's database, so there are no individual tests to show.</p>
          ) : (
            other.map((o) => (
              <div key={o.source_table}>
                <p className="muted">{o.why_not_tests} Shown exactly as NASA published it.</p>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        {o.columns.map((c) => (
                          <th key={c}>{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {o.rows.slice(0, 60).map((r, i) => (
                        <tr key={i}>
                          {r.map((c, j) => (
                            <td key={j}>{c}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {o.rows.length > 60 && <p className="footnote">First 60 of {o.rows.length} rows.</p>}
                {o.known_issues.length > 0 && <p className="footnote">Known issues: {o.known_issues.join(' ')}</p>}
              </div>
            ))
          )}
        </div>
      )}
    </section>
  )
}

export function ExperimentsView({ data, ai }: { data: AppData; ai: AiContent }) {
  const [id] = useHashParam('id', '')
  return id ? <ExperimentDetail data={data} id={id} /> : <InvestigationsView data={data} ai={ai} />
}
