// OWNER: dashboard + AI workstream.
// The animated space behind every page: three layers of twinkling stars drifting slowly with mouse
// parallax, occasional shooting stars, a sparkle burst where you click, drifting nebula colour, and a
// planet, a satellite and an asteroid floating across. Decorative only (aria-hidden, no pointer
// events). Under "reduce motion" it draws one still frame.
import { useEffect, useRef } from 'react'
import { Moon, RingedPlanet } from './SpaceArt'

interface Star { x: number; y: number; r: number; tw: number; ph: number; layer: number; hue: number }
interface Shoot { x: number; y: number; vx: number; vy: number; life: number }
interface Spark { x: number; y: number; vx: number; vy: number; life: number; hue: number }

const LAYERS = [
  { count: 110, speed: 0.006, size: [0.5, 1.0], par: 6 },
  { count: 55, speed: 0.014, size: [0.9, 1.5], par: 14 },
  { count: 22, speed: 0.03, size: [1.3, 2.2], par: 26 },
]
const FRAME_MS = 1000 / 30 // 30 fps is plenty for slow drifting stars

function Satellite() {
  return (
    <svg viewBox="0 0 120 60" width="120" height="60" aria-hidden>
      <rect x="2" y="20" width="38" height="20" rx="2" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="1.5" />
      <rect x="80" y="20" width="38" height="20" rx="2" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="1.5" />
      {[9, 18, 27].map((x) => (
        <line key={x} x1={x} y1="20" x2={x} y2="40" stroke="#60a5fa" strokeOpacity="0.6" />
      ))}
      {[89, 98, 107].map((x) => (
        <line key={x} x1={x} y1="20" x2={x} y2="40" stroke="#60a5fa" strokeOpacity="0.6" />
      ))}
      <line x1="40" y1="30" x2="80" y2="30" stroke="#cbd5e1" strokeWidth="2" />
      <rect x="50" y="18" width="20" height="24" rx="4" fill="#e5e7eb" stroke="#94a3b8" />
      <circle cx="60" cy="14" r="5" fill="none" stroke="#cbd5e1" strokeWidth="2" />
      <circle cx="60" cy="30" r="3" fill="#ffcc29" />
    </svg>
  )
}

function Asteroid() {
  return (
    <svg viewBox="0 0 60 50" width="60" height="50" aria-hidden>
      <path d="M8 22 L16 8 L34 4 L50 12 L56 28 L46 44 L24 46 L8 38 Z" fill="#4b5563" stroke="#9ca3af" strokeWidth="1.5" />
      <circle cx="26" cy="20" r="5" fill="#374151" />
      <circle cx="40" cy="32" r="4" fill="#374151" />
      <circle cx="18" cy="34" r="3" fill="#374151" />
    </svg>
  )
}

