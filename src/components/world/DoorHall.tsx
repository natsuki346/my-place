'use client'

import { useEffect, useRef, useState } from 'react'

// ── Period ────────────────────────────────────────────────────────────────────

type Period = 'morning' | 'afternoon' | 'evening' | 'night'

function getPeriod(hour: number): Period {
  if (hour >= 22 || hour < 5) return 'night'
  if (hour < 11) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}

// ── Themes ────────────────────────────────────────────────────────────────────

type Theme = {
  bg:    string
  tab:   string
  nav:   string
  text:  string
  c1:    string
  c2:    string
  rope:  string
  glow:  string
  dark:  boolean
  label: string
  sub:   string
}

const THEMES: Record<Period, Theme> = {
  morning: {
    bg: 'from-sky-100 to-blue-50', tab: 'bg-sky-500',
    nav: 'bg-sky-50 border-sky-200', text: 'text-sky-700',
    c1: '#e0f2fe', c2: '#eff6ff',
    rope: 'rgba(14,165,233,0.40)', glow: '#7dd3fc',
    dark: false, label: '#1f2937', sub: '#6b7280',
  },
  afternoon: {
    bg: 'from-blue-100 to-white', tab: 'bg-blue-500',
    nav: 'bg-blue-50 border-blue-200', text: 'text-blue-700',
    c1: '#dbeafe', c2: '#ffffff',
    rope: 'rgba(59,130,246,0.38)', glow: '#93c5fd',
    dark: false, label: '#1f2937', sub: '#6b7280',
  },
  evening: {
    bg: 'from-orange-100 to-rose-50', tab: 'bg-orange-500',
    nav: 'bg-orange-50 border-orange-200', text: 'text-orange-700',
    c1: '#ffedd5', c2: '#fff1f2',
    rope: 'rgba(249,115,22,0.48)', glow: '#fb923c',
    dark: false, label: '#1f2937', sub: '#6b7280',
  },
  night: {
    bg: 'from-[#0a0a1f] via-[#0d0d2e] to-[#0a0a1f]', tab: 'bg-purple-600',
    nav: 'bg-indigo-950 border-indigo-800', text: 'text-indigo-200',
    c1: '#0a0a1f', c2: '#0d0d2e',
    rope: 'rgba(255,255,255,0.20)', glow: '#818cf8',
    dark: true, label: '#c7d2fe', sub: '#94a3b8',
  },
}

// ── Door data ─────────────────────────────────────────────────────────────────

const DOORS = [
  { key: 'myroom',  label: '心の部屋',  sublabel: 'my space' },
  { key: 'friend1', label: 'Hana',       sublabel: 'friend'   },
  { key: 'friend2', label: 'Ryo',        sublabel: 'friend'   },
  { key: 'id1',     label: '#内向型',    sublabel: '247人'    },
  { key: 'id2',     label: '#夜型人間',  sublabel: '1.2k人'   },
  { key: 'id3',     label: '#HSP',       sublabel: '892人'    },
  { key: 'add',     label: '追加する',   sublabel: '新しい扉' },
]

const TABS = [
  { key: 'all',      label: 'すべて' },
  { key: 'identity', label: 'アイデンティティ' },
  { key: 'friends',  label: 'フレンド' },
]

const TAB_FILTER: Record<string, string[]> = {
  all:      DOORS.map(d => d.key),
  identity: ['id1', 'id2', 'id3', 'add'],
  friends:  ['myroom', 'friend1', 'friend2', 'add'],
}

const DOOR_W   = 130
const DOOR_H   = 200
const DOOR_GAP = 150

type Door = typeof DOORS[0]


// ── Component ─────────────────────────────────────────────────────────────────

type DoorHallProps = { onEnterRoom: (key: string) => void }

