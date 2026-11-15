# Deploying on Vercel

The site is a static Vite build plus two small Vercel Functions for the AI features. The functions
keep the API keys on Vercel's servers; the browser never sees them.

| Feature | Function | Key (Vercel environment variable) |
|---|---|---|
| AI risk review of a user upload (after Submit, and on the Risk page) | `web/api/risk-review.js` | `API_FOR_RISK` |
| "Draw this plan in 3D with AI" (Simulation page) | `web/api/plan-to-layout.js` | `API_FOR_SIMULATION` |
| Which of the two this deployment can run | `web/api/health.js` | (none) |

The AI summaries (`web/public/ai/*.json`, made once by `ai/generate.mjs` with Claude) are plain files
and need no function or key on Vercel.

## Steps

1. Vercel -> **Add New Project** -> import `koompaj/ToTheMoonAndBack` (a private repo is fine).
2. **Root Directory: `web`**. The rest comes from `web/vercel.json` (framework Vite, build
   `npm run build`, output `dist`, functions may run up to 60 s).
3. **Settings -> Environment Variables** (Production and Preview):
   - `API_FOR_RISK` = the Gemini key for the risk review
   - `API_FOR_SIMULATION` = the Gemini key for the floor-plan drawing
   - optional `RISK_MODEL` = a Gemini model to try first (default `gemini-3.5-flash`, then `gemini-3.1-flash-lite`)

   **Never name a key `VITE_...`**: Vite copies those into the JavaScript every visitor downloads.
4. **Deploy**. Open the site and check `https://<your-site>/api/health`: it should say
   `"ok": true, "simulation": true, "deployed": true` (it never shows the keys).
5. Try it: Home -> Upload New Experiment -> submit a small CSV; the AI Risk Summary appears in about
   20 seconds. On Simulation, upload a floor-plan PNG/JPG and press "Draw this plan in 3D with AI".

After changing an environment variable, redeploy (Deployments -> ... -> Redeploy) so the functions see it.

## How the page finds the AI

The page asks this site's own `/api/health` first (Vercel). If that is not there (for example
`npm run dev` on a laptop), it falls back to the local helper `node ai/risk-server.mjs` on
`http://127.0.0.1:8787`, which reads the same keys from a git-ignored `.env`. Both use the same code,
`web/api/_lib/gemini.js`, so prompts, models and checks are identical.

## Protection against misuse

- Functions accept calls only from a page on the same site (the browser's Origin must match).
- Each visitor may make 8 review and 5 floor-plan requests per 10 minutes, per function instance
  (best effort: Vercel can run several instances).
- Request size and shape are checked before anything is sent to Google.
- Set a spending or quota limit on the Google key as well (Google AI Studio / Cloud console).

## What a visitor's data does

An uploaded experiment stays in that visitor's browser. Only when a review is written are its values
(plus facts from NASA's tables) sent to the function and on to Google Gemini. A floor-plan picture is
sent only when the visitor presses the button that says so.
