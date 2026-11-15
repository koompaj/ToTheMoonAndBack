# Workstream B - 3D map and flame

You own what people see first. Read `CLAUDE.md` first.

**New (2026-11-14): the habitat evidence map.** Your part is `docs/LAYOUT_PLAN.md` section 7, workstream B:
`web/src/scene/LayoutCanvas.tsx`. It comes after `FireModel3D` from `docs/PLAN.md`, which it reuses.

## You own

`web/src/scene/` only.

## Where things stand

- The two baseline stubs, `HabitatMap3D.tsx` (every test as a point, each habitat as a box) and
  `Flame3D.tsx` (a sphere stretched by gravity), were removed on 2026-11-15: nothing imported
  them. They are in git history. What B built instead is in `docs/roles/B-plan.md`.
- `scale.ts` holds the fuel-type colours. The all-tests map's axis scales went with its stub.
- `Label.tsx` draws text as a canvas sprite. Use it for all in-scene text: drei's `<Html>` logs React
  errors under React 19, and drei's `<Text>` fetches a font from the network.

Built with three.js through `@react-three/fiber` and `@react-three/drei`.

## Tasks, in priority order

1. **Make the map readable.** Axis ticks and labels with real units (oxygen %, pressure in psi and
   atm), layer labels, a legend for fuel-class colours, sensible default camera.
2. **Interaction.** Hover shows the test (investigation, fuel, oxygen, pressure, outcome). Click
   selects it through the store (`selectTest`). Clicking a habitat box calls `selectHabitat`.
   Highlight the tests inside the selected box.
3. **Show the gap.** The Moon Base box passing through an empty solid layer is the headline. Make
   that emptiness visible and unmistakable, without implying "never tested" (see rules of evidence).
4. **2D view.** Required. When `view === '2d'` in the store, show a flat oxygen-against-pressure
   chart of the same data. Exact values must be readable there.
5. **Inverse flames.** They appear only when `showBurnerOxidizer` is on, visibly different from
   cabin-air tests, with a label saying their oxygen is burner gas.
6. **Flame.** Make it look like a flame (teardrop on Earth, blue sphere in microgravity). Keep the
   "Illustration, not a simulation" label on screen at all times.
7. **Performance and projector check.** Smooth on a laptop; legible on a projector.

## Rules for you

- Read data only through props and `web/src/types/data.ts`. Do not reshape or "fix" data in the
  scene; if a value looks wrong, tell workstream A.
- Talk to the panels only through `web/src/state/store.ts`. Do not import from `web/src/panels/`.
- Tests with `pressure_atm === null` cannot be placed. Do not assign them a position; workstream A
  is sourcing the missing pressure.
- Need a new field in the store or a new library? Both are shared files: agree it first.
- Do not load fonts or assets from the network at runtime; the demo may be offline.

## Done means

A judge can look at the map for ten seconds and see where NASA has data, where the Moon Base sits,
and that the solid layer there is empty.
