// OWNER: dashboard + AI workstream.
// Small local helper that writes the AI risk review for a user-uploaded experiment.
//
//   node ai/risk-server.mjs          (listens on http://127.0.0.1:8787)
//
// Why a server: the API key must never reach the browser. The key is read from a .env file
// (API_FOR_RISK=...) in this repo's folder or the folder above it, never from the repo itself
// (.env is git-ignored). The page sends only the upload's own values and facts the app already
// worked out from NASA's tables; the model may only restate those facts, and every line it returns
// must cite one of the ids it was given. Lines with no valid citation are dropped here.
//
// It also turns a picture of a floor plan into a 3D layout for the Simulation page
// (POST /api/plan-to-layout, added by the 3D workstream). That uses its own key,
// API_FOR_SIMULATION=... in the same .env. The picture is sent to Google only when the user
// presses the button for it. The model is told to describe rooms, doors and objects and NOT what
// anything is made of; the page checks the answer and the user chooses each object's fuel.
//
// Provider: Google Gemini (the team's key), Gemini API. Models are tried in order until one answers
// (Google's busy models time out or answer 503): RISK_MODEL in .env first if set, then
// gemini-3.5-flash, then gemini-3.1-flash-lite. Each try has a time limit.
import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.RISK_PORT || 8787)

function readEnv() {
  const candidates = [process.env.RISK_ENV_FILE, join(HERE, '..', '.env'), join(HERE, '..', '..', '.env'), join(HERE, '.env')].filter(Boolean)
  for (const p of candidates) {
    if (!existsSync(p)) continue
    const out = {}
    for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line)
      if (m) out[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
    }
    return { file: resolve(p), env: out }
  }
  return { file: null, env: {} }
}

const { file: ENV_FILE, env } = readEnv()
const KEY = process.env.API_FOR_RISK || env.API_FOR_RISK
const SIM_KEY = process.env.API_FOR_SIMULATION || env.API_FOR_SIMULATION
const CHOSEN = process.env.RISK_MODEL || env.RISK_MODEL
const MODELS = [...new Set([CHOSEN, 'gemini-3.5-flash', 'gemini-3.1-flash-lite'].filter(Boolean))]
const MODEL = MODELS[0]
const TRY_MS = 45_000

const SYSTEM = `You review a fire-safety experiment that a user uploaded to a NASA microgravity-combustion dashboard.
Readers are students, researchers and engineers. Write short, plain sentences (no jargon where a plain word works).

Rules you must follow:
- Use ONLY the facts you are given. Never add a number, name, unit or claim that is not in the facts.
- Every item must cite at least one id from the facts (the "cites" array). Use ids exactly as written.
- The upload is the user's own data, not NASA data. Never call it NASA's.
- Say "not in NASA's tables", never "never tested" (NASA's reports may hold more than its tables).
- Inverse-flame tests are not cabin air; never treat them as such.
- Do not predict how a real fire would behave, give a safety rating, or say something is "safe".
  Describe what the evidence does and does not show, and what that could mean for crew safety.
- If the facts do not support a section, return an empty list for it.`

const LIST = { type: 'ARRAY', items: { type: 'OBJECT', properties: { text: { type: 'STRING' }, cites: { type: 'ARRAY', items: { type: 'STRING' } } }, required: ['text', 'cites'] } }
const SCHEMA = {
  type: 'OBJECT',
  properties: {
    summary: { type: 'OBJECT', properties: { text: { type: 'STRING' }, cites: { type: 'ARRAY', items: { type: 'STRING' } } }, required: ['text', 'cites'] },
    risks: LIST,
    missing: LIST,
    problems: LIST,
    compare: LIST,
    next: LIST,
  },
  required: ['summary', 'risks', 'missing', 'problems', 'compare', 'next'],
}

function prompt(facts) {
  return `Write the risk review as JSON with these parts:
- summary: 2 or 3 sentences: what was uploaded, the main fire-safety concern, and the biggest gap.
- risks: up to 4 fire-safety risks this evidence points to for crews living in the chosen place.
- missing: up to 4 things NASA's tables lack near these conditions (and what the upload adds or does not add).
- problems: up to 5 problems with the uploaded data itself (explain the automatic checks in plain words).
- compare: up to 3 points on how the upload sits next to NASA's nearest tests.
- next: up to 3 tests or checks that would close the biggest gaps.

Facts (each line is "id: fact"):
${facts.map((f) => `${f.id}: ${f.text}`).join('\n')}`
}

