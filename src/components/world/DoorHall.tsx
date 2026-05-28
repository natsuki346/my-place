'use client'

import { useEffect, useRef, useState } from 'react'

// ── Period ────────────────────────────────────────────────────────────────────

type Period = 'morning' | 'afternoon' | 'evening' | 'night'

function getPeriod(hour: number): Period {
  if (hour >= 18 || hour < 5) return 'night'
  if (hour < 11) return 'morning'
  if (hour < 15) return 'afternoon'
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

// ── Door types & data ─────────────────────────────────────────────────────────

type DoorCustom = {
  doorColor:       string   // ドア木材色
  doorAccentColor: string   // フレーム・パネル色
  labelBgColor:    string   // ラベル背景（#RRGGBBaa形式可）
  labelTextColor:  string   // ラベルテキスト色
  knobColor:       string   // ノブ色
}

type DoorRoom = { key: string; label: string; sublabel: string } & DoorCustom

type CustomTab = 'door' | 'accent' | 'label' | 'knob'

const DEFAULT_CUSTOM: DoorCustom = {
  doorColor:       '#8B6343',
  doorAccentColor: '#6B4C30',
  labelBgColor:    '#1a0a00cc',
  labelTextColor:  '#ffffff',
  knobColor:       '#D4AF37',
}

const DEFAULT_DOORS: DoorRoom[] = [
  { key: 'myroom',  label: '心の部屋',  sublabel: 'my space', ...DEFAULT_CUSTOM },
  { key: 'friend1', label: 'Hana',       sublabel: 'friend',   ...DEFAULT_CUSTOM },
  { key: 'friend2', label: 'Ryo',        sublabel: 'friend',   ...DEFAULT_CUSTOM },
  { key: 'id1',     label: '#内向型',    sublabel: '247人',    ...DEFAULT_CUSTOM },
  { key: 'id2',     label: '#夜型人間',  sublabel: '1.2k人',   ...DEFAULT_CUSTOM },
  { key: 'id3',     label: '#HSP',       sublabel: '892人',    ...DEFAULT_CUSTOM },
  { key: 'add',     label: '追加する',   sublabel: '新しい扉', ...DEFAULT_CUSTOM },
]

const PRESET_DOOR_COLORS   = ['#8B6343','#5C3A1E','#2C1810','#4A7C59','#1a3a5c','#8B0000','#4A4A4A','#D4A853']
const PRESET_ACCENT_COLORS = ['#6B4C30','#3D2010','#1a2a3c','#2d5a3d','#600000','#333333','#B8860B','#C0C0C0']
const PRESET_LABEL_BG      = ['#000000cc','#1a1a2ecc','#2d0a0acc','#0a2d0acc','#2d2d00cc','#2d002dcc']
const PRESET_LABEL_TEXT    = ['#ffffff','#FFD700','#FF69B4','#00CED1','#98FB98','#FFA07A']
const PRESET_KNOB_COLORS   = ['#D4AF37','#C0C0C0','#CD7F32','#1a1a1a','#ffffff']

const CUSTOMIZABLE_KEYS = new Set(['myroom', 'id1', 'id2', 'id3'])

const TABS = [
  { key: 'all',      label: 'すべて' },
  { key: 'identity', label: 'アイデンティティ' },
  { key: 'friends',  label: 'フレンド' },
]

const TAB_FILTER: Record<string, string[]> = {
  all:      DEFAULT_DOORS.map(d => d.key),
  identity: ['id1', 'id2', 'id3', 'add'],
  friends:  ['myroom', 'friend1', 'friend2', 'add'],
}

const DOOR_W   = 130
const DOOR_H   = 210
const DOOR_GAP = 150

type Door = DoorRoom

// ── Door SVG preview ──────────────────────────────────────────────────────────

function DoorPreview({ custom, W: propW, H: propH }: { custom: DoorCustom; W?: number; H?: number }) {
  const W = propW ?? 70, H = propH ?? 108
  const fw = W + 10, fh = H + 10
  const px = 5 + 8,  pw = W - 16
  return (
    <svg width={fw} height={fh} viewBox={`0 0 ${fw} ${fh}`} style={{ display: 'block', borderRadius: '4px' }}>
      <rect x="0" y="0" width={fw} height={fh} fill={custom.doorAccentColor} rx="3" />
      <rect x="5" y="5" width={W} height={H} fill={custom.doorColor} />
      {[1,2,3,4].map(i => (
        <line key={i} x1={5+W/5*i} y1="5" x2={5+W/5*i} y2={5+H} stroke="rgba(0,0,0,0.07)" strokeWidth="1" />
      ))}
      <rect x={px} y={5+20} width={pw} height={Math.floor(H*0.28)} fill="rgba(0,0,0,0.13)" rx="2" />
      <rect x={px} y={5+20+Math.floor(H*0.28)+5} width={pw} height={Math.floor(H*0.36)} fill="rgba(0,0,0,0.13)" rx="2" />
      <rect x={5+W/2-26} y={5+Math.floor(H*0.38)} width={52} height={19} fill={custom.labelBgColor} rx="4" />
      <circle cx={5+W-10} cy={5+Math.floor(H*0.68)} r={5} fill={custom.knobColor} />
      <circle cx={5+W-10} cy={5+Math.floor(H*0.68)} r={5} stroke={custom.doorAccentColor} strokeWidth="0.8" fill="none" />
    </svg>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

type DoorHallProps = { onEnterRoom: (key: string) => void }

export function DoorHall({ onEnterRoom }: DoorHallProps) {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const onEnterRef   = useRef(onEnterRoom)
  onEnterRef.current = onEnterRoom

  const [activeTab,        setActiveTab]        = useState('all')
  const [period,           setPeriod]           = useState<Period>('night')
  const [favorites,        setFavorites]        = useState<string[]>([])
  const [showFavorites,    setShowFavorites]    = useState(false)
  const [doors,            setDoors]            = useState<DoorRoom[]>(DEFAULT_DOORS)
  const [customizingDoorId, setCustomizingDoorId] = useState<string | null>(null)
  const [draftCustom,      setDraftCustom]      = useState<DoorCustom>(DEFAULT_CUSTOM)
  const [customTab,        setCustomTab]        = useState<CustomTab>('door')
  const [isLibraryOpen,    setIsLibraryOpen]    = useState(false)

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

  const filteredDoors = doors.filter(d => TAB_FILTER[activeTab].includes(d.key))

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
    <div className={`flex flex-col bg-gradient-to-b ${theme.bg}`} style={{ height: '100%', position: 'relative' }}>
      {/* ── Tab bar ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-2 px-4 py-3 flex-shrink-0">
        {TABS.map(tab => {
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                active
                  ? `${tabActiveBg[period]} text-white font-bold`
                  : theme.dark ? 'text-white/75 font-medium' : 'text-gray-800 font-medium'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
        <button
          onClick={() => setShowFavorites(true)}
          className={`px-3 py-1.5 rounded-full text-base transition-colors ${
            favorites.length > 0
              ? `${tabActiveBg[period]} text-white`
              : theme.dark ? 'text-white/75' : 'text-gray-800'
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

      {/* ── 図鑑ボタン ───────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex justify-center py-2">
        <button
          onClick={() => setIsLibraryOpen(true)}
          style={{ background: 'rgba(255,255,255,0.82)', borderRadius: '999px', padding: '7px 20px', boxShadow: '0 2px 12px rgba(0,0,0,0.14)', fontSize: '13px', fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: '6px', backdropFilter: 'blur(6px)' }}
        >
          📚 図鑑
        </button>
      </div>

      {/* ── 図鑑サブ画面 ─────────────────────────────────────────── */}
      <DoorLibrary
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        doors={doors}
        onSaveDoor={(key, custom) => setDoors(prev => prev.map(d => d.key === key ? { ...d, ...custom } : d))}
        theme={theme}
      />

      {/* ── Customize bottom sheet ──────────────────────────────── */}
      {customizingDoorId && (() => {
        const CUSTOM_TABS: { key: CustomTab; label: string }[] = [
          { key: 'door',   label: 'ドア色' },
          { key: 'accent', label: '装飾' },
          { key: 'label',  label: 'ラベル' },
          { key: 'knob',   label: 'ノブ' },
        ]
        const SWATCH_MAP: Record<CustomTab, string[]> = {
          door:   PRESET_DOOR_COLORS,
          accent: PRESET_ACCENT_COLORS,
          label:  PRESET_LABEL_BG,
          knob:   PRESET_KNOB_COLORS,
        }
        const FIELD_MAP: Record<CustomTab, keyof DoorCustom> = {
          door:   'doorColor',
          accent: 'doorAccentColor',
          label:  'labelBgColor',
          knob:   'knobColor',
        }
        const isDark = theme.dark
        const hdr  = isDark ? '#c7d2fe' : '#1f2937'
        const sub  = isDark ? '#94a3b8' : '#6b7280'
        const bg   = isDark ? '#1e1b4b' : '#ffffff'
        const tabActiveBg = isDark ? '#7c3aed' : '#3b82f6'
        const tabInactBg  = isDark ? 'rgba(255,255,255,0.08)' : '#f3f4f6'
        const saveBg  = isDark ? '#7c3aed' : '#3b82f6'
        return (
          <>
            <div
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.50)', zIndex: 100 }}
              onClick={() => setCustomizingDoorId(null)}
            />
            <div style={{
              position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
              width: '100%', maxWidth: '390px', maxHeight: '72dvh',
              background: bg, borderRadius: '16px 16px 0 0',
              zIndex: 101, display: 'flex', flexDirection: 'column',
            }}>
              {/* Handle */}
              <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
                <div style={{ width: '32px', height: '3px', background: isDark ? 'rgba(255,255,255,0.18)' : '#e5e7eb', borderRadius: '2px' }} />
              </div>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 16px 10px' }}>
                <span style={{ fontSize: '15px', fontWeight: 600, color: hdr }}>🎨 ドアをカスタマイズ</span>
                <button onClick={() => setCustomizingDoorId(null)} style={{ color: sub, fontSize: '22px', lineHeight: 1 }}>×</button>
              </div>
              {/* Preview */}
              <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: '12px' }}>
                <DoorPreview custom={draftCustom} />
              </div>
              {/* Tabs */}
              <div style={{ display: 'flex', gap: '8px', padding: '0 16px 12px' }}>
                {CUSTOM_TABS.map(t => (
                  <button
                    key={t.key}
                    onClick={() => setCustomTab(t.key)}
                    style={{
                      flex: 1, padding: '6px 0', borderRadius: '8px', fontSize: '12px',
                      fontWeight: customTab === t.key ? 700 : 400,
                      background: customTab === t.key ? tabActiveBg : tabInactBg,
                      color: customTab === t.key ? '#ffffff' : sub,
                    }}
                  >{t.label}</button>
                ))}
              </div>
              {/* Color swatches */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 8px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {SWATCH_MAP[customTab].map(color => {
                    const field = FIELD_MAP[customTab]
                    const selected = draftCustom[field] === color
                    return (
                      <button
                        key={color}
                        onClick={() => setDraftCustom(prev => ({ ...prev, [field]: color }))}
                        style={{
                          width: '40px', height: '40px', borderRadius: '8px',
                          background: color,
                          border: selected ? '3px solid #ffffff' : '2px solid rgba(0,0,0,0.15)',
                          boxShadow: selected ? '0 0 0 2px #3b82f6' : 'none',
                          flexShrink: 0,
                        }}
                      />
                    )
                  })}
                </div>
                {customTab === 'label' && (
                  <>
                    <p style={{ fontSize: '11px', color: sub, margin: '12px 0 8px', fontWeight: 600 }}>テキスト色</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      {PRESET_LABEL_TEXT.map(color => {
                        const selected = draftCustom.labelTextColor === color
                        return (
                          <button
                            key={color}
                            onClick={() => setDraftCustom(prev => ({ ...prev, labelTextColor: color }))}
                            style={{
                              width: '40px', height: '40px', borderRadius: '8px',
                              background: color,
                              border: selected ? '3px solid #3b82f6' : '2px solid rgba(0,0,0,0.15)',
                              boxShadow: selected ? '0 0 0 2px #818cf8' : 'none',
                              flexShrink: 0,
                            }}
                          />
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
              {/* Save */}
              <div style={{ padding: '12px 16px', paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
                <button
                  onClick={() => {
                    setDoors(prev => prev.map(d => d.key === customizingDoorId ? { ...d, ...draftCustom } : d))
                    setCustomizingDoorId(null)
                  }}
                  style={{
                    width: '100%', padding: '12px', borderRadius: '12px',
                    fontWeight: 700, fontSize: '15px',
                    background: saveBg, color: '#ffffff',
                  }}
                >保存する</button>
              </div>
            </div>
          </>
        )
      })()}

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
                  const door = doors.find(d => d.key === key)
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

// ── Door Library sub-page ────────────────────────────────────────────────────

type DoorLibraryProps = {
  isOpen: boolean
  onClose: () => void
  doors: DoorRoom[]
  onSaveDoor: (key: string, custom: DoorCustom) => void
  theme: Theme
}

function DoorLibrary({ isOpen, onClose, doors, onSaveDoor, theme }: DoorLibraryProps) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [draftMap,    setDraftMap]    = useState<Record<string, DoorCustom>>({})

  const pickerRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const isDark   = theme.dark
  const bg       = isDark ? '#0d0a1a' : '#f8fafc'
  const hdrBg    = isDark ? '#140e2a' : '#ffffff'
  const border   = isDark ? '#1e1a2e' : '#e5e7eb'
  const textCol  = isDark ? '#c7d2fe' : '#1f2937'
  const subCol   = isDark ? '#94a3b8' : '#6b7280'
  const accent   = isDark ? '#a78bfa' : '#3b82f6'
  const accentBg = isDark ? 'rgba(167,139,250,0.12)' : 'rgba(59,130,246,0.09)'
  const expandBg = isDark ? 'rgba(124,58,237,0.06)' : 'rgba(59,130,246,0.03)'

  type ColorSection = { field: keyof DoorCustom; label: string; pickerKey: string; keepAlpha: boolean }
  const COLOR_SECTIONS: ColorSection[] = [
    { field: 'doorColor',       label: 'ドア色',         pickerKey: 'door',      keepAlpha: false },
    { field: 'doorAccentColor', label: '装飾色',         pickerKey: 'accent',    keepAlpha: false },
    { field: 'labelBgColor',    label: 'ラベル背景',     pickerKey: 'labelBg',   keepAlpha: true  },
    { field: 'labelTextColor',  label: 'ラベルテキスト', pickerKey: 'labelText', keepAlpha: false },
    { field: 'knobColor',       label: 'ノブ色',         pickerKey: 'knob',      keepAlpha: false },
  ]

  const toggleExpand = (door: DoorRoom) => {
    if (expandedKey === door.key) {
      setExpandedKey(null)
    } else {
      const { doorColor, doorAccentColor, labelBgColor, labelTextColor, knobColor } = door
      setDraftMap(prev => ({ ...prev, [door.key]: { doorColor, doorAccentColor, labelBgColor, labelTextColor, knobColor } }))
      setExpandedKey(door.key)
    }
  }

  const updateColor = (doorKey: string, field: keyof DoorCustom, hex: string) =>
    setDraftMap(prev => ({ ...prev, [doorKey]: { ...prev[doorKey], [field]: hex } }))

  const displayDoors = doors.filter(d => d.key !== 'add')

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 70,
      background: bg,
      transform: `translateX(${isOpen ? '0%' : '100%'})`,
      transition: 'transform 0.3s ease',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 16px', background: hdrBg, borderBottom: `1px solid ${border}`, gap: 8 }}>
        <button onClick={onClose} style={{ color: accent, fontSize: '14px', background: 'none', border: 'none', cursor: 'pointer', minWidth: 60, textAlign: 'left' }}>← 戻る</button>
        <span style={{ flex: 1, textAlign: 'center', color: textCol, fontSize: '15px', fontWeight: 600 }}>📚 図鑑</span>
        <span style={{ minWidth: 60 }} />
      </div>

      {/* Door list */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '20px' }}>
        {displayDoors.map(door => {
          const isExpanded    = expandedKey === door.key
          const draft         = draftMap[door.key]
          const previewCustom = (isExpanded && draft) ? draft : door
          const typeLabel     = door.key.startsWith('id') ? 'アイデンティティ' : door.key === 'myroom' ? 'マイルーム' : 'フレンド'

          return (
            <div key={door.key}>
              {/* Card row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: `1px solid ${border}`, background: isExpanded ? expandBg : 'transparent' }}>
                <DoorPreview custom={previewCustom} W={52} H={80} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: textCol, fontSize: '14px', fontWeight: 700, marginBottom: '3px' }}>{door.label}</p>
                  <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: accentBg, color: accent, border: `1px solid ${accent}33` }}>{typeLabel}</span>
                  <p style={{ color: subCol, fontSize: '11px', marginTop: '3px' }}>{door.sublabel}</p>
                </div>
                <button
                  onClick={() => toggleExpand(door)}
                  style={{ flexShrink: 0, fontSize: '12px', padding: '5px 14px', borderRadius: '14px', background: isExpanded ? accent : accentBg, color: isExpanded ? '#ffffff' : accent, border: `1px solid ${accent}55`, cursor: 'pointer' }}
                >{isExpanded ? '閉じる' : '編集'}</button>
              </div>

              {/* Accordion */}
              <div style={{ maxHeight: isExpanded ? '640px' : '0px', overflow: 'hidden', transition: 'max-height 0.35s ease', background: expandBg, borderBottom: isExpanded ? `1px solid ${border}` : 'none' }}>
                <div style={{ padding: '14px 16px 20px' }}>
                  {/* RGB sliders for each color field */}
                  {COLOR_SECTIONS.map(({ field, label, pickerKey, keepAlpha }) => {
                    const currHex  = (draft?.[field] ?? door[field]) as string
                    const rgb      = hexToRgb(currHex)
                    const hex6     = currHex.slice(0, 7)
                    const alphaSfx = keepAlpha && currHex.length >= 9 ? currHex.slice(7) : ''
                    const refKey   = `${door.key}-${pickerKey}`

                    return (
                      <div key={field} style={{ marginBottom: '14px' }}>
                        <p style={{ fontSize: '11px', color: subCol, fontWeight: 600, marginBottom: '6px' }}>{label}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {/* Color preview swatch */}
                          <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: hex6, border: `1px solid ${border}`, flexShrink: 0 }} />
                          {/* RGB sliders */}
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            {([
                              { ch: 'r', lbl: 'R', val: rgb.r, col: '#ef4444' },
                              { ch: 'g', lbl: 'G', val: rgb.g, col: '#22c55e' },
                              { ch: 'b', lbl: 'B', val: rgb.b, col: '#3b82f6' },
                            ] as const).map(({ ch, lbl, val, col }) => (
                              <div key={ch} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <span style={{ fontSize: '10px', color: subCol, width: '10px', flexShrink: 0, fontWeight: 600 }}>{lbl}</span>
                                <input
                                  type="range" min={0} max={255} value={val}
                                  style={{ flex: 1, accentColor: col, cursor: 'pointer' }}
                                  onChange={e => {
                                    const n    = parseInt(e.target.value)
                                    const nr   = ch === 'r' ? n : rgb.r
                                    const ng   = ch === 'g' ? n : rgb.g
                                    const nb   = ch === 'b' ? n : rgb.b
                                    updateColor(door.key, field, rgbToHex(nr, ng, nb) + alphaSfx)
                                  }}
                                />
                                <span style={{ fontSize: '10px', color: subCol, width: '22px', textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{val}</span>
                              </div>
                            ))}
                          </div>
                          {/* Native picker trigger */}
                          <button
                            onClick={() => pickerRefs.current[refKey]?.click()}
                            style={{ flexShrink: 0, width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '7px', background: accentBg, border: `1px solid ${accent}55`, fontSize: '14px', cursor: 'pointer' }}
                          >🎨</button>
                          <input
                            type="color"
                            style={{ display: 'none' }}
                            ref={el => { pickerRefs.current[refKey] = el }}
                            value={hex6}
                            onChange={e => updateColor(door.key, field, e.target.value + alphaSfx)}
                          />
                        </div>
                      </div>
                    )
                  })}

                  {/* Save */}
                  <button
                    onClick={() => {
                      if (draft) {
                        onSaveDoor(door.key, draft)
                        setDraftMap(prev => { const n = { ...prev }; delete n[door.key]; return n })
                        setExpandedKey(null)
                      }
                    }}
                    style={{ width: '100%', padding: '11px', borderRadius: '10px', fontWeight: 700, fontSize: '14px', background: 'linear-gradient(to right, #a855f7, #ec4899)', color: '#ffffff', marginTop: '8px' }}
                  >保存する</button>
                </div>
              </div>
            </div>
          )
        })}
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
  ctx.setLineDash([])
  ctx.beginPath()
  ctx.moveTo(cx, topY)
  ctx.lineTo(cx, 0)
  ctx.stroke()

  // ── Ghost "add" door ─────────────────────────────────────────────
  if (door.key === 'add') {
    // Subtle fill
    ctx.fillStyle = hexToRgba(theme.glow, 0.06)
    ctx.fillRect(x, topY, w, h)

    // Dashed border
    ctx.setLineDash([7, 4])
    ctx.strokeStyle = hexToRgba(theme.glow, 0.55)
    ctx.lineWidth = 1.8
    ctx.strokeRect(x, topY, w, h)
    ctx.setLineDash([])

    // Large "＋"
    ctx.font = 'bold 48px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = hexToRgba(theme.glow, 0.85)
    ctx.fillText('+', cx, topY + h * 0.40)

    // "追加する" label — no pill, plain text
    ctx.font = 'bold 13px system-ui, sans-serif'
    ctx.fillStyle = hexToRgba(theme.glow, 0.65)
    ctx.fillText('追加する', cx, topY + h * 0.64)

    // Opening flash
    if (isOpening && progress > 0) {
      ctx.fillStyle = `rgba(255,255,255,${Math.min(0.92, progress * 0.85)})`
      ctx.fillRect(x, topY, w, h)
    }
    return
  }

  // Door frame
  ctx.setLineDash([])
  ctx.fillStyle = door.doorAccentColor
  ctx.fillRect(x - 6, topY - 6, w + 12, h + 12)

  // Door body
  ctx.fillStyle = door.doorColor
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

  // Center label (ドア中央・ノブ上)
  ctx.font = 'bold 15px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const mainTxtW  = ctx.measureText(door.label).width
  const mainPillW = Math.min(w - 8, mainTxtW + 24)
  const mainPillH = 28
  const mainPillX = cx - mainPillW / 2
  const mainPillY = topY + Math.floor(h * 0.40)

  ctx.fillStyle = hexToCanvasColor(door.labelBgColor)
  roundRect(ctx, mainPillX, mainPillY, mainPillW, mainPillH, 8)
  ctx.fill()

  ctx.fillStyle = door.labelTextColor
  ctx.fillText(door.label, cx, mainPillY + mainPillH / 2)

  // Sublabel (人数・種別)
  ctx.font = '11px system-ui, sans-serif'

  const subTxtW  = ctx.measureText(door.sublabel).width
  const subPillW = Math.min(w - 20, subTxtW + 16)
  const subPillH = 17
  const subPillX = cx - subPillW / 2
  const subPillY = mainPillY + mainPillH + 4

  ctx.fillStyle = hexToCanvasColor(door.labelBgColor, 0.48)
  roundRect(ctx, subPillX, subPillY, subPillW, subPillH, 8)
  ctx.fill()

  ctx.fillStyle = hexToCanvasColor(door.labelTextColor, 0.80)
  ctx.fillText(door.sublabel, cx, subPillY + subPillH / 2)

  // Doorknob
  ctx.beginPath()
  ctx.arc(x + w - 14, topY + h * 0.68, 6, 0, Math.PI * 2)
  ctx.fillStyle = door.knobColor
  ctx.fill()
  ctx.strokeStyle = door.doorAccentColor
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

// Converts 6-char (#RRGGBB) or 8-char (#RRGGBBaa) hex to canvas rgba string.
// alphaOverride replaces any embedded alpha.
function hexToCanvasColor(hex: string, alphaOverride?: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  let a: number
  if (alphaOverride !== undefined) {
    a = alphaOverride
  } else if (hex.length >= 9) {
    a = parseInt(hex.slice(7, 9), 16) / 255
  } else {
    a = 1
  }
  return `rgba(${r},${g},${b},${a.toFixed(3)})`
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.slice(0, 7) // ignore any trailing alpha chars
  const m = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h)
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r: 128, g: 128, b: 128 }
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0')).join('')
}

