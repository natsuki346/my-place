'use client'

import { useEffect, useRef } from 'react'

// ── Constants ─────────────────────────────────────────────────────────────────

const COLS = 24
const ROWS = 18
const TILE_WALL = 1

export type Room = {
  key: string
  x: number; y: number; w: number; h: number
  color: string; dot: string; label: string; sublabel: string
}

export const ROOMS: Room[] = [
  { key:'myroom',  x:2,  y:2,  w:7, h:6, color:'#3d2f6e', dot:'#a78bfa', label:'心の部屋',  sublabel:'my space'    },
  { key:'friend1', x:11, y:2,  w:6, h:6, color:'#1a3d2f', dot:'#34d399', label:'Hana',       sublabel:'friend'      },
  { key:'friend2', x:2,  y:10, w:6, h:6, color:'#1a2a3d', dot:'#60a5fa', label:'Ryo',        sublabel:'friend'      },
  { key:'id1',     x:10, y:10, w:5, h:6, color:'#3d1a2a', dot:'#f472b6', label:'#内向型',    sublabel:'247 people'  },
  { key:'id2',     x:17, y:10, w:5, h:6, color:'#3d300a', dot:'#fbbf24', label:'#夜型人間',  sublabel:'1.2k people' },
  { key:'id3',     x:17, y:2,  w:4, h:6, color:'#0a3d1a', dot:'#34d399', label:'#HSP',       sublabel:'892 people'  },
]

// ── Map generation ────────────────────────────────────────────────────────────

function carveCorridor(
  map: number[][],
  x1: number, y1: number,
  x2: number, y2: number,
) {
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++)
    if (map[y1]?.[x] === TILE_WALL) map[y1][x] = 0
  for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
    if (map[y]?.[x2] === TILE_WALL) map[y][x2] = 0
}

function buildMap(): number[][] {
  const map: number[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(TILE_WALL))
  for (const room of ROOMS)
    for (let r = room.y; r < room.y + room.h; r++)
      for (let c = room.x; c < room.x + room.w; c++)
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS) map[r][c] = 0

  carveCorridor(map,  9,  4, 10,  4)  // myroom  ↔ friend1 (row 4,  cols 9-10)
  carveCorridor(map,  4,  8,  4,  9)  // myroom  ↔ friend2 (col 4,  rows 8-9)
  carveCorridor(map, 13,  8, 13,  9)  // friend1 ↔ id1     (col 13, rows 8-9)
  carveCorridor(map,  8, 12,  9, 12)  // friend2 ↔ id1     (row 12, cols 8-9)
  carveCorridor(map, 15, 12, 16, 12)  // id1     ↔ id2     (row 12, cols 15-16)
  carveCorridor(map, 19,  8, 19,  9)  // id3     ↔ id2     (col 19, rows 8-9)
  // friend1 (cols 11-16) ↔ id3 (cols 17-20): adjacent at col 16/17, automatically connected

  return map
}

function buildRoomMap(): (Room | null)[][] {
  const rm: (Room | null)[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(null))
  for (const room of ROOMS)
    for (let r = room.y; r < room.y + room.h; r++)
      for (let c = room.x; c < room.x + room.w; c++)
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS) rm[r][c] = room
  return rm
}

// Returns the room whose inner area (excluding border row/col) contains (tx, ty)
function getInnerRoom(tx: number, ty: number): Room | null {
  for (const room of ROOMS) {
    if (
      tx >= room.x + 1 && tx < room.x + room.w - 1 &&
      ty >= room.y + 1 && ty < room.y + room.h - 1
    ) return room
  }
  return null
}

const MAP: number[][] = buildMap()
const ROOM_MAP: (Room | null)[][] = buildRoomMap()

// ── Component ─────────────────────────────────────────────────────────────────

type Props = { onEnterRoom: (key: string) => void }

