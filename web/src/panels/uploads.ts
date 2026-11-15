// OWNER: dashboard + AI workstream.
// User-uploaded experiments. They are saved in this browser only (localStorage), never sent anywhere,
// and once submitted they cannot be edited. They are added to the dashboard's data and counts, and
// every one carries a mark (accession "USER-…", source_table "user-upload", flag "user_uploaded") so
// the screen can always tell them apart from NASA's own tables.
import type { AppData, FuelClass, Investigation, Pillar, Test } from '../types/data'

const KEY = 'fif-user-uploads-v1'
const EVENT = 'fif-uploads-changed'
export const USER_TABLE = 'user-upload'
export const USER_FLAG = 'user_uploaded'

export interface UserUpload {
  id: string // "USER-<time>"
  submitted_at: string // ISO time
  investigation: Investigation
  tests: Test[]
}

export const isUserInvestigation = (i: Pick<Investigation, 'accession'>) => i.accession.startsWith('USER-')
export const isUserTest = (t: Pick<Test, 'source_table'>) => t.source_table === USER_TABLE

export function loadUploads(): UserUpload[] {
  try {
    const raw = localStorage.getItem(KEY)
    const list = raw ? (JSON.parse(raw) as UserUpload[]) : []
    return Array.isArray(list) ? list.filter((u) => u && u.investigation && Array.isArray(u.tests)) : []
  } catch {
    return []
  }
}

/** Appends one upload. Returns false when the browser would not save it (private window, full storage). */
export function saveUpload(u: UserUpload): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify([...loadUploads(), u]))
    window.dispatchEvent(new Event(EVENT))
    return true
  } catch {
    return false
  }
}

export function onUploadsChanged(fn: () => void) {
  const storage = (e: StorageEvent) => e.key === KEY && fn()
  window.addEventListener(EVENT, fn)
  window.addEventListener('storage', storage)
  return () => {
    window.removeEventListener(EVENT, fn)
    window.removeEventListener('storage', storage)
  }
}

/** NASA data plus the user's uploads. The distinct-test count grows by the uploaded rows. */
export function mergeUploads(data: AppData, uploads: UserUpload[]): AppData {
  if (!uploads.length) return data
  const tests = uploads.flatMap((u) => u.tests)
  return {
    ...data,
    investigations: [...data.investigations, ...uploads.map((u) => u.investigation)],
    tests: [...data.tests, ...tests],
    quality: { ...data.quality, distinct_tests: data.quality.distinct_tests == null ? data.quality.distinct_tests : data.quality.distinct_tests + tests.length },
  }
}

// ---------- building an upload from the form ----------

export const CSV_COLUMNS = ['test_label', 'fuel', 'oxygen_percent', 'pressure_psi', 'gravity_g', 'outcome'] as const
export const CSV_TEMPLATE = `${CSV_COLUMNS.join(',')}\nT1,PMMA,21,14.7,0,extinction\nT2,PMMA,30,10.2,0,completion\n`

export interface RowResult {
  line: number // line in the file (header = 1)
  values: Record<string, string>
  errors: string[]
}

/** Splits one CSV line, allowing "quoted, cells". */
function splitCsv(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let q = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (q) {
      if (ch === '"' && line[i + 1] === '"') (cur += '"'), i++
      else if (ch === '"') q = false
      else cur += ch
    } else if (ch === '"') q = true
    else if (ch === ',') out.push(cur.trim()), (cur = '')
    else cur += ch
  }
  out.push(cur.trim())
  return out
}

function num(v: string | undefined, label: string, min: number, max: number, errors: string[]): number | null {
  if (v === undefined || v === '') return null
  const n = Number(v)
  if (!Number.isFinite(n)) errors.push(`${label} "${v}" is not a number`)
  else if (n < min || n > max) errors.push(`${label} ${n} is outside ${min}-${max}`)
  else return n
  return null
}

