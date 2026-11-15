// OWNER: dashboard + AI workstream.
// AI risk review of a user upload. Three parts:
//  1. checks():  data problems found by code, not AI (missing values, outside the place's air, ...).
//  2. buildFacts(): the only things the AI may use: the upload's own values, the checks, and facts
//     worked out from NASA's tables (place counts, nearest tests, gaps). Each fact has an id; the
//     AI must cite ids, and the helper drops any line that doesn't.
//  3. requestReview(): asks the local helper (ai/risk-server.mjs, which holds the API key) and keeps
//     the result in this browser with the upload. New reviews are "unseen" until the Risk page is read.
import type { AppData, Habitat, Test } from '../types/data'
import { conditionsFromHabitat, nearestOutside, testsInHabitat } from '../data/load'
import { placeName } from './places'
import type { UserUpload } from './uploads'

export const HELPER = 'http://127.0.0.1:8787'
const KEY = 'fif-upload-reviews-v1'
const EVENT = 'fif-reviews-changed'

export interface Fact {
  id: string
  text: string
  /** How to show the citation chip: an upload row, a check, a NASA test id or an investigation accession. */
  kind: 'upload' | 'row' | 'check' | 'place' | 'nasa-test' | 'investigation' | 'gap' | 'outcome' | 'nasa'
  ref?: string // test id or accession for NASA chips
  label: string
}
export interface Line {
  text: string
  cites: string[]
}
export interface Review {
  summary: Line | null
  risks: Line[]
  missing: Line[]
  problems: Line[]
  compare: Line[]
  next: Line[]
  dropped: number
}
export interface StoredReview {
  review: Review
  facts: Fact[]
  model: string
  provider: string
  generated_at: string
  seen: boolean
}
export interface Check {
  id: string
  text: string
}

const pct = (f: number) => `${(f * 100).toFixed(1).replace(/\.0$/, '')} %`
const psiOf = (atm: number) => `${(atm * 14.6959).toFixed(1).replace(/\.0$/, '')} psi`
const rowsText = (rows: number[]) => `${rows.length === 1 ? 'row' : 'rows'} ${rows.length > 8 ? `${rows.slice(0, 8).join(', ')} and ${rows.length - 8} more` : rows.join(', ')}`

export function placeOf(upload: UserUpload, data: AppData): Habitat | null {
  const name = upload.investigation.flight_platform
  return data.habitats.find((h) => placeName(h.id, h.name) === name || h.name === name) ?? null
}

/** Data problems in the upload, found by code. Same input, same answer, every time. */
export function checks(upload: UserUpload, data: AppData): Check[] {
  const t = upload.tests
  const hab = placeOf(upload, data)
  const out: Check[] = []
  const add = (text: string) => out.push({ id: `CK${out.length + 1}`, text })
  const rows = (f: (x: Test) => boolean) => t.filter(f).map((x) => x.source_row)

  if (t.length < 3) add(`Only ${t.length} test${t.length === 1 ? '' : 's'} uploaded, too few to see a pattern.`)
  const noO2 = rows((x) => x.o2_fraction === null)
  if (noO2.length) add(`${noO2.length} of ${t.length} rows have no oxygen value (${rowsText(noO2)}), so they cannot be compared with any place's air.`)
  const noP = rows((x) => x.pressure_atm === null)
  if (noP.length) add(`${noP.length} of ${t.length} rows have no pressure value (${rowsText(noP)}).`)
  const noG = rows((x) => x.gravity_g === undefined)
  if (noG.length) add(`${noG.length} of ${t.length} rows do not say the gravity they ran in (${rowsText(noG)}).`)
  const noEnd = rows((x) => !x.outcome)
  if (noEnd.length) add(`${noEnd.length} of ${t.length} rows record no ending (went out or burned on) (${rowsText(noEnd)}).`)
  const noFuel = rows((x) => !x.fuel)
  if (noFuel.length) add(`${noFuel.length} of ${t.length} rows do not name the fuel or material (${rowsText(noFuel)}).`)
  if (hab) {
    const c = conditionsFromHabitat(hab)
    const outside = rows(
      (x) =>
        x.o2_fraction !== null &&
        x.pressure_atm !== null &&
        (x.o2_fraction < c.o2[0] || x.o2_fraction > c.o2[1] || x.pressure_atm * 14.6959 < c.psi[0] - 1e-9 || x.pressure_atm * 14.6959 > c.psi[1] + 1e-9),
    )
    if (outside.length)
      add(
        `${outside.length} of ${t.length} rows are outside the air of the place chosen, ${placeName(hab.id, hab.name)} (${pct(hab.o2_fraction[0])} to ${pct(hab.o2_fraction[1])} oxygen, ${hab.pressure_psi[0]} to ${hab.pressure_psi[1]} psi) (${rowsText(outside)}).`,
      )
    const gs = hab.gravity?.g ?? []
    if (gs.length) {
      const offG = rows((x) => x.gravity_g !== undefined && !gs.some((g) => Math.abs(g - x.gravity_g!) <= 0.02))
      if (offG.length) add(`${offG.length} of ${t.length} rows ran at a gravity other than ${placeName(hab.id, hab.name)}'s (${gs.join(' or ')} g) (${rowsText(offG)}).`)
    }
  }
  const maxPlacePsi = Math.max(...data.habitats.map((h) => h.pressure_psi[1]))
  const high = rows((x) => x.pressure_atm !== null && x.pressure_atm * 14.6959 > maxPlacePsi + 1e-9)
  if (high.length) add(`${high.length} rows are above ${maxPlacePsi} psi, higher than the air of any place on the dashboard (${rowsText(high)}).`)
  const seen = new Map<string, number>()
  const repeats: string[] = []
  for (const x of t) {
    const k = [x.fuel, x.o2_fraction, x.pressure_atm, x.gravity_g, x.outcome].join('|')
    if (seen.has(k)) repeats.push(`${seen.get(k)} and ${x.source_row}`)
    else seen.set(k, x.source_row)
  }
  if (repeats.length) add(`${repeats.length} rows repeat an earlier row exactly (rows ${repeats.slice(0, 6).join('; ')}); they may be one test entered twice.`)
  if (!upload.investigation.doi) add('The source is a web link, not a DOI, so it may change or disappear.')
  return out
}

