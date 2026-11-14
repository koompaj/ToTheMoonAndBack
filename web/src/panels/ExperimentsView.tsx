// OWNER: dashboard + AI workstream.
// "Experiments": one page for NASA's fire experiments and the tests they ran.
//   #experiments              the 24 experiments as cards (pillar and search filters)
//   #experiments?tq=PMMA      experiments that hold a test matching PMMA
//   #experiments?id=PSI-25    one experiment: what it was for, and every test it ran
import type { AppData } from '../types/data'
import type { AiContent } from '../ai/content'
import { fmtPct, fmtPsi, investigationStats, shortName } from '../ai/evidence'
import { DoiCite } from './Cite'
import { InvestigationsView } from './InvestigationsView'
import { TestsView } from './TestsView'
import { useHashParam } from './route'
import { RingedPlanet } from './SpaceArt'
import { FuelTag, PanelHead, PillarTag } from './ui'

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
