'use client'

import { useEffect, useRef, useState } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

type TimeColors = {
  corridor: string
  floor: string
  light: string
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

// ── Time colors ───────────────────────────────────────────────────────────────

function getTimeColors(hour: number): TimeColors {
  if (hour >= 5  && hour <= 7)  return { corridor: '#1a0f05', floor: '#2a1a0a', light: '#f97316' }
  if (hour >= 8  && hour <= 11) return { corridor: '#0a1020', floor: '#141828', light: '#7dd3fc' }
  if (hour >= 12 && hour <= 15) return { corridor: '#0f1a10', floor: '#182018', light: '#fbbf24' }
  if (hour >= 16 && hour <= 19) return { corridor: '#1a0d05', floor: '#251508', light: '#fb923c' }
  return { corridor: '#0a0812', floor: '#110e1e', light: '#818cf8' }
}

// ── Index bar helpers ─────────────────────────────────────────────────────────

const JP_INDEX = ['あ','か','さ','た','な','は','ま','や','ら','わ','A','#']

const ROW_MAP: Record<string, string[]> = {
  'あ': ['あ','い','う','え','お','ア','イ','ウ','エ','オ'],
  'か': ['か','き','く','け','こ','カ','キ','ク','ケ','コ'],
  'さ': ['さ','し','す','せ','そ','サ','シ','ス','セ','ソ'],
  'た': ['た','ち','つ','て','と','タ','チ','ツ','テ','ト'],
  'な': ['な','に','ぬ','ね','の','ナ','ニ','ヌ','ネ','ノ'],
  'は': ['は','ひ','ふ','へ','ほ','ハ','ヒ','フ','ヘ','ホ'],
  'ま': ['ま','み','む','め','も','マ','ミ','ム','メ','モ'],
  'や': ['や','ゆ','よ','ヤ','ユ','ヨ'],
  'ら': ['ら','り','る','れ','ろ','ラ','リ','ル','レ','ロ'],
  'わ': ['わ','を','ん','ワ','ヲ','ン'],
}

function getRowForIndex(idx: string, doors: Door[]): number {
  return doors.findIndex(d => {
    const label = d.label.replace('#', '')
    const first = label[0]
    if (idx === '#') return d.label.startsWith('#')
    if (idx === 'A') return /[a-zA-Z]/.test(first)
    return ROW_MAP[idx]?.includes(first) ?? false
  })
}

// ── Component ─────────────────────────────────────────────────────────────────

type DoorHallProps = {
  onEnterRoom: (key: string) => void
}

export function DoorHall({ onEnterRoom }: DoorHallProps) {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const onEnterRef   = useRef(onEnterRoom)
  onEnterRef.current = onEnterRoom

  const [activeTab, setActiveTab] = useState('all')

  // Time-based corridor colors
  const [timeColors, setTimeColors] = useState<TimeColors>(() => getTimeColors(new Date().getHours()))
  const timeColorsRef = useRef<TimeColors>(timeColors)

  // Filtered + sorted doors — ref kept current every render so RAF loop reads latest
  const filtered   = DOORS.filter(d => TAB_FILTER[activeTab].includes(d.key))
  const sorted     = [...filtered].sort((a, b) => a.label.localeCompare(b.label, 'ja'))
  const doorsRef   = useRef(sorted)
  doorsRef.current = sorted

  // Scroll state — ref only; RAF loop reads directly every frame
  const scrollXRef       = useRef(0)
  const isDragging      = useRef(false)
  const dragStartX      = useRef(0)
  const dragStartScroll = useRef(0)
  const didDrag         = useRef(false)

  // Door opening animation
  const openingDoor  = useRef<string | null>(null)
  const doorProgress = useRef(0)

  // 1-minute time update
  useEffect(() => {
    const update = () => {
      const colors = getTimeColors(new Date().getHours())
      timeColorsRef.current = colors
      setTimeColors(colors)
    }
    const id = setInterval(update, 60_000)
    return () => clearInterval(id)
  }, [])

  const handleTabChange = (key: string) => {
    setActiveTab(key)
    scrollXRef.current   = 0
    openingDoor.current  = null
    doorProgress.current = 0
  }

  const jumpToRow = (doorIdx: number) => {
    if (doorIdx >= 0) scrollXRef.current = doorIdx * DOOR_GAP
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

      // Advance door opening — call onEnterRoom at 50% through animation
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

      // Normalise scrollX into [0, loopWidth) for drawing
      const effScroll   = ((scrollXRef.current % loopWidth) + loopWidth) % loopWidth
      const doorTopY    = (H - DOOR_H) / 2
      const doorCenterY = doorTopY + DOOR_H / 2
      const startX      = (W - doors.length * DOOR_GAP) / 2 + DOOR_GAP / 2

      drawBackground(ctx, W, H, doorTopY, timeColorsRef.current)

      // Draw 3 copies of the door list to create seamless infinite loop
      for (const offset of [-1, 0, 1]) {
        for (let i = 0; i < doors.length; i++) {
          const door = doors[i]
          const dcx  = startX + i * DOOR_GAP + offset * loopWidth - effScroll

          // Skip if fully off-screen (extra margin for labels)
          if (dcx + DOOR_W / 2 + 60 < 0 || dcx - DOOR_W / 2 - 60 > W) continue

          const isOpening = openingDoor.current === door.key
          const progress  = isOpening ? doorProgress.current : 0

          ctx.save()
          if (isOpening) {
            ctx.translate(dcx, doorCenterY)
            ctx.scale(Math.max(0.001, 1 - progress), 1)
            ctx.translate(-dcx, -doorCenterY)
          }

          renderDoor(ctx, dcx, doorTopY, door, isOpening, progress)
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

  return (
    <div className="flex flex-col" style={{ background: timeColors.corridor, height: '100%' }}>
      {/* ── Tab bar ───────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 flex-shrink-0 overflow-x-auto no-scrollbar"
        style={{ padding: '8px 16px', background: timeColors.corridor }}
      >
        {TABS.map(tab => {
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className="flex-shrink-0 transition-colors"
              style={{
                borderRadius: '20px',
                padding: '5px 14px',
                fontSize: '12px',
                background: active ? '#1e1535' : 'transparent',
                color:      active ? '#a78bfa' : '#555',
                border:     active ? '1px solid #534ab7' : '1px solid transparent',
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── Canvas + floating index bar ───────────────────────────── */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <canvas
          ref={canvasRef}
          className="block w-full h-full cursor-pointer"
          style={{ touchAction: 'none' }}
        />

        {/* Index bar — floats above canvas near bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: '70px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '4px',
            padding: '6px 16px',
            background: 'rgba(10,8,18,0.85)',
            borderRadius: '20px',
            pointerEvents: 'auto',
          }}
        >
          {JP_INDEX.map(idx => {
            const doorIdx = getRowForIndex(idx, sorted)
            const found   = doorIdx >= 0
            return (
              <button
                key={idx}
                onClick={() => jumpToRow(doorIdx)}
                style={{
                  width: '24px',
                  height: '24px',
                  fontSize: '11px',
                  color: found ? '#a78bfa' : '#2a2040',
                  textAlign: 'center',
                  lineHeight: '24px',
                  borderRadius: '4px',
                  cursor: found ? 'pointer' : 'default',
                }}
              >
                {idx}
              </button>
            )
          })}
        </div>
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
  colors: TimeColors,
) {
  const floorTopY = doorTopY + DOOR_H + 10
  const ceilingH  = Math.max(0, doorTopY - 20)
  const lightY    = Math.max(8, doorTopY - 40)

  ctx.fillStyle = colors.corridor
  ctx.fillRect(0, 0, W, H)

  // Floor trapezoid — perspective convergence
  ctx.fillStyle = colors.floor
  ctx.beginPath()
  ctx.moveTo(0, H)
  ctx.lineTo(W, H)
  ctx.lineTo(W * 0.75, floorTopY)
  ctx.lineTo(W * 0.25, floorTopY)
  ctx.closePath()
  ctx.fill()

  // Floor edge highlight
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(W * 0.25, floorTopY)
  ctx.lineTo(W * 0.75, floorTopY)
  ctx.stroke()

  // Vanishing lines toward VP at door centre height
  const vpX = W / 2
  const vpY = doorTopY + DOOR_H / 2
  ctx.strokeStyle = 'rgba(255,255,255,0.03)'
  ctx.lineWidth = 1
  for (const [lx, ly] of [
    [0, H], [W, H],
    [0, ceilingH], [W, ceilingH],
    [W * 0.25, H], [W * 0.75, H],
  ] as [number, number][]) {
    ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(vpX, vpY); ctx.stroke()
  }

  // Ceiling lights — radial gradient with time-based color
  for (let i = 0; i < 4; i++) {
    const lx  = W * (i + 0.5) / 4
    const grd = ctx.createRadialGradient(lx, lightY, 0, lx, lightY, 60)
    grd.addColorStop(0,    hexToRgba(colors.light, 0.42))
    grd.addColorStop(0.35, hexToRgba(colors.light, 0.12))
    grd.addColorStop(1,    hexToRgba(colors.light, 0))
    ctx.beginPath()
    ctx.arc(lx, lightY, 60, 0, Math.PI * 2)
    ctx.fillStyle = grd
    ctx.fill()

    ctx.beginPath()
    ctx.arc(lx, lightY, 3, 0, Math.PI * 2)
    ctx.fillStyle = colors.light
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
) {
  const x = cx - DOOR_W / 2
  const w = DOOR_W
  const h = DOOR_H

  // Suspension wire
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'
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

  // Wood grain — 4 vertical lines clipped to door body
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

  // Inner panels — 2 recessed rectangles
  const px = x + 10
  const pw = w - 20
  ctx.fillStyle = 'rgba(0,0,0,0.15)'
  ctx.fillRect(px, topY + 30, pw, Math.floor(h * 0.30))
  ctx.fillRect(px, topY + 30 + Math.floor(h * 0.30) + 8, pw, Math.floor(h * 0.38))

  // Name plate — top center of door
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

  // Doorknob — right side center, r=6
  ctx.beginPath()
  ctx.arc(x + w - 14, topY + h * 0.55, 6, 0, Math.PI * 2)
  ctx.fillStyle = '#D4A853'
  ctx.fill()
  ctx.strokeStyle = '#6B4423'
  ctx.lineWidth = 0.8
  ctx.stroke()

  // Opening white flash
  if (isOpening && progress > 0) {
    ctx.fillStyle = `rgba(255,255,255,${Math.min(0.92, progress * 0.85)})`
    ctx.fillRect(x, topY, w, h)
  }

  // Label below door
  ctx.font = 'bold 10px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillStyle = '#c4a882'
  ctx.fillText(door.label, cx, topY + h + 8)

  // Sublabel
  ctx.font = '8px system-ui, sans-serif'
  ctx.fillStyle = '#666'
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
