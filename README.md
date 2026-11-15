# To The Moon And Back

**NASA Space Apps Challenge 2026 - [Flame in Freefall: SI-Powered Fire Safety Insights from Microgravity Combustion Data](https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/?tab=details)**

> **What does NASA know about fire where crews will live, and what has it not tested yet?**

A web dashboard that takes every combustion test in NASA's Physical Sciences Informatics (PSI)
database, places it by the air it ran in (oxygen and pressure), and compares that with the air of
each place a crew will live: a Moon base, the Space Station, a spacesuit. For any place you can see
the tests that apply, the nearest tests that do not, how those flames ended, and what is missing.

## The problem

Fire in a closed cabin is one of the worst risks a crew faces. Future habitats will not use
Earth's air: the challenge expects a Moon base at **30 % oxygen or more and 10.2 psi or less**,
and more oxygen makes materials burn more easily.

NASA has run **1,711 microgravity combustion tests** across **24 investigations**, but they sit
in 22 separate tables, each with its own columns and units. Nobody can look at a habitat's air
and see at once which tests apply to it. This dashboard answers that, and shows the gaps.

## What the data says

Every number below is worked out from NASA's tables by `scripts/build_web_data.py` and is the
number the app shows.

| Finding | Where it is in the app |
|---|---|
| **Only 20 tests ran in Moon-base air**, all gas flames from one investigation (ACME CFI-G, PSI-159). | Home, "Moon Base and pressurized rovers" card |
| **In NASA's own exploration atmosphere (34 % oxygen, 8.2 psia) the tables hold 0 tests.** | Home, "Moon Base (NASA Air)" card |
| **No solid material in the tables was burned at 30 % oxygen or more.** The highest is 22.7 % (BASS). | Risk, gap 2 |
| 206 tests ran in Space Station air. All of them ran in microgravity. | Home, "Space Station (ISS)" card |
| Droplet flames went out **17 of 17** times at 12-14 % oxygen and **0 of 9** times at 34-36 % (FLEX). | A place page, "Will it go out?" |
| Every test ran in microgravity. None ran in Moon or Mars gravity. | Risk, gap 3 |

We say **"not in the tables"**, never "never tested". NASA burned materials in other air in
Saffire-IV to VI, but those results are not in PSI. The droplet result is a pattern in NASA's
tables, not proof of cause.

## User journey

1. **Home: choose a place.** Five cards show the places whose air has a source (Moon base, Moon
   base in NASA's exploration air, Space Station, spacesuit, Earth), each with the number of NASA
   tests that ran in that air. Charts show what burned, at what oxygen, and how tests ended.
2. **Place page: see what is known there.** Four answers for the chosen place: the tests in its
   air, the closest tests outside it and how far away they are, how the flames inside ended, and
   what is not in the tables yet.
3. **Fire page: choose what is burning.** For a gas, a liquid or a solid in that place, the page
   shows a 3D flame (an illustration, labelled as one) and what NASA's tests say about the three
   fire-safety tasks: detecting it, putting it out, and preventing it.
4. **Experiments: go to the source.** All 24 investigations as cards. Search them, filter the
   tests by air and gravity, compare investigations, and download every test as a CSV file in
   which each row cites its NASA table row and DOI.
5. **Risk: see what is missing.** A grid of places against fuels, with the empty boxes marked;
   the biggest gaps in plain words; the research needed for each fire-safety task; and a ranking
   of which existing investigations might already hold answers.
6. **Simulation: try it on a cabin.** Set the cabin's oxygen, pressure, airflow and gravity (or
   start from a place), choose what burns, place a fire in a 3D cabin, and press Simulate. The
   page lists the nearest real NASA tests and what they did.

Two things a user can add:

- **Their own experiment** (Home, "Upload New Experiment"). It is kept out of every NASA count,
  and an AI review sets it beside NASA's nearest tests.
- **Their own cabin** (Simulation, "Your Own Floor Plan"): a picture of a floor plan, or a 3D
  layout file with rooms, doors, a vent duct and objects.

## How it meets the challenge

| The challenge asks for | What we built |
|---|---|
| Summarize the investigations | Experiments: one card per investigation with its aim, fuel, conditions, tests and DOI |
| Rank them | Risk, "Where the Answers Might Already Be": investigations ranked by fire-safety relevance against how little they have been studied |
| Interpret them for fire safety | Place and Fire pages: what the tests say about detection, suppression and prevention in a place's air |
| Investigations relevant to crew habitats | Every test placed against the air of five places; untested air is shown as a gap |
| Data that supports predictive modelling | "Will it go out?" counts by oxygen and pressure; CSV download of all tests with sources |
| Next-generation fire-safety controls | Risk, "Research Needed, by Fire-Safety Job" |
| Fire safety on Earth (optional) | "Earth Benefits" drawer: NASA fire-safety spinoffs used on Earth |
| Web-based and interactive | A web app that runs in the browser; every count, chart and card can be clicked through to its tests |

Rocket and propellant fire safety is out of scope, as the challenge says.

## NASA data used

