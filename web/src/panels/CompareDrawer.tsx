// OWNER: dashboard + AI workstream.
// Compare, star-themed. Users star up to three experiments on the cards; the Experiments page then
// splits: cards on the left third, this comparison table on the right two thirds. The panel can be
// expanded to full width, shrunk to a slim strip, and downloaded as CSV. Rows where every pick
// agrees are dimmed and tagged "same". Picks live in the URL (?cmp=PSI-25,PSI-69).
import { useMemo, type ReactNode } from 'react'
import type { AppData, Test } from '../types/data'
import { fmtPct, investigationStats, MOON_MAX_PSI, MOON_MIN_O2, psi, shortName, type InvestigationStats } from '../ai/evidence'
import { DoiCite } from './Cite'
import { airflowRange } from '../data/load'
import { useHashParam } from './route'
import { StarArt } from './SpaceArt'
import { FuelTag, PillarTag } from './ui'

export const MAX_COMPARE = 3
export type CompareMode = 'split' | 'full' | 'min'
const STAR_COLORS = ['#ffcc29', '#f472b6', '#38bdf8']
const O2_MAX = 0.45 // bar scale end; highest cabin-air oxygen in the tables is 40 %
const PSI_MAX = 75 // bar scale end; highest pressure in the tables is 5 atm (73.5 psi)

/** The shared list of starred experiments. */
export function useCompare(): [string[], (acc: string) => void, () => void] {
  const [str, set] = useHashParam('cmp', '')
  const ids = str.split(',').filter(Boolean).slice(0, MAX_COMPARE)
  const toggle = (acc: string) => {
    const next = ids.includes(acc) ? ids.filter((x) => x !== acc) : [...ids, acc].slice(-MAX_COMPARE)
    set(next.join(','))
  }
  return [ids, toggle, () => set('')]
}

type Range = readonly [number, number] | null
const range = (v: number[]): Range => (v.length ? [Math.min(...v), Math.max(...v)] : null)
const pctTxt = (r: Range) => (r ? (r[0] === r[1] ? fmtPct(r[0]) : `${fmtPct(r[0])} – ${fmtPct(r[1])}`) : 'not in the tables')
const psiTxt = (r: Range) => (r ? (r[0] === r[1] ? `${r[0].toFixed(1)} psi` : `${r[0].toFixed(1)} – ${r[1].toFixed(1)} psi`) : 'not in the tables')

function details(s: InvestigationStats) {
  const amb = s.tests.filter((t: Test) => t.o2_basis === 'ambient')
  return {
    o2: range(amb.map((t) => t.o2_fraction).filter((v): v is number => v !== null)),
    p: range(s.tests.map((t) => t.pressure_atm).filter((v): v is number => v !== null).map(psi)),
    air: airflowRange(s.tests),
    fuels: [...new Set(s.tests.map((t) => t.fuel).filter((f): f is string => !!f))],
    outcomes: [...new Set(s.tests.map((t) => t.outcome).filter((o): o is string => !!o))],
    classes: [...new Set(s.tests.map((t) => t.fuel_class))],
  }
}

function Bar({ r, max, zone, text, color }: { r: Range; max: number; zone: [number, number]; text: string; color: string }) {
  if (!r) return <span className="missing">not in the tables</span>
  const l = (v: number) => `${Math.min(v / max, 1) * 100}%`
  return (
    <span className="cmp-range">
      <span className="range-track">
        <span className="range-zone" style={{ left: l(zone[0]), width: `calc(${l(zone[1])} - ${l(zone[0])})` }} />
        <span className="range-fill" style={{ left: l(r[0]), width: `max(5px, calc(${l(r[1])} - ${l(r[0])}))`, background: color }} />
      </span>
      <b className="mono">{text}</b>
    </span>
  )
}

