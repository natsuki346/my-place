'use client'

import { useEffect, useRef, useState } from 'react'
import { useWorldStore } from '@/store/useWorldStore'

// ── Emotion colors ────────────────────────────────────────────────────────────

const EMOTION_COLORS = [
  { value: '#a78bfa', label: '穏やか' },
  { value: '#60a5fa', label: '嬉しい' },
  { value: '#34d399', label: '清々しい' },
  { value: '#f87171', label: '切ない' },
  { value: '#fbbf24', label: '高揚' },
]

// ── Time themes ───────────────────────────────────────────────────────────────

const TIME_THEMES = {
  dawn:    { hours:[5,6,7],                  bg1:'#fde8d0',bg2:'#f9c784',wall1:'#f0d5b0',wall2:'#e8c898',floor1:'#f5e8d5',floor2:'#f0e0c8',light:'#fde68a',accent:'#f97316',label:'朝焼け' },
  morning: { hours:[8,9,10,11],              bg1:'#e8f4fd',bg2:'#bfdbfe',wall1:'#dbeafe',wall2:'#bfdbfe',floor1:'#eff6ff',floor2:'#e0f2fe',light:'#7dd3fc',accent:'#0ea5e9',label:'清々しい朝' },
  noon:    { hours:[12,13,14,15],            bg1:'#fefce8',bg2:'#fde68a',wall1:'#fef9c3',wall2:'#fde68a',floor1:'#fffbeb',floor2:'#fef3c7',light:'#fbbf24',accent:'#f59e0b',label:'明るい昼' },
  evening: { hours:[16,17,18,19],            bg1:'#fef3c7',bg2:'#fdba74',wall1:'#fed7aa',wall2:'#fdba74',floor1:'#fff7ed',floor2:'#fde8d0',light:'#fb923c',accent:'#ea580c',label:'夕暮れ' },
  night:   { hours:[20,21,22,23,0,1,2,3,4], bg1:'#1e1b4b',bg2:'#312e81',wall1:'#1e1b4b',wall2:'#1a1740',floor1:'#1e1b4b',floor2:'#17144a',light:'#818cf8',accent:'#818cf8',label:'静かな夜' },
} as const

type ThemeBase = {
  bg1:string; bg2:string; wall1:string; wall2:string
  floor1:string; floor2:string; light:string; accent:string; label:string
}

const HOUR_THEME: ThemeBase[] = Array.from({ length: 24 }, (_, h) => {
  const src =
    Object.values(TIME_THEMES).find(t => (t.hours as readonly number[]).includes(h)) ??
    TIME_THEMES.night
  const { bg1, bg2, wall1, wall2, floor1, floor2, light, accent, label } = src
  return { bg1, bg2, wall1, wall2, floor1, floor2, light, accent, label }
})

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}

function lerpHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a)
  const [br, bg, bb] = hexToRgb(b)
  const r  = Math.round(ar + (br - ar) * t)
  const g  = Math.round(ag + (bg - ag) * t)
  const bl = Math.round(ab + (bb - ab) * t)
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${bl.toString(16).padStart(2,'0')}`
}

const COLOR_KEYS = ['bg1','bg2','wall1','wall2','floor1','floor2','light','accent'] as const

function getTheme(hour: number, minute: number): ThemeBase {
  const cur = HOUR_THEME[hour]
  const nxt = HOUR_THEME[(hour + 1) % 24]
  const t   = minute / 60
  const result = { ...cur }
  for (const k of COLOR_KEYS) result[k] = lerpHex(cur[k], nxt[k], t)
  return result
}

// ── Component ─────────────────────────────────────────────────────────────────

type Props = { onSoulmateClick?: () => void }

export function RoomCanvas({ onSoulmateClick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const posts     = useWorldStore((s) => s.posts)
  const addPost   = useWorldStore((s) => s.addPost)

  const [editMode,      setEditMode]      = useState(false)
  const [modalOpen,     setModalOpen]     = useState(false)
  const [postText,      setPostText]      = useState('')
  const [selectedColor, setSelectedColor] = useState(EMOTION_COLORS[0].value)
  const [currentHour,   setCurrentHour]   = useState(() => new Date().getHours())

  useEffect(() => {
    const id = setInterval(() => setCurrentHour(new Date().getHours()), 60_000)
    return () => clearInterval(id)
  }, [])

  // Stable refs for RAF closure
  const postsRef     = useRef(posts)
  postsRef.current   = posts
  const onClickRef   = useRef(onSoulmateClick)
  onClickRef.current = onSoulmateClick
  const soulmateHit  = useRef({ x: 0, y: 0, r: 30 })

  const handlePost = () => {
    const text = postText.trim()
    if (!text) return
    addPost({
      id: Date.now().toString(),
      text,
      color: selectedColor,
      x: 120 + Math.random() * 360,
      y: 140 + Math.random() * 130,
    })
    setPostText('')
    setSelectedColor(EMOTION_COLORS[0].value)
    setModalOpen(false)
  }

  // ── Canvas RAF loop ────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId = 0

    const resize = () => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const { x, y, r } = soulmateHit.current
      if (Math.hypot(mx - x, my - y) < r) onClickRef.current?.()
    }
    canvas.addEventListener('click', handleClick)

    const draw = (t: number) => {
      const W = canvas.width
      const H = canvas.height
      if (!W || !H) { animId = requestAnimationFrame(draw); return }

      // Per-frame theme interpolation
      const now   = new Date()
      const theme = getTheme(now.getHours(), now.getMinutes())

      // Background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H)
      bgGrad.addColorStop(0, theme.bg1)
      bgGrad.addColorStop(1, theme.bg2)
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, W, H)

      // Layout
      const cx      = W / 2
      const floorY  = H * 0.63
      const floorHW = Math.min(Math.floor(W * 0.44), 200)
      const floorHD = Math.min(Math.floor(H * 0.17), 110)
      const wallH   = Math.min(Math.floor(H * 0.40), 230)

      // Floor diamond vertices
      const FL = { x: cx - floorHW, y: floorY }
      const FR = { x: cx + floorHW, y: floorY }
      const FB = { x: cx,           y: floorY + floorHD }
      const BK = { x: cx,           y: floorY - floorHD }

      // Wall top vertices
      const TL = { x: FL.x, y: FL.y - wallH }
      const TR = { x: FR.x, y: FR.y - wallH }
      const TC = { x: BK.x, y: BK.y - wallH }

      // Walls & floor
      fillPoly(ctx, [FL, BK, TC, TL], theme.wall1)  // left wall
      fillPoly(ctx, [BK, FR, TR, TC], theme.wall2)  // right wall
      fillPoly(ctx, [FL, BK, FR, FB], theme.floor1) // floor

      // Edge lines
      ctx.strokeStyle = 'rgba(0,0,0,0.10)'
      ctx.lineWidth = 1
      strokeLine(ctx, BK, TC)
      strokeLine(ctx, BK, FL)
      strokeLine(ctx, BK, FR)

      // ── Window (right wall) ────────────────────────────────────────
      drawWindow(ctx, BK, FR, TR, TC, theme)

      // ── Bookshelf (left wall) ──────────────────────────────────────
      const bsX = FL.x + (BK.x - FL.x) * 0.18
      const bsY = FL.y + (BK.y - FL.y) * 0.18 - 72
      const bsW = Math.max(50, W * 0.12)
      const bsH = bsW * 1.28
      ctx.fillStyle = '#2a1f4a'
      ctx.fillRect(bsX, bsY, bsW, bsH)
      ctx.strokeStyle = '#6d28d9'
      ctx.lineWidth = 1
      ctx.strokeRect(bsX, bsY, bsW, bsH)
      ctx.strokeStyle = 'rgba(139,92,246,0.22)'
      ctx.lineWidth = 0.7
      for (let i = 1; i <= 2; i++) {
        const ly = bsY + bsH * (i / 3)
        ctx.beginPath(); ctx.moveTo(bsX, ly); ctx.lineTo(bsX + bsW, ly); ctx.stroke()
      }
      const bookColors = ['#f87171', '#60a5fa', '#34d399', '#fbbf24', '#a78bfa']
      for (let sh = 0; sh < 3; sh++) {
        let bx = bsX + 3
        const by = bsY + bsH * (sh / 3) + 4
        for (let b = 0; b < 3; b++) {
          ctx.fillStyle = bookColors[(sh * 3 + b) % bookColors.length]
          const bw2 = 6 + (b % 2) * 3
          ctx.fillRect(bx, by, bw2, bsH / 3 - 8)
          bx += bw2 + 2
        }
      }

      // ── Plant (right wall) ─────────────────────────────────────────
      const plX = BK.x + (FR.x - BK.x) * 0.22
      const plY = BK.y + (FR.y - BK.y) * 0.22
      ctx.fillStyle = '#3a2a18'
      ctx.beginPath()
      ctx.moveTo(plX - 10, plY); ctx.lineTo(plX + 10, plY)
      ctx.lineTo(plX + 8, plY + 16); ctx.lineTo(plX - 8, plY + 16)
      ctx.closePath(); ctx.fill()
      ctx.fillStyle = '#1e3a18'
      for (const [ox, oy, r2] of [[-8, -20, 12], [8, -20, 12], [0, -28, 14]] as [number,number,number][]) {
        ctx.beginPath(); ctx.arc(plX + ox, plY + oy, r2, 0, Math.PI * 2); ctx.fill()
      }

      // ── Post bubbles ───────────────────────────────────────────────
      const curPosts = postsRef.current
      const roomTop  = TC.y + 10
      const driftMax = floorY + floorHD - roomTop

      for (let i = 0; i < curPosts.length; i++) {
        const post  = curPosts[i]
        const px    = Math.max(55, Math.min(W - 55, post.x * (W / 600)))
        const drift = (t * 0.016 + i * (driftMax / Math.max(curPosts.length, 1))) % driftMax
        const rawY  = floorY + floorHD - 18 - drift + Math.sin(t * 0.0009 + i * 1.8) * 7
        const py    = Math.max(roomTop + 14, Math.min(H - 36, rawY))
        drawBubble(ctx, px, py, post.text, post.color)
      }

      // ── Soulmate AI (floor center-right, sin-wave bob) ─────────────
      const sx = Math.min(cx + floorHW * 0.42, W - 42)
      const sy = floorY + floorHD * 0.25 + Math.sin(t * 0.0014) * 5
      soulmateHit.current = { x: sx, y: sy, r: 30 }
      drawSoulmateIcon(ctx, sx, sy)

      animId = requestAnimationFrame(draw)
    }

    animId = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animId)
      ro.disconnect()
      canvas.removeEventListener('click', handleClick)
    }
  }, [])

  const themeLabel = HOUR_THEME[currentHour].label

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div
      className="relative flex flex-col h-full select-none"
      style={{ background: '#0a0812', fontFamily: 'system-ui, sans-serif' }}
    >
      {/* Header */}
      <header
        className="flex items-center justify-between px-4 flex-shrink-0"
        style={{ height: '44px', background: '#0d0a1a' }}
      >
        <span style={{ color: '#a78bfa', fontSize: '13px', letterSpacing: '2px', fontWeight: 500 }}>
          my room
        </span>
        <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>
          {themeLabel}
        </span>
        <button
          onClick={() => setEditMode((v) => !v)}
          className="transition-opacity"
          style={{ fontSize: '18px', opacity: editMode ? 1 : 0.4 }}
          title="家具アレンジ"
        >
          🪄
        </button>
      </header>

      {/* Canvas */}
      <div className="relative flex-1 min-h-0">
        <canvas ref={canvasRef} className="block w-full h-full" />
      </div>

      {/* Post bar */}
      <button
        onClick={() => setModalOpen(true)}
        className="flex-shrink-0 flex items-center px-4 w-full text-left"
        style={{
          height: '48px',
          background: '#0d0a1a',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          color: 'rgba(255,255,255,0.28)',
          fontSize: '13px',
        }}
      >
        ＋ 気持ちをひとこと…
      </button>

      {/* ── Post modal (slide-up) ──────────────────────────────────── */}
      <div
        className="absolute inset-0 z-50 flex items-end transition-colors duration-200"
        style={{
          background: modalOpen ? 'rgba(0,0,0,0.6)' : 'transparent',
          pointerEvents: modalOpen ? 'auto' : 'none',
        }}
        onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false) }}
      >
        <div
          className="w-full space-y-4 transition-transform duration-300 ease-out"
          style={{
            background: '#0d0a1a',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px 20px 0 0',
            padding: '20px 20px 32px',
            transform: modalOpen ? 'translateY(0)' : 'translateY(100%)',
          }}
        >
          {/* Drag handle */}
          <div className="flex justify-center -mt-2 mb-1">
            <div className="w-8 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
          </div>

          {/* Emotion color picker */}
          <div className="flex items-center gap-3">
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>感情</span>
            {EMOTION_COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => setSelectedColor(c.value)}
                title={c.label}
                className="transition-transform active:scale-95"
                style={{
                  width: '32px', height: '32px',
                  borderRadius: '50%',
                  background: c.value,
                  boxShadow: selectedColor === c.value
                    ? `0 0 0 2px #0d0a1a, 0 0 0 4px ${c.value}`
                    : 'none',
                }}
              />
            ))}
          </div>

          {/* Text input — only mounted when open to allow autoFocus */}
          {modalOpen && (
            <textarea
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              placeholder="今の気持ちを書いて..."
              rows={3}
              autoFocus
              className="w-full resize-none outline-none transition-colors"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '12px 16px',
                fontSize: '14px',
                color: '#fff',
                lineHeight: '1.5',
              }}
              onFocus={(e) =>
                (e.currentTarget.style.borderColor = 'rgba(83,74,183,0.6)')
              }
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')
              }
            />
          )}

          {/* Submit button */}
          <button
            onClick={handlePost}
            disabled={!postText.trim()}
            className="w-full font-semibold transition-opacity disabled:opacity-30"
            style={{
              background: '#534ab7',
              borderRadius: '24px',
              padding: '12px',
              fontSize: '14px',
              color: '#fff',
            }}
          >
            投稿する
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Pure canvas helpers ───────────────────────────────────────────────────────

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

