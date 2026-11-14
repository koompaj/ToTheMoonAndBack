// OWNER: 3D workstream. Groups the sample spacecraft's objects by the colour they are drawn in, so
// each colour can be shown or hidden on its own.
//
// What a colour means depends on what is chosen:
//   - no place chosen: the fuel type (solid material, liquid, gas);
//   - a place chosen:  how much NASA evidence exists for that fuel in that place's air.
// Neither is a flammability ranking. NASA's tables do not rank these objects by how easily they
// burn, and nothing here should be read that way.
import type { FuelClass } from '../../types/data'
import { TIER_COLOR, TIER_LABEL, type EvidenceTier } from '../../types/layout'
import { FUEL_COLOR } from '../scale'
import { HOLO_BLUE, ITEMS } from './spec'

export interface ItemGroup {
  id: string
  name: string
  color: string
  itemIds: string[]
  /** True for the plain-furniture group, which also covers the duct, lights and other fittings. */
  fittings: boolean
}

export const PLAIN_GROUP = 'plain'

const FUEL_GROUP_NAME: Record<FuelClass, string> = { solid: 'Solid materials', droplet: 'Liquids', gas: 'Gases' }
const FUEL_ORDER: FuelClass[] = ['solid', 'droplet', 'gas']
const TIER_ORDER: EvidenceTier[] = ['tested_here', 'tested_elsewhere', 'not_in_tables']

/** Pass the evidence tier of each fuel item (mark id -> tier) when a place is chosen; omit it otherwise. */
export function groupItems(tiers?: Record<string, EvidenceTier> | null): ItemGroup[] {
  const fuelItems = ITEMS.filter((i) => i.fuel)
  const groups: ItemGroup[] = tiers
    ? TIER_ORDER.map((t) => ({ id: t, name: TIER_LABEL[t], color: TIER_COLOR[t], itemIds: fuelItems.filter((i) => tiers[i.id] === t).map((i) => i.id), fittings: false }))
    : FUEL_ORDER.map((f) => ({ id: f, name: FUEL_GROUP_NAME[f], color: FUEL_COLOR[f], itemIds: fuelItems.filter((i) => i.fuel!.fuel_class === f).map((i) => i.id), fittings: false }))
  groups.push({ id: PLAIN_GROUP, name: 'Furniture and fittings (not a fuel item)', color: HOLO_BLUE, itemIds: ITEMS.filter((i) => !i.fuel).map((i) => i.id), fittings: true })
  return groups.filter((g) => g.itemIds.length > 0 || g.fittings)
}

/** What to hide, given whether furniture is shown at all and which groups are switched off. */
export function hiddenFor(groups: ItemGroup[], furniture: boolean, off: ReadonlySet<string>) {
  const hiddenIds = new Set<string>()
  for (const g of groups) if (!furniture || off.has(g.id)) g.itemIds.forEach((id) => hiddenIds.add(id))
  return { hiddenIds, showFittings: furniture && !off.has(PLAIN_GROUP) }
}
