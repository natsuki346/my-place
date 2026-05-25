'use client'

import { useEffect, useRef, useState } from 'react'
import { Heart } from 'lucide-react'
import { useWorldStore } from '@/store/useWorldStore'
import { SHOP_AVATARS } from '@/constants/avatars'
import { SkyLayer } from '@/components/room/SkyLayer'

// ── Post bubble (HTML overlay with CSS float-up animation) ────────────────────

type Post = { id: string; text: string; color: string; x: number; y: number }

function PostBubble({ post, onExpire }: { post: Post; onExpire: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onExpire(post.id), 30_000)
    return () => clearTimeout(timer)
  }, [post.id, onExpire])

  return (
    <div
      style={{
        position: 'absolute',
        left: `${(post.x / 600) * 100}%`,
        bottom: '32%',
        animation: 'floatUp 30s linear forwards',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px 6px 8px',
          background: 'rgba(255,255,255,0.82)',
          border: `1.5px solid ${post.color}88`,
          borderRadius: '20px',
          fontSize: '11px',
          color: '#333',
          maxWidth: '130px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          transform: 'translateX(-50%)',
        }}
      >
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: post.color, flexShrink: 0 }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{post.text}</span>
      </div>
    </div>
  )
}

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
  dawn:    { hours:[5,6,7],                  bg1:'#d8eeff',bg2:'#b8ddf5',wall1:'#c8e8f8',wall2:'#b0d8f0',floor1:'#dff0fb',floor2:'#c8e4f5',light:'#90d0f0',accent:'#38a8e0',label:'清々しい朝' },
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

export type ThemeColors = { bg1: string; bg2: string; accent: string }
export function getCurrentThemeColors(): ThemeColors {
  const now = new Date()
  const t   = getTheme(now.getHours(), now.getMinutes())
  return { bg1: t.bg1, bg2: t.bg2, accent: t.accent }
}

// ── Component ─────────────────────────────────────────────────────────────────

type Props = { onAvatarClick?: () => void }

