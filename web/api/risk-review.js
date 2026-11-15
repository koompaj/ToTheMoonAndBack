// OWNER: dashboard + AI workstream.
// POST /api/risk-review  { facts: [{id, text}] }  ->  { review, model, provider, generated_at }
// The AI risk review of a user upload. Key: API_FOR_RISK (Vercel environment variable).
import { checkFacts, modelList, riskReview } from './_lib/gemini.js'
import { guard, opts } from './_lib/guard.js'

export default async function handler(req, res) {
  if (!guard(req, res)) return
  const key = process.env.API_FOR_RISK
  if (!key) return res.status(500).json({ error: 'API_FOR_RISK is not set in this deployment' })
  const facts = req.body?.facts
  const bad = checkFacts(facts)
  if (bad) return res.status(400).json({ error: bad })
  try {
    res.status(200).json(await riskReview(facts, { ...opts(key), models: modelList(process.env.RISK_MODEL) }))
  } catch (e) {
    res.status(502).json({ error: String(e?.message || e) })
  }
}
