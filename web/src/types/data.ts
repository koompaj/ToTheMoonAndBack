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
  burn_time_s: number | null // SPICE: flame-off minus ignition time (flag burn_time_from_gmt_times)
  outcome: string | null // as recorded by NASA, normalised wording
  /** Solid materials: the base material named in the fuel cell (e.g. "PMMA"); null when the cell names
   *  only a shape (flag material_not_stated). Null for gas and droplet tests. */
  fuel_material?: string | null
  // Typed values from columns only some tables have; null elsewhere. Units are in the names.
  sample_length_cm?: number | null // SAFFIRE (SAFFIRE-I corrected, flag dimensions_swapped_in_source)
  sample_width_cm?: number | null
  sample_thickness_mm?: number | null
  droplet_diameter_mm?: number | null // FLEX, initial droplet
  extinction_diameter_mm?: number | null // FLEX, visible flame extinction
  burning_rate?: number | null // FLEX, unit unclear in NASA's header (flag burning_rate_unit_unclear)
  cool_flame?: string | null // ACME CFI-G normal flames, as written ("yes, PCI-A")
  hot_ignition?: 'yes' | 'no' | 'flash' | null // ACME CFI-G
  peak_burner_temp_c?: number | null // ACME CFI-G
  ignition_time?: string | null // SPICE, GMT "HH:MM:SS"
  flame_off_time?: string | null
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
  /** Links to the sources actually opened and checked (gemini_data/VERIFIED.md). */
  source_urls?: string[]
  /** Starts with "from_" when every number is sourced: "from_challenge", "from_nasa",
   *  "from_challenge_and_nasa". Anything else describes what still needs a source.
   *  Use isSourced() in data/load.ts rather than comparing strings. */
  status: string
}

/** One group of tests in the "will it go out" analysis (outcomes.json). */
export interface OutcomeGroup {
  label: string
  x: number // the value grouped on: oxygen band midpoint (fraction), pressure (psi) or a category index
  n: number
  recorded: number // tests whose ending NASA's table records
  went_out: number
  share_went_out: number | null // went_out / recorded
  endings: Record<string, number>
  test_ids: string[] // every test counted, for citation
}

export interface OutcomeStudy {
  id: string
  investigation: string
  acronym: string
  fuel_class: FuelClass
  question: string
  went_out_means: string
  /** "clear", "no_clear_pattern" or "not_tested_for_a_trend". The rule is in `rule`. */
  verdict: string
  finding: string // one plain sentence with counts
  group_by?: string
  groups?: OutcomeGroup[]
  direction?: string | null
  rank_correlation?: number | null
  spread_points?: number
  groups_used?: number
  rule?: string
  matched_groups?: { group: string; groups: OutcomeGroup[]; verdict: string; rank_correlation: number | null; spread_points: number; groups_used: number }[]
  groups_matched_oxygen?: OutcomeGroup[]
  matched_oxygen_band?: string
}

/** "Will it go out?": descriptive counts from FLEX and ACME CFI-G (scripts/outcome_analysis.py). */
export interface OutcomeAnalysis {
  generated_by: string
  method: string
  caveats: string[] // show these wherever a finding is shown
  studies: OutcomeStudy[]
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
  /** The same rows with `corrections` applied (autofill, continuation rows, stray text). */
  rows_read_as?: string[][]
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
  /** tests.json rows; 34 SPICE rows exactly repeat an earlier row (flag duplicate_row). */
  tests_total?: number
  duplicate_rows?: number
  /** Use this, not tests.length, when saying "N NASA tests". */
  distinct_tests?: number
  source_problems: string
}

export interface AppData {
  tests: Test[]
  investigations: Investigation[]
  habitats: Habitat[]
  otherTables: OtherTable[]
  quality: DataQuality
  /** Optional so older callers (ai/generate.mjs) keep working. */
  outcomes?: OutcomeAnalysis
}
