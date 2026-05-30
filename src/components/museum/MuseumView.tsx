'use client'

import { useState, useEffect, useRef, memo } from 'react'
import { createAvatar } from '@dicebear/core'
import { adventurer } from '@dicebear/collection'
import type { Options } from '@dicebear/adventurer'
import { SkyLayer } from '@/components/room/SkyLayer'
import { DoorHall } from '@/components/world/DoorHall'
import { useWorldStore } from '@/store/useWorldStore'
import { useProfileStore } from '@/store/useProfileStore'
import type { Gender } from '@/store/useProfileStore'

// ── Types ─────────────────────────────────────────────────────────────────────

type Period    = 'morning' | 'afternoon' | 'evening' | 'night'
type MuseumTab = 'museum' | 'profile'
type Pose      = 'stand' | 'arms' | 'onehand' | 'sit'
type EditorTab    = 'skin' | 'hair-style' | 'hair-color' | 'top' | 'eye' | 'mouth' | 'accessory' | 'pose' | 'fashion'
type DecorSubPage = 'wallpaper' | 'theme' | 'notif' | 'emoji' | 'zukan'
type DecoTheme    = { text: string; subText: string; headerBg: string; border: string; bg: string }

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
  if (h >= 18 || h < 5) return 'night'
  if (h < 11)           return 'morning'
  if (h < 15)           return 'afternoon'
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

type ClothingStyle = {
  top: string; bottom: string; shoes: string; outer: string | null
  topColor: string; bottomColor: string; shoesColor: string; outerColor: string
}

