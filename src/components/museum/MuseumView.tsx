'use client'

import { useState, useEffect, useRef, memo } from 'react'
import { createAvatar } from '@dicebear/core'
import { adventurer } from '@dicebear/collection'
import type { Options } from '@dicebear/adventurer'
import { SkyLayer } from '@/components/room/SkyLayer'

// ── Types ─────────────────────────────────────────────────────────────────────

type Period    = 'morning' | 'afternoon' | 'evening' | 'night'
type MuseumTab = 'museum' | 'profile'
type Pose      = 'stand' | 'arms' | 'onehand' | 'sit'
type EditorTab = 'skin' | 'hair-style' | 'hair-color' | 'top' | 'eye' | 'mouth' | 'accessory'

type AvatarConfig = {
  seed:                string
  skinColor:           string   // hex without # (DiceBear format, e.g. 'f9c9b6')
  hairColor:           string   // hex without #
  topColor:            string   // CSS color with # (body SVG)
  bottomColor:         string   // CSS color with #
  hair:                string
  eyes:                string
  eyebrows:            string
  mouth:               string
  glassesProbability:  number   // 0 or 100
  earringsProbability: number   // 0 or 100
}

type Item = {
  id:       string
  kind:     'tag' | 'emoji' | 'avatar'
  content:  string
  x:        number
  y:        number
  size:     number
  rotation: number
  color?:   string
  pose?:    Pose
}

type CanvasData     = { id: number; items: Item[] }
type DragState      = { id: string; ox: number; oy: number; startX: number; startY: number }
type PinchState     = { itemId: string; dist0: number; angle0: number; size0: number; rotation0: number }
type SheetSelection = { kind: 'tag' | 'emoji'; content: string }

// ── Helpers ───────────────────────────────────────────────────────────────────

function getPeriod(h: number): Period {
  if (h >= 22 || h < 5) return 'night'
  if (h < 11)           return 'morning'
  if (h < 17)           return 'afternoon'
  return 'evening'
}

// Inject width="100%" so the embedded SVG fills its wrapper div
function createAvatarSvg(config: AvatarConfig): string {
  return createAvatar(adventurer, {
    seed:                config.seed,
    skinColor:           [config.skinColor],
    hairColor:           [config.hairColor],
    hair:                [config.hair]     as Options['hair'],
    eyes:                [config.eyes]     as Options['eyes'],
    eyebrows:            [config.eyebrows] as Options['eyebrows'],
    mouth:               [config.mouth]    as Options['mouth'],
    glassesProbability:  config.glassesProbability,
    earringsProbability: config.earringsProbability,
    backgroundColor:     ['transparent'],
  })
    .toString()
    .replace('<svg ', '<svg width="100%" ')
}

// Body SVG elements (viewBox 0 0 120 220, face occupies y=0–75)
function renderBody(pose: Pose, config: AvatarConfig) {
  const skin = `#${config.skinColor}`
  const top  = config.topColor
  const bot  = config.bottomColor

  const neck   = <rect key="neck"   x="52" y="68" width="16" height="16" rx="5" fill={skin} />
  const body   = <path key="body"   d="M38,84 Q38,82 42,82 L78,82 Q82,82 82,84 L80,130 Q80,134 76,134 L44,134 Q40,134 40,130 Z" fill={top} />
  const collar = <path key="collar" d="M48,84 Q60,80 72,84" stroke="rgba(0,0,0,0.13)" strokeWidth="1.5" fill="none" />
  const waist  = <line key="waist"  x1="40" y1="134" x2="80" y2="134" stroke="rgba(0,0,0,0.18)" strokeWidth="1" />

  const leftArmStand  = <path key="al" d="M38,85 Q30,88 26,105 Q24,118 26,128 Q28,132 32,130 Q34,120 36,108 Q38,96 40,88 Z" fill={skin} />
  const rightArmStand = <path key="ar" d="M82,85 Q90,88 94,105 Q96,118 94,128 Q92,132 88,130 Q86,120 84,108 Q82,96 80,88 Z" fill={skin} />
  const leftArmArms   = <path key="al" d="M38,88 Q28,82 16,78 Q10,76 10,80 Q12,84 18,86 Q28,90 38,94 Z" fill={skin} />
  const rightArmArms  = <path key="ar" d="M82,88 Q92,82 104,78 Q110,76 110,80 Q108,84 102,86 Q92,90 82,94 Z" fill={skin} />
  const rightArmOne   = <path key="ar" d="M82,85 Q88,75 92,60 Q94,52 90,50 Q86,50 84,58 Q80,72 80,88 Z" fill={skin} />

  const legL  = <path key="ll" d="M44,134 L44,138 Q42,160 41,178 Q40,184 44,185 Q50,186 52,184 Q54,182 53,178 Q52,160 52,138 L52,134 Z" fill={bot} />
  const legR  = <path key="lr" d="M68,134 L68,138 Q68,160 67,178 Q66,182 68,184 Q72,186 78,185 Q82,184 79,178 Q78,160 76,138 L76,134 Z" fill={bot} />
  const shoeL = <ellipse key="sl" cx="47" cy="185" rx="10" ry="5" fill="#2a2a2a" />
  const shoeR = <ellipse key="sr" cx="73" cy="185" rx="10" ry="5" fill="#2a2a2a" />

  if (pose === 'sit') {
    return (
      <>
        <path key="lap"  d="M44,134 L44,138 Q44,148 55,150 Q66,152 72,148 L76,134 Z" fill={bot} />
        <path key="leg"  d="M52,150 Q52,160 51,172 Q50,178 54,179 Q58,180 60,178 Q62,174 62,160 L62,150 Z" fill={bot} />
        <ellipse key="sh" cx="56" cy="179" rx="9" ry="5" fill="#2a2a2a" />
        {body}{collar}{waist}
        {leftArmStand}{rightArmStand}
        <ellipse key="hl" cx="29" cy="131" rx="5" ry="4" fill={skin} />
        <ellipse key="hr" cx="91" cy="131" rx="5" ry="4" fill={skin} />
        {neck}
      </>
    )
  }

  if (pose === 'arms') {
    return (
      <>
        {legL}{legR}{shoeL}{shoeR}
        {body}{collar}{waist}
        {leftArmArms}{rightArmArms}
        <ellipse key="hl" cx="12" cy="80" rx="5" ry="4" fill={skin} />
        <ellipse key="hr" cx="108" cy="80" rx="5" ry="4" fill={skin} />
        {neck}
      </>
    )
  }

  if (pose === 'onehand') {
    return (
      <>
        {legL}{legR}{shoeL}{shoeR}
        {body}{collar}{waist}
        {leftArmStand}{rightArmOne}
        <line key="swl" x1="26" y1="128" x2="32" y2="130" stroke="rgba(0,0,0,0.18)" strokeWidth="1.5" />
        <ellipse key="hl" cx="29" cy="131" rx="5" ry="4" fill={skin} />
        <ellipse key="hr" cx="91" cy="52"  rx="5" ry="4" fill={skin} />
        {neck}
      </>
    )
  }

  // stand (default)
  return (
    <>
      {legL}{legR}{shoeL}{shoeR}
      {body}{collar}{waist}
      {leftArmStand}{rightArmStand}
      <line key="swl" x1="26" y1="128" x2="32" y2="130" stroke="rgba(0,0,0,0.18)" strokeWidth="1.5" />
      <line key="swr" x1="88" y1="128" x2="94" y2="130" stroke="rgba(0,0,0,0.18)" strokeWidth="1.5" />
      <ellipse key="hl" cx="29" cy="131" rx="5" ry="4" fill={skin} />
      <ellipse key="hr" cx="91" cy="131" rx="5" ry="4" fill={skin} />
      {neck}
    </>
  )
}