export function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current!
    const root = rootRef.current!
    const ctx = canvas.getContext('2d')!
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let w = 0
    let h = 0
    let dpr = 1
    let stars: Star[] = []
    const shoots: Shoot[] = []
    const sparks: Spark[] = []
    let mx = 0
    let my = 0
    let px = 0
    let py = 0
    let raf = 0
    let nextShoot = 2000

    const resize = () => {
      dpr = 1 // stars are dots: full resolution costs 4x for no visible gain
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      stars = LAYERS.flatMap((L, layer) =>
        Array.from({ length: Math.round(L.count * Math.max(0.5, (w * h) / (1440 * 900))) }, () => ({
          x: Math.random() * w,
          y: Math.random() * h,
          r: L.size[0] + Math.random() * (L.size[1] - L.size[0]),
          tw: 0.5 + Math.random() * 2.5,
          ph: Math.random() * Math.PI * 2,
          layer,
          hue: Math.random() < 0.15 ? 200 + Math.random() * 40 : Math.random() < 0.1 ? 30 + Math.random() * 20 : 0,
        })),
      )
    }

    const nebula = root.querySelector<HTMLElement>('.space-nebula')
    const glow = root.querySelector<HTMLElement>('.space-glow')
    const onMove = (e: PointerEvent) => {
      mx = e.clientX / w - 0.5
      my = e.clientY / h - 0.5
      // transform only: moved by the compositor, no layout or repaint
      if (glow) glow.style.transform = `translate3d(${e.clientX - 160}px, ${e.clientY - 160}px, 0)`
    }
    let hidden = document.hidden
    const onVis = () => {
      hidden = document.hidden
      if (!hidden && !reduce) {
        last = performance.now()
        raf = requestAnimationFrame(draw)
      }
    }
    const onDown = (e: PointerEvent) => {
      if (reduce) return
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2 + Math.random() * 0.4
        const v = 1.2 + Math.random() * 2.4
        sparks.push({ x: e.clientX, y: e.clientY, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, hue: Math.random() < 0.5 ? 40 : 200 })
      }
    }

    let last = performance.now()
    function draw(now: number) {
      if (hidden) return // stop entirely while the tab is in the background
      if (!reduce && now - last < FRAME_MS) {
        raf = requestAnimationFrame(draw)
        return
      }
      const dt = Math.min(now - last, 80)
      last = now
      px += (mx - px) * 0.08
      py += (my - py) * 0.08
      if (nebula) nebula.style.transform = `translate3d(${(px * -30).toFixed(1)}px, ${(py * -30).toFixed(1)}px, 0)`
      ctx.clearRect(0, 0, w, h)
      const t = now / 1000
      for (const s of stars) {
        const L = LAYERS[s.layer]
        if (!reduce) {
          s.x -= L.speed * dt
          if (s.x < -4) s.x = w + 4
        }
        const x = s.x - px * L.par * 2
        const y = s.y - py * L.par * 2
        const a = reduce ? 0.8 : 0.45 + 0.55 * Math.abs(Math.sin(t * s.tw + s.ph))
        ctx.beginPath()
        ctx.fillStyle = s.hue ? `hsla(${s.hue}, 90%, 80%, ${a})` : `rgba(255,255,255,${a})`
        ctx.arc(x, y, s.r, 0, Math.PI * 2)
        ctx.fill()
        if (s.layer === 2 && a > 0.85) {
          ctx.strokeStyle = `rgba(255,255,255,${(a - 0.85) * 3})`
          ctx.lineWidth = 0.6
          ctx.beginPath()
          ctx.moveTo(x - s.r * 3, y)
          ctx.lineTo(x + s.r * 3, y)
          ctx.moveTo(x, y - s.r * 3)
          ctx.lineTo(x, y + s.r * 3)
          ctx.stroke()
        }
      }
      if (!reduce) {
        nextShoot -= dt
        if (nextShoot <= 0) {
          nextShoot = 3500 + Math.random() * 5000
          const fromLeft = Math.random() < 0.5
          shoots.push({ x: fromLeft ? Math.random() * w * 0.5 : w * (0.5 + Math.random() * 0.5), y: Math.random() * h * 0.4, vx: (fromLeft ? 1 : -1) * (0.7 + Math.random() * 0.5), vy: 0.35 + Math.random() * 0.25, life: 1 })
        }
        for (let i = shoots.length - 1; i >= 0; i--) {
          const s = shoots[i]
          s.x += s.vx * dt
          s.y += s.vy * dt
          s.life -= dt / 1100
          if (s.life <= 0) {
            shoots.splice(i, 1)
            continue
          }
          ctx.strokeStyle = `rgba(220,240,255,${(s.life * 0.9).toFixed(2)})`
          ctx.lineWidth = 1.6
          ctx.beginPath()
          ctx.moveTo(s.x, s.y)
          ctx.lineTo(s.x - s.vx * 160, s.y - s.vy * 160)
          ctx.stroke()
        }
        for (let i = sparks.length - 1; i >= 0; i--) {
          const p = sparks[i]
          p.x += p.vx * (dt / 16)
          p.y += p.vy * (dt / 16)
          p.vx *= 0.96
          p.vy *= 0.96
          p.life -= dt / 700
          if (p.life <= 0) {
            sparks.splice(i, 1)
            continue
          }
          ctx.fillStyle = `hsla(${p.hue}, 100%, 70%, ${p.life})`
          ctx.beginPath()
          ctx.arc(p.x, p.y, 1.8 * p.life + 0.4, 0, Math.PI * 2)
          ctx.fill()
        }
        raf = requestAnimationFrame(draw)
      }
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })
    document.addEventListener('visibilitychange', onVis)
    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  return (
    <div ref={rootRef} className="space-bg" aria-hidden>
      <div className="space-nebula" />
      <canvas ref={canvasRef} className="space-stars" />
      <div className="space-float space-planet">
        <RingedPlanet size={150} />
      </div>
      <div className="space-float space-moon">
        <Moon size={90} />
      </div>
      <div className="space-float space-sat">
        <Satellite />
      </div>
      <div className="space-float space-rock">
        <Asteroid />
      </div>
      <div className="space-glow" />
    </div>
  )
}
