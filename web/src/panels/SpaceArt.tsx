// OWNER: dashboard + AI workstream.
// Decorative space illustrations, drawn as inline SVG so they load offline and stay sharp on a
// projector. Purely decorative: every one is aria-hidden and carries no data.
import { useId } from 'react'

type ArtProps = { size?: number; className?: string }

export function Moon({ size = 220, className = '' }: ArtProps) {
  const id = useId()
  return (
    <svg className={`art ${className}`} width={size} height={size} viewBox="0 0 200 200" aria-hidden>
      <defs>
        <radialGradient id={`${id}m`} cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#fff2b0" />
          <stop offset="0.45" stopColor="#ffd34d" />
          <stop offset="0.85" stopColor="#f0a020" />
          <stop offset="1" stopColor="#e07a1a" />
        </radialGradient>
        <radialGradient id={`${id}c`} cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#e9a72a" />
          <stop offset="1" stopColor="#c97a14" />
        </radialGradient>
        <radialGradient id={`${id}g`} cx="50%" cy="50%" r="50%">
          <stop offset="0.7" stopColor="#ffcc29" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ffcc29" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="98" fill={`url(#${id}g)`} />
      <circle cx="100" cy="100" r="78" fill={`url(#${id}m)`} />
      <circle cx="72" cy="78" r="13" fill={`url(#${id}c)`} opacity="0.85" />
      <circle cx="120" cy="64" r="8" fill={`url(#${id}c)`} opacity="0.8" />
      <circle cx="132" cy="118" r="17" fill={`url(#${id}c)`} opacity="0.8" />
      <circle cx="88" cy="132" r="9" fill={`url(#${id}c)`} opacity="0.8" />
      <circle cx="104" cy="98" r="5" fill={`url(#${id}c)`} opacity="0.7" />
      <path d="M40 120a78 78 0 0 0 120 26" fill="none" stroke="#fff" strokeOpacity="0.18" strokeWidth="6" strokeLinecap="round" />
    </svg>
  )
}

