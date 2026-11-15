# Submission text - data and sources (workstream A)

Ready to paste into the Space Apps project form. Numbers come from the data as built; if the data is
rebuilt, re-run `python -I scripts/build_web_data.py data web/public/data` and check them.

## References

### NASA data (cite each investigation by its DOI, as PSI asks)

All test data comes from NASA's Physical Sciences Informatics (PSI) repository,
https://psi.nasa.gov/physci/repo/ (Combustion Science, 24 investigations, licence CC0-1.0 where stated).

- ACME/Flame Design: Advanced Combustion via Microgravity Experiments / Flame Design (PSI-10). NASA Physical Sciences Informatics. https://doi.org/10.60555/w4zy-bt45
- ACME BRE: Advanced Combustion via Microgravity Experiments - Burning Rate Emulator (PSI-20). NASA Physical Sciences Informatics. https://doi.org/10.60555/vb93-3y72
- ACME CLD Flame: Advanced Combustion via Microgravity Experiments / Coflow Laminar Diffusion Flame (PSI-21). NASA Physical Sciences Informatics. https://doi.org/10.60555/23e1-9950
- ACME E-FIELD Flames: Advanced Combustion via Microgravity Experiments Electric-Field Effects on Laminar Diffusion Flames (PSI-22). NASA Physical Sciences Informatics. https://doi.org/10.60555/se5a-8c73
- ACME s-Flame: Advanced Combustion via Microgravity Experiments-Structure and Response of Spherical Diffusion Flames (PSI-23). NASA Physical Sciences Informatics. https://doi.org/10.60555/k57n-p030
- BASS-II: Burning and Suppression of Solids - II (PSI-25). NASA Physical Sciences Informatics. https://doi.org/10.60555/4qc4-de67
- BASS: Burning and Suppression of Solids (PSI-26). NASA Physical Sciences Informatics. https://doi.org/10.60555/58h4-dy80
- CFI: Cool Flames Investigation (PSI-39). NASA Physical Sciences Informatics. https://doi.org/10.60555/m6pj-a914
- DAFT / DAFT-2: Dust and Aerosol Measurement Feasibility Test / Dust and Aerosol Measurement Feasibility Test-2 (PSI-47). NASA Physical Sciences Informatics. https://doi.org/10.60555/ztgj-d202
- Computational and Experimental Analysis of SPICE Data Sets (PSI-60). NASA Physical Sciences Informatics. https://doi.org/10.60555/mzjm-yv57
- Concurrent Flame Spread Modeling using Flamelet Generated Manifolds in Microgravity with Comparison to BASS Experiments using Two-Color Tomography (PSI-62). NASA Physical Sciences Informatics. https://doi.org/10.60555/e9xp-ex83
- FLEX-2: Flame Extinguishment Experiment - 2 (PSI-68). NASA Physical Sciences Informatics. https://doi.org/10.60555/byp8-h018
- FLEX: Flame Extinguishment Experiment (PSI-69). NASA Physical Sciences Informatics. https://doi.org/10.60555/mbq8-0451
- SAFFIRE-I: Spacecraft Fire Safety Experiment-I (PSI-98). NASA Physical Sciences Informatics. https://doi.org/10.60555/0t15-1z43
- SAFFIRE-II: Spacecraft Fire Experiment-II (PSI-99). NASA Physical Sciences Informatics. https://doi.org/10.60555/2chp-m469
- SAFFIRE-III: Spacecraft Fire Experiment-III (PSI-100). NASA Physical Sciences Informatics. https://doi.org/10.60555/040q-4h36
- SAME-R: Smoke Aerosol Measurement Experiment-Reflight (PSI-101). NASA Physical Sciences Informatics. https://doi.org/10.60555/2np7-jv14
- SAME: Smoke and Aerosol Measurement Experiment (PSI-102). NASA Physical Sciences Informatics. https://doi.org/10.60555/gd4k-8h62
- SLICE: Structure and Liftoff In Combustion Experiment (PSI-106). NASA Physical Sciences Informatics. https://doi.org/10.60555/pm12-rg61
- SPICE: Smoke Point In Co-flow Experiment (PSI-107). NASA Physical Sciences Informatics. https://doi.org/10.60555/9kbh-e962
- Utilization of the Smoke Aerosol Measurement Experiment Data for Advanced Modeling and Simulation of Smoke Generation in Micro-Gravity (PSI-115). NASA Physical Sciences Informatics. https://doi.org/10.60555/q0v5-1v28
- Effect of External Thermo-Convective Perturbation on Cool Flame Dynamics: A Multidimensional Multi-Physics CFD Analysis (PSI-117). NASA Physical Sciences Informatics. https://doi.org/10.60555/gz0q-b577
- Quantitative Studies of Cool Flame Transitions at Radiation / Stretch Extinction Using Counterflow Flames (PSI-142). NASA Physical Sciences Informatics. https://doi.org/10.60555/80qf-vj95
- ACME CFI-G: Advanced Combustion via Microgravity Experiments / Cool Flames Investigation with Gases (PSI-159). NASA Physical Sciences Informatics. https://doi.org/10.60555/cyt1-kh64

