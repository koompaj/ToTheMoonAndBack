// OWNER: dashboard + AI workstream.
// Item 12, the air-conditions filter. All matching is workstream A's: testsInConditions,
// nearestOutside and conditionsFromHabitat (data/load.ts). This file only reads and writes the URL
// (#experiments?preset=iss  or  ?o2=30-100&psi=4.3-10.2&g=0.165) and shows the result.
import { useMemo } from 'react'
import type { AppData, Test } from '../types/data'
import { conditionsFromHabitat, nearestOutside, testsInConditions, type Conditions, type ConditionsResult } from '../data/load'
import { TestCite } from './Cite'
import { useHashParam } from './route'
import { placeName } from './places'
import { Choice } from './ui'

const GRAVITY = [
  { id: 'any', label: 'Any' },
  { id: '0', label: 'Microgravity' },
  { id: '0.165', label: 'Moon' },
  { id: '1', label: 'Earth' },
  { id: 'custom', label: 'Custom' },
] as const

export const PARTIAL_G_TEXT = 'Every test in PSI ran in microgravity; no partial-gravity tests in PSI yet (LUCI and FM2 may add some).'

function parseRange(s: string, fallback: [number, number]): [number, number] {
  const m = /^(-?\d*\.?\d+)-(-?\d*\.?\d+)$/.exec(s.trim())
  if (!m) return fallback
  const a = Number(m[1])
  const b = Number(m[2])
  return a <= b ? [a, b] : [b, a]
}
const fmt = (v: number) => String(Number(v.toFixed(2)))

export interface UseConditions {
  active: boolean
  conditions: Conditions
  result: ConditionsResult
  insideIds: Set<string>
  gravity: number | null
  preset: string
  o2Pct: [number, number]
  psi: [number, number]
  setPreset: (id: string) => void
  setO2: (r: [number, number]) => void
  setPsi: (r: [number, number]) => void
  setG: (g: string) => void
  clear: () => void
  /** URL query for links that should keep the filter, e.g. "&preset=iss". */
  query: string
}

export function useConditions(data: AppData): UseConditions {
  const [preset, setPresetRaw] = useHashParam('preset', '')
  const [o2Str, setO2Str] = useHashParam('o2', '')
  const [psiStr, setPsiStr] = useHashParam('psi', '')
  const [gStr, setGStr] = useHashParam('g', 'any')
  const hab = data.habitats.find((h) => h.id === preset) ?? null
  const active = preset !== '' || o2Str !== '' || psiStr !== '' || gStr !== 'any'
  const gravity = gStr === 'any' || gStr === 'custom' ? null : Number.isFinite(Number(gStr)) ? Number(gStr) : null

  const conditions: Conditions = useMemo(() => {
    if (hab) return { ...conditionsFromHabitat(hab), gravity_g: gravity }
    const o2 = parseRange(o2Str, [0, 100])
    return { o2: [o2[0] / 100, o2[1] / 100], psi: parseRange(psiStr, [0, 80]), gravity_g: gravity }
  }, [hab, o2Str, psiStr, gravity])
  const result = useMemo(() => testsInConditions(data.tests, conditions), [data.tests, conditions])
  const insideIds = useMemo(() => new Set(result.inside.map((t) => t.id)), [result])

  const setPreset = (id: string) => {
    setPresetRaw(id)
    const h = data.habitats.find((x) => x.id === id)
    if (h) {
      setO2Str(`${fmt(h.o2_fraction[0] * 100)}-${fmt(h.o2_fraction[1] * 100)}`)
      setPsiStr(`${fmt(h.pressure_psi[0])}-${fmt(h.pressure_psi[1])}`)
    }
  }
  const o2Pct: [number, number] = [conditions.o2[0] * 100, conditions.o2[1] * 100]
  const q = new URLSearchParams()
  if (preset) q.set('preset', preset)
  if (o2Str) q.set('o2', o2Str)
  if (psiStr) q.set('psi', psiStr)
  if (gStr !== 'any') q.set('g', gStr)
  return {
    active,
    conditions,
    result,
    insideIds,
    gravity,
    preset,
    o2Pct,
    psi: conditions.psi,
    setPreset,
    setO2: (r) => {
      setPresetRaw('custom')
      setO2Str(`${fmt(r[0])}-${fmt(r[1])}`)
    },
    setPsi: (r) => {
      setPresetRaw('custom')
      setPsiStr(`${fmt(r[0])}-${fmt(r[1])}`)
    },
    setG: setGStr,
    clear: () => {
      setPresetRaw('')
      setO2Str('')
      setPsiStr('')
      setGStr('any')
    },
    query: q.toString() ? `&${q.toString()}` : '',
  }
}

function NumPair({ label, unit, value, onChange }: { label: string; unit: string; value: [number, number]; onChange: (r: [number, number]) => void }) {
  return (
    <fieldset className="cond-pair">
      <legend>{label}</legend>
      <input type="number" inputMode="decimal" step="0.1" aria-label={`${label} minimum`} value={fmt(value[0])} onChange={(e) => onChange([Number(e.target.value), value[1]])} />
      <span>to</span>
      <input type="number" inputMode="decimal" step="0.1" aria-label={`${label} maximum`} value={fmt(value[1])} onChange={(e) => onChange([value[0], Number(e.target.value)])} />
      <span className="muted">{unit}</span>
    </fieldset>
  )
}

