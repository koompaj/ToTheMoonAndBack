// OWNER: workstream A (data). The habitat evidence map: what NASA's tables say about one mark on a
// layout (docs/LAYOUT_PLAN.md section 5). Pure functions with type-only imports, so Node scripts
// (ai/generate.mjs) can reuse them. Every number comes from fuels.json, which build_web_data.py
// computes and validate_data.py checks; this file only turns it into card lines.
import type { AppData, FuelClass, Habitat } from '../types/data'
import type { EvidenceStatement, EvidenceTier, FuelOption, Layout, LayoutMark, MarkEvidence } from '../types/layout'

const PSI_PER_ATM = 14.696
const pct = (f: number) => `${(f * 100).toFixed(1).replace(/\.0$/, '')} %`
const psi = (v: number) => `${v.toFixed(1).replace(/\.0$/, '')} psi`
const num = (v: number) => v.toFixed(1).replace(/\.0$/, '')
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)

/** "Pressure tested: 14.7 psi." for one value, "Pressures tested: X to Y." for a range, plus the
 *  the option's note sentences when some of that pressure comes from NASA's reports or test matrix rather
 *  than the tables. */
function pressureTestedText(option: FuelOption) {
  const [lo, hi] = option.pressure_psi_range!
  const base = lo === hi ? `Pressure tested: ${psi(lo)}.` : `Pressures tested: ${psi(lo)} to ${psi(hi)}.`
  // Keep only the note's sentences about where pressure came from (reports, test matrix).
  const where = (option.note ?? '').split(/(?<=\.)\s+/).filter((x) => x.includes('not the tables')).join(' ')
  return where ? `${base} ${where}` : base
}

function airText(h: Habitat) {
  const [o0, o1] = h.o2_fraction
  const [p0, p1] = h.pressure_psi
  return `${o0 === o1 ? pct(o0) : `${pct(o0)} to ${pct(o1)}`} oxygen, ${p0 === p1 ? psi(p0) : `${psi(p0)} to ${psi(p1)}`}`
}

/** The fuels a user can pick for one kind of mark, most-tested first. */
export function fuelOptionsFor(data: AppData, fuelClass: FuelClass): FuelOption[] {
  return (data.fuels ?? []).filter((f) => f.fuel_class === fuelClass).sort((a, b) => b.test_count - a.test_count)
}

/** Which fuel types a mark of this kind may use: areas are solid, points are droplet or gas. */
export function kindAllows(kind: LayoutMark['kind'], fuelClass: FuelClass) {
  return kind === 'area' ? fuelClass === 'solid' : fuelClass !== 'solid'
}

export function tierOf(option: FuelOption | null, habitat: Habitat): EvidenceTier {
  if (!option) return 'not_in_tables'
  return (option.inside_by_habitat[habitat.id] ?? []).length > 0 ? 'tested_here' : 'tested_elsewhere'
}

