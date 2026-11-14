// OWNER: dashboard + AI workstream.
// Evidence for the fire page: the nearest real NASA tests to a chosen point, what they did, and
// data-first answers to the three fire-safety tasks (prevention, suppression, detection) for one
// fuel type in one habitat. Pure functions with type-only imports, so ai/generate.mjs can reuse
// them with Node. Every statement carries the test rows or accessions it rests on; where the
// tables say nothing, the statement says so (kind "gap") instead of guessing.
import type { AppData, FuelClass, Habitat, Test } from '../types/data'
import type { ExpectedBehaviour, SimPoint } from '../types/sim'

const PSI_PER_ATM = 14.696
const pct = (f: number) => `${(f * 100).toFixed(1).replace(/\.0$/, '')} %`
const psiOf = (atm: number) => `${(atm * PSI_PER_ATM).toFixed(1).replace(/\.0$/, '')} psi`

export interface Statement {
  text: string
  /** tests.json ids and/or PSI accessions */
  cites: string[]
  kind: 'data' | 'gap'
}

export interface NearTest {
  test: Test
  o2Points: number
  psiGap: number
  oxygenOnly: boolean
}

const placed = (t: Test) => t.o2_basis === 'ambient' && t.o2_fraction !== null && t.pressure_atm !== null

/** The k nearest real tests of one fuel type to a point. Distance counts 1 percentage point of
 *  oxygen the same as 1 psi (the rule shown on screen). Solid tests have no pressure in their
 *  tables, so for them only oxygen is compared and the result says so. */
export function nearestTests(data: AppData, fuel: FuelClass, point: SimPoint, k = 5): NearTest[] {
  const pool = data.tests.filter((t) => t.fuel_class === fuel && placed(t))
  if (pool.length > 0) {
    return pool
      .map((t) => {
        const o2Points = Math.abs(t.o2_fraction! - point.o2Fraction) * 100
        const psiGap = Math.abs(t.pressure_atm! - point.pressureAtm) * PSI_PER_ATM
        return { test: t, o2Points, psiGap, oxygenOnly: false, d: Math.hypot(o2Points, psiGap) }
      })
      .sort((a, b) => a.d - b.d)
      .slice(0, k)
  }
  return data.tests
    .filter((t) => t.fuel_class === fuel && t.o2_basis === 'ambient' && t.o2_fraction !== null)
    .map((t) => ({ test: t, o2Points: Math.abs(t.o2_fraction! - point.o2Fraction) * 100, psiGap: 0, oxygenOnly: true }))
    .sort((a, b) => a.o2Points - b.o2Points)
    .slice(0, k)
}

const WENT_OUT = new Set(['extinction', 'self-extinguished'])
const KEPT = new Set(['completion'])

/** Summarise how the nearest tests ended. "flow terminated" and "disruption" are neither. */
export function expectedBehaviour(near: NearTest[]): { behaviour: ExpectedBehaviour; counts: Record<string, number>; recorded: number } {
  const counts: Record<string, number> = {}
  for (const n of near) if (n.test.outcome) counts[n.test.outcome] = (counts[n.test.outcome] ?? 0) + 1
  const recorded = Object.values(counts).reduce((a, b) => a + b, 0)
  const out = Object.entries(counts).filter(([o]) => WENT_OUT.has(o)).reduce((a, [, c]) => a + c, 0)
  const kept = Object.entries(counts).filter(([o]) => KEPT.has(o)).reduce((a, [, c]) => a + c, 0)
  let behaviour: ExpectedBehaviour = 'unknown'
  if (recorded > 0) {
    if (out > 0 && kept === 0 && out >= recorded / 2) behaviour = 'went-out'
    else if (kept > 0 && out === 0 && kept >= recorded / 2) behaviour = 'kept-burning'
    else behaviour = 'mixed'
  }
  return { behaviour, counts, recorded }
}

function range(vals: number[]) {
  return vals.length ? [Math.min(...vals), Math.max(...vals)] : null
}

const accOf = (data: AppData, acronym: string) => data.investigations.find((i) => i.acronym === acronym)?.accession

