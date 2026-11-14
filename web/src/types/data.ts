// SHARED CONTRACT - the shape of the JSON in web/public/data/.
// Produced by scripts/build_web_data.py (data workstream), read by everything else.
// Change only by agreement of all three workstreams (see CLAUDE.md, "Shared files").

export type FuelClass = 'solid' | 'droplet' | 'gas'

/** ambient = oxygen in the cabin/chamber air. burner_oxidizer = oxygen in gas fed
 *  from the burner (inverse flames); NOT comparable to a habitat atmosphere. */
export type O2Basis = 'ambient' | 'burner_oxidizer'

export type Pillar = 'prevention' | 'detection' | 'suppression'

/** One real NASA test: one row of one PSI experimental table. */
export interface Test {
  id: string
  investigation: string // PSI accession, e.g. "PSI-69"
  acronym: string
  source_table: string // path under data/, for citation
  source_row: number // 1 = first data row under the header
  test_label: string | null // NASA's own test identifier
  fuel_class: FuelClass
  fuel: string | null
  o2_fraction: number | null // mole fraction 0..1; null = no single value in the source
  /** Set only when the source gives oxygen as a range (flag "o2_range"); o2_fraction is then null. */
  o2_fraction_min: number | null
  o2_fraction_max: number | null
  o2_basis: O2Basis
  pressure_atm: number | null // null = not in source table
  airflow_cm_s: number | null // as written in the source; can be negative (flag "airflow_negative_in_source")
  flow_direction: string | null // "concurrent" | "opposed" where the source says
  co2_fraction: number | null // suppressant added (FLEX)
  he_fraction: number | null
  burn_time_s: number | null
  outcome: string | null // as recorded by NASA, normalised wording
  /** ambient O2 >= 0.30 and pressure <= 10.2 psi; null when either value is unknown
   *  or the oxygen is burner_oxidizer. */
  in_moon_envelope: boolean | null
  /** Other cells of the source row, keyed by column header, exactly as NASA published them
   *  (typos included). For display in detail views; do not parse numbers out of it. */
  source_extra: Record<string, string> | null
  /** Why a value is null or needs care. Meanings are in data_quality.json (flag_meanings).
   *  Some carry a detail after a colon, e.g. "o2_not_numeric:RAMP", "duplicate_row:1". */
  flags: string[]
}

export interface Publication {
  title: string | null
  authors: string | null
  doi: string | null
}

export interface Investigation {
  accession: string
  acronym: string | null
  title: string
  project_type: string | null
  flight_platform: string | null
  sub_research_area: string | null
  keywords: string[]
  related: string[] // accessions
  start_date: string | null
  end_date: string | null
  release_date: string | null
  hardware: string | null
  hardware_link: string | null
  objectives: string | null
  approach: string | null
  hypothesis: string | null
  earth_benefits: string | null
  doi: string | null // cite this whenever the investigation is used
  license: string | null
  total_bytes: number | null
  publications: Publication[] // only those PSI lists - not the full literature
  /** used_in says which generated file holds the table: "tests.json" or "other_tables.json". */
  tables: { file: string; rows: number; used_in: string | null }[]
  fuel_class: FuelClass | null // null = not stated on the challenge page
  pillar: Pillar | null // null = not stated on the challenge page
  page: string // NASA PSI landing page
}

export interface Habitat {
  id: string
  name: string
  o2_fraction: [number, number]
  pressure_psi: [number, number]
  pressure_atm: [number, number]
  note: string
  source: string
  status: string // "from_challenge" or a note on what still needs a source
}

/** A NASA table that is not one-row-per-burn (per-day summaries, ranges, smoke tests, ...).
 *  Cells are exactly as published; nothing is parsed or corrected in `rows`. */
export interface OtherTable {
  investigation: string
  acronym: string | null
  source_table: string
  kind: 'per_day_summary' | 'ranges' | 'figure_index' | 'sessions' | 'smoke_tests'
  why_not_tests: string
  columns: string[]
  rows: string[][]
  known_issues: string[] // show these next to the table
  corrections: { row: number; column: string; as_published: string; read_as: string; reason: string }[]
}

/** What the pipeline did with each source table, and what every flag means. */
export interface DataQuality {
  tables: {
    source_table: string
    investigation: string
    rows_in_source: number
    rows_as_tests: number
    rows_left_out: { row: number; reason: string }[]
    used_in: string
    kind?: string
    why_not_tests?: string
  }[]
  flag_counts: Record<string, number>
  flag_meanings: Record<string, string>
  source_problems: string
}

export interface AppData {
  tests: Test[]
  investigations: Investigation[]
  habitats: Habitat[]
  otherTables: OtherTable[]
  quality: DataQuality
}
