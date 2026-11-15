// OWNER: dashboard + AI workstream.
// Item 6, "Will It Go Out?": workstream A's analysis (outcomes.json) shown as-is. Every number
// comes from the study: question, one-sentence finding, a bar per group (went out / recorded), the
// verdict, the matched-group checks under a toggle, and ALL caveats every time. Each group's count
// opens its test ids as citation chips. Hidden when outcomes.json is missing.
import { useMemo, useState } from 'react'
import type { AppData, FuelClass, OutcomeGroup, OutcomeStudy, Test } from '../types/data'
import { DoiCite, TestCite } from './Cite'
import { FuelIcon, PanelHead } from './ui'

const VERDICT: Record<string, { label: string; tone: string }> = {
  clear: { label: 'Clear pattern', tone: 'evidence' },
  no_clear_pattern: { label: 'No clear pattern', tone: 'caution' },
  not_tested_for_a_trend: { label: 'Not tested for a trend', tone: 'muted' },
}

function Groups({ groups, byId }: { groups: OutcomeGroup[]; byId: Map<string, Test> }) {
  const [open, setOpen] = useState<string | null>(null)
  return (
    <div className="out-groups">
      {groups.map((g) => {
        const share = g.recorded > 0 ? g.went_out / g.recorded : 0
        const key = `${g.label}-${g.x}`
        const isOpen = open === key
        return (
          <div key={key} className="out-group">
            <span className="out-label">{g.label}</span>
            <span className="out-bar" aria-hidden>
              <i style={{ width: `${share * 100}%` }} />
            </span>
            <button type="button" className="out-count" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : key)} title="Show the NASA test rows">
              {g.went_out} of {g.recorded}
            </button>
            {isOpen && (
              <div className="out-cites">
                {g.test_ids.map((id) => {
                  const t = byId.get(id)
                  return t ? <TestCite key={id} test={t} /> : null
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function Study({ s, data, byId }: { s: OutcomeStudy; data: AppData; byId: Map<string, Test> }) {
  const v = VERDICT[s.verdict] ?? { label: s.verdict, tone: 'muted' }
  const inv = data.investigations.find((i) => i.accession === s.investigation)
  const hasMatched = (s.matched_groups && s.matched_groups.length > 0) || (s.groups_matched_oxygen && s.groups_matched_oxygen.length > 0)
  return (
    <article className="out-study">
      <header>
        <FuelIcon fuel={s.fuel_class} />
        <h3>{s.question}</h3>
        <span className={`out-verdict t-${v.tone}`}>{v.label}</span>
      </header>
      <p className="out-finding">{s.finding}</p>
      {s.groups && s.groups.length > 0 && (
        <>
          <p className="out-axis muted small">
            Went out, by {s.group_by ?? 'group'} · {s.went_out_means}
          </p>
          <Groups groups={s.groups} byId={byId} />
        </>
      )}
      {hasMatched && (
        <details className="out-matched">
          <summary>Does it hold at the same pressure / within each fuel?</summary>
          {s.matched_groups?.map((m) => (
            <div key={m.group} className="out-matched-block">
              <p>
                <b>{m.group}</b> <span className={`out-verdict t-${(VERDICT[m.verdict] ?? VERDICT.not_tested_for_a_trend).tone}`}>{(VERDICT[m.verdict] ?? { label: m.verdict }).label}</span>
              </p>
              <Groups groups={m.groups} byId={byId} />
            </div>
          ))}
          {s.groups_matched_oxygen && s.groups_matched_oxygen.length > 0 && (
            <div className="out-matched-block">
              <p>
                <b>At {s.matched_oxygen_band ?? 'the same'} oxygen only</b>
              </p>
              <Groups groups={s.groups_matched_oxygen} byId={byId} />
            </div>
          )}
        </details>
      )}
      <footer className="out-foot">
        {s.acronym} <DoiCite inv={inv} />
      </footer>
    </article>
  )
}

/** fuel: show only studies of that fuel type (fire page); omit for all studies (place page). */
export function OutcomesPanel({ data, fuel }: { data: AppData; fuel?: FuelClass }) {
  const byId = useMemo(() => new Map(data.tests.map((t) => [t.id, t])), [data.tests])
  const o = data.outcomes
  if (!o || !o.studies?.length) return null
  const studies = fuel ? o.studies.filter((s) => s.fuel_class === fuel) : o.studies
  if (!studies.length) return null
  return (
    <section className="panel outcomes" aria-labelledby="outcomes-title">
      <PanelHead title="Will It Go Out?" />
      <h2 id="outcomes-title" className="sr-only">
        Will it go out?
      </h2>
      <p className="muted small">What NASA&rsquo;s tables record about flames going out. Click a count to see its test rows.</p>
      <div className="out-list">
        {studies.map((s) => (
          <Study key={s.id} s={s} data={data} byId={byId} />
        ))}
      </div>
      <ul className="out-caveats">
        {o.caveats.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
    </section>
  )
}