function csvCell(v: string) {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

export function ComparePanel({ data, view, setView }: { data: AppData; view: CompareMode; setView: (v: CompareMode) => void }) {
  const [ids, toggle, clear] = useCompare()
  const stats = useMemo(() => investigationStats(data), [data])
  const picked = ids.map((id) => stats.find((s) => s.inv.accession === id)).filter((s) => s !== undefined)
  const det = picked.map(details)

  // One row per property: a plain-text value per experiment (for "same" checks and CSV) and an
  // optional richer cell for the screen.
  type Row = { label: string; text: string[]; cells?: ReactNode[] }
  const rows: Row[] = [
    { label: 'Accession', text: picked.map((s) => s.inv.accession) },
    { label: 'Full name', text: picked.map((s) => s.inv.title) },
    { label: 'Fire-safety pillar', text: picked.map((s) => s.inv.pillar ?? 'not stated'), cells: picked.map((s) => <PillarTag pillar={s.inv.pillar} />) },
    {
      label: 'Fuel type',
      text: det.map((d) => d.classes.join(', ') || 'no individual tests'),
      cells: det.map((d) => (d.classes.length ? <span className="chips">{d.classes.map((c) => <FuelTag key={c} fuel={c} />)}</span> : <span className="missing">no individual tests</span>)),
    },
    {
      label: 'What burned',
      text: det.map((d) => d.fuels.join('; ') || '–'),
      cells: det.map((d) => (d.fuels.length ? `${d.fuels.slice(0, 3).join(', ')}${d.fuels.length > 3 ? ` +${d.fuels.length - 3} more` : ''}` : '–')),
    },
    {
      label: 'Cabin oxygen',
      text: det.map((d) => pctTxt(d.o2)),
      cells: det.map((d, i) => <Bar r={d.o2} max={O2_MAX} zone={[MOON_MIN_O2, O2_MAX]} text={pctTxt(d.o2)} color={STAR_COLORS[i]} />),
    },
    {
      label: 'Pressure',
      text: det.map((d) => psiTxt(d.p)),
      cells: det.map((d, i) => <Bar r={d.p} max={PSI_MAX} zone={[0, MOON_MAX_PSI]} text={psiTxt(d.p)} color={STAR_COLORS[i]} />),
    },
    { label: 'Airflow', text: det.map((d) => (d.air ? `${d.air[0]} – ${d.air[1]} cm/s` : 'not in the tables')) },
    { label: 'How tests ended', text: det.map((d) => d.outcomes.join(', ') || 'not recorded') },
    { label: 'Hardware', text: picked.map((s) => s.inv.hardware ?? '–') },
    { label: 'Where', text: picked.map((s) => s.inv.flight_platform ?? '–') },
    { label: 'Tests', text: picked.map((s) => String(s.tests.length)) },
    { label: 'Papers listed in PSI', text: picked.map((s) => String(s.pubs)) },
    { label: 'Released', text: picked.map((s) => s.inv.release_date ?? '–') },
    { label: 'DOI', text: picked.map((s) => s.inv.doi ?? '–'), cells: picked.map((s) => <DoiCite inv={s.inv} />) },
  ]
  const hidden = new Set(['Accession', 'Full name'])

  const download = () => {
    const header = ['Property', ...picked.map((s) => shortName(s.inv))]
    const lines = [header, ...rows.map((r) => [r.label, ...r.text])].map((l) => l.map(csvCell).join(','))
    const note = '"Source: NASA Physical Sciences Informatics (psi.nasa.gov). Cite each experiment by its DOI."'
    const blob = new Blob([[...lines, '', note].join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `compare-${picked.map((s) => s.inv.accession).join('-')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (view === 'min')
    return (
      <aside className="cmp-panel cmp-min" aria-label="Compare (shrunk)">
        <button type="button" className="cmp-min-btn" onClick={() => setView('split')} aria-label={`Open compare, ${picked.length} selected`}>
          <StarArt size={44} />
          <span className="cmp-min-count">{picked.length}</span>
          <span className="edge-label">Open Compare</span>
        </button>
      </aside>
    )

  return (
    <aside className="cmp-panel" aria-labelledby="cmp-title">
      <header className="cmp-head">
        <StarArt size={50} />
        <div className="cmp-head-text">
          <h2 id="cmp-title">Comparing {picked.length}</h2>
          <p className="muted small">Gold band = Moon Base. Dimmed rows are the same for all.</p>
        </div>
        <div className="cmp-tools">
          <button type="button" className="tool-btn" onClick={download} title="Download this table as a CSV file">
            ⬇ CSV
          </button>
          <button type="button" className="tool-btn" onClick={() => setView(view === 'full' ? 'split' : 'full')} title={view === 'full' ? 'Back to split view' : 'Use the full width'}>
            {view === 'full' ? '⇤ Split' : '⤢ Expand'}
          </button>
          <button type="button" className="tool-btn" onClick={() => setView('min')} title="Shrink to the side">
            ⇥ Shrink
          </button>
          <button type="button" className="tool-btn quiet" onClick={clear} title="Remove all experiments from compare">
            Clear
          </button>
        </div>
      </header>

      <div className="cmp-table-wrap">
        <table className="cmp-table">
          <thead>
            <tr>
              <th scope="col">
                <span className="sr-only">Property</span>
              </th>
              {picked.map((s, i) => (
                <th key={s.inv.accession} scope="col" style={{ ['--star' as string]: STAR_COLORS[i] }}>
                  <span className="cmp-col-head">
                    <span className="cmp-star" aria-hidden>
                      ★
                    </span>
                    <a href={`#experiments?id=${s.inv.accession}&cmp=${ids.join(',')}`}>{shortName(s.inv)}</a>
                    <button type="button" onClick={() => toggle(s.inv.accession)} aria-label={`Remove ${shortName(s.inv)} from compare`}>
                      ×
                    </button>
                  </span>
                  <span className="mono muted">{s.inv.accession}</span>
                </th>
              ))}
              {picked.length < MAX_COMPARE && (
                <th scope="col" className="cmp-slot">
                  ☆ Star {MAX_COMPARE - picked.length} more on the cards
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows
              .filter((r) => !hidden.has(r.label))
              .map((r) => {
                const same = picked.length > 1 && r.text.every((t) => t === r.text[0]) && r.label !== 'DOI'
                return (
                  <tr key={r.label} className={same ? 'same' : ''}>
                    <th scope="row">
                      {r.label}
                      {same && <span className="same-tag">same</span>}
                    </th>
                    {picked.map((s, i) => (
                      <td key={s.inv.accession}>{r.cells ? r.cells[i] : <span className={r.label === 'How tests ended' ? 'cap' : ''}>{r.text[i]}</span>}</td>
                    ))}
                    {picked.length < MAX_COMPARE && <td className="cmp-slot" />}
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>
    </aside>
  )
}
