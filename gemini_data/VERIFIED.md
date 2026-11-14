# VERIFIED - workstream A's check of the Gemini answers

Checked 2026-11-14 by workstream A (Claude, in the browser and by script). This replaces the file
Gemini wrote under this name, which was Gemini grading its own answers; that text is kept, unchanged,
in `GEMINI_SELF_REVIEW.md`. **A model reviewing itself is not verification.**

How each item was checked:

- `scripts/gemini_items.py` lists all 211 items; `scripts/verify_gemini.py` does a mechanical first
  pass (results per item in `AUTO_CHECK.json`): PSI quotes against our downloaded PSI records,
  DOIs against Crossref, web pages fetched and searched for the quote.
- Key sources opened by hand: NASA PDFs on nasa.gov and humanresearchroadmap.nasa.gov, the official
  Space Apps pages, one NASA news article.
- **ntrs.nasa.gov refuses this connection (HTTP 403), even from a real browser.** Items that cite only
  NTRS could not be opened and stay unverified.

Only rows marked **USE** may enter the app, with the source given here (not Gemini's quote).

## 1. Verified - USE (with these sources)

| What | Value | Source actually opened | Gemini item |
|---|---|---|---|
| ISS cabin air | 14.7 psia, 21 % O2 | "NASA's more recent programs, including the Space Shuttle Program and International Space Station (ISS) program have operated at an Earth-equivalent sea level atmosphere of 14.7 psia and 21% O2." Evidence Report: Risk of Hypoxia from the Exploration Atmosphere, p. 5, https://humanresearchroadmap.nasa.gov/evidence/reports/ExpAtm.pdf (same report as NTRS 20150021491). Also NASA OCHMO technical brief OCHMO-TB-003, p. 8: "Currently, the ISS cabin pressure is typically maintained at 14.7 psia with 21% O2, which is equivalent to sea level." https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-003-habitable-atmosphere.pdf | G1-01 (quote exact) |
| Space Shuttle nominal air | 14.7 psia, 21 % O2 | Same sentence, ExpAtm.pdf p. 5 | G1-02 (quote exact) |
| Exploration atmosphere (Moon Base, landers, rovers) | 8.2 psia, 34 % O2 | "After re-evaluation in 2012, the 8/32 environment was altered to 8.2 psia and 34% O2 to reduce the hypoxic stress to a crewmember." ExpAtm.pdf p. 4. Acronym list: "8.2/34% Current exploration atmosphere, 8.2 psia pressure, 34% oxygen". | G1-06 (value right, **quote not verbatim**) |
| Control box around a recommended atmosphere | +-0.2 psia total pressure, +-2.0 % O2 | "All recommended nominal atmospheres are assumed to be at the center of a control box of +-0.2 psia total pressure and +-2.0% oxygen concentration." NASA/TP-2010-216134, p. 11, https://www.nasa.gov/wp-content/uploads/2023/03/henninger-8.2-34-atm-tp216134-2010.pdf. Note: written in 2010 for the then-recommended 8.0 psia / 32 %; applying it to 8.2 / 34 is our extension and must be labelled so. | G1-07 (value right, **quote not verbatim**) |
| Shuttle staged decompression air | 10.2 psia, 26.5 % O2 | "...physiologically equivalent to the staged decompression atmosphere of 10.2 psia / 26.5% O2 (inspired O2 pressure = 127 mmHg) used on 34 different shuttle missions for approximately a week each flight." ExpAtm.pdf p. 4 | G1-03 (value right, **quote not verbatim**) |
| Apollo and Skylab cabin air | Apollo 5.0 psia, 100 % O2; Skylab 5.0 psia, 70 % O2 | "...Apollo missions (cabin pressure 5.0 psia @ 100% O2) and Skylab (cabin pressure 5.0 psia @ 70% O2)". NASA/TP-2010-216134, p. 115 | G1-04, G1-05 (values right, **quotes not verbatim**) |
| Mars transit vehicle (2010 recommendation) | 14.7 psia / 21 % O2 **and** 10.2 psia / 26.5 % O2 | "...the Mars transit vehicle should operate at nominal values of 14.7 psia, 21% oxygen and 10.2 psia, 26.5% oxygen." NASA/TP-2010-216134, p. 12. Gemini's G1-10 gives only the first pair, from a different report. | G1-10 (partly) |
| Space Apps judging | 5 criteria (Impact, Creativity, Validity, Relevance, Presentation), each scored 1 to 5; Relevance asks that NASA data be "a core component" | https://www.spaceappschallenge.org/resources/judging-awards-guide/ (dated November 13, 2026) | G7-02, G7-03, G7-04 (quotes match); **G7-01 and G7-05 quotes are not on the page** |
| Space Apps demo and deadline | Demo: max 7 slides including title and intro, or a 30-second video (English, or English subtitles). Submit before Sunday, November 15, 11:59 p.m. local time. Max 6 team members. | Same page | G7-09, G7-10 (values right) |
| Space Apps rule on SI tools | "Each team's project submission must include a description of how SI tools were used during the development of their project." | https://www.spaceappschallenge.org/resources/participant-faqs/ (Gemini cited `/participant-faq/`, which is a 404) | G7-12, G7-13 |
| Saffire-VI ran crewed-spacecraft conditions | "...higher oxygen concentration and lower pressure generated in the test unit to simulate the conditions within crewed spacecraft." 19 runs. No numbers on the page. | NASA Glenn article, Feb 14, 2024, https://www.nasa.gov/centers-and-facilities/glenn/flame-burns-out-on-nasas-long-running-spacecraft-fire-experiment/ | G5 (Saffire-VI) |
| Saffire-IV, -V, -VI are not in PSI | Only Saffire-I, -II, -III appear among the 24 Combustion Science records | Our own PSI download (`data/search_combustion.json`) | G5 |
| Moon surface gravity | 1.62 m/s2, 0.165 of Earth's (about 1/6) | NASA NSSDC Moon Fact Sheet: "Surface gravity (m/s 2 ) 1.62 9.80 0.165" (Moon, Earth, ratio), https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html. Also "the gravity on the surface of the Moon is one-sixth of Earth's", https://science.nasa.gov/moon/facts/ (both opened 2026-11-14) | none (checked by A) |
| Gravity of every PSI test | Microgravity | Each of the 10 investigations with tests in `tests.json` has NASA project type "Microgravity Investigation" in its PSI record; flight platform ISS (9) or Cygnus Spacecraft (SAFFIRE-II). Our own PSI download (`investigations.json`) | none (checked by A) |
| Spacesuit gravity | Microgravity (ISS spacewalks) or Moon gravity | ExpAtm.pdf p. 6 names "the ISS construction and maintenance EVAs" and "exploration EVAs" | none (checked by A) |

## 2. PSI-text items - quote confirmed, citation link wrong

The quote is word-for-word in our downloaded PSI record or table, so the fact itself is fine. But
**every PSI link Gemini gives (`psi.nasa.gov/investigation/PSI-nn`) does not exist**; the real page is
`https://psi.nasa.gov/physci/repo/data/investigations/PSI-nn`.

- Quote in record: G2-03, G2-04, G2-09, G2-14, G2-26, G2-27, G2-28, G2-30, G2-31, G2-32, G3-02,
  G3-11, G3-16, G3-19, G3-21.
- Value in table cell: G2-13, G2-16, G2-18, G2-19, G2-20, G2-23, G2-24, G2-39, G2-40.
- **G2-11 overclaims:** the table only shows a test at 16.4 % O2; it does not say the fabric
  "sustained combustion down to" 16.4 %. Do not use the claim.
- **G3-21:** the quote is an objective, not a finding (Gemini's self-review says the same).

## 3. NOT verified - do not use yet

| Item(s) | Why |
|---|---|
| **G2-01, G2-06, G2-12, G2-17, G2-21, G2-25, G2-29, G2-33, G2-37** (pressure of the solid-material and glovebox tests, "1 atm" / "~100 kPa") | Sources are on NTRS (unreachable) or paywalled (Urban et al. 2019 exists per Crossref, quote not checkable). G2-01's quote states no pressure at all ("slight negative pressure relative to the ISS cabin"). The PSI records do not state a pressure either. **Do not backfill pressure for the 263 solid tests yet.** |
| G1-08 Gateway, G1-09 HLS, G1-11 Mars surface habitat, G1-13/14 suits, G1-15/16 standards | NTRS / standards.nasa.gov not reachable. G1-09's quote reads like a paraphrase. |
| G3-14 (SPICE smoke-point scaling) | **Wrong DOI**: 10.1016/j.firesaf.2011.07.006 is a paper on PVC flame retardants. The real SPICE paper is G8-05. |
| 30 items whose quote is not on the cited page (`AUTO_CHECK.json`, check `quote_not_in_source`), mostly G5 and G6 | Quote not found where cited. Some pages may load text by script; check by hand before use. |
| G5-01, G5-02, G6-22, G6-25, G6-26, G6-27, G6-28, G6-31 | Cited URL returns 404. |
| G7-14 to G7-16 dates | Cited page is a 404. November 14-15, 2026 is confirmed on the real FAQ; "opens Saturday 9:00 AM" and "September 17" were not checked. |
| All G4 (material flammability), most G8 (publications) | DOIs exist (Crossref) but papers are paywalled or on NTRS; quotes not checked. Publication counts in G8 are Gemini's own judgement of "uses flight data". |

## 3b. Second round - the items the project uses (2026-11-14, evening)

The team stopped using Gemini; workstream A verified what the app, demo and summaries rely on, using
NASA documents this computer can open (ntrs.nasa.gov still refuses with HTTP 403).

| Question | Result | Source opened |
|---|---|---|
| Does NASA's 8.2 / 34 apply to a lunar habitat today? | **USE.** "Consider the case of the current 8.2 psia habitat pressure with 34% O2 and 66% N2." | ExpAtm.pdf p. 29 |
| Vehicle set points in NASA's lunar EVA plans | Confirms the three set points 14.7 psia / 21 %, 10.2 psia / 27 %, 8.2 psia / 34 % ("nominal saturation atmosphere set points" for vehicles). Not used as a habitat on its own. | NASA EVA-EXP-0075, Lunar Surface Concept of Operations, p. 8, https://www.nasa.gov/wp-content/uploads/2020/01/topic_1-_eva_lunar_surface_concept_of_operations.pdf |
| Spacecraft cabin (Orion) | **Not added.** Only a 2011 proposal found: "The nominal atmosphere proposed for Orion is 10.2 psia with 26.5% O2" (NASA/TP-2011-216147, p. 42, https://www.nasa.gov/wp-content/uploads/2023/03/conkin-prebreathe-overview-tp216147-2011.pdf). A Constellation-era proposal is not today's Orion; the slot stays "waiting". | as stated |
| Lunar lander, Mars surface habitat | **Not added.** The only figures found are the 2010 recommendations (landers and surface habitats at 8.0 psia / 32 %, NASA/TP-2010-216134 p. 11), which NASA replaced with 8.2 / 34 in 2012 (ExpAtm p. 4). ExpAtm discusses "lunar and Mars habitat" designs (p. 5) but gives no Mars-specific number. Gemini's G1-09 (HLS) and G1-11 (Mars) cite NTRS documents that could not be opened. Slots stay "waiting". | as stated |
| Pressure of the solid-material tests (BASS, BASS-II, Saffire-I to III) | **Still not verified. Not backfilled.** Open sources say where the tests ran (MSG in the ISS Destiny lab; Cygnus) but no pressure: Scientific Reports 2017 BASS-II paper (https://link.springer.com/content/pdf/10.1038/s41598-017-18398-4.pdf) and the NASA Saffire fact sheet. The papers that may state it are on NTRS or paywalled. | as stated |
| Saffire-IV to VI conditions | **USE (qualitative).** "Saffire IV burned the same materials were burned in Saffire II, but at different pressures and oxygen saturation for comparison." "Saffire-V examines fire growth in the range of pressures and oxygen concentrations expected in future exploration spacecraft." The numbers (about 54-55 kPa, 28-31 % O2) found in search results come from NTRS and are **not** verified. | NASA Saffire fact sheet, p. 2, https://www.nasa.gov/wp-content/uploads/2025/07/spacecraft-fire-safety-demonstration-saffire.pdf |

**Not used by the project, so not verified further:** G3 (key findings), G4 (material flammability),
G5 apart from Saffire, G6 (incidents and spinoffs; the Earth drawer uses the challenge page instead),
G8 (publications; the ranking uses PSI's own lists). Treat them as unverified if anyone wants them later.

## 4. What this means for the project

1. **Gemini's numbers are often right but its quotes often are not.** Of 6 habitat values checked by
   hand, all 6 values were right but 4 quotes were reworded. Never paste a Gemini quote into the
   app; cite the sentence in section 1.
2. **In NASA's own exploration-atmosphere box (8.0 to 8.4 psia, 32 to 36 % O2) the PSI tables hold
   0 tests.** The nearest are ACME CFI-G gas flames at 7.35 psi and 33 to 35 % O2. Our current
   "20 tests" headline uses the challenge's wider box (O2 >= 30 %, 4.3 to 10.2 psi). Team decision
   needed on which box(es) to show.
3. NASA has burned solids near crewed-spacecraft air (Saffire-VI), but those results are **not in
   PSI**. This supports "not in the tables", not "never tested".
4. The solid-test pressure gap stays open until someone opens a primary source.
5. Added to the data from section 1 and 3b: ISS, NASA's Moon Base box, and Earth's oxygen source
   (`habitats.json`, each with `source_urls`).
