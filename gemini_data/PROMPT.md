# Prompt for Gemini

How to use this:

1. Start a new Gemini chat with web search (Deep Research if you have it).
2. Paste **Part 1** and **one** task from **Part 2**. One task per chat gives better results.
3. Save Gemini's whole answer in this folder under the file name the task gives.
4. Do not edit the answer. Workstream A checks every item against its source before it is used.

---

## Part 1 - paste this first, every time

```text
You are a research assistant for a NASA Space Apps 2026 hackathon team working on the challenge
"Flame in Freefall: SI-Powered Fire Safety Insights from Microgravity Combustion Data".

We are building a dashboard about fire safety in crewed space habitats, based on NASA's Physical
Sciences Informatics (PSI) combustion experiments (BASS, BASS-II, Saffire-I/II/III, SAME, SAME-R,
FLEX, FLEX-2, CFI, SPICE, SLICE, and the ACME experiments BRE, CFI-G, Flame Design, CLD Flame,
E-FIELD Flames, s-Flame). We already have NASA's experiment tables. I need you to find specific
facts that are missing from those tables.

Everything you give me will be checked by hand against the source. An item I cannot verify is
worthless to me, and a wrong value is worse than a missing one. So follow these rules exactly:

1. USE PRIMARY SOURCES ONLY: nasa.gov, ntrs.nasa.gov, psi.nasa.gov, other space agencies' official
   sites, and peer-reviewed papers with a DOI. You may use Wikipedia, news or blogs to find leads,
   but never cite them as the source.
2. EVERY ITEM NEEDS: the exact URL of the page or PDF you actually opened, the document title, and a
   word-for-word quote of at most 40 words that contains the value. For a PDF, give the page number.
3. NEVER ESTIMATE, INFER, AVERAGE OR FILL IN A VALUE. If you cannot find it in a primary source,
   return the item with "status": "NOT_FOUND" and say where you looked. NOT_FOUND is a good answer.
4. KEEP VALUES AND UNITS EXACTLY AS THE SOURCE WRITES THEM. If you convert units, put the conversion
   in "converted" and leave the original untouched.
5. IF SOURCES DISAGREE, return each one as a separate item. Do not pick one or merge them.
6. SAY WHAT THE VALUE APPLIES TO: which experiment, which test series, which vehicle, which date.
   Do not apply a value from one experiment to another.
7. DO NOT cover rocket engines or propellant fires. They are out of scope.

OUTPUT FORMAT: one JSON array in a single code block, then a short "Notes" section in plain text for
anything that does not fit. Each array element must have exactly these fields:

{
  "id": "short unique id, e.g. G1-01",
  "topic": "what this item is about",
  "applies_to": "experiment, vehicle or material it applies to",
  "claim": "one plain sentence stating the fact",
  "value": "the value exactly as written in the source, or null",
  "unit": "the unit as written in the source, or null",
  "converted": "your unit conversion if any, or null",
  "source_title": "title of the page or paper",
  "source_url": "exact URL you opened",
  "source_doi": "DOI if there is one, or null",
  "source_location": "page number or section heading",
  "quote": "word-for-word quote, max 40 words, containing the value",
  "source_date": "publication date of the source if shown, or null",
  "status": "FOUND, CONFLICTING or NOT_FOUND",
  "confidence": "high, medium or low, with one short reason"
}

Here is the task.
```

---

## Part 2 - tasks (paste one after Part 1)

### G1 - Habitat atmospheres (highest priority) - save as `G1_habitat_atmospheres.md`

```text
TASK G1. Find the cabin atmosphere (oxygen concentration and total pressure) of each of these, as
stated by NASA or the responsible agency. Give one item per vehicle per source.

a. International Space Station (nominal cabin atmosphere).
b. Space Shuttle: nominal atmosphere, and the reduced-pressure atmosphere used before spacewalks.
c. Apollo command module and lunar module in flight.
d. Skylab.
e. NASA's "exploration atmosphere" planned for lunar landers, lunar surface habitats and
   pressurized rovers under Artemis (I have seen 8.2 psia and 34 % oxygen mentioned; confirm or
   correct it from a NASA source, and give the allowed tolerance range if stated).
f. Artemis Human Landing System and the Gateway, if NASA has published their atmospheres.
g. Any NASA reference design for a Mars surface habitat or Mars transit vehicle atmosphere.
h. Current and planned NASA spacesuits (EMU, xEMU, AxEMU): suit pressure and oxygen concentration.
i. The NASA document that sets the flammability limits or maximum oxygen concentration for these
   atmospheres, if one exists.
```

### G2 - Test conditions missing from NASA's tables - save as `G2_missing_test_conditions.md`

