// OWNER: dashboard + AI workstream (plan-to-layout prompt by the 3D workstream).
// The Gemini calls behind the two AI features, shared by:
//   - the Vercel functions next to this folder (web/api/*.js), which read the keys from Vercel's
//     encrypted environment variables, and
//   - the local helper ai/risk-server.mjs, which reads them from a git-ignored .env.
// The key is passed in by the caller and never leaves the server. Files in "_lib" are not routes.
//
// 1. Risk review of a user upload: the page sends facts (the upload's own values and facts worked out
//    from NASA's tables), each with an id. The model may only restate them and must cite ids; any line
//    that cites nothing real is dropped by cleanReview().
// 2. Floor-plan picture -> 3D layout: the model's reading of the user's picture. It is told never to say
//    what anything is made of; the page drops any material and checks the layout before drawing it.

export const PROVIDER = 'Google Gemini'

/** Models tried in order until one answers (Google's busy models time out or answer 503). */
export function modelList(chosen) {
  return [...new Set([chosen, 'gemini-3.5-flash', 'gemini-3.1-flash-lite'].filter(Boolean))]
}

/** One generateContent request, trying each model in turn within its own time limit. */
async function callGemini(body, { key, models, tryMs }) {
  const errors = []
  for (const model of models) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body,
        signal: AbortSignal.timeout(tryMs),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok) {
        const text = (json.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('')
        if (!text) throw new Error(`empty answer (finish reason ${json.candidates?.[0]?.finishReason ?? 'unknown'})`)
        return { json: JSON.parse(text), model }
      }
      errors.push(`${model} ${res.status}: ${json.error?.message ?? res.statusText}`)
      if (res.status === 400 || res.status === 401 || res.status === 403) break // the key or request is wrong: another model won't help
    } catch (e) {
      errors.push(`${model}: ${e.name === 'TimeoutError' ? 'no answer in time' : e.message}`)
    }
  }
  throw new Error(errors.join(' | '))
}

// ---------- 1. risk review ----------

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

const LINE = { type: 'OBJECT', properties: { text: { type: 'STRING' }, cites: { type: 'ARRAY', items: { type: 'STRING' } } }, required: ['text', 'cites'] }
const LIST = { type: 'ARRAY', items: LINE }
const SCHEMA = {
  type: 'OBJECT',
  properties: { summary: LINE, risks: LIST, missing: LIST, problems: LIST, compare: LIST, next: LIST },
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

/** Keep only items whose citations all exist (and that cite something). */
export function cleanReview(review, ids) {
  const ok = (it) => it && typeof it.text === 'string' && it.text.trim() && Array.isArray(it.cites) && it.cites.length > 0 && it.cites.every((c) => ids.has(c))
  const out = { summary: ok(review?.summary) ? review.summary : null, dropped: 0 }
  for (const k of ['risks', 'missing', 'problems', 'compare', 'next']) {
    const list = Array.isArray(review?.[k]) ? review[k] : []
    out[k] = list.filter(ok)
    out.dropped += list.length - out[k].length
  }
  return out
}

/** Validates the request body; returns an error message or null. */
export function checkFacts(facts) {
  if (!Array.isArray(facts) || !facts.length) return 'no facts'
  if (facts.length > 400) return 'too many facts'
  if (!facts.every((f) => f && typeof f.id === 'string' && typeof f.text === 'string' && f.id.length <= 120 && f.text.length <= 2000)) return 'facts must be {id, text}'
  return null
}

export async function riskReview(facts, opts) {
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: [{ role: 'user', parts: [{ text: prompt(facts) }] }],
    generationConfig: { temperature: 0.2, responseMimeType: 'application/json', responseSchema: SCHEMA },
  })
  const { json, model } = await callGemini(body, opts)
  return { review: cleanReview(json, new Set(facts.map((f) => f.id))), model, provider: PROVIDER, generated_at: new Date().toISOString() }
}

// ---------- 2. floor-plan picture -> 3D layout (3D workstream's prompt) ----------
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

export const PLAN_MIMES = new Set(['image/png', 'image/jpeg'])
/** Largest picture accepted, as base64 text (the page sends a JPEG of at most 1600 px). */
export const PLAN_MAX_CHARS = 3_500_000

export function checkPlan(image, mime) {
  if (typeof image !== 'string' || !image || !PLAN_MIMES.has(mime)) return 'send a PNG or JPG picture'
  if (image.length > PLAN_MAX_CHARS) return 'the picture is too large'
  return null
}

export async function planToLayout(image, mime, opts) {
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: PLAN_SYSTEM }] },
    contents: [{ role: 'user', parts: [{ inlineData: { mimeType: mime, data: image } }, { text: 'Describe this floor plan as a layout.' }] }],
    generationConfig: { temperature: 0.1, responseMimeType: 'application/json', responseSchema: PLAN_SCHEMA },
  })
  const { json, model } = await callGemini(body, opts)
  return { layout: json, model, provider: PROVIDER, generated_at: new Date().toISOString() }
}
