// OWNER: dashboard + AI workstream.
// Offline generator for the AI summaries the dashboard shows. Runs on a team laptop, never in the
// browser. It builds a "fact pack" per habitat and per investigation from the generated NASA data,
// using the same code the app uses (web/src/ai/evidence.ts), asks Claude to write short cited
// sentences from those facts only, and REJECTS any sentence whose numbers or citations are not in
// the fact pack. Output: web/public/ai/habitats.json and investigations.json, marked reviewed:false
// until a person has read every sentence against its sources.
//
//   npm run facts      write the fact packs to ai/out/ (no API call, no key needed)
//   npm run generate   call the API (needs ANTHROPIC_API_KEY in your shell or an `ant auth login`)
//
// Flags: --dry-run, --only habitats|investigations|fire
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { habitatEvidence, headline, investigationStats, fmtPct, fmtPsi, shortName } from '../web/src/ai/evidence.ts'
import { testsInHabitat } from '../web/src/data/load.ts'
import { defaultPoint, expectedBehaviour, nearestTests, taskAnswers } from '../web/src/ai/fireTasks.ts'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const DATA = path.join(root, 'web/public/data')
const OUT_PUBLIC = path.join(root, 'web/public/ai')
const OUT_LOCAL = path.join(here, 'out')
const MODEL = 'claude-opus-4-8'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null

const read = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'))
const data = {
  tests: read('tests.json'),
  investigations: read('investigations.json'),
  habitats: read('habitats.json'),
  otherTables: read('other_tables.json'),
  quality: read('data_quality.json'),
}

// ---------------------------------------------------------------------------------------------
// Fact packs. Every fact is one plain sentence with its citation ids. The model may only restate
// these facts; numbers it writes must appear in them.

function habitatFacts(h) {
  const ev = habitatEvidence(data, h, testsInHabitat)
  const facts = []
  const cites = new Set()
  const add = (text, ids = []) => {
    facts.push({ text, cites: ids })
    ids.forEach((i) => cites.add(i))
  }
  add(`Habitat: ${h.name}. Conditions used: oxygen ${fmtPct(h.o2_fraction[0], 0)} to ${fmtPct(h.o2_fraction[1], 0)}, pressure ${h.pressure_psi[0]} to ${h.pressure_psi[1]} psi. Source: ${h.source}. ${h.note}`)
  add(`${ev.inside.length} of ${ev.placedTotal} placeable NASA tests (cabin-air oxygen and pressure both recorded) fall inside these conditions.`,
    ev.byInvestigation.map((b) => b.accession))
  for (const c of ev.byClass) {
    if (c.inside.length > 0) {
      add(`${c.inside.length} of the tests inside are ${c.fuelClass} tests.`, c.inside.slice(0, 3).map((t) => t.id))
    } else if (c.nearest) {
      const t = c.nearest.test
      if (c.nearest.oxygenOnly)
        add(`No ${c.fuelClass} test is inside. The highest-oxygen ${c.fuelClass} test is ${t.acronym} at ${fmtPct(t.o2_fraction)} oxygen; its table has no pressure column.`, [t.id, t.investigation])
      else
        add(`No ${c.fuelClass} test is inside. The nearest is ${t.acronym} at ${fmtPct(t.o2_fraction)} oxygen and ${fmtPsi(t.pressure_atm)}.`, [t.id, t.investigation])
    } else {
      add(`No ${c.fuelClass} test records cabin-air oxygen.`)
    }
  }
  for (const o of ev.outcomes) add(`${o.count} of the tests inside ended as "${o.outcome}" according to NASA's table.`, [o.example.id])
  if (ev.noOutcome) add(`${ev.noOutcome} of the tests inside have no recorded ending.`)
  add('The challenge page states that PSI holds no partial-gravity combustion data yet.')
  return { id: h.id, facts, cites: [...cites] }
}

function investigationFacts(s) {
  const inv = s.inv
  const facts = []
  const add = (text) => facts.push({ text, cites: [inv.accession] })
  add(`${shortName(inv)} (${inv.accession}): ${inv.title}. ${inv.project_type ?? ''} ${inv.flight_platform ? `on ${inv.flight_platform}` : ''}.`)
  if (inv.objectives) add(`Objectives as written in PSI: ${inv.objectives.replace(/\s+/g, ' ').slice(0, 1200)}`)
  if (inv.approach) add(`Approach as written in PSI: ${inv.approach.replace(/\s+/g, ' ').slice(0, 900)}`)
  if (inv.hardware) add(`Hardware: ${inv.hardware}.`)
  add(`Its PSI tables hold ${s.tableRows} rows; ${s.tests.length} are individual tests in the dashboard. PSI lists ${s.pubs} papers for it.`)
  if (s.maxAmbientO2 !== null) add(`Highest cabin-air oxygen in its tests: ${fmtPct(s.maxAmbientO2)}.`)
  if (s.minPressureAtm !== null) add(`Lowest pressure in its tests: ${fmtPsi(s.minPressureAtm)}.`)
  if (s.airflowTests) add(`${s.airflowTests} of its tests record airflow.`)
  for (const p of s.parts) add(`Relevance rule met: ${p.reason} (+${p.points}).`)
  add(`Fire-safety relevance score: ${s.relevance} of 100.`)
  return { id: inv.accession, facts, cites: [inv.accession] }
}