export function DoorHall({ onEnterRoom }: DoorHallProps) {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const onEnterRef   = useRef(onEnterRoom)
  onEnterRef.current = onEnterRoom

  const [activeTab,     setActiveTab]     = useState('all')
  const [period,        setPeriod]        = useState<Period>('night')
  const [favorites,     setFavorites]     = useState<string[]>([])
  const [showFavorites, setShowFavorites] = useState(false)

  const favoritesRef = useRef<string[]>([])
  favoritesRef.current = favorites

  const theme    = THEMES[period]
  const themeRef = useRef<Theme>(theme)
  themeRef.current = theme

  // Sync period on mount + every minute
  useEffect(() => {
    setPeriod(getPeriod(new Date().getHours()))
    const id = setInterval(() => setPeriod(getPeriod(new Date().getHours())), 60_000)
    return () => clearInterval(id)
  }, [])

  const filteredDoors = DOORS.filter(d => TAB_FILTER[activeTab].includes(d.key))

  const doorsRef   = useRef<Door[]>(filteredDoors)
  doorsRef.current = filteredDoors

  // Scroll + drag state
  const scrollXRef       = useRef(0)
  const isDragging       = useRef(false)
  const dragStartX       = useRef(0)
  const dragStartScroll  = useRef(0)
  const didDrag          = useRef(false)

  // Door opening animation
  const openingDoor  = useRef<string | null>(null)
  const doorProgress = useRef(0)

  const handleTabChange = (key: string) => {
    setActiveTab(key)
    scrollXRef.current   = 0
    openingDoor.current  = null
    doorProgress.current = 0
  }

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

    // ── Tap detection ─────────────────────────────────────────────
    const handleTap = (canvasX: number, canvasY: number) => {
      if (openingDoor.current) return
      const doors     = doorsRef.current
      const loopWidth = doors.length * DOOR_GAP
      const effScroll = ((scrollXRef.current % loopWidth) + loopWidth) % loopWidth
      const doorTopY  = (canvas.height - DOOR_H) / 2
      const startX    = (canvas.width - doors.length * DOOR_GAP) / 2 + DOOR_GAP / 2

      for (const offset of [-1, 0, 1]) {
        for (let i = 0; i < doors.length; i++) {
          const door   = doors[i]
          const dcx    = startX + i * DOOR_GAP + offset * loopWidth - effScroll
          const starCx = dcx + DOOR_W / 2 - 14
          const starCy = doorTopY + 14

          // Star icon tap — toggle favorite
          if (Math.hypot(canvasX - starCx, canvasY - starCy) < 16) {
            const key = door.key
            setFavorites(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
            return
          }

          // Door body tap — open
          if (
            canvasX >= dcx - DOOR_W / 2 && canvasX <= dcx + DOOR_W / 2 &&
            canvasY >= doorTopY && canvasY <= doorTopY + DOOR_H
          ) {
            openingDoor.current  = door.key
            doorProgress.current = 0
            return
          }
        }
      }
    }

    // ── Mouse events ──────────────────────────────────────────────
    const onMouseDown = (e: MouseEvent) => {
      isDragging.current      = true
      didDrag.current         = false
      dragStartX.current      = e.clientX
      dragStartScroll.current = scrollXRef.current
    }
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      const dx = e.clientX - dragStartX.current
      if (Math.abs(dx) > 4) didDrag.current = true
      scrollXRef.current = dragStartScroll.current - dx
    }
    const onMouseUp = (e: MouseEvent) => {
      if (!isDragging.current) return
      isDragging.current = false
      if (!didDrag.current) {
        const rect = canvas.getBoundingClientRect()
        handleTap(e.clientX - rect.left, e.clientY - rect.top)
      }
    }
    canvas.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup',   onMouseUp)

    // ── Touch events ──────────────────────────────────────────────
    const onTouchStart = (e: TouchEvent) => {
      const t0 = e.touches[0]
      isDragging.current      = true
      didDrag.current         = false
      dragStartX.current      = t0.clientX
      dragStartScroll.current = scrollXRef.current
    }
    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging.current) return
      const t0 = e.touches[0]
      const dx = t0.clientX - dragStartX.current
      if (Math.abs(dx) > 4) {
        didDrag.current = true
        e.preventDefault()
      }
      scrollXRef.current = dragStartScroll.current - dx
    }
    const onTouchEnd = (e: TouchEvent) => {
      if (!isDragging.current) return
      isDragging.current = false
      if (!didDrag.current) {
        const t0 = e.changedTouches[0]
        const rect = canvas.getBoundingClientRect()
        handleTap(t0.clientX - rect.left, t0.clientY - rect.top)
      }
    }
    canvas.addEventListener('touchstart', onTouchStart, { passive: true })
    canvas.addEventListener('touchmove',  onTouchMove,  { passive: false })
    canvas.addEventListener('touchend',   onTouchEnd)

    // ── Draw loop ─────────────────────────────────────────────────
    const draw = () => {
      const W = canvas.width
      const H = canvas.height
      if (!W || !H) { animId = requestAnimationFrame(draw); return }

      const doors     = doorsRef.current
      const loopWidth = doors.length * DOOR_GAP

      if (openingDoor.current) {
        doorProgress.current = Math.min(1, doorProgress.current + 0.04)
        if (doorProgress.current >= 0.5) {
          const key = openingDoor.current
          openingDoor.current  = null
          doorProgress.current = 0
          onEnterRef.current(key)
          animId = requestAnimationFrame(draw)
          return
        }
      }

      const effScroll   = ((scrollXRef.current % loopWidth) + loopWidth) % loopWidth
      const doorTopY    = (H - DOOR_H) / 2
      const doorCenterY = doorTopY + DOOR_H / 2
      const startX      = (W - doors.length * DOOR_GAP) / 2 + DOOR_GAP / 2

      drawBackground(ctx, W, H, doorTopY, themeRef.current)

      for (const offset of [-1, 0, 1]) {
        for (let i = 0; i < doors.length; i++) {
          const door = doors[i]
          const dcx  = startX + i * DOOR_GAP + offset * loopWidth - effScroll

          if (dcx + DOOR_W / 2 + 60 < 0 || dcx - DOOR_W / 2 - 60 > W) continue

          const isOpening = openingDoor.current === door.key
          const progress  = isOpening ? doorProgress.current : 0

          ctx.save()
          if (isOpening) {
            ctx.translate(dcx, doorCenterY)
            ctx.scale(Math.max(0.001, 1 - progress), 1)
            ctx.translate(-dcx, -doorCenterY)
          }

          renderDoor(ctx, dcx, doorTopY, door, isOpening, progress, themeRef.current, favoritesRef.current.includes(door.key))
          ctx.restore()
        }
      }

      animId = requestAnimationFrame(draw)
    }

    animId = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animId)
      ro.disconnect()
      canvas.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup',   onMouseUp)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove',  onTouchMove)
      canvas.removeEventListener('touchend',   onTouchEnd)
    }
  }, [])

  const tabActiveBg: Record<Period, string> = {
    morning:   'bg-sky-500',
    afternoon: 'bg-blue-500',
    evening:   'bg-orange-500',
    night:     'bg-purple-600',
  }

  return (
    <div className={`flex flex-col bg-gradient-to-b ${theme.bg}`} style={{ height: '100%' }}>
      {/* ── Tab bar ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-2 px-4 py-3 flex-shrink-0">
        {TABS.map(tab => {
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                active ? `${tabActiveBg[period]} text-white` : 'text-white/60'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
        <button
          onClick={() => setShowFavorites(true)}
          className={`px-3 py-1.5 rounded-full text-base transition-colors ${
            favorites.length > 0 ? `${tabActiveBg[period]} text-white` : 'text-white/60'
          }`}
        >
          {favorites.length > 0 ? '⭐' : '☆'}
        </button>
      </div>

      {/* ── Canvas ───────────────────────────────────────────────── */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          className="block w-full h-full cursor-pointer"
          style={{ touchAction: 'none' }}
        />
      </div>

      {/* ── Favorites bottom sheet ───────────────────────────────── */}
      {showFavorites && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100 }}
            onClick={() => setShowFavorites(false)}
          />
          <div style={{
            position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
            width: '100%', maxWidth: '390px', maxHeight: '60dvh',
            background: theme.dark ? '#1e1b4b' : '#ffffff',
            borderRadius: '16px 16px 0 0',
            zIndex: 101, display: 'flex', flexDirection: 'column',
          }}>
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
              <div style={{ width: '32px', height: '3px', background: theme.dark ? 'rgba(255,255,255,0.18)' : '#e5e7eb', borderRadius: '2px' }} />
            </div>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 16px 12px' }}>
              <span style={{ fontSize: '15px', fontWeight: 600, color: theme.dark ? '#c7d2fe' : '#1f2937' }}>⭐ お気に入り</span>
              <button onClick={() => setShowFavorites(false)} style={{ color: theme.dark ? '#94a3b8' : '#6b7280', fontSize: '22px', lineHeight: 1 }}>×</button>
            </div>
            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '24px' }}>
              {favorites.length === 0 ? (
                <p style={{ textAlign: 'center', color: theme.dark ? '#94a3b8' : '#9ca3af', fontSize: '13px', padding: '32px 0' }}>
                  まだお気に入りがありません
                </p>
              ) : (
                favorites.map(key => {
                  const door = DOORS.find(d => d.key === key)
                  if (!door) return null
                  const typeLabel = key.startsWith('id') ? 'アイデンティティ' : key === 'myroom' ? 'マイルーム' : 'フレンド'
                  const typeBg    = theme.dark ? 'rgba(129,140,248,0.18)' : '#eff6ff'
                  const typeColor = theme.dark ? '#818cf8' : '#3b82f6'
                  return (
                    <button
                      key={key}
                      onClick={() => { setShowFavorites(false); onEnterRef.current(key) }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '12px 16px', textAlign: 'left',
                        borderBottom: `1px solid ${theme.dark ? 'rgba(255,255,255,0.06)' : '#f3f4f6'}`,
                      }}
                    >
                      <span style={{ fontSize: '22px' }}>🚪</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: theme.dark ? '#c7d2fe' : '#1f2937', fontSize: '14px', fontWeight: 500 }}>{door.label}</p>
                        <p style={{ color: theme.dark ? '#94a3b8' : '#6b7280', fontSize: '11px' }}>{door.sublabel}</p>
                      </div>
                      <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: typeBg, color: typeColor, flexShrink: 0 }}>
                        {typeLabel}
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Background ────────────────────────────────────────────────────────────────

