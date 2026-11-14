// OWNER: 3D workstream.
// The flame body: three see-through shells (glow, body, inner core) drawn with one small custom
// shader and additive blending. A unit sphere is bent in the vertex shader: with no gravity and no
// airflow it stays a sphere (the microgravity look); buoyancy and airflow stretch it into a
// teardrop along their combined direction, and buoyancy adds flicker.
// An ILLUSTRATION, not a simulation: the shape follows the look values in look.ts, never physics.
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { FireState } from './state'

const VERT = /* glsl */ `
uniform float uTime;
uniform float uBuoy;
uniform float uDrift;
uniform float uFlicker;
uniform float uShell;
uniform vec3 uUp;
uniform vec3 uFlow;
varying vec3 vN;
varying vec3 vV;
varying float vH;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}

void main() {
  vec3 p = position;
  vec3 S = uUp * uBuoy + uFlow * uDrift;
  float amt = length(S);
  vec3 d = amt > 1e-4 ? S / amt : vec3(0.0, 1.0, 0.0);
  float h = dot(p, d);                 // -1 (base) .. 1 (tip)
  float hp = max(h, 0.0);
  vec3 perp = p - d * h;

  float pull = min(amt, 1.6) / 1.6;
  float taper = 1.0 - 0.62 * smoothstep(0.0, 1.0, hp) * pull;
  float along = h < 0.0 ? 1.0 - 0.3 * pull : 1.0 + amt;

  // Flicker: a travelling wobble that grows towards the tip (buoyant flames only).
  float n1 = noise(vec3(p.x * 2.1, p.z * 2.1, uTime * 3.2 - hp * 3.0)) - 0.5;
  float n2 = noise(vec3(p.z * 2.7 + 7.0, p.x * 2.7, uTime * 4.6 - hp * 4.0)) - 0.5;
  vec3 side = normalize(cross(d, abs(d.z) < 0.9 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0)));
  vec3 side2 = cross(d, side);

  vec3 q = perp * taper * (1.0 + uFlicker * 0.3 * n1 * hp) + d * h * along;
  q += (side * n2 + side2 * n1) * uFlicker * hp * hp * 0.45;
  q += d * uFlicker * hp * 0.35 * n1;
  q *= uShell;

  // Approximate normal of the bent shape (inverse of the stretch), good enough for the rim glow.
  vec3 n0 = normalize(normal);
  float nh = dot(n0, d);
  vec3 nb = (n0 - d * nh) / max(taper, 0.3) + d * nh / along;

  vec4 mv = modelViewMatrix * vec4(q, 1.0);
  vN = normalize(normalMatrix * nb);
  vV = -mv.xyz;
  vH = clamp(h * 0.5 + 0.5, 0.0, 1.0);
  gl_Position = projectionMatrix * mv;
}
`

const FRAG = /* glsl */ `
uniform vec3 uCool;
uniform vec3 uWarm;
uniform vec3 uWhite;
uniform float uWarmth;
uniform float uWhiteness;
uniform float uAlpha;
uniform float uSoft;
varying vec3 vN;
varying vec3 vV;
varying float vH;

void main() {
  float facing = abs(dot(normalize(vN), normalize(vV)));
  float rim = pow(1.0 - facing, mix(1.6, 0.7, uSoft));
  // Buoyant (warm) flames are luminous right through; microgravity flames are a thin blue shell.
  float warmMix = uWarmth * smoothstep(0.22, 0.7, vH);
  float fill = mix(0.12 + 0.88 * rim, 0.45 + 0.55 * facing, warmMix * 0.85);
  vec3 col = mix(uCool, uWarm, warmMix);
  col = mix(col, uWhite, uWhiteness * facing * 0.75);
  float a = uAlpha * fill * (1.0 + 0.9 * warmMix) * (1.0 - 0.75 * smoothstep(0.82, 1.0, vH));
  gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
  #include <colorspace_fragment>
}
`

/** The three shells: [size, opacity, how much of the warm colour they take, extra softness]. */
const SHELLS: [number, number, number, number][] = [
  [1.32, 0.22, 1.0, 0.4], // outer glow
  [1.0, 0.95, 1.0, 0.0], // body
  [0.6, 0.6, 0.35, 0.0], // inner core, stays bluer
]

