// OWNER: 3D workstream.
// BASELINE STUB - plots every real test that has both oxygen and pressure, and draws the
// habitat boxes. Replace/extend freely: hover + click-to-select, axis ticks, 2D view, polish.
import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { AppData, Habitat } from '../types/data'
import { useApp } from '../state/store'
import { Label } from './Label'
import { FUEL_COLOR, LAYERS, LAYER_GAP, X_SIZE, Y_SIZE, xOf, yOf, zOf } from './scale'

const Z_SPAN = (LAYERS.length - 1) * LAYER_GAP
const MIN_BOX = 0.12 // so a single-point habitat (e.g. spacesuit) is still visible

function HabitatBox({ h, selected, onSelect }: { h: Habitat; selected: boolean; onSelect: () => void }) {
  const x0 = xOf(h.o2_fraction[0])
  const x1 = xOf(h.o2_fraction[1])
  const y0 = yOf(h.pressure_atm[0])
  const y1 = yOf(h.pressure_atm[1])
  const size: [number, number, number] = [Math.max(x1 - x0, MIN_BOX), Math.max(y1 - y0, MIN_BOX), Z_SPAN + 1]
  const centre: [number, number, number] = [(x0 + x1) / 2, (y0 + y1) / 2, Z_SPAN / 2]
  return (
    <group position={centre}>
      <mesh onClick={(e) => (e.stopPropagation(), onSelect())}>
        <boxGeometry args={size} />
        <meshBasicMaterial color={selected ? '#ffd54f' : '#90a4ae'} transparent opacity={selected ? 0.22 : 0.08} depthWrite={false} />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(...size)]} />
        <lineBasicMaterial color={selected ? '#ffd54f' : '#607d8b'} />
      </lineSegments>
      <Label text={h.name} position={[0, size[1] / 2 + 0.3, 0]} color={selected ? '#ffd54f' : '#8b9bb0'} />
    </group>
  )
}

export function HabitatMap3D({ data }: { data: AppData }) {
  const { selectedHabitatId, selectHabitat, showBurnerOxidizer } = useApp()

  const { positions, colors, plotted } = useMemo(() => {
    const pts = data.tests.filter(
      (t) => t.o2_fraction !== null && t.pressure_atm !== null && (showBurnerOxidizer || t.o2_basis === 'ambient'),
    )
    const positions = new Float32Array(pts.length * 3)
    const colors = new Float32Array(pts.length * 3)
    const c = new THREE.Color()
    pts.forEach((t, i) => {
      positions.set([xOf(t.o2_fraction!), yOf(t.pressure_atm!), zOf(t.fuel_class)], i * 3)
      c.set(FUEL_COLOR[t.fuel_class])
      if (t.o2_basis === 'burner_oxidizer') c.multiplyScalar(0.45)
      colors.set([c.r, c.g, c.b], i * 3)
    })
    return { positions, colors, plotted: pts.length }
  }, [data.tests, showBurnerOxidizer])

  return (
    <div className="scene">
      <Canvas camera={{ position: [9, 5, 13], fov: 45 }}>
        <color attach="background" args={['#0b0f17']} />
        <group position={[-X_SIZE / 2, -Y_SIZE / 2, -Z_SPAN / 2]}>
          {/* key forces a fresh geometry when the number of points changes */}
          <points key={plotted}>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[positions, 3]} />
              <bufferAttribute attach="attributes-color" args={[colors, 3]} />
            </bufferGeometry>
            <pointsMaterial size={0.2} vertexColors sizeAttenuation />
          </points>

          {data.habitats.map((h) => (
            <HabitatBox key={h.id} h={h} selected={h.id === selectedHabitatId} onSelect={() => selectHabitat(h.id)} />
          ))}

          {LAYERS.map((layer) => (
            <group key={layer} position={[0, 0, zOf(layer)]}>
              <lineSegments>
                <edgesGeometry args={[new THREE.PlaneGeometry(X_SIZE, Y_SIZE).translate(X_SIZE / 2, Y_SIZE / 2, 0)]} />
                <lineBasicMaterial color="#263238" />
              </lineSegments>
              <Label text={layer} position={[X_SIZE + 1, 0, 0]} color={FUEL_COLOR[layer]} />
            </group>
          ))}

          <Label text="oxygen 0 - 100 %" position={[X_SIZE / 2, -0.7, Z_SPAN]} />
          <Label text="pressure (log scale)" position={[-1.9, Y_SIZE / 2, Z_SPAN]} />
        </group>
        <OrbitControls enablePan={false} />
      </Canvas>
      <div className="scene-note">{plotted} tests plotted</div>
    </div>
  )
}