### NASA documents used for habitat air

- NASA Human Research Program, *Evidence Report: Risk of Hypoxia from the Exploration Atmosphere* (2015).
  https://humanresearchroadmap.nasa.gov/evidence/reports/ExpAtm.pdf (ISS and Shuttle 14.7 psia / 21 % O2, p. 5;
  exploration atmosphere 8.2 psia / 34 % O2, pp. 4 and 29)
- NASA/TP-2010-216134, *Recommendations for Exploration Spacecraft Internal Atmospheres: The Final Report of the
  NASA Exploration Atmospheres Working Group* (2010).
  https://www.nasa.gov/wp-content/uploads/2023/03/henninger-8.2-34-atm-tp216134-2010.pdf (control band
  +-0.2 psia / +-2.0 % O2, p. 11)
- NASA OCHMO-TB-003, *Habitable Atmosphere* technical brief.
  https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-003-habitable-atmosphere.pdf (ISS 14.7 psia / 21 % O2, p. 8)
- NASA, *Spacecraft Fire Safety Demonstration (Saffire)* fact sheet.
  https://www.nasa.gov/wp-content/uploads/2025/07/spacecraft-fire-safety-demonstration-saffire.pdf
- NASA Glenn, *Flame Burns Out on NASA's Long-Running Spacecraft Fire Experiment* (Feb 14, 2024).
  https://www.nasa.gov/centers-and-facilities/glenn/flame-burns-out-on-nasas-long-running-spacecraft-fire-experiment/

### Challenge and event pages

- NASA Space Apps 2026, *Flame in Freefall* challenge (details and resources tabs).
  https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/?tab=details
- NASA Space Apps, *Judging & Awards Guide* and *Participant FAQs*.
  https://www.spaceappschallenge.org/resources/judging-awards-guide/ ,
  https://www.spaceappschallenge.org/resources/participant-faqs/

### Software

- React, TypeScript, Vite, three.js, @react-three/fiber, @react-three/drei, zustand (open source; see
  `web/package.json`). Python 3 standard library for the data pipeline.

## How SI tools were used (data and research part)

Space Apps asks every team to describe how SI tools were used. For the data side:

- **Claude (Anthropic), through Claude Code**, helped write the Python scripts that download NASA's PSI
  records and experiment tables, convert them into one format, check every table for problems, and run the
  "will it go out" counts. Every number in the app comes from NASA's files through those scripts; the raw
  files are kept unchanged in `data/`, and each test keeps the table and row it came from.
- **Gemini (Google)** was used once to search for facts missing from NASA's tables (cabin atmospheres,
  test conditions, papers). Its answers were **not** used directly. We checked them against the sources:
  values were often right but quotes were often reworded, several links did not exist and one citation pointed
  to the wrong paper. Only facts confirmed in a NASA document we opened ourselves are used, and those are cited
  to that document (`gemini_data/VERIFIED.md`).
- No value was invented or estimated. Where NASA's tables are silent the app says "not in the tables".

(Workstream C should add how the AI summaries on the dashboard are produced and reviewed.)

## Key data facts for the summary (as built)

- 1,753 test rows from 12 NASA experiment tables; 1,711 distinct tests
  (42 rows repeat an earlier row exactly: 34 SPICE, 8 CFI).
- NASA's exploration atmosphere for a Moon base (8.2 psia, 34 % O2, +-0.2 psia / +-2 %): 0 tests in PSI's tables.
  The challenge's wider Moon Base range (30 % O2 or more, 10.2 psi or less): 20 tests, all gas flames from ACME CFI-G.
- No solid-material test in the tables goes above 22.2 % O2, and none records its pressure.
- FLEX droplet flames went out less often as oxygen rose: 17 of 17 at 12-14 %, 0 of 9 at 34-36 %.
