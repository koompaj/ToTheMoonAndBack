// OWNER: 3D workstream. The sample spacecraft, assembled from spec.ts: hull, deck, furniture and
// fuel items, in blue wireframe. Goes inside a react-three-fiber <Canvas>.
//
// EXAMPLE LAYOUT, NOT A NASA DESIGN. This component draws; it holds no evidence. The colour of a
// fuel item comes from `markColors` (how much NASA evidence exists for that fuel in the chosen
// air, worked out elsewhere). Without it a fuel item is drawn in its fuel-type colour.
import type { ThreeEvent } from '@react-three/fiber'
import { Label } from '../Label'
import { FUEL_COLOR } from '../scale'
import { useReducedMotion } from '../fire/state'
import { Hull } from './Hull'
import { HOLO } from './holo'
import { Part, Systems, type PartLook } from './parts'
import { ITEMS, SAMPLE_NOTE, ZONES, deckHalfWidth, type CabinItem } from './spec'

export interface SpacecraftProps {
  /** Mark id -> colour. Fuel items only; furniture is always the base blue. */
  markColors?: Record<string, string>
  selectedMarkId?: string | null
  /** Names of the zones and the fuel items. */
  showLabels?: boolean
  /** Solar wings and antenna, for the view from outside. */
  exterior?: boolean
  /** Ids of objects not to draw (see groups.ts). The hull and deck are always drawn. */
  hiddenIds?: ReadonlySet<string>
  /** Duct, fan, lights, detectors, extinguisher and handrails. */
  showFittings?: boolean
  onPickMark?: (id: string) => void
}

const FURNITURE: PartLook = { color: HOLO, line: 0.5, fill: 0.04 }

/** Small items sit close together, so every second one carries its name a little higher. */
const LABEL_LIFT: Record<string, number> = Object.fromEntries(
  ITEMS.filter((i) => i.fuel && i.fuel.fuel_class !== 'solid').map((i, k) => [i.id, (k % 2) * 0.34]),
)

function Item({ item, color, selected, showLabel, labelLift, onPick }: { item: CabinItem; color: string | undefined; selected: boolean; showLabel: boolean; labelLift: number; onPick?: (id: string) => void }) {
  const look: PartLook = item.fuel ? { color: color ?? FUEL_COLOR[item.fuel.fuel_class], line: selected ? 1 : 0.9, fill: selected ? 0.3 : 0.12 } : FURNITURE
  const base = item.y ?? 0
  const pickable = !!item.fuel && !!onPick
  return (
    <group position={[item.x, base, item.z]}>
      <Part item={item} look={look} />
      {pickable && (
        // an unseen box over the item, so thin wireframe is still easy to click
        <mesh
          position={[0, item.h / 2, 0]}
          onClick={(e: ThreeEvent<MouseEvent>) => {
            if (e.delta > 6) return // a drag to rotate, not a click
            e.stopPropagation()
            onPick!(item.id)
          }}
        >
          <boxGeometry args={[Math.max(item.w, 0.4), item.h + (item.fuel!.fuel_class === 'solid' ? 0 : 0.8), Math.max(item.d, 0.4)]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
      {showLabel && item.fuel && <Label text={item.label} position={[0, item.h + (item.fuel.fuel_class === 'solid' ? 0.3 : 1.0) + labelLift, 0]} color={look.color} height={0.27} />}
    </group>
  )
}

export function Spacecraft({ markColors, selectedMarkId = null, showLabels = true, exterior = false, hiddenIds, showFittings = true, onPickMark }: SpacecraftProps) {
  const still = useReducedMotion()
  return (
    <group>
      <Hull exterior={exterior} />
      {showFittings && <Systems still={still} />}
      {ITEMS.filter((item) => !hiddenIds?.has(item.id)).map((item) => (
        <Item key={item.id} item={item} color={markColors?.[item.id]} selected={item.id === selectedMarkId} showLabel={showLabels} labelLift={LABEL_LIFT[item.id] ?? 0} onPick={onPickMark} />
      ))}
      {showLabels &&
        ZONES.map((z) => {
          const x = (z.x0 + z.x1) / 2
          return <Label key={z.id} text={z.name} position={[x, 0.02, deckHalfWidth(x) + 0.75]} color="#9fdcff" height={0.34} />
        })}
      <Label text={SAMPLE_NOTE} position={[0, -1.9, 3.2]} color="#7fa8c4" height={0.3} />
    </group>
  )
}
