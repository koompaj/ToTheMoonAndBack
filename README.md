# To The Moon And Back

NASA Space Apps 2026 - **Flame in Freefall: SI-Powered Fire Safety Insights from Microgravity
Combustion Data.**

A dashboard that shows what NASA knows about fire for the place a crew will live, and what it has
not learned yet: a 3D map of every test by oxygen, pressure and fuel type, with each habitat drawn
as a box.

## Run it

```bash
cd web && npm install
```

```bash
cd web && npm run dev
```

Rebuild the app's data from NASA's files (Python 3.11+, standard library only):

```bash
python -I scripts/build_web_data.py data web/public/data
```

## Working on it

Three workstreams share this repo. Start with [CLAUDE.md](CLAUDE.md), then your brief:

- [A - Data](docs/roles/A-data.md)
- [B - 3D map and flame](docs/roles/B-3d.md)
- [C - Dashboard, panels and AI](docs/roles/C-dashboard-ai.md)

Also: [the challenge](docs/CHALLENGE.md) and [known problems in the source tables](docs/DATA_ISSUES.md).

## Data

All data comes from NASA's Physical Sciences Informatics repository
(https://psi.nasa.gov/physci/repo/). The files in `data/` are unmodified downloads. PSI asks that each
investigation be cited by its DOI; the DOIs are in `web/public/data/investigations.json`.
