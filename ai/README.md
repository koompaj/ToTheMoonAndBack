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