const TAB_ACTIVE_COLOR: Record<Period, string> = {
  morning: '#0284c7', afternoon: '#2563eb', evening: '#ea580c', night: '#a78bfa',
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_AVATAR: AvatarConfig = {
  seed:                'myplace-user',
  skinColor:           'f9c9b6',
  hairColor:           '0e0e0e',
  topColor:            '#7C3AED',
  bottomColor:         '#4C1D95',
  hair:                'short01',
  eyes:                'variant01',
  eyebrows:            'variant01',
  mouth:               'variant01',
  glassesProbability:  0,
  earringsProbability: 0,
}

const SKIN_COLORS    = ['fddbb4', 'f5c89a', 'e8a87c', 'c68642', 'a0522d', '8b4513', '5c2e00', 'ffecd2']
const HAIR_COLORS    = ['0e0e0e', '4a3728', '8b4513', 'd2691e', 'daa520', 'f5deb3', 'ff69b4', 'ff0000', '4169e1', '808080', 'afafaf', '592454']
const CLOTHES_COLORS = ['#7C3AED', '#EC4899', '#3B82F6', '#22C55E', '#F97316', '#EF4444', '#1E293B', '#FFFFFF']

const PRESET_COLORS = [
  '7C3AED', 'A855F7', 'EC4899', 'F43F5E', 'EF4444',
  'F97316', 'F59E0B', 'EAB308', '84CC16', '22C55E',
  '10B981', '14B8A6', '06B6D4', '3B82F6', '6366F1',
  '8B5CF6', 'D946EF', 'FFFFFF', '94A3B8', '1E293B',
]

const IDENTITY_TAGS  = ['#夜型', '#音楽好き', '#猫派', '#インドア', '#映画', '#読書', '#ゲーマー', '#アート', '#旅行', '#コーヒー']
const EMOJI_STAMPS   = ['🎵', '⭐', '🌙', '🎨', '🌸', '💫', '🎮', '📚', '🎭', '🌈', '🔥', '💎', '🎪', '🌊', '🦋', '🎸']
const PROFILE_TAGS   = ['#夜型', '#音楽好き', '#猫派', '#インドア']
const INITIAL_TAGS   = ['#音楽', '#夜型', '#猫好き']
const INITIAL_EMOJIS = ['🎵', '⭐', '🌙']

const HAIR_SHORT = ['short01','short02','short03','short04','short05','short06','short07','short08','short09','short10']
const HAIR_LONG  = ['long01','long02','long03','long04','long05','long06','long07','long08','long09','long10']

const EYE_VARIANTS     = ['variant01','variant02','variant03','variant04','variant05','variant06','variant07','variant08','variant09','variant10','variant11','variant12']
const EYEBROW_VARIANTS = ['variant01','variant02','variant03','variant04','variant05','variant06','variant07','variant08','variant09','variant10']
const MOUTH_VARIANTS   = ['variant01','variant02','variant03','variant04','variant05','variant06','variant07','variant08','variant09','variant10','variant11','variant12','variant13','variant14','variant15']

const POSE_LABELS: Record<Pose, string> = {
  stand: '通常', arms: '両手', onehand: '片手', sit: '座り',
}

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

const EDITOR_TABS: { key: EditorTab; icon: string; label: string }[] = [
  { key: 'skin',       icon: '🎨', label: '肌'   },
  { key: 'hair-style', icon: '💇', label: '髪型' },
  { key: 'hair-color', icon: '🎨', label: '髪色' },
  { key: 'top',        icon: '👕', label: '服'   },
  { key: 'eye',        icon: '👁️', label: '目'   },
  { key: 'mouth',      icon: '👄', label: '口'   },
  { key: 'accessory',  icon: '✨', label: 'アクセ' },
]

// ── Main Component ─────────────────────────────────────────────────────────────

export function MuseumView() {
  const [hour,           setHour]           = useState(0)
  const [period,         setPeriod]         = useState<Period>('night')
  const [canvases,       setCanvases]       = useState<CanvasData[]>([])
  const [activeTab,      setActiveTab]      = useState<MuseumTab>('museum')
  const [activeCanvas,   setActiveCanvas]   = useState(0)
  const [isSheetOpen,    setIsSheetOpen]    = useState(false)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [sheetSel,       setSheetSel]       = useState<SheetSelection | null>(null)

  const [avatarConfig,       setAvatarConfig]       = useState<AvatarConfig>(DEFAULT_AVATAR)
  const [isAvatarEditorOpen, setIsAvatarEditorOpen] = useState(false)
  const [editorTab,          setEditorTab]          = useState<EditorTab>('skin')
  const [editingConfig,      setEditingConfig]      = useState<AvatarConfig>(DEFAULT_AVATAR)

  const canvasRefs          = useRef<(HTMLDivElement | null)[]>([null, null, null])
  const activeCanvasRef     = useRef(0)
  activeCanvasRef.current   = activeCanvas
  const carouselPtrX        = useRef<number | null>(null)
  const dragState           = useRef<DragState | null>(null)
  const didDrag             = useRef(false)
  const canvasesRef         = useRef<CanvasData[]>([])
  canvasesRef.current       = canvases
  const selectedItemIdRef   = useRef<string | null>(null)
  selectedItemIdRef.current = selectedItemId
  const pinchState          = useRef<PinchState | null>(null)
  const pinchActive         = useRef(false)

  useEffect(() => {
    const h = new Date().getHours()
    setHour(h)
    setPeriod(getPeriod(h))
    setCanvases([0, 1, 2].map(cid => ({
      id: cid,
      items: [
        { id: `avatar-${cid}`, kind: 'avatar', content: '', x: 50, y: 45, size: 90, rotation: 0, pose: 'stand' as Pose },
        ...(cid === 0 ? [
          ...INITIAL_TAGS.map((content, i) => ({
            id: `tag-${i}`, kind: 'tag' as const, content,
            x: 10 + Math.random() * 44, y: 8 + Math.random() * 40,
            size: 13, rotation: 0, color: '#6d28d9',
          })),
          ...INITIAL_EMOJIS.map((content, i) => ({
            id: `emoji-${i}`, kind: 'emoji' as const, content,
            x: 18 + Math.random() * 58, y: 52 + Math.random() * 32,
            size: 22, rotation: 0, color: '#000000',
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

  // ── 2-finger pinch / rotate ─────────────────────────────────────
  const onCanvasTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 2) return
    const id = selectedItemIdRef.current; if (!id) return
    const ci = activeCanvasRef.current
    const item = canvasesRef.current[ci]?.items.find(d => d.id === id); if (!item) return
    const t0 = e.touches[0], t1 = e.touches[1]
    pinchState.current = {
      itemId: id,
      dist0:     Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY),
      angle0:    Math.atan2(t1.clientY - t0.clientY, t1.clientX - t0.clientX),
      size0:     item.size, rotation0: item.rotation,
    }
    pinchActive.current = true
  }
  const onCanvasTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 2 || !pinchState.current) return
    const ps = pinchState.current
    const ci = activeCanvasRef.current
    const item = canvasesRef.current[ci]?.items.find(d => d.id === ps.itemId); if (!item) return
    const t0 = e.touches[0], t1 = e.touches[1]
    const dist  = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY)
    const angle = Math.atan2(t1.clientY - t0.clientY, t1.clientX - t0.clientX)
    const isAvatar  = item.kind === 'avatar'
    const newSize     = Math.max(isAvatar ? 40 : 12, Math.min(isAvatar ? 160 : 48, Math.round(ps.size0 * (dist / ps.dist0))))
    const newRotation = Math.round(ps.rotation0 + (angle - ps.angle0) * (180 / Math.PI))
    setCanvases(prev => prev.map((c, i) =>
      i === ci ? { ...c, items: c.items.map(it => it.id === ps.itemId ? { ...it, size: newSize, rotation: newRotation } : it) } : c
    ))
  }
  const onCanvasTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2) { pinchState.current = null; pinchActive.current = false }
  }

  // ── Canvas item drag ────────────────────────────────────────────
  const onCanvasDown = (e: React.PointerEvent<HTMLDivElement>, ci: number) => {
    if (pinchActive.current) return
    const el = (e.target as HTMLElement).closest('[data-item-id]') as HTMLElement | null
    if (!el) { setSelectedItemId(null); return }
    e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId)
    const id = el.dataset.itemId!
    const item = (canvasesRef.current[ci]?.items ?? []).find(d => d.id === id); if (!item) return
    const rect = canvasRefs.current[ci]!.getBoundingClientRect()
    dragState.current = {
      id,
      ox: ((e.clientX - rect.left) / rect.width) * 100 - item.x,
      oy: ((e.clientY - rect.top)  / rect.height) * 100 - item.y,
      startX: e.clientX, startY: e.clientY,
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
    const ds = dragState.current; const wasDrag = didDrag.current
    dragState.current = null; didDrag.current = false
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
          size: sheetSel.kind === 'tag' ? 13 : 22, rotation: 0, color: '#6d28d9',
        }],
      } : c
    ))
    setSelectedItemId(id)
    setIsSheetOpen(false)
    setSheetSel(null)
  }

  const closeSheet = () => { setIsSheetOpen(false); setSheetSel(null) }

  const openAvatarEditor = () => {
    setEditingConfig(avatarConfig)
    setEditorTab('skin')
    setIsAvatarEditorOpen(true)
  }
  const saveAvatarConfig = () => {
    setAvatarConfig(editingConfig)
    setIsAvatarEditorOpen(false)
  }

  const activeColor  = TAB_ACTIVE_COLOR[period]
  const activeItems  = canvases[activeCanvas]?.items ?? []
  const selectedItem = activeItems.find(d => d.id === selectedItemId) ?? null

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
                const items     = canvases[ci]?.items ?? []
                const isActive  = ci === activeCanvas
                const panelItem = isActive ? selectedItem : null
                return (
                  <div key={ci} style={{ width: '33.333%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 16px' }}>
                    <div
                      ref={el => { canvasRefs.current[ci] = el }}
                      style={CANVAS_FRAME}
                      onPointerDown={e => onCanvasDown(e, ci)}
                      onPointerMove={e => onCanvasMove(e, ci)}
                      onPointerUp={onCanvasUp}
                      onTouchStart={onCanvasTouchStart}
                      onTouchMove={onCanvasTouchMove}
                      onTouchEnd={onCanvasTouchEnd}
                    >
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
                              transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
                              userSelect: 'none', cursor: 'grab', touchAction: 'none',
                              zIndex: isSelected ? 6 : item.kind === 'avatar' ? 3 : 1,
                              outline: isSelected ? '2px dashed rgba(167,139,250,0.7)' : 'none',
                              borderRadius: '4px',
                            }}
                          >
                            {item.kind === 'avatar' ? (
                              <AvatarSVG config={avatarConfig} size={item.size} pose={item.pose ?? 'stand'} />
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

                      {/* Adjustment panel */}
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                            <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.40)', flexShrink: 0, width: '20px' }}>大</span>
                            <input type="range"
                              min={panelItem.kind === 'avatar' ? 40 : 12}
                              max={panelItem.kind === 'avatar' ? 160 : 48}
                              value={panelItem.size}
                              onChange={e => updateItem(panelItem.id, { size: Number(e.target.value) })}
                              style={{ flex: 1, accentColor: '#a78bfa' }}
                            />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.40)', flexShrink: 0, width: '20px' }}>回転</span>
                            <div style={{ flex: 1, position: 'relative' }}>
                              <input type="range"
                                min={-180} max={180} step={1}
                                value={panelItem.rotation}
                                onChange={e => {
                                  const val = Number(e.target.value)
                                  updateItem(panelItem.id, { rotation: Math.abs(val) < 5 ? 0 : val })
                                }}
                                style={{ width: '100%', accentColor: '#a78bfa', display: 'block' }}
                              />
                              <div style={{
                                position: 'absolute', top: '50%', left: '50%',
                                transform: 'translate(-50%, -100%)',
                                width: '2px', height: '8px',
                                background: 'rgba(255,255,255,0.35)', pointerEvents: 'none',
                              }} />
                            </div>
                            <span style={{ fontSize: '9px', color: '#a78bfa', flexShrink: 0, width: '28px', textAlign: 'right' }}>
                              {panelItem.rotation}°
                            </span>
                          </div>

                          {/* Pose selector (avatar only) */}
                          {panelItem.kind === 'avatar' && (
                            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '8px', scrollbarWidth: 'none' }}>
                              {(['stand', 'arms', 'onehand', 'sit'] as Pose[]).map(pose => {
                                const on = (panelItem.pose ?? 'stand') === pose
                                return (
                                  <button
                                    key={pose}
                                    onClick={() => updateItem(panelItem.id, { pose })}
                                    style={{
                                      flexShrink: 0, width: '56px', height: '110px', borderRadius: '8px',
                                      background: on ? 'rgba(167,139,250,0.32)' : 'rgba(255,255,255,0.09)',
                                      border: on ? '2px solid rgba(167,139,250,0.6)' : '2px solid rgba(255,255,255,0.14)',
                                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                                      justifyContent: 'center', gap: '4px',
                                      transition: 'all 0.15s', overflow: 'hidden', padding: '4px 0 6px',
                                    }}
                                  >
                                    <AvatarPreview config={avatarConfig} size={50} pose={pose} />
                                    <span style={{ fontSize: '8px', color: on ? '#c4b5fd' : 'rgba(255,255,255,0.38)', flexShrink: 0 }}>
                                      {POSE_LABELS[pose]}
                                    </span>
                                  </button>
                                )
                              })}
                            </div>
                          )}

                          {panelItem.kind === 'tag' && (
                            <ColorPicker color={panelItem.color ?? '#7C3AED'} onChange={c => updateItem(panelItem.id, { color: c })} />
                          )}
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
          <div style={{ height: '120px', background: HEADER_GRADIENT[period], position: 'relative', flexShrink: 0 }}>
            <button style={{
              position: 'absolute', top: '14px', right: '16px',
              fontSize: '12px', color: 'rgba(255,255,255,0.9)',
              background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.30)',
              borderRadius: '14px', padding: '4px 12px', backdropFilter: 'blur(4px)',
            }}>編集</button>
          </div>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', top: '-36px', left: '16px' }}>
              <ProfileAvatar config={avatarConfig} />
            </div>
            <div style={{ height: '44px' }} />
            <div style={{ padding: '0 16px 10px' }}>
              <button onClick={openAvatarEditor} style={{
                fontSize: '11px', color: 'rgba(255,255,255,0.82)',
                background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.22)',
                borderRadius: '12px', padding: '4px 12px', backdropFilter: 'blur(4px)',
              }}>アバターを編集</button>
            </div>
            <div style={{ padding: '0 16px 14px' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '2px' }}>なつき</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.42)', marginBottom: '8px' }}>@natsuki_346</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.78)', lineHeight: 1.55, marginBottom: '10px' }}>
                夜型の音楽好き🎵 猫と暮らしてます🐱
              </div>
              <div style={{ display: 'flex', gap: '20px', fontSize: '13px' }}>
                <span><span style={{ fontWeight: 700, color: 'white' }}>128</span><span style={{ color: 'rgba(255,255,255,0.42)', marginLeft: '4px' }}>フォロー</span></span>
                <span><span style={{ fontWeight: 700, color: 'white' }}>64</span><span style={{ color: 'rgba(255,255,255,0.42)', marginLeft: '4px' }}>フォロワー</span></span>
              </div>
            </div>
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '0 16px' }} />
            <div style={{ padding: '12px 0' }}>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '0 16px', scrollbarWidth: 'none' }}>
                {PROFILE_TAGS.map(tag => (
                  <span key={tag} style={{
                    flexShrink: 0, fontSize: '12px', padding: '4px 12px', borderRadius: '14px',
                    background: 'rgba(167,139,250,0.14)', color: '#c4b5fd',
                    border: '1px solid rgba(167,139,250,0.26)', whiteSpace: 'nowrap',
                  }}>{tag}</span>
                ))}
              </div>
            </div>
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '0 16px' }} />
            <div style={{ padding: '16px 16px 0' }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.45)', marginBottom: '10px', letterSpacing: '1.2px', textTransform: 'uppercase' }}>My Museum</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {[0, 1, 2].map(i => {
                  const pose = (canvases[i]?.items.find(d => d.kind === 'avatar')?.pose ?? 'stand') as Pose
                  return (
                    <button key={i} onClick={() => setActiveTab('museum')} style={{
                      aspectRatio: '3/4', width: '100%', borderRadius: '4px',
                      background: 'white', border: '4px solid #c0c0c0',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.35), inset 0 0 0 1px #e8e8e8',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                    }}>
                      <AvatarSVG config={avatarConfig} size={64} pose={pose} />
                    </button>
                  )
                })}
              </div>
            </div>
            <div style={{ padding: '20px 16px 80px' }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.45)', marginBottom: '10px', letterSpacing: '1.2px', textTransform: 'uppercase' }}>最近の気持ち</div>
              {([
                { text: '今夜は月がきれいだな🌙', time: '22:14' },
                { text: '新しいアルバム聴いてる。最高すぎる🎵', time: '昨日' },
                { text: '猫がひざの上から離れなくて作業できない🐱', time: '2日前' },
              ] as const).map((post, i) => (
                <div key={i} style={{
                  background: 'rgba(255,255,255,0.06)', borderRadius: '10px',
                  padding: '12px', marginBottom: '8px', border: '1px solid rgba(255,255,255,0.08)',
                }}>
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

      {/* ── Items bottom sheet ────────────────────────────────────── */}
      {isSheetOpen && (
        <div onClick={e => e.stopPropagation()} style={{
          position: 'fixed', bottom: '64px', left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: '390px', zIndex: 50,
          background: 'rgba(10,8,20,0.94)', backdropFilter: 'blur(18px)',
          borderTopLeftRadius: '20px', borderTopRightRadius: '20px',
          borderTop: '1px solid rgba(255,255,255,0.09)',
          maxHeight: '70vh', display: 'flex', flexDirection: 'column',
        }}>
          <div onClick={closeSheet} style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px', cursor: 'pointer', flexShrink: 0 }}>
            <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.20)' }} />
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <div style={{ paddingBottom: '14px' }}>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', padding: '6px 16px', letterSpacing: '1.2px', textTransform: 'uppercase' }}>Identity Tags</div>
              <div style={{ display: 'flex', gap: '7px', overflowX: 'auto', padding: '0 16px', scrollbarWidth: 'none' }}>
                {IDENTITY_TAGS.map(tag => {
                  const on = sheetSel?.kind === 'tag' && sheetSel.content === tag
                  return (
                    <button key={tag} onClick={() => selectInSheet('tag', tag)} style={{
                      flexShrink: 0, fontSize: '12px', padding: '5px 12px',
                      borderRadius: '14px', whiteSpace: 'nowrap',
                      background: on ? 'rgba(167,139,250,0.28)' : 'rgba(255,255,255,0.07)',
                      color: on ? '#c4b5fd' : 'rgba(255,255,255,0.55)',
                      border: on ? '1px solid rgba(167,139,250,0.55)' : '1px solid rgba(255,255,255,0.10)',
                      transition: 'all 0.15s',
                    }}>{tag}</button>
                  )
                })}
              </div>
            </div>
            <div style={{ paddingBottom: '8px' }}>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', padding: '0 16px 6px', letterSpacing: '1.2px', textTransform: 'uppercase' }}>Emoji Stamps</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '4px', padding: '0 16px' }}>
                {EMOJI_STAMPS.map(em => {
                  const on = sheetSel?.kind === 'emoji' && sheetSel.content === em
                  return (
                    <button key={em} onClick={() => selectInSheet('emoji', em)} style={{
                      fontSize: '22px', padding: '6px 0', borderRadius: '8px', lineHeight: 1, textAlign: 'center',
                      background: on ? 'rgba(167,139,250,0.22)' : 'rgba(255,255,255,0.05)',
                      border: on ? '1px solid rgba(167,139,250,0.45)' : '1px solid transparent',
                      transition: 'all 0.15s',
                    }}>{em}</button>
                  )
                })}
              </div>
            </div>
          </div>
          <div style={{ flexShrink: 0, padding: '10px 16px 14px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <button disabled={!sheetSel} onClick={insertSelectedItem} style={{
              width: '100%', padding: '12px', borderRadius: '12px',
              fontSize: '14px', fontWeight: 600, border: 'none',
              background: sheetSel ? '#7c3aed' : 'rgba(255,255,255,0.08)',
              color: sheetSel ? 'white' : 'rgba(255,255,255,0.22)',
              boxShadow: sheetSel ? '0 4px 14px rgba(124,58,237,0.40)' : 'none',
              cursor: sheetSel ? 'pointer' : 'not-allowed', transition: 'all 0.2s',
            }}>キャンバスに挿入</button>
          </div>
        </div>
      )}

      {/* ── Avatar editor bottom sheet ───────────────────────────── */}
      {isAvatarEditorOpen && (
        <div onClick={e => e.stopPropagation()} style={{
          position: 'fixed', bottom: '64px', left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: '390px', zIndex: 50,
          background: '#1a1a2e',
          borderTopLeftRadius: '24px', borderTopRightRadius: '24px',
          borderTop: '1px solid rgba(167,139,250,0.18)',
          maxHeight: '75vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
        }}>
          {/* Handle */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0', flexShrink: 0 }}>
            <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.18)' }} />
          </div>

          {/* Title bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 0', flexShrink: 0 }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'white', letterSpacing: '0.3px' }}>アバター編集</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={() => setEditingConfig(p => ({ ...p, seed: Math.random().toString(36).slice(2, 8) }))}
                style={{
                  fontSize: '12px', padding: '5px 10px', borderRadius: '12px',
                  background: 'rgba(167,139,250,0.15)', color: '#c4b5fd',
                  border: '1px solid rgba(167,139,250,0.28)',
                }}
              >🔀 シャッフル</button>
              <button onClick={() => setIsAvatarEditorOpen(false)} style={{
                width: '30px', height: '30px', borderRadius: '50%', fontSize: '14px',
                background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.60)',
                border: '1px solid rgba(255,255,255,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>✕</button>
            </div>
          </div>

          {/* Preview card */}
          <div style={{ padding: '12px 16px 4px', flexShrink: 0 }}>
            <div style={{
              background: 'linear-gradient(160deg, rgba(124,58,237,0.28) 0%, rgba(10,8,20,0.9) 100%)',
              borderRadius: '16px', padding: '12px 0',
              border: '1px solid rgba(167,139,250,0.14)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
              display: 'flex', justifyContent: 'center', alignItems: 'center',
            }}>
              <AvatarPreview config={editingConfig} size={109} pose="stand" />
            </div>
          </div>

          {/* Category tabs */}
          <div style={{ display: 'flex', padding: '10px 16px 0', flexShrink: 0, overflowX: 'auto', scrollbarWidth: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {EDITOR_TABS.map(({ key, icon, label }) => {
              const on = editorTab === key
              return (
                <button key={key} onClick={() => setEditorTab(key)} style={{
                  flexShrink: 0, fontSize: '12px', padding: '6px 10px 10px',
                  background: 'none',
                  borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                  borderBottom: on ? '2px solid #a78bfa' : '2px solid transparent',
                  color: on ? '#c4b5fd' : 'rgba(255,255,255,0.38)',
                  fontWeight: on ? 600 : 400, transition: 'all 0.15s',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                }}>
                  <span style={{ fontSize: '16px' }}>{icon}</span>
                  <span>{label}</span>
                </button>
              )
            })}
          </div>

          {/* Tab content */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '14px 16px 16px' }}>

            {editorTab === 'skin' && (
              <>
                <SectionLabel>肌の色</SectionLabel>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                  {SKIN_COLORS.map(c => (
                    <button key={c} onClick={() => setEditingConfig(p => ({ ...p, skinColor: c }))} style={{
                      width: '48px', height: '48px', borderRadius: '50%', background: `#${c}`,
                      border: editingConfig.skinColor === c ? '3px solid white' : '3px solid transparent',
                      boxShadow: editingConfig.skinColor === c ? '0 0 0 2px #a78bfa' : 'none',
                    }} />
                  ))}
                  <ColorPickerIconButtonNoHash
                    value={editingConfig.skinColor}
                    onChange={c => setEditingConfig(p => ({ ...p, skinColor: c }))}
                  />
                </div>
              </>
            )}

            {editorTab === 'hair-style' && (
              <>
                <SectionLabel>ショート</SectionLabel>
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '12px' }}>
                  {HAIR_SHORT.map(hair => {
                    const on = editingConfig.hair === hair
                    return (
                      <button key={hair} onClick={() => setEditingConfig(p => ({ ...p, hair }))} style={{
                        flexShrink: 0, width: '64px', height: '72px', borderRadius: '10px',
                        background: on ? 'rgba(124,58,237,0.20)' : 'rgba(255,255,255,0.05)',
                        border: on ? '2px solid #a78bfa' : '2px solid rgba(255,255,255,0.10)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px',
                        transition: 'all 0.15s', overflow: 'hidden', padding: '4px 0 2px',
                      }}>
                        <AvatarPreview config={{ ...editingConfig, hair }} size={48} pose="stand" />
                        <span style={{ fontSize: '8px', color: on ? '#c4b5fd' : 'rgba(255,255,255,0.38)' }}>{hair}</span>
                      </button>
                    )
                  })}
                </div>
                <SectionLabel>ロング</SectionLabel>
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '4px' }}>
                  {HAIR_LONG.map(hair => {
                    const on = editingConfig.hair === hair
                    return (
                      <button key={hair} onClick={() => setEditingConfig(p => ({ ...p, hair }))} style={{
                        flexShrink: 0, width: '64px', height: '72px', borderRadius: '10px',
                        background: on ? 'rgba(124,58,237,0.20)' : 'rgba(255,255,255,0.05)',
                        border: on ? '2px solid #a78bfa' : '2px solid rgba(255,255,255,0.10)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px',
                        transition: 'all 0.15s', overflow: 'hidden', padding: '4px 0 2px',
                      }}>
                        <AvatarPreview config={{ ...editingConfig, hair }} size={48} pose="stand" />
                        <span style={{ fontSize: '8px', color: on ? '#c4b5fd' : 'rgba(255,255,255,0.38)' }}>{hair}</span>
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            {editorTab === 'hair-color' && (
              <>
                <SectionLabel>髪の色</SectionLabel>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '4px' }}>
                  {HAIR_COLORS.map(c => (
                    <button key={c} onClick={() => setEditingConfig(p => ({ ...p, hairColor: c }))} style={{
                      width: '40px', height: '40px', borderRadius: '50%', background: `#${c}`,
                      border: editingConfig.hairColor === c ? '3px solid white' : '3px solid transparent',
                      boxShadow: editingConfig.hairColor === c ? '0 0 0 2px #a78bfa' : 'none',
                      outline: c === 'f5deb3' ? '1px solid rgba(255,255,255,0.25)' : 'none',
                    }} />
                  ))}
                  <ColorPickerIconButtonNoHash
                    value={editingConfig.hairColor}
                    onChange={c => setEditingConfig(p => ({ ...p, hairColor: c }))}
                  />
                </div>
              </>
            )}

            {editorTab === 'top' && (
              <>
                <SectionLabel>上の色</SectionLabel>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '16px' }}>
                  {CLOTHES_COLORS.map(c => (
                    <button key={c} onClick={() => setEditingConfig(p => ({ ...p, topColor: c }))} style={{
                      width: '40px', height: '40px', borderRadius: '50%', background: c,
                      border: editingConfig.topColor === c ? '3px solid white' : '3px solid transparent',
                      boxShadow: editingConfig.topColor === c ? '0 0 0 2px #a78bfa' : 'none',
                      outline: c === '#FFFFFF' ? '1px solid rgba(255,255,255,0.25)' : 'none',
                    }} />
                  ))}
                  <ColorPickerIconButton
                    value={editingConfig.topColor}
                    onChange={c => setEditingConfig(p => ({ ...p, topColor: c }))}
                  />
                </div>
                <SectionLabel>下の色</SectionLabel>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                  {CLOTHES_COLORS.map(c => (
                    <button key={c} onClick={() => setEditingConfig(p => ({ ...p, bottomColor: c }))} style={{
                      width: '40px', height: '40px', borderRadius: '50%', background: c,
                      border: editingConfig.bottomColor === c ? '3px solid white' : '3px solid transparent',
                      boxShadow: editingConfig.bottomColor === c ? '0 0 0 2px #a78bfa' : 'none',
                      outline: c === '#FFFFFF' ? '1px solid rgba(255,255,255,0.25)' : 'none',
                    }} />
                  ))}
                  <ColorPickerIconButton
                    value={editingConfig.bottomColor}
                    onChange={c => setEditingConfig(p => ({ ...p, bottomColor: c }))}
                  />
                </div>
              </>
            )}

            {editorTab === 'eye' && (
              <>
                <SectionLabel>目</SectionLabel>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
                  {EYE_VARIANTS.map(v => {
                    const on = editingConfig.eyes === v
                    return (
                      <button key={v} onClick={() => setEditingConfig(p => ({ ...p, eyes: v }))} style={{
                        borderRadius: '10px', padding: '6px 0',
                        background: on ? 'rgba(124,58,237,0.22)' : 'rgba(255,255,255,0.05)',
                        border: on ? '2px solid #a78bfa' : '2px solid rgba(255,255,255,0.08)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                        transition: 'all 0.12s', overflow: 'hidden',
                      }}>
                        <AvatarPreview config={{ ...editingConfig, eyes: v }} size={52} pose="stand" />
                        <span style={{ fontSize: '8px', color: on ? '#c4b5fd' : 'rgba(255,255,255,0.30)' }}>{v.replace('variant', '')}</span>
                      </button>
                    )
                  })}
                </div>
                <SectionLabel>まゆ毛</SectionLabel>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {EYEBROW_VARIANTS.map(v => {
                    const on = editingConfig.eyebrows === v
                    return (
                      <button key={v} onClick={() => setEditingConfig(p => ({ ...p, eyebrows: v }))} style={{
                        borderRadius: '10px', padding: '6px 0',
                        background: on ? 'rgba(124,58,237,0.22)' : 'rgba(255,255,255,0.05)',
                        border: on ? '2px solid #a78bfa' : '2px solid rgba(255,255,255,0.08)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                        transition: 'all 0.12s', overflow: 'hidden',
                      }}>
                        <AvatarPreview config={{ ...editingConfig, eyebrows: v }} size={52} pose="stand" />
                        <span style={{ fontSize: '8px', color: on ? '#c4b5fd' : 'rgba(255,255,255,0.30)' }}>{v.replace('variant', '')}</span>
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            {editorTab === 'mouth' && (
              <>
                <SectionLabel>口</SectionLabel>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {MOUTH_VARIANTS.map(v => {
                    const on = editingConfig.mouth === v
                    return (
                      <button key={v} onClick={() => setEditingConfig(p => ({ ...p, mouth: v }))} style={{
                        borderRadius: '10px', padding: '6px 0',
                        background: on ? 'rgba(124,58,237,0.22)' : 'rgba(255,255,255,0.05)',
                        border: on ? '2px solid #a78bfa' : '2px solid rgba(255,255,255,0.08)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                        transition: 'all 0.12s', overflow: 'hidden',
                      }}>
                        <AvatarPreview config={{ ...editingConfig, mouth: v }} size={52} pose="stand" />
                        <span style={{ fontSize: '8px', color: on ? '#c4b5fd' : 'rgba(255,255,255,0.30)' }}>{v.replace('variant', '')}</span>
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            {editorTab === 'accessory' && (
              <>
                <SectionLabel>メガネ</SectionLabel>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                  {[0, 100].map(prob => {
                    const on = editingConfig.glassesProbability === prob
                    return (
                      <button key={prob} onClick={() => setEditingConfig(p => ({ ...p, glassesProbability: prob }))} style={{
                        flex: 1, borderRadius: '14px', padding: '14px 0',
                        background: on ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.05)',
                        border: on ? '2px solid #a78bfa' : '2px solid rgba(255,255,255,0.08)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                        transition: 'all 0.15s',
                      }}>
                        <AvatarPreview config={{ ...editingConfig, glassesProbability: prob }} size={72} pose="stand" />
                        <span style={{ fontSize: '12px', color: on ? '#c4b5fd' : 'rgba(255,255,255,0.45)' }}>{prob === 0 ? 'なし' : 'あり'}</span>
                      </button>
                    )
                  })}
                </div>
                <SectionLabel>ピアス</SectionLabel>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {[0, 100].map(prob => {
                    const on = editingConfig.earringsProbability === prob
                    return (
                      <button key={prob} onClick={() => setEditingConfig(p => ({ ...p, earringsProbability: prob }))} style={{
                        flex: 1, borderRadius: '14px', padding: '14px 0',
                        background: on ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.05)',
                        border: on ? '2px solid #a78bfa' : '2px solid rgba(255,255,255,0.08)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                        transition: 'all 0.15s',
                      }}>
                        <AvatarPreview config={{ ...editingConfig, earringsProbability: prob }} size={72} pose="stand" />
                        <span style={{ fontSize: '12px', color: on ? '#c4b5fd' : 'rgba(255,255,255,0.45)' }}>{prob === 0 ? 'なし' : 'あり'}</span>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* Save button */}
          <div style={{ flexShrink: 0, padding: '10px 16px 20px' }}>
            <button onClick={saveAvatarConfig} style={{
              width: '100%', height: '52px', borderRadius: '16px', border: 'none',
              fontSize: '15px', fontWeight: 700, color: 'white',
              background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
              boxShadow: '0 4px 20px rgba(124,58,237,0.45)',
            }}>保存する ✓</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1.2px' }}>
      {children}
    </div>
  )
}

// Composite avatar: DiceBear face overlaid on hand-drawn SVG body
function AvatarComposite({
  config, size, pose, svgString,
}: {
  config: AvatarConfig
  size: number
  pose: Pose
  svgString: string
}) {
  return (
    <div style={{ width: size, height: Math.round(size * 220 / 120), position: 'relative', flexShrink: 0 }}>
      <svg
        viewBox="0 0 120 220"
        fill="none"
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      >
        {renderBody(pose, config)}
      </svg>
      {svgString && (
        <div
          style={{
            position: 'absolute', top: '0%', left: '50%',
            transform: 'translateX(-50%)', width: '75%',
            pointerEvents: 'none', lineHeight: 0,
          }}
          dangerouslySetInnerHTML={{ __html: svgString }}
        />
      )}
    </div>
  )
}

// Picker preview — computed synchronously (always client-side in 'use client')
function AvatarPreview({ config, size = 80, pose = 'stand' }: { config: AvatarConfig; size?: number; pose?: Pose }) {
  return <AvatarComposite config={config} size={size} pose={pose} svgString={createAvatarSvg(config)} />
}

// Canvas / profile avatar — SSR-safe via useEffect
const AvatarSVG = memo(function AvatarSVG({
  config,
  size = 80,
  pose = 'stand',
}: {
  config: AvatarConfig
  size?: number
  pose?: Pose
}) {
  const [svgString, setSvgString] = useState('')

  useEffect(() => {
    setSvgString(createAvatarSvg(config))
  }, [config])

  return <AvatarComposite config={config} size={size} pose={pose} svgString={svgString} />
})

// color stored without # (DiceBear format)
function ColorPickerIconButtonNoHash({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <label style={{
      width: '40px', height: '40px', borderRadius: '50%',
      background: 'rgba(255,255,255,0.08)', border: '2px solid rgba(255,255,255,0.14)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '18px', cursor: 'pointer', position: 'relative',
    }}>
      🎨
      <input type="color" value={`#${value}`} onChange={e => onChange(e.target.value.slice(1))}
        style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer', border: 'none' }}
      />
    </label>
  )
}

// color stored with # (CSS format)
function ColorPickerIconButton({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <label style={{
      width: '40px', height: '40px', borderRadius: '50%',
      background: 'rgba(255,255,255,0.08)', border: '2px solid rgba(255,255,255,0.14)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '18px', cursor: 'pointer', position: 'relative',
    }}>
      🎨
      <input type="color" value={value} onChange={e => onChange(e.target.value)}
        style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer', border: 'none' }}
      />
    </label>
  )
}

// tag color picker — uses standard # hex format
function ColorPicker({ color, onChange }: { color: string; onChange: (c: string) => void }) {
  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', marginBottom: '5px', scrollbarWidth: 'none' }}>
        {PRESET_COLORS.map(c => (
          <button key={c} onClick={() => onChange(`#${c}`)} style={{
            width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0, background: `#${c}`,
            border: color.toUpperCase() === `#${c}` ? '2px solid white' : '2px solid transparent',
            outline: c === 'FFFFFF' ? '1px solid rgba(255,255,255,0.28)' : 'none',
          }} />
        ))}
      </div>
      <input type="color" value={color} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', height: '32px', borderRadius: '6px', border: 'none', cursor: 'pointer', padding: 0 }}
      />
    </div>
  )
}

function ProfileAvatar({ config }: { config: AvatarConfig }) {
  return (
    <div style={{
      width: '72px', height: '72px', borderRadius: '50%',
      border: '3px solid rgba(255,255,255,0.92)', overflow: 'hidden',
      background: '#e9d5ff', boxShadow: '0 2px 14px rgba(0,0,0,0.38)',
      display: 'flex', justifyContent: 'center',
    }}>
      <AvatarSVG config={config} size={60} pose="stand" />
    </div>
  )
}
