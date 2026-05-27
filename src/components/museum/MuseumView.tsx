'use client'

import { useState, useEffect, useRef } from 'react'
import { SkyLayer } from '@/components/room/SkyLayer'

// ── Types ─────────────────────────────────────────────────────────────────────

type Period    = 'morning' | 'afternoon' | 'evening' | 'night'
type MuseumTab = 'museum' | 'profile'
type Pose      = 'stand' | 'arms' | 'onehand' | 'sit'

type Item = {
  id:       string
  kind:     'tag' | 'emoji' | 'avatar'
  content:  string
  x:        number
  y:        number
  size:     number
  color?:   string
  pose?:    Pose
}

type CanvasData = { id: number; items: Item[] }

type DragState      = { id: string; ox: number; oy: number; startX: number; startY: number }
type SheetSelection = { kind: 'tag' | 'emoji'; content: string }

// ── Helpers ───────────────────────────────────────────────────────────────────

function getPeriod(h: number): Period {
  if (h >= 22 || h < 5) return 'night'
  if (h < 11)           return 'morning'
  if (h < 17)           return 'afternoon'
  return 'evening'
}

const TAB_ACTIVE_COLOR: Record<Period, string> = {
  morning: '#0284c7', afternoon: '#2563eb', evening: '#ea580c', night: '#a78bfa',
}

// ── Constants ─────────────────────────────────────────────────────────────────

const IDENTITY_TAGS  = ['#夜型', '#音楽好き', '#猫派', '#インドア', '#映画', '#読書', '#ゲーマー', '#アート', '#旅行', '#コーヒー']
const EMOJI_STAMPS   = ['🎵', '⭐', '🌙', '🎨', '🌸', '💫', '🎮', '📚', '🎭', '🌈', '🔥', '💎', '🎪', '🌊', '🦋', '🎸']
const TAG_COLORS     = ['#6d28d9', '#db2777', '#2563eb', '#16a34a', '#ea580c', '#111827']
const PROFILE_TAGS   = ['#夜型', '#音楽好き', '#猫派', '#インドア']
const INITIAL_TAGS   = ['#音楽', '#夜型', '#猫好き']
const INITIAL_EMOJIS = ['🎵', '⭐', '🌙']

const HEADER_GRADIENT: Record<Period, string> = {
  morning:   'linear-gradient(155deg, #0ea5e9 0%, #ffd080 100%)',
  afternoon: 'linear-gradient(155deg, #1d4ed8 0%, #60a5fa 100%)',
  evening:   'linear-gradient(155deg, #ea580c 0%, #9333ea 100%)',
  night:     'linear-gradient(155deg, #1e1b4b 0%, #4c1d95 100%)',
}

const CANVAS_FRAME: React.CSSProperties = {
  width: '76.5vw', maxWidth: '306px', height: '85%',
  background: 'white', border: '8px solid #c0c0c0', borderRadius: '4px',
  boxShadow: '0 24px 64px rgba(0,0,0,0.40), inset 0 0 0 2px #e8e8e8, inset 0 0 0 3px #a0a0a0',
  position: 'relative', overflow: 'hidden',
}