export function RingedPlanet({ size = 200, className = '' }: ArtProps) {
  const id = useId()
  return (
    <svg className={`art ${className}`} width={size} height={size} viewBox="0 0 200 200" aria-hidden>
      <defs>
        <linearGradient id={`${id}p`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffb36b" />
          <stop offset="0.5" stopColor="#ff7a2f" />
          <stop offset="1" stopColor="#d9481c" />
        </linearGradient>
        <linearGradient id={`${id}r`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffe066" />
          <stop offset="1" stopColor="#ffb300" />
        </linearGradient>
        <clipPath id={`${id}k`}>
          <circle cx="100" cy="100" r="62" />
        </clipPath>
        <clipPath id={`${id}f`}>
          <rect x="0" y="100" width="200" height="100" />
        </clipPath>
      </defs>
      <g transform="rotate(-24 100 100)">
        <ellipse cx="100" cy="100" rx="94" ry="24" fill="none" stroke={`url(#${id}r)`} strokeWidth="12" opacity="0.8" />
      </g>
      <circle cx="100" cy="100" r="62" fill={`url(#${id}p)`} />
      <g clipPath={`url(#${id}k)`} opacity="0.3">
        <g transform="rotate(-24 100 100)">
          <rect x="20" y="70" width="170" height="9" fill="#fff" />
          <rect x="20" y="96" width="170" height="15" fill="#ffd0a0" />
          <rect x="20" y="126" width="170" height="7" fill="#fff" />
        </g>
      </g>
      <g transform="rotate(-24 100 100)" clipPath={`url(#${id}f)`}>
        <ellipse cx="100" cy="100" rx="94" ry="24" fill="none" stroke={`url(#${id}r)`} strokeWidth="12" />
      </g>
    </svg>
  )
}

export function Earth({ size = 200, className = '' }: ArtProps) {
  const id = useId()
  return (
    <svg className={`art ${className}`} width={size} height={size} viewBox="0 0 200 200" aria-hidden>
      <defs>
        <radialGradient id={`${id}o`} cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="#7fd3ff" />
          <stop offset="0.6" stopColor="#2f8fe6" />
          <stop offset="1" stopColor="#1c5bb8" />
        </radialGradient>
        <clipPath id={`${id}k`}>
          <circle cx="100" cy="100" r="78" />
        </clipPath>
      </defs>
      <circle cx="100" cy="100" r="86" fill="#4fc3f7" opacity="0.12" />
      <circle cx="100" cy="100" r="78" fill={`url(#${id}o)`} />
      <g clipPath={`url(#${id}k)`} fill="#3ecf6e">
        <path d="M52 52c18-14 40-12 50 2s-6 22-18 26-10 22-26 24-24-12-22-26 6-16 16-26z" />
        <path d="M118 40c14 0 30 8 36 22s-6 20-18 18-16 10-24 4-8-20-2-30 2-14 8-14z" />
        <path d="M108 112c16-6 34 2 40 16s-4 30-20 34-30-6-30-20 0-24 10-30z" />
        <path d="M40 128c8-2 16 4 16 12s-8 12-14 10-8-20-2-22z" />
      </g>
      <path d="M36 128a70 70 0 0 0 112 30" fill="none" stroke="#fff" strokeOpacity="0.2" strokeWidth="6" strokeLinecap="round" />
    </svg>
  )
}

export function Sun({ size = 180, className = '' }: ArtProps) {
  const id = useId()
  const rays = Array.from({ length: 12 }, (_, i) => i * 30)
  return (
    <svg className={`art ${className}`} width={size} height={size} viewBox="0 0 200 200" aria-hidden>
      <defs>
        <radialGradient id={`${id}s`} cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#fff3b0" />
          <stop offset="0.5" stopColor="#ffcc29" />
          <stop offset="1" stopColor="#ff9a1f" />
        </radialGradient>
      </defs>
      {rays.map((a) => (
        <path key={a} d="M100 8l9 28h-18z" fill="#ffb31f" transform={`rotate(${a} 100 100)`} />
      ))}
      <circle cx="100" cy="100" r="58" fill={`url(#${id}s)`} />
      <ellipse cx="146" cy="160" rx="50" ry="22" fill="#f4f6fa" />
      <circle cx="122" cy="150" r="22" fill="#f4f6fa" />
      <circle cx="150" cy="142" r="26" fill="#ffffff" />
    </svg>
  )
}

/** A friendly five-point star with a soft glow and two sparkles, for Compare. */
export function StarArt({ size = 48, className = '', color = '#ffcc29' }: ArtProps & { color?: string }) {
  const id = useId()
  return (
    <svg className={`art ${className}`} width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <defs>
        <radialGradient id={`${id}s`} cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#fff6c8" />
          <stop offset="0.55" stopColor={color} />
          <stop offset="1" stopColor="#f59e0b" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="52" r="40" fill={color} opacity="0.14" />
      <path
        d="M50 12l11 23 25 3.5-18 17.5 4.5 25L50 69 27.5 81 32 56 14 38.5 39 35z"
        fill={`url(#${id}s)`}
        stroke="#fff3b0"
        strokeOpacity="0.5"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="42" cy="48" r="3" fill="#1a1400" />
      <circle cx="58" cy="48" r="3" fill="#1a1400" />
      <path d="M44 57q6 5 12 0" fill="none" stroke="#1a1400" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M84 14l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#fff" opacity="0.85" />
      <path d="M14 70l1.5 3.5 3.5 1.5-3.5 1.5L14 80l-1.5-3.5L9 75l3.5-1.5z" fill="#fff" opacity="0.7" />
    </svg>
  )
}

/** A grey Moon with a glowing habitat dome and a little flag: NASA's own Moon Base air. */
export function MoonBase({ size = 200, className = '' }: ArtProps) {
  const id = useId()
  return (
    <svg className={`art ${className}`} width={size} height={size} viewBox="0 0 200 200" aria-hidden>
      <defs>
        <radialGradient id={`${id}m`} cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#f1f5f9" />
          <stop offset="0.55" stopColor="#a8b3c4" />
          <stop offset="1" stopColor="#5b6577" />
        </radialGradient>
        <radialGradient id={`${id}d`} cx="40%" cy="30%" r="70%">
          <stop offset="0" stopColor="#e0f7ff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#38bdf8" stopOpacity="0.55" />
        </radialGradient>
        <clipPath id={`${id}k`}>
          <circle cx="100" cy="110" r="78" />
        </clipPath>
      </defs>
      <circle cx="100" cy="110" r="86" fill="#93c5fd" opacity="0.1" />
      <circle cx="100" cy="110" r="78" fill={`url(#${id}m)`} />
      <g clipPath={`url(#${id}k)`} fill="#7c8799" opacity="0.7">
        <circle cx="62" cy="130" r="12" />
        <circle cx="140" cy="150" r="16" />
        <circle cx="120" cy="96" r="7" />
      </g>
      <path d="M58 70 a42 30 0 0 1 84 0 z" fill={`url(#${id}d)`} stroke="#bae6fd" strokeWidth="2" />
      <path d="M72 70 a28 20 0 0 1 56 0" fill="none" stroke="#e0f2fe" strokeOpacity="0.7" strokeWidth="1.5" />
      <rect x="54" y="68" width="92" height="7" rx="3" fill="#cbd5e1" />
      <circle cx="86" cy="58" r="3" fill="#ffcc29" />
      <circle cx="104" cy="54" r="3" fill="#ffcc29" />
      <line x1="150" y1="72" x2="150" y2="40" stroke="#e5e7eb" strokeWidth="2.5" />
      <path d="M150 40 h22 l-5 7 5 7 h-22 z" fill="#ff7a2f" />
    </svg>
  )
}

/** A small space station: modules, a truss and gold solar wings. */
export function SpaceStation({ size = 200, className = '' }: ArtProps) {
  const id = useId()
  return (
    <svg className={`art ${className}`} width={size} height={size} viewBox="0 0 200 200" aria-hidden>
      <defs>
        <linearGradient id={`${id}p`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="1" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f8fafc" />
          <stop offset="1" stopColor="#94a3b8" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="90" fill="#38bdf8" opacity="0.08" />
      <g transform="rotate(-18 100 100)">
        <rect x="18" y="96" width="164" height="8" rx="3" fill="#cbd5e1" />
        {[22, 52, 128, 158].map((x) => (
          <g key={x}>
            <rect x={x} y="44" width="22" height="48" rx="2" fill={`url(#${id}p)`} stroke="#fbbf24" />
            <rect x={x} y="108" width="22" height="48" rx="2" fill={`url(#${id}p)`} stroke="#fbbf24" />
            <line x1={x + 11} y1="44" x2={x + 11} y2="92" stroke="#92400e" strokeOpacity="0.5" />
            <line x1={x + 11} y1="108" x2={x + 11} y2="156" stroke="#92400e" strokeOpacity="0.5" />
          </g>
        ))}
        <rect x="80" y="86" width="40" height="28" rx="12" fill={`url(#${id}b)`} stroke="#64748b" />
        <rect x="92" y="62" width="16" height="76" rx="7" fill={`url(#${id}b)`} stroke="#64748b" />
        <circle cx="100" cy="100" r="5" fill="#38bdf8" />
        <circle cx="100" cy="72" r="3" fill="#38bdf8" />
        <circle cx="100" cy="128" r="3" fill="#38bdf8" />
      </g>
    </svg>
  )
}

/** A spacesuit helmet with a gold visor reflecting a star. */
export function Helmet({ size = 200, className = '' }: ArtProps) {
  const id = useId()
  return (
    <svg className={`art ${className}`} width={size} height={size} viewBox="0 0 200 200" aria-hidden>
      <defs>
        <radialGradient id={`${id}h`} cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.6" stopColor="#e2e8f0" />
          <stop offset="1" stopColor="#94a3b8" />
        </radialGradient>
        <linearGradient id={`${id}v`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff3b0" />
          <stop offset="0.45" stopColor="#ffb300" />
          <stop offset="1" stopColor="#b45309" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="88" fill="#fbbf24" opacity="0.08" />
      <rect x="52" y="146" width="96" height="24" rx="10" fill="#cbd5e1" stroke="#94a3b8" />
      <circle cx="100" cy="96" r="66" fill={`url(#${id}h)`} stroke="#94a3b8" strokeWidth="2" />
      <path d="M52 92 q0 -40 48 -40 q48 0 48 40 q0 30 -48 30 q-48 0 -48 -30 z" fill={`url(#${id}v)`} stroke="#92400e" strokeOpacity="0.4" strokeWidth="2" />
      <path d="M66 82 q8 -18 30 -20" fill="none" stroke="#fff" strokeOpacity="0.75" strokeWidth="5" strokeLinecap="round" />
      <path d="M124 92 l2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5 -6 -6 -2.5 6 -2.5z" fill="#fff" opacity="0.9" />
      <circle cx="44" cy="106" r="7" fill="#cbd5e1" stroke="#94a3b8" />
      <circle cx="156" cy="106" r="7" fill="#cbd5e1" stroke="#94a3b8" />
    </svg>
  )
}

export type PlaceArtKind = 'moon' | 'moonbase' | 'station' | 'helmet' | 'earth' | 'planet' | 'sun'

/** The illustration for a place, by kind (see placeArt in places.ts). */
export function PlaceArt({ kind, size = 160, className = '' }: { kind: PlaceArtKind; size?: number; className?: string }) {
  if (kind === 'moon') return <Moon size={size} className={className} />
  if (kind === 'moonbase') return <MoonBase size={size} className={className} />
  if (kind === 'station') return <SpaceStation size={size} className={className} />
  if (kind === 'helmet') return <Helmet size={size} className={className} />
  if (kind === 'earth') return <Earth size={size} className={className} />
  if (kind === 'sun') return <Sun size={size} className={className} />
  return <RingedPlanet size={size} className={className} />
}

/** A small rocket on a dashed trajectory, for the headline. */
export function RocketPath({ className = '' }: { className?: string }) {
  return (
    <svg className={`art ${className}`} viewBox="0 0 160 220" aria-hidden>
      <path d="M150 210C150 140 40 140 30 40" fill="none" stroke="#e8e8ea" strokeOpacity="0.55" strokeWidth="2.5" strokeDasharray="6 8" strokeLinecap="round" />
      <g transform="translate(30 30) rotate(-20)">
        <path d="M0-22c8 6 12 18 10 30H-10C-12-4-8-16 0-22z" fill="#f4f6fa" />
        <circle cy="-6" r="4" fill="#4fc3f7" />
        <path d="M-10 4l-8 10 8-2zM10 4l8 10-8-2z" fill="#ff6b3d" />
        <path d="M-5 9h10l-5 12z" fill="#ffcc29" />
      </g>
    </svg>
  )
}

/** A thin field of stars behind a section. */
export function Stars({ className = '' }: { className?: string }) {
  const pts = [
    [8, 20, 1.2], [22, 70, 0.8], [35, 12, 1], [48, 55, 1.4], [62, 28, 0.9], [74, 80, 1.1], [86, 15, 0.8], [93, 60, 1.3],
    [15, 90, 0.9], [55, 92, 0.7], [70, 48, 0.6], [40, 35, 0.7], [28, 45, 0.6], [80, 35, 0.7],
  ]
  return (
    <svg className={`stars ${className}`} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      {pts.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r * 0.35} fill="#fff" opacity={0.25 + (i % 4) * 0.12} />
      ))}
    </svg>
  )
}