// Body SVG elements (viewBox 0 0 120 220, face occupies y=0–75)
function renderBody(pose: Pose, config: AvatarConfig, clothing?: ClothingStyle) {
  const skin       = `#${config.skinColor}`
  const top        = clothing?.topColor    ?? config.topColor
  const bot        = clothing?.bottomColor ?? config.bottomColor
  const shoeCol    = clothing?.shoesColor  ?? '#2a2a2a'
  const topStyle   = clothing?.top         ?? 'tshirt'
  const outerStyle = clothing?.outer       ?? null
  const outerColor = clothing?.outerColor  ?? '#374151'

  const neck   = <rect key="neck"   x="52" y="68" width="16" height="16" rx="5" fill={skin} />
  const body   = <path key="body"   d="M38,84 Q38,82 42,82 L78,82 Q82,82 82,84 L80,130 Q80,134 76,134 L44,134 Q40,134 40,130 Z" fill={top} />
  const collar = <path key="collar" d="M48,84 Q60,80 72,84" stroke="rgba(0,0,0,0.13)" strokeWidth="1.5" fill="none" />
  const waist  = <line key="waist"  x1="40" y1="134" x2="80" y2="134" stroke="rgba(0,0,0,0.18)" strokeWidth="1" />

  const isLong  = topStyle === 'longsleeve' || topStyle === 'hoodie'
  const armFill = isLong ? top : skin

  const leftArmStand  = <path key="al" d="M38,85 Q30,88 26,105 Q24,118 26,128 Q28,132 32,130 Q34,120 36,108 Q38,96 40,88 Z" fill={armFill} />
  const rightArmStand = <path key="ar" d="M82,85 Q90,88 94,105 Q96,118 94,128 Q92,132 88,130 Q86,120 84,108 Q82,96 80,88 Z" fill={armFill} />
  const leftArmArms   = <path key="al" d="M38,88 Q28,82 16,78 Q10,76 10,80 Q12,84 18,86 Q28,90 38,94 Z" fill={skin} />
  const rightArmArms  = <path key="ar" d="M82,88 Q92,82 104,78 Q110,76 110,80 Q108,84 102,86 Q92,90 82,94 Z" fill={skin} />
  const rightArmOne   = <path key="ar" d="M82,85 Q88,75 92,60 Q94,52 90,50 Q86,50 84,58 Q80,72 80,88 Z" fill={skin} />

  const legL  = <path key="ll" d="M44,134 L44,138 Q42,160 41,178 Q40,184 44,185 Q50,186 52,184 Q54,182 53,178 Q52,160 52,138 L52,134 Z" fill={bot} />
  const legR  = <path key="lr" d="M68,134 L68,138 Q68,160 67,178 Q66,182 68,184 Q72,186 78,185 Q82,184 79,178 Q78,160 76,138 L76,134 Z" fill={bot} />
  const shoeL = <ellipse key="sl" cx="47" cy="185" rx="10" ry="5" fill={shoeCol} />
  const shoeR = <ellipse key="sr" cx="73" cy="185" rx="10" ry="5" fill={shoeCol} />

  // Tshirt sleeve caps (shoulder-only overlay on skin arms)
  const sleeveCaps = topStyle === 'tshirt' ? <>
    <path key="alc" d="M38,85 Q30,88 28,102 Q38,106 40,90 Z" fill={top} />
    <path key="arc" d="M82,85 Q90,88 92,102 Q82,106 80,90 Z" fill={top} />
  </> : null

  // Hood overlay for hoodie
  const hood = topStyle === 'hoodie'
    ? <path key="hood" d="M44,84 Q42,74 60,68 Q78,74 76,84 Q68,78 60,76 Q52,78 44,84 Z" fill={top} opacity="0.85" />
    : null

  // Outer layer (jacket/blazer/coat/denim/parka on top of inner top)
  const outerBody = outerStyle ? (
    outerStyle === 'coat'
      ? <path key="ob" d="M38,84 Q38,82 42,82 L78,82 Q82,82 82,84 L80,158 Q80,162 76,162 L44,162 Q40,162 40,158 Z" fill={outerColor} />
      : <path key="ob" d="M38,84 Q38,82 42,82 L78,82 Q82,82 82,84 L80,130 Q80,134 76,134 L44,134 Q40,134 40,130 Z" fill={outerColor} />
  ) : null
  const outerLeftArm = outerStyle
    ? <path key="oal" d="M38,85 Q30,88 26,105 Q24,118 26,128 Q28,132 32,130 Q34,120 36,108 Q38,96 40,88 Z" fill={outerColor} />
    : null
  const outerRightArm = outerStyle
    ? <path key="oar" d="M82,85 Q90,88 94,105 Q96,118 94,128 Q92,132 88,130 Q86,120 84,108 Q82,96 80,88 Z" fill={outerColor} />
    : null
  const outerLapels = (outerStyle === 'jacket' || outerStyle === 'blazer')
    ? <path key="olap" d="M52,84 L50,104 L60,94 L70,104 L68,84" stroke="white" strokeWidth="1.5" fill="none" opacity="0.35" />
    : null
  const outerHood = outerStyle === 'parka'
    ? <path key="ohood" d="M44,84 Q42,74 60,68 Q78,74 76,84 Q68,78 60,76 Q52,78 44,84 Z" fill={outerColor} opacity="0.9" />
    : null
  const outerDenim = outerStyle === 'denim'
    ? <>
        <line key="odl" x1="44" y1="84" x2="44" y2="134" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        <line key="odr" x1="76" y1="84" x2="76" y2="134" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      </>
    : null
  const outerLayer = outerStyle ? <>{outerBody}{outerLeftArm}{outerRightArm}{outerLapels}{outerHood}{outerDenim}</> : null

  if (pose === 'sit') {
    return (
      <>
        <path key="lap"  d="M44,134 L44,138 Q44,148 55,150 Q66,152 72,148 L76,134 Z" fill={bot} />
        <path key="leg"  d="M52,150 Q52,160 51,172 Q50,178 54,179 Q58,180 60,178 Q62,174 62,160 L62,150 Z" fill={bot} />
        <ellipse key="sh" cx="56" cy="179" rx="9" ry="5" fill={shoeCol} />
        {hood}
        {body}{collar}{waist}
        {leftArmStand}{rightArmStand}
        {sleeveCaps}
        {outerLayer}
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
        {hood}
        {body}{collar}{waist}
        {leftArmArms}{rightArmArms}
        {outerBody}{outerLapels}{outerHood}{outerDenim}
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
        {hood}
        {body}{collar}{waist}
        {leftArmStand}{rightArmOne}
        {sleeveCaps}
        {outerLayer}
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
      {hood}
      {body}{collar}{waist}
      {leftArmStand}{rightArmStand}
      {sleeveCaps}
      {outerLayer}
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

const BG_COLOR: Record<Period, string> = {
  morning: '#e0f2fe', afternoon: '#dbeafe', evening: '#ffedd5', night: '#07060f',
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

const TOP_STYLES = [
  { val: 'tshirt',     label: 'Tシャツ',      svg: <svg viewBox="0 0 60 50" width="48" height="40"><path d="M10,5 L0,20 L12,20 L12,45 L48,45 L48,20 L60,20 L50,5 L38,10 Q30,15 22,10 Z" fill="currentColor"/></svg> },
  { val: 'tanktop',    label: 'タンクトップ',  svg: <svg viewBox="0 0 60 50" width="48" height="40"><path d="M18,5 L15,45 L45,45 L42,5 Q30,12 18,5 Z" fill="currentColor"/></svg> },
  { val: 'longsleeve', label: '長袖',          svg: <svg viewBox="0 0 80 55" width="48" height="40"><path d="M15,5 L0,30 L15,32 L18,45 L62,45 L65,32 L80,30 L65,5 L50,12 Q40,17 30,12 Z" fill="currentColor"/></svg> },
  { val: 'hoodie',     label: 'パーカー',      svg: <svg viewBox="0 0 80 60" width="48" height="40"><path d="M15,5 L0,32 L15,34 L18,50 L62,50 L65,34 L80,32 L65,5 L50,14 Q40,22 30,14 Z" fill="currentColor"/><rect x="27" y="5" width="26" height="14" rx="6" fill="currentColor" opacity="0.5"/></svg> },
]

const BOTTOM_STYLES = [
  { val: 'jeans',      label: 'ジーンズ',    svg: <svg viewBox="0 0 60 60" width="40" height="40"><path d="M5,0 L20,60 L30,40 L40,60 L55,0 Z" fill="currentColor"/><line x1="30" y1="0" x2="30" y2="40" stroke="white" strokeWidth="2" opacity="0.3"/></svg> },
  { val: 'shorts',     label: 'ハーフパンツ', svg: <svg viewBox="0 0 60 40" width="40" height="40"><path d="M5,0 L18,40 L30,25 L42,40 L55,0 Z" fill="currentColor"/></svg> },
  { val: 'sweatpants', label: 'スウェット',   svg: <svg viewBox="0 0 60 60" width="40" height="40"><path d="M5,0 L18,60 L30,42 L42,60 L55,0 Z" fill="currentColor"/><line x1="5" y1="8" x2="55" y2="8" stroke="white" strokeWidth="3" opacity="0.3"/></svg> },
  { val: 'slacks',     label: 'スラックス',   svg: <svg viewBox="0 0 60 60" width="40" height="40"><path d="M8,0 L20,60 L30,44 L40,60 L52,0 Z" fill="currentColor"/></svg> },
  { val: 'skirt',      label: 'スカート',     svg: <svg viewBox="0 0 70 55" width="40" height="40"><path d="M15,0 L0,55 L70,55 L55,0 Z" fill="currentColor"/></svg> },
  { val: 'miniskirt',  label: 'ミニスカ',     svg: <svg viewBox="0 0 70 35" width="40" height="40"><path d="M15,0 L5,35 L65,35 L55,0 Z" fill="currentColor"/></svg> },
]

const SHOES_STYLES = [
  { val: 'sneakers', label: 'スニーカー', svg: <svg viewBox="0 0 70 35" width="48" height="30"><path d="M5,20 Q20,5 40,8 L65,10 L65,28 Q40,32 5,28 Z" fill="currentColor"/><rect x="5" y="24" width="60" height="6" rx="3" fill="currentColor" opacity="0.6"/></svg> },
  { val: 'leather',  label: '革靴',       svg: <svg viewBox="0 0 70 35" width="48" height="30"><path d="M5,20 Q25,8 45,10 L65,12 L65,28 Q40,32 5,28 Z" fill="currentColor"/></svg> },
  { val: 'sandals',  label: 'サンダル',   svg: <svg viewBox="0 0 70 30" width="48" height="30"><rect x="5" y="20" width="60" height="8" rx="4" fill="currentColor"/><line x1="15" y1="20" x2="20" y2="8" stroke="currentColor" strokeWidth="4"/><line x1="35" y1="20" x2="35" y2="5" stroke="currentColor" strokeWidth="4"/><line x1="55" y1="20" x2="50" y2="8" stroke="currentColor" strokeWidth="4"/></svg> },
  { val: 'boots',    label: 'ブーツ',     svg: <svg viewBox="0 0 60 55" width="48" height="40"><rect x="15" y="0" width="20" height="35" rx="4" fill="currentColor"/><path d="M10,30 Q30,25 50,30 L50,50 Q30,55 10,50 Z" fill="currentColor"/></svg> },
  { val: 'pumps',    label: 'パンプス',   svg: <svg viewBox="0 0 70 40" width="48" height="30"><path d="M5,30 Q30,10 60,25 L60,35 Q40,38 5,35 Z" fill="currentColor"/><line x1="50" y1="35" x2="54" y2="10" stroke="currentColor" strokeWidth="4"/></svg> },
  { val: 'heels',    label: 'ハイヒール', svg: <svg viewBox="0 0 70 45" width="48" height="30"><path d="M5,35 Q30,15 60,28 L60,38 Q40,42 5,40 Z" fill="currentColor"/><line x1="52" y1="38" x2="58" y2="8" stroke="currentColor" strokeWidth="5"/></svg> },
  { val: 'loafers',  label: 'ローファー', svg: <svg viewBox="0 0 70 35" width="48" height="30"><path d="M5,18 Q28,6 48,10 L65,14 L65,28 Q40,32 5,28 Z" fill="currentColor"/><path d="M20,10 Q30,5 40,10" stroke="white" strokeWidth="2" fill="none" opacity="0.5"/></svg> },
]
const OUTER_STYLES: { val: string | null; label: string; svg?: React.ReactElement }[] = [
  { val: null,      label: 'なし' },
  { val: 'jacket',  label: 'ジャケット',        svg: <svg viewBox="0 0 80 60" width="48" height="40"><path d="M15,5 L0,32 L15,34 L18,55 L62,55 L65,34 L80,32 L65,5 L50,15 L40,25 L30,15 Z" fill="currentColor"/><line x1="40" y1="25" x2="40" y2="55" stroke="white" strokeWidth="2" opacity="0.4"/></svg> },
  { val: 'blazer',  label: 'ブレザー',          svg: <svg viewBox="0 0 80 60" width="48" height="40"><path d="M15,5 L0,32 L15,34 L18,55 L62,55 L65,34 L80,32 L65,5 L50,15 L40,28 L30,15 Z" fill="currentColor"/><path d="M30,15 L35,30 L40,28 L45,30 L50,15" fill="white" opacity="0.2"/></svg> },
  { val: 'coat',    label: 'コート',            svg: <svg viewBox="0 0 80 80" width="48" height="40"><path d="M15,5 L0,35 L15,37 L16,75 L64,75 L65,37 L80,35 L65,5 L50,16 L40,28 L30,16 Z" fill="currentColor"/></svg> },
  { val: 'denim',   label: 'デニムジャケット',  svg: <svg viewBox="0 0 80 60" width="48" height="40"><path d="M15,5 L0,32 L15,34 L18,55 L62,55 L65,34 L80,32 L65,5 L50,14 L40,22 L30,14 Z" fill="currentColor"/><line x1="40" y1="22" x2="40" y2="55" stroke="white" strokeWidth="1" opacity="0.3"/><line x1="18" y1="38" x2="62" y2="38" stroke="white" strokeWidth="1" opacity="0.25"/></svg> },
  { val: 'parka',   label: 'マウンテンパーカー', svg: <svg viewBox="0 0 80 65" width="48" height="40"><path d="M15,10 L0,35 L15,37 L18,58 L62,58 L65,37 L80,35 L65,10 L50,20 Q40,30 30,20 Z" fill="currentColor"/><path d="M30,10 Q40,18 50,10 Q46,4 40,2 Q34,4 30,10 Z" fill="currentColor" opacity="0.7"/></svg> },
]
const PROFILE_TAGS   = ['#夜型', '#音楽好き', '#猫派', '#インドア']
const INITIAL_TAGS   = ['#音楽', '#夜型', '#猫好き']
const INITIAL_EMOJIS = ['🎵', '⭐', '🌙']

const HAIR_SHORT = ['short01','short02','short03','short04','short05','short06','short07','short08','short09','short10']
const HAIR_LONG  = ['long01','long02','long03','long04','long05','long06','long07','long08','long09','long10']

const HAIR_MALE         = ['short01', 'short02', 'short03', 'mohawk']
const HAIR_FEMALE       = ['long01', 'long02', 'long03', 'bun']
const TOP_COLORS_MALE   = ['#3B82F6', '#1E40AF', '#1E293B', '#374151', '#6B7280', '#0F172A', '#94A3B8']
const TOP_COLORS_FEMALE = ['#EC4899', '#F472B6', '#7C3AED', '#A855F7', '#FFFFFF', '#FDF2F8', '#DB2777']

const EYE_VARIANTS     = ['variant01','variant02','variant03','variant04','variant05','variant06','variant07','variant08','variant09','variant10','variant11','variant12']
const EYEBROW_VARIANTS = ['variant01','variant02','variant03','variant04','variant05','variant06','variant07','variant08','variant09','variant10']
const MOUTH_VARIANTS   = ['variant01','variant02','variant03','variant04','variant05','variant06','variant07','variant08','variant09','variant10','variant11','variant12','variant13','variant14','variant15']

const POSE_LABELS: Record<Pose, string> = {
  stand: '通常', arms: '両手', onehand: '片手', sit: '座り',
}

const DECO_WALLPAPERS = [
  'linear-gradient(135deg,#1e1b4b,#4c1d95)',
  'linear-gradient(135deg,#0f172a,#1e40af)',
  'linear-gradient(135deg,#14532d,#166534)',
  'linear-gradient(135deg,#7f1d1d,#991b1b)',
  'linear-gradient(135deg,#1e3a5f,#0ea5e9)',
  'linear-gradient(135deg,#713f12,#a16207)',
]
const DECO_THEME_COLORS = ['#a78bfa','#60a5fa','#f472b6','#34d399','#fb923c','#f43f5e']
const DECO_NOTIFS: Array<{ val: 'star' | 'dot' | 'bell'; label: string }> = [
  { val: 'star', label: '⭐ 星' },
  { val: 'dot',  label: '🔴 ドット' },
  { val: 'bell', label: '🔔 ベル' },
]
const DECO_SETTING_THEME: Record<Period, DecoTheme> = {
  morning:   { text: '#0f172a', subText: '#64748b', headerBg: 'rgba(255,255,255,0.70)', border: 'rgba(0,0,0,0.08)',        bg: '#f1f5f9' },
  afternoon: { text: '#1e3a5f', subText: '#64748b', headerBg: 'rgba(255,255,255,0.70)', border: 'rgba(0,0,0,0.08)',        bg: '#eff6ff' },
  evening:   { text: '#431407', subText: '#92400e', headerBg: 'rgba(255,255,255,0.60)', border: 'rgba(0,0,0,0.08)',        bg: '#fff7ed' },
  night:     { text: '#e2e8f0', subText: 'rgba(255,255,255,0.45)', headerBg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.06)', bg: '#0f0e1a' },
}

const HEADER_GRADIENT: Record<Period, string> = {
  morning:   'linear-gradient(155deg, #0ea5e9 0%, #ffd080 100%)',
  afternoon: 'linear-gradient(155deg, #1d4ed8 0%, #60a5fa 100%)',
  evening:   'linear-gradient(155deg, #ea580c 0%, #9333ea 100%)',
  night:     'linear-gradient(155deg, #1e1b4b 0%, #4c1d95 100%)',
}

const ARC_RADIUS = 100
const ARC_TABS = [
  { label: 'Profile',    index: 1, angle: -50 },
  { label: 'Museum',     index: 0, angle: 0   },
  { label: 'Decoration', index: 2, angle: 50  },
]

const CANVAS_FRAME: React.CSSProperties = {
  width: '91.8vw', maxWidth: '367px', height: '100%',
  background: 'white', border: '8px solid #c0c0c0', borderRadius: '4px',
  boxShadow: '0 24px 64px rgba(0,0,0,0.40), inset 0 0 0 2px #e8e8e8, inset 0 0 0 3px #a0a0a0',
  position: 'relative', overflow: 'hidden',
}

const EDITOR_TABS: { key: EditorTab; icon: string; label: string }[] = [
  { key: 'skin',       icon: '🎨', label: '肌'         },
  { key: 'hair-style', icon: '💇', label: '髪型'       },
  { key: 'hair-color', icon: '🎨', label: '髪色'       },
  { key: 'top',        icon: '👕', label: '服'         },
  { key: 'eye',        icon: '👁️', label: '目'         },
  { key: 'mouth',      icon: '👄', label: '口'         },
  { key: 'accessory',  icon: '✨', label: 'アクセ'     },
]

// ── Main Component ─────────────────────────────────────────────────────────────

export function MuseumView() {
  const [hour,           setHour]           = useState(0)
  const [period,         setPeriod]         = useState<Period>('night')
  const [canvases,       setCanvases]       = useState<CanvasData[]>([])
  const [activeIndex,    setActiveIndex]    = useState(0)
  const [direction,      setDirection]      = useState<'left' | 'right'>('right')
  const [activeCanvas,   setActiveCanvas]   = useState(0)
  const [isSheetOpen,    setIsSheetOpen]    = useState(false)
  const [editMenuOpen,   setEditMenuOpen]   = useState(false)
  const [isTitleEditOpen, setIsTitleEditOpen] = useState(false)
  const [isBgEditOpen,    setIsBgEditOpen]    = useState(false)
  const [canvasBg,        setCanvasBg]        = useState<string>('default')
  const [bgHue,           setBgHue]           = useState(270)
  const [bgSaturation,    setBgSaturation]    = useState(60)
  const [bgLightness,     setBgLightness]     = useState(95)
  const [bgMode,          setBgMode]          = useState<'solid' | 'gradient'>('solid')
  const [bgCustomColor,   setBgCustomColor]   = useState('#ffffff')
  const [titleColor,     setTitleColor]     = useState('#ffffff')
  const [titleFontSize,  setTitleFontSize]  = useState(13)
  const [titleFont,      setTitleFont]      = useState('default')
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [sheetSel,       setSheetSel]       = useState<SheetSelection | null>(null)
  const [tagPickerOpen,  setTagPickerOpen]  = useState(false)
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)
  const [tagSearch,      setTagSearch]      = useState('')
  const [tagFilter,      setTagFilter]      = useState<string>('すべて')
  const [selectedTag,    setSelectedTag]    = useState<string | null>(null)
  const [selectedEmoji,  setSelectedEmoji]  = useState<string | null>(null)
  const [canvasTitle,    setCanvasTitle]    = useState('無題')
  const [isEditingTitle, setIsEditingTitle] = useState(false)

  const [avatarConfig,       setAvatarConfig]       = useState<AvatarConfig>(DEFAULT_AVATAR)
  const [isAvatarEditorOpen, setIsAvatarEditorOpen] = useState(false)
  const [canvasEditSubPanel, setCanvasEditSubPanel] = useState<'fashion' | 'pose' | null>(null)
  const [editorTab,          setEditorTab]          = useState<EditorTab>('skin')
  const [editingConfig,      setEditingConfig]      = useState<AvatarConfig>(DEFAULT_AVATAR)
  const [clothingTop,        setClothingTop]        = useState('tshirt')
  const [clothingBottom,     setClothingBottom]     = useState('jeans')
  const [clothingShoes,      setClothingShoes]      = useState('sneakers')
  const [clothingTopColor,   setClothingTopColor]   = useState('#8b5cf6')
  const [clothingBottomColor, setClothingBottomColor] = useState('#1e3a5f')
  const [clothingShoesColor, setClothingShoesColor] = useState('#ffffff')
  const [clothingOuter,      setClothingOuter]      = useState<string | null>(null)
  const [clothingOuterColor, setClothingOuterColor] = useState('#374151')
  const [clothingSubTab,     setClothingSubTab]     = useState<'outer' | 'top' | 'bottom' | 'shoes'>('top')
  const [savedOutfits,       setSavedOutfits]       = useState<{ id: number; name: string; top: string; topColor: string; bottom: string; bottomColor: string; shoes: string; shoesColor: string; outer: string | null }[]>([
    { id: 1, name: 'デフォルト', top: 'tshirt',     topColor: '#8b5cf6', bottom: 'jeans',      bottomColor: '#1e3a5f', shoes: 'sneakers', shoesColor: '#ffffff', outer: null     },
    { id: 2, name: 'カジュアル', top: 'hoodie',     topColor: '#374151', bottom: 'sweatpants', bottomColor: '#374151', shoes: 'sneakers', shoesColor: '#1a1a2e', outer: null     },
    { id: 3, name: 'きれいめ',   top: 'longsleeve', topColor: '#1e3a5f', bottom: 'slacks',     bottomColor: '#1a1a2e', shoes: 'loafers',  shoesColor: '#92400e', outer: 'blazer' },
  ])
  const [selectedOutfitId,   setSelectedOutfitId]   = useState<number | null>(null)
  const [editingOutfitId,    setEditingOutfitId]    = useState<number | null>(null)
  const [editingOutfitName,  setEditingOutfitName]  = useState('')

  const [displayName,           setDisplayName]           = useState('なつき')
  const [userId,                setUserId]                = useState('natsuki_346')
  const [bio,                   setBio]                   = useState('夜型の音楽好き🎵 猫と暮らしてます🐱')
  const [identityTags,          setIdentityTags]          = useState(['#夜型', '#音楽好き', '#猫派', '#インドア'])
  const [subPage,               setSubPage]               = useState<'profile-edit' | 'tag-list' | 'connections' | null>(null)
  const [profileHeaderGradient, setProfileHeaderGradient] = useState('linear-gradient(155deg, #7c3aed 0%, #ec4899 100%)')
  const [fashionExpanded,       setFashionExpanded]       = useState(false)
  const [editName,              setEditName]              = useState('')
  const [editId,                setEditId]                = useState('')
  const [editBio,               setEditBio]               = useState('')
  const [editGender,            setEditGender]            = useState<Gender>('未設定')

  const [wallpaper,    setWallpaper]    = useState<string | null>(null)
  const [themeColor,   setThemeColor]   = useState('#8b5cf6')
  const [navIconColor, setNavIconColor] = useState('#8b5cf6')
  const [editBtnColor, setEditBtnColor] = useState('#ec4899')
  const [editBtnEmoji, setEditBtnEmoji] = useState('🎨')
  const [notifyStyle,  setNotifyStyle]  = useState<'star' | 'dot' | 'bell'>('star')
  const [decorSubPage, setDecorSubPage] = useState<DecorSubPage | null>(null)

  const { setView, setSubPageOpen } = useWorldStore()
  const { gender, setGender } = useProfileStore()

  const canvasRefs          = useRef<(HTMLDivElement | null)[]>([null, null, null])
  const activeCanvasRef     = useRef(0)
  activeCanvasRef.current   = activeCanvas
  const carouselPtrX        = useRef<number | null>(null)
  const viewTouchX          = useRef<number | null>(null)
  const dragState           = useRef<DragState | null>(null)
  const didDrag             = useRef(false)
  const canvasesRef         = useRef<CanvasData[]>([])
  canvasesRef.current       = canvases
  const selectedItemIdRef   = useRef<string | null>(null)
  selectedItemIdRef.current = selectedItemId
  const pinchState          = useRef<PinchState | null>(null)
  const pinchActive         = useRef(false)

  useEffect(() => {
    setSubPageOpen(subPage !== null)
  }, [subPage, setSubPageOpen])

  useEffect(() => {
    const update = () => {
      const h = new Date().getHours()
      setHour(h)
      setPeriod(getPeriod(h))
    }
    update()
    const id = setInterval(update, 60_000)
    return () => clearInterval(id)
  }, [])

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

  // ── View swipe (Museum / Profile / Decoration) ─────────────────
  const onViewTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    viewTouchX.current = e.touches[0].clientX
  }
  const onViewTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (viewTouchX.current === null) return
    const dx = e.changedTouches[0].clientX - viewTouchX.current
    viewTouchX.current = null
    if (dx < -40) { setDirection('right'); setActiveIndex(prev => Math.min(2, prev + 1)) }
    else if (dx > 40) { setDirection('left'); setActiveIndex(prev => Math.max(0, prev - 1)) }
  }

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

  const openSubPage = (page: 'profile-edit' | 'tag-list' | 'connections') => {
    if (page === 'profile-edit') { setEditName(displayName); setEditId(userId); setEditBio(bio); setEditGender(gender) }
    setSubPage(page)
  }
  const saveProfileAndClose = () => {
    setDisplayName(editName); setUserId(editId); setBio(editBio); setGender(editGender)
    setSubPage(null)
  }

  const activeColor  = TAB_ACTIVE_COLOR[period]
  const dt           = DECO_SETTING_THEME[period]
  const activeItems  = canvases[activeCanvas]?.items ?? []
  const selectedItem = activeItems.find(d => d.id === selectedItemId) ?? null

  return (
    <div className="relative flex flex-col" style={{ height: '100%', overflow: 'hidden' }}>
      <SkyLayer hour={hour} />

      {/* ── Arc tab + content wrapper ────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', overflow: 'hidden' }}>

      {/* ── Arc tab navigation ───────────────────────────────────── */}
      <div style={{
        position: 'relative',
        height: '120px',
        flexShrink: 0,
        zIndex: 10,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingBottom: '8px',
        marginTop: '-20px',
        background: dt.bg,
        borderBottomWidth: '1px',
        borderBottomStyle: 'solid',
        borderBottomColor: dt.border,
        borderRadius: 0,
        width: '100vw',
        marginLeft: 'calc(-50vw + 50%)',
      }}>
        {ARC_TABS.map(({ label, index, angle }) => {
          const rad = angle * Math.PI / 180
          const x = Math.sin(rad) * ARC_RADIUS * 1.2
          const y = (1 - Math.cos(rad)) * ARC_RADIUS * 0.7
          return (
            <button
              key={index}
              onClick={() => {
                setDirection(index < activeIndex ? 'right' : 'left')
                setActiveIndex(index)
              }}
              style={{
                position: 'absolute',
                transform: `translate(${x}px, ${y}px)`,
                bottom: '33px',
                padding: '6px 14px',
                borderRadius: '20px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: activeIndex === index ? 700 : 400,
                background: activeIndex === index ? activeColor : 'rgba(255,255,255,0.12)',
                color: activeIndex === index ? '#fff' : 'rgba(255,255,255,0.55)',
                transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                boxShadow: activeIndex === index ? `0 4px 12px ${activeColor}55` : 'none',
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* ── Content area ─────────────────────────────────────────── */}
      <div
        style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }}
        onTouchStart={onViewTouchStart}
        onTouchEnd={onViewTouchEnd}
      >

      {/* ── Museum (index 0) ─────────────────────────────────────── */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        transform: activeIndex === 0 ? 'translateX(0) rotate(0deg)' : activeIndex === 1 ? 'translateX(60%) rotate(8deg)' : 'translateX(-60%) rotate(-8deg)',
        opacity: activeIndex === 0 ? 1 : 0,
        transition: 'transform 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.4s ease',
        pointerEvents: activeIndex === 0 ? 'auto' : 'none',
        overflow: 'hidden',
      }}>
        <div className="flex-1 min-h-0 flex flex-col">
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
                      style={{ ...CANVAS_FRAME, background: canvasBg === 'default' ? (wallpaper ?? 'white') : canvasBg }}
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

                          {/* Fashion / Pose quick buttons */}
                          {panelItem.kind === 'avatar' && (
                            <>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '8px 12px 4px' }}>
                                <button
                                  onClick={() => setCanvasEditSubPanel(canvasEditSubPanel === 'fashion' ? null : 'fashion')}
                                  style={{
                                    width: '100%', padding: '10px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                                    background: canvasEditSubPanel === 'fashion' ? '#a78bfa' : 'rgba(255,255,255,0.12)',
                                    color: canvasEditSubPanel === 'fashion' ? '#fff' : 'rgba(255,255,255,0.40)',
                                    fontSize: '13px', fontWeight: 600, textAlign: 'left',
                                  }}
                                >
                                  👗 ファッション
                                </button>
                                <button
                                  onClick={() => setCanvasEditSubPanel(canvasEditSubPanel === 'pose' ? null : 'pose')}
                                  style={{
                                    width: '100%', padding: '10px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                                    background: canvasEditSubPanel === 'pose' ? '#a78bfa' : 'rgba(255,255,255,0.12)',
                                    color: canvasEditSubPanel === 'pose' ? '#fff' : 'rgba(255,255,255,0.40)',
                                    fontSize: '13px', fontWeight: 600, textAlign: 'left',
                                  }}
                                >
                                  🕺 ポーズ
                                </button>
                              </div>

                              {canvasEditSubPanel === 'fashion' && (
                                <div style={{ overflowY: 'auto', maxHeight: '160px', marginBottom: '4px' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {savedOutfits.map(outfit => (
                                      <div key={outfit.id}
                                        onClick={() => {
                                          setClothingTop(outfit.top)
                                          setClothingTopColor(outfit.topColor)
                                          setClothingBottom(outfit.bottom)
                                          setClothingBottomColor(outfit.bottomColor)
                                          setClothingShoes(outfit.shoes)
                                          setClothingShoesColor(outfit.shoesColor)
                                          setClothingOuter(outfit.outer)
                                          setSelectedOutfitId(outfit.id)
                                          setCanvasEditSubPanel(null)
                                        }}
                                        style={{
                                          display: 'flex', alignItems: 'center', gap: '10px',
                                          padding: '8px 10px', borderRadius: '10px', cursor: 'pointer',
                                          background: selectedOutfitId === outfit.id ? 'rgba(167,139,250,0.22)' : 'rgba(255,255,255,0.07)',
                                          boxShadow: selectedOutfitId === outfit.id ? '0 0 0 1.5px #a78bfa' : 'none',
                                        }}
                                      >
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 }}>
                                          <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: outfit.topColor }} />
                                          <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: outfit.bottomColor }} />
                                          <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: outfit.shoesColor }} />
                                        </div>
                                        <div style={{ flex: 1 }} onClick={e => e.stopPropagation()}>
                                          {editingOutfitId === outfit.id ? (
                                            <input
                                              autoFocus
                                              value={editingOutfitName}
                                              onChange={e => setEditingOutfitName(e.target.value)}
                                              onBlur={() => {
                                                setSavedOutfits(prev => prev.map(o =>
                                                  o.id === outfit.id ? { ...o, name: editingOutfitName || o.name } : o
                                                ))
                                                setEditingOutfitId(null)
                                              }}
                                              onKeyDown={e => {
                                                if (e.key === 'Enter') {
                                                  setSavedOutfits(prev => prev.map(o =>
                                                    o.id === outfit.id ? { ...o, name: editingOutfitName || o.name } : o
                                                  ))
                                                  setEditingOutfitId(null)
                                                }
                                              }}
                                              style={{
                                                background: 'transparent',
                                                borderWidth: 0, borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: '#a78bfa',
                                                color: 'rgba(255,255,255,0.82)', fontSize: '12px', fontWeight: 600,
                                                outline: 'none', width: '100%',
                                              }}
                                            />
                                          ) : (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                              <p style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.82)', margin: 0 }}>{outfit.name}</p>
                                              <button
                                                onClick={e => {
                                                  e.stopPropagation()
                                                  setEditingOutfitId(outfit.id)
                                                  setEditingOutfitName(outfit.name)
                                                }}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', color: 'rgba(255,255,255,0.40)', padding: '0 2px' }}
                                              >
                                                ✏️
                                              </button>
                                            </div>
                                          )}
                                          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.40)', margin: 0, marginTop: '1px' }}>{outfit.top} / {outfit.bottom}</p>
                                        </div>
                                        {selectedOutfitId === outfit.id && <span style={{ color: '#a78bfa', fontSize: '14px', flexShrink: 0 }}>✓</span>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {canvasEditSubPanel === 'pose' && (
                                <div style={{ marginBottom: '4px' }}>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                                    {[
                                      { val: 'normal',   label: '通常',    emoji: '🧍' },
                                      { val: 'arms_up',  label: '両手',    emoji: '🙌' },
                                      { val: 'one_hand', label: '片手',    emoji: '🙋' },
                                      { val: 'lean',     label: '寄り',    emoji: '😎' },
                                      { val: 'cross',    label: '腕組み',  emoji: '🤞' },
                                      { val: 'peace',    label: 'ピース',  emoji: '✌️' },
                                      { val: 'sit',      label: '座る',    emoji: '🪑' },
                                      { val: 'jump',     label: 'ジャンプ', emoji: '🦘' },
                                    ].map(({ val, label, emoji }) => (
                                      <div key={val}
                                        onClick={() => setCanvasEditSubPanel(null)}
                                        style={{
                                          padding: '8px 4px 6px', borderRadius: '10px', cursor: 'pointer',
                                          textAlign: 'center', background: 'rgba(255,255,255,0.07)',
                                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                                        }}
                                      >
                                        <span style={{ fontSize: '22px' }}>{emoji}</span>
                                        <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.40)' }}>{label}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
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

          <p style={{ textAlign: 'center', fontSize: `${titleFontSize}px`, color: titleColor, fontFamily: titleFont === 'serif' ? 'serif' : titleFont === 'mono' ? 'monospace' : 'sans-serif', padding: '6px 0 2px', letterSpacing: '0.05em', margin: 0 }}>{canvasTitle}</p>

          <div className="flex justify-center gap-2 flex-shrink-0" style={{ paddingBottom: '100px', paddingTop: '8px' }}>
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
      </div>

      {/* ── Profile (index 1) ────────────────────────────────────── */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        transform: activeIndex === 1 ? 'translateX(0) rotate(0deg)' : 'translateX(-60%) rotate(-8deg)',
        opacity: activeIndex === 1 ? 1 : 0,
        transition: 'transform 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.4s ease',
        pointerEvents: activeIndex === 1 ? 'auto' : 'none',
        overflow: 'hidden',
      }}>
        <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
          <div style={{ height: '120px', background: profileHeaderGradient, position: 'relative', flexShrink: 0 }}>
            <button onClick={() => openSubPage('profile-edit')} style={{
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
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '2px' }}>{displayName}</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.42)', marginBottom: '8px' }}>@{userId}</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.78)', lineHeight: 1.55, marginBottom: '10px' }}>
                {bio}
              </div>
              <div style={{ display: 'flex', gap: '28px' }}>
                <button
                  onClick={() => openSubPage('tag-list')}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <span style={{ fontSize: '18px', fontWeight: 700, color: 'white', lineHeight: 1 }}>🏷️ {identityTags.length}</span>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.42)' }}>フォロー中のタグ</span>
                </button>
                <button
                  onClick={() => openSubPage('connections')}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <span style={{ fontSize: '18px', fontWeight: 700, color: 'white', lineHeight: 1 }}>🤝 23</span>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.42)' }}>つながり</span>
                </button>
              </div>
            </div>
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '0 16px' }} />
            <div style={{ padding: '12px 0' }}>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '0 16px', scrollbarWidth: 'none' }}>
                {identityTags.map(tag => (
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
                    <button key={i} onClick={() => setActiveIndex(0)} style={{
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
            {/* MY FASHION */}
            <div style={{ padding: '16px 16px 0' }}>
              <button
                onClick={() => setFashionExpanded(prev => !prev)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0 0 8px', background: 'none', border: 'none', cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      const newOutfit = {
                        id: Date.now(),
                        name: `コーデ${savedOutfits.length + 1}`,
                        top: clothingTop, topColor: clothingTopColor,
                        bottom: clothingBottom, bottomColor: clothingBottomColor,
                        shoes: clothingShoes, shoesColor: clothingShoesColor,
                        outer: clothingOuter,
                      }
                      setSavedOutfits(prev => [...prev, newOutfit])
                      setFashionExpanded(true)
                    }}
                    style={{
                      padding: '4px 10px', borderRadius: '12px',
                      background: '#a78bfa', color: '#fff',
                      fontSize: '11px', fontWeight: 600, border: 'none', cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    ＋ コーデを追加
                  </button>
                  <p style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.45)', letterSpacing: '1.2px', textTransform: 'uppercase', margin: 0 }}>
                    MY FASHION
                  </p>
                </div>
                <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px', transition: 'transform 0.2s', display: 'inline-block', transform: fashionExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  ›
                </span>
              </button>
              {fashionExpanded && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
                  {savedOutfits.length === 0 ? (
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', textAlign: 'center', padding: '12px 0', margin: 0 }}>
                      コーデがまだ登録されていません
                    </p>
                  ) : (
                    savedOutfits.map(outfit => (
                      <div key={outfit.id}
                        onClick={() => {
                          setClothingTop(outfit.top)
                          setClothingTopColor(outfit.topColor)
                          setClothingBottom(outfit.bottom)
                          setClothingBottomColor(outfit.bottomColor)
                          setClothingShoes(outfit.shoes)
                          setClothingShoesColor(outfit.shoesColor)
                          setClothingOuter(outfit.outer)
                          setSelectedOutfitId(outfit.id)
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          padding: '10px 12px', borderRadius: '12px', cursor: 'pointer',
                          background: selectedOutfitId === outfit.id ? 'rgba(167,139,250,0.13)' : 'rgba(255,255,255,0.06)',
                          boxShadow: selectedOutfitId === outfit.id ? '0 0 0 1.5px #a78bfa' : 'none',
                        }}
                      >
                        <div style={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
                          <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: outfit.topColor }} />
                          <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: outfit.bottomColor }} />
                          <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: outfit.shoesColor }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.82)', margin: 0 }}>{outfit.name}</p>
                          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', margin: '2px 0 0' }}>
                            {outfit.top} / {outfit.bottom} / {outfit.shoes}{outfit.outer ? ` / ${outfit.outer}` : ''}
                          </p>
                        </div>
                        {selectedOutfitId === outfit.id && <span style={{ color: '#a78bfa', fontSize: '14px' }}>✓</span>}
                      </div>
                    ))
                  )}
                </div>
              )}
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
      </div>

      {/* ── Decoration (index 2) ─────────────────────────────────── */}
      <div style={{
        position: 'absolute', inset: 0,
        transform: activeIndex === 2 ? 'translateX(0) rotate(0deg)' : 'translateX(60%) rotate(8deg)',
        opacity: activeIndex === 2 ? 1 : 0,
        transition: 'transform 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.4s ease',
        pointerEvents: activeIndex === 2 ? 'auto' : 'none',
      }}>

        {/* ── メイン設定リスト ─────────────────────────────────────── */}
        <div style={{ overflowY: 'auto', height: '100%', paddingBottom: '80px', scrollbarWidth: 'none' }}>

          {/* 外観 */}
          <p style={{ fontSize: '12px', color: dt.subText, padding: '16px 16px 6px', letterSpacing: '0.05em', margin: 0 }}>
            外観
          </p>
          <div style={{ marginLeft: '16px', marginRight: '16px', borderRadius: '12px', overflow: 'hidden', marginBottom: '8px' }}>
            <div
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: dt.border, background: dt.headerBg, cursor: 'pointer' }}
              onClick={() => setDecorSubPage('wallpaper')}
            >
              <span style={{ fontSize: '15px', color: dt.text }}>壁紙</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '13px', color: dt.subText }}>{wallpaper === null ? '時間連動' : '固定'}</span>
                <span style={{ color: dt.subText, fontSize: '13px' }}>›</span>
              </div>
            </div>
            <div
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: dt.headerBg, cursor: 'pointer' }}
              onClick={() => setDecorSubPage('theme')}
            >
              <span style={{ fontSize: '15px', color: dt.text }}>テーマカラー</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: themeColor }} />
                <span style={{ color: dt.subText, fontSize: '13px' }}>›</span>
              </div>
            </div>
          </div>

          {/* ドアのアレンジ */}
          <p style={{ fontSize: '12px', color: dt.subText, padding: '8px 16px 6px', letterSpacing: '0.05em', margin: 0 }}>
            ドアのアレンジ
          </p>
          <div style={{ marginLeft: '16px', marginRight: '16px', borderRadius: '12px', overflow: 'hidden', marginBottom: '8px' }}>
            <div style={{ padding: '12px 16px', background: dt.headerBg }}>
              <p style={{ fontSize: '12px', color: dt.subText, margin: '0 0 10px', lineHeight: 1.55 }}>
                各ドアの編集は Room タブ › 図鑑から行えます
              </p>
              <button
                onClick={() => setDecorSubPage('zukan')}
                style={{
                  fontSize: '13px', padding: '7px 16px', borderRadius: '10px', cursor: 'pointer',
                  background: 'rgba(255,255,255,0.08)', color: dt.subText,
                  borderWidth: '1px', borderStyle: 'solid', borderColor: dt.border,
                }}
              >図鑑を開く</button>
            </div>
          </div>

          {/* Museum 編集ボタン */}
          <p style={{ fontSize: '12px', color: dt.subText, padding: '8px 16px 6px', letterSpacing: '0.05em', margin: 0 }}>
            Museum 編集ボタン
          </p>
          <div style={{ marginLeft: '16px', marginRight: '16px', borderRadius: '12px', overflow: 'hidden', marginBottom: '8px' }}>
            <div
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: dt.headerBg, cursor: 'pointer' }}
              onClick={() => setDecorSubPage('emoji')}
            >
              <span style={{ fontSize: '15px', color: dt.text }}>絵文字</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px', lineHeight: 1 }}>{editBtnEmoji}</span>
                <span style={{ color: dt.subText, fontSize: '13px' }}>›</span>
              </div>
            </div>
          </div>

          {/* 通知スタイル */}
          <p style={{ fontSize: '12px', color: dt.subText, padding: '8px 16px 6px', letterSpacing: '0.05em', margin: 0 }}>
            通知スタイル
          </p>
          <div style={{ marginLeft: '16px', marginRight: '16px', borderRadius: '12px', overflow: 'hidden', marginBottom: '8px' }}>
            <div
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: dt.headerBg, cursor: 'pointer' }}
              onClick={() => setDecorSubPage('notif')}
            >
              <span style={{ fontSize: '15px', color: dt.text }}>通知の表示</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '13px', color: dt.subText }}>{DECO_NOTIFS.find(n => n.val === notifyStyle)?.label ?? ''}</span>
                <span style={{ color: dt.subText, fontSize: '13px' }}>›</span>
              </div>
            </div>
          </div>

        </div>

        {/* ── サブ画面：壁紙 ─────────────────────────────────────────── */}
        <div style={{
          position: 'absolute', inset: 0, background: dt.bg, zIndex: 20,
          transform: decorSubPage === 'wallpaper' ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '20px 16px 8px', flexShrink: 0, borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: dt.border }}>
            <button onClick={() => setDecorSubPage(null)} style={{ fontSize: '15px', color: activeColor, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', padding: 0 }}>
              <span style={{ fontSize: '18px', lineHeight: 1 }}>‹</span>
              <span>戻る</span>
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none', padding: '16px 16px 80px' }}>
            <div style={{ background: dt.headerBg, borderRadius: '12px', overflow: 'hidden', marginBottom: '16px' }}>
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', cursor: 'pointer' }}
                onClick={() => setWallpaper(null)}
              >
                <span style={{ fontSize: '15px', color: dt.text }}>デフォルト（時間連動）</span>
                {wallpaper === null && <span style={{ color: activeColor, fontSize: '16px', fontWeight: 700 }}>✓</span>}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {DECO_WALLPAPERS.map((g, i) => (
                <button
                  key={i}
                  onClick={() => setWallpaper(g)}
                  style={{
                    height: '90px', borderRadius: '10px', background: g, position: 'relative', overflow: 'hidden',
                    borderWidth: '2px', borderStyle: 'solid', borderColor: wallpaper === g ? activeColor : 'transparent',
                  }}
                >
                  {wallpaper === g && (
                    <span style={{ position: 'absolute', top: '6px', right: '8px', color: 'white', fontSize: '16px', fontWeight: 700, textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── サブ画面：テーマカラー ──────────────────────────────────── */}
        <div style={{
          position: 'absolute', inset: 0, background: dt.bg, zIndex: 20,
          transform: decorSubPage === 'theme' ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '20px 16px 8px', flexShrink: 0, borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: dt.border }}>
            <button onClick={() => setDecorSubPage(null)} style={{ fontSize: '15px', color: activeColor, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', padding: 0 }}>
              <span style={{ fontSize: '18px', lineHeight: 1 }}>‹</span>
              <span>戻る</span>
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none', padding: '24px 16px 80px' }}>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              {DECO_THEME_COLORS.map((c, i) => (
                <button
                  key={i}
                  onClick={() => setThemeColor(c)}
                  style={{
                    width: '44px', height: '44px', borderRadius: '50%', background: c, flexShrink: 0,
                    border: 'none',
                    outline: themeColor === c ? `3px solid ${c}` : '3px solid transparent',
                    outlineOffset: '3px',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── サブ画面：通知スタイル ──────────────────────────────────── */}
        <div style={{
          position: 'absolute', inset: 0, background: dt.bg, zIndex: 20,
          transform: decorSubPage === 'notif' ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '20px 16px 8px', flexShrink: 0, borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: dt.border }}>
            <button onClick={() => setDecorSubPage(null)} style={{ fontSize: '15px', color: activeColor, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', padding: 0 }}>
              <span style={{ fontSize: '18px', lineHeight: 1 }}>‹</span>
              <span>戻る</span>
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none', padding: '16px 16px 80px' }}>
            <div style={{ background: dt.headerBg, borderRadius: '12px', overflow: 'hidden' }}>
              {DECO_NOTIFS.map(({ val, label }, i) => (
                <div
                  key={val}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 16px', cursor: 'pointer',
                    ...(i < DECO_NOTIFS.length - 1 ? { borderBottomWidth: '1px', borderBottomStyle: 'solid' as const, borderBottomColor: dt.border } : {}),
                  }}
                  onClick={() => setNotifyStyle(val)}
                >
                  <span style={{ fontSize: '15px', color: dt.text }}>{label}</span>
                  {notifyStyle === val && <span style={{ color: activeColor, fontSize: '16px', fontWeight: 700 }}>✓</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── サブ画面：編集ボタンの絵文字 ───────────────────────────── */}
        <div style={{
          position: 'absolute', inset: 0, background: dt.bg, zIndex: 20,
          transform: decorSubPage === 'emoji' ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '20px 16px 8px', flexShrink: 0, borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: dt.border }}>
            <button onClick={() => setDecorSubPage(null)} style={{ fontSize: '15px', color: activeColor, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', padding: 0 }}>
              <span style={{ fontSize: '18px', lineHeight: 1 }}>‹</span>
              <span>戻る</span>
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none', padding: '16px 16px 80px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              {EMOJI_STAMPS.map((em, i) => (
                <button
                  key={i}
                  onClick={() => setEditBtnEmoji(em)}
                  style={{
                    fontSize: '28px', padding: '12px 0', borderRadius: '12px', lineHeight: 1, textAlign: 'center',
                    background: editBtnEmoji === em ? `${activeColor}22` : dt.headerBg,
                    borderWidth: editBtnEmoji === em ? '2px' : '1px',
                    borderStyle: 'solid',
                    borderColor: editBtnEmoji === em ? activeColor : 'transparent',
                  }}
                >{em}</button>
              ))}
            </div>
          </div>
        </div>

        {/* ── サブ画面：図鑑 ─────────────────────────────────────────── */}
        <div style={{
          position: 'absolute', inset: 0, background: dt.bg, zIndex: 20,
          transform: decorSubPage === 'zukan' ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '20px 16px 8px', flexShrink: 0, borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: dt.border }}>
            <button onClick={() => setDecorSubPage(null)} style={{ fontSize: '15px', color: activeColor, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', padding: 0 }}>
              <span style={{ fontSize: '18px', lineHeight: 1 }}>‹</span>
              <span>戻る</span>
            </button>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <DoorHall onEnterRoom={() => {}} />
          </div>
        </div>

      </div>

      </div>{/* ── end content area ── */}
      </div>{/* ── end arc tab + content wrapper ── */}

      {/* ── FAB ─────────────────────────────────────────────────── */}
      {activeIndex === 0 && (
        <button
          onClick={() => setEditMenuOpen(true)}
          className="flex items-center justify-center"
          style={{
            position: 'absolute', bottom: '68px', right: '20px',
            width: '48px', height: '48px', borderRadius: '50%',
            background: editBtnColor, color: 'white', fontSize: '22px',
            boxShadow: `0 4px 14px ${editBtnColor}88`, zIndex: 40,
          }}
        >{editBtnEmoji}</button>
      )}

      {/* ── Edit menu modal ───────────────────────────────────────── */}
      {editMenuOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: '390px',
        }} onClick={() => setEditMenuOpen(false)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '80%',
              background: dt.bg,
              borderRadius: '20px',
              padding: '20px 16px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <p style={{ fontSize: '15px', fontWeight: 700, color: dt.text, textAlign: 'center', marginBottom: '4px', margin: 0 }}>
              キャンバスを編集
            </p>

            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '11px', color: dt.subText, marginBottom: '6px', margin: '0 0 6px' }}>作品名</p>
              {isEditingTitle ? (
                <input
                  autoFocus
                  value={canvasTitle}
                  onChange={e => setCanvasTitle(e.target.value)}
                  onBlur={() => setIsEditingTitle(false)}
                  onKeyDown={e => e.key === 'Enter' && setIsEditingTitle(false)}
                  style={{
                    background: 'transparent',
                    borderTopWidth: '0', borderLeftWidth: '0', borderRightWidth: '0',
                    borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: activeColor,
                    color: dt.text, fontSize: '15px', fontWeight: 600,
                    textAlign: 'center', outline: 'none', width: '180px',
                  }}
                />
              ) : (
                <button onClick={() => setIsEditingTitle(true)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: dt.text, fontSize: '15px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  {canvasTitle} <span style={{ fontSize: '12px' }}>✏️</span>
                </button>
              )}
            </div>

            <div style={{ borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: dt.border }} />

            <button
              onClick={() => { setEditMenuOpen(false); setIsTitleEditOpen(true) }}
              style={{
                width: '100%', padding: '12px', borderRadius: '14px',
                background: `${activeColor}22`, color: activeColor,
                fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer',
              }}
            >✏️ タイトルを編集</button>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => { setEditMenuOpen(false); setTagPickerOpen(true) }}
                style={{
                  flex: 1, padding: '14px 0', borderRadius: '14px',
                  background: activeColor, color: '#fff',
                  fontSize: '13px', fontWeight: 700, border: 'none', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                  boxShadow: `0 4px 14px ${activeColor}55`,
                }}
              >
                <span style={{ fontSize: '20px' }}>🏷️</span>
                タグを選ぶ
              </button>
              <button
                onClick={() => { setEditMenuOpen(false); setEmojiPickerOpen(true) }}
                style={{
                  flex: 1, padding: '14px 0', borderRadius: '14px',
                  background: `${activeColor}22`, color: activeColor,
                  fontSize: '13px', fontWeight: 700, border: 'none', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                }}
              >
                <span style={{ fontSize: '20px' }}>✨</span>
                絵文字を選ぶ
              </button>
            </div>

            <button
              onClick={() => { setEditMenuOpen(false); setIsBgEditOpen(true) }}
              style={{
                width: '100%', padding: '12px', borderRadius: '14px',
                background: `${dt.border}44`, color: dt.text,
                fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer',
              }}
            >🖼️ 背景を変更</button>

            <button onClick={() => setEditMenuOpen(false)}
              style={{ background: 'none', border: 'none', color: dt.subText, fontSize: '13px', cursor: 'pointer', textAlign: 'center', paddingTop: '4px' }}>
              とじる
            </button>
          </div>
        </div>
      )}

      {isBgEditOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: '390px',
        }} onClick={() => setIsBgEditOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '88%',
            background: '#1e1b2e',
            borderRadius: '20px',
            padding: '20px 16px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            display: 'flex', flexDirection: 'column', gap: '14px',
          }}>
            <p style={{ fontSize: '15px', fontWeight: 700, color: '#fff', textAlign: 'center', margin: 0 }}>背景を変更</p>

            <div style={{
              height: '60px', borderRadius: '12px',
              background: bgMode === 'gradient'
                ? `linear-gradient(135deg, hsl(${bgHue},${bgSaturation}%,${bgLightness}%), hsl(${(bgHue + 60) % 360},${bgSaturation}%,${Math.max(bgLightness - 20, 10)}%))`
                : `hsl(${bgHue},${bgSaturation}%,${bgLightness}%)`,
            }} />

            <div style={{ display: 'flex', gap: '6px' }}>
              {(['solid', 'gradient'] as const).map(mode => (
                <button key={mode} onClick={() => setBgMode(mode)} style={{
                  flex: 1, padding: '7px 0', borderRadius: '12px', border: 'none', cursor: 'pointer',
                  background: bgMode === mode ? '#8b5cf6' : 'rgba(255,255,255,0.1)',
                  color: bgMode === mode ? '#fff' : 'rgba(255,255,255,0.5)',
                  fontSize: '12px', fontWeight: 600,
                }}>
                  {mode === 'solid' ? '単色' : 'グラデーション'}
                </button>
              ))}
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>色相</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>{bgHue}°</p>
              </div>
              <input type="range" min={0} max={360} value={bgHue}
                onChange={e => setBgHue(Number(e.target.value))}
                style={{ width: '100%', accentColor: `hsl(${bgHue},70%,60%)` }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>彩度</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>{bgSaturation}%</p>
              </div>
              <input type="range" min={0} max={100} value={bgSaturation}
                onChange={e => setBgSaturation(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#8b5cf6' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>明度</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>{bgLightness}%</p>
              </div>
              <input type="range" min={5} max={100} value={bgLightness}
                onChange={e => setBgLightness(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#8b5cf6' }}
              />
            </div>

            <div>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', margin: '0 0 8px' }}>プリセット</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { h: 0,   s: 0,  l: 100 },
                  { h: 270, s: 60, l: 95  },
                  { h: 220, s: 60, l: 95  },
                  { h: 30,  s: 60, l: 95  },
                  { h: 270, s: 60, l: 10  },
                  { h: 240, s: 40, l: 8   },
                ].map(({ h, s, l }, i) => (
                  <div key={i} onClick={() => { setBgHue(h); setBgSaturation(s); setBgLightness(l) }} style={{
                    width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer',
                    background: `hsl(${h},${s}%,${l}%)`,
                    boxShadow: bgHue === h && bgSaturation === s && bgLightness === l
                      ? '0 0 0 2px #8b5cf6' : '0 0 0 1px rgba(255,255,255,0.2)',
                  }} />
                ))}
              </div>
            </div>

            <button onClick={() => {
              const bg = bgMode === 'gradient'
                ? `linear-gradient(135deg, hsl(${bgHue},${bgSaturation}%,${bgLightness}%), hsl(${(bgHue + 60) % 360},${bgSaturation}%,${Math.max(bgLightness - 20, 10)}%))`
                : `hsl(${bgHue},${bgSaturation}%,${bgLightness}%)`
              setCanvasBg(bg)
              setIsBgEditOpen(false)
            }} style={{
              width: '100%', padding: '13px', borderRadius: '24px',
              background: '#8b5cf6', color: '#fff', fontSize: '15px', fontWeight: 700,
              border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(139,92,246,0.5)',
            }}>この背景を適用する</button>
          </div>
        </div>
      )}

      {isTitleEditOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: '390px',
        }} onClick={() => setIsTitleEditOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '85%',
            background: '#1e1b2e',
            borderRadius: '20px',
            padding: '20px 16px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            display: 'flex', flexDirection: 'column', gap: '16px',
          }}>
            <p style={{ fontSize: '15px', fontWeight: 700, color: dt.text, textAlign: 'center', margin: 0 }}>タイトルを編集</p>

            <div style={{ textAlign: 'center', padding: '8px', background: `${dt.border}33`, borderRadius: '10px' }}>
              <span style={{ fontSize: `${titleFontSize}px`, color: titleColor, fontFamily: titleFont === 'serif' ? 'serif' : titleFont === 'mono' ? 'monospace' : 'sans-serif', fontWeight: 600 }}>
                {canvasTitle || '無題'}
              </span>
            </div>

            <div>
              <p style={{ fontSize: '11px', color: dt.subText, marginBottom: '6px', margin: '0 0 6px' }}>タイトル</p>
              <input
                value={canvasTitle}
                onChange={e => setCanvasTitle(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '10px',
                  background: dt.bg, color: dt.text, fontSize: '14px',
                  borderWidth: '1px', borderStyle: 'solid', borderColor: dt.border,
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <p style={{ fontSize: '11px', color: dt.subText, marginBottom: '8px', margin: '0 0 8px' }}>文字色</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['#ffffff', '#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#000000', '#94a3b8'].map(c => (
                  <div key={c} onClick={() => setTitleColor(c)} style={{
                    width: '26px', height: '26px', borderRadius: '50%', background: c, cursor: 'pointer',
                    boxShadow: titleColor === c ? `0 0 0 2px ${activeColor}` : `0 0 0 1px ${dt.border}`,
                  }} />
                ))}
              </div>
            </div>

            <div>
              <p style={{ fontSize: '11px', color: dt.subText, marginBottom: '8px', margin: '0 0 8px' }}>大きさ</p>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[{ label: 'XS', val: 10 }, { label: 'S', val: 12 }, { label: 'M', val: 14 }, { label: 'L', val: 18 }, { label: 'XL', val: 24 }].map(({ label, val }) => (
                  <button key={val} onClick={() => setTitleFontSize(val)} style={{
                    flex: 1, padding: '6px 0', borderRadius: '10px', border: 'none', cursor: 'pointer',
                    background: titleFontSize === val ? activeColor : `${dt.border}66`,
                    color: titleFontSize === val ? '#fff' : dt.subText,
                    fontSize: '12px', fontWeight: 600,
                  }}>{label}</button>
                ))}
              </div>
            </div>

            <div>
              <p style={{ fontSize: '11px', color: dt.subText, marginBottom: '8px', margin: '0 0 8px' }}>フォント</p>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[{ label: 'ゴシック', val: 'default' }, { label: '明朝', val: 'serif' }, { label: '等幅', val: 'mono' }].map(({ label, val }) => (
                  <button key={val} onClick={() => setTitleFont(val)} style={{
                    flex: 1, padding: '8px 0', borderRadius: '10px', border: 'none', cursor: 'pointer',
                    background: titleFont === val ? activeColor : `${dt.border}66`,
                    color: titleFont === val ? '#fff' : dt.subText,
                    fontSize: '12px',
                  }}>{label}</button>
                ))}
              </div>
            </div>

            <button onClick={() => setIsTitleEditOpen(false)} style={{
              width: '100%', padding: '13px', borderRadius: '24px',
              background: activeColor, color: '#fff', fontSize: '15px', fontWeight: 700,
              border: 'none', cursor: 'pointer',
              boxShadow: `0 4px 14px ${activeColor}55`,
            }}>完了</button>
          </div>
        </div>
      )}

      {tagPickerOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: '390px',
        }}>
          <div style={{
            width: '85%', maxHeight: '70vh',
            background: 'rgba(15,14,26,0.97)', backdropFilter: 'blur(18px)',
            borderRadius: '20px',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}>
            <div style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <p style={{ fontSize: '15px', fontWeight: 700, color: 'rgba(255,255,255,0.90)', margin: 0 }}>タグを選ぶ</p>
              <button onClick={() => { setTagPickerOpen(false); setTagSearch(''); setTagFilter('すべて'); setSelectedTag(null) }}
                style={{ color: 'rgba(255,255,255,0.45)', fontSize: '20px', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: '0 16px 8px', flexShrink: 0 }}>
              <input
                type="text"
                placeholder="タグを検索..."
                value={tagSearch}
                onChange={e => setTagSearch(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.90)', fontSize: '14px',
                  borderWidth: '1px', borderStyle: 'solid', borderColor: 'rgba(255,255,255,0.12)',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '4px', padding: '0 16px 8px', overflowX: 'auto', flexShrink: 0, scrollbarWidth: 'none' }}>
              {['すべて', 'あ', 'か', 'さ', 'た', 'な', 'は', 'ま', 'や', 'ら', 'わ', 'A-Z'].map(row => (
                <button
                  key={row}
                  onClick={() => setTagFilter(row)}
                  style={{
                    padding: '4px 8px', borderRadius: '12px', flexShrink: 0,
                    background: tagFilter === row ? activeColor : 'rgba(255,255,255,0.10)',
                    color: tagFilter === row ? '#fff' : 'rgba(255,255,255,0.45)',
                    fontSize: '11px', border: 'none', cursor: 'pointer',
                  }}
                >{row}</button>
              ))}
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {(() => {
                const ALL_TAGS = [
                  '#内向型', '#インドア', '#映画', '#音楽好き',
                  '#夜型', '#夜型リズム', '#ゲーマー', '#コーヒー',
                  '#猫派', '#読書', '#旅行', '#アート',
                  '#ひとり時間', '#HSP', '#充電中', '#深夜作業',
                  '#朝型羨ましい', '#音楽', '#はじめまして', '#ほっと一息',
                  '#まったり', '#のんびり', '#ふわふわ',
                ]
                const TAG_READINGS: Record<string, string> = {
                  '#内向型':      'ないこうがた',
                  '#映画':        'えいが',
                  '#音楽':        'おんがく',
                  '#音楽好き':    'おんがくずき',
                  '#猫派':        'ねこは',
                  '#読書':        'どくしょ',
                  '#旅行':        'りょこう',
                  '#充電中':      'じゅうでんちゅう',
                  '#深夜作業':    'しんやさぎょう',
                  '#朝型羨ましい':'あさがたうらやましい',
                  '#夜型':        'よるがた',
                  '#夜型リズム':  'よるがたりずむ',
                  '#インドア':    'いんどあ',
                  '#ひとり時間':  'ひとりじかん',
                  '#まったり':    'まったり',
                  '#のんびり':    'のんびり',
                  '#ふわふわ':    'ふわふわ',
                  '#はじめまして':'はじめまして',
                  '#ほっと一息':  'ほっとひといき',
                  '#ゲーマー':    'げーまー',
                  '#アート':      'あーと',
                  '#コーヒー':    'こーひー',
                  '#HSP':         'えいちえすぴー',
                  '#MBTI':        'MBTI',
                  '#BGM':         'BGM',
                }
                const getReading = (tag: string) => TAG_READINGS[tag] ?? tag.replace('#', '')
                const ROW_START: Record<string, string> = {
                  'あ': 'あいうえお',
                  'か': 'かきくけこがぎぐげご',
                  'さ': 'さしすせそざじずぜぞ',
                  'た': 'たちつてとだぢづでど',
                  'な': 'なにぬねの',
                  'は': 'はひふへほばびぶべぼぱぴぷぺぽ',
                  'ま': 'まみむめも',
                  'や': 'やゆよ',
                  'ら': 'らりるれろ',
                  'わ': 'わをん',
                }
                let filtered = ALL_TAGS
                if (tagSearch) {
                  filtered = filtered.filter(tag =>
                    tag.includes(tagSearch) || getReading(tag).includes(tagSearch)
                  )
                } else if (tagFilter === 'A-Z') {
                  filtered = filtered.filter(tag => /^[A-Za-z]/.test(getReading(tag)[0]))
                  filtered = [...filtered].sort((a, b) =>
                    getReading(a).localeCompare(getReading(b), 'en', { sensitivity: 'base' })
                  )
                } else if (tagFilter !== 'すべて') {
                  const validChars = ROW_START[tagFilter] ?? ''
                  filtered = filtered.filter(tag => validChars.includes(getReading(tag)[0]))
                  filtered = [...filtered].sort((a, b) => getReading(a).localeCompare(getReading(b), 'ja'))
                } else {
                  filtered = [...filtered].sort((a, b) => getReading(a).localeCompare(getReading(b), 'ja'))
                }
                return (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {filtered.map(tag => (
                      <button
                        key={tag}
                        onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                        style={{
                          width: '100%', textAlign: 'left',
                          padding: '13px 16px',
                          background: tag === selectedTag ? `${activeColor}33` : 'transparent',
                          color: tag === selectedTag ? activeColor : 'rgba(255,255,255,0.90)',
                          fontSize: '14px', fontWeight: tag === selectedTag ? 700 : 400,
                          border: 'none', cursor: 'pointer',
                          borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: 'rgba(255,255,255,0.08)',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}
                      >
                        <span>{tag}</span>
                        {tag === selectedTag && <span style={{ fontSize: '13px' }}>✓</span>}
                      </button>
                    ))}
                    {filtered.length === 0 && (
                      <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', padding: '20px 16px', textAlign: 'center', margin: 0 }}>タグが見つかりません</p>
                    )}
                  </div>
                )
              })()}
            </div>
            <div style={{ flexShrink: 0, borderTopWidth: '1px', borderTopStyle: 'solid', borderTopColor: dt.border, padding: '12px 16px', background: dt.headerBg }}>
              {selectedTag ? (
                <button
                  onClick={() => {
                    const id = `tag-${Date.now()}`
                    const ci = activeCanvasRef.current
                    setCanvases(prev => prev.map((c, i) =>
                      i === ci ? { ...c, items: [...c.items, { id, kind: 'tag' as const, content: selectedTag, x: 25 + Math.random() * 50, y: 25 + Math.random() * 50, size: 13, rotation: 0, color: activeColor }] } : c
                    ))
                    setSelectedItemId(id)
                    setTagPickerOpen(false)
                    setSelectedTag(null)
                    setTagSearch('')
                    setTagFilter('すべて')
                  }}
                  style={{
                    width: '100%', padding: '13px', borderRadius: '24px',
                    background: activeColor, color: '#fff', fontSize: '15px', fontWeight: 700,
                    border: 'none', cursor: 'pointer',
                    boxShadow: `0 4px 14px ${activeColor}55`,
                  }}
                >「{selectedTag}」を挿入する</button>
              ) : (
                <p style={{ color: dt.subText, fontSize: '13px', textAlign: 'center', padding: '8px 0', margin: 0 }}>タグを選んでください</p>
              )}
            </div>
          </div>
        </div>
      )}

      {emojiPickerOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: '390px',
        }}>
          <div style={{
            width: '85%', maxHeight: '70vh',
            background: 'rgba(15,14,26,0.97)', backdropFilter: 'blur(18px)',
            borderRadius: '20px',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}>
            <div style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <p style={{ fontSize: '15px', fontWeight: 700, color: 'rgba(255,255,255,0.90)', margin: 0 }}>絵文字を選ぶ</p>
              <button onClick={() => { setEmojiPickerOpen(false); setSelectedEmoji(null) }} style={{ color: 'rgba(255,255,255,0.45)', fontSize: '20px', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                {EMOJI_STAMPS.map(em => (
                  <button
                    key={em}
                    onClick={() => setSelectedEmoji(em === selectedEmoji ? null : em)}
                    style={{
                      fontSize: '24px',
                      background: selectedEmoji === em ? `${activeColor}33` : 'none',
                      border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '8px',
                      outline: selectedEmoji === em ? `2px solid ${activeColor}` : 'none',
                    }}
                  >{em}</button>
                ))}
              </div>
            </div>
            <div style={{ flexShrink: 0, borderTopWidth: '1px', borderTopStyle: 'solid', borderTopColor: dt.border, padding: '12px 16px', background: dt.headerBg }}>
              {selectedEmoji ? (
                <button
                  onClick={() => {
                    const id = `emoji-${Date.now()}`
                    const ci = activeCanvasRef.current
                    setCanvases(prev => prev.map((c, i) =>
                      i === ci ? { ...c, items: [...c.items, { id, kind: 'emoji' as const, content: selectedEmoji, x: 25 + Math.random() * 50, y: 25 + Math.random() * 50, size: 22, rotation: 0, color: activeColor }] } : c
                    ))
                    setSelectedItemId(id)
                    setEmojiPickerOpen(false)
                    setSelectedEmoji(null)
                  }}
                  style={{
                    width: '100%', padding: '13px', borderRadius: '24px',
                    background: activeColor, color: '#fff', fontSize: '15px', fontWeight: 700,
                    border: 'none', cursor: 'pointer',
                    boxShadow: `0 4px 14px ${activeColor}55`,
                  }}
                >{selectedEmoji} を挿入する</button>
              ) : (
                <p style={{ color: dt.subText, fontSize: '13px', textAlign: 'center', padding: '8px 0', margin: 0 }}>絵文字を選んでください</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Profile sub-pages (always in DOM, slide in/out) ─────── */}
      {(['profile-edit', 'tag-list', 'connections'] as const).map(page => (
        <div
          key={page}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 60,
            background: '#0f0e1a',
            transform: `translateX(${subPage === page ? '0%' : '100%'})`,
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {page === 'profile-edit' && (
            <SubPageWrapper
              title="プロフィール編集"
              onBack={() => setSubPage(null)}
              rightAction={
                <button onClick={saveProfileAndClose} style={{ fontSize: '14px', color: '#a78bfa', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>保存</button>
              }
            >
              <div style={{ overflowY: 'auto', flex: 1, padding: '16px', scrollbarWidth: 'none' }}>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginBottom: '8px', letterSpacing: '0.8px' }}>ヘッダー</div>
                  <div style={{ height: '72px', borderRadius: '12px', background: profileHeaderGradient, marginBottom: '10px' }} />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {HEADER_PRESETS.map(g => (
                      <button key={g} onClick={() => setProfileHeaderGradient(g)} style={{
                        width: '36px', height: '36px', borderRadius: '8px', background: g, flexShrink: 0,
                        border: profileHeaderGradient === g ? '2px solid white' : '2px solid transparent',
                        boxShadow: profileHeaderGradient === g ? '0 0 0 2px #a78bfa' : 'none',
                      }} />
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
                  <ProfileAvatar config={avatarConfig} />
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginBottom: '6px', letterSpacing: '0.8px' }}>表示名</div>
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)} style={INPUT_STYLE} placeholder="表示名を入力" />
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginBottom: '6px', letterSpacing: '0.8px' }}>ユーザーID</div>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.45)', fontSize: '14px' }}>@</span>
                    <input type="text" value={editId} onChange={e => setEditId(e.target.value)} style={{ ...INPUT_STYLE, paddingLeft: '26px' }} placeholder="user_id" />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginBottom: '6px', letterSpacing: '0.8px' }}>自己紹介</div>
                  <textarea value={editBio} onChange={e => setEditBio(e.target.value)} rows={3} style={{ ...INPUT_STYLE, resize: 'none', lineHeight: 1.6 }} placeholder="自己紹介を入力" />
                </div>
                <div style={{ marginTop: '20px' }}>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginBottom: '8px', letterSpacing: '0.8px' }}>性別（任意）</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {(['未設定', '男性', '女性'] as const).map(g => (
                      <button
                        key={g}
                        onClick={() => setEditGender(g)}
                        style={{
                          padding: '8px 16px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer',
                          background: editGender === g ? '#a78bfa' : 'rgba(255,255,255,0.08)',
                          color: editGender === g ? 'white' : 'rgba(255,255,255,0.55)',
                          border: `1px solid ${editGender === g ? '#a78bfa' : 'rgba(255,255,255,0.15)'}`,
                          transition: 'all 0.15s',
                        }}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </SubPageWrapper>
          )}

          {page === 'tag-list' && (
            <SubPageWrapper title="フォロー中のタグ" onBack={() => setSubPage(null)}>
              <div style={{ overflowY: 'auto', flex: 1, padding: '14px 16px 80px', scrollbarWidth: 'none' }}>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', marginBottom: '14px' }}>
                  {identityTags.length}件のタグをフォロー中
                </div>
                {identityTags.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: '13px', paddingTop: '24px' }}>
                    フォロー中のタグはありません
                  </div>
                ) : (
                  identityTags.map(tag => (
                    <div key={tag} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ fontSize: '13px', padding: '4px 12px', borderRadius: '14px', background: 'rgba(167,139,250,0.14)', color: '#c4b5fd', border: '1px solid rgba(167,139,250,0.26)' }}>{tag}</span>
                      <button onClick={() => setIdentityTags(prev => prev.filter(t => t !== tag))} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '10px', background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.12)' }}>フォロー解除</button>
                    </div>
                  ))
                )}
              </div>
              <div style={{ flexShrink: 0, padding: '12px 16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <button onClick={() => { setSubPage(null); setView('explore') }} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: 'none', fontSize: '14px', fontWeight: 600, background: 'rgba(167,139,250,0.15)', color: '#c4b5fd', cursor: 'pointer' }}>🔍 タグを探す</button>
              </div>
            </SubPageWrapper>
          )}

          {page === 'connections' && (
            <SubPageWrapper title="つながり" onBack={() => setSubPage(null)}>
              <div style={{ overflowY: 'auto', flex: 1, padding: '14px 16px', scrollbarWidth: 'none' }}>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', marginBottom: '14px' }}>
                  共通タグで出会ったつながり
                </div>
                {DUMMY_CONNECTIONS.map(({ name, seed, commonTags }) => (
                  <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <ConnectionAvatar seed={seed} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'white', marginBottom: '4px' }}>{name}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {commonTags.map(tag => (
                          <span key={tag} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: 'rgba(167,139,250,0.14)', color: '#c4b5fd', border: '1px solid rgba(167,139,250,0.26)' }}>{tag}</span>
                        ))}
                      </div>
                    </div>
                    <button style={{ flexShrink: 0, fontSize: '12px', padding: '6px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.60)', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer' }}>見る</button>
                  </div>
                ))}
              </div>
            </SubPageWrapper>
          )}
        </div>
      ))}

      {/* ── Avatar editor bottom sheet ───────────────────────────── */}
      {isAvatarEditorOpen && (
        <div onClick={e => e.stopPropagation()} style={{
          position: 'fixed', bottom: '64px', left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: '390px', zIndex: 50,
          background: '#1a1a2e',
          borderTopLeftRadius: '24px', borderTopRightRadius: '24px',
          borderTop: '1px solid rgba(167,139,250,0.18)',
          maxHeight: '75vh', display: 'flex', flexDirection: 'column',
          paddingBottom: '70px',
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
              <AvatarPreview config={editingConfig} size={109} pose="stand" clothing={{ top: clothingTop, bottom: clothingBottom, shoes: clothingShoes, outer: clothingOuter, topColor: clothingTopColor, bottomColor: clothingBottomColor, shoesColor: clothingShoesColor, outerColor: clothingOuterColor }} />
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
                {gender !== '未設定' ? (
                  <>
                    <SectionLabel>{gender === '男性' ? '男性向け' : '女性向け'}</SectionLabel>
                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '4px' }}>
                      {(gender === '男性' ? HAIR_MALE : HAIR_FEMALE).map(hair => {
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
                ) : (
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
                <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
                  {(['outer', 'top', 'bottom', 'shoes'] as const).map(tab => (
                    <button key={tab} onClick={() => setClothingSubTab(tab)} style={{
                      flex: 1, padding: '5px 0', borderRadius: '12px', border: 'none', cursor: 'pointer',
                      background: clothingSubTab === tab ? '#a78bfa' : 'rgba(255,255,255,0.12)',
                      color: clothingSubTab === tab ? '#fff' : 'rgba(255,255,255,0.45)',
                      fontSize: '11px', fontWeight: 600,
                    }}>
                      {tab === 'outer' ? '🧥 アウター' : tab === 'top' ? '👕 トップス' : tab === 'bottom' ? '👖 ボトムス' : '👟 靴'}
                    </button>
                  ))}
                </div>

                {clothingSubTab === 'outer' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px' }}>
                      {OUTER_STYLES.map(({ val, label, svg }) => (
                        <div key={String(val)} onClick={() => setClothingOuter(val)} style={{
                          padding: '10px 6px 6px',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                          minHeight: '64px', justifyContent: 'center',
                          background: clothingOuter === val ? 'rgba(167,139,250,0.13)' : 'rgba(255,255,255,0.07)',
                          boxShadow: clothingOuter === val ? '0 0 0 2px #a78bfa' : 'none',
                          color: clothingOuter === val ? '#a78bfa' : 'rgba(255,255,255,0.45)',
                        }}>
                          {svg ?? <span style={{ fontSize: '22px' }}>✕</span>}
                          <span style={{ fontSize: '10px', fontWeight: clothingOuter === val ? 700 : 400 }}>{label}</span>
                        </div>
                      ))}
                    </div>
                    {clothingOuter !== null && (
                      <>
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', margin: '0 0 8px' }}>色</p>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {['#374151','#1a1a2e','#4b5563','#1e3a5f','#7c3aed','#92400e','#dc2626','#ffffff','#d1d5db'].map(c => (
                            <div key={c} onClick={() => setClothingOuterColor(c)} style={{
                              width: '30px', height: '30px', borderRadius: '50%', background: c, cursor: 'pointer',
                              boxShadow: clothingOuterColor === c ? '0 0 0 2px #a78bfa' : '0 0 0 1px rgba(255,255,255,0.12)',
                            }} />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}

                {clothingSubTab === 'top' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px' }}>
                      {TOP_STYLES.map(({ val, label, svg }) => (
                        <div key={val} onClick={() => setClothingTop(val)} style={{
                          padding: '10px 6px 6px',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                          background: clothingTop === val ? 'rgba(167,139,250,0.13)' : 'rgba(255,255,255,0.07)',
                          boxShadow: clothingTop === val ? '0 0 0 2px #a78bfa' : 'none',
                          color: clothingTop === val ? '#a78bfa' : 'rgba(255,255,255,0.45)',
                        }}>
                          {svg}
                          <span style={{ fontSize: '10px', fontWeight: clothingTop === val ? 700 : 400 }}>{label}</span>
                        </div>
                      ))}
                    </div>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', margin: '0 0 8px' }}>色</p>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {['#8b5cf6','#ec4899','#3b82f6','#10b981','#f59e0b','#ef4444','#1a1a2e','#ffffff','#374151'].map(c => (
                        <div key={c} onClick={() => setClothingTopColor(c)} style={{
                          width: '30px', height: '30px', borderRadius: '50%', background: c, cursor: 'pointer',
                          boxShadow: clothingTopColor === c ? '0 0 0 2px #a78bfa' : '0 0 0 1px rgba(255,255,255,0.12)',
                        }} />
                      ))}
                    </div>
                  </>
                )}

                {clothingSubTab === 'bottom' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px' }}>
                      {BOTTOM_STYLES.map(({ val, label, svg }) => (
                        <div key={val} onClick={() => setClothingBottom(val)} style={{
                          padding: '10px 6px 6px',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                          background: clothingBottom === val ? 'rgba(167,139,250,0.13)' : 'rgba(255,255,255,0.07)',
                          boxShadow: clothingBottom === val ? '0 0 0 2px #a78bfa' : 'none',
                          color: clothingBottom === val ? '#a78bfa' : 'rgba(255,255,255,0.45)',
                        }}>
                          {svg}
                          <span style={{ fontSize: '10px', fontWeight: clothingBottom === val ? 700 : 400 }}>{label}</span>
                        </div>
                      ))}
                    </div>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', margin: '0 0 8px' }}>色</p>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {['#1e3a5f','#374151','#1a1a2e','#7c3aed','#dc2626','#059669','#ffffff','#92400e','#4b5563'].map(c => (
                        <div key={c} onClick={() => setClothingBottomColor(c)} style={{
                          width: '30px', height: '30px', borderRadius: '50%', background: c, cursor: 'pointer',
                          boxShadow: clothingBottomColor === c ? '0 0 0 2px #a78bfa' : '0 0 0 1px rgba(255,255,255,0.12)',
                        }} />
                      ))}
                    </div>
                  </>
                )}

                {clothingSubTab === 'shoes' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px' }}>
                      {SHOES_STYLES.map(({ val, label, svg }) => (
                        <div key={val} onClick={() => setClothingShoes(val)} style={{
                          padding: '10px 6px 6px',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                          background: clothingShoes === val ? 'rgba(167,139,250,0.13)' : 'rgba(255,255,255,0.07)',
                          boxShadow: clothingShoes === val ? '0 0 0 2px #a78bfa' : 'none',
                          color: clothingShoes === val ? '#a78bfa' : 'rgba(255,255,255,0.45)',
                        }}>
                          {svg}
                          <span style={{ fontSize: '10px', fontWeight: clothingShoes === val ? 700 : 400 }}>{label}</span>
                        </div>
                      ))}
                    </div>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', margin: '0 0 8px' }}>色</p>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {['#ffffff','#1a1a2e','#92400e','#dc2626','#1e3a5f','#374151','#f59e0b','#ec4899','#6b7280'].map(c => (
                        <div key={c} onClick={() => setClothingShoesColor(c)} style={{
                          width: '30px', height: '30px', borderRadius: '50%', background: c, cursor: 'pointer',
                          boxShadow: clothingShoesColor === c ? '0 0 0 2px #a78bfa' : '0 0 0 1px rgba(255,255,255,0.12)',
                        }} />
                      ))}
                    </div>
                  </>
                )}
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

            {editorTab === 'pose' && (
              <div style={{ padding: '8px 0' }}>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginBottom: '10px', margin: '0 0 10px' }}>ポーズを選ぶ</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {[
                    { val: 'normal',   label: '通常'   },
                    { val: 'arms_up',  label: '両手'   },
                    { val: 'one_hand', label: '片手'   },
                    { val: 'lean',     label: '寄り'   },
                    { val: 'cross',    label: '腕組み' },
                    { val: 'peace',    label: 'ピース' },
                    { val: 'sit',      label: '座る'   },
                    { val: 'jump',     label: 'ジャンプ' },
                  ].map(({ val, label }) => (
                    <div key={val}
                      onClick={() => {}}
                      style={{
                        padding: '10px 4px 6px',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        textAlign: 'center',
                        background: 'rgba(255,255,255,0.06)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                      }}
                    >
                      <span style={{ fontSize: '28px' }}>🧍</span>
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)' }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {editorTab === 'fashion' && (
              <div style={{ padding: '8px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.82)', margin: 0 }}>マイコーデ</p>
                  <button
                    onClick={() => {
                      const newOutfit = {
                        id: Date.now(),
                        name: `コーデ${savedOutfits.length + 1}`,
                        top: clothingTop, topColor: clothingTopColor,
                        bottom: clothingBottom, bottomColor: clothingBottomColor,
                        shoes: clothingShoes, shoesColor: clothingShoesColor,
                        outer: clothingOuter,
                      }
                      setSavedOutfits(prev => [...prev, newOutfit])
                    }}
                    style={{
                      padding: '5px 12px', borderRadius: '14px',
                      background: '#a78bfa', color: '#fff',
                      fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer',
                    }}
                  >
                    ＋ 今のコーデを保存
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {savedOutfits.map(outfit => (
                    <div key={outfit.id}
                      onClick={() => {
                        setClothingTop(outfit.top)
                        setClothingTopColor(outfit.topColor)
                        setClothingBottom(outfit.bottom)
                        setClothingBottomColor(outfit.bottomColor)
                        setClothingShoes(outfit.shoes)
                        setClothingShoesColor(outfit.shoesColor)
                        setClothingOuter(outfit.outer)
                        setSelectedOutfitId(outfit.id)
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '10px 12px', borderRadius: '12px', cursor: 'pointer',
                        background: selectedOutfitId === outfit.id ? 'rgba(167,139,250,0.13)' : 'rgba(255,255,255,0.06)',
                        boxShadow: selectedOutfitId === outfit.id ? '0 0 0 1.5px #a78bfa' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: outfit.topColor }} />
                        <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: outfit.bottomColor }} />
                        <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: outfit.shoesColor }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.82)', margin: 0 }}>{outfit.name}</p>
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '2px', margin: '2px 0 0' }}>
                          {outfit.top} / {outfit.bottom} / {outfit.shoes}{outfit.outer ? ` / ${outfit.outer}` : ''}
                        </p>
                      </div>
                      {selectedOutfitId === outfit.id && (
                        <span style={{ color: '#a78bfa', fontSize: '16px' }}>✓</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
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

const DUMMY_CONNECTIONS = [
  { name: 'ゆき', seed: 'yuki-user',  commonTags: ['#音楽', '#夜型'] },
  { name: 'はる', seed: 'haru-user',  commonTags: ['#読書'] },
  { name: 'そら', seed: 'sora-user',  commonTags: ['#映画', '#インドア', '#アート'] },
  { name: 'れん', seed: 'ren-user',   commonTags: ['#猫派'] },
  { name: 'みお', seed: 'mio-user',   commonTags: ['#音楽', '#インドア', '#コーヒー'] },
]

const HEADER_PRESETS = [
  'linear-gradient(155deg, #7c3aed 0%, #ec4899 100%)',
  'linear-gradient(155deg, #0ea5e9 0%, #ffd080 100%)',
  'linear-gradient(155deg, #1e1b4b 0%, #4c1d95 100%)',
  'linear-gradient(155deg, #ea580c 0%, #9333ea 100%)',
  'linear-gradient(155deg, #10b981 0%, #3b82f6 100%)',
  'linear-gradient(155deg, #f43f5e 0%, #f97316 100%)',
]

const INPUT_STYLE: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.10)', color: 'white',
  borderRadius: '16px', padding: '8px 12px', border: '1px solid rgba(255,255,255,0.12)',
  fontSize: '14px', outline: 'none', boxSizing: 'border-box',
}

function SubPageWrapper({ children, title, onBack, rightAction }: {
  children: React.ReactNode
  title: string
  onBack: () => void
  rightAction?: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ height: 56, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 16px', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', color: 'rgba(255,255,255,0.7)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', flexShrink: 0, minWidth: 60 }}>← 戻る</button>
        <span style={{ flex: 1, textAlign: 'center', fontSize: '16px', fontWeight: 700, color: 'white' }}>{title}</span>
        <div style={{ minWidth: 60, display: 'flex', justifyContent: 'flex-end' }}>{rightAction}</div>
      </div>
      {children}
    </div>
  )
}