/** Everything the AI may use, each with an id it must cite. */
export function buildFacts(upload: UserUpload, data: AppData): Fact[] {
  const inv = upload.investigation
  const t = upload.tests
  const hab = placeOf(upload, data)
  const facts: Fact[] = []
  const fuel = inv.fuel_class ?? t[0]?.fuel_class ?? 'solid'
  const fuelWord = fuel === 'solid' ? 'solid-material' : fuel === 'droplet' ? 'fuel-droplet' : 'gas-flame'

  facts.push({
    id: 'UP',
    kind: 'upload',
    label: 'your upload',
    text: `User upload "${inv.acronym} - ${inv.title}" by ${inv.keywords[1] ?? 'the user'}: ${t.length} ${fuelWord} tests, for the place "${inv.flight_platform ?? 'not chosen'}". Source given: ${inv.doi ? `doi:${inv.doi}` : inv.page || 'none'}. This is the user's data, not NASA's.${inv.objectives ? ` What it studied: ${inv.objectives.slice(0, 400)}` : ''}`,
  })
  const o2s = t.map((x) => x.o2_fraction).filter((v): v is number => v !== null)
  const ps = t.map((x) => x.pressure_atm).filter((v): v is number => v !== null)
  const gs = [...new Set(t.map((x) => x.gravity_g).filter((v): v is number => v !== undefined))]
  const ends = Object.entries(t.reduce<Record<string, number>>((m, x) => ((m[x.outcome ?? 'not recorded'] = (m[x.outcome ?? 'not recorded'] ?? 0) + 1), m), {}))
  facts.push({
    id: 'UX',
    kind: 'upload',
    label: 'your ranges',
    text: `Across the uploaded rows: oxygen ${o2s.length ? `${pct(Math.min(...o2s))} to ${pct(Math.max(...o2s))}` : 'not given'}; pressure ${ps.length ? `${psiOf(Math.min(...ps))} to ${psiOf(Math.max(...ps))}` : 'not given'}; gravity ${gs.length ? gs.map((g) => `${g} g`).join(', ') : 'not given'}; endings: ${ends.map(([k, n]) => `${k} ${n}`).join(', ')}.`,
  })
  for (const x of t.slice(0, 60))
    facts.push({
      id: `UR${x.source_row}`,
      kind: 'row',
      label: `your row ${x.source_row}`,
      text: `Uploaded row ${x.source_row}${x.test_label ? ` (${x.test_label})` : ''}: ${x.fuel ?? 'fuel not named'}, oxygen ${x.o2_fraction === null ? 'not given' : pct(x.o2_fraction)}, pressure ${x.pressure_atm === null ? 'not given' : psiOf(x.pressure_atm)}, gravity ${x.gravity_g === undefined ? 'not given' : `${x.gravity_g} g`}, ending ${x.outcome ?? 'not recorded'}.`,
    })
  for (const c of checks(upload, data)) facts.push({ id: c.id, kind: 'check', label: `check ${c.id.slice(2)}`, text: `Automatic check: ${c.text}` })

  if (hab) {
    const g = hab.gravity
    facts.push({
      id: 'PL',
      kind: 'place',
      label: placeName(hab.id, hab.name),
      text: `${placeName(hab.id, hab.name)}: cabin air ${pct(hab.o2_fraction[0])} to ${pct(hab.o2_fraction[1])} oxygen, ${hab.pressure_psi[0]} to ${hab.pressure_psi[1]} psi${g ? `; gravity ${g.g.join(' or ')} g (${g.label})` : ''}. Source: ${hab.source_urls?.[0] ?? 'habitats.json'}.`,
    })
    const inside = testsInHabitat(data.tests, hab)
    const same = inside.filter((x) => x.fuel_class === fuel)
    const invs = [...new Set(same.map((x) => x.investigation))]
    facts.push({
      id: 'NI',
      kind: 'nasa',
      label: `NASA in ${placeName(hab.id, hab.name)}`,
      text: `NASA's tables hold ${inside.length} cabin-air tests inside ${placeName(hab.id, hab.name)}'s air, ${same.length} of them ${fuelWord} tests${invs.length ? ` (from ${invs.map((a) => data.investigations.find((i) => i.accession === a)?.acronym ?? a).join(', ')})` : ''}. Every NASA test in these tables ran in microgravity (0 g).`,
    })
    for (const a of invs.slice(0, 6)) {
      const i = data.investigations.find((v) => v.accession === a)
      if (i) facts.push({ id: a, kind: 'investigation', ref: a, label: i.acronym ?? a, text: `${i.acronym ?? a}: ${i.title}${i.doi ? ` (doi:${i.doi})` : ''}.` })
    }
    // NASA's nearest same-fuel tests to the place's air, when none sit inside it.
    if (!same.length) {
      const near = nearestOutside(data.tests.filter((x) => x.fuel_class === fuel), conditionsFromHabitat(hab), 3)
      for (const n of near)
        facts.push({
          id: n.test.id,
          kind: 'nasa-test',
          ref: n.test.id,
          label: `${n.test.acronym} row ${n.test.source_row}`,
          text: `Nearest NASA ${fuelWord} test to ${placeName(hab.id, hab.name)}'s air: ${n.test.acronym} row ${n.test.source_row}, ${pct(n.test.o2_fraction!)} oxygen, ${psiOf(n.test.pressure_atm!)}, ending ${n.test.outcome ?? 'not recorded'}; ${n.o2_gap_points.toFixed(1)} oxygen points and ${n.psi_gap.toFixed(1)} psi outside the place's air.`,
        })
    }
  }
  const sameFuel = data.tests.filter((x) => x.fuel_class === fuel && x.o2_basis === 'ambient')
  const nasaO2 = sameFuel.map((x) => x.o2_fraction).filter((v): v is number => v !== null)
  const nasaP = sameFuel.map((x) => x.pressure_atm).filter((v): v is number => v !== null)
  facts.push({
    id: 'NF',
    kind: 'nasa',
    label: `NASA ${fuelWord} tests`,
    text: `NASA's tables hold ${sameFuel.length} cabin-air ${fuelWord} tests; ${nasaO2.length} record oxygen (${nasaO2.length ? `${pct(Math.min(...nasaO2))} to ${pct(Math.max(...nasaO2))}` : 'none'}) and ${nasaP.length} a pressure (${nasaP.length ? `${psiOf(Math.min(...nasaP))} to ${psiOf(Math.max(...nasaP))}` : 'none'}). No partial-gravity test is in the tables.`,
  })
  // The uploaded row nearest to NASA's evidence, compared one by one (first 5 placed rows).
  for (const x of t.filter((r) => r.o2_fraction !== null && r.pressure_atm !== null).slice(0, 5)) {
    const pool = data.tests.filter((n) => n.fuel_class === fuel && n.o2_basis === 'ambient' && n.o2_fraction !== null && n.pressure_atm !== null)
    let best: Test | null = null
    let bestD = Infinity
    for (const n of pool) {
      const d = Math.abs(n.o2_fraction! - x.o2_fraction!) * 100 + Math.abs(n.pressure_atm! - x.pressure_atm!) * 14.6959
      if (d < bestD) (bestD = d), (best = n)
    }
    if (best && !facts.some((f) => f.id === best!.id))
      facts.push({
        id: best.id,
        kind: 'nasa-test',
        ref: best.id,
        label: `${best.acronym} row ${best.source_row}`,
        text: `Closest NASA ${fuelWord} test to uploaded row ${x.source_row}: ${best.acronym} row ${best.source_row}, ${pct(best.o2_fraction!)} oxygen, ${psiOf(best.pressure_atm!)}, ending ${best.outcome ?? 'not recorded'} (about ${bestD.toFixed(1)} oxygen points plus psi away).`,
      })
  }
  // A's outcome analysis for this fuel, with its caveats.
  for (const s of data.outcomes?.studies.filter((s) => s.fuel_class === fuel) ?? [])
    facts.push({ id: `OUT-${s.id}`, kind: 'outcome', label: `${s.acronym} outcomes`, text: `NASA outcome analysis (${s.acronym}): ${s.finding} Verdict: ${s.verdict.replace(/_/g, ' ')}.` })
  if (data.outcomes?.caveats.length) facts.push({ id: 'OUT-caveats', kind: 'outcome', label: 'outcome caveats', text: `Caveats on the outcome analysis: ${data.outcomes.caveats.join(' ')}` })
  // What NASA's tables lack, per fire-safety job (gaps.json).
  for (const p of data.gaps?.pillars ?? [])
    p.not_in_tables.forEach((g, i) => facts.push({ id: `GAP-${p.pillar}-${i + 1}`, kind: 'gap', label: `${p.pillar} gap ${i + 1}`, text: `Not in NASA's tables (${p.pillar}): ${g.text}` }))
  return facts
}

