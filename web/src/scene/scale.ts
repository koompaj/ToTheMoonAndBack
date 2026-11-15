// OWNER: 3D workstream. The colour each fuel type is drawn in across the 3D scenes.
// A fuel-type colour says what kind of fuel an object is. It is not an evidence colour and says
// nothing about how easily anything burns.
//
// This file used to hold the axis scales of the all-tests map (x = oxygen, y = pressure on a log
// scale, z = fuel layer). They went with that map's stub, HabitatMap3D.tsx; both are in git
// history if the map is wanted again.
import type { FuelClass } from '../types/data'

export const FUEL_COLOR: Record<FuelClass, string> = {
  solid: '#ff8a3d',
  droplet: '#4fc3f7',
  gas: '#b388ff',
}
