// OWNER: 3D workstream. A coloured cloud that fills the inside of the sample spacecraft and shows
// how far the illustrated spread has reached from the fire point. It is a true volume: the picture
// is built by stepping along each line of sight through the cabin, so it holds up from any angle.
//
// IT LOOKS LIKE THE OUTPUT OF A FIRE MODEL. IT IS NOT ONE. The colour is only "how far the drawing
// has reached": red at the start, blue at the edge. It is not temperature, smoke, air speed or
// anything measured, and it has no scale. The edge sits where timeline.ts says the spread has got
// to (distance through the example layout only); the ragged, drifting texture is decoration. Like
// the order it follows, it goes through the open hatch and never through a bulkhead or the closed
// flight deck door. In the crew cabin it stays under the ceiling, and gets into the vent duct
// above only through a grille, then runs along the duct. The duct is its only way into or out of
// the closed flight deck: in through one grille, along, and out through another.
// See CLAUDE.md, "Spread is an illustration, never a result".
import { useEffect, useMemo, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { SpreadClock } from './CabinFire'
import { AXIS_Y, BULKHEADS, CEILING, DECK_X0, DECK_X1, DUCT, DUCT_OPENINGS, HULL } from './spec'
import { MIN_FACTOR, reachAt, smallestFactor, type SpreadBias, type SpreadPlan } from './timeline'

/** Box that holds the whole inside of the craft, deck to ceiling. */
const TOP = AXIS_Y + HULL.cabinR
const BOX_MIN = new THREE.Vector3(DECK_X0 - 0.5, 0, -HULL.cabinR)
const BOX_MAX = new THREE.Vector3(DECK_X1 + 0.3, TOP, HULL.cabinR)

/** Samples taken along each line of sight. More is smoother and slower. */
const STEPS = 40 // enough to catch the thin vent duct

const f = (v: number) => v.toFixed(4)

// The duct's openings, written into the shader. Each is a point on the centre line at the height
// of the ceiling.
const OPENING = DUCT_OPENINGS.map((x) => `vec3(${f(x)}, CEIL_Y, 0.0)`)
const least = (terms: string[]) => terms.reduce((a, b) => `min(${a}, ${b})`)
/** From the fire point to each opening, without the duct. */
const TO_OPENINGS = OPENING.map((g, i) => `float s${i} = pathDistance(uStart, ${g});`).join('\n    ')
/** From the fire point to each opening, arriving along the duct from whichever opening is best. */
const VIA_DUCT = DUCT_OPENINGS.map((xj, j) => `float via${j} = ${least(DUCT_OPENINGS.map((xi, i) => `s${i} + ${f(Math.abs(xi - xj))}`))};`).join('\n    ')
const INSIDE_DUCT = least(OPENING.map((g, i) => `s${i} + distance(${g}, p)`))
const OUT_OF_DUCT = least(OPENING.map((g, j) => `via${j} + pathDistance(${g}, p)`))

export const VERT = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const FRAG = /* glsl */ `
  precision highp sampler3D;
  uniform sampler3D uNoise;
  uniform vec3 uStart;
  uniform float uReach;
  uniform float uTime;
  uniform vec2 uBias;   // the user's spread settings: nearer downstream (x), nearer above (y)
  uniform float uSpan;  // how much farther than uReach a straight line can go and still be inside
  uniform vec3 uMin;
  uniform vec3 uMax;
  uniform vec3 uWalls[${BULKHEADS.length}]; // each bulkhead: where it stands, the radius of its opening, 1 if its door is shut
  varying vec3 vWorld;

  // Distance from s to p without passing through a bulkhead: where the straight line would hit a
  // wall, it bends round the nearest edge of that wall's opening instead. A wall whose door is
  // shut cannot be passed at all: the answer is then a number too large to ever be reached.
  float pathDistance(vec3 s, vec3 p) {
    vec3 from = s;
    float d = 0.0;
    bool forward = p.x > s.x;
    for (int k = 0; k < ${BULKHEADS.length}; k++) {
      int i = forward ? k : ${BULKHEADS.length - 1} - k;
      float xw = uWalls[i].x;
      if ((from.x - xw) * (p.x - xw) >= 0.0) continue; // this bulkhead is not in between
      if (uWalls[i].z > 0.5) return 1.0e9;
      vec3 c = from + (p - from) * ((xw - from.x) / (p.x - from.x));
      vec2 off = c.yz - vec2(${f(AXIS_Y)}, 0.0);
      float r = length(off);
      if (r > uWalls[i].y) {
        c.yz = vec2(${f(AXIS_Y)}, 0.0) + off / r * uWalls[i].y;
        d += distance(from, c);
        from = c;
      }
    }
    return d + distance(from, p);
  }

  // the craft's inside: the same profile as spec.ts (hullRadius), above the deck
  float hullRadius(float x) {
    if (x < ${f(HULL.domeX)}) { float a = x - (${f(HULL.domeX)}); return sqrt(max(0.0, ${f(HULL.domeR * HULL.domeR)} - a * a)); }
    if (x < ${f(HULL.coneEndX)}) return ${f(HULL.domeR)} + (x - (${f(HULL.domeX)})) / ${f(HULL.coneEndX - HULL.domeX)} * ${f(HULL.cabinR - HULL.domeR)};
    if (x <= ${f(HULL.cabinEndX)}) return ${f(HULL.cabinR)};
    float b = x - ${f(HULL.nodeX)};
    return abs(b) < ${f(HULL.nodeR)} ? sqrt(${f(HULL.nodeR * HULL.nodeR)} - b * b) : 0.0;
  }
  const float CEIL_Y = ${f(CEILING.y)};

  // above the crew cabin's ceiling there is only the vent duct
  bool aboveCeiling(vec3 p) { return p.x > ${f(CEILING.x0)} && p.x < ${f(CEILING.x1)} && p.y > CEIL_Y; }
  // the duct for its whole length, including the end of it inside the flight deck
  bool inDuct(vec3 p) {
    return p.x > ${f(DUCT.x0)} && p.x < ${f(DUCT.x1)} && abs(p.z) < ${f(DUCT.halfWidth)} && p.y > CEIL_Y && p.y < ${f(CEILING.y + DUCT.height)};
  }
  bool inside(vec3 p) {
    if (p.y < 0.0) return false;
    float r = hullRadius(p.x);
    float y = p.y - ${f(AXIS_Y)};
    if (y * y + p.z * p.z >= r * r) return false;
    return aboveCeiling(p) ? inDuct(p) : true;
  }


  // 0 = the edge of reach (blue) .. 1 = where the fire starts (red)
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

    // the stretch of this line of sight that is inside the box...
    vec3 inv = 1.0 / rd;
    vec3 a = (uMin - ro) * inv, b = (uMax - ro) * inv;
    vec3 lo = min(a, b), hi = max(a, b);
    float t0 = max(max(max(lo.x, lo.y), lo.z), 0.0);
    float t1 = min(min(hi.x, hi.y), hi.z);
    // ...and inside the ball the spread could have reached (plus room for the ragged edge). The
    // path round an opening is never shorter than the straight line, so nothing is cut off.
    vec3 oc = ro - uStart;
    float R = uReach * uSpan + 0.7;
    float bq = dot(oc, rd);
    float disc = bq * bq - (dot(oc, oc) - R * R);
    if (disc <= 0.0) discard;
    float sq = sqrt(disc);
    t0 = max(t0, -bq - sq);
    t1 = min(t1, -bq + sq);
    if (t1 <= t0) discard;

    // the same for every sample on this line of sight: how far it is to each of the duct's openings
    ${TO_OPENINGS}
    ${VIA_DUCT}

    float dt = (t1 - t0) / float(${STEPS});
    float t = t0 + dt * hash(gl_FragCoord.xy); // a little jitter hides the layering
    vec3 drift = vec3(uTime * 0.012, -uTime * 0.009, uTime * 0.007);
    vec3 col = vec3(0.0);
    float alpha = 0.0;
    for (int i = 0; i < ${STEPS}; i++) {
      vec3 p = ro + rd * t;
      t += dt;
      if (!inside(p)) continue;
      float d;
      if (inDuct(p)) {
        // in the duct: the only ways in are its openings, so go to one and then along
        d = ${INSIDE_DUCT};
      } else {
        d = pathDistance(uStart, p);
        // behind a closed door: in through one opening, along the duct, out through another
        if (d > 1.0e8) d = ${OUT_OF_DUCT};
      }
      // the same lean as the order (timeline.ts, biasFactor): 1 when no setting is in use
      vec3 away = p - uStart;
      float len = length(away);
      if (len > 1.0e-4) d *= max(${f(MIN_FACTOR)}, 1.0 - uBias.x * away.x / len - uBias.y * away.y / len);
      // decoration only: a ragged, slowly drifting edge and a mottled inside
      float n = texture(uNoise, p * 0.11 + drift).r;
      float m = texture(uNoise, p * 0.29 - drift * 1.7).r;
      float h = 1.0 - (d + (n - 0.5) * 1.3 * smoothstep(0.0, 1.2, d)) / max(uReach, 0.001);
      if (h <= 0.0) continue;
      // thin at the edge, thicker towards the start, so the red core shows through the blue shell
      float a1 = smoothstep(0.0, 0.1, h) * (0.2 + 1.0 * h) * dt;
      // the power widens the red and yellow near the start, so the core reads clearly
      vec3 c = ramp(pow(clamp(h * (0.8 + 0.45 * m), 0.0, 1.0), 0.65));
      col += (1.0 - alpha) * c * a1;
      alpha += (1.0 - alpha) * a1;
      if (alpha > 0.96) break;
    }
    if (alpha < 0.004) discard;
    gl_FragColor = vec4(col / alpha, alpha * 0.9);
  }
`

/** A small block of random values, read smoothly: far cheaper per sample than computing noise. */
export function makeNoise() {
  const size = 32
  const data = new Uint8Array(size * size * size)
  for (let i = 0; i < data.length; i++) data[i] = Math.floor(Math.random() * 256)
  const texture = new THREE.Data3DTexture(data, size, size, size)
  texture.format = THREE.RedFormat
  texture.type = THREE.UnsignedByteType
  texture.minFilter = texture.magFilter = THREE.LinearFilter
  texture.wrapS = texture.wrapT = texture.wrapR = THREE.RepeatWrapping
  texture.unpackAlignment = 1
  texture.needsUpdate = true
  return texture
}

export function ReachField({ start, plan, bias, clock, still }: { start: [number, number, number]; plan: SpreadPlan; bias: SpreadBias; clock: MutableRefObject<SpreadClock>; still: boolean }) {
  const noise = useMemo(makeNoise, [])
  const geometry = useMemo(() => {
    const size = new THREE.Vector3().subVectors(BOX_MAX, BOX_MIN)
    const centre = new THREE.Vector3().addVectors(BOX_MAX, BOX_MIN).multiplyScalar(0.5)
    return new THREE.BoxGeometry(size.x, size.y, size.z).translate(centre.x, centre.y, centre.z)
  }, [])
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        depthTest: false, // drawn first, so the wireframe stays crisp on top of the cloud
        side: THREE.BackSide, // the far faces, so it still draws with the camera inside the cabin
        toneMapped: false,
        uniforms: {
          uNoise: { value: noise },
          uStart: { value: new THREE.Vector3() },
          uReach: { value: 0 },
          uTime: { value: 0 },
          uBias: { value: new THREE.Vector2() },
          uSpan: { value: 1 },
          uMin: { value: BOX_MIN },
          uMax: { value: BOX_MAX },
          uWalls: { value: BULKHEADS.map((b) => new THREE.Vector3(b.x, b.opening, b.closed ? 1 : 0)) },
        },
      }),
    [noise],
  )
  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
      noise.dispose()
    },
    [geometry, material, noise],
  )

  useFrame((_, delta) => {
    const u = material.uniforms
    if (!still) u.uTime.value += Math.min(delta, 0.1)
    u.uReach.value = reachAt(plan, clock.current.t)
    u.uBias.value.set(bias.downstream, bias.up)
    u.uSpan.value = 1 / smallestFactor(bias)
    u.uStart.value.set(start[0], start[1], start[2])
  })

  return <mesh geometry={geometry} material={material} raycast={() => null} renderOrder={-5} frustumCulled={false} />
}
