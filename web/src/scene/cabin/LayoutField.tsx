// OWNER: 3D workstream. The coloured cloud for a layout the user loaded. The same picture as the
// sample spacecraft's cloud (ReachField.tsx), drawn the same way, but "how far along the way" is
// read from the table of distances worked out for the loaded layout (layoutGrid.ts) instead of
// from the spacecraft's shape.
//
// IT LOOKS LIKE THE OUTPUT OF A FIRE MODEL. IT IS NOT ONE. The colour is only "how far the drawing
// has reached": red at the start, blue at the edge. It is not temperature, smoke, air speed or
// anything measured, and it has no scale. It stays inside the rooms, passes only open doors, and
// reaches a closed room only along the vent duct. See CLAUDE.md, "Spread is an illustration,
// never a result".
import { useEffect, useMemo, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { SpreadClock } from './CabinFire'
import { VERT, makeNoise } from './ReachField'
import { SOLID, type DistanceField, type LayoutGrid } from './layoutGrid'
import { MIN_FACTOR, reachAt, smallestFactor, type SpreadBias, type SpreadPlan } from './timeline'

const STEPS = 48
/** Written where there is no way: larger than any distance in a layout we accept. */
const NO_WAY = 500

const FRAG = /* glsl */ `
  precision highp sampler3D;
  uniform sampler3D uNoise;
  uniform sampler3D uField; // r: distance from the fire along the way; g: 1 inside a room or the duct
  uniform vec3 uStart;
  uniform float uReach;
  uniform float uTime;
  uniform vec2 uBias;  // the user's spread settings: nearer downstream (x), nearer above (y)
  uniform vec3 uAir;   // which way the air moves in this layout
  uniform float uSpan;
  uniform vec3 uMin;
  uniform vec3 uMax;
  varying vec3 vWorld;

  // 0 = the edge of reach (blue) .. 1 = where the fire starts (red). Same colours as ReachField.
  vec3 ramp(float h) {
    vec3 c0 = vec3(0.10, 0.22, 1.00), c1 = vec3(0.00, 0.80, 1.00), c2 = vec3(0.15, 0.90, 0.30);
    vec3 c3 = vec3(1.00, 0.90, 0.10), c4 = vec3(1.00, 0.20, 0.05);
    float x = clamp(h, 0.0, 1.0) * 4.0;
    if (x < 1.0) return mix(c0, c1, x);
    if (x < 2.0) return mix(c1, c2, x - 1.0);
    if (x < 3.0) return mix(c2, c3, x - 2.0);
    return mix(c3, c4, x - 3.0);
  }
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  void main() {
    vec3 ro = cameraPosition;
    vec3 rd = normalize(vWorld - cameraPosition);
    vec3 inv = 1.0 / rd;
    vec3 a = (uMin - ro) * inv, b = (uMax - ro) * inv;
    vec3 lo = min(a, b), hi = max(a, b);
    float t0 = max(max(max(lo.x, lo.y), lo.z), 0.0);
    float t1 = min(min(hi.x, hi.y), hi.z);
    // no way is shorter than the straight line, so nothing outside this ball can have been reached
    vec3 oc = ro - uStart;
    float R = uReach * uSpan + 0.7;
    float bq = dot(oc, rd);
    float disc = bq * bq - (dot(oc, oc) - R * R);
    if (disc <= 0.0) discard;
    float sq = sqrt(disc);
    t0 = max(t0, -bq - sq);
    t1 = min(t1, -bq + sq);
    if (t1 <= t0) discard;

    float dt = (t1 - t0) / float(${STEPS});
    float t = t0 + dt * hash(gl_FragCoord.xy);
    vec3 drift = vec3(uTime * 0.012, -uTime * 0.009, uTime * 0.007);
    vec3 col = vec3(0.0);
    float alpha = 0.0;
    for (int i = 0; i < ${STEPS}; i++) {
      vec3 p = ro + rd * t;
      t += dt;
      vec2 cell = texture(uField, (p - uMin) / (uMax - uMin)).rg;
      if (cell.g < 0.5) continue; // inside a wall, or outside
      float d = cell.r;
      // the same lean as the order (timeline.ts, biasFactor): 1 when no setting is in use
      vec3 away = p - uStart;
      float len = length(away);
      if (len > 1.0e-4) d *= max(${MIN_FACTOR.toFixed(4)}, 1.0 - uBias.x * dot(uAir, away) / len - uBias.y * away.y / len);
      // decoration only: a ragged, slowly drifting edge and a mottled inside
      float n = texture(uNoise, p * 0.11 + drift).r;
      float m = texture(uNoise, p * 0.29 - drift * 1.7).r;
      float h = 1.0 - (d + (n - 0.5) * 1.3 * smoothstep(0.0, 1.2, d)) / max(uReach, 0.001);
      if (h <= 0.0) continue;
      float a1 = smoothstep(0.0, 0.1, h) * (0.2 + 1.0 * h) * dt;
      vec3 c = ramp(pow(clamp(h * (0.8 + 0.45 * m), 0.0, 1.0), 0.65));
      col += (1.0 - alpha) * c * a1;
      alpha += (1.0 - alpha) * a1;
      if (alpha > 0.96) break;
    }
    if (alpha < 0.004) discard;
    gl_FragColor = vec4(col / alpha, alpha * 0.9);
  }
`

/** The table of distances as a block the graphics card can read smoothly. A cell of wall next to
 *  an open cell is given that cell's distance, so the cloud does not thin out along the walls. */
function fieldTexture(g: LayoutGrid, field: DistanceField) {
  const { nx, ny, nz, kind, cell } = g
  const data = new Uint16Array(nx * ny * nz * 2)
  const half = THREE.DataUtils.toHalfFloat
  const one = half(1)
  const steps = [1, -1, nx, -nx, nx * ny, -nx * ny]
  for (let c = 0; c < kind.length; c++) {
    let d = NO_WAY
    if (kind[c] !== SOLID) {
      d = Math.min(NO_WAY, field.dist[c])
      data[c * 2 + 1] = one
    } else {
      const i = c % nx
      const j = Math.floor(c / nx) % ny
      const k = Math.floor(c / (nx * ny))
      const ok = [i + 1 < nx, i > 0, j + 1 < ny, j > 0, k + 1 < nz, k > 0]
      steps.forEach((s, q) => {
        if (ok[q] && kind[c + s] !== SOLID) d = Math.min(d, field.dist[c + s] + cell)
      })
    }
    data[c * 2] = half(d)
  }
  const texture = new THREE.Data3DTexture(data, nx, ny, nz)
  texture.format = THREE.RGFormat
  texture.type = THREE.HalfFloatType
  texture.minFilter = texture.magFilter = THREE.LinearFilter
  texture.wrapS = texture.wrapT = texture.wrapR = THREE.ClampToEdgeWrapping
  texture.unpackAlignment = 1
  texture.needsUpdate = true
  return texture
}

export function LayoutField({
  grid,
  field,
  start,
  plan,
  bias,
  air,
  clock,
  still,
}: {
  grid: LayoutGrid
  field: DistanceField
  start: [number, number, number]
  plan: SpreadPlan
  bias: SpreadBias
  air: readonly [number, number, number]
  clock: MutableRefObject<SpreadClock>
  still: boolean
}) {
  const noise = useMemo(makeNoise, [])
  const box = useMemo(() => {
    const min = new THREE.Vector3(...grid.min)
    const max = new THREE.Vector3(grid.min[0] + grid.nx * grid.cell, grid.min[1] + grid.ny * grid.cell, grid.min[2] + grid.nz * grid.cell)
    const size = new THREE.Vector3().subVectors(max, min)
    const centre = new THREE.Vector3().addVectors(max, min).multiplyScalar(0.5)
    return { min, max, geometry: new THREE.BoxGeometry(size.x, size.y, size.z).translate(centre.x, centre.y, centre.z) }
  }, [grid])
  const distances = useMemo(() => fieldTexture(grid, field), [grid, field])
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        side: THREE.BackSide,
        toneMapped: false,
        uniforms: {
          uNoise: { value: noise },
          uField: { value: null },
          uStart: { value: new THREE.Vector3() },
          uReach: { value: 0 },
          uTime: { value: 0 },
          uBias: { value: new THREE.Vector2() },
          uAir: { value: new THREE.Vector3() },
          uSpan: { value: 1 },
          uMin: { value: new THREE.Vector3() },
          uMax: { value: new THREE.Vector3() },
        },
      }),
    [noise],
  )
  useEffect(() => () => distances.dispose(), [distances])
  useEffect(() => () => box.geometry.dispose(), [box])
  useEffect(
    () => () => {
      material.dispose()
      noise.dispose()
    },
    [material, noise],
  )

  useFrame((_, delta) => {
    const u = material.uniforms
    if (!still) u.uTime.value += Math.min(delta, 0.1)
    u.uField.value = distances
    u.uMin.value.copy(box.min)
    u.uMax.value.copy(box.max)
    u.uReach.value = reachAt(plan, clock.current.t)
    u.uBias.value.set(bias.downstream, bias.up)
    u.uAir.value.set(air[0], air[1], air[2])
    u.uSpan.value = 1 / smallestFactor(bias)
    u.uStart.value.set(start[0], start[1], start[2])
  })

  return <mesh geometry={box.geometry} material={material} raycast={() => null} renderOrder={-5} frustumCulled={false} />
}