/** Reads the tests file. Header row required; unknown columns are kept as-is in source_extra. */
export function parseTestsCsv(text: string): { header: string[]; rows: RowResult[]; fileError: string | null } {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim() !== '')
  if (lines.length < 2) return { header: [], rows: [], fileError: 'The file needs a header row and at least one test row.' }
  const header = splitCsv(lines[0]).map((h) => h.toLowerCase())
  const missing = ['oxygen_percent', 'pressure_psi'].filter((c) => !header.includes(c))
  if (missing.length) return { header, rows: [], fileError: `Missing column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}. Use the template.` }
  if (lines.length > 2001) return { header, rows: [], fileError: 'Up to 2,000 test rows per upload.' }
  const rows = lines.slice(1).map((l, i) => {
    const cells = splitCsv(l)
    const values: Record<string, string> = {}
    header.forEach((h, j) => (values[h] = cells[j] ?? ''))
    const errors: string[] = []
    num(values.oxygen_percent, 'Oxygen', 0, 100, errors)
    num(values.pressure_psi, 'Pressure', 0, 100, errors)
    num(values.gravity_g, 'Gravity', 0, 3, errors)
    if (!values.oxygen_percent && !values.pressure_psi) errors.push('needs oxygen or pressure')
    return { line: i + 2, values, errors }
  })
  return { header, rows, fileError: null }
}

export interface UploadForm {
  acronym: string
  title: string
  organisation: string
  platform: string
  fuel_class: FuelClass
  pillar: Pillar | ''
  source: string // DOI or link
  description: string
}

const DOI = /^(?:https?:\/\/(?:dx\.)?doi\.org\/|doi:)?(10\.\d{4,9}\/\S+)$/i

/** A DOI or an http(s) link; anything else (e.g. javascript:) is refused. */
export const isValidSource = (s: string) => DOI.test(s.trim()) || /^https?:\/\/\S+$/i.test(s.trim())

export function buildUpload(f: UploadForm, rows: RowResult[], fileName: string): UserUpload {
  const id = `USER-${Date.now().toString(36).toUpperCase()}`
  const doi = DOI.exec(f.source.trim())?.[1] ?? null
  const link = doi ? `https://doi.org/${doi}` : /^https?:\/\/\S+$/i.test(f.source.trim()) ? f.source.trim() : ''
  const known = new Set<string>(CSV_COLUMNS)
  const tests: Test[] = rows.map((r, i) => {
    const errors: string[] = []
    const o2 = num(r.values.oxygen_percent, 'o2', 0, 100, errors)
    const p = num(r.values.pressure_psi, 'p', 0, 100, errors)
    const g = num(r.values.gravity_g, 'g', 0, 3, errors)
    const extra = Object.fromEntries(Object.entries(r.values).filter(([k, v]) => !known.has(k) && v !== ''))
    const o2f = o2 === null ? null : o2 / 100
    return {
      id: `${id}-${i + 1}`,
      investigation: id,
      acronym: f.acronym.trim(),
      source_table: USER_TABLE,
      source_row: i + 1,
      test_label: r.values.test_label || null,
      fuel_class: f.fuel_class,
      fuel: r.values.fuel || null,
      o2_fraction: o2f,
      o2_fraction_min: null,
      o2_fraction_max: null,
      o2_basis: 'ambient',
      pressure_atm: p === null ? null : p / 14.6959,
      airflow_cm_s: null,
      flow_direction: null,
      co2_fraction: null,
      he_fraction: null,
      burn_time_s: null,
      outcome: r.values.outcome ? r.values.outcome.toLowerCase() : null,
      fuel_material: f.fuel_class === 'solid' ? r.values.fuel || null : null,
      gravity_g: g ?? undefined,
      in_moon_envelope: o2f === null || p === null ? null : o2f >= 0.3 && p <= 10.2,
      source_extra: { 'Uploaded file': fileName, ...extra },
      flags: [USER_FLAG, ...(o2 === null ? ['o2_not_in_table'] : []), ...(p === null ? ['pressure_not_in_table'] : [])],
    }
  })
  const now = new Date().toISOString()
  const investigation: Investigation = {
    accession: id,
    acronym: f.acronym.trim(),
    title: f.title.trim(),
    project_type: 'User upload',
    flight_platform: f.platform.trim() || null,
    sub_research_area: null,
    keywords: ['user upload', f.organisation.trim()].filter(Boolean),
    related: [],
    start_date: null,
    end_date: null,
    release_date: now.slice(0, 10),
    hardware: null,
    hardware_link: null,
    objectives: f.description.trim() || null,
    approach: `Submitted by ${f.organisation.trim()} on ${now.slice(0, 10)}. Not from NASA's PSI tables.`,
    hypothesis: null,
    earth_benefits: null,
    doi,
    license: null,
    total_bytes: null,
    publications: [],
    tables: [{ file: fileName, rows: tests.length, used_in: 'tests.json' }],
    fuel_class: f.fuel_class,
    pillar: f.pillar || null,
    page: link,
  }
  return { id, submitted_at: now, investigation, tests }
}