/** The evidence card for one mark in one habitat. */
export function markEvidence(data: AppData, habitat: Habitat, mark: LayoutMark): MarkEvidence {
  const option = (data.fuels ?? []).find((f) => f.id === mark.fuel_option_id && f.fuel_class === mark.fuel_class) ?? null
  const tier = tierOf(option, habitat)
  const tested: EvidenceStatement[] = []
  const gap: EvidenceStatement[] = []
  const airflow: EvidenceStatement[] = []

  if (!option) {
    gap.push({
      kind: 'gap',
      text: "This material or fuel is not in NASA's PSI tables. Not in the tables does not mean never tested.",
      cites: [],
    })
    return { tier, option, tested, gap, airflow, endings: {}, inside_test_ids: [], nearest_test_id: null }
  }

  const inside = option.inside_by_habitat[habitat.id] ?? []
  const near = option.nearest_by_habitat[habitat.id] ?? null

  // ---- What NASA tested
  // BASS's nitrogen-diluted tests ran in glovebox air, not cabin air (flag o2_diluted_work_volume).
  const ids = new Set(option.test_ids)
  const diluted = data.tests.filter((t) => ids.has(t.id) && t.flags.includes('o2_diluted_work_volume')).length
  const range = option.o2_range ? (option.o2_range[0] === option.o2_range[1] ? pct(option.o2_range[0]) : `${pct(option.o2_range[0])} to ${pct(option.o2_range[1])}`) : ''
  const o2 = !option.o2_range
    ? 'with oxygen not recorded in the tables'
    : diluted
      ? `at ${range} oxygen (${diluted} of them in nitrogen-diluted glovebox air, the rest in cabin air)`
      : `at ${range} cabin oxygen`
  tested.push({
    kind: 'data',
    text: `${plural(option.test_count, `${option.name} test`)} (${list(option.acronyms)}) ${o2}.`,
    cites: option.investigations,
  })
  tested.push(
    option.pressure_psi_range
      ? { kind: 'data', text: pressureTestedText(option), cites: option.investigations }
      : { kind: 'gap', text: 'Pressure is not in these tables.', cites: option.investigations },
  )
  if (inside.length > 0)
    tested.push({
      kind: 'data',
      text: `${inside.length} of these tests ran in this place's air (${airText(habitat)}).`,
      cites: inside.slice(0, 3),
    })

  // ---- The gap
  if (tier === 'tested_elsewhere') {
    if (near && !near.oxygen_only) {
      const t = data.tests.find((x) => x.id === near.test_id)
      const parts = [near.o2_points > 0.05 ? `${num(near.o2_points)} points of oxygen` : null, near.psi_gap > 0.05 ? psi(near.psi_gap) : null].filter(Boolean)
      gap.push({
        kind: 'gap',
        text:
          `This air: ${airText(habitat)}. No ${option.name} test in the tables ran in it. ` +
          (t && t.o2_fraction !== null && t.pressure_atm !== null
            ? `The nearest ran at ${pct(t.o2_fraction)} oxygen and ${psi(t.pressure_atm * PSI_PER_ATM)}${parts.length ? `, ${parts.join(' and ')} away` : ''}.`
            : ''),
        cites: [near.test_id],
      })
    } else if (near && near.oxygen_only) {
      const t = data.tests.find((x) => x.id === near.test_id)
      gap.push({
        kind: 'gap',
        text:
          `This air: ${airText(habitat)}. ` +
          (t && t.o2_fraction !== null
            ? near.o2_points > 0.05
              ? `The highest-oxygen ${option.name} test ran at ${pct(t.o2_fraction)}, ${num(near.o2_points)} points short, and its table records no pressure.`
              : `A ${option.name} test ran at ${pct(t.o2_fraction)} oxygen, inside this range, but its table records no pressure, so it cannot be placed in this air.`
            : ''),
        cites: [near.test_id],
      })
    } else {
      gap.push({
        kind: 'gap',
        text: `This air: ${airText(habitat)}. The ${option.name} tests record neither oxygen nor pressure, so they cannot be compared with it.`,
        cites: option.investigations,
      })
    }
  }

  // ---- Airflow
  if (mark.airflow === 'vent') {
    airflow.push(
      option.airflow_range
        ? {
            kind: 'data',
            text: `${plural(option.airflow_test_count, `${option.name} test`)} record airflow: ${
              option.airflow_range[0] === option.airflow_range[1]
                ? `${num(option.airflow_range[0])} cm/s`
                : `${num(option.airflow_range[0])} to ${num(option.airflow_range[1])} cm/s`
            }.`,
            cites: option.investigations,
          }
        : { kind: 'gap', text: `No ${option.name} test records airflow, so a fire near a vent is not in the tables.`, cites: [] },
    )
  } else {
    airflow.push(
      option.still_air_test_count > 0
        ? { kind: 'data', text: `${plural(option.still_air_test_count, `${option.name} test`)} record still air (0 cm/s).`, cites: option.investigations }
        : option.airflow_test_count > 0
          ? {
              kind: 'gap',
              text: `No ${option.name} test in the tables records still air (0 cm/s): the ${plural(option.airflow_test_count, 'test')} that record airflow had ${num(option.airflow_range![0])} cm/s or more.`,
              cites: option.investigations,
            }
          : { kind: 'gap', text: `The ${option.name} tests do not record airflow.`, cites: [] },
    )
  }

  return { tier, option, tested, gap, airflow, endings: option.endings, inside_test_ids: inside, nearest_test_id: near?.test_id ?? null }
}

/** Counts for the summary line: "8 marks: 2 tested in this air, 6 tested only in other air". */
export function layoutSummary(data: AppData, habitat: Habitat, layout: Layout) {
  const counts: Record<EvidenceTier, number> = { tested_here: 0, tested_elsewhere: 0, not_in_tables: 0 }
  for (const m of layout.marks) counts[markEvidence(data, habitat, m).tier]++
  return { total: layout.marks.length, ...counts }
}

/** Checks a layout loaded from a file before it is used; returns a list of problems (empty = fine). */
export function layoutProblems(data: AppData, layout: Layout): string[] {
  const out: string[] = []
  if (layout.version !== 1) out.push(`unknown layout version ${String(layout.version)}`)
  if (!data.habitats.some((h) => h.id === layout.habitat_id)) out.push(`unknown place "${layout.habitat_id}"`)
  const ids = new Set<string>()
  for (const m of layout.marks ?? []) {
    if (ids.has(m.id)) out.push(`duplicate mark id ${m.id}`)
    ids.add(m.id)
    if (!kindAllows(m.kind, m.fuel_class)) out.push(`${m.id}: ${m.kind === 'area' ? 'an area' : 'a point'} cannot be ${m.fuel_class}`)
    if (m.fuel_option_id !== 'other' && !(data.fuels ?? []).some((f) => f.id === m.fuel_option_id && f.fuel_class === m.fuel_class))
      out.push(`${m.id}: unknown fuel "${m.fuel_option_id}"`)
    const { x, y, w = 0, h = 0 } = m.shape
    if (![x, y, w, h].every((v) => Number.isFinite(v) && v >= 0 && v <= 1) || x + w > 1 || y + h > 1)
      out.push(`${m.id}: position outside the plan`)
    if (m.kind === 'area' && !(w > 0 && h > 0)) out.push(`${m.id}: an area needs a width and a height`)
  }
  return out
}
