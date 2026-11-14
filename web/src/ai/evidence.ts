// OWNER: dashboard + AI workstream.
// Evidence computed from the generated NASA data. Pure functions, no React, no value imports,
// so the offline AI script (ai/generate.mjs) can import this exact file with Node and produce
// the same numbers the app shows. Every number here comes from tests.json / investigations.json.
import type { AppData, FuelClass, Habitat, Investigation, Pillar, Test } from '../types/data'

export const PSI_PER_ATM = 14.696
export const CLASSES: FuelClass[] = ['solid', 'droplet', 'gas']
export const MOON_MIN_O2 = 0.3
export const MOON_MAX_PSI = 10.2

/** Same rule as testsInHabitat in data/load.ts; passed in so this file has no value imports. */
export type InHabitatFn = (tests: Test[], h: Habitat) => Test[]

export const psi = (atm: number) => atm * PSI_PER_ATM
export const pct = (fraction: number) => fraction * 100

export function fmtPct(fraction: number, digits = 1) {
  return `${(fraction * 100).toFixed(digits).replace(/\.0$/, '')} %`
}
export function fmtPsi(atm: number, digits = 1) {
  return `${psi(atm).toFixed(digits).replace(/\.0$/, '')} psi`
}

export function isPointHabitat(h: Habitat) {
  return h.o2_fraction[0] === h.o2_fraction[1] && h.pressure_atm[0] === h.pressure_atm[1]
}

/** A test placed on the oxygen/pressure map: cabin-air oxygen with both values known. */
export function isPlaced(t: Test) {
  return t.o2_basis === 'ambient' && t.o2_fraction !== null && t.pressure_atm !== null
}

export function isDuplicate(t: Test) {
  return t.flags.some((f) => f.startsWith('duplicate_row'))
}

/** How far a test sits outside a habitat box: oxygen in percentage points, pressure in psi.
 *  0 on an axis means the test is within the box's range on that axis. */
export function gapTo(t: Test, h: Habitat) {
  const o = t.o2_fraction!
  const p = t.pressure_atm!
  const dO2 = o < h.o2_fraction[0] ? h.o2_fraction[0] - o : o > h.o2_fraction[1] ? o - h.o2_fraction[1] : 0
  const dP = p < h.pressure_atm[0] ? h.pressure_atm[0] - p : p > h.pressure_atm[1] ? p - h.pressure_atm[1] : 0
  const o2Points = pct(dO2)
  const psiGap = psi(dP)
  // Ranking rule, shown on screen: one percentage point of oxygen counts the same as one psi.
  return { o2Points, psiGap, combined: Math.hypot(o2Points, psiGap) }
}

export interface Nearest {
  test: Test
  o2Points: number
  psiGap: number
  /** true when the test's table has no pressure column, so only oxygen could be compared. */
  oxygenOnly: boolean
}

export interface ClassEvidence {
  fuelClass: FuelClass
  inside: Test[]
  nearest: Nearest | null
  /** Tests of this class in cabin air that cannot be placed (no pressure and/or oxygen). */
  unplaced: number
}

export interface HabitatEvidence {
  habitat: Habitat
  point: boolean
  inside: Test[]
  byClass: ClassEvidence[]
  byInvestigation: { accession: string; acronym: string; count: number }[]
  outcomes: { outcome: string; count: number; example: Test }[]
  noOutcome: number
  duplicatesInside: number
  placedTotal: number
}

export function habitatEvidence(data: AppData, h: Habitat, inHabitat: InHabitatFn): HabitatEvidence {
  const inside = inHabitat(data.tests, h)
  const insideIds = new Set(inside.map((t) => t.id))
  const placed = data.tests.filter(isPlaced)

  const byClass = CLASSES.map((c): ClassEvidence => {
    const ins = inside.filter((t) => t.fuel_class === c)
    const candidates = placed.filter((t) => t.fuel_class === c && !insideIds.has(t.id))
    let nearest: Nearest | null = null
    for (const t of candidates) {
      const g = gapTo(t, h)
      if (!nearest || g.combined < Math.hypot(nearest.o2Points, nearest.psiGap)) {
        nearest = { test: t, o2Points: g.o2Points, psiGap: g.psiGap, oxygenOnly: false }
      }
    }
    // No placeable test of this class at all: compare on oxygen alone, and say so.
    if (!nearest) {
      const withO2 = data.tests.filter((t) => t.fuel_class === c && t.o2_basis === 'ambient' && t.o2_fraction !== null)
      for (const t of withO2) {
        const o = t.o2_fraction!
        const d = o < h.o2_fraction[0] ? h.o2_fraction[0] - o : o > h.o2_fraction[1] ? o - h.o2_fraction[1] : 0
        if (!nearest || pct(d) < nearest.o2Points) nearest = { test: t, o2Points: pct(d), psiGap: 0, oxygenOnly: true }
      }
    }
    const unplaced = data.tests.filter((t) => t.fuel_class === c && t.o2_basis === 'ambient' && !isPlaced(t)).length
    return { fuelClass: c, inside: ins, nearest, unplaced }
  })

  const invMap = new Map<string, { accession: string; acronym: string; count: number }>()
  for (const t of inside) {
    const e = invMap.get(t.investigation) ?? { accession: t.investigation, acronym: t.acronym, count: 0 }
    e.count++
    invMap.set(t.investigation, e)
  }

  const outMap = new Map<string, { outcome: string; count: number; example: Test }>()
  let noOutcome = 0
  for (const t of inside) {
    if (!t.outcome) {
      noOutcome++
      continue
    }
    const e = outMap.get(t.outcome) ?? { outcome: t.outcome, count: 0, example: t }
    e.count++
    outMap.set(t.outcome, e)
  }

  return {
    habitat: h,
    point: isPointHabitat(h),
    inside,
    byClass,
    byInvestigation: [...invMap.values()].sort((a, b) => b.count - a.count),
    outcomes: [...outMap.values()].sort((a, b) => b.count - a.count),
    noOutcome,
    duplicatesInside: inside.filter(isDuplicate).length,
    placedTotal: placed.length,
  }
}

