'use client'

import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

const COLS = 22
const ROWS = 18
const CENTER_COL = 11
const CENTER_ROW = 9

type TileType = 'grass' | 'water' | 'tree' | 'path'

type Tile = {
  type: TileType
  explored: boolean
}

function getTileType(col: number, row: number): TileType {
  if (Math.abs(col - CENTER_COL) <= 1 && Math.abs(row - CENTER_ROW) <= 1) return 'path'
  const v = Math.abs((col * 31 + row * 17) * 13 + col * row * 7 + 3) % 100
  if (v < 18) return 'water'
  if (v < 34) return 'tree'
  if (v < 44) return 'path'
  return 'grass'
}

function createTiles(): Tile[][] {
  return Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c) => ({
      type: getTileType(c, r),
      explored: Math.abs(c - CENTER_COL) <= 1 && Math.abs(r - CENTER_ROW) <= 1,
    })),
  )
}

const TILE_COLORS: Record<TileType, { top: string; edge: string }> = {
  grass: { top: '#2a5424', edge: '#1c3a18' },
  water: { top: '#1a3d6e', edge: '#0f2645' },
  tree:  { top: '#1e4828', edge: '#112e18' },
  path:  { top: '#4a3d35', edge: '#2e2520' },
}

export function useMapCanvas(canvasRef: RefObject<HTMLCanvasElement | null>) {
  const tilesRef = useRef<Tile[][]>(createTiles())
  const tileSizeRef = useRef({ tileW: 32, tileH: 16 })
  const offsetRef = useRef({ ox: 0, oy: 0 })

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

    const computeLayout = () => {
      const W = canvas.width
      const H = canvas.height
      const tileW = Math.max(Math.floor(W / 21), 18)
      const tileH = Math.max(Math.floor(tileW / 2), 9)
      const ox = W / 2 - (CENTER_COL - CENTER_ROW) * (tileW / 2)
      const oy = H / 2 - (CENTER_COL + CENTER_ROW) * (tileH / 2)
      tileSizeRef.current = { tileW, tileH }
      offsetRef.current = { ox, oy }
      return { tileW, tileH, ox, oy }
    }

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const { tileW, tileH } = tileSizeRef.current
      const { ox, oy } = offsetRef.current
      const dx = mx - ox
      const dy = my - oy
      const col = Math.round((dx / (tileW / 2) + dy / (tileH / 2)) / 2)
      const row = Math.round((dy / (tileH / 2) - dx / (tileW / 2)) / 2)
      if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return
      if (tilesRef.current[row][col].explored) return
      const dirs: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]]
      const adjacent = dirs.some(([dr, dc]) => {
        const nr = row + dr; const nc = col + dc
        return nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && tilesRef.current[nr][nc].explored
      })
      if (adjacent) tilesRef.current[row][col].explored = true
    }
    canvas.addEventListener('click', handleClick)

    const draw = (t: number) => {
      const W = canvas.width
      const H = canvas.height
      if (W === 0 || H === 0) { animId = requestAnimationFrame(draw); return }

      const { tileW, tileH, ox, oy } = computeLayout()
      const tiles = tilesRef.current

      ctx.fillStyle = '#050310'
      ctx.fillRect(0, 0, W, H)

      // Draw tiles back-to-front (painter's order: low r first, then low c)
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const sx = (c - r) * (tileW / 2) + ox
          const sy = (c + r) * (tileH / 2) + oy
          if (sx + tileW < 0 || sx - tileW > W) continue
          if (sy + tileH < 0 || sy - tileH * 3 > H) continue

          const tile = tiles[r][c]
          if (!tile.explored) {
            drawDiamond(ctx, sx, sy, tileW, tileH, '#0c0818', '#080510')
          } else {
            const col2 = TILE_COLORS[tile.type]
            drawDiamond(ctx, sx, sy, tileW, tileH, col2.top, col2.edge)
            if (tile.type === 'tree') drawTreeIcon(ctx, sx, sy, tileW, tileH)
            if (tile.type === 'water') drawWaterShimmer(ctx, sx, sy, tileW, tileH, t)
          }
        }
      }

      // Fog edge vignette over unexplored tiles (simple overlay)
      drawFogEdges(ctx, tiles, tileW, tileH, ox, oy)

      // Player icon at center
      const psx = (CENTER_COL - CENTER_ROW) * (tileW / 2) + ox
      const psy = (CENTER_COL + CENTER_ROW) * (tileH / 2) + oy + Math.sin(t * 0.002) * 2.5
      drawPlayer(ctx, psx, psy)

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

function drawDiamond(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  tw: number, th: number,
  topColor: string, edgeColor: string,
) {
  const hw = tw / 2
  const hh = th / 2
  ctx.beginPath()
  ctx.moveTo(cx, cy - hh)
  ctx.lineTo(cx + hw, cy)
  ctx.lineTo(cx, cy + hh)
  ctx.lineTo(cx - hw, cy)
  ctx.closePath()
  ctx.fillStyle = topColor
  ctx.fill()
  ctx.strokeStyle = edgeColor
  ctx.lineWidth = 0.6
  ctx.stroke()
}

function drawTreeIcon(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  tw: number, th: number,
) {
  const h = th * 1.4
  ctx.fillStyle = '#246632'
  ctx.beginPath()
  ctx.moveTo(cx, cy - th / 2 - h)
  ctx.lineTo(cx + tw * 0.18, cy - th / 2)
  ctx.lineTo(cx - tw * 0.18, cy - th / 2)
  ctx.closePath()
  ctx.fill()
}

function drawWaterShimmer(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  tw: number, th: number,
  t: number,
) {
  const alpha = 0.15 + Math.sin(t * 0.003 + cx * 0.05) * 0.1
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.strokeStyle = '#5ba3e0'
  ctx.lineWidth = 0.8
  ctx.beginPath()
  ctx.moveTo(cx - tw * 0.2, cy - th * 0.05)
  ctx.lineTo(cx + tw * 0.2, cy - th * 0.05)
  ctx.stroke()
  ctx.restore()
}

function drawFogEdges(
  ctx: CanvasRenderingContext2D,
  tiles: Tile[][],
  tileW: number, tileH: number,
  ox: number, oy: number,
) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!tiles[r][c].explored) continue
      const dirs: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]]
      for (const [dr, dc] of dirs) {
        const nr = r + dr; const nc = c + dc
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue
        if (tiles[nr][nc].explored) continue
        // Neighbor is unexplored — draw a fog gradient toward it
        const sx = (nc - nr) * (tileW / 2) + ox
        const sy = (nc + nr) * (tileH / 2) + oy
        const grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, tileW * 0.8)
        grd.addColorStop(0, 'rgba(5,3,16,0.65)')
        grd.addColorStop(1, 'rgba(5,3,16,0)')
        ctx.beginPath()
        ctx.arc(sx, sy, tileW * 0.8, 0, Math.PI * 2)
        ctx.fillStyle = grd
        ctx.fill()
      }
    }
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const r = 7
  const grd = ctx.createRadialGradient(x, y, 0, x, y, r * 2.8)
  grd.addColorStop(0, 'rgba(167,139,250,0.65)')
  grd.addColorStop(1, 'rgba(167,139,250,0)')
  ctx.beginPath()
  ctx.arc(x, y, r * 2.8, 0, Math.PI * 2)
  ctx.fillStyle = grd
  ctx.fill()

  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = '#a78bfa'
  ctx.fill()
  ctx.strokeStyle = '#ede9fe'
  ctx.lineWidth = 1.5
  ctx.stroke()
}
