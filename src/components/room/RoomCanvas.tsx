'use client'

import { useEffect, useRef, useState } from 'react'
import { Heart } from 'lucide-react'
import { useWorldStore } from '@/store/useWorldStore'
import { SHOP_AVATARS } from '@/constants/avatars'
import { SkyLayer } from '@/components/room/SkyLayer'

// ── Post bubble ────────────────────────────────────────────────────────────────

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

// ── Item catalog ──────────────────────────────────────────────────────────────

type CatalogItem = { emoji: string; name: string }
type PlacedItem  = { id: string; emoji: string; x: number; y: number }

const CATALOG_TABS = ['家具', '植物', 'デコ'] as const
type CatalogTab = typeof CATALOG_TABS[number]

const CATALOG: Record<CatalogTab, CatalogItem[]> = {
  '家具': [
    { emoji: '🛋️', name: 'ソファ' },
    { emoji: '📺', name: 'テレビ' },
    { emoji: '🖥️', name: 'PC' },
    { emoji: '🛏️', name: 'ベッド' },
    { emoji: '📚', name: '本棚' },
    { emoji: '🎸', name: 'ギター' },
  ],
  '植物': [
    { emoji: '🌵', name: 'サボテン' },
    { emoji: '🪴', name: '観葉植物' },
    { emoji: '🌸', name: '桜' },
    { emoji: '🎋', name: '竹' },
  ],
  'デコ': [
    { emoji: '🖼️', name: '絵画' },
    { emoji: '🕯️', name: 'キャンドル' },
    { emoji: '🪞', name: '鏡' },
    { emoji: '⭐', name: '飾り' },
  ],
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

  const [modalOpen,       setModalOpen]       = useState(false)
  const [postText,        setPostText]        = useState('')
  const [selectedColor,   setSelectedColor]   = useState(EMOTION_COLORS[0].value)
  const [currentHour,     setCurrentHour]     = useState(() => new Date().getHours())
  const [xform,           setXform]           = useState({ scale: 1, tx: 0, ty: 0 })
  const [placedItems,     setPlacedItems]     = useState<PlacedItem[]>([])
  const [placingItem,     setPlacingItem]     = useState<CatalogItem | null>(null)
  const [catalogOpen,     setCatalogOpen]     = useState(false)
  const [catalogTab,      setCatalogTab]      = useState<CatalogTab>('家具')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  useEffect(() => {
    const id = setInterval(() => setCurrentHour(new Date().getHours()), 60_000)
    return () => clearInterval(id)
  }, [])

  // Stable refs
  const soulmateHit      = useRef({ x: 0, y: 0, r: 30 })
  const onAvatarClickRef = useRef(onAvatarClick)
  onAvatarClickRef.current = onAvatarClick
  const xformRef         = useRef({ scale: 1, tx: 0, ty: 0 })

  const selectedAvatarId    = useWorldStore((s) => s.selectedAvatarId)
  const selectedAvatarIdRef = useRef<number | null>(null)
  selectedAvatarIdRef.current = selectedAvatarId

  // Placement ref — live for canvas click handler ([] deps effect)
  const placingItemRef = useRef(placingItem)
  placingItemRef.current = placingItem

  // Item drag refs
  const itemActiveRef = useRef(false)
  const draggingIdRef = useRef<string | null>(null)
  const dragStartRef  = useRef<{ clientX: number; clientY: number; itemX: number; itemY: number } | null>(null)
  const isDraggingRef = useRef(false)
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

    let lastTap     = 0
    let pinchDist0  = 0
    let pinchScale0 = 1
    let panX0 = 0, panY0 = 0, panTx0 = 0, panTy0 = 0
    let isPinching = false, isPanning = false

    const onTouchStart = (e: TouchEvent) => {
      if (itemActiveRef.current) return
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
          xformRef.current = { scale: 1, tx: 0, ty: 0 }
          setXform({ scale: 1, tx: 0, ty: 0 })
          lastTap = 0
          return
        }
        lastTap    = now
        isPanning  = true
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

    const onTouchEnd = () => { isPinching = false; isPanning = false }

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

    const handleClick = (e: MouseEvent) => {
      const rect   = canvas.getBoundingClientRect()
      const scaleX = canvas.width  / rect.width
      const scaleY = canvas.height / rect.height
      const mx = (e.clientX - rect.left) * scaleX
      const my = (e.clientY - rect.top)  * scaleY

      if (placingItemRef.current) {
        setPlacedItems(prev => [...prev, {
          id: `${Date.now()}`,
          emoji: placingItemRef.current!.emoji,
          x: mx / canvas.width  * 100,
          y: my / canvas.height * 100,
        }])
        return
      }

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

  const periodAccent = {
    morning:   '#0ea5e9',
    afternoon: '#3b82f6',
    evening:   '#f97316',
    night:     '#818cf8',
  }[fabPeriod]

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div
      className="relative flex flex-col h-full select-none"
      style={{ background: '#0a0812', fontFamily: 'system-ui, sans-serif' }}
    >
      <style>{`
        @keyframes floatUp {
          0%   { transform: translateX(-50%) translateY(0);      opacity: 1; }
          80%  { transform: translateX(-50%) translateY(-250px); opacity: 1; }
          100% { transform: translateX(-50%) translateY(-300px); opacity: 0; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%) }
          to   { transform: translateY(0) }
        }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
      `}</style>

      {/* Canvas with pinch/pan wrapper */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        {/* Placement mode banner */}
        {placingItem && (
          <div
            style={{
              position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
              background: `${periodAccent}d0`,
              backdropFilter: 'blur(8px)',
              padding: '10px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              animation: 'fadeIn 0.15s ease',
            }}
          >
            <span style={{ fontSize: '13px', color: '#fff', fontWeight: 600 }}>
              {placingItem.emoji}　部屋の中をタップして配置
            </span>
            <button
              onClick={() => setPlacingItem(null)}
              style={{
                fontSize: '12px', color: '#fff',
                padding: '3px 12px',
                border: '1px solid rgba(255,255,255,0.5)',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.15)',
              }}
            >
              完了
            </button>
          </div>
        )}

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

          {/* Placed items — inside pan/zoom, draggable, long-press to delete */}
          {placedItems.map((item) => (
            <div
              key={item.id}
              style={{
                position: 'absolute',
                left: `${item.x}%`,
                top:  `${item.y}%`,
                transform: 'translate(-50%, -50%)',
                fontSize: '36px',
                lineHeight: 1,
                zIndex: 3,
                touchAction: 'none',
                userSelect: 'none',
                cursor: isDraggingRef.current && draggingIdRef.current === item.id ? 'grabbing' : 'grab',
              }}
              onPointerDown={(e) => {
                itemActiveRef.current = true
                e.currentTarget.setPointerCapture(e.pointerId)
                draggingIdRef.current = item.id
                dragStartRef.current  = { clientX: e.clientX, clientY: e.clientY, itemX: item.x, itemY: item.y }
                isDraggingRef.current = false
                pressTimerRef.current = setTimeout(() => {
                  if (!isDraggingRef.current) setDeleteConfirmId(item.id)
                }, 500)
              }}
              onPointerMove={(e) => {
                if (draggingIdRef.current !== item.id || !dragStartRef.current) return
                const dx = e.clientX - dragStartRef.current.clientX
                const dy = e.clientY - dragStartRef.current.clientY
                if (!isDraggingRef.current && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
                  isDraggingRef.current = true
                  if (pressTimerRef.current) { clearTimeout(pressTimerRef.current); pressTimerRef.current = null }
                }
                if (!isDraggingRef.current) return
                const wrapper = wrapperRef.current
                if (!wrapper) return
                const newX = dragStartRef.current.itemX + (dx / xformRef.current.scale) / wrapper.clientWidth  * 100
                const newY = dragStartRef.current.itemY + (dy / xformRef.current.scale) / wrapper.clientHeight * 100
                setPlacedItems(prev => prev.map(i =>
                  i.id === item.id
                    ? { ...i, x: Math.max(2, Math.min(98, newX)), y: Math.max(2, Math.min(98, newY)) }
                    : i
                ))
              }}
              onPointerUp={() => {
                itemActiveRef.current = false
                draggingIdRef.current = null
                dragStartRef.current  = null
                isDraggingRef.current = false
                if (pressTimerRef.current) { clearTimeout(pressTimerRef.current); pressTimerRef.current = null }
              }}
              onPointerCancel={() => {
                itemActiveRef.current = false
                draggingIdRef.current = null
                dragStartRef.current  = null
                isDraggingRef.current = false
                if (pressTimerRef.current) { clearTimeout(pressTimerRef.current); pressTimerRef.current = null }
              }}
            >
              {item.emoji}
            </div>
          ))}
        </div>

        {/* Post bubble overlay */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none', overflow: 'hidden' }}>
          {posts.map((post) => (
            <PostBubble key={post.id} post={post} onExpire={removePost} />
          ))}
        </div>
      </div>

      {/* ── 🔧 button (bottom-left) ──────────────────────────────── */}
      <button
        onClick={() => placingItem ? setPlacingItem(null) : setCatalogOpen(true)}
        className="flex items-center justify-center transition-transform active:scale-95"
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: placingItem ? periodAccent : 'rgba(255,255,255,0.82)',
          boxShadow: '0 2px 14px rgba(0,0,0,0.22)',
          fontSize: '22px',
          zIndex: 10,
          border: placingItem ? `2px solid ${periodAccent}` : 'none',
        }}
      >
        🔧
      </button>

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

      {/* ── Post modal ───────────────────────────────────────────── */}
      {modalOpen && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.55)', animation: 'fadeIn 0.18s ease' }}
          onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false) }}
        >
          <div
            className="w-full space-y-4"
            style={{
              maxWidth: '320px', margin: '0 16px',
              background: '#0d0a1a', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '20px', padding: '24px 20px 20px',
            }}
          >
            <p style={{ color: '#fff', fontSize: '15px', fontWeight: 600, textAlign: 'center' }}>今の気持ちは？</p>
            <textarea
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              placeholder="気持ちを書いて..."
              rows={2}
              autoFocus
              className="w-full resize-none outline-none"
              style={{
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px', padding: '12px 14px', fontSize: '14px', color: '#fff', lineHeight: '1.5',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(83,74,183,0.6)')}
              onBlur={(e)  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setModalOpen(false); setPostText('') }}
                className="flex-1 transition-opacity"
                style={{ borderRadius: '24px', padding: '11px', fontSize: '14px', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.12)' }}
              >
                キャンセル
              </button>
              <button
                onClick={handlePost}
                disabled={!postText.trim()}
                className="flex-1 font-semibold transition-opacity disabled:opacity-30"
                style={{ background: '#534ab7', borderRadius: '24px', padding: '11px', fontSize: '14px', color: '#fff' }}
              >
                投稿する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Catalog modal (bottom sheet) ─────────────────────────── */}
      {catalogOpen && (
        <div
          className="absolute inset-0 z-50"
          style={{ background: 'rgba(0,0,0,0.55)', animation: 'fadeIn 0.15s ease' }}
          onClick={(e) => { if (e.target === e.currentTarget) setCatalogOpen(false) }}
        >
          <div
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: '#1a1530', borderRadius: '20px 20px 0 0',
              maxHeight: '74%', display: 'flex', flexDirection: 'column',
              animation: 'slideUp 0.22s ease',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 8px' }}>
              <p style={{ color: '#fff', fontSize: '15px', fontWeight: 600 }}>アイテム図鑑</p>
              <button
                onClick={() => setCatalogOpen(false)}
                style={{ color: 'rgba(255,255,255,0.45)', fontSize: '22px', lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            {/* Category tabs */}
            <div style={{ display: 'flex', paddingLeft: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {CATALOG_TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setCatalogTab(tab)}
                  style={{
                    padding: '8px 20px', fontSize: '13px',
                    fontWeight: catalogTab === tab ? 600 : 400,
                    color: catalogTab === tab ? '#fff' : 'rgba(255,255,255,0.38)',
                    borderBottom: catalogTab === tab ? `2px solid ${periodAccent}` : '2px solid transparent',
                    background: 'transparent', transition: 'color 0.12s',
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Item grid (3 columns) */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {CATALOG[catalogTab].map((item, i) => (
                  <div
                    key={i}
                    style={{
                      background: 'rgba(255,255,255,0.06)', borderRadius: '16px',
                      padding: '16px 8px 12px',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                    }}
                  >
                    <span style={{ fontSize: '36px', lineHeight: 1.2 }}>{item.emoji}</span>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', textAlign: 'center' }}>{item.name}</span>
                    <button
                      onClick={() => { setPlacingItem(item); setCatalogOpen(false) }}
                      style={{
                        marginTop: '4px', padding: '5px 16px',
                        fontSize: '11px', fontWeight: 600, color: '#fff',
                        background: periodAccent, borderRadius: '20px',
                      }}
                    >
                      使用する
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation ──────────────────────────────────── */}
      {deleteConfirmId && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.60)', animation: 'fadeIn 0.15s ease' }}
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteConfirmId(null) }}
        >
          <div
            style={{
              background: '#1a1530', borderRadius: '20px',
              padding: '28px 24px 20px', width: '260px', textAlign: 'center',
            }}
          >
            <p style={{ fontSize: '36px', marginBottom: '8px' }}>
              {placedItems.find(i => i.id === deleteConfirmId)?.emoji}
            </p>
            <p style={{ color: '#fff', fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>
              アイテムを削除しますか？
            </p>
            <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '12px', marginBottom: '20px' }}>
              この操作は元に戻せません
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setDeleteConfirmId(null)}
                style={{
                  flex: 1, padding: '11px', fontSize: '14px',
                  color: 'rgba(255,255,255,0.5)',
                  border: '1px solid rgba(255,255,255,0.12)', borderRadius: '24px',
                }}
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  setPlacedItems(prev => prev.filter(i => i.id !== deleteConfirmId))
                  setDeleteConfirmId(null)
                }}
                style={{
                  flex: 1, padding: '11px', fontSize: '14px', fontWeight: 600,
                  color: '#fff', background: '#ef4444', borderRadius: '24px',
                }}
              >
                削除
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

  const grd = ctx.createRadialGradient(x, y, 0, x, y, r * 2.6)
  grd.addColorStop(0, 'rgba(167,139,250,0.38)')
  grd.addColorStop(1, 'rgba(83,74,183,0)')
  ctx.beginPath(); ctx.arc(x, y, r * 2.6, 0, Math.PI * 2)
  ctx.fillStyle = grd; ctx.fill()

  const bgGrd = ctx.createRadialGradient(x - r * 0.22, y - r * 0.22, 0, x, y, r)
  bgGrd.addColorStop(0, '#b39dfa')
  bgGrd.addColorStop(1, '#6d28d9')
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = bgGrd; ctx.fill()

  ctx.save()
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip()

  if (selectedEmoji) {
    ctx.font = `${Math.round(r * 1.4)}px system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(selectedEmoji, x, y + 2)
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.88)'
    ctx.beginPath()
    ctx.arc(x, y - r * 0.30, r * 0.33, 0, Math.PI * 2)
    ctx.fill()
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