| Data | Source | How it supports the project |
|---|---|---|
| **PSI Combustion Science: 24 investigations, 22 experiment tables, 2,009 rows** | [NASA Physical Sciences Informatics](https://psi.nasa.gov/physci/repo/) ([combustion search](https://psi.nasa.gov/physci/repo/search?q=combustion)) | The whole app. Each test's oxygen, pressure, fuel, airflow and ending come from these tables. |
| PSI reports and test matrices for BASS and BASS-II | Same repository, each investigation's documents | Pressure for 150 solid-material tests, which the tables do not record |
| Air of each place | [Challenge page](https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/?tab=details); [NASA Evidence Report, Risk of Hypoxia from the Exploration Atmosphere (2015)](https://humanresearchroadmap.nasa.gov/evidence/reports/ExpAtm.pdf); [NASA/TP-2010-216134](https://www.nasa.gov/wp-content/uploads/2023/03/henninger-8.2-34-atm-tp216134-2010.pdf); [NASA OCHMO-TB-003](https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-003-habitable-atmosphere.pdf) | The oxygen and pressure box each test is compared with |
| Gravity of each place | [NASA NSSDC Moon Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html) | Says whether a test's gravity matches the place |

PSI asks that each investigation be cited by its DOI. All 24 DOIs are in
[docs/SUBMISSION_DATA.md](docs/SUBMISSION_DATA.md) and beside every investigation in the app.
The files in `data/` are NASA's files exactly as downloaded.

## How we keep it honest

- **Real NASA data only.** No value is invented, estimated or filled in. A value missing from
  the source stays empty, with a flag.
- **Everything can be traced.** Each test carries its table and row; each investigation its DOI.
- **All 2,009 source rows are accounted for:** 1,753 test rows (1,711 distinct tests), 247 rows
  in tables that are not one row per burn, and 9 left out, each with its reason.
- **100 independent checks** re-read NASA's files on every data build, and the build stops if
  one fails.
- **Problems in the source are reported, not hidden:** repeated rows, conflicting oxygen values
  and broken links are listed in [docs/DATA_ISSUES.md](docs/DATA_ISSUES.md).
- **Inverse flames are kept separate.** Their oxygen is the gas fed from the burner, not cabin
  air, so they never count toward a habitat.
- **Publication counts are a signal, not proof.** The ranking says so wherever it appears.
- **Fire spread is a drawing, never a result.** NASA's tables hold no spread rates. The spread on
  the Simulation tab is labelled "Illustration of spread, not a prediction", counts steps and
  never time, and changes only with settings the user can see, which start at "no effect".

## Use of AI

| Where | What it does | How it is kept in check |
|---|---|---|
| Review of an uploaded experiment (Google Gemini) | Compares the user's upload with NASA's nearest tests | It is given numbered facts worked out by code and must cite them; a line with no valid citation is dropped |
| A floor-plan picture drawn in 3D (Google Gemini) | Reads rooms, doors and objects from the user's picture | It never says what anything is made of; the user picks each fuel from NASA's tested list; an answer with any problem is refused whole |
| Offline summaries (Claude) | `ai/generate.mjs` can write short cited summaries from the same facts as the screen | Its output is not in this repository, so the app shows none today |

No API key is in the browser or in this repository: both Gemini features run through a small
helper on the user's own computer. Code in this repository was written with help from Claude
(Anthropic). Everything an AI wrote or drew is labelled as such in the app.

## Run it

Node 20.19 or newer.

```bash
cd web && npm install
```

```bash
cd web && npm run dev
```

Then open http://localhost:5173.

The two AI features need the helper, with `API_FOR_RISK` and `API_FOR_SIMULATION` set in a
`.env` file in this folder (never committed). Everything else works without it.

```bash
node ai/risk-server.mjs
```

Rebuild the app's data from NASA's files and run the 100 checks (Python 3.11 or newer, standard
library only):

```bash
python -I scripts/build_web_data.py data web/public/data
```

## Sample files to try

In [`web/src/scene/cabin/samples/`](web/src/scene/cabin/samples/), for the Simulation tab's
"Your Own Floor Plan" box:

| File | What it is |
|---|---|
| `l-shaped-habitat.layout.json` | A 3D layout: three rooms in an L, one closed door, and a vent duct that is the only way into the closed room. Upload it, place a fire and press Simulate. |
| `made-up-floor-plan.png` | A made-up picture of a floor plan. Upload it and press "Draw this plan in 3D with AI" (needs the helper). |
| `README.md` | The layout file format, so you can write your own. |

Both are examples we made up. Neither is a real place or a NASA design.

## Limits

- **Not deployed.** The build is a static site; run it locally as above.
- **No partial gravity.** PSI holds none yet, so nothing here says how a fire behaves on the Moon
  or Mars.
- **Two places cannot be shown:** a spacecraft cabin such as Orion, and a Mars habitat. We found
  no current NASA figures for their air.
- **113 of 263 solid-material tests cannot be placed:** NASA's files give no single cabin
  pressure for them.
- **Video and raw sensor files are not included** (about 16,000 GB). The app links to PSI.

## Working on it

Three workstreams share this repository. Start with [CLAUDE.md](CLAUDE.md), then your brief:

- [A - Data](docs/roles/A-data.md)
- [B - 3D cabin, flame and illustrated spread](docs/roles/B-3d.md)
- [C - Dashboard, panels and AI](docs/roles/C-dashboard-ai.md)

Also: [notes on the challenge](docs/CHALLENGE.md), [known problems in the source tables](docs/DATA_ISSUES.md),
[what we found in PSI's raw files](docs/RAW_DATA_FINDINGS.md) and [the submission's references](docs/SUBMISSION_DATA.md).
