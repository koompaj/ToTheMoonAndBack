# 3D layout files for the Simulation stage

A layout file is a drawing of your own that you can load into the 3D view on the Simulation tab:
choose a place, then under "Your Own Floor Plan" pick "Your Floor Plan" and choose the `.json`
file in the same box that takes a picture. Double-click a floor to place the fire and press
"Simulate".

**It is your drawing, not a NASA design, and it holds no NASA data.** The only link to NASA's
tables is the name of each fuel, which must be one the tables cover. The view uses the file for
the illustrated spread only. The spread is a drawing, not a prediction (`CLAUDE.md`, "Spread is
an illustration, never a result"). The page does not know what is in a loaded layout: its
items are coloured by fuel type, not by evidence, and the cards describe only the fuel chosen in
"What Is Burning?". The file is read in your browser and is not sent anywhere.

`l-shaped-habitat.layout.json` is a sample: three rooms in an L, one closed door, and a vent duct
that is the only way into the closed room.

`made-up-floor-plan.png` is a made-up picture of a floor plan (three rooms, two doorways, four
labelled objects, two dimensions) for trying "Draw this plan in 3D with AI" in the same upload
box. It is not a real place and not a NASA design.

## Format

JSON. Lengths are in metres; `x` runs left to right and `z` front to back on the plan.

| Field | Meaning |
|---|---|
| `format` | Must be `"flame-in-freefall-layout"`. |
| `name` | Shown in the view. |
| `ceiling` | Height of every room (1.8 to 5; 2.4 if left out). |
| `rooms` | Boxes on the floor: `id`, `name`, `x0`, `x1`, `z0`, `z1`. They may touch but not overlap. At most 12. |
| `doors` | `between` (two room ids that share a wall), `at` (the middle of the door along that wall), `width`, `open` (`true` or `false`). |
| `duct` | One vent duct above the ceiling: `path` (points `[x, z]` joined by straight pieces along x or z), `grilles` (points `[x, z]` under the duct, each inside a room), `width`, `height`. |
| `air` | `direction` as `[x, z]`, used by the airflow setting, and `toward` (words for it). |
| `items` | `id`, `label`, centre `x`, `z`, size `w` (along x), `d` (along z), `h` (height), optional `y` (height above the floor) and optional `fuel`. |

`fuel` must be one of the ids in `web/public/data/fuels.json`, for example `solid:pmma`,
`solid:nomex`, `solid:silicone`, `droplet:methanol`, `droplet:heptane`, `gas:butane`,
`gas:propane`. Leave it out for an object that is not a fuel. A fuel that is not in the list is
refused, never matched to a near one.

## What the view does with it

- A wall stops the drawing. An open door lets it through. A closed door does not.
- The duct joins the rooms its grilles open into. It is the only way into a room whose doors are
  all closed, so every room needs an open door or a grille.
- That a closed door stops the drawing and a duct carries it is our choice for the drawing, not
  a finding.

A file with a problem is refused whole, with each problem listed. Nothing is guessed or repaired.