export function RoomCanvas({ onAvatarClick }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const posts      = useWorldStore((s) => s.posts)
  const addPost    = useWorldStore((s) => s.addPost)
  const removePost = useWorldStore((s) => s.removePost)

  const [modalOpen,     setModalOpen]     = useState(false)
  const [postText,      setPostText]      = useState('')
  const [selectedColor, setSelectedColor] = useState(EMOTION_COLORS[0].value)
  const [currentHour,   setCurrentHour]   = useState(() => new Date().getHours())
  const [xform,         setXform]         = useState({ scale: 1, tx: 0, ty: 0 })

  useEffect(() => {
    const id = setInterval(() => setCurrentHour(new Date().getHours()), 60_000)
    return () => clearInterval(id)
  }, [])

  // Stable refs
  const soulmateHit     = useRef({ x: 0, y: 0, r: 30 })
  const onAvatarClickRef = useRef(onAvatarClick)
  onAvatarClickRef.current = onAvatarClick

  // Transform ref — live values without re-render cost inside touch handlers
  const xformRef = useRef({ scale: 1, tx: 0, ty: 0 })

  // Selected avatar (sync to ref so RAF closure stays current)
  const selectedAvatarId    = useWorldStore((s) => s.selectedAvatarId)
  const selectedAvatarIdRef = useRef<number | null>(null)
  selectedAvatarIdRef.current = selectedAvatarId

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

  // ── Pinch / Pan ───────────────────────────────────────────────────────────
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return

    let lastTap    = 0
    let pinchDist0 = 0
    let pinchScale0 = 1
    let panX0 = 0, panY0 = 0, panTx0 = 0, panTy0 = 0
    let isPinching = false, isPanning = false

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        isPinching  = true
        isPanning   = false
        pinchDist0  = Math.hypot(
          e.touches[1].clientX - e.touches[0].clientX,
          e.touches[1].clientY - e.touches[0].clientY,
        )
        pinchScale0 = xformRef.current.scale
      } else if (e.touches.length === 1) {
        const now = Date.now()
        if (now - lastTap < 280) {
          // Double-tap → reset
          xformRef.current = { scale: 1, tx: 0, ty: 0 }
          setXform({ scale: 1, tx: 0, ty: 0 })
          lastTap = 0
          return
        }
        lastTap   = now
        isPanning = true
        isPinching = false
        panX0  = e.touches[0].clientX
        panY0  = e.touches[0].clientY
        panTx0 = xformRef.current.tx
        panTy0 = xformRef.current.ty
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      if (e.touches.length === 2 && isPinching) {
        const dist = Math.hypot(
          e.touches[1].clientX - e.touches[0].clientX,
          e.touches[1].clientY - e.touches[0].clientY,
        )
        const newScale = Math.min(2.0, Math.max(0.6, pinchScale0 * (dist / pinchDist0)))
        xformRef.current = { ...xformRef.current, scale: newScale }
        setXform({ ...xformRef.current })
      } else if (e.touches.length === 1 && isPanning) {
        const dx = e.touches[0].clientX - panX0
        const dy = e.touches[0].clientY - panY0
        xformRef.current = { ...xformRef.current, tx: panTx0 + dx, ty: panTy0 + dy }
        setXform({ ...xformRef.current })
      }
    }

    const onTouchEnd = () => {
      isPinching = false
      isPanning  = false
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove',  onTouchMove,  { passive: false })
    el.addEventListener('touchend',   onTouchEnd)
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove',  onTouchMove)
      el.removeEventListener('touchend',   onTouchEnd)
    }
  }, [])

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

    // Normalize click coordinates accounting for CSS scale on wrapper
    const handleClick = (e: MouseEvent) => {
      const rect   = canvas.getBoundingClientRect()
      const scaleX = canvas.width  / rect.width
      const scaleY = canvas.height / rect.height
      const mx = (e.clientX - rect.left) * scaleX
      const my = (e.clientY - rect.top)  * scaleY
      const { x, y, r } = soulmateHit.current
      if (Math.hypot(mx - x, my - y) < r) onAvatarClickRef.current?.()
    }
    canvas.addEventListener('click', handleClick)

    const draw = (t: number) => {
      const W = canvas.width
      const H = canvas.height
      if (!W || !H) { animId = requestAnimationFrame(draw); return }

      const now   = new Date()
      const theme = getTheme(now.getHours(), now.getMinutes())

      ctx.clearRect(0, 0, W, H)

      // Layout
      const cx      = W / 2
      const floorY  = H * 0.65
      const floorHW = Math.min(Math.floor(W * 0.48), 185)
      const floorHD = Math.min(Math.floor(H * 0.16), 106)
      const wallH   = Math.min(Math.floor(H * 0.29), 182)

      const FL = { x: cx - floorHW, y: floorY }
      const FR = { x: cx + floorHW, y: floorY }
      const FB = { x: cx,           y: floorY + floorHD }
      const BK = { x: cx,           y: floorY - floorHD }
      const TL = { x: FL.x, y: FL.y - wallH }
      const TR = { x: FR.x, y: FR.y - wallH }
      const TC = { x: BK.x, y: BK.y - wallH }

      fillPoly(ctx, [FL, BK, TC, TL], theme.wall1)
      fillPoly(ctx, [BK, FR, TR, TC], theme.wall2)
      fillPoly(ctx, [FL, BK, FR, FB], theme.floor1)

      ctx.strokeStyle = 'rgba(0,0,0,0.10)'
      ctx.lineWidth = 1
      strokeLine(ctx, BK, TC)
      strokeLine(ctx, BK, FL)
      strokeLine(ctx, BK, FR)

      // AI avatar (floor center-right, sin-wave bob)
      const sx = Math.min(cx + floorHW * 0.42, W - 42)
      const sy = floorY + floorHD * 0.25 + Math.sin(t * 0.0014) * 5
      soulmateHit.current = { x: sx, y: sy, r: 32 }
      const selectedAvatar = SHOP_AVATARS.find(a => a.id === selectedAvatarIdRef.current)
      drawAIAvatar(ctx, sx, sy, selectedAvatar?.emoji)

      animId = requestAnimationFrame(draw)
    }

    animId = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animId)
      ro.disconnect()
      canvas.removeEventListener('click', handleClick)
    }
  }, [])

  const fabPeriod =
    currentHour >= 5  && currentHour < 11 ? 'morning' :
    currentHour >= 11 && currentHour < 17 ? 'afternoon' :
    currentHour >= 17 && currentHour < 22 ? 'evening' : 'night'

  const fabBg = {
    morning:   'bg-pink-400',
    afternoon: 'bg-pink-500',
    evening:   'bg-rose-500',
    night:     'bg-pink-600',
  }[fabPeriod]

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div
      className="relative flex flex-col h-full select-none"
      style={{ background: '#0a0812', fontFamily: 'system-ui, sans-serif' }}
    >
      {/* Canvas with pinch/pan wrapper */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        <style>{`
          @keyframes floatUp {
            0%   { transform: translateX(-50%) translateY(0);      opacity: 1; }
            80%  { transform: translateX(-50%) translateY(-250px); opacity: 1; }
            100% { transform: translateX(-50%) translateY(-300px); opacity: 0; }
          }
        `}</style>
        <SkyLayer hour={currentHour} />
        <div
          ref={wrapperRef}
          style={{
            position: 'relative',
            zIndex: 1,
            width: '100%',
            height: '100%',
            transform: `translate(${xform.tx}px, ${xform.ty}px) scale(${xform.scale})`,
            transformOrigin: 'center center',
            willChange: 'transform',
          }}
        >
          <canvas ref={canvasRef} className="block w-full h-full" />
        </div>

        {/* Post bubble overlay — floats above canvas, unaffected by pinch/pan */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none', overflow: 'hidden' }}>
          {posts.map((post) => (
            <PostBubble key={post.id} post={post} onExpire={removePost} />
          ))}
        </div>
      </div>

      {/* FAB — post button */}
      <button
        onClick={() => setModalOpen(true)}
        className={`flex items-center justify-center transition-transform active:scale-95 ${fabBg}`}
        style={{
          position: 'absolute',
          bottom: '16px',
          right: '16px',
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          color: '#fff',
          boxShadow: '0 4px 20px rgba(236,72,153,0.45)',
          zIndex: 10,
        }}
      >
        <Heart size={22} strokeWidth={2} fill="currentColor" />
      </button>

      {/* ── Post modal (centered fade-in) ─────────────────────────── */}
      {modalOpen && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.55)', animation: 'fadeIn 0.18s ease' }}
          onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false) }}
        >
          <style>{`@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }`}</style>
          <div
            className="w-full space-y-4"
            style={{
              maxWidth: '320px',
              margin: '0 16px',
              background: '#0d0a1a',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '20px',
              padding: '24px 20px 20px',
            }}
          >
            <p style={{ color: '#fff', fontSize: '15px', fontWeight: 600, textAlign: 'center' }}>
              今の気持ちは？
            </p>

            <textarea
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              placeholder="気持ちを書いて..."
              rows={2}
              autoFocus
              className="w-full resize-none outline-none"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '12px 14px',
                fontSize: '14px',
                color: '#fff',
                lineHeight: '1.5',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(83,74,183,0.6)')}
              onBlur={(e)  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
            />

            <div className="flex gap-2">
              <button
                onClick={() => { setModalOpen(false); setPostText('') }}
                className="flex-1 transition-opacity"
                style={{
                  borderRadius: '24px',
                  padding: '11px',
                  fontSize: '14px',
                  color: 'rgba(255,255,255,0.5)',
                  border: '1px solid rgba(255,255,255,0.12)',
                }}
              >
                キャンセル
              </button>
              <button
                onClick={handlePost}
                disabled={!postText.trim()}
                className="flex-1 font-semibold transition-opacity disabled:opacity-30"
                style={{
                  background: '#534ab7',
                  borderRadius: '24px',
                  padding: '11px',
                  fontSize: '14px',
                  color: '#fff',
                }}
              >
                投稿する
              </button>
            </div>
          </div>
        </div>
      )}

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

