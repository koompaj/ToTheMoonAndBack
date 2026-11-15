// OWNER: dashboard + AI workstream.
// Untapped-data ranking: fire-safety relevance (a points score with a stated reason for every
// point) against how little an investigation has been studied (table rows per paper PSI lists),
// plus the reuse network and, when generated offline, an AI-drafted research question.
// The "signal, not proof" caveat stays on screen wherever the ranking appears.
import { Earth } from './SpaceArt'
import { useMemo } from 'react'
import type { AppData } from '../types/data'
import type { AiContent } from '../ai/content'
import { investigationStats, RELEVANCE_RULES, reuseLinks, shortName, type InvestigationStats } from '../ai/evidence'
import { DoiCite, SentenceCites } from './Cite'
import { useHashParam } from './route'
import { Choice, PILLAR_LABEL, PillarTag, ViewHead } from './ui'

const W = 640
const H = 340
const PAD = { l: 56, r: 20, t: 18, b: 46 }

function Scatter({ rows, active, onPick }: { rows: InvestigationStats[]; active: string | null; onPick: (a: string) => void }) {
  const pts = rows.filter((r) => r.rowsPerPub !== null && r.tableRows > 0)
  const maxY = Math.max(...pts.map((r) => r.rowsPerPub!), 10)
  const x = (v: number) => PAD.l + (v / 100) * (W - PAD.l - PAD.r)
  const ly = (v: number) => Math.log10(Math.max(v, 0.5))
  const y = (v: number) => PAD.t + (1 - (ly(v) - ly(0.5)) / (ly(maxY * 1.4) - ly(0.5))) * (H - PAD.t - PAD.b)
  const ticks = [1, 10, 100].filter((t) => t <= maxY * 1.4)
  return (
    <svg className="scatter" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Relevance score against table rows per listed paper">
      <text className="quadrant-label" x={W - PAD.r - 4} y={PAD.t + 14} textAnchor="end">
        more relevant, less studied ↗
      </text>
      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line className="grid" x1={x(v)} x2={x(v)} y1={PAD.t} y2={H - PAD.b} />
          <text className="tick" x={x(v)} y={H - PAD.b + 16} textAnchor="middle">
            {v}
          </text>
        </g>
      ))}
      {ticks.map((t) => (
        <g key={t}>
          <line className="grid" x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} />
          <text className="tick" x={PAD.l - 8} y={y(t) + 4} textAnchor="end">
            {t}
          </text>
        </g>
      ))}
      <text className="axis" x={(PAD.l + W - PAD.r) / 2} y={H - 8} textAnchor="middle">
        fire-safety relevance score
      </text>
      <text className="axis" transform={`translate(14 ${(PAD.t + H - PAD.b) / 2}) rotate(-90)`} textAnchor="middle">
        table rows per paper (log)
      </text>
      {pts.map((r) => {
        const on = r.inv.accession === active
        // Low-relevance, low-ratio points crowd the corner: name them on hover or when picked.
        const labelled = on || r.relevance > 0 || r.rowsPerPub! >= 10
        return (
          <g
            key={r.inv.accession}
            className={`pt pt-${r.inv.pillar ?? 'none'}${on ? ' on' : ''}`}
            transform={`translate(${x(r.relevance)} ${y(r.rowsPerPub!)})`}
            onClick={() => onPick(r.inv.accession)}
            role="button"
            tabIndex={0}
            aria-label={`${shortName(r.inv)}: relevance ${r.relevance}, ${r.rowsPerPub!.toFixed(1)} rows per paper`}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onPick(r.inv.accession)}
          >
            <title>{`${shortName(r.inv)}: ${r.relevance} points, ${r.rowsPerPub!.toFixed(1)} rows per paper`}</title>
            <circle r={on ? 7 : 5} />
            {labelled && (
              <text x={9} y={4}>
                {shortName(r.inv)}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

export function UntappedPanel({ data, ai, embedded = false }: { data: AppData; ai: AiContent; embedded?: boolean }) {
  const stats = useMemo(() => investigationStats(data), [data])
  const links = useMemo(() => reuseLinks(data), [data])
  const [sort, setSort] = useHashParam('sort', 'relevance')
  const [active, setActive] = useHashParam('pick', 'PSI-159')
  const rows = stats
    .filter((s) => s.tableRows > 0)
    .sort((a, b) =>
      sort === 'relevance'
        ? b.relevance - a.relevance || (b.rowsPerPub ?? Infinity) - (a.rowsPerPub ?? Infinity)
        : (b.rowsPerPub ?? Infinity) - (a.rowsPerPub ?? Infinity),
    )
  const noTable = stats.filter((s) => s.tableRows === 0)
  const act = stats.find((s) => s.inv.accession === active) ?? null
  const actAi = act ? ai.investigations?.items[act.inv.accession] : undefined
  const ground = links.filter((l) => l.from.project_type?.startsWith('Ground'))
  const flight = links.filter((l) => !l.from.project_type?.startsWith('Ground'))

  return (
    <section className={embedded ? "rank-embedded" : "view"} aria-labelledby="rank-heading">
      {!embedded && (
        <ViewHead
          art={<Earth size={180} />}
          eyebrow="Untapped Data"
          title="Relevant NASA Fire Data That Few Papers Use"
          lead="Up and to the right means more relevant to crew fire safety and less studied. Every relevance point has a stated reason; study depth is table rows per paper PSI lists."
        />
      )}
      <p className="caveat">
        A signal, not proof: PSI's publication lists are not the full literature, and newer releases have had less time
        to be studied.
      </p>

      <div className="rank-grid">
        <div className="panel">
          <Scatter rows={stats} active={active} onPick={setActive} />
          <div className="legend-row">
            {(['prevention', 'detection', 'suppression'] as const).map((p) => (
              <span key={p}>
                <i className={`swatch sw-${p}`} />
                {PILLAR_LABEL[p]}
              </span>
            ))}
            <span>
              <i className="swatch sw-none" />
              Pillar not stated
            </span>
          </div>
        </div>
        <div className="panel rank-detail">
          {act ? (
            <>
              <p className="eyebrow">{act.inv.accession}</p>
              <h2>{shortName(act.inv)}</h2>
              <div className="chips">
                <PillarTag pillar={act.inv.pillar} />
              </div>
              <p className="big-number">
                {act.relevance}
                <span className="big-unit"> relevance points</span>
              </p>
              <ul className="evidence-list">
                {act.parts.map((p) => (
                  <li key={p.reason}>
                    <b>+{p.points}</b> {p.reason}
                  </li>
                ))}
                {act.parts.length === 0 && <li className="muted">No rule applies.</li>}
              </ul>
              <p>
                {act.tableRows} table rows and {act.pubs} paper{act.pubs === 1 ? '' : 's'} listed in PSI
                {act.rowsPerPub !== null ? `: ${act.rowsPerPub.toFixed(1)} rows per paper` : ''}, released{' '}
                {act.inv.release_date ?? 'date not listed'}. <DoiCite inv={act.inv} />
              </p>
              {actAi?.research_question && (
                <div className="ai-block">
                  <h4>
                    Research Question to Try{' '}
                    <span className={`badge ${ai.investigations!.reviewed ? 'ok' : 'warn'}`}>
                      {ai.investigations!.reviewed ? 'reviewed' : 'AI draft, not reviewed'}
                    </span>
                  </h4>
                  <p>
                    {actAi.research_question.text} <SentenceCites sentence={actAi.research_question} data={data} />
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="muted">Pick a point on the chart.</p>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="table-head">
          <h2>Full Ranking</h2>
          <Choice
            label="Sort by"
            value={sort}
            onChange={setSort}
            options={[
              { id: 'relevance', label: 'By Relevance' },
              { id: 'rows', label: 'By Rows per Paper' },
            ]}
          />
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Investigation</th>
                <th className="num">Relevance</th>
                <th className="num">Table rows</th>
                <th className="num">Papers listed</th>
                <th className="num">Rows per paper</th>
                <th className="num">Released</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.inv.accession} className={r.inv.accession === active ? 'on' : ''}>
                  <td className="mono muted">{i + 1}</td>
                  <td>
                    <button type="button" className="row-pick" aria-pressed={r.inv.accession === active} onClick={() => setActive(r.inv.accession)}>
                      {shortName(r.inv)}
                    </button>{' '}
                    <span className="mono muted">{r.inv.accession}</span>
                  </td>
                  <td className="num">
                    <span className="score-bar" title={r.parts.map((p) => `+${p.points} ${p.reason}`).join('\n') || 'No rule applies'}>
                      <i style={{ width: `${r.relevance}%` }} />
                    </span>
                    {r.relevance}
                  </td>
                  <td className="num">{r.tableRows}</td>
                  <td className="num">{r.pubs}</td>
                  <td className="num">{r.rowsPerPub === null ? 'none listed' : r.rowsPerPub.toFixed(1)}</td>
                  <td className="num mono">{r.releaseYear ?? '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <details className="rules">
          <summary>How the Relevance Score Is Built</summary>
          <ul>
            {RELEVANCE_RULES.map((r) => (
              <li key={r.label}>
                <b>+{r.points}</b> {r.label}
              </li>
            ))}
          </ul>
          <p className="muted">
            {noTable.length} investigations have no experimental table in PSI and are left out of the ranking:{' '}
            {noTable.map((s) => shortName(s.inv)).join('; ')}.
          </p>
        </details>
      </div>

      <div className="panel">
        <h2>Reuse Network</h2>
        <p className="lead small">Which investigations PSI lists as related, from its "Related Investigations" field.</p>
        <div className="reuse">
          <div>
            <h3>Ground Studies Built on Flight Data</h3>
            <ul className="link-list reuse-scroll scroll-astro">
              {ground.map((l, i) => (
                <li key={i}>
                  <span title={l.from.title}>{shortName(l.from)}</span> <span className="arrow">→</span> <b>{shortName(l.to)}</b>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Flight Investigations Linked to Each Other</h3>
            <ul className="link-list reuse-scroll scroll-astro">
              {flight.map((l, i) => (
                <li key={i}>
                  {shortName(l.from)} <span className="arrow">→</span> <b>{shortName(l.to)}</b>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