function bilerp(u: number, v: number, tl: Pt, tr: Pt, bl: Pt, br: Pt): Pt {
  const topX = tl.x + (tr.x - tl.x) * u
  const topY = tl.y + (tr.y - tl.y) * u
  const botX = bl.x + (br.x - bl.x) * u
  const botY = bl.y + (br.y - bl.y) * u
  return { x: topX + (botX - topX) * v, y: topY + (botY - topY) * v }
}

function drawWindow(
  ctx: CanvasRenderingContext2D,
  BK: Pt, FR: Pt, TR: Pt, TC: Pt,
  theme: { light: string; accent: string },
) {
  // Window occupies u=0.18–0.52, v=0.12–0.58 on the right wall surface
  // Right wall quad: tl=TC, tr=TR, bl=BK, br=FR
  const u0 = 0.18, u1 = 0.52, v0 = 0.12, v1 = 0.58
  const wTL = bilerp(u0, v0, TC, TR, BK, FR)
  const wTR = bilerp(u1, v0, TC, TR, BK, FR)
  const wBR = bilerp(u1, v1, TC, TR, BK, FR)
  const wBL = bilerp(u0, v1, TC, TR, BK, FR)

  // Sky gradient clipped to window shape
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(wTL.x, wTL.y)
  ctx.lineTo(wTR.x, wTR.y)
  ctx.lineTo(wBR.x, wBR.y)
  ctx.lineTo(wBL.x, wBL.y)
  ctx.closePath()
  ctx.clip()
  const minX = Math.min(wTL.x, wTR.x, wBL.x, wBR.x) - 2
  const minY = Math.min(wTL.y, wTR.y, wBL.y, wBR.y) - 2
  const maxX = Math.max(wTL.x, wTR.x, wBL.x, wBR.x) + 2
  const maxY = Math.max(wTL.y, wTR.y, wBL.y, wBR.y) + 2
  const skyGrad = ctx.createLinearGradient(0, minY, 0, maxY)
  skyGrad.addColorStop(0, theme.light)
  skyGrad.addColorStop(1, theme.accent)
  ctx.fillStyle = skyGrad
  ctx.fillRect(minX, minY, maxX - minX, maxY - minY)
  ctx.restore()

  // Window frame
  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(wTL.x, wTL.y)
  ctx.lineTo(wTR.x, wTR.y)
  ctx.lineTo(wBR.x, wBR.y)
  ctx.lineTo(wBL.x, wBL.y)
  ctx.closePath()
  ctx.stroke()
  ctx.restore()

  // Light shaft from window bottom into room
  ctx.save()
  const shaftCx = (wBL.x + wBR.x) / 2
  const shaftCy = (wBL.y + wBR.y) / 2
  const shaftGrad = ctx.createLinearGradient(shaftCx, shaftCy, shaftCx - 20, shaftCy + 85)
  shaftGrad.addColorStop(0, theme.light + '55')
  shaftGrad.addColorStop(1, theme.light + '00')
  ctx.fillStyle = shaftGrad
  ctx.beginPath()
  ctx.moveTo(wBL.x, wBL.y)
  ctx.lineTo(wBR.x, wBR.y)
  ctx.lineTo(wBR.x - 10, wBR.y + 90)
  ctx.lineTo(wBL.x - 45, wBL.y + 90)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function drawBubble(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  text: string, color: string,
) {
  ctx.save()
  ctx.font = '11px system-ui, sans-serif'
  const maxW   = 110
  const pad    = 8
  const dotR   = 4
  const dotGap = 6
  const tw     = Math.min(ctx.measureText(text).width, maxW)
  const bw     = tw + pad * 2 + dotR * 2 + dotGap
  const bh     = 13 + pad * 2

  // White background
  ctx.fillStyle = 'rgba(255,255,255,0.82)'
  roundRect(ctx, x - bw / 2, y - bh / 2, bw, bh, 9)
  ctx.fill()

  // Colored border
  ctx.strokeStyle = color + '88'
  ctx.lineWidth = 1.5
  roundRect(ctx, x - bw / 2, y - bh / 2, bw, bh, 9)
  ctx.stroke()

  // Left color dot
  const dotX = x - bw / 2 + pad + dotR
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(dotX, y, dotR, 0, Math.PI * 2)
  ctx.fill()

  // Dark text
  ctx.fillStyle = '#333'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x - bw / 2 + pad + dotR * 2 + dotGap, y, maxW)
  ctx.restore()
}

function drawSoulmateIcon(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const r = 24

  const grd = ctx.createRadialGradient(x, y, 0, x, y, r * 2.4)
  grd.addColorStop(0, 'rgba(83,74,183,0.5)')
  grd.addColorStop(1, 'rgba(83,74,183,0)')
  ctx.beginPath(); ctx.arc(x, y, r * 2.4, 0, Math.PI * 2)
  ctx.fillStyle = grd; ctx.fill()

  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = '#534ab7'; ctx.fill()

  ctx.fillStyle = '#fff'
  ctx.font = 'bold 10px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('AI', x, y)
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
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
