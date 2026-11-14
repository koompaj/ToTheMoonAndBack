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
  o2_fraction: number | null // mole fraction 0..1; null = not usable in source
  o2_basis: O2Basis
  pressure_atm: number | null // null = not in source table
  airflow_cm_s: number | null
  co2_fraction: number | null // suppressant added (FLEX)
  he_fraction: number | null
  burn_time_s: number | null
  outcome: string | null // as recorded by NASA, normalised wording
  /** ambient O2 >= 0.30 and pressure <= 10.2 psi; null when either value is unknown
   *  or the oxygen is burner_oxidizer. */
  in_moon_envelope: boolean | null
  flags: string[] // why a value is null or needs care
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
  tables: { file: string; rows: number }[]
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

export interface AppData {
  tests: Test[]
  investigations: Investigation[]
  habitats: Habitat[]
}
