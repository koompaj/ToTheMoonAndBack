// OWNER: 3D workstream.
// Text label drawn to a canvas and shown as a sprite that always faces the camera.
// Use this instead of drei's <Html>: under React 19, <Html> logs "Attempted to synchronously
// unmount a root" errors, and drei's <Text> fetches a font from the network at runtime.
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

const PX = 64 // canvas height in pixels

export function Label({
  text,
  position,
  color = '#8b9bb0',
  height = 0.6,
}: {
  text: string
  position: [number, number, number]
  color?: string
  height?: number
}) {
  const { texture, aspect } = useMemo(() => {
    const font = '44px system-ui, -apple-system, "Segoe UI", sans-serif'
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    ctx.font = font
    const width = Math.ceil(ctx.measureText(text).width) + 16
    canvas.width = width
    canvas.height = PX
    ctx.font = font // resizing the canvas resets its state
    ctx.fillStyle = color
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 8, PX / 2 + 2)
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    return { texture, aspect: width / PX }
  }, [text, color])

  useEffect(() => () => texture.dispose(), [texture])

  return (
    <sprite position={position} scale={[height * aspect, height, 1]}>
      <spriteMaterial map={texture} transparent depthTest={false} />
    </sprite>
  )
}
