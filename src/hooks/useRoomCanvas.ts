'use client'

import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

type Post = {
  id: string
  text: string
  color: string
  x: number
  y: number
}

export function useRoomCanvas(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  posts: Post[],
  onSoulmateClick?: () => void,
) {
  const postsRef = useRef(posts)
  postsRef.current = posts
  const soulmateClickRef = useRef(onSoulmateClick)
  soulmateClickRef.current = onSoulmateClick
  const soulmatePos = useRef({ x: 0, y: 0, r: 32 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId = 0

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const { x, y, r } = soulmatePos.current
      if (Math.hypot(mx - x, my - y) < r) soulmateClickRef.current?.()
    }
    canvas.addEventListener('click', handleClick)

    const draw = (t: number) => {
      const W = canvas.width
      const H = canvas.height
      if (W === 0 || H === 0) { animId = requestAnimationFrame(draw); return }

      ctx.fillStyle = '#0d0a1a'
      ctx.fillRect(0, 0, W, H)

      // Key points for the isometric corner room
      const TL = { x: W * 0.04, y: H * 0.20 }
      const TC = { x: W * 0.50, y: H * 0.06 }
      const TR = { x: W * 0.96, y: H * 0.20 }
      const ML = { x: W * 0.04, y: H * 0.66 }
      const MC = { x: W * 0.50, y: H * 0.44 }
      const MR = { x: W * 0.96, y: H * 0.66 }
      const BC = { x: W * 0.50, y: H * 0.91 }

      // Left wall
      fillPoly(ctx, [TL, TC, MC, ML], '#251a40')
      // Right wall
      fillPoly(ctx, [TC, TR, MR, MC], '#1e1535')
      // Floor
      fillPoly(ctx, [ML, MC, MR, BC], '#120d28')

      // Edge lines between surfaces
      ctx.strokeStyle = 'rgba(139,92,246,0.18)'
      ctx.lineWidth = 1
      strokeLine(ctx, TC, MC)
      strokeLine(ctx, MC, BC)
      strokeLine(ctx, ML, MC)
      strokeLine(ctx, MC, MR)

      // Floor grid
      drawFloorGrid(ctx, ML, MC, MR, BC, 5)

      // Bookshelf on left wall
      drawBox3D(ctx,
        W * 0.09, H * 0.36,
        W * 0.15, H * 0.22,
        W * 0.045, H * 0.03,
        '#3b2868', '#4e3888', '#271856',
      )

      // Desk on floor (right side)
      drawBox3D(ctx,
        W * 0.54, H * 0.60,
        W * 0.22, H * 0.055,
        W * 0.065, H * 0.038,
        '#3b2868', '#4e3888', '#271856',
      )

      // Post bubbles
      for (const post of postsRef.current) {
        const px = post.x * (W / 600)
        const py = post.y * (H / 420) + Math.sin(t * 0.0009 + Number(post.id) * 1.7) * 9
        drawBubble(ctx, px, py, post.text, post.color)
      }

      // Soulmate AI icon (sin-wave float)
      const sx = W * 0.87
      const sy = H * 0.80 + Math.sin(t * 0.0014) * 7
      soulmatePos.current = { x: sx, y: sy, r: 32 }
      drawSoulmateIcon(ctx, sx, sy)

      animId = requestAnimationFrame(draw)
    }

    animId = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animId)
      ro.disconnect()
      canvas.removeEventListener('click', handleClick)
    }
  }, [canvasRef])
}

// ── helpers ──────────────────────────────────────────────────────────────────

type Pt = { x: number; y: number }

function fillPoly(ctx: CanvasRenderingContext2D, pts: Pt[], color: string) {
  ctx.beginPath()
  ctx.moveTo(pts[0].x, pts[0].y)
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
}

function strokeLine(ctx: CanvasRenderingContext2D, a: Pt, b: Pt) {
  ctx.beginPath()
  ctx.moveTo(a.x, a.y)
  ctx.lineTo(b.x, b.y)
  ctx.stroke()
}

function drawFloorGrid(
  ctx: CanvasRenderingContext2D,
  ML: Pt, MC: Pt, MR: Pt, BC: Pt,
  steps: number,
) {
  ctx.save()
  ctx.strokeStyle = 'rgba(139,92,246,0.07)'
  ctx.lineWidth = 0.5
  for (let i = 1; i < steps; i++) {
    const t = i / steps
    // Lines from ML-MC side to MR-BC side
    const ax = ML.x + (MC.x - ML.x) * t
    const ay = ML.y + (MC.y - ML.y) * t
    const bx = BC.x + (MR.x - BC.x) * (1 - t)
    const by = BC.y + (MR.y - BC.y) * (1 - t)
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke()
    // Lines from ML-BC side to MC-MR side
    const cx2 = ML.x + (BC.x - ML.x) * t
    const cy2 = ML.y + (BC.y - ML.y) * t
    const dx = MC.x + (MR.x - MC.x) * t
    const dy = MC.y + (MR.y - MC.y) * t
    ctx.beginPath(); ctx.moveTo(cx2, cy2); ctx.lineTo(dx, dy); ctx.stroke()
  }
  ctx.restore()
}

function drawBox3D(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  dx: number, dy: number,
  front: string, top: string, side: string,
) {
  // Front face
  ctx.fillStyle = front
  ctx.fillRect(x, y, w, h)

  // Top face
  fillPoly(ctx, [
    { x, y },
    { x: x + dx, y: y - dy },
    { x: x + w + dx, y: y - dy },
    { x: x + w, y },
  ], top)

  // Right side face
  fillPoly(ctx, [
    { x: x + w, y },
    { x: x + w + dx, y: y - dy },
    { x: x + w + dx, y: y + h - dy },
    { x: x + w, y: y + h },
  ], side)

  // Thin shelf lines on front face
  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'
  ctx.lineWidth = 0.5
  for (let i = 1; i <= 2; i++) {
    const sy = y + h * (i / 3)
    ctx.beginPath(); ctx.moveTo(x, sy); ctx.lineTo(x + w, sy); ctx.stroke()
  }
  ctx.restore()
}

function drawBubble(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  text: string, color: string,
) {
  ctx.save()
  ctx.font = '12px sans-serif'
  const maxW = 130
  const pad = 10
  const tw = Math.min(ctx.measureText(text).width, maxW)
  const bw = tw + pad * 2
  const bh = 14 + pad * 2

  ctx.globalAlpha = 0.78
  ctx.fillStyle = color
  roundRect(ctx, x - bw / 2, y - bh / 2, bw, bh, 10)
  ctx.fill()

  ctx.globalAlpha = 1
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x, y, maxW)
  ctx.restore()
}

function drawSoulmateIcon(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const r = 28

  // Outer glow
  const grd = ctx.createRadialGradient(x, y, 0, x, y, r * 2.4)
  grd.addColorStop(0, 'rgba(139,92,246,0.42)')
  grd.addColorStop(1, 'rgba(139,92,246,0)')
  ctx.beginPath()
  ctx.arc(x, y, r * 2.4, 0, Math.PI * 2)
  ctx.fillStyle = grd
  ctx.fill()

  // Circle body
  const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r)
  grad.addColorStop(0, '#a06ef5')
  grad.addColorStop(1, '#6d28d9')
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = grad
  ctx.fill()

  ctx.font = '18px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('💬', x, y)
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}
