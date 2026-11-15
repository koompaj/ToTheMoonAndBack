// OWNER: 3D workstream. Draws a layout the user loaded (layoutFile.ts) in the same blue wireframe
// as the sample spacecraft: box rooms, doors (a closed one is a filled panel), the vent duct with
// its grilles, and the objects as labelled boxes.
//
// THE USER'S OWN DRAWING, NOT A NASA DESIGN. Fuel items are coloured by fuel type only: this view
// holds no evidence, and the colour says nothing about how easily anything burns.
import { useMemo } from 'react'
import * as THREE from 'three'
import { Label } from '../Label'
import { FUEL_COLOR } from '../scale'
import { Box, Glow, HOLO, Segs } from './holo'
import { DOOR_HEIGHT, GRILLE_SIZE, type Layout3D, type LayoutDoor, type LayoutRoom } from './layoutFile'

export const LOADED_NOTE = 'Your layout file, not a NASA design'

const PALE = '#dff4ff'

function roomLines(r: LayoutRoom, top: number) {
  const pts: number[] = []
  const corners: [number, number][] = [
    [r.x0, r.z0],
    [r.x1, r.z0],
    [r.x1, r.z1],
    [r.x0, r.z1],
  ]
  corners.forEach(([x, z], k) => {
    const [nx, nz] = corners[(k + 1) % 4]
    pts.push(x, 0.005, z, nx, 0.005, nz, x, top, z, nx, top, nz, x, 0.005, z, x, top, z)
  })
  return pts
}

/** Floor plates: a line every metre, so the size of a room can be read. */
function floorLines(r: LayoutRoom) {
  const pts: number[] = []
  for (let x = Math.ceil(r.x0); x < r.x1; x++) if (x > r.x0) pts.push(x, 0.004, r.z0, x, 0.004, r.z1)
  for (let z = Math.ceil(r.z0); z < r.z1; z++) if (z > r.z0) pts.push(r.x0, 0.004, z, r.x1, 0.004, z)
  return pts
}

/** A point on a door's wall: `s` runs along the wall, `y` is the height. */
const onWall = (d: LayoutDoor, s: number, y: number): [number, number, number] => (d.axis === 'x' ? [d.wall, y, s] : [s, y, d.wall])

function Door({ door, showLabel }: { door: LayoutDoor; showLabel: boolean }) {
  const frame = useMemo(() => [...onWall(door, door.lo, 0), ...onWall(door, door.lo, DOOR_HEIGHT), ...onWall(door, door.lo, DOOR_HEIGHT), ...onWall(door, door.hi, DOOR_HEIGHT), ...onWall(door, door.hi, DOOR_HEIGHT), ...onWall(door, door.hi, 0)], [door])
  const bars = useMemo(() => [0.4, 0.8, 1.2, 1.6].flatMap((y) => [...onWall(door, door.lo, y), ...onWall(door, door.hi, y)]), [door])
  const panel = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute([...onWall(door, door.lo, 0), ...onWall(door, door.hi, 0), ...onWall(door, door.hi, DOOR_HEIGHT), ...onWall(door, door.lo, 0), ...onWall(door, door.hi, DOOR_HEIGHT), ...onWall(door, door.lo, DOOR_HEIGHT)], 3))
    return g
  }, [door])
  const [lx, , lz] = onWall(door, (door.lo + door.hi) / 2, 0)
  if (door.open) return <Segs points={frame} opacity={0.95} />
  return (
    <group>
      <Glow geo={panel} color={PALE} opacity={0.28} />
      <Segs points={frame} color={PALE} opacity={1} />
      <Segs points={bars} color={PALE} opacity={0.8} />
      {showLabel && <Label text="Closed door" position={[lx, DOOR_HEIGHT + 0.3, lz]} color={PALE} height={0.3} />}
    </group>
  )
}

function Duct({ layout, showLabel }: { layout: Layout3D; showLabel: boolean }) {
  const duct = layout.duct!
  const y = layout.ceiling + duct.height / 2
  const [fx, fz] = duct.path[0]
  return (
    <group>
      {duct.path.slice(1).map(([x, z], k) => {
        const [px, pz] = duct.path[k]
        // each piece runs on by half the duct's width at both ends, so corners close up
        const alongX = Math.abs(x - px) > Math.abs(z - pz)
        const length = Math.abs(alongX ? x - px : z - pz) + duct.halfWidth * 2
        return <Box key={k} size={alongX ? [length, duct.height, duct.halfWidth * 2] : [duct.halfWidth * 2, duct.height, length]} position={[(x + px) / 2, y, (z + pz) / 2]} line={0.75} fill={0.05} />
      })}
      {duct.grilles.map((g, k) => (
        <Box key={k} size={[GRILLE_SIZE, 0.04, GRILLE_SIZE]} position={[g.x, layout.ceiling, g.z]} color={PALE} line={0.95} fill={0.25} />
      ))}
      {showLabel && <Label text="Vent duct" position={[fx, layout.ceiling + duct.height + 0.35, fz]} color="#9fdcff" height={0.3} />}
    </group>
  )
}

export function LayoutModel({ layout, showLabels, hiddenIds, showDuct }: { layout: Layout3D; showLabels: boolean; hiddenIds: ReadonlySet<string>; showDuct: boolean }) {
  const walls = useMemo(() => layout.rooms.flatMap((r) => roomLines(r, layout.ceiling)), [layout])
  const plates = useMemo(() => layout.rooms.flatMap(floorLines), [layout])
  const floors = useMemo(
    () => layout.rooms.map((r) => new THREE.PlaneGeometry(r.x1 - r.x0, r.z1 - r.z0).rotateX(-Math.PI / 2).translate((r.x0 + r.x1) / 2, 0, (r.z0 + r.z1) / 2)),
    [layout],
  )
  return (
    <group>
      {floors.map((geo, k) => (
        <Glow key={k} geo={geo} opacity={0.09} />
      ))}
      <Segs points={plates} opacity={0.18} />
      <Segs points={walls} opacity={0.5} />
      {layout.doors.map((door, k) => (
        <Door key={k} door={door} showLabel={showLabels} />
      ))}
      {showDuct && layout.duct && <Duct layout={layout} showLabel={showLabels} />}
      {layout.items
        .filter((item) => !hiddenIds.has(item.id))
        .map((item) => {
          const color = item.fuel ? FUEL_COLOR[item.fuel.fuel_class] : HOLO
          const base = item.y ?? 0
          return (
            <group key={item.id} position={[item.x, base, item.z]}>
              <Box size={[item.w, item.h, item.d]} position={[0, item.h / 2, 0]} color={color} line={item.fuel ? 0.9 : 0.5} fill={item.fuel ? 0.14 : 0.04} />
              {showLabels && item.fuel && <Label text={item.label} position={[0, item.h + 0.35, 0]} color={color} height={0.27} />}
            </group>
          )
        })}
      {showLabels && layout.rooms.map((r) => <Label key={r.id} text={r.name} position={[(r.x0 + r.x1) / 2, 0.05, r.z1 - 0.35]} color="#9fdcff" height={0.32} />)}
      <Label text={LOADED_NOTE} position={[0, -1.4, layout.size[1] / 2 + 1.2]} color="#7fa8c4" height={0.3} />
    </group>
  )
}