/** Where a nearby test sits relative to the range, in words: "22.2 % O2, 8 points below". */
function gapWords(n: { test: Test; o2_gap_points: number; psi_gap: number }, c: Conditions) {
  const t = n.test
  const parts: string[] = []
  const amt = (v: number) => (v < 0.1 ? 'under 0.1' : v.toFixed(1).replace(/\.0$/, ''))
  if (n.o2_gap_points > 0) parts.push(`${amt(n.o2_gap_points)} points ${t.o2_fraction! < c.o2[0] ? 'below' : 'above'} in oxygen`)
  if (n.psi_gap > 0) parts.push(`${amt(n.psi_gap)} psi ${t.pressure_atm! * 14.6959 < c.psi[0] ? 'below' : 'above'}`)
  return `${(t.o2_fraction! * 100).toFixed(1).replace(/\.0$/, '')} % O₂, ${(t.pressure_atm! * 14.6959).toFixed(1).replace(/\.0$/, '')} psi: ${parts.join(' and ')}`
}

/** inline: sits in a row of search boxes (its controls join the row, the result wraps below). */
export function ConditionsBar({ data, c, compact = false, inline = false }: { data: AppData; c: UseConditions; compact?: boolean; inline?: boolean }) {
  // When gravity is what rules everything out, the air itself may match: say so instead of listing
  // "nearest" tests that are inside the air range (nearestOutside does not use gravity).
  const airOnly = useMemo(
    () => (c.active && c.result.inside.length === 0 && c.gravity !== null ? testsInConditions(data.tests, { ...c.conditions, gravity_g: null }).inside.length : 0),
    [c.active, c.result, c.gravity, data.tests, c.conditions],
  )
  const nearest = useMemo(
    () => (c.active && c.result.inside.length === 0 && airOnly === 0 ? nearestOutside(data.tests, c.conditions, 5) : []),
    [c.active, c.result, airOnly, data.tests, c.conditions],
  )
  const gChoice = GRAVITY.some((g) => g.id === (c.gravity === null ? 'any' : String(c.gravity))) ? (c.gravity === null ? 'any' : String(c.gravity)) : 'custom'
  return (
    <section className={inline ? 'cond-bar inline' : `panel cond-bar${compact ? ' compact' : ''}`} aria-label="Air conditions filter">
      <div className="cond-row">
        <label className="select">
          <span>Air</span>
          <select value={c.preset} onChange={(e) => (e.target.value ? c.setPreset(e.target.value) : c.clear())} name="air-preset">
            <option value="">Any air (no filter)</option>
            {data.habitats.map((h) => (
              <option key={h.id} value={h.id}>
                {placeName(h.id, h.name)}
              </option>
            ))}
            <option value="custom">Custom</option>
          </select>
        </label>
        {c.active && (
          <>
            <NumPair label="Oxygen" unit="%" value={c.o2Pct} onChange={c.setO2} />
            <NumPair label="Pressure" unit="psi" value={c.psi} onChange={c.setPsi} />
          </>
        )}
        <div className="cond-g">
          <span className="cond-g-label">Gravity</span>
          <Choice label="Gravity" value={gChoice} onChange={(v) => c.setG(v === 'custom' ? '0.5' : v)} options={GRAVITY.map((g) => ({ id: g.id, label: g.label }))} />
          {gChoice === 'custom' && (
            <input className="cond-g-input" type="number" step="0.01" min="0" max="2" aria-label="Custom gravity in g" value={c.gravity ?? ''} onChange={(e) => c.setG(e.target.value || 'any')} />
          )}
        </div>
        {c.active && (
          <button type="button" className="btn btn-quiet" onClick={c.clear}>
            Clear Filter
          </button>
        )}
      </div>

      {c.active && (
        <div className="cond-result" aria-live="polite">
          {c.result.inside.length > 0 ? (
            <p className="cond-count">
              <b>{c.result.inside.length.toLocaleString('en')}</b> tests in NASA&rsquo;s tables ran in this air
              {!compact && (() => {
                const n = new Set(c.result.inside.map((t) => t.investigation)).size
                return <> · {n} {n === 1 ? 'experiment' : 'experiments'}</>
              })()}
            </p>
          ) : (
            <div className="cond-none">
              {airOnly > 0 ? (
                <p className="cond-count">
                  <b>No test in NASA&rsquo;s tables at this gravity.</b> {airOnly.toLocaleString('en')} tests ran in this air, all in microgravity.
                </p>
              ) : (
                <p className="cond-count">
                  <b>No test in NASA&rsquo;s tables in this air.</b> The nearest:
                </p>
              )}
              <ul>
                {nearest.map((n) => (
                  <li key={n.test.id}>
                    {gapWords(n, c.conditions)} <TestCite test={n.test} />
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="muted small">
            {c.result.unknown.length.toLocaleString('en')} tests can&rsquo;t be checked: oxygen or pressure not in NASA&rsquo;s tables. {c.result.inverse_excluded}{' '}
            inverse-flame rows left out (burner gas, not cabin air).
          </p>
          {c.gravity !== null && c.gravity !== 0 && <p className="cond-gnote">{PARTIAL_G_TEXT}</p>}
        </div>
      )}
    </section>
  )
}
