'use client'

import { useState, useEffect, useRef } from 'react'

// ── Period ────────────────────────────────────────────────────────────────────

type Period = 'morning' | 'afternoon' | 'evening' | 'night'

function getPeriod(h: number): Period {
  return h >= 5 && h < 11 ? 'morning' : h >= 11 && h < 17 ? 'afternoon' : h >= 17 && h < 22 ? 'evening' : 'night'
}

// ── Theme ─────────────────────────────────────────────────────────────────────

type Theme = {
  dot: string; bg: string; text: string; sub: string; card: string
}

const MAP_THEME: Record<Period, Theme> = {
  morning:   { dot: '#0ea5e9', bg: '#eff6ff', text: '#1e40af', sub: '#6b7280', card: 'rgba(255,255,255,0.75)' },
  afternoon: { dot: '#3b82f6', bg: '#dbeafe', text: '#1d4ed8', sub: '#6b7280', card: 'rgba(255,255,255,0.75)' },
  evening:   { dot: '#f97316', bg: '#fff7ed', text: '#c2410c', sub: '#9ca3af', card: 'rgba(255,255,255,0.75)' },
  night:     { dot: '#818cf8', bg: '#0f0a2e', text: '#c7d2fe', sub: '#94a3b8', card: 'rgba(255,255,255,0.06)' },
}

// ── City data ─────────────────────────────────────────────────────────────────

const MAP_IMG = 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/World_map_-_low_resolution.svg/2560px-World_map_-_low_resolution.svg.png'

type City = { name: string; coordinates: [number, number]; tag: string }

const CITIES: City[] = [
  { name: 'Tokyo',        coordinates: [ 139.6917,  35.6895], tag: '#夜型人間'     },
  { name: 'New York',     coordinates: [ -74.0060,  40.7128], tag: '#コーヒー好き' },
  { name: 'London',       coordinates: [  -0.1278,  51.5074], tag: '#読書垢'       },
  { name: 'Paris',        coordinates: [   2.3522,  48.8566], tag: '#内向型'       },
  { name: 'Seoul',        coordinates: [ 126.9780,  37.5665], tag: '#HSP'          },
  { name: 'Sydney',       coordinates: [ 151.2093, -33.8688], tag: '#音楽好き'     },
  { name: 'São Paulo',    coordinates: [ -46.6333, -23.5505], tag: '#ひとり時間'   },
  { name: 'Mumbai',       coordinates: [  72.8777,  19.0760], tag: '#猫好き'       },
  { name: 'Cairo',        coordinates: [  31.2357,  30.0444], tag: '#夜型人間'     },
  { name: 'Moscow',       coordinates: [  37.6173,  55.7558], tag: '#内向型'       },
]

// ── Dummy data ────────────────────────────────────────────────────────────────

const TRENDS = [
  { tag: '#HSP',           count: '3.2k人' },
  { tag: '#夜型人間',     count: '2.8k人' },
  { tag: '#コーヒー好き', count: '2.1k人' },
  { tag: '#内向型',       count: '1.9k人' },
  { tag: '#読書垢',       count: '1.7k人' },
  { tag: '#音楽好き',     count: '1.4k人' },
  { tag: '#猫好き',       count: '1.2k人' },
  { tag: '#ひとり時間',   count: '980人'  },
]

const USERS = [
  { name: 'ゆき',   emoji: '🌙', tags: ['#夜型人間', '#HSP']          },
  { name: 'りょう', emoji: '☕', tags: ['#コーヒー好き', '#読書垢']    },
  { name: 'はな',   emoji: '🌸', tags: ['#内向型', '#猫好き']          },
  { name: 'けいた', emoji: '🎵', tags: ['#音楽好き', '#ひとり時間']    },
]

// ── Map tab ───────────────────────────────────────────────────────────────────

type Xform = { scale: number; tx: number; ty: number }