function drawAIAvatar(ctx: CanvasRenderingContext2D, x: number, y: number, selectedEmoji?: string) {
  const r = 28

  // Outer glow
  const grd = ctx.createRadialGradient(x, y, 0, x, y, r * 2.6)
  grd.addColorStop(0, 'rgba(167,139,250,0.38)')
  grd.addColorStop(1, 'rgba(83,74,183,0)')
  ctx.beginPath(); ctx.arc(x, y, r * 2.6, 0, Math.PI * 2)
  ctx.fillStyle = grd; ctx.fill()

  // Background circle
  const bgGrd = ctx.createRadialGradient(x - r * 0.22, y - r * 0.22, 0, x, y, r)
  bgGrd.addColorStop(0, '#b39dfa')
  bgGrd.addColorStop(1, '#6d28d9')
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = bgGrd; ctx.fill()

  ctx.save()
  // Clip subsequent drawing to circle
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip()

  if (selectedEmoji) {
    ctx.font = `${Math.round(r * 1.4)}px system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(selectedEmoji, x, y + 2)
  } else {
    // Human silhouette (Lucide User-style: head + shoulders)
    ctx.fillStyle = 'rgba(255,255,255,0.88)'
    // Head
    ctx.beginPath()
    ctx.arc(x, y - r * 0.30, r * 0.33, 0, Math.PI * 2)
    ctx.fill()
    // Shoulders / body — rounded trapezoid
    ctx.beginPath()
    ctx.moveTo(x - r * 0.58, y + r * 1.05)
    ctx.quadraticCurveTo(x - r * 0.58, y + r * 0.16, x - r * 0.30, y + r * 0.16)
    ctx.lineTo(x + r * 0.30, y + r * 0.16)
    ctx.quadraticCurveTo(x + r * 0.58, y + r * 0.16, x + r * 0.58, y + r * 1.05)
    ctx.closePath()
    ctx.fill()
  }

  ctx.restore()
}

