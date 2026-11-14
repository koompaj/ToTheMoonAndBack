// OWNER: 3D workstream.
// BASELINE STUB - an ILLUSTRATION of flame shape, not a simulation and not data.
// gravity 0 = microgravity (blue sphere), 1 = Earth (tall yellow teardrop).
// Keep the "Illustration" label visible in the UI whenever this is shown.
import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function FlameMesh({ gravity }: { gravity: number }) {
  const ref = useRef<THREE.Mesh>(null)
  const colour = new THREE.Color('#4f8dff').lerp(new THREE.Color('#ffc247'), gravity)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const flicker = 1 + Math.sin(clock.elapsedTime * 9) * 0.04 * gravity
    ref.current.scale.set(1 - 0.25 * gravity, (1 + 1.6 * gravity) * flicker, 1 - 0.25 * gravity)
  })
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.8, 32, 32]} />
      <meshBasicMaterial color={colour} transparent opacity={0.85} />
    </mesh>
  )
}

export function Flame3D({ gravity }: { gravity: number }) {
  return (
    <div className="flame">
      <Canvas camera={{ position: [0, 0.6, 5], fov: 40 }}>
        <color attach="background" args={['#0b0f17']} />
        <FlameMesh gravity={gravity} />
      </Canvas>
      <div className="flame-label">Illustration, not a simulation</div>
    </div>
  )
}
