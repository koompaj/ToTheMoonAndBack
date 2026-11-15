# ai/ - offline AI summaries (workstream C)

The dashboard never calls a model and never holds an API key. This folder writes the AI text ahead of
time, and the app only reads the result from `web/public/ai/`.

## How it stays honest

1. `generate.mjs` builds a **fact pack** per habitat and per investigation from `web/public/data/`,
   using `web/src/ai/evidence.ts`, the same code that computes the numbers on screen.
2. Claude (`claude-opus-4-8`, structured JSON output) writes 2 to 4 short sentences per item from
   those facts only, each sentence carrying citation ids (test ids or PSI accessions).
3. The script **rejects** any sentence with a number that is not in its fact pack, a citation that is
   not in it, or no citation at all. Rejections are listed in `ai/out/rejected.txt`.
4. Output is written with `"reviewed": false`. The app labels it "draft, not reviewed" until a person
   has read every sentence against its sources and set `"reviewed": true` and `"reviewed_by"`.

If `web/public/ai/` is empty, the app shows no AI text; everything else still works.

## Run it

```bash
cd ai && npm install
```

Fact packs only, no API call and no key (writes `ai/out/factpacks.json`):

```bash
cd ai && npm run facts
```

Generate (needs `ANTHROPIC_API_KEY` exported in your shell, or an `ant auth login` profile; never put
a key in the repo):

```bash
cd ai && npm run generate
```

Re-run after workstream A changes the data, then review and commit `web/public/ai/*.json`.
Needs Node 22.6 or newer (it imports the TypeScript evidence module with `--experimental-strip-types`).


## AI risk review of uploads (`risk-server.mjs`)

When a user uploads an experiment, the app asks a small local helper to write a risk review
(summary, safety risks, data NASA is missing, problems in the upload, comparison with NASA's
tests, suggested next tests). It shows right after submitting and on the Risk page.

```bash
node ai/risk-server.mjs
```

- Runs on `http://127.0.0.1:8787`, next to `npm run dev`. Without it, the app says the helper isn't running.
- Key: `API_FOR_RISK=...` in a `.env` file in the repo folder or the folder above it (never committed;
  `.env` is git-ignored). Provider: Google Gemini. Models tried in order: `RISK_MODEL` if set, then
  `gemini-3.5-flash`, then `gemini-3.1-flash-lite` (busy models time out or answer 503).
- The page sends only the upload's own values plus facts worked out from NASA's tables, each with an id.
  The model must cite ids; the helper drops any line whose citations are missing or made up.
- Data problems (missing values, outside the place's air, wrong gravity, repeats, link instead of DOI) are
  found by code in `web/src/panels/riskReview.ts`, not by the AI.
- Reviews are kept in the browser with the upload. A deployed static site has no helper, so no new reviews there.

## A floor-plan picture drawn in 3D (Simulation page, same helper)

On the Simulation page, after uploading a PNG or JPG floor plan, "Draw this plan in 3D with AI"
asks the same helper (`POST /api/plan-to-layout`) to describe the picture as a layout: rooms,
doors and objects.

- Key: `API_FOR_SIMULATION=...` in the same `.env` (never committed). A GitHub secret cannot be
  read by this helper; the key has to be in the local file. Same models as above.
- **The picture is sent to Google**, and only when the button is pressed. Without the button the
  file stays on the computer.
- The answer is the model's reading of the user's picture. It is not NASA data and holds none.
- **The model is told not to say what anything is made of**, and the page ignores any material
  it returns. The user picks each object's fuel from the fuels NASA's tables cover, or leaves it
  as not a fuel.
- The page checks the answer with the code that checks a layout file
  (`web/src/scene/cabin/layoutFile.ts`). An answer with any problem is refused whole and the
  problems are listed; nothing is repaired.
- A picture has no scale unless it shows one: the model then makes the longer side 12 m and says
  so, and the page shows that sentence.