export type Vec3 = [number, number, number]

export function FlameShell({
  state,
  cool,
  up = [0, 1, 0],
  flow = [1, 0, 0],
  scale = [1, 1, 1],
  extraVis,
}: {
  state: MutableRefObject<FireState>
  /** The flame's base (microgravity) colour. */
  cool: string
  /** Direction buoyancy pulls the flame, in the flame's own space. */
  up?: Vec3
  /** Direction the air moves, in the flame's own space. */
  flow?: Vec3
  /** Base shape of the flame before stretching (an ellipsoid). */
  scale?: Vec3
  /** Optional extra visibility (for a droplet that burns down, a front that reaches the end). */
  extraVis?: MutableRefObject<number>
}) {
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 64, 48), [])
  const materials = useMemo(
    () =>
      SHELLS.map(
        ([shell]) =>
          new THREE.ShaderMaterial({
            vertexShader: VERT,
            fragmentShader: FRAG,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            uniforms: {
              uTime: { value: 0 },
              uBuoy: { value: 0 },
              uDrift: { value: 0 },
              uFlicker: { value: 0 },
              uShell: { value: shell },
              uUp: { value: new THREE.Vector3() },
              uFlow: { value: new THREE.Vector3() },
              uCool: { value: new THREE.Color() },
              uWarm: { value: new THREE.Color('#ffae3b') },
              uWhite: { value: new THREE.Color('#fff6dc') },
              uWarmth: { value: 0 },
              uWhiteness: { value: 0 },
              uAlpha: { value: 0 },
              uSoft: { value: 0 },
            },
          }),
      ),
    [],
  )
  useEffect(
    () => () => {
      geometry.dispose()
      materials.forEach((m) => m.dispose())
    },
    [geometry, materials],
  )

  // Directions and colour change only with props: set them outside the frame loop.
  useEffect(() => {
    for (const m of materials) {
      m.uniforms.uUp.value.set(...up).normalize()
      m.uniforms.uFlow.value.set(...flow).normalize()
      m.uniforms.uCool.value.set(cool)
    }
  }, [materials, cool, up[0], up[1], up[2], flow[0], flow[1], flow[2]])

  const group = useRef<THREE.Group>(null)
  useFrame(() => {
    const { look, vis, t, still } = state.current
    const v = vis * (extraVis ? extraVis.current : 1)
    if (group.current) group.current.visible = v > 0.002
    materials.forEach((m, i) => {
      const [, opacity, warmTake, soft] = SHELLS[i]
      const u = m.uniforms
      u.uTime.value = t
      u.uBuoy.value = look.buoyancy
      u.uDrift.value = look.drift
      u.uFlicker.value = still ? 0 : look.flicker
      u.uWarmth.value = look.warmth * warmTake
      u.uWhiteness.value = look.whiteness
      u.uAlpha.value = opacity * look.brightness * v
      u.uSoft.value = Math.min(1, look.softness + soft)
    })
    if (group.current) group.current.scale.set(scale[0] * look.size, scale[1] * look.size, scale[2] * look.size)
  })

  return (
    <group ref={group}>
      {materials.map((m, i) => (
        <mesh key={i} geometry={geometry} material={m} renderOrder={10 + i} />
      ))}
    </group>
  )
}

/** Light the flame casts on its sample: colour and strength follow the flame. */
export function FlameLight({
  state,
  cool,
  position,
  extraVis,
  strength = 2.2,
}: {
  state: MutableRefObject<FireState>
  cool: string
  position: Vec3
  extraVis?: MutableRefObject<number>
  /** Peak light intensity; a drawing choice per sample. */
  strength?: number
}) {
  const light = useRef<THREE.PointLight>(null)
  const coolC = useMemo(() => new THREE.Color(cool), [cool])
  const warmC = useMemo(() => new THREE.Color('#ffae3b'), [])
  useFrame(() => {
    const l = light.current
    if (!l) return
    const { look, vis } = state.current
    const v = vis * (extraVis ? extraVis.current : 1)
    l.color.copy(coolC).lerp(warmC, look.warmth)
    l.intensity = strength * look.brightness * v
  })
  return <pointLight ref={light} position={position} distance={4} decay={1.4} />
}