function drawBackground(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  doorTopY: number,
  theme: Theme,
) {
  const lightY = Math.max(8, doorTopY - 40)

  // Background gradient (top → mid → top mirror)
  const bgGrd = ctx.createLinearGradient(0, 0, 0, H)
  bgGrd.addColorStop(0,   theme.c1)
  bgGrd.addColorStop(0.5, theme.c2)
  bgGrd.addColorStop(1,   theme.c1)
  ctx.fillStyle = bgGrd
  ctx.fillRect(0, 0, W, H)

  // Ceiling glow dots
  for (let i = 0; i < 4; i++) {
    const lx  = W * (i + 0.5) / 4
    const grd = ctx.createRadialGradient(lx, lightY, 0, lx, lightY, 40)
    grd.addColorStop(0,   hexToRgba(theme.glow, 0.25))
    grd.addColorStop(0.5, hexToRgba(theme.glow, 0.07))
    grd.addColorStop(1,   hexToRgba(theme.glow, 0))
    ctx.beginPath()
    ctx.arc(lx, lightY, 40, 0, Math.PI * 2)
    ctx.fillStyle = grd
    ctx.fill()

    ctx.beginPath()
    ctx.arc(lx, lightY, 2.5, 0, Math.PI * 2)
    ctx.fillStyle = theme.glow
    ctx.fill()
  }
}