async function callGemini(facts) {
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: [{ role: 'user', parts: [{ text: prompt(facts) }] }],
    generationConfig: { temperature: 0.2, responseMimeType: 'application/json', responseSchema: SCHEMA },
  })
  const errors = []
  for (const model of MODELS) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY },
        body,
        signal: AbortSignal.timeout(TRY_MS),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok) {
        const text = (json.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('')
        if (!text) throw new Error(`empty answer (finish reason ${json.candidates?.[0]?.finishReason ?? 'unknown'})`)
        return { review: JSON.parse(text), model }
      }
      errors.push(`${model} ${res.status}: ${json.error?.message ?? res.statusText}`)
      if (res.status === 400 || res.status === 401 || res.status === 403) break // the key or request is wrong: another model won't help
    } catch (e) {
      errors.push(`${model}: ${e.name === 'TimeoutError' ? 'no answer in time' : e.message}`)
    }
  }
  throw new Error(errors.join(' | '))
}

/** Keep only items whose citations all exist (and that cite something). */
function clean(review, ids) {
  const ok = (it) => it && typeof it.text === 'string' && it.text.trim() && Array.isArray(it.cites) && it.cites.length > 0 && it.cites.every((c) => ids.has(c))
  const out = { summary: ok(review.summary) ? review.summary : null, dropped: 0 }
  for (const k of ['risks', 'missing', 'problems', 'compare', 'next']) {
    const list = Array.isArray(review[k]) ? review[k] : []
    out[k] = list.filter(ok)
    out.dropped += list.length - out[k].length
  }
  return out
}

// ---------- a picture of a floor plan -> a 3D layout (Simulation page, 3D workstream) ----------
// The answer is the MODEL'S READING OF THE USER'S PICTURE. It is not NASA data and holds none.
// The page checks it with the same code that checks a layout file (web/src/scene/cabin/layoutFile.ts)
// and refuses it whole if anything is wrong. Fuels are never taken from the model.

const PLAN_SYSTEM = `You read a picture of a floor plan and describe it as a simple 3D layout, as JSON.

Rules you must follow:
- Describe only what the picture shows. Do not add rooms, doors or objects that are not drawn.
- NEVER say what anything is made of. No materials, no fuels.
- Lengths are in metres. x runs left to right across the picture; z runs from the top of the picture to the bottom. The top-left corner of the plan is x = 0, z = 0. Round every number to 0.1.
- Scale: if the picture gives dimensions or a scale bar, use them. If it gives none, make the longer side of the whole plan 12 m. Say which you did in "scale_note", in one short sentence.
- rooms: each room is ONE rectangle with x0 < x1 and z0 < z1, at least 1 m each way. If a room is not a rectangle, use the rectangle that covers most of it. Rooms must not overlap. Two rooms with a wall between them must share that wall exactly: use the same number for the shared edge. At most 12 rooms. "id" is short (letters, digits, hyphens). "name" is the name written on the plan, or "Room 1", "Room 2" and so on if none is written; do not guess what a room is used for.
- doors: one entry for each doorway between two rooms that share a wall; leave out doors to the outside. "between" is the two room ids. "at" is the middle of the doorway along the shared wall: an x value if one room is above the other in the picture, a z value if they are side by side. "width" is 0.4 or more, and the whole doorway must lie within the part of the wall that both rooms share. "open" is true unless the picture clearly shows the door shut or locked. Every room must be joined to the others through doors.
- items: furniture and equipment the picture clearly shows, at most 30. "id" is short and unique. "label" is what the picture shows, such as "Bed" or "Desk". "x" and "z" are its centre, "w" its size along x, "d" its size along z, "h" a sensible height in metres below 2.2. Every item must lie wholly inside one room, at least 0.1 m from its walls.
- "ceiling" is 2.4 unless the picture says otherwise.
- If the picture is not a floor plan, return empty lists and say so in "scale_note".`

const PLAN_SCHEMA = {
  type: 'OBJECT',
  properties: {
    name: { type: 'STRING' },
    scale_note: { type: 'STRING' },
    ceiling: { type: 'NUMBER' },
    rooms: {
      type: 'ARRAY',
      items: { type: 'OBJECT', properties: { id: { type: 'STRING' }, name: { type: 'STRING' }, x0: { type: 'NUMBER' }, x1: { type: 'NUMBER' }, z0: { type: 'NUMBER' }, z1: { type: 'NUMBER' } }, required: ['id', 'name', 'x0', 'x1', 'z0', 'z1'] },
    },
    doors: {
      type: 'ARRAY',
      items: { type: 'OBJECT', properties: { between: { type: 'ARRAY', items: { type: 'STRING' } }, at: { type: 'NUMBER' }, width: { type: 'NUMBER' }, open: { type: 'BOOLEAN' } }, required: ['between', 'at', 'width', 'open'] },
    },
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { id: { type: 'STRING' }, label: { type: 'STRING' }, x: { type: 'NUMBER' }, z: { type: 'NUMBER' }, w: { type: 'NUMBER' }, d: { type: 'NUMBER' }, h: { type: 'NUMBER' } },
        required: ['id', 'label', 'x', 'z', 'w', 'd', 'h'],
      },
    },
  },
  required: ['name', 'scale_note', 'rooms', 'doors', 'items'],
}

