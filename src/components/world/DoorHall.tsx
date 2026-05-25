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
  bg:    string   // Tailwind gradient classes (used with bg-gradient-to-b)
  tab:   string   // active tab Tailwind bg class
  nav:   string   // index bar Tailwind bg + border classes
  text:  string   // found-index Tailwind text class
  c1:    string   // canvas gradient top hex
  c2:    string   // canvas gradient bottom hex
  floor: string   // canvas floor hex
  rope:  string   // canvas rope rgba
  glow:  string   // canvas ceiling glow hex
  dark:  boolean  // true = use light lines in canvas (night)
  label: string   // canvas door-label hex
  sub:   string   // canvas door-sublabel hex
}

const THEMES: Record<Period, Theme> = {
  morning: {
    bg: 'from-sky-100 to-blue-50', tab: 'bg-sky-500',
    nav: 'bg-sky-50 border-sky-200', text: 'text-sky-700',
    c1: '#e0f2fe', c2: '#eff6ff', floor: '#bae6fd',
    rope: 'rgba(14,165,233,0.40)', glow: '#7dd3fc',
    dark: false, label: '#1f2937', sub: '#6b7280',
  },
  afternoon: {
    bg: 'from-blue-100 to-white', tab: 'bg-blue-500',
    nav: 'bg-blue-50 border-blue-200', text: 'text-blue-700',
    c1: '#dbeafe', c2: '#ffffff', floor: '#bfdbfe',
    rope: 'rgba(59,130,246,0.38)', glow: '#93c5fd',
    dark: false, label: '#1f2937', sub: '#6b7280',
  },
  evening: {
    bg: 'from-orange-100 to-rose-50', tab: 'bg-orange-500',
    nav: 'bg-orange-50 border-orange-200', text: 'text-orange-700',
    c1: '#ffedd5', c2: '#fff1f2', floor: '#fed7aa',
    rope: 'rgba(249,115,22,0.48)', glow: '#fb923c',
    dark: false, label: '#1f2937', sub: '#6b7280',
  },
  night: {
    bg: 'from-indigo-950 to-slate-900', tab: 'bg-purple-600',
    nav: 'bg-indigo-950 border-indigo-800', text: 'text-indigo-200',
    c1: '#1e1b4b', c2: '#0f172a', floor: '#312e81',
    rope: 'rgba(129,140,248,0.50)', glow: '#818cf8',
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

  const [activeTab, setActiveTab] = useState('all')
  const [period,    setPeriod]    = useState<Period>('night')

  const theme    = THEMES[period]
  const themeRef = useRef<Theme>(theme)
  themeRef.current = theme

  // Sync period on mount + every minute
  useEffect(() => {
    setPeriod(getPeriod(new Date().getHours()))
    const id = setInterval(() => setPeriod(getPeriod(new Date().getHours())), 60_000)
    return () => clearInterval(id)
  }, [])

  // Filtered + sorted doors
  const sorted = [...DOORS.filter(d => TAB_FILTER[activeTab].includes(d.key))]
    .sort((a, b) => a.label.localeCompare(b.label, 'ja'))

  const doorsRef   = useRef(sorted)
  doorsRef.current = sorted

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
          const dcx = startX + i * DOOR_GAP + offset * loopWidth - effScroll
          if (
            canvasX >= dcx - DOOR_W / 2 && canvasX <= dcx + DOOR_W / 2 &&
            canvasY >= doorTopY && canvasY <= doorTopY + DOOR_H
          ) {
            openingDoor.current  = doors[i].key
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

          renderDoor(ctx, dcx, doorTopY, door, isOpening, progress, themeRef.current)
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

  const activeTabClass: Record<Period, string> = {
    morning:   'bg-sky-500 text-white font-semibold',
    afternoon: 'bg-blue-500 text-white font-semibold',
    evening:   'bg-orange-500 text-white font-semibold',
    night:     'bg-purple-600 text-white font-semibold',
  }
  const inactiveTabClass: Record<Period, string> = {
    morning:   'text-sky-700',
    afternoon: 'text-blue-700',
    evening:   'text-orange-700',
    night:     'text-indigo-300',
  }

  return (
    <div className={`flex flex-col bg-gradient-to-b ${theme.bg}`} style={{ height: '100%' }}>
      {/* ── Tab bar ───────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-center gap-3 flex-shrink-0 border-b border-black/10"
        style={{ padding: '8px 16px' }}
      >
        {TABS.map(tab => {
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`transition-colors whitespace-nowrap rounded-full ${
                active ? activeTabClass[period] : inactiveTabClass[period]
              }`}
              style={{ padding: '6px 16px', fontSize: '14px' }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── Canvas + index bar ────────────────────────────────────── */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <canvas
          ref={canvasRef}
          className="block w-full h-full cursor-pointer"
          style={{ touchAction: 'none' }}
        />

      </div>
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
  const floorTopY = doorTopY + DOOR_H + 10
  const ceilingH  = Math.max(0, doorTopY - 20)
  const lightY    = Math.max(8, doorTopY - 40)
  const lineAlpha = theme.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'
  const edgeAlpha = theme.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'

  const bgGrd = ctx.createLinearGradient(0, 0, 0, H)
  bgGrd.addColorStop(0, theme.c1)
  bgGrd.addColorStop(1, theme.c2)
  ctx.fillStyle = bgGrd
  ctx.fillRect(0, 0, W, H)

  // Floor trapezoid
  ctx.fillStyle = theme.floor
  ctx.beginPath()
  ctx.moveTo(0, H)
  ctx.lineTo(W, H)
  ctx.lineTo(W * 0.75, floorTopY)
  ctx.lineTo(W * 0.25, floorTopY)
  ctx.closePath()
  ctx.fill()

  ctx.strokeStyle = edgeAlpha
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(W * 0.25, floorTopY)
  ctx.lineTo(W * 0.75, floorTopY)
  ctx.stroke()

  // Vanishing lines
  const vpX = W / 2
  const vpY = doorTopY + DOOR_H / 2
  ctx.strokeStyle = lineAlpha
  ctx.lineWidth = 1
  for (const [lx, ly] of [
    [0, H], [W, H],
    [0, ceilingH], [W, ceilingH],
    [W * 0.25, H], [W * 0.75, H],
  ] as [number, number][]) {
    ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(vpX, vpY); ctx.stroke()
  }

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