export function WorldMap({ onEnterRoom }: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const onEnterRef   = useRef(onEnterRoom)
  onEnterRef.current = onEnterRoom

  // Player movement (fractional tile coordinates)
  const tilePos    = useRef({ x: 5.0, y: 5.0 })
  const targetTile = useRef({ x: 5,   y: 5   })
  const isMoving   = useRef(false)

  // Layout shared with event handlers
  const layoutRef = useRef({ tileSize: 16, ox: 0, oy: 0 })

  // Fade / room entry
  const fadeAlpha   = useRef(1.0)
  const fading      = useRef(false)
  const fadeRoomKey = useRef<string | null>(null)
  // Tracks last inner room so re-entry triggers fade when player leaves and returns
  const enteredRoom = useRef<string | null>('myroom')
  const prevTile    = useRef({ x: 5, y: 5 })

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

    // ── Input ────────────────────────────────────────────────────────
    const DIR: Record<string, [number, number]> = {
      ArrowUp:    [0, -1], ArrowDown:  [0,  1],
      ArrowLeft:  [-1, 0], ArrowRight: [1,  0],
      w: [0,-1], s: [0,1], a: [-1,0], d: [1,0],
      W: [0,-1], S: [0,1], A: [-1,0], D: [1,0],
    }

    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (fading.current) return
      const delta = DIR[e.key]
      if (!delta) return
      if (e.key.startsWith('Arrow')) e.preventDefault()
      const nx = targetTile.current.x + delta[0]
      const ny = targetTile.current.y + delta[1]
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return
      if (MAP[ny][nx] === TILE_WALL) return
      targetTile.current = { x: nx, y: ny }
    }
    window.addEventListener('keydown', handleKey)

    const moveTo = (clientX: number, clientY: number) => {
      if (fading.current) return
      const rect = canvas.getBoundingClientRect()
      const { tileSize, ox, oy } = layoutRef.current
      const tc = Math.floor((clientX - rect.left - ox) / tileSize)
      const tr = Math.floor((clientY - rect.top  - oy) / tileSize)
      if (tc < 0 || tc >= COLS || tr < 0 || tr >= ROWS) return
      if (MAP[tr][tc] === TILE_WALL) return
      targetTile.current = { x: tc, y: tr }
    }

    const handleClick = (e: MouseEvent) => moveTo(e.clientX, e.clientY)
    canvas.addEventListener('click', handleClick)

    const handleTouch = (e: TouchEvent) => {
      e.preventDefault()
      moveTo(e.touches[0].clientX, e.touches[0].clientY)
    }
    canvas.addEventListener('touchstart', handleTouch, { passive: false })

    // ── Draw loop ─────────────────────────────────────────────────────
    const draw = (t: number) => {
      const W = canvas.width
      const H = canvas.height
      if (!W || !H) { animId = requestAnimationFrame(draw); return }

      // Update layout
      const tileSize = Math.min(Math.floor(W / COLS), Math.floor(H / ROWS))
      const ox = Math.floor((W - COLS * tileSize) / 2)
      const oy = Math.floor((H - ROWS * tileSize) / 2)
      layoutRef.current = { tileSize, ox, oy }

      // Move player toward target (4px per frame in screen space)
      const dx   = targetTile.current.x - tilePos.current.x
      const dy   = targetTile.current.y - tilePos.current.y
      const dist = Math.hypot(dx, dy)
      const spd  = 4 / tileSize

      if (dist > spd * 0.5) {
        isMoving.current = true
        tilePos.current = {
          x: tilePos.current.x + (dx / dist) * spd,
          y: tilePos.current.y + (dy / dist) * spd,
        }
      } else if (dist > 0.01) {
        tilePos.current  = { x: targetTile.current.x, y: targetTile.current.y }
        isMoving.current = false
      } else {
        isMoving.current = false
      }

      // Room entry detection (fires when effective tile changes)
      const curX = Math.round(tilePos.current.x)
      const curY = Math.round(tilePos.current.y)
      if ((curX !== prevTile.current.x || curY !== prevTile.current.y) && !fading.current) {
        prevTile.current = { x: curX, y: curY }
        const inner = getInnerRoom(curX, curY)
        if (inner && inner.key !== enteredRoom.current) {
          enteredRoom.current = inner.key
          fading.current      = true
          fadeRoomKey.current = inner.key
          fadeAlpha.current   = 1.0
        } else if (!inner) {
          enteredRoom.current = null
        }
      }

      // Advance fade
      if (fading.current) {
        fadeAlpha.current = Math.max(0, fadeAlpha.current - 1 / 18)
        if (fadeAlpha.current <= 0) {
          fading.current = false
          onEnterRef.current(fadeRoomKey.current!)
          animId = requestAnimationFrame(draw)
          return
        }
      }

      // ── Render ───────────────────────────────────────────────────
      ctx.save()
      ctx.globalAlpha = fadeAlpha.current

      ctx.fillStyle = '#07060f'
      ctx.fillRect(0, 0, W, H)

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const tx   = ox + c * tileSize
          const ty   = oy + r * tileSize
          const tile = MAP[r][c]
          const room = ROOM_MAP[r][c]

          if (tile === TILE_WALL) {
            drawWall(ctx, tx, ty, tileSize)
          } else if (room) {
            const isBorder =
              c === room.x || c === room.x + room.w - 1 ||
              r === room.y || r === room.y + room.h - 1
            drawRoomTile(ctx, tx, ty, tileSize, c, r, room, isBorder)
          } else {
            drawCorridor(ctx, tx, ty, tileSize, c, r)
          }
        }
      }

      // Room labels (drawn on top of tiles)
      for (const room of ROOMS) {
        const rcx = ox + (room.x + room.w / 2) * tileSize
        const rcy = oy + (room.y + room.h / 2) * tileSize
        drawRoomLabel(ctx, rcx, rcy, tileSize, room)
      }

      // Player
      const bob  = isMoving.current ? Math.sin(t * 0.015) * 2 : Math.sin(t * 0.002) * 1
      const psx  = ox + (tilePos.current.x + 0.5) * tileSize
      const psy  = oy + (tilePos.current.y + 0.5) * tileSize + bob
      drawPlayer(ctx, psx, psy)

      ctx.restore()

      animId = requestAnimationFrame(draw)
    }

    animId = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animId)
      ro.disconnect()
      window.removeEventListener('keydown', handleKey)
      canvas.removeEventListener('click', handleClick)
      canvas.removeEventListener('touchstart', handleTouch)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="block w-full h-full cursor-pointer touch-none"
      tabIndex={0}
    />
  )
}