// ---------- storage ----------

export function loadReviews(): Record<string, StoredReview> {
  try {
    const raw = localStorage.getItem(KEY)
    const v = raw ? JSON.parse(raw) : {}
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {}
  }
}
function saveReviews(all: Record<string, StoredReview>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    /* storage full or blocked: the review still shows this visit */
  }
  window.dispatchEvent(new Event(EVENT))
}
export function onReviewsChanged(fn: () => void) {
  window.addEventListener(EVENT, fn)
  return () => window.removeEventListener(EVENT, fn)
}
export function markSeen(ids: string[]) {
  const all = loadReviews()
  let changed = false
  for (const id of ids)
    if (all[id] && !all[id].seen) {
      all[id] = { ...all[id], seen: true }
      changed = true
    }
  if (changed) saveReviews(all)
}

// ---------- asking the helper ----------

export async function helperUp(): Promise<boolean> {
  try {
    const r = await fetch(`${HELPER}/api/health`, { signal: AbortSignal.timeout(2500) })
    return r.ok && (await r.json()).ok === true
  } catch {
    return false
  }
}

const inFlight = new Map<string, Promise<StoredReview>>()

/** Ask the helper for a review of one upload and keep it. One request per upload at a time. */
export function requestReview(upload: UserUpload, data: AppData): Promise<StoredReview> {
  const running = inFlight.get(upload.id)
  if (running) return running
  const p = (async () => {
    const facts = buildFacts(upload, data)
    const res = await fetch(`${HELPER}/api/risk-review`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ facts: facts.map(({ id, text }) => ({ id, text })) }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error ?? `helper answered ${res.status}`)
    const stored: StoredReview = { review: json.review, facts, model: json.model, provider: json.provider, generated_at: json.generated_at, seen: false }
    const all = loadReviews()
    all[upload.id] = stored
    saveReviews(all)
    return stored
  })()
  inFlight.set(upload.id, p)
  p.finally(() => inFlight.delete(upload.id)).catch(() => {})
  return p
}

/** One line about an upload for the marked rows on the Risk page: "5 solid tests · 30-34 % O₂ · 8.2-14.7 psi". */
export function uploadLine(upload: UserUpload): string {
  const t = upload.tests
  const fuel = upload.investigation.fuel_class ?? t[0]?.fuel_class ?? 'solid'
  const o2 = t.map((x) => x.o2_fraction).filter((v): v is number => v !== null)
  const p = t.map((x) => x.pressure_atm).filter((v): v is number => v !== null)
  const range = (a: number[], f: (v: number) => string) => (a.length ? (Math.min(...a) === Math.max(...a) ? f(a[0]) : `${f(Math.min(...a))}-${f(Math.max(...a))}`) : null)
  const num = (v: number) => (Math.round(v * 10) / 10).toString()
  return [
    `${t.length} ${fuel} ${t.length === 1 ? 'test' : 'tests'}`,
    range(o2, (v) => num(v * 100)) && `${range(o2, (v) => num(v * 100))} % O₂`,
    range(p, (v) => num(v * 14.6959)) && `${range(p, (v) => num(v * 14.6959))} psi`,
  ]
    .filter(Boolean)
    .join(' · ')
}
