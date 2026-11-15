// OWNER: dashboard + AI workstream.
// Protection for the Vercel functions, so strangers cannot spend the team's Gemini quota:
//   - only POST (or GET for health), only from a page on this same site (Origin must match Host);
//   - a per-visitor cap: N requests per window, per IP, per function instance (best effort; Vercel
//     may run several instances, so this slows abuse rather than stopping it outright);
//   - the caller checks body size and shape.
// Keys come from Vercel's environment variables (Project Settings -> Environment Variables) and are
// only ever read here on the server. Never name them VITE_*: that would copy them into the browser.

const hits = new Map() // ip -> [timestamps]

function clientIp(req) {
  const fwd = String(req.headers['x-forwarded-for'] || '')
  return fwd.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown'
}

function sameSite(req) {
  const origin = req.headers.origin
  if (!origin) return false
  try {
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || '')
    return new URL(origin).host === host
  } catch {
    return false
  }
}

/** Returns true when the request may go on; otherwise it has already answered. */
export function guard(req, res, { method = 'POST', limit = 8, windowMs = 10 * 60_000 } = {}) {
  res.setHeader('cache-control', 'no-store')
  if (req.method !== method) {
    res.status(405).json({ error: `use ${method}` })
    return false
  }
  if (method === 'POST' && !sameSite(req)) {
    res.status(403).json({ error: 'only this site may call this' })
    return false
  }
  if (method === 'POST') {
    const ip = clientIp(req)
    const now = Date.now()
    const recent = (hits.get(ip) || []).filter((t) => now - t < windowMs)
    if (recent.length >= limit) {
      res.status(429).json({ error: `too many AI requests from this visitor; try again in a few minutes (limit ${limit} per ${Math.round(windowMs / 60_000)} min)` })
      return false
    }
    recent.push(now)
    hits.set(ip, recent)
  }
  return true
}

/** Model settings on Vercel: two tries of at most 25 s each fit inside the 60 s function limit. */
export function opts(key) {
  return { key, tryMs: 25_000 }
}