function MapTab({ t }: { t: Theme }) {
  const [selectedCity, setSelectedCity] = useState<City | null>(null)
  const [xform,        setXform]        = useState<Xform>({ scale: 1, tx: 0, ty: 0 })

  const containerRef = useRef<HTMLDivElement>(null)
  const xformRef     = useRef<Xform>({ scale: 1, tx: 0, ty: 0 })
  const didDragRef   = useRef(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let isPinching = false, isPanning = false
    let pinchDist0 = 0, pinchScale0 = 1
    let panX0 = 0, panY0 = 0, panTx0 = 0, panTy0 = 0
    let lastTap = 0

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        isPinching = true; isPanning = false
        pinchDist0 = Math.hypot(
          e.touches[1].clientX - e.touches[0].clientX,
          e.touches[1].clientY - e.touches[0].clientY,
        )
        pinchScale0 = xformRef.current.scale
      } else if (e.touches.length === 1) {
        const now = Date.now()
        if (now - lastTap < 280) {
          const reset = { scale: 1, tx: 0, ty: 0 }
          xformRef.current = reset; setXform(reset); setSelectedCity(null)
          lastTap = 0; isPanning = false; return
        }
        lastTap = now
        isPanning = true; isPinching = false; didDragRef.current = false
        panX0  = e.touches[0].clientX; panY0  = e.touches[0].clientY
        panTx0 = xformRef.current.tx;  panTy0 = xformRef.current.ty
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      if (e.touches.length === 2 && isPinching) {
        const dist = Math.hypot(
          e.touches[1].clientX - e.touches[0].clientX,
          e.touches[1].clientY - e.touches[0].clientY,
        )
        const s = Math.min(4, Math.max(1, pinchScale0 * dist / pinchDist0))
        xformRef.current = { ...xformRef.current, scale: s }
        setXform({ ...xformRef.current })
      } else if (e.touches.length === 1 && isPanning) {
        const dx = e.touches[0].clientX - panX0
        const dy = e.touches[0].clientY - panY0
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) didDragRef.current = true
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

  // Forward transform: city lon/lat → screen position for the bubble
  const bubPos = (() => {
    if (!selectedCity || !containerRef.current) return null
    const rect = containerRef.current.getBoundingClientRect()
    if (!rect.width) return null
    const { scale, tx, ty } = xform
    const W = rect.width, H = rect.height
    const localX = (selectedCity.coordinates[0] + 180) / 360 * W
    const localY = (90 - selectedCity.coordinates[1]) / 180 * H
    const screenX = (localX - W / 2) * scale + W / 2 + tx
    const screenY = (localY - H / 2) * scale + H / 2 + ty
    if (screenX < 0 || screenX > W || screenY < 20 || screenY > H) return null
    return { x: Math.min(Math.max(screenX, 60), W - 60), y: screenY }
  })()

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden"
      style={{ touchAction: 'none', background: '#0f1e35' }}
    >
      {/* ── Pan/zoom wrapper ──────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute', inset: 0,
          transform: `translate(${xform.tx}px,${xform.ty}px) scale(${xform.scale})`,
          transformOrigin: 'center center',
          willChange: 'transform',
        }}
      >
        <img
          src={MAP_IMG}
          alt=""
          draggable={false}
          style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block', userSelect: 'none', pointerEvents: 'none' }}
        />

        {/* City dots – positioned by equirectangular lon/lat */}
        {CITIES.map((city) => {
          const left = (city.coordinates[0] + 180) / 360 * 100
          const top  = (90 - city.coordinates[1]) / 180 * 100
          return (
            <div
              key={city.name}
              onClick={() => { if (!didDragRef.current) setSelectedCity(selectedCity?.name === city.name ? null : city) }}
              style={{
                position: 'absolute',
                left: `${left}%`,
                top:  `${top}%`,
                transform: 'translate(-50%,-50%)',
                cursor: 'pointer',
                zIndex: 2,
              }}
            >
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: t.dot,
                boxShadow: `0 0 8px ${t.dot}`,
              }} />
            </div>
          )
        })}
      </div>

      {/* ── Bubble overlay (screen coords, outside transform) ─────── */}
      {bubPos && selectedCity && (
        <div
          style={{
            position: 'absolute',
            left: `${bubPos.x}px`,
            top:  `${bubPos.y - 62}px`,
            transform: 'translateX(-50%)',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          <div style={{
            background: 'white', borderRadius: '12px',
            padding: '8px 14px',
            boxShadow: '0 6px 24px rgba(0,0,0,0.28)',
            whiteSpace: 'nowrap',
          }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: '#1f2937' }}>{selectedCity.tag}</p>
            <p style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>{selectedCity.name}</p>
          </div>
          <div style={{
            position: 'absolute', bottom: '-8px', left: '50%',
            transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '7px solid transparent',
            borderRight: '7px solid transparent',
            borderTop: '9px solid white',
          }} />
        </div>
      )}

      {/* ── Hint ─────────────────────────────────────────────────── */}
      <div style={{ position: 'absolute', bottom: '14px', left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none' }}>
        <span style={{
          fontSize: '11px', color: 'rgba(255,255,255,0.65)',
          background: 'rgba(0,0,0,0.28)', backdropFilter: 'blur(8px)',
          padding: '4px 14px', borderRadius: '20px', whiteSpace: 'nowrap',
        }}>
          ダブルタップでリセット
        </span>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function ExploreView() {
  const [period,  setPeriod]  = useState<Period>('night')
  const [mainTab, setMainTab] = useState<'search' | 'map'>('search')
  const [query,   setQuery]   = useState('')
  const [subTab,  setSubTab]  = useState<'trend' | 'user'>('trend')

  useEffect(() => {
    setPeriod(getPeriod(new Date().getHours()))
    const id = setInterval(() => setPeriod(getPeriod(new Date().getHours())), 60_000)
    return () => clearInterval(id)
  }, [])

  const t = MAP_THEME[period]

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ background: t.bg, fontFamily: 'system-ui, sans-serif' }}
    >
      {/* ── Main tab bar ────────────────────────────────────────────── */}
      <div className="flex flex-shrink-0" style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
        {(['search', 'map'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setMainTab(tab)}
            style={{
              flex: 1,
              padding: '12px 0',
              fontSize: '14px',
              fontWeight: mainTab === tab ? 700 : 400,
              color: mainTab === tab ? t.text : '#9ca3af',
              borderBottom: mainTab === tab ? `2px solid ${t.dot}` : '2px solid transparent',
              background: 'transparent',
              transition: 'color 0.15s',
            }}
          >
            {tab === 'search' ? 'Search' : 'Map'}
          </button>
        ))}
      </div>

      {/* ── Search tab ──────────────────────────────────────────────── */}
      {mainTab === 'search' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search bar */}
          <div className="flex-shrink-0 px-4 pt-3 pb-2">
            <div
              className="flex items-center gap-2"
              style={{ background: 'rgba(0,0,0,0.07)', borderRadius: '24px', padding: '10px 16px' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke={t.text} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ユーザー名・ハッシュタグを検索"
                className="flex-1 bg-transparent outline-none"
                style={{ fontSize: '14px', color: t.text }}
              />
            </div>
          </div>

          {/* Sub tabs */}
          <div
            className="flex flex-shrink-0"
            style={{ borderBottom: '1px solid rgba(0,0,0,0.08)', paddingLeft: '16px' }}
          >
            {(['trend', 'user'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSubTab(tab)}
                style={{
                  padding: '8px 20px',
                  fontSize: '13px',
                  fontWeight: subTab === tab ? 600 : 400,
                  color: subTab === tab ? t.text : '#9ca3af',
                  borderBottom: subTab === tab ? `2px solid ${t.dot}` : '2px solid transparent',
                  background: 'transparent',
                  transition: 'color 0.15s',
                }}
              >
                {tab === 'trend' ? 'トレンド' : 'ユーザー'}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {subTab === 'trend' ? (
              <div>
                {TRENDS.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-4 py-3"
                    style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}
                  >
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: t.text }}>{item.tag}</p>
                      <p style={{ fontSize: '11px', color: t.sub, marginTop: '1px' }}>{item.count}</p>
                    </div>
                    <span style={{ color: t.sub, fontSize: '18px' }}>›</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2 p-3">
                {USERS.map((user, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3"
                    style={{ background: t.card, borderRadius: '14px', padding: '12px 14px' }}
                  >
                    <div
                      style={{
                        width: '44px', height: '44px', borderRadius: '50%',
                        background: 'rgba(0,0,0,0.08)', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px',
                      }}
                    >
                      {user.emoji}
                    </div>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: t.text }}>{user.name}</p>
                      <p style={{ fontSize: '11px', color: t.sub, marginTop: '2px' }}>
                        {user.tags.join('  ')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Map tab ─────────────────────────────────────────────────── */}
      {mainTab === 'map' && <MapTab t={t} />}
    </div>
  )
}
