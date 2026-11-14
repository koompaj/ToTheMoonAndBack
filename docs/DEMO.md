# Two-minute demo script

Owner: workstream C. Every number is computed live from NASA's tables; if the data changes, read
the numbers off the screen, not this page. The flow follows `docs/PLAN.md`.

## 0:00 - Step 1, Home: the wide picture

> "NASA has run 1,753 microgravity fire tests. We placed every one by the oxygen and pressure it ran
> at, against the air in each place crews will live."

Point at the place cards (Moon Base 20 tests, spacesuit 0, Earth 34; ISS and Mars waiting for a
NASA source), then the oxygen chart: the gold Moon Base band has almost no tests, and none solid.
"0 of 263 solid tests can even be placed: their tables have no pressure."

## 0:25 - Step 2, the Moon Base

Click **Moon Base & Rovers**.

> "20 tests ran in Moon Base air, all gas flames from one experiment. No fabric, no plastic, no fuel
> droplet. The closest droplet test missed the box by 0.1 psi; the closest solid test is 7.8 points
> of oxygen short."

## 0:50 - Step 3, a fire in the Moon Base

Click **Fuel droplets**. Move the oxygen slider up and down.

> "This is an illustration, not a simulation. What the fire would do comes from the 5 nearest real
> NASA tests, each one cited. Below, the three fire-safety tasks: how to detect it, how to stop it,
> how to prevent it, from NASA's own data. FLEX added carbon dioxide in 123 droplet tests and 88
> went out. Coral lines are the gaps: not in the tables."

Switch to **Solid**: the prevention card says the Moon Base point is above every solid test.

## 1:25 - Step 4, pick where the fire starts

Scroll to the map. Click a point (or move the sliders): the behaviour and the tasks update.

> "Pick any point in Moon Base air and see which real tests are nearest and what they did."

## 1:45 - Risk and close

Open **Risk** for ten seconds: the place-by-fuel grid is mostly coral ("not tested"), and the six
biggest gaps are listed in plain words. Tap the Earth button for the spinoffs if time allows.

> "Pick a place, then a fuel, and see what NASA knows about that fire, what it doesn't, and how to
> detect, stop and prevent it, with a source for every number."

## Before presenting

- `cd web && npm run build && npm run preview`, then open the preview URL (works offline).
- Projector: browser zoom 110 to 125 %.
- If AI suggestions were generated (`cd ai && npm run generate`), check they are reviewed, or say
  they are drafts.