const POSE_LABELS: Record<Pose, string> = {
  stand: '通常', arms: '両手', onehand: '片手', sit: '座り',
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MuseumView() {
  const [hour,           setHour]           = useState(0)
  const [period,         setPeriod]         = useState<Period>('night')
  const [canvases,       setCanvases]       = useState<CanvasData[]>([])
  const [activeTab,      setActiveTab]      = useState<MuseumTab>('museum')
  const [activeCanvas,   setActiveCanvas]   = useState(0)
  const [isSheetOpen,    setIsSheetOpen]    = useState(false)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [sheetSel,       setSheetSel]       = useState<SheetSelection | null>(null)

  const canvasRefs     = useRef<(HTMLDivElement | null)[]>([null, null, null])
  const activeCanvasRef = useRef(0)
  activeCanvasRef.current = activeCanvas

  const carouselPtrX  = useRef<number | null>(null)
  const dragState     = useRef<DragState | null>(null)
  const didDrag       = useRef(false)
  const canvasesRef   = useRef<CanvasData[]>([])
  canvasesRef.current = canvases

  useEffect(() => {
    const h = new Date().getHours()
    setHour(h)
    setPeriod(getPeriod(h))

    setCanvases([0, 1, 2].map(cid => ({
      id: cid,
      items: [
        { id: `avatar-${cid}`, kind: 'avatar', content: '', x: 50, y: 45, size: 80, pose: 'stand' },
        ...(cid === 0 ? [
          ...INITIAL_TAGS.map((content, i) => ({
            id: `tag-${i}`, kind: 'tag' as const, content,
            x: 10 + Math.random() * 44, y: 8 + Math.random() * 40,
            size: 13, color: '#6d28d9',
          })),
          ...INITIAL_EMOJIS.map((content, i) => ({
            id: `emoji-${i}`, kind: 'emoji' as const, content,
            x: 18 + Math.random() * 58, y: 52 + Math.random() * 32,
            size: 22, color: '#000',
          })),
        ] : []),
      ],
    })))
  }, [])

  // ── Carousel swipe ─────────────────────────────────────────────
  const onCarouselDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-item-id]')) return
    carouselPtrX.current = e.clientX
  }
  const onCarouselUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (carouselPtrX.current === null) return
    const dx = e.clientX - carouselPtrX.current
    carouselPtrX.current = null
    if (Math.abs(dx) < 40) return
    setSelectedItemId(null)
    setActiveCanvas(prev => dx < 0 ? Math.min(2, prev + 1) : Math.max(0, prev - 1))
  }

  // ── Canvas item drag ────────────────────────────────────────────
  const onCanvasDown = (e: React.PointerEvent<HTMLDivElement>, ci: number) => {
    const el = (e.target as HTMLElement).closest('[data-item-id]') as HTMLElement | null
    if (!el) { setSelectedItemId(null); return }
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)

    const id   = el.dataset.itemId!
    const item = (canvasesRef.current[ci]?.items ?? []).find(d => d.id === id)
    if (!item) return

    const rect = canvasRefs.current[ci]!.getBoundingClientRect()
    dragState.current = {
      id,
      ox:     ((e.clientX - rect.left) / rect.width)  * 100 - item.x,
      oy:     ((e.clientY - rect.top)  / rect.height) * 100 - item.y,
      startX: e.clientX,
      startY: e.clientY,
    }
    didDrag.current = false
  }

  const onCanvasMove = (e: React.PointerEvent<HTMLDivElement>, ci: number) => {
    if (!dragState.current) return
    const ds = dragState.current
    if (!didDrag.current) {
      if (Math.hypot(e.clientX - ds.startX, e.clientY - ds.startY) < 5) return
      didDrag.current = true
    }
    const rect = canvasRefs.current[ci]!.getBoundingClientRect()
    const nx = Math.max(2, Math.min(98, ((e.clientX - rect.left) / rect.width)  * 100 - ds.ox))
    const ny = Math.max(2, Math.min(98, ((e.clientY - rect.top)  / rect.height) * 100 - ds.oy))
    setCanvases(prev => prev.map((c, i) =>
      i === ci ? { ...c, items: c.items.map(item => item.id === ds.id ? { ...item, x: nx, y: ny } : item) } : c
    ))
  }

  const onCanvasUp = (_e: React.PointerEvent<HTMLDivElement>) => {
    const ds      = dragState.current
    const wasDrag = didDrag.current
    dragState.current = null
    didDrag.current   = false
    if (!ds) return
    if (!wasDrag) setSelectedItemId(prev => prev === ds.id ? null : ds.id)
  }

  // ── Item management ─────────────────────────────────────────────
  const updateItem = (id: string, patch: Partial<Item>) => {
    const ci = activeCanvasRef.current
    setCanvases(prev => prev.map((c, i) =>
      i === ci ? { ...c, items: c.items.map(item => item.id === id ? { ...item, ...patch } : item) } : c
    ))
  }

  const deleteItem = (id: string) => {
    const ci = activeCanvasRef.current
    setCanvases(prev => prev.map((c, i) =>
      i === ci ? { ...c, items: c.items.filter(item => item.id !== id) } : c
    ))
    setSelectedItemId(null)
  }

  const selectInSheet = (kind: 'tag' | 'emoji', content: string) =>
    setSheetSel(prev => prev?.kind === kind && prev.content === content ? null : { kind, content })

  const insertSelectedItem = () => {
    if (!sheetSel) return
    const id = `${sheetSel.kind}-${Date.now()}`
    const ci = activeCanvasRef.current
    setCanvases(prev => prev.map((c, i) =>
      i === ci ? {
        ...c,
        items: [...c.items, {
          id, kind: sheetSel.kind, content: sheetSel.content,
          x: 25 + Math.random() * 50, y: 25 + Math.random() * 50,
          size: sheetSel.kind === 'tag' ? 13 : 22, color: '#6d28d9',
        }],
      } : c
    ))
    setSelectedItemId(id)
    setIsSheetOpen(false)
    setSheetSel(null)
  }

  const closeSheet = () => { setIsSheetOpen(false); setSheetSel(null) }

  const activeColor   = TAB_ACTIVE_COLOR[period]
  const activeItems   = canvases[activeCanvas]?.items ?? []
  const selectedItem  = activeItems.find(d => d.id === selectedItemId) ?? null
  const profilePose   = canvases[0]?.items.find(d => d.kind === 'avatar')?.pose ?? 'stand'

  return (
    <div className="relative flex flex-col" style={{ height: '100%' }}>
      <SkyLayer hour={hour} />

      {/* ── Tab bar ──────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-shrink-0 bg-white" style={{ borderBottom: '1px solid #e5e7eb' }}>
        {(['museum', 'profile'] as MuseumTab[]).map(tab => {
          const active = activeTab === tab
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 transition-colors font-semibold border-b-2"
              style={{
                paddingTop: '14px', paddingBottom: '8px',
                fontSize: '16px', letterSpacing: '1px', background: 'white',
                color: active ? activeColor : '#9ca3af',
                borderColor: active ? activeColor : 'transparent',
              }}
            >{tab === 'museum' ? 'Museum' : 'Profile'}</button>
          )
        })}
      </div>

      {/* ── Museum ───────────────────────────────────────────────── */}
      {activeTab === 'museum' && (
        <div className="relative z-10 flex-1 min-h-0 flex flex-col">
          {/* Carousel */}
          <div
            className="flex-1 min-h-0 w-full overflow-hidden"
            style={{ touchAction: 'pan-y' }}
            onPointerDown={onCarouselDown}
            onPointerUp={onCarouselUp}
          >
            <div style={{
              display: 'flex', width: '300%', height: '100%',
              transform: `translateX(-${activeCanvas * (100 / 3)}%)`,
              transition: 'transform 0.3s ease-out',
            }}>
              {[0, 1, 2].map(ci => {
                const items = canvases[ci]?.items ?? []
                const isActive = ci === activeCanvas
                const panelItem = isActive ? selectedItem : null

                return (
                  <div key={ci} style={{ width: '33.333%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 16px' }}>
                    <div
                      ref={el => { canvasRefs.current[ci] = el }}
                      style={CANVAS_FRAME}
                      onPointerDown={e => onCanvasDown(e, ci)}
                      onPointerMove={e => onCanvasMove(e, ci)}
                      onPointerUp={onCanvasUp}
                    >
                      {/* Items */}
                      {items.map(item => {
                        const isSelected = isActive && selectedItemId === item.id
                        return (
                          <div
                            key={item.id}
                            data-item-id={item.id}
                            onClick={e => e.stopPropagation()}
                            style={{
                              position: 'absolute',
                              left: `${item.x}%`, top: `${item.y}%`,
                              transform: 'translate(-50%, -50%)',
                              userSelect: 'none', cursor: 'grab', touchAction: 'none',
                              zIndex: isSelected ? 6 : item.kind === 'avatar' ? 3 : 1,
                              outline: isSelected ? '2px dashed rgba(167,139,250,0.7)' : 'none',
                              borderRadius: '4px',
                            }}
                          >
                            {item.kind === 'avatar' ? (
                              <AvatarSVG pose={item.pose ?? 'stand'} scale={item.size / 96} />
                            ) : item.kind === 'tag' ? (
                              <span style={{
                                display: 'block', fontSize: `${item.size}px`,
                                background: 'rgba(167,139,250,0.12)', color: item.color ?? '#6d28d9',
                                padding: '2px 8px', borderRadius: '10px',
                                border: `1px solid ${item.color ?? '#6d28d9'}55`,
                                whiteSpace: 'nowrap', fontFamily: 'system-ui, sans-serif', fontWeight: 500,
                              }}>{item.content}</span>
                            ) : (
                              <span style={{ fontSize: `${item.size}px`, lineHeight: 1, display: 'block' }}>{item.content}</span>
                            )}
                          </div>
                        )
                      })}

                      {/* In-canvas adjustment panel */}
                      {panelItem && (
                        <div
                          onPointerDown={e => e.stopPropagation()}
                          onClick={e => e.stopPropagation()}
                          style={{
                            position: 'absolute', bottom: 0, left: 0, right: 0,
                            background: 'rgba(5,4,14,0.84)', backdropFilter: 'blur(8px)',
                            padding: '10px 12px', zIndex: 10,
                          }}
                        >
                          {/* Size slider */}
                          <input
                            type="range"
                            min={panelItem.kind === 'avatar' ? 40 : 12}
                            max={panelItem.kind === 'avatar' ? 160 : 48}
                            value={panelItem.size}
                            onChange={e => updateItem(panelItem.id, { size: Number(e.target.value) })}
                            style={{ width: '100%', accentColor: '#a78bfa', display: 'block', marginBottom: '8px' }}
                          />

                          {/* Color picker (tags only) */}
                          {panelItem.kind === 'tag' && (
                            <div style={{ display: 'flex', gap: '5px', marginBottom: '8px', justifyContent: 'center' }}>
                              {TAG_COLORS.map(c => (
                                <button
                                  key={c}
                                  onClick={() => updateItem(panelItem.id, { color: c })}
                                  style={{
                                    width: '20px', height: '20px', borderRadius: '50%',
                                    background: c, flexShrink: 0,
                                    border: panelItem.color === c ? '2px solid white' : '2px solid transparent',
                                  }}
                                />
                              ))}
                            </div>
                          )}

                          {/* Pose selector (avatar only) */}
                          {panelItem.kind === 'avatar' && (
                            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '8px', scrollbarWidth: 'none' }}>
                              {(['stand', 'arms', 'onehand', 'sit'] as Pose[]).map(pose => (
                                <button
                                  key={pose}
                                  onClick={() => updateItem(panelItem.id, { pose })}
                                  style={{
                                    flexShrink: 0, width: '46px', height: '58px', borderRadius: '8px',
                                    background: panelItem.pose === pose ? 'rgba(167,139,250,0.32)' : 'rgba(255,255,255,0.09)',
                                    border: panelItem.pose === pose ? '1px solid rgba(167,139,250,0.6)' : '1px solid rgba(255,255,255,0.14)',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px',
                                    transition: 'all 0.15s',
                                  }}
                                >
                                  <AvatarSVG pose={pose} scale={0.3} />
                                  <span style={{ fontSize: '8px', color: panelItem.pose === pose ? '#c4b5fd' : 'rgba(255,255,255,0.38)' }}>
                                    {POSE_LABELS[pose]}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Buttons */}
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => setSelectedItemId(null)}
                              style={{
                                flex: 1, fontSize: '12px', padding: '5px', borderRadius: '6px',
                                background: 'rgba(255,255,255,0.12)', color: 'white',
                                border: '1px solid rgba(255,255,255,0.18)',
                              }}
                            >完了</button>
                            {panelItem.kind !== 'avatar' && (
                              <button
                                onClick={() => deleteItem(panelItem.id)}
                                style={{
                                  fontSize: '12px', padding: '5px 12px', borderRadius: '6px',
                                  background: 'rgba(239,68,68,0.16)', color: '#f87171',
                                  border: '1px solid rgba(239,68,68,0.26)',
                                }}
                              >🗑️</button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-2 flex-shrink-0" style={{ paddingBottom: '12px', paddingTop: '8px' }}>
            {[0, 1, 2].map(i => (
              <button
                key={i}
                onClick={() => { setSelectedItemId(null); setActiveCanvas(i) }}
                style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: i === activeCanvas ? 'white' : 'rgba(255,255,255,0.30)',
                  transition: 'background 0.2s',
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Profile ──────────────────────────────────────────────── */}
      {activeTab === 'profile' && (
        <div className="relative z-10 flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
          {/* Header gradient */}
          <div style={{ height: '120px', background: HEADER_GRADIENT[period], position: 'relative', flexShrink: 0 }}>
            <button
              style={{
                position: 'absolute', top: '14px', right: '16px',
                fontSize: '12px', color: 'rgba(255,255,255,0.9)',
                background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.30)',
                borderRadius: '14px', padding: '4px 12px', backdropFilter: 'blur(4px)',
              }}
            >編集</button>
          </div>

          {/* Body */}
          <div style={{ position: 'relative' }}>
            {/* Avatar circle overlapping header */}
            <div style={{ position: 'absolute', top: '-36px', left: '16px' }}>
              <ProfileAvatar pose={profilePose} />
            </div>

            <div style={{ height: '44px' }} />

            {/* User info */}
            <div style={{ padding: '4px 16px 14px' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '2px' }}>なつき</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.42)', marginBottom: '8px' }}>@natsuki_346</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.78)', lineHeight: 1.55, marginBottom: '10px' }}>
                夜型の音楽好き🎵 猫と暮らしてます🐱
              </div>
              <div style={{ display: 'flex', gap: '20px', fontSize: '13px' }}>
                <span>
                  <span style={{ fontWeight: 700, color: 'white' }}>128</span>
                  <span style={{ color: 'rgba(255,255,255,0.42)', marginLeft: '4px' }}>フォロー</span>
                </span>
                <span>
                  <span style={{ fontWeight: 700, color: 'white' }}>64</span>
                  <span style={{ color: 'rgba(255,255,255,0.42)', marginLeft: '4px' }}>フォロワー</span>
                </span>
              </div>
            </div>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '0 16px' }} />

            {/* Identity tags */}
            <div style={{ padding: '12px 0' }}>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '0 16px', scrollbarWidth: 'none' }}>
                {PROFILE_TAGS.map(tag => (
                  <span
                    key={tag}
                    style={{
                      flexShrink: 0, fontSize: '12px', padding: '4px 12px', borderRadius: '14px',
                      background: 'rgba(167,139,250,0.14)', color: '#c4b5fd',
                      border: '1px solid rgba(167,139,250,0.26)', whiteSpace: 'nowrap',
                    }}
                  >{tag}</span>
                ))}
              </div>
            </div>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '0 16px' }} />

            {/* Museum preview grid */}
            <div style={{ padding: '16px 16px 0' }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.45)', marginBottom: '10px', letterSpacing: '1.2px', textTransform: 'uppercase' }}>My Museum</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {[0, 1, 2].map(i => {
                  const pose = canvases[i]?.items.find(d => d.kind === 'avatar')?.pose ?? 'stand'
                  return (
                    <button
                      key={i}
                      onClick={() => setActiveTab('museum')}
                      style={{
                        aspectRatio: '3/4', width: '100%', borderRadius: '4px',
                        background: 'white', border: '4px solid #c0c0c0',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.35), inset 0 0 0 1px #e8e8e8',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                      }}
                    >
                      <div style={{ transform: 'scale(0.42)', transformOrigin: 'center' }}>
                        <AvatarSVG pose={pose} />
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Recent posts */}
            <div style={{ padding: '20px 16px 80px' }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.45)', marginBottom: '10px', letterSpacing: '1.2px', textTransform: 'uppercase' }}>最近の気持ち</div>
              {([
                { text: '今夜は月がきれいだな🌙', time: '22:14' },
                { text: '新しいアルバム聴いてる。最高すぎる🎵', time: '昨日' },
                { text: '猫がひざの上から離れなくて作業できない🐱', time: '2日前' },
              ] as const).map((post, i) => (
                <div
                  key={i}
                  style={{
                    background: 'rgba(255,255,255,0.06)', borderRadius: '10px',
                    padding: '12px', marginBottom: '8px', border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.82)', lineHeight: 1.55, marginBottom: '5px' }}>{post.text}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.32)' }}>{post.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── FAB ─────────────────────────────────────────────────── */}
      {activeTab === 'museum' && !isSheetOpen && (
        <button
          onClick={() => { setIsSheetOpen(true); setSelectedItemId(null) }}
          className="flex items-center justify-center"
          style={{
            position: 'absolute', bottom: '68px', right: '20px',
            width: '48px', height: '48px', borderRadius: '50%',
            background: '#ec4899', color: 'white', fontSize: '22px',
            boxShadow: '0 4px 14px rgba(236,72,153,0.55)', zIndex: 40,
          }}
        >🎨</button>
      )}

      {/* ── Bottom sheet ─────────────────────────────────────────── */}
      {isSheetOpen && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'fixed', bottom: '64px', left: '50%', transform: 'translateX(-50%)',
            width: '100%', maxWidth: '390px', zIndex: 50,
            background: 'rgba(10,8,20,0.94)', backdropFilter: 'blur(18px)',
            borderTopLeftRadius: '20px', borderTopRightRadius: '20px',
            borderTop: '1px solid rgba(255,255,255,0.09)',
            maxHeight: '70vh', display: 'flex', flexDirection: 'column',
          }}
        >
          {/* Drag bar */}
          <div
            onClick={closeSheet}
            style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px', cursor: 'pointer', flexShrink: 0 }}
          >
            <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.20)' }} />
          </div>

          {/* Scrollable sections */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {/* § Identity Tags */}
            <div style={{ paddingBottom: '14px' }}>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', padding: '6px 16px', letterSpacing: '1.2px', textTransform: 'uppercase' }}>Identity Tags</div>
              <div style={{ display: 'flex', gap: '7px', overflowX: 'auto', padding: '0 16px', scrollbarWidth: 'none' }}>
                {IDENTITY_TAGS.map(tag => {
                  const on = sheetSel?.kind === 'tag' && sheetSel.content === tag
                  return (
                    <button
                      key={tag}
                      onClick={() => selectInSheet('tag', tag)}
                      style={{
                        flexShrink: 0, fontSize: '12px', padding: '5px 12px',
                        borderRadius: '14px', whiteSpace: 'nowrap',
                        background: on ? 'rgba(167,139,250,0.28)' : 'rgba(255,255,255,0.07)',
                        color: on ? '#c4b5fd' : 'rgba(255,255,255,0.55)',
                        border: on ? '1px solid rgba(167,139,250,0.55)' : '1px solid rgba(255,255,255,0.10)',
                        transition: 'all 0.15s',
                      }}
                    >{tag}</button>
                  )
                })}
              </div>
            </div>

            {/* § Emoji Stamps */}
            <div style={{ paddingBottom: '8px' }}>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', padding: '0 16px 6px', letterSpacing: '1.2px', textTransform: 'uppercase' }}>Emoji Stamps</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '4px', padding: '0 16px' }}>
                {EMOJI_STAMPS.map(em => {
                  const on = sheetSel?.kind === 'emoji' && sheetSel.content === em
                  return (
                    <button
                      key={em}
                      onClick={() => selectInSheet('emoji', em)}
                      style={{
                        fontSize: '22px', padding: '6px 0', borderRadius: '8px',
                        lineHeight: 1, textAlign: 'center',
                        background: on ? 'rgba(167,139,250,0.22)' : 'rgba(255,255,255,0.05)',
                        border: on ? '1px solid rgba(167,139,250,0.45)' : '1px solid transparent',
                        transition: 'all 0.15s',
                      }}
                    >{em}</button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Insert button */}
          <div style={{ flexShrink: 0, padding: '10px 16px 14px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <button
              disabled={!sheetSel}
              onClick={insertSelectedItem}
              style={{
                width: '100%', padding: '12px', borderRadius: '12px',
                fontSize: '14px', fontWeight: 600, border: 'none',
                background: sheetSel ? '#7c3aed' : 'rgba(255,255,255,0.08)',
                color: sheetSel ? 'white' : 'rgba(255,255,255,0.22)',
                boxShadow: sheetSel ? '0 4px 14px rgba(124,58,237,0.40)' : 'none',
                cursor: sheetSel ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
              }}
            >キャンバスに挿入</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ProfileAvatar({ pose }: { pose: Pose }) {
  return (
    <div style={{
      width: '72px', height: '72px', borderRadius: '50%',
      border: '3px solid rgba(255,255,255,0.92)', overflow: 'hidden',
      background: '#e9d5ff', boxShadow: '0 2px 14px rgba(0,0,0,0.38)',
      position: 'relative',
    }}>
      <div style={{ position: 'absolute', bottom: '-8px', left: '50%', transform: 'translateX(-50%)' }}>
        <AvatarSVG pose={pose} scale={0.7} />
      </div>
    </div>
  )
}

function AvatarSVG({ pose = 'stand', scale = 1 }: { pose?: Pose; scale?: number }) {
  return (
    <svg width={56 * scale} height={96 * scale} viewBox="0 0 56 96" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="28" cy="16" r="13" fill="#a78bfa" />
      <rect x="14" y="33" width="28" height="34" rx="8" fill="#7c3aed" />
      <rect x="4" y="35" width="10" height="22" rx="5" fill="#a78bfa"
        transform={pose === 'arms' ? 'rotate(135, 9, 36)' : undefined} />
      <rect x="42" y="35" width="10" height="22" rx="5" fill="#a78bfa"
        transform={pose === 'arms' ? 'rotate(-135, 47, 36)' : pose === 'onehand' ? 'rotate(-155, 47, 36)' : undefined} />
      <rect x="15" y="65" width="10" height={pose === 'sit' ? 20 : 28} rx="5" fill="#7c3aed"
        transform={pose === 'sit' ? 'rotate(82, 20, 65)' : undefined} />
      <rect x="31" y="65" width="10" height={pose === 'sit' ? 20 : 28} rx="5" fill="#7c3aed"
        transform={pose === 'sit' ? 'rotate(-82, 36, 65)' : undefined} />
    </svg>
  )
}
