// OWNER: dashboard + AI workstream.
// One card per PSI combustion investigation, in plain language, navigable by NASA's fire-safety
// pillars (prevention, detection, suppression). Pillars are shown only where the challenge page
// states them; nothing is classified by guesswork.
import { RingedPlanet } from './SpaceArt'
import { useMemo } from 'react'
import type { AppData, Pillar } from '../types/data'
import type { AiContent } from '../ai/content'
import { fmtPct, fmtPsi, investigationStats, shortName, type InvestigationStats } from '../ai/evidence'
import { DoiCite, SentenceCites } from './Cite'
import { useHashParam } from './route'
import { Choice, FuelTag, PILLAR_HINT, PillarTag, ViewHead } from './ui'
import { ComparePanel, useCompare, type CompareMode } from './CompareDrawer'
import type { Test } from '../types/data'

type Filter = Pillar | 'unstated' | 'all'

function clip(text: string | null, max: number) {
  if (!text) return null
  const t = text.replace(/\s+/g, ' ').trim()
  return t.length > max ? `${t.slice(0, max).replace(/\s+\S*$/, '')}…` : t
}

function Card({ s, data, ai, testQuery, matches }: { s: InvestigationStats; data: AppData; ai: AiContent; testQuery: string; matches: Test[] }) {
  const [cmp, toggleCmp] = useCompare()
  const starred = cmp.includes(s.inv.accession)
  const { inv } = s
  const aiItem = ai.investigations?.items[inv.accession]
  const fuels = [...new Set(s.tests.map((t) => t.fuel_class))]
  const fuelClass = inv.fuel_class ?? (fuels.length === 1 ? fuels[0] : null)
  return (
    <article className={`inv-card pillar-edge-${inv.pillar ?? 'none'}`}>
      <header>
        <div className="inv-title">
          <h2>
            <a className="card-link" href={`#experiments?id=${inv.accession}`}>
              {shortName(inv)}
            </a>
          </h2>
          <button
            type="button"
            className={`star-btn star-corner${starred ? ' on' : ''}`}
            aria-pressed={starred}
            aria-label={starred ? `Remove ${shortName(inv)} from compare` : `Add ${shortName(inv)} to compare`}
            onClick={() => toggleCmp(inv.accession)}
          >
            {starred ? '★ Comparing' : '☆ Compare'}
          </button>
        </div>
        <span className="mono muted inv-acc">{inv.accession}</span>
        <div className="chips">
          <PillarTag pillar={inv.pillar} />
          <FuelTag fuel={fuelClass} />
          <span className="tag tag-none">{inv.project_type?.replace(' Investigation', '') ?? 'Type not listed'}</span>
        </div>
      </header>
      {inv.acronym && <p className="inv-full">{inv.title}</p>}
      <dl className="facts">
        <div>
          <dt>Tests</dt>
          <dd>{s.tests.length || '–'}</dd>
        </div>
        <div>
          <dt>Table rows</dt>
          <dd>{s.tableRows || '–'}</dd>
        </div>
        <div>
          <dt>Papers</dt>
          <dd>{s.pubs}</dd>
        </div>
        <div>
          <dt>Released</dt>
          <dd>{s.releaseYear ?? '–'}</dd>
        </div>
      </dl>
      {(s.maxAmbientO2 !== null || s.minPressureAtm !== null || s.airflowTests > 0) && (
        <div className="cond-pills">
          {s.maxAmbientO2 !== null && (
            <span className="cond-pill">
              <small>Max oxygen</small>
              {fmtPct(s.maxAmbientO2)}
            </span>
          )}
          {s.minPressureAtm !== null && (
            <span className="cond-pill">
              <small>Min pressure</small>
              {fmtPsi(s.minPressureAtm)}
            </span>
          )}
          {s.airflowTests > 0 && (
            <span className="cond-pill">
              <small>Airflow</small>
              {s.airflowTests} tests
            </span>
          )}
        </div>
      )}
      {aiItem ? (
        <div className="ai-inline">
          {aiItem.summary.map((x, i) => (
            <p key={i}>
              {x.text} <SentenceCites sentence={x} data={data} />
            </p>
          ))}
        </div>
      ) : (
        inv.objectives && <p className="inv-obj">{clip(inv.objectives, 240)}</p>
      )}
      <details>
        <summary>Approach, Hardware and Earth Benefits</summary>
        {inv.objectives && aiItem && (
          <>
            <h3>Objectives (PSI)</h3>
            <p>{inv.objectives}</p>
          </>
        )}
        {inv.approach && (
          <>
            <h3>Approach (PSI)</h3>
            <p>{inv.approach}</p>
          </>
        )}
        {inv.hypothesis && (
          <>
            <h3>Hypothesis (PSI)</h3>
            <p>{inv.hypothesis}</p>
          </>
        )}
        {inv.hardware && (
          <>
            <h3>Hardware</h3>
            <p>
              {inv.hardware_link ? (
                <a href={inv.hardware_link} target="_blank" rel="noreferrer">
                  {inv.hardware}
                </a>
              ) : (
                inv.hardware
              )}
              {inv.flight_platform ? `, ${inv.flight_platform}` : ''}
            </p>
          </>
        )}
        {inv.earth_benefits && (
          <>
            <h3>Earth Benefits (PSI)</h3>
            <p>{inv.earth_benefits}</p>
          </>
        )}
        {inv.publications.length > 0 && (
          <>
            <h3>Papers Listed in PSI ({inv.publications.length})</h3>
            <ul className="pub-list">
              {inv.publications.slice(0, 6).map((p, i) => (
                <li key={i}>
                  {p.doi ? (
                    <a href={`https://doi.org/${p.doi}`} target="_blank" rel="noreferrer">
                      {p.title ?? p.doi}
                    </a>
                  ) : (
                    p.title
                  )}
                </li>
              ))}
              {inv.publications.length > 6 && <li className="muted">and {inv.publications.length - 6} more on the PSI page</li>}
            </ul>
          </>
        )}
      </details>
      {testQuery && (
        <a className="test-match" href={`#experiments?id=${inv.accession}&q=${encodeURIComponent(testQuery)}`}>
          <b>{matches.length}</b> {matches.length === 1 ? 'test matches' : 'tests match'} “{testQuery}”
          <span className="muted small"> e.g. {matches.slice(0, 2).map((t) => t.test_label ?? `row ${t.source_row}`).join(', ')}</span>
        </a>
      )}
      <footer>
        <a className="btn btn-primary btn-quiet" href={`#experiments?id=${inv.accession}${testQuery ? `&q=${encodeURIComponent(testQuery)}` : ''}`}>
          {s.tests.length > 0 ? `See Its ${s.tests.length} Tests →` : 'Open Experiment →'}
        </a>
        <DoiCite inv={inv} />
      </footer>
    </article>
  )
}

