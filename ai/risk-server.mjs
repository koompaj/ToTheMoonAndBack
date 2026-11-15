// OWNER: dashboard + AI workstream.
// Local helper for the two AI features when the app runs on a laptop (npm run dev):
//
//   node ai/risk-server.mjs          (listens on http://127.0.0.1:8787)
//
//   POST /api/risk-review     AI risk review of a user upload (key API_FOR_RISK)
//   POST /api/plan-to-layout  floor-plan picture -> 3D layout, by the 3D workstream (key API_FOR_SIMULATION)
//   GET  /api/health          which of the two this helper can run
//
// On Vercel the same work is done by web/api/*.js; both use web/api/_lib/gemini.js, so prompts,
// models and checks are identical. Keys are read from a git-ignored .env in this repo's folder or
// the folder above it, never from the repo, and never reach the browser.
// Models: RISK_MODEL in .env first if set, then gemini-3.5-flash, then gemini-3.1-flash-lite.
import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkFacts, checkPlan, modelList, PROVIDER, planToLayout, riskReview } from '../web/api/_lib/gemini.js'

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
const MODELS = modelList(process.env.RISK_MODEL || env.RISK_MODEL)
const TRY_MS = 45_000 // no function time limit locally

function send(res, status, obj, origin) {
  res.writeHead(status, {
    'content-type': 'application/json',
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
  })
  res.end(JSON.stringify(obj))
}

async function readJson(req, max) {
  let raw = ''
  for await (const chunk of req) {
    raw += chunk
    if (raw.length > max) throw Object.assign(new Error('too much data'), { status: 413 })
  }
  return JSON.parse(raw)
}

createServer(async (req, res) => {
  // Only pages served from this computer may call the helper.
  const o = req.headers.origin || ''
  const origin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o) ? o : 'http://localhost:5173'
  if (req.method === 'OPTIONS') return send(res, 204, {}, origin)
  if (req.method === 'GET' && req.url === '/api/health')
    return send(res, 200, { ok: Boolean(KEY), provider: PROVIDER, model: MODELS[0], models: MODELS, keyFound: Boolean(KEY), simulation: Boolean(SIM_KEY) }, origin)
  try {
    if (req.method === 'POST' && req.url === '/api/risk-review') {
      if (!KEY) return send(res, 500, { error: 'No API_FOR_RISK found in .env' }, origin)
      const { facts } = await readJson(req, 400_000)
      const bad = checkFacts(facts)
      if (bad) return send(res, 400, { error: bad }, origin)
      return send(res, 200, await riskReview(facts, { key: KEY, models: MODELS, tryMs: TRY_MS }), origin)
    }
    if (req.method === 'POST' && req.url === '/api/plan-to-layout') {
      if (!SIM_KEY) return send(res, 500, { error: 'No API_FOR_SIMULATION found in .env' }, origin)
      const { image, mime } = await readJson(req, 6_000_000)
      const bad = checkPlan(image, mime)
      if (bad) return send(res, 400, { error: bad }, origin)
      return send(res, 200, await planToLayout(image, mime, { key: SIM_KEY, models: MODELS, tryMs: TRY_MS }), origin)
    }
    return send(res, 404, { error: 'not found' }, origin)
  } catch (e) {
    send(res, e.status || 502, { error: String(e.message || e) }, origin)
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log(`AI helper on http://127.0.0.1:${PORT}  (models ${MODELS.join(', ')})`)
  console.log(`  risk review:     key ${KEY ? `found in ${ENV_FILE ?? 'environment'}` : 'NOT found: add API_FOR_RISK to .env'}`)
  console.log(`  floor plan to 3D: key ${SIM_KEY ? 'found' : 'NOT found: add API_FOR_SIMULATION to .env'}`)
})