// ── Drawing helpers ───────────────────────────────────────────────────────────

function drawWall(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.fillStyle = '#1a1625'
  ctx.fillRect(x, y, s, s)
  // Top highlight
  ctx.fillStyle = '#2a2040'
  ctx.fillRect(x, y, s, Math.max(2, Math.min(8, Math.ceil(s * 0.2))))
  // Right-edge shadow
  ctx.fillStyle = '#0a0812'
  ctx.fillRect(x + s - 1, y, 1, s)
}

function drawRoomTile(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, s: number,
  c: number, r: number,
  room: Room,
  isBorder: boolean,
) {
  ctx.fillStyle = room.color
  ctx.fillRect(x, y, s, s)
  // Checkerboard shimmer
  ctx.fillStyle = (c + r) % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'
  ctx.fillRect(x, y, s, s)
  // Border darkening
  if (isBorder) {
    ctx.fillStyle = 'rgba(0,0,0,0.28)'
    ctx.fillRect(x, y, s, s)
  }
}

function drawCorridor(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, s: number,
  c: number, r: number,
) {
  ctx.fillStyle = (c + r) % 2 === 0 ? '#1e1a2e' : '#221e35'
  ctx.fillRect(x, y, s, s)
  ctx.strokeStyle = 'rgba(255,255,255,0.03)'
  ctx.lineWidth = 1
  ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1)
}

function drawRoomLabel(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  tileSize: number,
  room: Room,
) {
  const dotR  = Math.max(3, tileSize * 0.15)
  const dotY  = cy - tileSize * 0.45

  // Glow
  const grd = ctx.createRadialGradient(cx, dotY, 0, cx, dotY, dotR * 3)
  grd.addColorStop(0, room.dot + '66')
  grd.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.beginPath()
  ctx.arc(cx, dotY, dotR * 3, 0, Math.PI * 2)
  ctx.fillStyle = grd
  ctx.fill()

  // Dot
  ctx.beginPath()
  ctx.arc(cx, dotY, dotR, 0, Math.PI * 2)
  ctx.fillStyle = room.dot
  ctx.fill()

  // Label
  const fs = Math.max(8, Math.min(11, tileSize * 0.7))
  ctx.font = `bold ${fs}px system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.fillText(room.label, cx, dotY + dotR + 3)

  // Sublabel
  const sf = Math.max(6, fs * 0.78)
  ctx.font = `${sf}px system-ui, sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.38)'
  ctx.fillText(room.sublabel, cx, dotY + dotR + 3 + fs + 2)
}

function drawPlayer(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const r = 8

  // Drop shadow
  ctx.save()
  ctx.fillStyle = 'rgba(0,0,0,0.28)'
  ctx.beginPath()
  ctx.ellipse(x, y + r + 1, r * 0.65, r * 0.22, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // Glow
  const grd = ctx.createRadialGradient(x, y, 0, x, y, r * 2.6)
  grd.addColorStop(0, 'rgba(255,255,255,0.28)')
  grd.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.beginPath()
  ctx.arc(x, y, r * 2.6, 0, Math.PI * 2)
  ctx.fillStyle = grd
  ctx.fill()

  // Body
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.strokeStyle = '#a78bfa'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Label
  ctx.fillStyle = '#1a1528'
  ctx.font = 'bold 8px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('you', x, y)
}