function fireFacts(h, fuel) {
  const point = defaultPoint(h)
  const t = taskAnswers(data, h, fuel, point)
  const near = nearestTests(data, fuel, point, 5)
  const exp = expectedBehaviour(near)
  const facts = []
  const add = (text, cites) => facts.push({ text, cites })
  add(`Place: ${h.name}, oxygen ${fmtPct(point.o2Fraction)} at ${fmtPsi(point.pressureAtm)}. Fuel type: ${fuel}.`, [])
  for (const [task, list] of Object.entries(t)) for (const st of list) add(`[${task}${st.kind === 'gap' ? ', gap' : ''}] ${st.text}`, st.cites)
  add(`The ${near.length} nearest ${fuel} tests ended: ${Object.entries(exp.counts).map(([o, c]) => `${c} ${o}`).join(', ') || 'no ending recorded'}.`, near.map((n) => n.test.id))
  const cites = [...new Set(facts.flatMap((f) => f.cites))]
  return { id: `${h.id}:${fuel}`, facts, cites }
}

// ---------------------------------------------------------------------------------------------
// Validation: a sentence survives only if every number and citation in it is in its fact pack.

const NUM = /\d+(?:\.\d+)?/g
function allowedNumbers(pack) {
  const s = new Set()
  for (const f of pack.facts) for (const m of f.text.match(NUM) ?? []) s.add(String(Number(m)))
  return s
}
function checkSentence(sentence, pack, allowed, problems, citesOptional = false) {
  const bad = (sentence.text.match(NUM) ?? []).filter((m) => !allowed.has(String(Number(m))))
  const badCites = sentence.cites.filter((c) => !pack.cites.includes(c) && !pack.facts.some((f) => f.cites.includes(c)))
  if (bad.length) problems.push(`numbers not in the facts: ${bad.join(', ')} in "${sentence.text}"`)
  if (badCites.length) problems.push(`unknown citations: ${badCites.join(', ')}`)
  if (sentence.cites.length === 0 && !citesOptional) problems.push(`no citation on "${sentence.text}"`)
  return bad.length === 0 && badCites.length === 0 && (citesOptional || sentence.cites.length > 0)
}

const SENTENCE = {
  type: 'object',
  additionalProperties: false,
  required: ['text', 'cites'],
  properties: { text: { type: 'string' }, cites: { type: 'array', items: { type: 'string' } } },
}
const HABITAT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary'],
  properties: { summary: { type: 'array', items: SENTENCE } },
}
const INVESTIGATION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'research_question'],
  properties: { summary: { type: 'array', items: SENTENCE }, research_question: SENTENCE },
}

const FIRE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['detection', 'suppression', 'prevention'],
  properties: {
    detection: { type: 'array', items: SENTENCE },
    suppression: { type: 'array', items: SENTENCE },
    prevention: { type: 'array', items: SENTENCE },
  },
}

const SYSTEM = `You write short evidence summaries for a NASA fire-safety dashboard used by aerospace researchers.
Rules, all mandatory:
- Use ONLY the facts provided. Never add knowledge from memory, never estimate, never round differently.
- Every number you write must appear in the facts exactly as written there.
- Every sentence carries the citation ids of the facts it rests on, copied exactly.
- Say "not in the tables" rather than "never tested". If the facts do not cover something, say so.
- Plain English, no hype, no metaphors. 2 to 4 sentences for a summary, under 30 words each.
- A research question names the data to use (investigation and measurements from the facts) and one open gap.`

