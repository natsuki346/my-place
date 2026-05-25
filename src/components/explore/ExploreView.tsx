'use client'

import { useState, useEffect } from 'react'
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps'

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

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

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

function MapTab({ t }: { t: Theme }) {
  const [selectedCity, setSelectedCity] = useState<City | null>(null)

  return (
    <div className="flex-1 relative overflow-hidden" style={{ background: '#0f1e35' }}>
      <ComposableMap
        projectionConfig={{ scale: 130 }}
        style={{ width: '100%', height: '100%' }}
      >
        <ZoomableGroup>
          <Geographies geography={GEO_URL}>
            {({ geographies }: { geographies: unknown[] }) =>
              geographies.map((geo, i) => (
                <Geography
                  key={i}
                  geography={geo}
                  fill="#2a4a6b"
                  stroke="#3a6b8a"
                  strokeWidth={0.5}
                  style={{
                    default:  { outline: 'none' },
                    hover:    { outline: 'none', fill: '#3a5f80' },
                    pressed:  { outline: 'none' },
                  }}
                />
              ))
            }
          </Geographies>

          {CITIES.map((city) => (
            <Marker
              key={city.name}
              coordinates={city.coordinates}
              onClick={() => setSelectedCity(selectedCity?.name === city.name ? null : city)}
            >
              <circle r={5} fill={t.dot} className="animate-pulse" style={{ cursor: 'pointer' }} />
            </Marker>
          ))}

          {/* Bubble rendered in SVG space at selected city */}
          {selectedCity && (
            <Marker coordinates={selectedCity.coordinates}>
              <g transform="translate(-52,-68)">
                <rect rx={10} ry={10} width={104} height={44}
                  fill="white" style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }} />
                <text x={52} y={18} textAnchor="middle"
                  style={{ fontSize: '10px', fontWeight: 700, fill: '#1f2937', fontFamily: 'system-ui' }}>
                  {selectedCity.tag}
                </text>
                <text x={52} y={34} textAnchor="middle"
                  style={{ fontSize: '9px', fill: '#6b7280', fontFamily: 'system-ui' }}>
                  {selectedCity.name}
                </text>
                {/* caret */}
                <polygon points="46,44 58,44 52,54" fill="white" />
              </g>
            </Marker>
          )}
        </ZoomableGroup>
      </ComposableMap>

      <div
        style={{
          position: 'absolute', bottom: '14px', left: '50%',
          transform: 'translateX(-50%)',
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            fontSize: '11px',
            color: 'rgba(255,255,255,0.65)',
            background: 'rgba(0,0,0,0.28)',
            backdropFilter: 'blur(8px)',
            padding: '4px 14px',
            borderRadius: '20px',
            whiteSpace: 'nowrap',
          }}
        >
          ピンチ&ドラッグで操作
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
