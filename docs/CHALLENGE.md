# The challenge: Flame in Freefall

Notes taken from the challenge's Details and Resources tabs. Check the live page for changes:
https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/?tab=details

## The task

Build an interactive, web-based dashboard powered by "super intelligence" (SI) that summarizes, ranks
and interprets the combustion investigations in NASA's PSI database to deliver fire-safety insights
for human space exploration. Difficulty: Advanced / Intermediate. Subject: Space Exploration.

Suggested (not required) abilities:

- Identify investigations most relevant to habitable crew environments: spacecraft, space stations,
  lunar and Martian surface bases, pressurized rovers.
- Extract data that supports predictive modeling of flammability and fire scenarios.
- Highlight research that informs next-generation fire-safety controls and equipment.
- Optionally, applications to fire safety on Earth.

Out of scope: fire safety of rockets and propellants.

Audience: professors, graduate and undergraduate students, aerospace researchers and engineers.

## Background the page gives

- Without buoyancy, a microgravity flame relies on diffusion for oxygen; a candle flame becomes a blue
  sphere. Airflow matters a great deal.
- NASA's fire-safety work is organised as **prevention, detection, suppression**.
  - Prevention (material flammability): BASS, BASS-II, Saffire-I/II/III.
  - Detection: SAME, SAME-R.
  - Suppression: FLEX (dilution with carbon dioxide and helium).
- Spacesuits: 100 % oxygen at 4.3 psi. Earth sea level: 14.7 psi.
- Moon Base and pressurized rovers: expected between spacesuit and Earth values; oxygen likely 30 %
  or greater with pressure 10.2 psi or less.
- Highest oxygen in microgravity tests: ACME CFI-G, up to 85 % oxygen flowing from the burner into a
  nitrogen and fuel atmosphere (an inside-out flame).
- No partial-gravity data is in PSI yet (LUCI and FM2 may add some). ACME E-FIELD Flames mimicked
  partial gravity with electric fields. Microgravity and normal-gravity results could bound it.

## Things to summarize, per the page

Experimental objectives; fuels (shape and size of samples or burners); test conditions (oxygen,
airflow); what varied between tests of one investigation; sensors and measurements; similarities and
differences between investigations.

## Hardware groupings

- ACME (six gaseous-fuel experiments, including BRE, CFI-G, E-FIELD Flames): Combustion Integrated
  Rack (CIR).
- FLEX, FLEX-2, CFI (liquid droplets): Multi-user Droplet Combustion Apparatus (MDCA) in the CIR.
- BASS, BASS-II, SPICE, SLICE (solid and gaseous fuels): Microgravity Science Glovebox (MSG) with the
  SPICE flow duct.
- SAME / SAME-R smoke instrument was reused for dust in DAFT / DAFT-2.
- ACME BRE burned gas but studied material flammability in still atmospheres.

## Resources tab

- PSI Data Repository, Combustion Science: https://psi.nasa.gov/physci/repo/search?q=combustion
- NASA Combustion Science: https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/
- ScienceCasts video (2018): https://www.youtube.com/watch?v=W1oXykoz9zg
- A Researcher's Guide to ISS Combustion Science (2015): https://www.nasa.gov/missions/station/a-researchers-guide-to-combustion-science/
- Apollo 1: https://sma.nasa.gov/sma-disciplines/accllp/apollo-1
- Apollo 13: https://sma.nasa.gov/sma-disciplines/accllp/apollo-13
- Fire aboard Mir: https://www.nasa.gov/history/25-years-ago-fire-aboard-space-station-mir/
- Spinoffs: https://spinoff.nasa.gov/node/9582 (air tanks), https://spinoff.nasa.gov/node/9407 (fire
  detector), https://spinoff.nasa.gov/node/9918 (fire attire)

None of these linked pages has been downloaded or read yet.

## PSI access notes

The PSI site is backed by an unauthenticated JSON API that its own pages call. It is undocumented and
may change. `scripts/fetch_psi.py` uses it. PSI asks users to cite each investigation's DOI.
