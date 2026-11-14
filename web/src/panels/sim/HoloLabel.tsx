// OWNER: dashboard + AI workstream.
// Text drawn to a canvas and shown as a sprite that faces the camera (no network fonts, no drei Html).
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

export function HoloLabel({ text, position, color = '#bfe8ff', height = 0.55, bg = true }: { text: string; position: [number, number, number]; color?: string; height?: number; bg?: boolean }) {
  const { texture, aspect } = useMemo(() => {
    const PX = 64
    const font = '600 40px system-ui, "Segoe UI", sans-serif'
    const c = document.createElement('canvas')
    const ctx = c.getContext('2d')!
    ctx.font = font
    const w = Math.ceil(ctx.measureText(text).width) + 32
    c.width = w
    c.height = PX
    ctx.font = font
    if (bg) {
      ctx.fillStyle = 'rgba(6, 18, 34, 0.72)'
      ctx.strokeStyle = 'rgba(120, 200, 255, 0.55)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.roundRect(1, 1, w - 2, PX - 2, 14)
      ctx.fill()
      ctx.stroke()
    }
    ctx.fillStyle = color
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 16, PX / 2 + 2)
    const texture = new THREE.CanvasTexture(c)
    texture.colorSpace = THREE.SRGBColorSpace
    return { texture, aspect: w / PX }
  }, [text, color, bg])
  useEffect(() => () => texture.dispose(), [texture])
  return (
    <sprite position={position} scale={[height * aspect, height, 1]} renderOrder={10}>
      <spriteMaterial map={texture} transparent depthTest={false} />
    </sprite>
  )
}