// ── Door renderer ─────────────────────────────────────────────────────────────

function renderDoor(
  ctx: CanvasRenderingContext2D,
  cx: number,
  topY: number,
  door: Door,
  isOpening: boolean,
  progress: number,
  theme: Theme,
  isFavorite: boolean,
) {
  const x = cx - DOOR_W / 2
  const w = DOOR_W
  const h = DOOR_H

  // Suspension wire
  ctx.strokeStyle = theme.rope
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(cx, topY)
  ctx.lineTo(cx, 0)
  ctx.stroke()

  // Door frame
  ctx.fillStyle = '#6B4423'
  ctx.fillRect(x - 6, topY - 6, w + 12, h + 12)

  // Door body
  ctx.fillStyle = '#8B5E3C'
  ctx.fillRect(x, topY, w, h)

  // Wood grain
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, topY, w, h)
  ctx.clip()
  ctx.strokeStyle = 'rgba(0,0,0,0.08)'
  ctx.lineWidth = 1
  for (let i = 1; i <= 4; i++) {
    const lx = x + (w / 5) * i
    ctx.beginPath()
    ctx.moveTo(lx, topY)
    ctx.lineTo(lx, topY + h)
    ctx.stroke()
  }
  ctx.restore()

  // Inner panels
  const px = x + 10
  const pw = w - 20
  ctx.fillStyle = 'rgba(0,0,0,0.15)'
  ctx.fillRect(px, topY + 30, pw, Math.floor(h * 0.30))
  ctx.fillRect(px, topY + 30 + Math.floor(h * 0.30) + 8, pw, Math.floor(h * 0.38))

  // Name plate
  ctx.font = 'bold 9px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const textW  = ctx.measureText(door.label).width
  const plateW = textW + 12
  const plateH = 16
  const plateX = cx - plateW / 2
  const plateY = topY + 8

  ctx.fillStyle = '#D4A853'
  roundRect(ctx, plateX, plateY, plateW, plateH, 3)
  ctx.fill()

  ctx.fillStyle = '#3d2000'
  ctx.fillText(door.label, cx, plateY + plateH / 2)

  // Doorknob
  ctx.beginPath()
  ctx.arc(x + w - 14, topY + h * 0.55, 6, 0, Math.PI * 2)
  ctx.fillStyle = '#D4A853'
  ctx.fill()
  ctx.strokeStyle = '#6B4423'
  ctx.lineWidth = 0.8
  ctx.stroke()

  // Star icon (top-right corner)
  ctx.font = '14px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = isFavorite ? '#fbbf24' : 'rgba(255,255,255,0.55)'
  ctx.fillText(isFavorite ? '★' : '☆', cx + DOOR_W / 2 - 14, topY + 14)

  // Opening flash
  if (isOpening && progress > 0) {
    ctx.fillStyle = `rgba(255,255,255,${Math.min(0.92, progress * 0.85)})`
    ctx.fillRect(x, topY, w, h)
  }

  // Label below door
  ctx.font = 'bold 10px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillStyle = theme.label
  ctx.fillText(door.label, cx, topY + h + 8)

  ctx.font = '8px system-ui, sans-serif'
  ctx.fillStyle = theme.sub
  ctx.fillText(door.sublabel, cx, topY + h + 22)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