const PLAN_MIMES = new Set(['image/png', 'image/jpeg'])

async function planToLayout(image, mime) {
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: PLAN_SYSTEM }] },
    contents: [{ role: 'user', parts: [{ inlineData: { mimeType: mime, data: image } }, { text: 'Describe this floor plan as a layout.' }] }],
    generationConfig: { temperature: 0.1, responseMimeType: 'application/json', responseSchema: PLAN_SCHEMA },
  })
  const errors = []
  for (const model of MODELS) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': SIM_KEY },
        body,
        signal: AbortSignal.timeout(TRY_MS),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok) {
        const text = (json.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('')
        if (!text) throw new Error(`empty answer (finish reason ${json.candidates?.[0]?.finishReason ?? 'unknown'})`)
        return { layout: JSON.parse(text), model }
      }
      errors.push(`${model} ${res.status}: ${json.error?.message ?? res.statusText}`)
      if (res.status === 400 || res.status === 401 || res.status === 403) break // the key or request is wrong: another model won't help
    } catch (e) {
      errors.push(`${model}: ${e.name === 'TimeoutError' ? 'no answer in time' : e.message}`)
    }
  }
  throw new Error(errors.join(' | '))
}

async function handlePlan(req, res, origin) {
  if (!SIM_KEY) return send(res, 500, { error: 'No API_FOR_SIMULATION found in .env' }, origin)
  let raw = ''
  for await (const chunk of req) {
    raw += chunk
    if (raw.length > 6_000_000) return send(res, 413, { error: 'the picture is too large' }, origin)
  }
  try {
    const { image, mime } = JSON.parse(raw)
    if (typeof image !== 'string' || !image || !PLAN_MIMES.has(mime)) return send(res, 400, { error: 'send a PNG or JPG picture' }, origin)
    const { layout, model } = await planToLayout(image, mime)
    send(res, 200, { layout, model, provider: 'Google Gemini', generated_at: new Date().toISOString() }, origin)
  } catch (e) {
    send(res, 502, { error: String(e.message || e) }, origin)
  }
}

function send(res, status, obj, origin) {
  res.writeHead(status, {
    'content-type': 'application/json',
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
  })
  res.end(JSON.stringify(obj))
}

createServer(async (req, res) => {
  // Only pages served from this computer may call the helper.
  const o = req.headers.origin || ''
  const origin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o) ? o : 'http://localhost:5173'
  if (req.method === 'OPTIONS') return send(res, 204, {}, origin)
  if (req.method === 'GET' && req.url === '/api/health') return send(res, 200, { ok: Boolean(KEY), provider: 'Google Gemini', model: MODEL, models: MODELS, keyFound: Boolean(KEY), simulation: Boolean(SIM_KEY) }, origin)
  if (req.method === 'POST' && req.url === '/api/plan-to-layout') return handlePlan(req, res, origin)
  if (req.method !== 'POST' || req.url !== '/api/risk-review') return send(res, 404, { error: 'not found' }, origin)
  if (!KEY) return send(res, 500, { error: 'No API_FOR_RISK found in .env' }, origin)
  let raw = ''
  for await (const chunk of req) {
    raw += chunk
    if (raw.length > 400_000) return send(res, 413, { error: 'too much data' }, origin)
  }
  try {
    const { facts } = JSON.parse(raw)
    if (!Array.isArray(facts) || !facts.length) return send(res, 400, { error: 'no facts' }, origin)
    const ids = new Set(facts.map((f) => f.id))
    const { review: raw2, model } = await callGemini(facts.slice(0, 400))
    send(res, 200, { review: clean(raw2, ids), model, provider: 'Google Gemini', generated_at: new Date().toISOString() }, origin)
  } catch (e) {
    send(res, 502, { error: String(e.message || e) }, origin)
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log(`AI risk helper on http://127.0.0.1:${PORT}  (models ${MODELS.join(', ')}; key ${KEY ? `found in ${ENV_FILE ?? 'environment'}` : 'NOT found: add API_FOR_RISK to .env'})`)
  console.log(`Floor plan to 3D layout: key ${SIM_KEY ? 'found' : 'NOT found: add API_FOR_SIMULATION to .env'}`)
})
