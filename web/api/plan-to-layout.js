// OWNER: dashboard + AI workstream (endpoint designed by the 3D workstream).
// POST /api/plan-to-layout  { image: base64, mime: 'image/jpeg' | 'image/png' }  ->  { layout, model, ... }
// Turns a picture of a floor plan into a 3D layout for the Simulation page. Key: API_FOR_SIMULATION.
import { checkPlan, modelList, planToLayout } from './_lib/gemini.js'
import { guard, opts } from './_lib/guard.js'

export default async function handler(req, res) {
  if (!guard(req, res, { limit: 5 })) return
  const key = process.env.API_FOR_SIMULATION
  if (!key) return res.status(500).json({ error: 'API_FOR_SIMULATION is not set in this deployment' })
  const { image, mime } = req.body || {}
  const bad = checkPlan(image, mime)
  if (bad) return res.status(400).json({ error: bad })
  try {
    res.status(200).json(await planToLayout(image, mime, { ...opts(key), models: modelList(process.env.RISK_MODEL) }))
  } catch (e) {
    res.status(502).json({ error: String(e?.message || e) })
  }
}