async function ask(client, pack, kind) {
  const schema = kind === 'habitat' ? HABITAT_SCHEMA : kind === 'fire' ? FIRE_SCHEMA : INVESTIGATION_SCHEMA
  const task =
    kind === 'habitat'
      ? 'Write a summary of what NASA tables show, and do not show, about fire in this habitat.'
      : kind === 'fire'
        ? 'For each task (detection, suppression, prevention), write 1 or 2 short practical suggestions for this fuel in this place that fill the gaps the facts mark. They are shown as AI suggestions next to the NASA data they cite. Do not repeat the facts; do not invent numbers; every suggestion must cite the ids of the facts it rests on. If no fact supports a suggestion, leave it out.'
        : 'Write a plain-language summary of this investigation for fire safety, and one research question its data could answer.'
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    system: SYSTEM,
    output_config: { format: { type: 'json_schema', schema } },
    messages: [{ role: 'user', content: `${task}\n\nFacts (JSON):\n${JSON.stringify(pack.facts, null, 1)}` }],
  })
  if (response.stop_reason === 'refusal') throw new Error('model declined the request')
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('')
  return JSON.parse(text)
}

async function main() {
  const habitatPacks = data.habitats.map(habitatFacts)
  const invPacks = investigationStats(data).filter((s) => s.tableRows > 0 || s.inv.objectives).map(investigationFacts)
  const firePacks = data.habitats.flatMap((h) => ['gas', 'droplet', 'solid'].map((f) => fireFacts(h, f)))
  fs.mkdirSync(OUT_LOCAL, { recursive: true })
  fs.writeFileSync(path.join(OUT_LOCAL, 'factpacks.json'), JSON.stringify({ headline: headline(data).env.length, habitats: habitatPacks, investigations: invPacks, fire: firePacks }, null, 1))
  console.log(`fact packs: ${habitatPacks.length} habitats, ${invPacks.length} investigations, ${firePacks.length} place-fuel pairs -> ai/out/factpacks.json`)
  if (dryRun) return

  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic()
  const stamp = { generated_at: new Date().toISOString(), model: MODEL, reviewed: false, reviewed_by: null }
  const rejected = []
  fs.mkdirSync(OUT_PUBLIC, { recursive: true })

  if (!only || only === 'habitats') {
    const items = {}
    for (const pack of habitatPacks) {
      const out = await ask(client, pack, 'habitat')
      const allowed = allowedNumbers(pack)
      const problems = []
      items[pack.id] = { summary: out.summary.filter((s) => checkSentence(s, pack, allowed, problems)) }
      problems.forEach((p) => rejected.push(`${pack.id}: ${p}`))
      console.log(`habitat ${pack.id}: kept ${items[pack.id].summary.length} of ${out.summary.length} sentences`)
    }
    fs.writeFileSync(path.join(OUT_PUBLIC, 'habitats.json'), JSON.stringify({ ...stamp, items }, null, 1))
  }

  if (!only || only === 'investigations') {
    const items = {}
    for (const pack of invPacks) {
      const out = await ask(client, pack, 'investigation')
      const allowed = allowedNumbers(pack)
      const problems = []
      const summary = out.summary.filter((s) => checkSentence(s, pack, allowed, problems))
      const rq = checkSentence(out.research_question, pack, allowed, problems) ? out.research_question : null
      items[pack.id] = { summary, research_question: rq }
      problems.forEach((p) => rejected.push(`${pack.id}: ${p}`))
      console.log(`investigation ${pack.id}: kept ${summary.length} of ${out.summary.length} sentences${rq ? ' + question' : ''}`)
    }
    fs.writeFileSync(path.join(OUT_PUBLIC, 'investigations.json'), JSON.stringify({ ...stamp, items }, null, 1))
  }

  if (!only || only === 'fire') {
    const items = {}
    for (const pack of firePacks) {
      const out = await ask(client, pack, 'fire')
      const allowed = allowedNumbers(pack)
      const problems = []
      const keep = (list) => list.filter((s) => checkSentence(s, pack, allowed, problems))
      items[pack.id] = { detection: keep(out.detection), suppression: keep(out.suppression), prevention: keep(out.prevention) }
      problems.forEach((p) => rejected.push(`${pack.id}: ${p}`))
      console.log(`fire ${pack.id}: kept ${items[pack.id].detection.length + items[pack.id].suppression.length + items[pack.id].prevention.length} suggestions`)
    }
    fs.writeFileSync(path.join(OUT_PUBLIC, 'fire.json'), JSON.stringify({ ...stamp, items }, null, 1))
  }

  fs.writeFileSync(path.join(OUT_LOCAL, 'rejected.txt'), rejected.join('\n') + '\n')
  console.log(`rejected sentences: ${rejected.length} (ai/out/rejected.txt). Review web/public/ai/*.json, then set "reviewed": true and "reviewed_by".`)
}

main().catch((e) => {
  console.error(e?.status ? `API error ${e.status}: ${e.message}` : e)
  process.exit(1)
})
