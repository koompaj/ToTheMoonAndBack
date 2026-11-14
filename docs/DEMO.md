# Two-minute demo script

Owner: workstream C. Every number is computed live from NASA's tables; if the data changes, read
the numbers off the screen, not this page. The flow follows `docs/PLAN.md`. Say "not in PSI's
tables", never "never tested": NASA ran more (for example Saffire-IV to VI) than PSI holds.

## 0:00 - Step 1, Home: the wide picture

> "PSI holds 1,719 distinct NASA microgravity combustion tests. We placed each one by the oxygen
> and pressure it ran at, against the air in each place crews will live."

Point at the place cards: Moon Base (challenge box) 20 tests, Moon Base in NASA's own exploration
air 0, ISS 171, spacesuit 0, Earth 171 (ISS and Earth use NASA's +-2 % / +-0.2 psi control band).
Each card says whether its gravity matches: only the ISS does; every PSI test ran in microgravity,
and partial-gravity data may come later (LUCI, FM2). Then the oxygen chart: the gold Moon Base band
has almost no tests, and none solid. "Only 29 of 263 solid tests can be placed, using the pressure
in NASA's BASS-II report; the other solid tables have no pressure."

## 0:25 - Step 2, the Moon Base

Click **Moon Base & Rovers (Challenge)**.

> "20 tests in PSI's tables ran in this air, all gas flames from one experiment. No fabric, plastic
> or fuel-droplet test in the tables. The closest droplet test missed the box by 0.1 psi; the
> closest solid test is 7.8 points of oxygen short. In NASA's own Moon Base air box, the tables
> hold no tests at all."

## 0:50 - Step 3, a fire in the Moon Base

Click **Fuel droplets**. Move the oxygen slider up and down.

> "This flame is an illustration, not a simulation. What the fire would do comes from the 5 nearest
> real NASA tests, each one cited. Below, the three fire-safety tasks from NASA's own data. FLEX
> added carbon dioxide in 123 droplet tests and 88 went out, 72 %. But 58 of 101 tests with nothing
> added also went out, 57 %, so the gas is not the only reason: the app shows both numbers. Coral
> lines are gaps: not in PSI's tables."

Switch to **Solid**: the prevention card says the Moon Base point is above every solid test in the
tables.

## 1:25 - Step 4, pick where the fire starts

Scroll to the evidence map. Click a point (or move the sliders): the behaviour and the tasks update.

> "Pick any point in Moon Base air and see which real tests are nearest and what they did."

## 1:45 - Risk and close

Open **Risk** for ten seconds: the place-by-fuel grid is mostly coral ("not in PSI's tables"), and
the six biggest gaps are listed in plain words. Tap the Earth tab for the spinoffs if time allows.

> "Pick a place, then a fuel, and see what NASA's tables show about that fire, what they don't, and
> how to detect, stop and prevent it, with a source for every number."

## Before presenting

- `cd web && npm run build && npm run preview`, then open the preview URL (works offline).
- Projector: browser zoom 110 to 125 %.
- If AI suggestions were generated (`cd ai && npm run generate`), check they are reviewed, or say
  they are drafts.