/** The headline numbers, computed live so they can never drift from the data. */
export function headline(data: AppData) {
  const placed = data.tests.filter(isPlaced)
  const env = data.tests.filter((t) => t.in_moon_envelope === true)
  const envInvestigations = [...new Set(env.map((t) => t.investigation))]
  const envClasses = CLASSES.filter((c) => env.some((t) => t.fuel_class === c))
  const solidWithO2 = data.tests.filter((t) => t.fuel_class === 'solid' && t.o2_basis === 'ambient' && t.o2_fraction !== null)
  const topSolid = solidWithO2.reduce<Test | null>((m, t) => (!m || t.o2_fraction! > m.o2_fraction! ? t : m), null)
  const solidPlaced = placed.filter((t) => t.fuel_class === 'solid').length
  return {
    tests: data.tests.filter((t) => !isDuplicate(t)).length,
    placed: placed.length,
    env,
    envInvestigations,
    envClasses,
    topSolid,
    solidTotal: data.tests.filter((t) => t.fuel_class === 'solid').length,
    solidPlaced,
  }
}

// ---------------------------------------------------------------------------------------------
// Untapped-data ranking. Every point of the relevance score has a stated reason, shown on screen.

export interface ScorePart {
  points: number
  reason: string
}

export interface InvestigationStats {
  inv: Investigation
  tests: Test[]
  tableRows: number
  otherRows: number
  pubs: number
  /** Table rows per publication listed in PSI; null when PSI lists none. */
  rowsPerPub: number | null
  maxAmbientO2: number | null
  minPressureAtm: number | null
  airflowTests: number
  outcomeTests: number
  relevance: number
  parts: ScorePart[]
  releaseYear: number | null
}

export const RELEVANCE_RULES = [
  { points: 30, label: 'Fire-safety pillar named on the challenge page (prevention, detection or suppression)' },
  { points: 25, label: 'Burns solid materials, the focus of habitat flammability work per the challenge page' },
  { points: 20, label: 'Has a cabin-air test at 30 % oxygen or more' },
  { points: 15, label: 'Has a test at 10.2 psi or less' },
  { points: 10, label: 'Records airflow, which the challenge page says matters in microgravity' },
] as const

const PILLAR_WORD: Record<Pillar, string> = { prevention: 'prevention', detection: 'detection', suppression: 'suppression' }

export function investigationStats(data: AppData): InvestigationStats[] {
  return data.investigations.map((inv) => {
    // Rows that exactly repeat an earlier row (34 in SPICE) are not separate tests.
    const tests = data.tests.filter((t) => t.investigation === inv.accession && !isDuplicate(t))
    const tableRows = inv.tables.reduce((n, t) => n + t.rows, 0)
    const otherRows = data.otherTables.filter((o) => o.investigation === inv.accession).reduce((n, o) => n + o.rows.length, 0)
    const pubs = inv.publications.length
    const amb = tests.filter((t) => t.o2_basis === 'ambient')
    const o2s = amb.map((t) => t.o2_fraction).filter((v): v is number => v !== null)
    const ps = tests.map((t) => t.pressure_atm).filter((v): v is number => v !== null)
    const maxAmbientO2 = o2s.length ? Math.max(...o2s) : null
    const minPressureAtm = ps.length ? Math.min(...ps) : null
    const airflowTests = tests.filter((t) => t.airflow_cm_s !== null).length

    const parts: ScorePart[] = []
    if (inv.pillar) parts.push({ points: 30, reason: `Challenge page names it under ${PILLAR_WORD[inv.pillar]}` })
    if (inv.fuel_class === 'solid' || tests.some((t) => t.fuel_class === 'solid'))
      parts.push({ points: 25, reason: 'Burns solid materials' })
    if (maxAmbientO2 !== null && maxAmbientO2 >= MOON_MIN_O2)
      parts.push({ points: 20, reason: `Cabin-air oxygen reaches ${fmtPct(maxAmbientO2)}` })
    if (minPressureAtm !== null && psi(minPressureAtm) <= MOON_MAX_PSI)
      parts.push({ points: 15, reason: `Pressure goes down to ${fmtPsi(minPressureAtm)}` })
    if (airflowTests > 0) parts.push({ points: 10, reason: `${airflowTests} tests record airflow` })

    const year = inv.release_date ? Number(inv.release_date.slice(-4)) : NaN
    return {
      inv,
      tests,
      tableRows,
      otherRows,
      pubs,
      rowsPerPub: pubs > 0 ? tableRows / pubs : null,
      maxAmbientO2,
      minPressureAtm,
      airflowTests,
      outcomeTests: tests.filter((t) => t.outcome !== null).length,
      relevance: parts.reduce((n, p) => n + p.points, 0),
      parts,
      releaseYear: Number.isFinite(year) ? year : null,
    }
  })
}

/** Which investigations build on which, from PSI's "Related Investigations" field. */
export function reuseLinks(data: AppData) {
  const byAcc = new Map(data.investigations.map((i) => [i.accession, i]))
  const links: { from: Investigation; to: Investigation }[] = []
  for (const i of data.investigations) {
    for (const r of i.related) {
      const to = byAcc.get(r)
      if (to) links.push({ from: i, to })
    }
  }
  return links
}

export function shortName(inv: Investigation) {
  if (inv.acronym) return inv.acronym
  const t = inv.title ?? inv.accession
  return t.length > 44 ? `${t.slice(0, 42).trimEnd()}…` : t
}
