// OWNER: dashboard + AI workstream.
// One NASA test row in full, with its flags explained and its source cited.
import type { AppData, Test } from '../types/data'
import { useApp } from '../state/store'
import { fmtPct, fmtPsi } from '../ai/evidence'
import { DoiCite } from './Cite'
import { FuelTag } from './ui'

export function testRows(test: Test): [string, string][] {
  const o2 =
    test.o2_fraction !== null
      ? fmtPct(test.o2_fraction)
      : test.o2_fraction_min !== null && test.o2_fraction_max !== null
        ? `${fmtPct(test.o2_fraction_min)} – ${fmtPct(test.o2_fraction_max)}`
        : 'Not in the table'
  const rows: [string, string][] = [
    ['Fuel', test.fuel ?? 'Not in the table'],
    [test.o2_basis === 'ambient' ? 'Oxygen (cabin air)' : 'Oxygen (burner gas)', o2],
    ['Pressure', test.pressure_atm !== null ? `${fmtPsi(test.pressure_atm, 2)} (${test.pressure_atm.toFixed(3)} atm)` : 'Not in the table'],
  ]
  if (test.airflow_cm_s !== null) rows.push(['Airflow', `${test.airflow_cm_s} cm/s${test.flow_direction ? `, ${test.flow_direction}` : ''}`])
  if (test.co2_fraction) rows.push(['CO₂ added', fmtPct(test.co2_fraction)])
  if (test.he_fraction) rows.push(['Helium added', fmtPct(test.he_fraction)])
  if (test.burn_time_s !== null) rows.push(['Burn time', `${test.burn_time_s} s`])
  if (test.outcome) rows.push(['Ending', test.outcome])
  return rows
}

export function TestDetail({ test, data }: { test: Test; data: AppData }) {
  const selectTest = useApp((s) => s.selectTest)
  const inv = data.investigations.find((i) => i.accession === test.investigation)
  const meanings = data.quality.flag_meanings

  return (
    <div className="test-detail" role="region" aria-label="Selected test">
      <div className="test-detail-head">
        <FuelTag fuel={test.fuel_class} />
        <b>
          {test.acronym} Test {test.test_label ?? `Row ${test.source_row}`}
        </b>
        <button type="button" className="icon-btn" onClick={() => selectTest(null)} aria-label="Close test details">
          ×
        </button>
      </div>
      <dl className="kv">
        {testRows(test).map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {test.o2_basis === 'burner_oxidizer' && (
        <p className="note-warn">Inverse flame: this oxygen is gas fed from the burner, not cabin air. It never counts toward a habitat.</p>
      )}
      {test.flags.length > 0 && (
        <ul className="flag-list">
          {test.flags.map((f) => (
            <li key={f}>
              <code>{f}</code> {meanings[f.split(':')[0]] ?? ''}
            </li>
          ))}
        </ul>
      )}
      <p className="source-line">
        <span className="mono">
          {test.source_table.replace(/^tables\//, '')}, row {test.source_row}
        </span>{' '}
        <DoiCite inv={inv} />
      </p>
    </div>
  )
}
