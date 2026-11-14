// OWNER: 3D workstream. Maps data values to positions in the 3D scene.
// Axes:  x = oxygen fraction,  y = pressure (log scale),  z = fuel-class layer.
import type { FuelClass } from '../types/data'

export const X_SIZE = 10
export const Y_SIZE = 6
export const LAYER_GAP = 3

/** Pressure axis domain in atm. Log scale so the low-pressure habitat region is not squashed
 *  (the tables run from about 0.42 to 5 atm). */
export const P_MIN = 0.25
export const P_MAX = 6

export const LAYERS: FuelClass[] = ['solid', 'droplet', 'gas']

export const FUEL_COLOR: Record<FuelClass, string> = {
  solid: '#ff8a3d',
  droplet: '#4fc3f7',
  gas: '#b388ff',
}

export const xOf = (o2Fraction: number) => o2Fraction * X_SIZE

export function yOf(pressureAtm: number) {
  const p = Math.min(Math.max(pressureAtm, P_MIN), P_MAX)
  return ((Math.log2(p) - Math.log2(P_MIN)) / (Math.log2(P_MAX) - Math.log2(P_MIN))) * Y_SIZE
}

export const zOf = (fuelClass: FuelClass) => LAYERS.indexOf(fuelClass) * LAYER_GAP
