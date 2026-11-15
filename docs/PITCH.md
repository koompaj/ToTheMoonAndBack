# Pitch: 7-slide deck and 30-second video (draft, workstream A, 2026-11-15)

Rules (Space Apps 2026 Project Submission Guide): slide deck **at most 7 slides including title and intro**;
video **30 seconds or less**, English or English subtitles. Going over either limit makes the project
ineligible for Global Judging. The deck must show: team name, team members' names, the challenge, an image
of the project, the user experience, and how NASA data makes it possible. Judged on Impact, Creativity,
Validity, Relevance and Presentation (1-5 each). Any AI-made image or video needs a visible watermark.

Every number below is on `main` (place counts are distinct tests). Re-check them on the deployed site before recording. Source for each is in brackets.

---

## Slide deck (7 slides)

### Slide 1 - Title
- **To The Moon And Back** - "Flame in Freefall"
- Tagline: *What NASA knows about fire where crews will live, and what it has not tested yet.*
- Team: [full names of the three members]. Challenge: NASA Space Apps 2026, Flame in Freefall.
- Visual: the 3D habitat map (screenshot).

### Slide 2 - The problem
- Fire in a closed cabin is one of the worst risks a crew faces (Apollo 1, Mir; challenge Resources tab).
- Moon and Mars habitats will use different air: a Moon base is expected at **30 % oxygen or more and
  10.2 psi or less** (challenge page); NASA's exploration atmosphere is **34 % O2, 8.2 psia** (NASA, 2015).
- NASA has run **1,711** microgravity combustion tests across **24** PSI investigations, but they are
  scattered across 22 tables, reports and raw files. [data_quality.json, investigations.json]
- Question: *for the place a crew will live, which tests apply, and what is missing?*

### Slide 3 - What we built (user experience)
- Pick a place (Moon base, NASA Moon air, ISS, spacesuit, Earth): see the tests run in that air, the nearest
  tests outside it, whether flames went out, and what is not in NASA's tables.
- 3D map: every NASA test is a dot (oxygen x pressure x fuel type); each place is a see-through box. 2D view too.
- Upload a floor plan, mark materials, liquids and gas: each mark is coloured by how much NASA evidence exists.
- Type any air (e.g. a future Orion or Mars value): the matching NASA tests appear.
- Visual: place card + habitat evidence map screenshots.

### Slide 4 - NASA data at the core
- **PSI Combustion Science: 24 investigations, 22 experiment tables, 2,009 source rows**, every one accounted
  for. [data_quality.json]
- We also read **9.3 GB of PSI's raw files** (reports, spreadsheets, sensor logs): recovered oxygen and pressure
  for **121 BASS tests** from NASA's own test matrix, NASA's sensors for 12 investigations, fuel shapes.
- Every number on screen links to its NASA table row or report page, and the investigation's DOI.
- **105 independent checks** re-read NASA's files on every build. We found and handled NASA's own data problems:
  repeated rows, conflicting oxygen values, broken links.

### Slide 5 - What the data says
- Moon base air: only **20** tests, all gas flames from one investigation (ACME CFI-G). [habitats card]
- NASA's own Moon atmosphere (34 % / 8.2 psia): **0 tests** in PSI's tables.
- **No solid material in the tables was burned at 30 % oxygen or more** (highest: 22.7 %, BASS).
- Droplet flames went out **17 of 17** times at 12-14 % oxygen and **0 of 9** at 34-36 % (FLEX): higher oxygen,
  harder to put out. [outcomes.json; an association, not proof of cause]
- Say "not in the tables", never "never tested": NASA's Saffire-IV to VI results are not in PSI.

### Slide 6 - AI, used honestly
- Upload your own experiment: an AI (Google Gemini) compares it with NASA's nearest tests, using numbered facts
  worked out by code; any line without a valid citation is dropped.
- Upload a floor-plan picture: the AI reads rooms, doors and objects into 3D; it never says what anything is made
  of, the user picks each fuel from NASA's tested list.
- Every AI output is labelled in the app as the AI's, "not NASA data". No API key is in the browser or the repo.
- The fire-spread view is labelled an illustration, never a prediction; its settings are the user's own.
- Code written with help from Claude (Anthropic).

### Slide 7 - Impact and next steps
- For mission designers: see in one view which fire tests exist for a habitat's air, and which are missing.
- For researchers: the gaps become a list of tests to run next (solids at 30 %+ oxygen and low pressure,
  partial gravity once LUCI and FM2 data arrive). For students: an open, cited way into NASA's data.
- Earth: the app's Earth Benefits drawer links NASA fire-safety spinoffs already used on Earth (air tanks,
  a fire detector, fire attire; challenge Resources tab).
- Links: live app [URL], repository [URL], 30-second video [URL].

---

## 30-second video (with English subtitles)

| Time | On screen | Voice / subtitle |
|---|---|---|
| 0:00-0:02 | Team name, three faces or names | "We're To The Moon And Back." |
| 0:02-0:05 | Challenge title, a fire on the ISS (NASA footage, credited) | "Flame in Freefall: fire safety where crews will live." |
| 0:05-0:10 | Home page, 3D map spinning, dots appearing | "NASA ran 1,711 fire tests in microgravity. We put every one on a map of oxygen and pressure." |
| 0:10-0:20 | Click Moon Base box: "20 tests, all gas"; switch to NASA Moon air: "0 tests"; evidence map colours | "For a Moon base, only 20 tests apply, and in NASA's own Moon air, none. No solid material was burned above 23 % oxygen." |
| 0:20-0:30 | Floor-plan evidence map; citation chip opening a NASA row | "Every number links to NASA's data, so engineers can see what's known, and what to test next." |

Notes: keep under 30 s (time it); no person under 18 on screen; if any shot or voice is AI-made, add a visible
"AI-generated" watermark or note; credit NASA footage; don't use NASA logos in AI-made material.
