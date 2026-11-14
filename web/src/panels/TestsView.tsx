// OWNER: dashboard + AI workstream.
// Test explorer: every NASA test row in tests.json, filterable and paged, each one cited.
// Filters live in the URL so a filtered list can be shared in the demo.
import { Moon } from './SpaceArt'
import { useMemo } from 'react'
import type { AppData, FuelClass, Test } from '../types/data'
import { useApp } from '../state/store'
import { fmtPct, fmtPsi, isDuplicate, isPlaced } from '../ai/evidence'
import { TestCite } from './Cite'
import { TestDetail } from './TestDetail'
import { useHashParam } from './route'
import { Choice, FUEL_SHORT, FuelTag, ViewHead } from './ui'

const PAGE = 50

function o2Cell(t: Test) {
  if (t.o2_fraction !== null) return fmtPct(t.o2_fraction)
  if (t.o2_fraction_min !== null && t.o2_fraction_max !== null) return `${fmtPct(t.o2_fraction_min)} – ${fmtPct(t.o2_fraction_max)}`
  return null
}

/** All tests, or (with lockedInv) the tests of one experiment inside its page. */
export function TestsView({ data, lockedInv, embedded = false }: { data: AppData; lockedInv?: string; embedded?: boolean }) {
  const [fuel, setFuel] = useHashParam('fuel', 'all')
  const [invParam, setInv] = useHashParam('inv', 'all')
  const inv = lockedInv ?? invParam
  const [where, setWhere] = useHashParam('where', 'all')
  const [q, setQ] = useHashParam('q', '')
  const [pageStr, setPage] = useHashParam('page', '1')
  const selectedTestId = useApp((s) => s.selectedTestId)
  const selectTest = useApp((s) => s.selectTest)
  const page = Math.max(1, Number(pageStr) || 1)

  const investigations = useMemo(
    () => [...new Map(data.tests.map((t) => [t.investigation, t.acronym])).entries()].sort((a, b) => a[1].localeCompare(b[1])),
    [data.tests],
  )

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return data.tests.filter((t) => {
      if (isDuplicate(t)) return false // repeats an earlier row exactly; counted once
      if (fuel !== 'all' && t.fuel_class !== fuel) return false
      if (inv !== 'all' && t.investigation !== inv) return false
      if (where === 'moon' && t.in_moon_envelope !== true) return false
      if (where === 'placed' && !isPlaced(t)) return false
      if (where === 'unplaced' && (isPlaced(t) || t.o2_basis !== 'ambient')) return false
      if (where === 'inverse' && t.o2_basis !== 'burner_oxidizer') return false
      if (needle && ![t.fuel, t.test_label, t.acronym, t.outcome].filter(Boolean).join(' ').toLowerCase().includes(needle)) return false
      return true
    })
  }, [data.tests, fuel, inv, where, q])

  const hiddenRepeats = data.tests.filter((t) => isDuplicate(t) && (inv === 'all' || t.investigation === inv)).length
  const pages = Math.max(1, Math.ceil(rows.length / PAGE))
  const cur = Math.min(page, pages)
  const shown = rows.slice((cur - 1) * PAGE, cur * PAGE)
  const selected = selectedTestId ? data.tests.find((t) => t.id === selectedTestId) ?? null : null
  const reset = (fn: (v: string) => void) => (v: string) => {
    fn(v)
    setPage('1')
  }

  const search = (
    <label className="search">
      <span>Search Fuel, Test ID or Ending</span>
      <input
        type="search"
        name="test-search"
        autoComplete="off"
        spellCheck={false}
        value={q}
        onChange={(e) => reset(setQ)(e.target.value)}
        placeholder="PMMA, heptane, 220R001…"
      />
    </label>
  )

  return (
    <section className={embedded ? 'tests-embedded' : 'view'} aria-labelledby="tests-heading">
      {embedded ? (
        <div className="table-head">
          <h2 id="tests-heading">Every Test (Burn) in This Experiment</h2>
          {search}
        </div>
      ) : (
      <ViewHead
        art={<Moon size={170} />}
        eyebrow={`${data.tests.filter((t) => !isDuplicate(t)).length.toLocaleString('en')} NASA Tests`}
        title="Every NASA Fire Test"
        lead="Each row is one burn from one experiment. Filter by fuel, experiment or conditions; pick a row to see all its values and its source."
      >
        <label className="search">
          <span>Search Fuel, Test ID or Ending</span>
          <input
            type="search"
            name="test-search"
            autoComplete="off"
            spellCheck={false}
            value={q}
            onChange={(e) => reset(setQ)(e.target.value)}
            placeholder="PMMA, heptane, 220R001…"
          />
        </label>
      </ViewHead>
      )}

      <div className="filter-bar">
        <Choice
          label="Fuel type"
          value={fuel}
          onChange={reset(setFuel)}
          options={[
            { id: 'all', label: 'All Fuels' },
            ...(['solid', 'droplet', 'gas'] as FuelClass[]).map((f) => ({ id: f, label: FUEL_SHORT[f], tone: f })),
          ]}
        />
        <Choice
          label="Conditions"
          value={where}
          onChange={reset(setWhere)}
          options={[
            { id: 'all', label: 'All' },
            { id: 'moon', label: 'In Moon Base Air', tone: 'accent' },
            { id: 'placed', label: 'On the Map' },
            { id: 'unplaced', label: 'Missing Oxygen or Pressure', tone: 'gap' },
            { id: 'inverse', label: 'Inverse Flames' },
          ]}
        />
        {!lockedInv && (
        <label className="select">
          <span>Experiment</span>
          <select value={inv} onChange={(e) => reset(setInv)(e.target.value)} name="experiment">
            <option value="all">All experiments</option>
            {investigations.map(([acc, name]) => (
              <option key={acc} value={acc}>
                {name} ({acc})
              </option>
            ))}
          </select>
        </label>
        )}
      </div>

      <div className="tests-layout">
        <div className="panel">
          <p className="result-count" aria-live="polite">
            <b>{rows.length.toLocaleString('en')}</b> tests match
            {rows.length > PAGE && (
              <>
                {' '}
                · showing {(cur - 1) * PAGE + 1}–{Math.min(cur * PAGE, rows.length)}
              </>
            )}
            {hiddenRepeats > 0 && (
              <span className="muted small">
                {' '}
                · {hiddenRepeats} rows that exactly repeat an earlier row are counted once
              </span>
            )}
          </p>
          {rows.length === 0 ? (
            <p className="empty-state">No test matches these filters. Pick “All” on one of them to widen the list.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Test</th>
                    <th>Fuel</th>
                    <th className="num">Oxygen</th>
                    <th className="num">Pressure</th>
                    <th>Ending</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((t) => {
                    const o2 = o2Cell(t)
                    return (
                      <tr key={t.id} className={t.id === selectedTestId ? 'on' : ''}>
                        <td>
                          <button type="button" className="row-pick" aria-pressed={t.id === selectedTestId} onClick={() => selectTest(t.id === selectedTestId ? null : t.id)}>
                            {t.acronym} {t.test_label ?? `row ${t.source_row}`}
                          </button>
                          {t.in_moon_envelope && <span className="badge accent">Moon Base</span>}
                        </td>
                        <td>
                          <FuelTag fuel={t.fuel_class} /> <span className="cell-fuel">{t.fuel ?? '–'}</span>
                        </td>
                        <td className="num">
                          {o2 ?? <span className="missing">not in table</span>}
                          {t.o2_basis === 'burner_oxidizer' && o2 && <span className="muted small"> burner</span>}
                        </td>
                        <td className="num">{t.pressure_atm !== null ? fmtPsi(t.pressure_atm) : <span className="missing">not in table</span>}</td>
                        <td>{t.outcome ?? <span className="muted">–</span>}</td>
                        <td>
                          <TestCite test={t} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          {pages > 1 && (
            <nav className="pager" aria-label="Pages">
              <button type="button" className="btn" disabled={cur <= 1} onClick={() => setPage(String(cur - 1))}>
                ← Previous
              </button>
              <span className="mono">
                Page {cur} of {pages}
              </span>
              <button type="button" className="btn" disabled={cur >= pages} onClick={() => setPage(String(cur + 1))}>
                Next →
              </button>
            </nav>
          )}
        </div>
        <aside className="tests-side">
          {selected ? (
            <TestDetail test={selected} data={data} />
          ) : (
            <div className="panel hint-card">
              <h2>Pick a Test</h2>
              <p className="muted">Its fuel, oxygen, pressure, airflow, ending, data flags and NASA source appear here.</p>
            </div>
          )}
        </aside>
      </div>
    </section>
  )
}
