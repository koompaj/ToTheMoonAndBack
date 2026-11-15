// OWNER: dashboard + AI workstream.
// GET /api/health: tells the page which AI features this deployment can run (never the keys).
import { modelList, PROVIDER } from './_lib/gemini.js'
import { guard } from './_lib/guard.js'

export default function handler(req, res) {
  if (!guard(req, res, { method: 'GET' })) return
  const models = modelList(process.env.RISK_MODEL)
  res.status(200).json({
    ok: Boolean(process.env.API_FOR_RISK),
    simulation: Boolean(process.env.API_FOR_SIMULATION),
    provider: PROVIDER,
    model: models[0],
    models,
    deployed: true,
  })
}