export interface TaskAnswers {
  prevention: Statement[]
  suppression: Statement[]
  detection: Statement[]
}

/** Data-first answers to the three tasks for one fuel type at one point in one habitat. */
export function taskAnswers(data: AppData, habitat: Habitat, fuel: FuelClass, point: SimPoint): TaskAnswers {
  const ofFuel = data.tests.filter((t) => t.fuel_class === fuel && t.o2_basis === 'ambient')
  const o2r = range(ofFuel.map((t) => t.o2_fraction).filter((v): v is number => v !== null))
  const pr = range(ofFuel.map((t) => t.pressure_atm).filter((v): v is number => v !== null))
  const invs = [...new Set(ofFuel.map((t) => t.investigation))]
  const prevention: Statement[] = []
  const suppression: Statement[] = []
  const detection: Statement[] = []

  // ---------- prevention: how far the tested conditions reach toward this point
  if (o2r) {
    const above = point.o2Fraction > o2r[1]
    prevention.push({
      kind: above ? 'gap' : 'data',
      text: above
        ? `This point (${pct(point.o2Fraction)} oxygen) is above every ${fuel} test in the tables; the highest is ${pct(o2r[1])}. How this fuel burns here is not in the tables.`
        : `${fuel[0].toUpperCase()}${fuel.slice(1)} tests in the tables span ${pct(o2r[0])} to ${pct(o2r[1])} cabin oxygen, which covers this point's ${pct(point.o2Fraction)}.`,
      cites: invs,
    })
  }
  if (pr) {
    const outside = point.pressureAtm < pr[0] || point.pressureAtm > pr[1]
    prevention.push({
      kind: outside ? 'gap' : 'data',
      text: outside
        ? `This point's pressure (${psiOf(point.pressureAtm)}) is outside the ${psiOf(pr[0])} to ${psiOf(pr[1])} the ${fuel} tests cover.`
        : `Tested pressures for ${fuel} run from ${psiOf(pr[0])} to ${psiOf(pr[1])}, covering this point's ${psiOf(point.pressureAtm)}.`,
      cites: invs,
    })
  } else if (ofFuel.length) {
    prevention.push({ kind: 'gap', text: `No ${fuel} table records pressure, so the effect of this habitat's pressure is not in the tables.`, cites: invs })
  }
  if (fuel === 'solid') {
    const mats = [...new Set(ofFuel.map((t) => t.fuel).filter((f): f is string => !!f))]
    const short = mats.slice(0, 6).map((m) => m.replace(/\s+/g, ' ').trim())
    prevention.push({
      kind: 'data',
      text: `Solid materials burned in the tables include ${short.join('; ')}${mats.length > 6 ? ` and ${mats.length - 6} more` : ''}.`,
      cites: invs,
    })
  }
  const air = ofFuel.filter((t) => t.airflow_cm_s !== null)
  if (air.length) {
    const ar = range(air.map((t) => t.airflow_cm_s!))!
    prevention.push({
      kind: 'data',
      text: `${air.length} ${fuel} tests record airflow (${ar[0]} to ${ar[1]} cm/s as written), so fan and ventilation speed can be studied for this fuel.`,
      cites: [...new Set(air.map((t) => t.investigation))],
    })
  } else {
    prevention.push({ kind: 'gap', text: `No ${fuel} test records airflow in the tables.`, cites: [] })
  }

  // ---------- suppression: what put flames out
  if (fuel === 'droplet') {
    const flex = data.tests.filter((t) => t.acronym === 'FLEX')
    const group = (pred: (t: Test) => boolean) => {
      const g = flex.filter(pred)
      return { n: g.length, out: g.filter((t) => t.outcome === 'extinction').length, ex: g.find((t) => t.outcome === 'extinction') }
    }
    const co2 = group((t) => (t.co2_fraction ?? 0) > 0)
    const he = group((t) => (t.he_fraction ?? 0) > 0)
    const none = group((t) => !(t.co2_fraction ?? 0) && !(t.he_fraction ?? 0))
    const flexAcc = accOf(data, 'FLEX')
    if (co2.n)
      suppression.push({ kind: 'data', text: `FLEX added carbon dioxide in ${co2.n} droplet tests; ${co2.out} ended in extinction.`, cites: [co2.ex?.id, flexAcc].filter((x): x is string => !!x) })
    if (he.n)
      suppression.push({ kind: 'data', text: `FLEX added helium in ${he.n} tests; ${he.out} ended in extinction.`, cites: [he.ex?.id, flexAcc].filter((x): x is string => !!x) })
    if (none.n)
      suppression.push({ kind: 'data', text: `For comparison, ${none.out} of ${none.n} FLEX tests with neither gas added also ended in extinction, so the agent is not the only factor.`, cites: [none.ex?.id, flexAcc].filter((x): x is string => !!x) })
  } else if (fuel === 'gas') {
    const cfig = data.tests.filter((t) => t.acronym === 'ACME CFI-G' && t.o2_basis === 'ambient')
    const se = cfig.filter((t) => t.outcome === 'self-extinguished')
    const ft = cfig.filter((t) => t.outcome === 'flow terminated')
    if (cfig.length)
      suppression.push({
        kind: 'data',
        text: `In ACME CFI-G, ${se.length} of ${cfig.length} cabin-air gas flames went out by themselves and ${ft.length} ended when the fuel flow was stopped.`,
        cites: [se[0]?.id, ft[0]?.id, accOf(data, 'ACME CFI-G')].filter((x): x is string => !!x),
      })
    suppression.push({ kind: 'gap', text: 'No gas-flame test in the tables adds an extinguishing agent.', cites: [] })
  } else {
    const bass = data.investigations.find((i) => i.acronym === 'BASS')
    suppression.push({
      kind: 'gap',
      text: 'No solid-material table records an extinguishing agent or how a flame was put out. BASS lists testing a gaseous extinguishing agent among its objectives; the result is in its reports, not its table.',
      cites: bass ? [bass.accession] : [],
    })
  }

  // ---------- detection: smoke and dust measurements
  const same = data.otherTables.filter((o) => o.acronym === 'SAME' || o.acronym === 'SAME-R')
  if (same.length) {
    const matCol = (o: (typeof same)[number]) => o.columns.findIndex((c) => /sample (type|material)/i.test(c))
    // Material cells sometimes carry a note after a colon ("Kapton: same conditions as 1-4"); keep the name only.
    const mats = [...new Set(same.flatMap((o) => o.rows.map((r) => (r[matCol(o)] ?? '').split(':')[0].trim()).filter(Boolean)))]
    const rows = same.reduce((n, o) => n + o.rows.length, 0)
    detection.push({
      kind: 'data',
      text: `SAME and SAME-R heated ${mats.length} spacecraft materials (${mats.join(', ')}) in ${rows} smoke tests to measure the smoke a detector would see.`,
      cites: same.map((o) => o.investigation),
    })
  }
  const daft = data.otherTables.find((o) => o.acronym?.startsWith('DAFT'))
  if (daft)
    detection.push({
      kind: 'data',
      text: 'DAFT measured dust in ISS air with the same kind of instrument. Telling smoke from dust cuts false alarms (challenge Resources tab, NASA smoke-detector spinoff).',
      cites: [daft.investigation],
    })
  detection.push({
    kind: fuel === 'solid' ? 'data' : 'gap',
    text:
      fuel === 'solid'
        ? 'Those smoke tests heat solid materials, so they apply most directly to a solid-material fire.'
        : `No smoke or detection measurement in the tables comes from a ${fuel} flame.`,
    cites: [],
  })

  void habitat
  return { prevention, suppression, detection }
}

/** The default point for a habitat: its oxygen floor at its pressure ceiling (the challenge's
 *  "30 % or more at 10.2 psi or less" corner for the Moon Base), or its single point. */
export function defaultPoint(h: Habitat): SimPoint {
  return { o2Fraction: h.o2_fraction[0], pressureAtm: h.pressure_atm[1] }
}
