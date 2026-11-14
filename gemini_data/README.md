# gemini_data - unverified research

Answers from Gemini to the tasks in [PROMPT.md](PROMPT.md), saved as returned.

**Nothing in this folder is trusted yet.** A language model with web search can misquote, mix up
experiments, or cite a page that does not say what it claims. So:

- **Nothing here goes into the app directly.** Not into `web/public/data/`, not into AI summaries.
- **Workstream A verifies each item** by opening `source_url` and finding the `quote` and the value
  there. Only then may the value be added through `scripts/`, carrying its source URL.
- Record the result of each check in `VERIFIED.md` in this folder: item id, verified / wrong /
  could not open, who checked, date.
- An item marked `NOT_FOUND` stays an open question. Do not fill it from memory.
- Save each answer unedited under the file name its task gives. If you re-run a task, add a suffix
  (`G1_habitat_atmospheres_run2.md`); do not overwrite.

Which open questions each task feeds (see `CLAUDE.md`):

| Task | Feeds |
|---|---|
| G1 | Habitat boxes on the map (open question 2) |
| G2 | Pressure for solid-material tests (open question 1); source-table problem 5 |
| G3 | Investigation cards and AI summaries |
| G4 | Evidence for the solid-material gap |
| G5 | "Not in the tables" against "never tested": what NASA is already doing about the gap |
| G6 | Demo opening; Earth benefits view |
| G7 | Judging criteria (open question 8) |
| G8 | Untapped-data ranking (checks PSI's publication counts) |