export function InvestigationsView({ data, ai }: { data: AppData; ai: AiContent }) {
  const [filter, setFilter] = useHashParam('pillar', 'all')
  const [query, setQuery] = useHashParam('eq', '')
  const [testQuery, setTestQuery] = useHashParam('tq', '')
  const [cmpIds] = useCompare()
  const [cmpView, setCmpView] = useHashParam('cmpview', 'split')
  const stats = useMemo(() => investigationStats(data), [data])
  const q = query.trim().toLowerCase()
  const tq = testQuery.trim().toLowerCase()
  const testMatches = (st: InvestigationStats) =>
    tq ? st.tests.filter((t) => [t.fuel, t.test_label, t.outcome].filter(Boolean).join(' ').toLowerCase().includes(tq)) : []
  const match = (s: InvestigationStats, f: string) => (f === 'all' ? true : f === 'unstated' ? s.inv.pillar === null : s.inv.pillar === f)
  const shown = stats
    .filter((s) => match(s, filter))
    .filter(
      (s) =>
        !q ||
        [s.inv.acronym, s.inv.title, s.inv.accession, s.inv.keywords.join(' '), s.inv.hardware].filter(Boolean).join(' ').toLowerCase().includes(q),
    )
    .filter((s) => !tq || testMatches(s).length > 0)
    .sort((a, b) => b.tests.length - a.tests.length || b.tableRows - a.tableRows)
  const count = (f: Filter) => stats.filter((s) => match(s, f)).length
  const opt = (id: Filter, label: string, tone?: string, title?: string) => ({
    id,
    tone,
    title,
    label: (
      <>
        {label} <span className="count">{count(id)}</span>
      </>
    ),
  })

  return (
    <section className="view" aria-labelledby="inv-heading">
      <ViewHead
        art={<RingedPlanet size={190} />}
        eyebrow={`${stats.length} NASA Fire Experiments · ${data.tests.length.toLocaleString("en")} Tests`}
        title="NASA Fire Experiments"
        lead="Each card is one experiment NASA ran in space, and each experiment ran many tests (single burns). Open one to see what it was for and every test it ran. Search tests to find which experiments hold them."
      >
        <div className="search-pair">
          <label className="search">
            <span>Search Experiments</span>
            <input
              type="search"
              name="investigation-search"
              autoComplete="off"
              spellCheck={false}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="BASS, droplet, glovebox…"
            />
          </label>
          <label className="search">
            <span>Search Tests</span>
            <input
              type="search"
              name="test-search"
              autoComplete="off"
              spellCheck={false}
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              placeholder="PMMA, heptane, extinction, B12…"
            />
          </label>
        </div>
      </ViewHead>
      {tq && (
        <p className="result-count" aria-live="polite">
          <b>{shown.reduce((n, st) => n + testMatches(st).length, 0)}</b> tests match “{testQuery}” in <b>{shown.length}</b>{' '}
          {shown.length === 1 ? 'experiment' : 'experiments'}. Open one to see them.
        </p>
      )}
      <Choice
        label="Fire-safety pillar"
        value={filter as Filter}
        onChange={setFilter}
        options={[
          opt('all', 'All'),
          opt('prevention', 'Prevention', 'prevention', PILLAR_HINT.prevention),
          opt('detection', 'Detection', 'detection', PILLAR_HINT.detection),
          opt('suppression', 'Suppression', 'suppression', PILLAR_HINT.suppression),
          opt('unstated', 'Pillar Not Stated', undefined, 'The challenge page does not place these under a pillar'),
        ]}
      />
      <div className={`exp-split cmp-${cmpIds.length === 0 ? 'off' : cmpView}`}>
      <div className="inv-grid">
        {shown.map((s) => (
          <Card key={s.inv.accession} s={s} data={data} ai={ai} testQuery={testQuery.trim()} matches={testMatches(s)} />
        ))}
        {shown.length === 0 && (
          <p className="empty-state">
            No experiment matches {query ? `“${query}”` : ''}{query && testQuery ? ' with ' : ''}{testQuery ? `a test matching “${testQuery}”` : ''}. Try a shorter word, or pick <b>All</b>.
          </p>
        )}
      </div>
      {cmpIds.length > 0 && <ComparePanel data={data} view={cmpView as CompareMode} setView={setCmpView} />}
      </div>
    </section>
  )
}