function ConnectionAvatar({ seed }: { seed: string }) {
  const [svgString, setSvgString] = useState('')
  useEffect(() => {
    setSvgString(createAvatar(adventurer, { seed, backgroundColor: ['b6e3f4'] }).toString().replace('<svg ', '<svg width="100%" '))
  }, [seed])
  return (
    <div
      style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: '#b6e3f4', border: '2px solid rgba(255,255,255,0.18)' }}
      dangerouslySetInnerHTML={{ __html: svgString }}
    />
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.45)', marginBottom: '10px', letterSpacing: '0.4px' }}>
      {children}
    </div>
  )
}

// Composite avatar: DiceBear face overlaid on hand-drawn SVG body
function AvatarComposite({
  config, size, pose, svgString, clothing,
}: {
  config: AvatarConfig
  size: number
  pose: Pose
  svgString: string
  clothing?: ClothingStyle
}) {
  return (
    <div style={{ width: size, height: Math.round(size * 220 / 120), position: 'relative', flexShrink: 0 }}>
      <svg
        viewBox="0 0 120 220"
        fill="none"
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      >
        {renderBody(pose, config, clothing)}
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
function AvatarPreview({ config, size = 80, pose = 'stand', clothing }: { config: AvatarConfig; size?: number; pose?: Pose; clothing?: ClothingStyle }) {
  return <AvatarComposite config={config} size={size} pose={pose} svgString={createAvatarSvg(config)} clothing={clothing} />
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