```text
TASK G2. NASA's summary tables for the experiments below leave out some test conditions. Find them
in NASA final reports, NTRS papers or journal papers. Give one item per experiment per condition.

For each of BASS, BASS-II, Saffire-I, Saffire-II, Saffire-III, SPICE, SLICE, SAME and SAME-R, find:
a. Ambient pressure during the tests (these ran in the ISS Microgravity Science Glovebox or inside a
   Cygnus cargo vehicle).
b. Oxygen concentration or range of oxygen concentrations tested.
c. Airflow speed or range of airflow speeds tested.
d. Materials or fuels burned, with sample thickness and size where given.
e. For BASS and BASS-II specifically: the lowest oxygen concentration at which each material still
   burned in microgravity, and the same limit in normal gravity, if the source gives both.
f. For Saffire-I and Saffire-III specifically: the sample length and width (NASA's two summary
   tables disagree on which is 94 cm and which is 40.6 cm).
```

### G3 - Key fire-safety findings per experiment - save as `G3_key_findings.md`

```text
TASK G3. For each experiment listed in the background above, find up to four main findings that
matter for spacecraft fire safety, as stated by the investigators in a NASA page, NASA report or
peer-reviewed paper. One item per finding. The "claim" must be a finding the source states, not your
own interpretation. Prefer findings about: how flammability changes in microgravity, the effect of
oxygen concentration, pressure and airflow, smoke detection, and extinguishing agents.
```

### G4 - Material flammability at raised oxygen - save as `G4_material_flammability.md`

```text
TASK G4. Find published NASA flammability data for these spacecraft materials: Nomex, cotton,
cotton-fiberglass blend (SIBAL), PMMA (acrylic), Ultem, Kapton, Teflon, silicone.

For each material find:
a. Results under NASA-STD-6001 Test 1 (upward flame propagation), with the oxygen concentration and
   pressure of the test.
b. Maximum oxygen concentration (MOC) or oxygen index, with the pressure it was measured at.
c. Any data at reduced pressure with raised oxygen (for example 8.2 psia with 34 % oxygen, or
   10.2 psia with 26.5 % or 30 % oxygen).
d. Any direct comparison of the flammability limit in microgravity against normal gravity.

Also find the scope statement of NASA-STD-6001 Test 1: what it tests and at what gravity level.
```

### G5 - Experiments that will fill the gap - save as `G5_future_experiments.md`

```text
TASK G5. Find the current status and purpose of NASA combustion experiments that test solid
materials at raised oxygen, reduced pressure or partial gravity, and that may not yet be in the PSI
database. For each give: what it burns, the oxygen, pressure and gravity conditions planned or
tested, where it runs, launch or operation dates, and whether its data is public.

Include at least: SoFIE (Solid Fuel Ignition and Extinction) and its sub-experiments, Saffire-IV, -V
and -VI, LUCI (Lunar-g Combustion Investigation), FM2 (Flammability of Materials on the Moon), and
any others you find.
```

### G6 - Fire incidents and Earth spinoffs - save as `G6_incidents_and_spinoffs.md`

```text
TASK G6. From NASA's own pages, extract the key facts of each event below: date, vehicle, cabin
atmosphere at the time (oxygen and pressure), what burned or failed, how it was detected, how it was
put out, and the lessons NASA states.

a. Apollo 1 fire (1967).
b. Apollo 13 oxygen tank failure (1970).
c. Fire aboard Mir (1997).
d. The smoke alarm during the Artemis II mission.

Then, for these three NASA spinoffs, extract what the technology was, which space programme it came
from, and what it improved on Earth: firefighter breathing apparatus (air tanks), the Shuttle-era
smoke detector that tells smoke from dust, and firefighter protective clothing. Also find any NASA
statement about fine-water-mist fire extinguishers developed for the ISS being used on Earth.
```

### G7 - Judging and submission rules - save as `G7_judging_rules.md`

```text
TASK G7. From the official NASA Space Apps Challenge website (spaceappschallenge.org), find for the
2026 event: the judging criteria and how each is described, the required parts of a project
submission, any limits on length or format of the demo, the rules on use of AI tools, and the key
dates and deadlines. Use only the official site. If a 2026 page is not available, say so and give
the most recent year's version, clearly labelled with its year.
```

### G8 - Publications per experiment - save as `G8_publications.md`

```text
TASK G8. For each of these experiments, find peer-reviewed papers and NASA technical reports that
use its flight data: ACME CFI-G (Cool Flames Investigation with Gases), CFI (Cool Flames
Investigation), SPICE, SAME-R, BASS, BASS-II, Saffire-I, Saffire-II, Saffire-III.

One item per publication: put the full citation in "claim", the publication year in "value", and the
DOI in "source_doi". In "quote", give the sentence from the paper that names the experiment.
I need to know which experiments have been studied the least, so do not pad the list: include a
paper only if it clearly uses that experiment's data.
```
