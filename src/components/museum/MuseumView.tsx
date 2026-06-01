'use client'

import { useState, useEffect, useRef, memo } from 'react'
import { SkyLayer } from '@/components/room/SkyLayer'
import { DoorHall } from '@/components/world/DoorHall'
import { useWorldStore } from '@/store/useWorldStore'
import { useProfileStore } from '@/store/useProfileStore'
import type { Gender } from '@/store/useProfileStore'

// ── Types ─────────────────────────────────────────────────────────────────────

type Period    = 'morning' | 'afternoon' | 'evening' | 'night'
type MuseumTab = 'museum' | 'profile'
type Pose = string
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
  rpmUrl?:             string   // AI-generated avatar image URL
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

type CanvasData     = { id: number; items: Item[]; title?: string }
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
const PERIOD_TAG_COLORS: Record<Period, { bg: string; text: string; border: string }> = {
  morning:   { bg: 'rgba(14,165,233,0.18)',  text: '#38bdf8', border: 'rgba(14,165,233,0.35)'  },
  afternoon: { bg: 'rgba(37,99,235,0.18)',   text: '#60a5fa', border: 'rgba(37,99,235,0.35)'   },
  evening:   { bg: 'rgba(234,88,12,0.18)',   text: '#fb923c', border: 'rgba(234,88,12,0.35)'   },
  night:     { bg: 'rgba(167,139,250,0.18)', text: '#a78bfa', border: 'rgba(167,139,250,0.35)' },
}

const TAB_THEME: Record<Period, {
  activeBg: string; activeText: string;
  inactiveBg: string; inactiveText: string;
  border: string; containerBg: string;
}> = {
  morning: {
    activeBg:     'rgba(255,255,255,0.92)',
    activeText:   '#0369a1',
    inactiveBg:   'rgba(255,255,255,0.18)',
    inactiveText: 'rgba(255,255,255,0.72)',
    border:       'rgba(255,255,255,0.22)',
    containerBg:  'rgba(14,165,233,0.22)',
  },
  afternoon: {
    activeBg:     'rgba(255,255,255,0.92)',
    activeText:   '#1d4ed8',
    inactiveBg:   'rgba(255,255,255,0.18)',
    inactiveText: 'rgba(255,255,255,0.72)',
    border:       'rgba(255,255,255,0.22)',
    containerBg:  'rgba(37,99,235,0.22)',
  },
  evening: {
    activeBg:     'rgba(255,255,255,0.92)',
    activeText:   '#c2410c',
    inactiveBg:   'rgba(255,255,255,0.18)',
    inactiveText: 'rgba(255,255,255,0.72)',
    border:       'rgba(255,255,255,0.22)',
    containerBg:  'rgba(234,88,12,0.22)',
  },
  night: {
    activeBg:     'rgba(167,139,250,0.92)',
    activeText:   '#1e1b4b',
    inactiveBg:   'rgba(255,255,255,0.10)',
    inactiveText: 'rgba(255,255,255,0.55)',
    border:       'rgba(167,139,250,0.25)',
    containerBg:  'rgba(109,40,217,0.22)',
  },
}

const TAB_ACTIVE_COLOR: Record<Period, string> = {
  morning: '#0284c7', afternoon: '#2563eb', evening: '#ea580c', night: '#a78bfa',
}

const BG_COLOR: Record<Period, string> = {
  morning: '#e0f2fe', afternoon: '#dbeafe', evening: '#ffedd5', night: '#07060f',
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_CHAT_CUSTOMIZE = {
  bgColor: '#0f0f1a', myBubbleColor: '#7c3aed', otherBubbleColor: '#1e1e3a',
  myTextColor: '#ffffff', otherTextColor: '#ffffff',
}
const DEFAULT_APPEARANCE_CUSTOMIZE = {
  tabBgColor: '#0f0f1a', tabTextColor: '#ffffff', tabActiveColor: '#7c3aed',
}
const DEFAULT_NAVI_CUSTOMIZE = {
  bgColor: '#1a1a2e', textColor: '#ffffff', activeColor: '#7c3aed',
}
const DEFAULT_PERIOD_CHAT_COLORS_CONST = {
  bg:          { morning: '#1a2a4a', afternoon: '#2a3a5a', evening: '#1a1a3a', night: '#0f0f1a' },
  myBubble:    { morning: '#2563eb', afternoon: '#7c3aed', evening: '#6d28d9', night: '#4c1d95' },
  otherBubble: { morning: '#1e3a5f', afternoon: '#1e1e3a', evening: '#1a1a2e', night: '#0d0d1f' },
  myText:      { morning: '#ffffff', afternoon: '#ffffff', evening: '#ffffff', night: '#ffffff' },
  otherText:   { morning: '#ffffff', afternoon: '#ffffff', evening: '#ffffff', night: '#ffffff' },
}
const DEFAULT_CHAT_HUE = { bg: 240, myBubble: 270, otherBubble: 220, myText: 0, otherText: 0 }
const DEFAULT_CHAT_LIGHTNESS = { bg: 10, myBubble: 50, otherBubble: 15, myText: 100, otherText: 100 }
const DEFAULT_PERIOD_CHAT_HUE = {
  bg:          { morning: 220, afternoon: 200, evening: 250, night: 240 },
  myBubble:    { morning: 210, afternoon: 270, evening: 260, night: 270 },
  otherBubble: { morning: 215, afternoon: 225, evening: 235, night: 240 },
  myText:      { morning: 0,   afternoon: 0,   evening: 0,   night: 0   },
  otherText:   { morning: 0,   afternoon: 0,   evening: 0,   night: 0   },
}
const DEFAULT_PERIOD_CHAT_LIGHTNESS = {
  bg:          { morning: 25, afternoon: 25, evening: 15, night: 10 },
  myBubble:    { morning: 50, afternoon: 50, evening: 45, night: 40 },
  otherBubble: { morning: 20, afternoon: 15, evening: 12, night: 10 },
  myText:      { morning: 100, afternoon: 100, evening: 100, night: 100 },
  otherText:   { morning: 100, afternoon: 100, evening: 100, night: 100 },
}

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
  { val: 'tshirt',     label: 'Tシャツ',      svg: <svg viewBox="0 0 60 50" width="48" height="40" fill="none"><path d="M10,8 L2,18 L10,20 L10,44 L50,44 L50,20 L58,18 L50,8 L38,14 C36,16 24,16 22,14 Z" fill="currentColor" opacity="0.7" /><path d="M22,14 Q30,20 38,14" stroke="rgba(255,255,255,0.3)" strokeWidth="1" fill="none" /></svg> },
  { val: 'tanktop',    label: 'タンクトップ',  svg: <svg viewBox="0 0 60 50" width="48" height="40" fill="none"><path d="M18,6 L14,12 L14,44 L46,44 L46,12 L42,6 C40,4 38,3 36,4 L34,8 C32,12 28,12 26,8 L24,4 C22,3 20,4 18,6 Z" fill="currentColor" opacity="0.7" /></svg> },
  { val: 'longsleeve', label: '長袖',          svg: <svg viewBox="0 0 60 50" width="48" height="40" fill="none"><path d="M14,8 L2,28 L10,32 L16,18 L16,44 L44,44 L44,18 L50,32 L58,28 L46,8 L38,14 C36,16 24,16 22,14 Z" fill="currentColor" opacity="0.7" /></svg> },
  { val: 'hoodie',     label: 'パーカー',      svg: <svg viewBox="0 0 60 50" width="48" height="40" fill="none"><path d="M14,8 L2,28 L10,32 L16,18 L16,44 L44,44 L44,18 L50,32 L58,28 L46,8 L38,14 Q36,6 30,4 Q24,6 22,14 Z" fill="currentColor" opacity="0.7" /><path d="M26,14 Q30,18 34,14 L34,28 L26,28 Z" fill="rgba(255,255,255,0.12)" /></svg> },
  { val: 'shirt',      label: 'シャツ',        svg: <svg viewBox="0 0 60 50" width="48" height="40" fill="none"><path d="M14,8 L2,18 L10,20 L10,44 L50,44 L50,20 L58,18 L50,8 L42,12 L38,6 L30,10 L22,6 L18,12 Z" fill="currentColor" opacity="0.7" /><path d="M26,10 L30,14 L34,10" stroke="rgba(255,255,255,0.3)" strokeWidth="1" fill="none" /><circle cx="30" cy="22" r="1.5" fill="rgba(255,255,255,0.3)" /><circle cx="30" cy="30" r="1.5" fill="rgba(255,255,255,0.3)" /></svg> },
]

const BOTTOM_STYLES = [
  { val: 'jeans',      label: 'ジーンズ',    svg: <svg viewBox="0 0 60 54" width="48" height="44" fill="none"><path d="M10,4 L8,8 L8,32 Q8,36 14,38 L18,54 L28,54 L30,32 L32,54 L42,54 L46,38 Q52,36 52,32 L52,8 L50,4 Z" fill="currentColor" opacity="0.7" /><line x1="30" y1="8" x2="30" y2="36" stroke="rgba(0,0,0,0.2)" strokeWidth="1.2" /><line x1="14" y1="16" x2="22" y2="16" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" /></svg> },
  { val: 'shorts',     label: 'ハーフパンツ', svg: <svg viewBox="0 0 60 38" width="48" height="30" fill="none"><path d="M10,4 L8,8 L8,22 Q8,26 16,28 L18,36 L28,36 L30,22 L32,36 L42,36 L44,28 Q52,26 52,22 L52,8 L50,4 Z" fill="currentColor" opacity="0.7" /><line x1="30" y1="8" x2="30" y2="24" stroke="rgba(0,0,0,0.2)" strokeWidth="1.2" /></svg> },
  { val: 'sweatpants', label: 'スウェット',   svg: <svg viewBox="0 0 60 54" width="48" height="44" fill="none"><path d="M10,4 L8,8 L8,32 Q8,36 14,38 L18,52 L28,52 L30,32 L32,52 L42,52 L46,38 Q52,36 52,32 L52,8 L50,4 Z" fill="currentColor" opacity="0.7" /><line x1="22" y1="6" x2="38" y2="6" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" /><rect x="9" y="48" width="18" height="4" rx="2" fill="currentColor" opacity="0.5" /><rect x="33" y="48" width="18" height="4" rx="2" fill="currentColor" opacity="0.5" /></svg> },
  { val: 'slacks',     label: 'スラックス',   svg: <svg viewBox="0 0 60 54" width="48" height="44" fill="none"><path d="M12,4 L10,8 L10,32 Q10,36 15,38 L18,54 L28,54 L30,32 L32,54 L42,54 L45,38 Q50,36 50,32 L50,8 L48,4 Z" fill="currentColor" opacity="0.7" /><line x1="30" y1="8" x2="30" y2="36" stroke="rgba(0,0,0,0.15)" strokeWidth="1" /><line x1="16" y1="10" x2="16" y2="52" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8" /><line x1="44" y1="10" x2="44" y2="52" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8" /></svg> },
  { val: 'skirt',      label: 'スカート',     svg: <svg viewBox="0 0 60 50" width="48" height="40" fill="none"><path d="M18,4 L42,4 L42,10 L18,10 Z" fill="currentColor" opacity="0.9" /><path d="M14,10 L8,46 L52,46 L46,10 Z" fill="currentColor" opacity="0.7" /><line x1="24" y1="10" x2="20" y2="46" stroke="rgba(0,0,0,0.1)" strokeWidth="1" /><line x1="36" y1="10" x2="40" y2="46" stroke="rgba(0,0,0,0.1)" strokeWidth="1" /></svg> },
]

const SHOES_STYLES = [
  { val: 'sneakers', label: 'スニーカー', svg: <svg viewBox="0 0 60 30" width="56" height="26" fill="none"><path d="M4,18 C4,14 8,10 16,9 L30,8 L44,10 C52,12 56,16 56,20 C56,24 52,26 44,26 L16,26 C8,26 4,24 4,20 Z" fill="currentColor" opacity="0.8" /><path d="M6,18 C6,15 10,13 18,12 L32,11" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" fill="none" /><path d="M8,22 L52,22" stroke="rgba(0,0,0,0.2)" strokeWidth="1.5" /><path d="M12,10 L10,18" stroke="rgba(255,255,255,0.15)" strokeWidth="1" /><path d="M20,9 L18,18" stroke="rgba(255,255,255,0.15)" strokeWidth="1" /><path d="M28,8 L26,18" stroke="rgba(255,255,255,0.15)" strokeWidth="1" /></svg> },
  { val: 'loafers',  label: 'ローファー', svg: <svg viewBox="0 0 60 28" width="56" height="24" fill="none"><path d="M4,16 C4,12 8,8 18,8 L40,8 C50,8 56,12 56,16 C56,20 50,24 40,24 L18,24 C8,24 4,20 4,16 Z" fill="currentColor" opacity="0.8" /><path d="M10,12 Q30,9 50,12" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" fill="none" /><path d="M6,20 L54,20" stroke="rgba(0,0,0,0.25)" strokeWidth="1.5" /></svg> },
  { val: 'sandals',  label: 'サンダル',   svg: <svg viewBox="0 0 60 28" width="56" height="24" fill="none"><path d="M8,20 C8,16 12,14 30,14 C48,14 52,16 52,20 C52,24 48,26 30,26 C12,26 8,24 8,20 Z" fill="currentColor" opacity="0.8" /><path d="M12,14 Q30,10 48,14" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.7" /><path d="M16,10 Q30,6 44,10" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.7" /></svg> },
  { val: 'boots',    label: 'ブーツ',     svg: <svg viewBox="0 0 60 44" width="48" height="36" fill="none"><path d="M18,4 C16,4 14,6 14,10 L14,30 C10,30 6,32 6,36 C6,40 10,42 22,42 C34,42 38,40 38,36 C38,32 34,30 30,30 L30,10 C30,6 28,4 26,4 Z" fill="currentColor" opacity="0.8" /><line x1="16" y1="6" x2="16" y2="30" stroke="rgba(255,255,255,0.12)" strokeWidth="1" /><path d="M8,36 L36,36" stroke="rgba(0,0,0,0.2)" strokeWidth="1.5" /></svg> },
  { val: 'heels',    label: 'ハイヒール', svg: <svg viewBox="0 0 60 36" width="56" height="30" fill="none"><path d="M8,16 C8,12 12,8 24,8 L42,8 C50,8 54,12 54,16 C54,20 50,22 42,22 L20,22 C16,22 14,24 14,26 C14,28 12,30 10,30 C8,30 6,28 6,24 L6,20 Z" fill="currentColor" opacity="0.8" /><line x1="8" y1="22" x2="54" y2="22" stroke="rgba(0,0,0,0.2)" strokeWidth="1.2" /><path d="M6,24 L6,30 C6,31 10,31 10,30" stroke="rgba(0,0,0,0.3)" strokeWidth="1.5" fill="none" /></svg> },
]
const OUTER_STYLES: { val: string | null; label: string; svg?: React.ReactElement }[] = [
  { val: null,      label: 'なし' },
  { val: 'jacket',  label: 'ジャケット',        svg: <svg viewBox="0 0 60 50" width="48" height="40" fill="none"><path d="M12,6 L2,18 L10,22 L10,44 L50,44 L50,22 L58,18 L48,6 L40,10 L36,8 L30,12 L24,8 L20,10 Z" fill="currentColor" opacity="0.7" /><path d="M30,12 L28,22 L30,20 L32,22 L30,12" fill="rgba(255,255,255,0.15)" /><line x1="30" y1="20" x2="30" y2="44" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" /></svg> },
  { val: 'blazer',  label: 'ブレザー',          svg: <svg viewBox="0 0 60 50" width="48" height="40" fill="none"><path d="M12,6 L2,18 L10,22 L10,44 L50,44 L50,22 L58,18 L48,6 L40,10 L34,8 L30,14 L26,8 L20,10 Z" fill="currentColor" opacity="0.7" /><path d="M30,14 L26,20 L30,18 L34,20 L30,14" fill="rgba(255,255,255,0.18)" /><circle cx="29" cy="28" r="2" fill="rgba(255,255,255,0.25)" /><circle cx="29" cy="36" r="2" fill="rgba(255,255,255,0.25)" /><rect x="34" y="14" width="8" height="6" rx="0.5" fill="rgba(255,255,255,0.1)" /></svg> },
  { val: 'coat',    label: 'コート',            svg: <svg viewBox="0 0 60 56" width="48" height="46" fill="none"><path d="M12,6 L2,18 L10,22 L10,52 L50,52 L50,22 L58,18 L48,6 L40,10 L34,8 L30,14 L26,8 L20,10 Z" fill="currentColor" opacity="0.7" /><path d="M30,14 L27,22 L30,20 L33,22 L30,14" fill="rgba(255,255,255,0.15)" /><circle cx="29" cy="28" r="2" fill="rgba(255,255,255,0.2)" /><circle cx="29" cy="36" r="2" fill="rgba(255,255,255,0.2)" /><circle cx="29" cy="44" r="2" fill="rgba(255,255,255,0.2)" /></svg> },
  { val: 'denim',   label: 'デニムジャケット',  svg: <svg viewBox="0 0 60 50" width="48" height="40" fill="none"><path d="M12,6 L2,18 L10,22 L10,44 L50,44 L50,22 L58,18 L48,6 L40,10 L36,8 L30,12 L24,8 L20,10 Z" fill="currentColor" opacity="0.7" /><rect x="16" y="10" width="10" height="8" rx="0.5" fill="rgba(255,255,255,0.1)" stroke="rgba(255,220,100,0.4)" strokeWidth="0.7" /><rect x="34" y="10" width="10" height="8" rx="0.5" fill="rgba(255,255,255,0.1)" stroke="rgba(255,220,100,0.4)" strokeWidth="0.7" /><circle cx="30" cy="20" r="2" fill="rgba(255,255,255,0.25)" /><circle cx="30" cy="30" r="2" fill="rgba(255,255,255,0.25)" /></svg> },
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
  { label: 'Setting', index: 2, angle: 50  },
]

const CANVAS_FRAME: React.CSSProperties = {
  width: '91.8vw', maxWidth: '367px', height: '100%',
  background: 'white', border: '8px solid #c0c0c0', borderRadius: '4px',
  boxShadow: '0 24px 64px rgba(0,0,0,0.40), inset 0 0 0 2px #e8e8e8, inset 0 0 0 3px #a0a0a0',
  position: 'relative', overflow: 'hidden',
}


export function MuseumView() {
  const [hour,           setHour]           = useState(0)
  const [period,         setPeriod]         = useState<Period>('night')
  const [canvases,       setCanvases]       = useState<CanvasData[]>([])
  const [activeIndex,    setActiveIndex]    = useState(0)
  const [direction,      setDirection]      = useState<'left' | 'right'>('right')
  const [activeCanvas,   setActiveCanvas]   = useState(0)
  const [isSheetOpen,    setIsSheetOpen]    = useState(false)
  const [editMenuOpen,   setEditMenuOpen]   = useState(false)
  const [canvasEditMode, setCanvasEditMode] = useState<'menu' | 'tag-edit' | 'emoji-edit' | 'avatar-edit'>('menu')
  const [itemEditSubMode, setItemEditSubMode] = useState<'move-tag' | 'move-emoji' | 'move-avatar' | 'change' | null>(null)
  const [isTitleEditOpen, setIsTitleEditOpen] = useState(false)
  const [isBgEditOpen,    setIsBgEditOpen]    = useState(false)
  const [canvasBg,        setCanvasBg]        = useState<string>('default')
  const [avatarChatBg,     setAvatarChatBg]     = useState<string | undefined>(undefined)
  const [avatarChatBgMode, setAvatarChatBgMode] = useState<'color' | 'image' | 'virtual'>('color')
  const [avatarChatBgImage, setAvatarChatBgImage] = useState<string | null>(null)
  const [avatarChatAvatar, setAvatarChatAvatar] = useState<string | null>(null)
  const [avatarBgHue, setAvatarBgHue] = useState(270)
  const [avatarBgSaturation, setAvatarBgSaturation] = useState(60)
  const [avatarBgLightness, setAvatarBgLightness] = useState(10)
  const [avatarBgPaletteOpen, setAvatarBgPaletteOpen] = useState(false)
  const AVATAR_BG_PALETTE: string[] = [
    '#1a0800','#2d1000','#3d1a00','#4a2200','#5c2d00','#6b3a00','#7a4500','#8b5200','#ffffff','#f5f5f5',
    '#3d0000','#5c0000','#7a0000','#8b0000','#a00000','#b22222','#cc3300','#e64400','#ff5500','#ff6600',
    '#4a3d00','#665500','#7a6600','#998800','#b3a000','#ccb800','#e6d000','#ffe800','#ffff00','#ffff66',
    '#003300','#004400','#005500','#006600','#007700','#008800','#009900','#00aa00','#00cc00','#00ff00',
    '#003333','#004444','#005555','#006666','#007777','#008888','#00aaaa','#00cccc','#00eeee','#00ffff',
    '#000033','#000055','#000077','#000099','#0000bb','#0000cc','#0000ee','#1111ff','#4444ff','#8888ff',
    '#1a0033','#2d0055','#3d0077','#550099','#6600bb','#7700cc','#8800ee','#9900ff','#aa22ff','#bb44ff',
    '#330011','#550022','#770033','#880044','#aa0055','#cc0066','#dd0077','#ee0088','#ff00aa','#ff44cc',
    '#111111','#222222','#333333','#444444','#555555','#666666','#777777','#888888','#999999','#aaaaaa',
    '#bbbbbb','#cccccc','#dddddd','#e5e5e5','#eeeeee','#f0f0f0','#f5f5f5','#fafafa','#ffffff','#ffffff',
  ]
  const AVATAR_BG_QUICK: string[] = ['#ff0000','#ff2200','#ffaa00','#ffff00','#00cc00','#00cccc','#0088ff','#0000ff','#6600ff']
  const AVATAR_BG_RECOMMEND = ['#8B5E3C','#6B4423','#A0522D','#CD853F','#D2691E','#556B2F','#2F4F4F','#4A4A8A','#8B3A3A','#1C1C1C','#F5DEB3','#FAEBD7','#DEB887','#BC8F5F','#A9A9A9','#C0C0C0','#808080']
  const avatarChatBgImageInputRef = useRef<HTMLInputElement>(null)
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
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false)
  const [generateError,      setGenerateError]      = useState<string | null>(null)
  const [savedAvatars,       setSavedAvatars]       = useState<{ id: number; imageUrl: string }[]>([])
  const [activeProfileTab,   setActiveProfileTab]   = useState<'avatar' | 'collection' | 'memories'>('avatar')
  const [memoriesTab,        setMemoriesTab]        = useState<'museum' | 'chat'>('museum')
  const [isDoorHallOpen,     setIsDoorHallOpen]     = useState(false)
  const [museumMemories,     setMuseumMemories]     = useState<{ id: number; date: string; snapshot: string }[]>([])
  const [displayName,           setDisplayName]           = useState('なつき')
  const [userId,                setUserId]                = useState('natsuki_346')
  const [bio,                   setBio]                   = useState('夜型の音楽好き🎵 猫と暮らしてます🐱')
  const [identityTags,          setIdentityTags]          = useState(['#夜型', '#音楽好き', '#猫派', '#インドア'])
  const [subPage,               setSubPage]               = useState<'profile-edit' | 'tag-list' | 'connections' | null>(null)
  const [profileHeaderGradient, setProfileHeaderGradient] = useState('linear-gradient(155deg, #7c3aed 0%, #ec4899 100%)')
  const [profileHeaderImage,   setProfileHeaderImage]   = useState<string | null>(null)
  const [profileIconImage,     setProfileIconImage]     = useState<string | null>(null)
  const [iconType,             setIconType]             = useState<'avatar' | 'photo'>('avatar')
  const [selectedAvatarForIcon, setSelectedAvatarForIcon] = useState<string | null>(null)
  const headerImageInputRef = useRef<HTMLInputElement>(null)
  const iconImageInputRef   = useRef<HTMLInputElement>(null)
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
  const [decoTab, setDecoTab] = useState<'general' | 'custom'>('general')
  const [chatCustomize, setChatCustomize] = useState(() => {
    try {
      const saved = localStorage.getItem('chatCustomize')
      return saved ? JSON.parse(saved) : { bgColor: '#0f0f1a', myBubbleColor: '#7c3aed', otherBubbleColor: '#1e1e3a', myTextColor: '#ffffff', otherTextColor: '#ffffff' }
    } catch {
      return { bgColor: '#0f0f1a', myBubbleColor: '#7c3aed', otherBubbleColor: '#1e1e3a', myTextColor: '#ffffff', otherTextColor: '#ffffff' }
    }
  })
  const [chatSettingOpen, setChatSettingOpen] = useState(false)
  const [openSubSection, setOpenSubSection] = useState<'bg' | 'bubble' | 'text' | null>(null)
  const [chatBgSubOpen, setChatBgSubOpen] = useState(false)
  const [avatarBgSubOpen, setAvatarBgSubOpen] = useState(false)
  const [avatarBgChangeOpen, setAvatarBgChangeOpen] = useState(false)
  const [avatarAvatarChangeOpen, setAvatarAvatarChangeOpen] = useState(false)
  const [myBubbleSubOpen, setMyBubbleSubOpen] = useState(false)
  const [theirBubbleSubOpen, setTheirBubbleSubOpen] = useState(false)
  const [myTextSubOpen, setMyTextSubOpen] = useState(false)
  const [theirTextSubOpen, setTheirTextSubOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState<'bg' | 'myBubble' | 'otherBubble' | 'myText' | 'otherText' | null>(null)
  const [hue, setHue] = useState<{ bg: number; myBubble: number; otherBubble: number; myText: number; otherText: number }>({ bg: 240, myBubble: 270, otherBubble: 220, myText: 0, otherText: 0 })
  const [lightness, setLightness] = useState<{ bg: number; myBubble: number; otherBubble: number; myText: number; otherText: number }>({ bg: 50, myBubble: 50, otherBubble: 50, myText: 90, otherText: 90 })
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null)
  const [outerOpen, setOuterOpen] = useState(false)
  const [naviOpen, setNaviOpen] = useState(false)
  const [naviCustomize, setNaviCustomize] = useState(() => {
    try {
      const saved = localStorage.getItem('naviCustomize')
      return saved ? JSON.parse(saved) : { bgColor: '#1a1a2e', textColor: '#ffffff', activeColor: '#7c3aed' }
    } catch { return { bgColor: '#1a1a2e', textColor: '#ffffff', activeColor: '#7c3aed' } }
  })
  const [appearanceCustomize, setAppearanceCustomize] = useState(() => {
    try {
      const saved = localStorage.getItem('appearanceCustomize')
      return saved ? JSON.parse(saved) : { tabBgColor: '#0f0f1a', tabTextColor: '#ffffff', tabActiveColor: '#7c3aed' }
    } catch { return { tabBgColor: '#0f0f1a', tabTextColor: '#ffffff', tabActiveColor: '#7c3aed' } }
  })
  const [hueAppearance, setHueAppearance] = useState({ tabBg: 240, tabText: 0, tabActive: 270 })
  const [lightnessAppearance, setLightnessAppearance] = useState({ tabBg: 10, tabText: 100, tabActive: 50 })
  const [hueNavi, setHueNavi] = useState({ bg: 230, text: 0, active: 270 })
  const [lightnessNavi, setLightnessNavi] = useState({ bg: 15, text: 100, active: 50 })
  const [paletteOpenAppearance, setPaletteOpenAppearance] = useState<string | null>(null)
  const [paletteOpenNavi, setPaletteOpenNavi] = useState<string | null>(null)
  const [savedFeedbackAppearance, setSavedFeedbackAppearance] = useState<string | null>(null)
  const [savedFeedbackNavi, setSavedFeedbackNavi] = useState<string | null>(null)
  const [openSubAppearance, setOpenSubAppearance] = useState<string | null>(null)
  const [openSubNavi, setOpenSubNavi] = useState<string | null>(null)
  const [periodHours, setPeriodHours] = useState(() => {
    try {
      const saved = localStorage.getItem('periodHours')
      return saved ? JSON.parse(saved) : { morning: { start: 6, end: 11 }, afternoon: { start: 11, end: 17 }, evening: { start: 17, end: 21 }, night: { start: 21, end: 6 } }
    } catch { return { morning: { start: 6, end: 11 }, afternoon: { start: 11, end: 17 }, evening: { start: 17, end: 21 }, night: { start: 21, end: 6 } } }
  })
  const [periodSync, setPeriodSync] = useState(() => {
    try {
      const saved = localStorage.getItem('periodSync')
      return saved ? JSON.parse(saved) : { chatBg: false, chatBubble: false, chatText: false, appearance: false, navi: false }
    } catch { return { chatBg: false, chatBubble: false, chatText: false, appearance: false, navi: false } }
  })
  const [periodSettingOpen, setPeriodSettingOpen] = useState(false)
  const [globalCardBgColor, setGlobalCardBgColor] = useState({ r: 255, g: 255, b: 255 })
  const [globalCardTextColor, setGlobalCardTextColor] = useState({ r: 30, g: 30, b: 30 })
  const [globalUseOwnCardColor, setGlobalUseOwnCardColor] = useState(true)
  const [cardColorSectionOpen, setCardColorSectionOpen] = useState(false)
  const [cardColorSavedFeedback, setCardColorSavedFeedback] = useState(false)
  const [cardBgPaletteOpen, setCardBgPaletteOpen] = useState(false)
  const [cardTextPaletteOpen, setCardTextPaletteOpen] = useState(false)

  const CARD_PALETTE_DEFAULTS = [
    '#8B5E3C','#6B4423','#A0522D','#CD853F','#D2691E',
    '#556B2F','#2F4F4F','#4A4A8A','#8B3A3A','#1C1C1C',
    '#F5DEB3','#FAEBD7','#DEB887','#BC8F5F','#A9A9A9',
    '#C0C0C0','#808080',
  ]
  const CARD_PALETTE_COLORS = [
    ['#1a0000','#330000','#660000','#990000','#cc0000','#ff0000','#ff4d4d','#ff9999','#ffcccc','#fff0f0'],
    ['#1a0d00','#331a00','#663300','#994d00','#cc6600','#ff8000','#ffaa4d','#ffcc99','#ffe5cc','#fff5e6'],
    ['#1a1a00','#333300','#666600','#999900','#cccc00','#ffff00','#ffff4d','#ffff99','#ffffcc','#fffff0'],
    ['#001a00','#003300','#006600','#009900','#00cc00','#00ff00','#4dff4d','#99ff99','#ccffcc','#f0fff0'],
    ['#00001a','#000033','#000066','#000099','#0000cc','#0000ff','#4d4dff','#9999ff','#ccccff','#f0f0ff'],
    ['#0d001a','#1a0033','#330066','#4d0099','#6600cc','#8000ff','#aa4dff','#cc99ff','#e5ccff','#f5e6ff'],
    ['#0a0a0a','#1a1a1a','#333333','#4d4d4d','#666666','#808080','#999999','#b3b3b3','#cccccc','#e6e6e6'],
    ['#ffffff','#f5f5f5','#ebebeb','#e0e0e0','#d6d6d6','#cccccc','#c2c2c2','#b8b8b8','#adadad','#a3a3a3'],
  ]
  const [openSubPeriod, setOpenSubPeriod] = useState<'morning' | 'afternoon' | 'evening' | 'night' | null>(null)
  const [savedFeedbackPeriod, setSavedFeedbackPeriod] = useState(false)
  const [openPeriodColorKey, setOpenPeriodColorKey] = useState<string | null>(null)
  const [paletteOpenPeriod, setPaletteOpenPeriod] = useState<string | null>(null)

  type PeriodNumbers = Record<'morning' | 'afternoon' | 'evening' | 'night', number>
  const [periodChatHue, setPeriodChatHue] = useState<{ bg: PeriodNumbers; myBubble: PeriodNumbers; otherBubble: PeriodNumbers; myText: PeriodNumbers; otherText: PeriodNumbers }>({
    bg:          { morning: 220, afternoon: 200, evening: 250, night: 240 },
    myBubble:    { morning: 210, afternoon: 270, evening: 260, night: 270 },
    otherBubble: { morning: 215, afternoon: 225, evening: 235, night: 240 },
    myText:      { morning: 0, afternoon: 0, evening: 0, night: 0 },
    otherText:   { morning: 0, afternoon: 0, evening: 0, night: 0 },
  })
  const [periodChatLightness, setPeriodChatLightness] = useState<{ bg: PeriodNumbers; myBubble: PeriodNumbers; otherBubble: PeriodNumbers; myText: PeriodNumbers; otherText: PeriodNumbers }>({
    bg:          { morning: 25, afternoon: 25, evening: 15, night: 10 },
    myBubble:    { morning: 50, afternoon: 50, evening: 45, night: 40 },
    otherBubble: { morning: 20, afternoon: 15, evening: 12, night: 10 },
    myText:      { morning: 100, afternoon: 100, evening: 100, night: 100 },
    otherText:   { morning: 100, afternoon: 100, evening: 100, night: 100 },
  })

  type PeriodColors = Record<'morning' | 'afternoon' | 'evening' | 'night', string>
  const DEFAULT_PERIOD_CHAT_COLORS = DEFAULT_PERIOD_CHAT_COLORS_CONST as {
    bg: PeriodColors; myBubble: PeriodColors; otherBubble: PeriodColors; myText: PeriodColors; otherText: PeriodColors
  }
  const [periodChatColors, setPeriodChatColors] = useState<typeof DEFAULT_PERIOD_CHAT_COLORS>(() => {
    try {
      const saved = localStorage.getItem('periodChatColors')
      return saved ? JSON.parse(saved) : DEFAULT_PERIOD_CHAT_COLORS
    } catch { return DEFAULT_PERIOD_CHAT_COLORS }
  })
  const DEFAULT_PERIOD_APPEARANCE_COLORS = {
    tabBg:     { morning: '#e0f2fe', afternoon: '#dbeafe', evening: '#ffedd5', night: '#0f0f1a' } as PeriodColors,
    tabText:   { morning: '#0f172a', afternoon: '#1e3a5f', evening: '#431407', night: '#ffffff' } as PeriodColors,
    tabActive: { morning: '#0284c7', afternoon: '#2563eb', evening: '#ea580c', night: '#a78bfa' } as PeriodColors,
  }
  const [periodAppearanceColors, setPeriodAppearanceColors] = useState<typeof DEFAULT_PERIOD_APPEARANCE_COLORS>(() => {
    try {
      const saved = localStorage.getItem('periodAppearanceColors')
      return saved ? JSON.parse(saved) : DEFAULT_PERIOD_APPEARANCE_COLORS
    } catch { return DEFAULT_PERIOD_APPEARANCE_COLORS }
  })
  const DEFAULT_PERIOD_NAVI_COLORS = {
    bg:     { morning: '#ffffff', afternoon: '#eff6ff', evening: '#fff7ed', night: '#1a1a2e' } as PeriodColors,
    text:   { morning: '#64748b', afternoon: '#64748b', evening: '#92400e', night: '#9ca3af' } as PeriodColors,
    active: { morning: '#0284c7', afternoon: '#2563eb', evening: '#ea580c', night: '#a78bfa' } as PeriodColors,
  }
  const [periodNaviColors, setPeriodNaviColors] = useState<typeof DEFAULT_PERIOD_NAVI_COLORS>(() => {
    try {
      const saved = localStorage.getItem('periodNaviColors')
      return saved ? JSON.parse(saved) : DEFAULT_PERIOD_NAVI_COLORS
    } catch { return DEFAULT_PERIOD_NAVI_COLORS }
  })

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
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const getCurrentPeriod = (h: number): Period => {
    if (h >= periodHours.morning.start && h < periodHours.morning.end) return 'morning'
    if (h >= periodHours.afternoon.start && h < periodHours.afternoon.end) return 'afternoon'
    if (h >= periodHours.evening.start && h < periodHours.evening.end) return 'evening'
    return 'night'
  }

  useEffect(() => {
    const update = () => {
      const h = new Date().getHours()
      setHour(h)
      setPeriod(getCurrentPeriod(h))
    }
    update()
    const id = setInterval(update, 60_000)
    return () => clearInterval(id)
  }, [periodHours]) // eslint-disable-line react-hooks/exhaustive-deps

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
    const id = el.dataset.itemId!
    const item = (canvasesRef.current[ci]?.items ?? []).find(d => d.id === id); if (!item) return
    const canInteract =
      (itemEditSubMode === 'move-tag'    && item.kind === 'tag') ||
      (itemEditSubMode === 'move-emoji'  && item.kind === 'emoji') ||
      (itemEditSubMode === 'move-avatar' && item.kind === 'avatar')
    if (!canInteract) return
    e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId)
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
    setMuseumMemories(prev => [{
      id: Date.now(),
      date: new Date().toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      snapshot: `キャンバス「${canvases[activeCanvas]?.title ?? '無題'}」を更新しました`,
    }, ...prev].slice(0, 50))
  }

  const closeSheet = () => { setIsSheetOpen(false); setSheetSel(null) }


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
      <style>{`
        .hue-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 12px;
          border-radius: 6px;
          outline: none;
          cursor: pointer;
          background: linear-gradient(to right,
            hsl(0,80%,55%), hsl(30,80%,55%), hsl(60,80%,55%),
            hsl(90,80%,55%), hsl(120,80%,55%), hsl(150,80%,55%),
            hsl(180,80%,55%), hsl(210,80%,55%), hsl(240,80%,55%),
            hsl(270,80%,55%), hsl(300,80%,55%), hsl(330,80%,55%),
            hsl(360,80%,55%)
          );
        }
        .hue-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: white;
          border: 3px solid rgba(0,0,0,0.4);
          box-shadow: 0 2px 6px rgba(0,0,0,0.4);
          cursor: pointer;
        }
        .hue-slider::-moz-range-thumb {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: white;
          border: 3px solid rgba(0,0,0,0.4);
          box-shadow: 0 2px 6px rgba(0,0,0,0.4);
          cursor: pointer;
        }
      `}</style>
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
        background: TAB_THEME[period].containerBg,
        borderBottomWidth: '1px',
        borderBottomStyle: 'solid',
        borderBottomColor: TAB_THEME[period].border,
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
                background: activeIndex === index ? TAB_THEME[period].activeBg : TAB_THEME[period].inactiveBg,
                color: activeIndex === index ? TAB_THEME[period].activeText : TAB_THEME[period].inactiveText,
                transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                boxShadow: activeIndex === index ? `0 2px 8px rgba(0,0,0,0.2)` : 'none',
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
                              outline: (isSelected && item.kind !== 'avatar') ? '2px dashed rgba(167,139,250,0.7)' : 'none',
                              borderRadius: '4px',
                            }}
                          >
                            {item.kind === 'avatar' ? (
                              <AvatarSVG config={avatarConfig} size={item.size} pose={item.pose ?? 'stand'} />
                            ) : item.kind === 'tag' ? (
                              <span style={{
                                display: 'block', fontSize: `${item.size}px`,
                                background: item.color ? `${item.color}22` : PERIOD_TAG_COLORS[period].bg,
                                color: item.color ?? PERIOD_TAG_COLORS[period].text,
                                padding: '2px 8px', borderRadius: '10px',
                                border: `1px solid ${item.color ? `${item.color}55` : PERIOD_TAG_COLORS[period].border}`,
                                whiteSpace: 'nowrap', fontFamily: 'system-ui, sans-serif', fontWeight: 500,
                              }}>{item.content}</span>
                            ) : (
                              <span style={{ fontSize: `${item.size}px`, lineHeight: 1, display: 'block' }}>{item.content}</span>
                            )}
                          </div>
                        )
                      })}

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
        <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: 'none', overflowY: 'auto', paddingBottom: '80px' }}>
          <div style={{ height: '120px', backgroundImage: profileHeaderImage ? `url(${profileHeaderImage})` : profileHeaderGradient, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative', flexShrink: 0 }}>
            <button onClick={() => openSubPage('profile-edit')} style={{
              position: 'absolute', top: '14px', right: '16px',
              fontSize: '12px', color: 'rgba(255,255,255,0.9)',
              background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.30)',
              borderRadius: '14px', padding: '4px 12px', backdropFilter: 'blur(4px)',
            }}>編集</button>
          </div>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', top: '-36px', left: '16px', cursor: 'pointer' }} onClick={() => openSubPage('profile-edit')}>
              {iconType === 'photo' && profileIconImage
                ? <img src={profileIconImage} style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.2)' }} alt="icon" />
                : iconType === 'avatar' && selectedAvatarForIcon
                  ? <img src={selectedAvatarForIcon} style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', border: '3px solid rgba(255,255,255,0.2)' }} alt="icon" />
                  : <ProfileAvatar config={avatarConfig} />
              }
            </div>
            <div style={{ height: '44px' }} />
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

              {/* プロフィールサブタブ */}
              <div style={{
                display: 'flex', gap: '8px', padding: '16px 0 0',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                marginBottom: '4px',
              }}>
                {(['avatar', 'collection', 'memories'] as const).map(tab => {
                  const labels = { avatar: 'My Avatar', collection: 'Collection', memories: 'Memories' }
                  const on = activeProfileTab === tab
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveProfileTab(tab)}
                      style={{
                        flex: 1, padding: '8px 4px', borderRadius: '10px',
                        background: on ? 'rgba(167,139,250,0.2)' : 'transparent',
                        color: on ? '#c4b5fd' : 'rgba(255,255,255,0.4)',
                        border: on ? '1px solid rgba(167,139,250,0.35)' : '1px solid transparent',
                        fontSize: '12px', fontWeight: on ? 700 : 400,
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      {labels[tab]}
                    </button>
                  )
                })}
              </div>

              {/* My Avatar タブ */}
              {activeProfileTab === 'avatar' && (
              <div style={{ marginTop: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px 8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px' }}>🖼️</span>
                  <span style={{ color: 'white', fontWeight: 700, fontSize: '14px' }}>My Avatar</span>
                </div>
                <div style={{ padding: '0 16px 16px' }}>
                  <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '4px' }}>
                    {/* ＋写真から作成ボタン */}
                    <div
                      onClick={() => {
                        const input = document.createElement('input')
                        input.type = 'file'
                        input.accept = 'image/*'
                        input.onchange = async (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0]
                          if (!file) return
                          setIsGeneratingAvatar(true)
                          setGenerateError(null)
                          try {
                            const reader = new FileReader()
                            reader.onload = async () => {
                              const base64 = (reader.result as string).split(',')[1]
                              const res = await fetch('/api/generate-avatar', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ imageBase64: base64 }),
                              })
                              const data = await res.json()
                              if (data.imageUrl) {
                                const newAvatar = { id: Date.now(), imageUrl: data.imageUrl }
                                setSavedAvatars(prev => [...prev, newAvatar])
                                setAvatarConfig(prev => ({ ...prev, rpmUrl: data.imageUrl }))
                              } else {
                                setGenerateError('生成に失敗しました')
                              }
                              setIsGeneratingAvatar(false)
                            }
                            reader.readAsDataURL(file)
                          } catch {
                            setGenerateError('エラーが発生しました')
                            setIsGeneratingAvatar(false)
                          }
                        }
                        input.click()
                      }}
                      style={{
                        flexShrink: 0, width: '72px', height: '104px',
                        borderRadius: '12px',
                        border: '2px dashed rgba(167,139,250,0.4)',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        gap: '4px', cursor: isGeneratingAvatar ? 'wait' : 'pointer',
                        opacity: isGeneratingAvatar ? 0.6 : 1,
                      }}
                    >
                      {isGeneratingAvatar
                        ? <span style={{ fontSize: '20px' }}>⏳</span>
                        : <span style={{ fontSize: '24px', color: '#a78bfa' }}>＋</span>
                      }
                      <span style={{ fontSize: '10px', color: 'rgba(167,139,250,0.7)', textAlign: 'center' }}>
                        {isGeneratingAvatar ? '生成中...' : '写真から\n作成'}
                      </span>
                    </div>
                    {/* 保存済みアバター */}
                    {savedAvatars.map((av, i) => (
                      <div
                        key={av.id}
                        onClick={() => setAvatarConfig(prev => ({ ...prev, rpmUrl: av.imageUrl }))}
                        style={{
                          flexShrink: 0, width: '72px', height: '104px',
                          borderRadius: '12px',
                          border: avatarConfig.rpmUrl === av.imageUrl ? '2px solid #a78bfa' : '2px solid rgba(255,255,255,0.1)',
                          background: 'rgba(255,255,255,0.05)',
                          cursor: 'pointer', overflow: 'hidden',
                        }}
                      >
                        <img
                          src={av.imageUrl}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          alt={`アバター${i + 1}`}
                        />
                      </div>
                    ))}
                  </div>
                  {generateError !== null && (
                    <p style={{ color: '#f87171', fontSize: '11px', margin: '4px 0 0', textAlign: 'center' }}>{generateError}</p>
                  )}
                </div>
              </div>
              )}

              {/* Collection タブ */}
              {activeProfileTab === 'collection' && (
                <div style={{ padding: '12px 0' }}>
                  <div style={{ marginBottom: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                    <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>🧍</span>
                      <span style={{ color: 'white', fontWeight: 700, fontSize: '14px' }}>My Avatar</span>
                    </div>
                    <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      {savedAvatars.length === 0 ? (
                        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', margin: '12px 0 0', textAlign: 'center' }}>
                          アバターがまだありません
                        </p>
                      ) : (
                        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', scrollbarWidth: 'none', paddingTop: '12px' }}>
                          {savedAvatars.map((av, i) => (
                            <div
                              key={av.id}
                              onClick={() => setAvatarConfig(prev => ({ ...prev, rpmUrl: av.imageUrl }))}
                              style={{
                                flexShrink: 0, width: '72px', height: '104px',
                                borderRadius: '12px',
                                border: avatarConfig.rpmUrl === av.imageUrl ? '2px solid #a78bfa' : '2px solid rgba(255,255,255,0.1)',
                                overflow: 'hidden', cursor: 'pointer',
                              }}
                            >
                              <img src={av.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={`アバター${i + 1}`} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ borderRadius: '16px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                    <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>🏷️</span>
                        <span style={{ color: 'white', fontWeight: 700, fontSize: '14px' }}>ハッシュタグデザイン</span>
                      </div>
                      <span style={{ fontSize: '10px', color: '#a78bfa', background: 'rgba(167,139,250,0.15)', padding: '3px 8px', borderRadius: '8px', border: '1px solid rgba(167,139,250,0.3)' }}>近日公開</span>
                    </div>
                    <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', margin: '12px 0 0', textAlign: 'center' }}>
                        購入したデザインがここに表示されます
                      </p>
                    </div>
                  </div>
                  <div style={{ marginTop: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                    <div
                      onClick={() => setIsDoorHallOpen(true)}
                      style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>🚪</span>
                        <span style={{ color: 'white', fontWeight: 700, fontSize: '14px' }}>図鑑</span>
                      </div>
                      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '18px' }}>›</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Memories タブ */}
              {activeProfileTab === 'memories' && (
                <div style={{ padding: '12px 0' }}>
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                    {(['museum', 'chat'] as const).map(t => {
                      const labels = { museum: '🖼️ ミュージアム', chat: '💬 チャット' }
                      const on = memoriesTab === t
                      return (
                        <button
                          key={t}
                          onClick={() => setMemoriesTab(t)}
                          style={{
                            flex: 1, padding: '8px', borderRadius: '10px',
                            background: on ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.05)',
                            color: on ? '#c4b5fd' : 'rgba(255,255,255,0.4)',
                            border: on ? '1px solid rgba(167,139,250,0.35)' : '1px solid rgba(255,255,255,0.06)',
                            fontSize: '12px', fontWeight: on ? 700 : 400, cursor: 'pointer',
                          }}
                        >
                          {labels[t]}
                        </button>
                      )
                    })}
                  </div>
                  {memoriesTab === 'museum' && (
                    <div style={{ borderRadius: '16px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                      <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <span style={{ color: 'white', fontWeight: 700, fontSize: '14px' }}>ミュージアムの記録</span>
                      </div>
                      <div style={{ padding: '12px 16px' }}>
                        {museumMemories.length === 0 ? (
                          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', margin: 0, textAlign: 'center' }}>
                            まだ記録がありません
                          </p>
                        ) : (
                          museumMemories.map(m => (
                            <div key={m.id} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', margin: '0 0 4px' }}>{m.date}</p>
                              <p style={{ color: 'white', fontSize: '13px', margin: 0 }}>{m.snapshot}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                  {memoriesTab === 'chat' && (
                    <div style={{ borderRadius: '16px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                      <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <span style={{ color: 'white', fontWeight: 700, fontSize: '14px' }}>チャットの投稿</span>
                      </div>
                      <div style={{ padding: '12px 16px' }}>
                        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', margin: 0, textAlign: 'center' }}>
                          近日公開
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
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
        display: 'flex', flexDirection: 'column',
      }}>

        {/* ── タブ切り替え ─────────────────────────────────────────── */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          flexShrink: 0,
          padding: '0 16px',
        }}>
          {(['general', 'custom'] as const).map(tb => {
            const labels = { general: '一般', custom: 'カスタマイズ' }
            const on = decoTab === tb
            return (
              <button
                key={tb}
                onClick={() => setDecoTab(tb)}
                style={{
                  padding: '10px 16px', fontSize: '13px', fontWeight: 600,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: on ? 'white' : 'rgba(255,255,255,0.4)',
                  borderBottom: on ? '2px solid #a78bfa' : '2px solid transparent',
                  marginBottom: '-1px',
                }}
              >{labels[tb]}</button>
            )
          })}
        </div>

        {/* ── 一般タブ ─────────────────────────────────────────────── */}
        {decoTab === 'general' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: '120px', scrollbarWidth: 'none' }}>

            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 600, margin: '0 0 8px 4px', letterSpacing: '0.8px' }}>通知</p>
            <div style={{ borderRadius: '14px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}
                onClick={() => setDecorSubPage('notif')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '18px' }}>🔔</span>
                  <span style={{ color: 'white', fontSize: '14px' }}>通知の表示</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>{DECO_NOTIFS.find(n => n.val === notifyStyle)?.label ?? ''}</span>
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>›</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '18px' }}>📳</span>
                  <span style={{ color: 'white', fontSize: '14px' }}>プッシュ通知</span>
                </div>
                <div style={{ width: '44px', height: '26px', borderRadius: '13px', background: '#a78bfa', position: 'relative', cursor: 'pointer' }}>
                  <div style={{ position: 'absolute', top: '3px', left: '21px', width: '20px', height: '20px', borderRadius: '50%', background: 'white' }} />
                </div>
              </div>
            </div>

            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 600, margin: '0 0 8px 4px', letterSpacing: '0.8px' }}>アカウント</p>
            <div style={{ borderRadius: '14px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden', marginBottom: '20px' }}>
              <div
                onClick={() => { if (window.confirm('ログアウトしますか？')) {} }}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
              >
                <span style={{ fontSize: '18px' }}>🚪</span>
                <div>
                  <p style={{ color: 'white', fontSize: '14px', fontWeight: 600, margin: 0 }}>ログアウト</p>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', margin: '2px 0 0' }}>アカウントからサインアウトする</p>
                </div>
              </div>
              <div
                onClick={() => {
                  if (window.confirm('アカウントを削除しますか？\nこの操作は元に戻せません。全てのデータが削除されます。')) {
                    if (window.confirm('本当に削除しますか？この操作は取り消せません。')) {}
                  }
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', cursor: 'pointer' }}
              >
                <span style={{ fontSize: '18px' }}>🗑️</span>
                <div>
                  <p style={{ color: '#f87171', fontSize: '14px', fontWeight: 600, margin: 0 }}>アカウントを削除</p>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', margin: '2px 0 0' }}>全てのデータが完全に削除されます</p>
                </div>
              </div>
            </div>

            <div style={{ height: '20px' }} />
          </div>
        )}

        {/* ── カスタマイズタブ ──────────────────────────────────────── */}
        {decoTab === 'custom' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: '120px', scrollbarWidth: 'none' }}>

            {/* チャット設定 親折りたたみ */}
            <div style={{ borderRadius: '12px', background: 'rgba(255,255,255,0.05)', marginBottom: '8px', overflow: 'hidden' }}>
              {/* 親ヘッダー */}
              <div
                onClick={() => setChatSettingOpen(p => !p)}
                style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', cursor: 'pointer' }}
              >
                <span style={{ color: 'white', fontSize: '14px', fontWeight: 600 }}>💬 チャット設定</span>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>{chatSettingOpen ? '▼' : '▶'}</span>
              </div>

              {chatSettingOpen && (
                <div style={{ padding: '0 12px 12px' }}>

                  {(() => {
                    const THEME_COLORS = [
                      ['#1a0000','#330000','#660000','#990000','#cc0000','#ff0000','#ff4d4d','#ff9999','#ffcccc','#fff0f0'],
                      ['#1a0d00','#331a00','#663300','#994d00','#cc6600','#ff8000','#ffaa4d','#ffcc99','#ffe5cc','#fff5e6'],
                      ['#1a1a00','#333300','#666600','#999900','#cccc00','#ffff00','#ffff4d','#ffff99','#ffffcc','#fffff0'],
                      ['#001a00','#003300','#006600','#009900','#00cc00','#00ff00','#4dff4d','#99ff99','#ccffcc','#f0fff0'],
                      ['#001a1a','#003333','#006666','#009999','#00cccc','#00ffff','#4dffff','#99ffff','#ccffff','#f0ffff'],
                      ['#00001a','#000033','#000066','#000099','#0000cc','#0000ff','#4d4dff','#9999ff','#ccccff','#f0f0ff'],
                      ['#0d001a','#1a0033','#330066','#4d0099','#6600cc','#8000ff','#aa4dff','#cc99ff','#e5ccff','#f5e6ff'],
                      ['#1a0011','#330022','#660044','#990066','#cc0088','#ff00aa','#ff4dc4','#ff99dd','#ffcced','#fff0f8'],
                      ['#0a0a0a','#1a1a1a','#333333','#4d4d4d','#666666','#808080','#999999','#b3b3b3','#cccccc','#e6e6e6'],
                      ['#ffffff','#f5f5f5','#ebebeb','#e0e0e0','#d6d6d6','#cccccc','#c2c2c2','#b8b8b8','#adadad','#a3a3a3'],
                    ]
                    const STANDARD_COLORS = ['#c00000','#ff0000','#ffc000','#ffff00','#92d050','#00b050','#00b0f0','#0070c0','#002060','#7030a0']

                    const handleSave = (section: 'bg' | 'bubble' | 'text') => {
                      try {
                        localStorage.setItem('chatCustomize', JSON.stringify(chatCustomize))
                        localStorage.setItem('periodChatColors', JSON.stringify(periodChatColors))
                        setSavedFeedback(section)
                        setTimeout(() => setSavedFeedback(null), 1500)
                      } catch (e) {
                        console.error('save failed', e)
                      }
                    }
                    const PERIODS: Array<'morning' | 'afternoon' | 'evening' | 'night'> = ['morning', 'afternoon', 'evening', 'night']

                    type ColorKey = 'bg' | 'myBubble' | 'otherBubble' | 'myText' | 'otherText'
                    const colorKeyMap: Record<ColorKey, string> = {
                      bg: 'bgColor', myBubble: 'myBubbleColor', otherBubble: 'otherBubbleColor',
                      myText: 'myTextColor', otherText: 'otherTextColor',
                    }

                    const applyColor = (paletteKey: ColorKey, color: string) => {
                      const prop = colorKeyMap[paletteKey]
                      setChatCustomize((p: typeof chatCustomize) => ({ ...p, [prop]: color }))
                    }

                    const handleHueChange = (key: ColorKey, val: number) => {
                      setHue(prev => ({ ...prev, [key]: val }))
                      const l = lightness[key]
                      const color = `hsl(${val}, 70%, ${l}%)`
                      setChatCustomize((prev: typeof chatCustomize) => ({ ...prev, [colorKeyMap[key]]: color }))
                    }

                    const handleLightnessChange = (key: ColorKey, val: number) => {
                      setLightness(prev => ({ ...prev, [key]: val }))
                      const h = hue[key]
                      const color = `hsl(${h}, 70%, ${val}%)`
                      setChatCustomize((prev: typeof chatCustomize) => ({ ...prev, [colorKeyMap[key]]: color }))
                    }

                    const renderSliderRow = (colorKey: ColorKey, currentColor: string, paletteKey: ColorKey) => {
                      const currentHue = hue[colorKey]
                      const currentL = lightness[colorKey]
                      const hslColor = `hsl(${currentHue}, 70%, ${currentL}%)`
                      return (
                        <div style={{ marginBottom: '10px' }} key={paletteKey}>
                          {/* Hueスライダー行 */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: hslColor, flexShrink: 0, border: '1px solid rgba(255,255,255,0.2)' }} />
                            <div style={{ flex: 1 }}>
                              <input
                                className="hue-slider"
                                type="range" min={0} max={360} value={currentHue}
                                onChange={e => handleHueChange(colorKey, Number(e.target.value))}
                                onInput={e => handleHueChange(colorKey, Number((e.target as HTMLInputElement).value))}
                                style={{ width: '100%', pointerEvents: 'auto' }}
                              />
                            </div>
                            <button
                              onClick={() => setPaletteOpen(p => p === paletteKey ? null : paletteKey)}
                              style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                            >🎨</button>
                          </div>
                          {/* 明度スライダー */}
                          <div style={{ paddingLeft: '40px', paddingRight: '40px', marginBottom: '6px' }}>
                            <input
                              type="range" min={10} max={90} value={currentL}
                              className="hue-slider"
                              style={{ background: `linear-gradient(to right, hsl(${currentHue},70%,10%), hsl(${currentHue},70%,50%), hsl(${currentHue},70%,90%))`, width: '100%', pointerEvents: 'auto' }}
                              onChange={e => handleLightnessChange(colorKey, Number(e.target.value))}
                              onInput={e => handleLightnessChange(colorKey, Number((e.target as HTMLInputElement).value))}
                            />
                          </div>
                          {/* パレット */}
                          {paletteOpen === paletteKey && (
                            <>
                              <div
                                onClick={() => setPaletteOpen(null)}
                                style={{ position: 'fixed', inset: 0, zIndex: 0 }}
                              />
                              <div style={{ position: 'relative', zIndex: 1, backgroundColor: 'rgba(20,20,40,0.97)', borderRadius: 12, padding: 8, marginTop: 8, width: '100%', overflowX: 'hidden' }}>
                                <div style={{ display: 'flex', gap: '2px', marginBottom: '8px', flexWrap: 'wrap', width: '100%' }}>
                                  {THEME_COLORS.map((col, ci) => (
                                    <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      {col.map((c, ri) => (
                                        <button
                                          key={ri}
                                          onClick={() => applyColor(paletteKey, c)}
                                          style={{ width: 22, height: 16, borderRadius: 2, background: c, border: currentColor === c ? '2px solid white' : '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', padding: 0 }}
                                        />
                                      ))}
                                    </div>
                                  ))}
                                </div>
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                  {STANDARD_COLORS.map(c => (
                                    <button
                                      key={c}
                                      onClick={() => applyColor(paletteKey, c)}
                                      style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: currentColor === c ? '2px solid white' : '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', padding: 0 }}
                                    />
                                  ))}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )
                    }

                    return (
                      <>
                        {/* 背景 サブ折りたたみ */}
                        <div style={{ borderRadius: '8px', background: 'rgba(255,255,255,0.03)', marginTop: '8px', overflow: 'hidden' }}>
                          <div onClick={() => setOpenSubSection(p => p === 'bg' ? null : 'bg')} style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', cursor: 'pointer' }}>
                            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600 }}>🖼️ 背景</span>
                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>{openSubSection === 'bg' ? '▼' : '▶'}</span>
                          </div>
                          {openSubSection === 'bg' && (
                            <div style={{ padding: '8px 0' }}>

                              {/* サブセクション1: チャット背景 */}
                              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                <div onClick={() => setChatBgSubOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', cursor: 'pointer' }}>
                                  <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600 }}>💬 チャット背景</span>
                                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{chatBgSubOpen ? '▼' : '▶'}</span>
                                </div>
                                {chatBgSubOpen && (
                                  <div style={{ padding: '0 16px 16px' }}>
                                    <div style={{ height: '80px', borderRadius: '8px', background: chatCustomize.bgColor, marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                      <div style={{ background: chatCustomize.otherBubbleColor, borderRadius: '4px 12px 12px 12px', padding: '6px 10px' }}>
                                        <p style={{ color: chatCustomize.otherTextColor, fontSize: '11px', margin: 0 }}>こんにちは</p>
                                      </div>
                                      <div style={{ background: chatCustomize.myBubbleColor, borderRadius: '12px 4px 12px 12px', padding: '6px 10px' }}>
                                        <p style={{ color: chatCustomize.myTextColor, fontSize: '11px', margin: 0 }}>よろしく！</p>
                                      </div>
                                    </div>
                                    {renderSliderRow('bg', chatCustomize.bgColor, 'bg')}
                                    {periodSync.chatBg && (
                                      <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 10 }}>
                                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 8 }}>⏰ 時間帯別設定</div>
                                        {PERIODS.map(p => <PeriodColorPicker key={p} label="chatBg" colorKey={p}
                                          colors={periodChatColors.bg} setColors={c => setPeriodChatColors(prev => ({ ...prev, bg: c(prev.bg) as typeof prev.bg }))}
                                          hues={periodChatHue.bg} setHues={c => setPeriodChatHue(prev => ({ ...prev, bg: c(prev.bg) as typeof prev.bg }))}
                                          lightnesses={periodChatLightness.bg} setLightnesses={c => setPeriodChatLightness(prev => ({ ...prev, bg: c(prev.bg) as typeof prev.bg }))}
                                          openKey={openPeriodColorKey} setOpenKey={setOpenPeriodColorKey}
                                          paletteKey={paletteOpenPeriod} setPaletteKey={setPaletteOpenPeriod}
                                          previewBg={periodChatColors.bg[p]} previewMyBubble={periodChatColors.myBubble[p]} previewOtherBubble={periodChatColors.otherBubble[p]} previewMyText={periodChatColors.myText[p]} previewOtherText={periodChatColors.otherText[p]}
                                        />)}
                                      </div>
                                    )}
                                    <button onClick={() => { setChatCustomize(DEFAULT_CHAT_CUSTOMIZE); setHue(DEFAULT_CHAT_HUE); setLightness(DEFAULT_CHAT_LIGHTNESS) }} style={{ width: '100%', padding: '8px 0', borderRadius: 8, marginBottom: 6, marginTop: 8, background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer' }}>⟳ デフォルトに戻す</button>
                                    <button onClick={() => handleSave('bg')} style={{ backgroundColor: '#7c3aed', borderRadius: 8, padding: '10px 0', width: '100%', color: 'white', fontSize: 14, border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                                      {savedFeedback === 'bg' ? '保存しました ✓' : '保存する'}
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* サブセクション2: アバターチャット背景 */}
                              <div>
                                <div onClick={() => setAvatarBgSubOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', cursor: 'pointer' }}>
                                  <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600 }}>🧍 アバターチャット背景</span>
                                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{avatarBgSubOpen ? '▼' : '▶'}</span>
                                </div>
                                {avatarBgSubOpen && (
                                  <div style={{ padding: '0 16px 12px' }}>
                                    {/* プレビュー */}
                                    {(() => {
                                      const currentAvatarBgPreview =
                                        avatarChatBgMode === 'color' ? `hsl(${avatarBgHue},${avatarBgSaturation}%,${avatarBgLightness}%)`
                                        : avatarChatBgMode === 'image' && avatarChatBgImage ? `url(${avatarChatBgImage})`
                                        : avatarChatBg ?? '#0f0a1e'
                                      const displayAvatar = avatarChatAvatar ?? (savedAvatars.length > 0 ? savedAvatars[0].imageUrl : null)
                                      return (
                                        <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', height: '140px', marginBottom: '10px', background: avatarChatBg ?? '#0f0a1e' }}>
                                          <div style={{ position: 'absolute', inset: 0, background: currentAvatarBgPreview, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                                          <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '70px', height: '100px' }}>
                                            {displayAvatar ? <img src={displayAvatar} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} alt="avatar" /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>👤</div>}
                                          </div>
                                        </div>
                                      )
                                    })()}
                                    {/* 🎨 背景を変える */}
                                    <div onClick={() => setAvatarBgChangeOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                                      <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: 600 }}>🎨 背景を変える</span>
                                      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{avatarBgChangeOpen ? '▼' : '▶'}</span>
                                    </div>
                                    {avatarBgChangeOpen && (
                                      <div style={{ paddingBottom: 8 }}>
                                        <div style={{ display: 'flex', gap: '4px', marginBottom: 10 }}>
                                          {(['color', 'image', 'virtual'] as const).map(m => (
                                            <button key={m} onClick={() => setAvatarChatBgMode(m)} style={{ flex: 1, padding: '6px 2px', borderRadius: 8, background: avatarChatBgMode === m ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.05)', border: avatarChatBgMode === m ? '1px solid rgba(167,139,250,0.4)' : '1px solid rgba(255,255,255,0.1)', color: avatarChatBgMode === m ? '#c4b5fd' : 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                                              {m === 'color' ? '🎨 カラー' : m === 'image' ? '🖼️ 画像' : '✨ バーチャル'}
                                            </button>
                                          ))}
                                        </div>
                                        {avatarChatBgMode === 'color' && (() => {
                                          const applyHex = (c: string) => { const r=parseInt(c.slice(1,3),16)/255,g=parseInt(c.slice(3,5),16)/255,b=parseInt(c.slice(5,7),16)/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2,d=mx-mn; setAvatarBgLightness(Math.round(l*95)); if(d<0.001){setAvatarBgHue(0);setAvatarBgSaturation(0)}else{const s=l>0.5?d/(2-mx-mn):d/(mx+mn),h=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4;setAvatarBgHue(Math.round(h/6*360));setAvatarBgSaturation(Math.round(s*100))} }
                                          return (
                                          <div>
                                            <div style={{ height: 28, borderRadius: 8, background: `hsl(${avatarBgHue},${avatarBgSaturation}%,${avatarBgLightness}%)`, marginBottom: 8, border: '1px solid rgba(255,255,255,0.1)' }} />
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                              <div style={{ flex: 1, position: 'relative', height: '20px' }}>
                                                <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '6px', transform: 'translateY(-50%)', borderRadius: '3px', background: 'linear-gradient(to right, hsl(0,80%,55%), hsl(60,80%,55%), hsl(120,80%,55%), hsl(180,80%,55%), hsl(240,80%,55%), hsl(300,80%,55%), hsl(360,80%,55%))', pointerEvents: 'none' }} />
                                                <input type="range" min={0} max={360} value={avatarBgHue} style={{ position: 'absolute', inset: 0, width: '100%', opacity: 0, cursor: 'pointer', margin: 0 }} onChange={e => setAvatarBgHue(Number(e.target.value))} onInput={e => setAvatarBgHue(Number((e.target as HTMLInputElement).value))} />
                                                <div style={{ position: 'absolute', top: '50%', left: `calc(${avatarBgHue / 360 * 100}% - 8px)`, transform: 'translateY(-50%)', width: 16, height: 16, borderRadius: '50%', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.5)', pointerEvents: 'none' }} />
                                              </div>
                                              <button onClick={() => setAvatarBgPaletteOpen(p => !p)} style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0 }}>🎨</button>
                                            </div>
                                            <div style={{ position: 'relative', height: '20px', marginBottom: 6 }}>
                                              <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '6px', transform: 'translateY(-50%)', borderRadius: '3px', background: `linear-gradient(to right, hsl(${avatarBgHue},0%,${avatarBgLightness}%), hsl(${avatarBgHue},100%,${avatarBgLightness}%))`, pointerEvents: 'none' }} />
                                              <input type="range" min={0} max={100} value={avatarBgSaturation} style={{ position: 'absolute', inset: 0, width: '100%', opacity: 0, cursor: 'pointer', margin: 0 }} onChange={e => setAvatarBgSaturation(Number(e.target.value))} onInput={e => setAvatarBgSaturation(Number((e.target as HTMLInputElement).value))} />
                                              <div style={{ position: 'absolute', top: '50%', left: `calc(${avatarBgSaturation / 100 * 100}% - 8px)`, transform: 'translateY(-50%)', width: 16, height: 16, borderRadius: '50%', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.5)', pointerEvents: 'none' }} />
                                            </div>
                                            <div style={{ position: 'relative', height: '20px', marginBottom: 6 }}>
                                              <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '6px', transform: 'translateY(-50%)', borderRadius: '3px', background: `linear-gradient(to right, hsl(${avatarBgHue},${avatarBgSaturation}%,5%), hsl(${avatarBgHue},${avatarBgSaturation}%,50%), hsl(${avatarBgHue},${avatarBgSaturation}%,95%))`, pointerEvents: 'none' }} />
                                              <input type="range" min={0} max={95} value={avatarBgLightness} style={{ position: 'absolute', inset: 0, width: '100%', opacity: 0, cursor: 'pointer', margin: 0 }} onChange={e => setAvatarBgLightness(Number(e.target.value))} onInput={e => setAvatarBgLightness(Number((e.target as HTMLInputElement).value))} />
                                              <div style={{ position: 'absolute', top: '50%', left: `calc(${avatarBgLightness / 95 * 100}% - 8px)`, transform: 'translateY(-50%)', width: 16, height: 16, borderRadius: '50%', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.5)', pointerEvents: 'none' }} />
                                            </div>
                                            {avatarBgPaletteOpen && (
                                              <>
                                                <div onClick={() => setAvatarBgPaletteOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 0 }} />
                                                <div style={{ position: 'relative', zIndex: 1, marginTop: 8, padding: 10, borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, margin: '0 0 4px' }}>おすすめ</p>
                                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                                                    {AVATAR_BG_RECOMMEND.map(c => <button key={c} onClick={() => applyHex(c)} style={{ width: 20, height: 20, borderRadius: 4, background: c, border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', padding: 0 }} />)}
                                                  </div>
                                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 2, marginBottom: 8 }}>
                                                    {AVATAR_BG_PALETTE.map((c, i) => <button key={i} onClick={() => applyHex(c)} style={{ width: '100%', aspectRatio: '1', borderRadius: '2px', background: c, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', padding: 0 }} />)}
                                                  </div>
                                                  <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                                                    {AVATAR_BG_QUICK.map(c => <button key={c} onClick={() => applyHex(c)} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', padding: 0 }} />)}
                                                  </div>
                                                </div>
                                              </>
                                            )}
                                          </div>
                                          )
                                        })()}
                                        {avatarChatBgMode === 'image' && (
                                          <div>
                                            <input ref={avatarChatBgImageInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) setAvatarChatBgImage(URL.createObjectURL(f)) }} />
                                            <button onClick={() => avatarChatBgImageInputRef.current?.click()} style={{ width: '100%', padding: '10px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px dashed rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer', marginBottom: 8 }}>📷 写真をアップロード</button>
                                            {avatarChatBgImage && (
                                              <div style={{ position: 'relative', marginBottom: 8 }}>
                                                <img src={avatarChatBgImage} style={{ width: '100%', height: 60, objectFit: 'cover', borderRadius: 8, display: 'block' }} alt="bg" />
                                                <button onClick={() => setAvatarChatBgImage(null)} style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                        {avatarChatBgMode === 'virtual' && (() => {
                                          const VIRTUAL_BGSETS = [
                                            { label: '宇宙',    gradient: 'linear-gradient(135deg, #0d0221, #1a0533, #0d1b4b)' },
                                            { label: '夜の街',  gradient: 'linear-gradient(180deg, #0a0a2e 0%, #1a1040 50%, #0d0a1e 100%)' },
                                            { label: 'オーロラ',gradient: 'linear-gradient(135deg, #0d4f3c, #1a2a4a, #3d1a5c)' },
                                            { label: '夕焼け',  gradient: 'linear-gradient(135deg, #ff6b35, #f7931e, #ffcd3c)' },
                                            { label: '深海',    gradient: 'linear-gradient(180deg, #001233, #023e8a, #0077b6)' },
                                            { label: '桜',      gradient: 'linear-gradient(135deg, #ffecd2, #fcb69f, #ff9a9e)' },
                                          ]
                                          return (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: 8 }}>
                                              {VIRTUAL_BGSETS.map(bg => (
                                                <button key={bg.label} onClick={() => setAvatarChatBg(bg.gradient)} style={{ width: 64, height: 64, borderRadius: 10, background: bg.gradient, border: avatarChatBg === bg.gradient ? '2px solid #a78bfa' : '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', position: 'relative', flexShrink: 0, padding: 0 }}>
                                                  <span style={{ position: 'absolute', bottom: 3, left: 0, right: 0, textAlign: 'center', fontSize: 9, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{bg.label}</span>
                                                </button>
                                              ))}
                                            </div>
                                          )
                                        })()}
                                        <button onClick={() => { if (avatarChatBgMode === 'color') setAvatarChatBg(`hsl(${avatarBgHue},${avatarBgSaturation}%,${avatarBgLightness}%)`); else if (avatarChatBgMode === 'image') setAvatarChatBg(avatarChatBgImage ?? undefined) }} style={{ width: '100%', padding: '9px 0', borderRadius: 8, background: '#7c3aed', border: 'none', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                                          この背景を適用する
                                        </button>
                                      </div>
                                    )}
                                    {/* 👤 アバターを変える */}
                                    <div onClick={() => setAvatarAvatarChangeOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                                      <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: 600 }}>👤 アバターを変える</span>
                                      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{avatarAvatarChangeOpen ? '▼' : '▶'}</span>
                                    </div>
                                    {avatarAvatarChangeOpen && (
                                      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 4, paddingTop: 6 }}>
                                        <div onClick={() => setAvatarChatAvatar(null)} style={{ flexShrink: 0, width: '52px', height: '72px', borderRadius: '10px', border: avatarChatAvatar === null ? '2px solid #a78bfa' : '2px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', cursor: 'pointer' }}>👤</div>
                                        {savedAvatars.map(av => (
                                          <div key={av.id} onClick={() => setAvatarChatAvatar(av.imageUrl)} style={{ flexShrink: 0, width: '52px', height: '72px', borderRadius: '10px', border: avatarChatAvatar === av.imageUrl ? '2px solid #a78bfa' : '2px solid rgba(255,255,255,0.1)', overflow: 'hidden', cursor: 'pointer' }}>
                                            <img src={av.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} alt="avatar" />
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                            </div>
                          )}
                        </div>

                        {/* 吹き出し サブ折りたたみ */}
                        <div style={{ borderRadius: '8px', background: 'rgba(255,255,255,0.03)', marginTop: '8px', overflow: 'hidden' }}>
                          <div onClick={() => setOpenSubSection(p => p === 'bubble' ? null : 'bubble')} style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', cursor: 'pointer' }}>
                            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600 }}>💬 吹き出し</span>
                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>{openSubSection === 'bubble' ? '▼' : '▶'}</span>
                          </div>
                          {openSubSection === 'bubble' && (
                            <div style={{ padding: '8px 0' }}>

                              {/* プレビュー */}
                              <div style={{ padding: '0 16px 12px' }}>
                                <div style={{ height: '80px', borderRadius: '8px', background: chatCustomize.bgColor, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                  <div style={{ background: chatCustomize.otherBubbleColor, borderRadius: '4px 12px 12px 12px', padding: '6px 10px' }}>
                                    <p style={{ color: chatCustomize.otherTextColor, fontSize: '11px', margin: 0 }}>相手</p>
                                  </div>
                                  <div style={{ background: chatCustomize.myBubbleColor, borderRadius: '12px 4px 12px 12px', padding: '6px 10px' }}>
                                    <p style={{ color: chatCustomize.myTextColor, fontSize: '11px', margin: 0 }}>自分</p>
                                  </div>
                                </div>
                              </div>

                              {/* サブセクション1: 自分の吹き出し */}
                              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                <div onClick={() => setMyBubbleSubOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', cursor: 'pointer' }}>
                                  <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600 }}>🟣 自分の吹き出し</span>
                                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{myBubbleSubOpen ? '▼' : '▶'}</span>
                                </div>
                                {myBubbleSubOpen && (
                                  <div style={{ padding: '0 16px 16px' }}>
                                    {renderSliderRow('myBubble', chatCustomize.myBubbleColor, 'myBubble')}
                                    {periodSync.chatBubble && (
                                      <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 10 }}>
                                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 4 }}>⏰ 時間帯別設定</div>
                                        {PERIODS.map(p => <PeriodColorPicker key={p} label="myBubble" colorKey={p}
                                          colors={periodChatColors.myBubble} setColors={c => setPeriodChatColors(prev => ({ ...prev, myBubble: c(prev.myBubble) as typeof prev.myBubble }))}
                                          hues={periodChatHue.myBubble} setHues={c => setPeriodChatHue(prev => ({ ...prev, myBubble: c(prev.myBubble) as typeof prev.myBubble }))}
                                          lightnesses={periodChatLightness.myBubble} setLightnesses={c => setPeriodChatLightness(prev => ({ ...prev, myBubble: c(prev.myBubble) as typeof prev.myBubble }))}
                                          openKey={openPeriodColorKey} setOpenKey={setOpenPeriodColorKey}
                                          paletteKey={paletteOpenPeriod} setPaletteKey={setPaletteOpenPeriod}
                                          previewBg={periodChatColors.bg[p]} previewMyBubble={periodChatColors.myBubble[p]} previewOtherBubble={periodChatColors.otherBubble[p]} previewMyText={periodChatColors.myText[p]} previewOtherText={periodChatColors.otherText[p]}
                                        />)}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* サブセクション2: 相手の吹き出し */}
                              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                <div onClick={() => setTheirBubbleSubOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', cursor: 'pointer' }}>
                                  <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600 }}>🔵 相手の吹き出し</span>
                                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{theirBubbleSubOpen ? '▼' : '▶'}</span>
                                </div>
                                {theirBubbleSubOpen && (
                                  <div style={{ padding: '0 16px 16px' }}>
                                    {renderSliderRow('otherBubble', chatCustomize.otherBubbleColor, 'otherBubble')}
                                    {periodSync.chatBubble && (
                                      <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 10 }}>
                                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 4 }}>⏰ 時間帯別設定</div>
                                        {PERIODS.map(p => <PeriodColorPicker key={p} label="otherBubble" colorKey={p}
                                          colors={periodChatColors.otherBubble} setColors={c => setPeriodChatColors(prev => ({ ...prev, otherBubble: c(prev.otherBubble) as typeof prev.otherBubble }))}
                                          hues={periodChatHue.otherBubble} setHues={c => setPeriodChatHue(prev => ({ ...prev, otherBubble: c(prev.otherBubble) as typeof prev.otherBubble }))}
                                          lightnesses={periodChatLightness.otherBubble} setLightnesses={c => setPeriodChatLightness(prev => ({ ...prev, otherBubble: c(prev.otherBubble) as typeof prev.otherBubble }))}
                                          openKey={openPeriodColorKey} setOpenKey={setOpenPeriodColorKey}
                                          paletteKey={paletteOpenPeriod} setPaletteKey={setPaletteOpenPeriod}
                                          previewBg={periodChatColors.bg[p]} previewMyBubble={periodChatColors.myBubble[p]} previewOtherBubble={periodChatColors.otherBubble[p]} previewMyText={periodChatColors.myText[p]} previewOtherText={periodChatColors.otherText[p]}
                                        />)}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* デフォルトに戻す・保存ボタン */}
                              <div style={{ padding: '12px 16px 8px' }}>
                                <button onClick={() => { setChatCustomize(DEFAULT_CHAT_CUSTOMIZE); setHue(DEFAULT_CHAT_HUE); setLightness(DEFAULT_CHAT_LIGHTNESS) }} style={{ width: '100%', padding: '8px 0', borderRadius: 8, marginBottom: 6, background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer' }}>⟳ デフォルトに戻す</button>
                                <button onClick={() => handleSave('bubble')} style={{ backgroundColor: '#7c3aed', borderRadius: 8, padding: '10px 0', width: '100%', color: 'white', fontSize: 14, border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                                  {savedFeedback === 'bubble' ? '保存しました ✓' : '保存する'}
                                </button>
                              </div>

                            </div>
                          )}
                        </div>

                        {/* 文字色 サブ折りたたみ */}
                        <div style={{ borderRadius: '8px', background: 'rgba(255,255,255,0.03)', marginTop: '8px', overflow: 'hidden' }}>
                          <div onClick={() => setOpenSubSection(p => p === 'text' ? null : 'text')} style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', cursor: 'pointer' }}>
                            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600 }}>🔤 文字色</span>
                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>{openSubSection === 'text' ? '▼' : '▶'}</span>
                          </div>
                          {openSubSection === 'text' && (
                            <div style={{ padding: '8px 0' }}>

                              {/* プレビュー */}
                              <div style={{ padding: '0 16px 12px' }}>
                                <div style={{ background: chatCustomize.bgColor, borderRadius: 10, padding: '12px 10px', display: 'flex', justifyContent: 'space-between', border: '1px solid rgba(255,255,255,0.1)' }}>
                                  <div style={{ background: chatCustomize.otherBubbleColor, borderRadius: 12, padding: '6px 10px' }}>
                                    <span style={{ color: chatCustomize.otherTextColor, fontSize: 12 }}>こんにちは</span>
                                  </div>
                                  <div style={{ background: chatCustomize.myBubbleColor, borderRadius: 12, padding: '6px 10px' }}>
                                    <span style={{ color: chatCustomize.myTextColor, fontSize: 12 }}>よろしく！</span>
                                  </div>
                                </div>
                              </div>

                              {/* サブセクション1: 自分の文字色 */}
                              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                <div onClick={() => setMyTextSubOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', cursor: 'pointer' }}>
                                  <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600 }}>🟣 自分の文字色</span>
                                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{myTextSubOpen ? '▼' : '▶'}</span>
                                </div>
                                {myTextSubOpen && (
                                  <div style={{ padding: '0 16px 16px' }}>
                                    {renderSliderRow('myText', chatCustomize.myTextColor, 'myText')}
                                    {periodSync.chatText && (
                                      <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 10 }}>
                                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 4 }}>⏰ 時間帯別設定</div>
                                        {PERIODS.map(p => <PeriodColorPicker key={p} label="myText" colorKey={p}
                                          colors={periodChatColors.myText} setColors={c => setPeriodChatColors(prev => ({ ...prev, myText: c(prev.myText) as typeof prev.myText }))}
                                          hues={periodChatHue.myText} setHues={c => setPeriodChatHue(prev => ({ ...prev, myText: c(prev.myText) as typeof prev.myText }))}
                                          lightnesses={periodChatLightness.myText} setLightnesses={c => setPeriodChatLightness(prev => ({ ...prev, myText: c(prev.myText) as typeof prev.myText }))}
                                          openKey={openPeriodColorKey} setOpenKey={setOpenPeriodColorKey}
                                          paletteKey={paletteOpenPeriod} setPaletteKey={setPaletteOpenPeriod}
                                        />)}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* サブセクション2: 相手の文字色 */}
                              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                <div onClick={() => setTheirTextSubOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', cursor: 'pointer' }}>
                                  <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600 }}>🔵 相手の文字色</span>
                                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{theirTextSubOpen ? '▼' : '▶'}</span>
                                </div>
                                {theirTextSubOpen && (
                                  <div style={{ padding: '0 16px 16px' }}>
                                    {renderSliderRow('otherText', chatCustomize.otherTextColor, 'otherText')}
                                    {periodSync.chatText && (
                                      <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 10 }}>
                                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 4 }}>⏰ 時間帯別設定</div>
                                        {PERIODS.map(p => <PeriodColorPicker key={p} label="otherText" colorKey={p}
                                          colors={periodChatColors.otherText} setColors={c => setPeriodChatColors(prev => ({ ...prev, otherText: c(prev.otherText) as typeof prev.otherText }))}
                                          hues={periodChatHue.otherText} setHues={c => setPeriodChatHue(prev => ({ ...prev, otherText: c(prev.otherText) as typeof prev.otherText }))}
                                          lightnesses={periodChatLightness.otherText} setLightnesses={c => setPeriodChatLightness(prev => ({ ...prev, otherText: c(prev.otherText) as typeof prev.otherText }))}
                                          openKey={openPeriodColorKey} setOpenKey={setOpenPeriodColorKey}
                                          paletteKey={paletteOpenPeriod} setPaletteKey={setPaletteOpenPeriod}
                                        />)}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* デフォルトに戻す・保存ボタン */}
                              <div style={{ padding: '12px 16px 8px' }}>
                                <button onClick={() => { setChatCustomize(DEFAULT_CHAT_CUSTOMIZE); setHue(DEFAULT_CHAT_HUE); setLightness(DEFAULT_CHAT_LIGHTNESS) }} style={{ width: '100%', padding: '8px 0', borderRadius: 8, marginBottom: 6, background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer' }}>⟳ デフォルトに戻す</button>
                                <button onClick={() => handleSave('text')} style={{ backgroundColor: '#7c3aed', borderRadius: 8, padding: '10px 0', width: '100%', color: 'white', fontSize: 14, border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                                  {savedFeedback === 'text' ? '保存しました ✓' : '保存する'}
                                </button>
                              </div>

                            </div>
                          )}
                        </div>
                      </>
                    )
                  })()}

                </div>
              )}
            </div>

            {/* 外観設定 親折りたたみ */}
            <div style={{ borderRadius: '12px', background: 'rgba(255,255,255,0.05)', marginBottom: '8px', overflow: 'hidden' }}>
              <div onClick={() => setOuterOpen(p => !p)} style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', cursor: 'pointer' }}>
                <span style={{ color: 'white', fontSize: '14px', fontWeight: 600 }}>🎨 外観設定</span>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>{outerOpen ? '▼' : '▶'}</span>
              </div>
              {outerOpen && (
                <div style={{ padding: '0 12px 12px' }}>
                  {(() => {
                    const THEME_COLORS_A = [
                      ['#1a0000','#330000','#660000','#990000','#cc0000','#ff0000','#ff4d4d','#ff9999','#ffcccc','#fff0f0'],
                      ['#1a0d00','#331a00','#663300','#994d00','#cc6600','#ff8000','#ffaa4d','#ffcc99','#ffe5cc','#fff5e6'],
                      ['#1a1a00','#333300','#666600','#999900','#cccc00','#ffff00','#ffff4d','#ffff99','#ffffcc','#fffff0'],
                      ['#001a00','#003300','#006600','#009900','#00cc00','#00ff00','#4dff4d','#99ff99','#ccffcc','#f0fff0'],
                      ['#001a1a','#003333','#006666','#009999','#00cccc','#00ffff','#4dffff','#99ffff','#ccffff','#f0ffff'],
                      ['#00001a','#000033','#000066','#000099','#0000cc','#0000ff','#4d4dff','#9999ff','#ccccff','#f0f0ff'],
                      ['#0d001a','#1a0033','#330066','#4d0099','#6600cc','#8000ff','#aa4dff','#cc99ff','#e5ccff','#f5e6ff'],
                      ['#1a0011','#330022','#660044','#990066','#cc0088','#ff00aa','#ff4dc4','#ff99dd','#ffcced','#fff0f8'],
                      ['#0a0a0a','#1a1a1a','#333333','#4d4d4d','#666666','#808080','#999999','#b3b3b3','#cccccc','#e6e6e6'],
                      ['#ffffff','#f5f5f5','#ebebeb','#e0e0e0','#d6d6d6','#cccccc','#c2c2c2','#b8b8b8','#adadad','#a3a3a3'],
                    ]
                    const STANDARD_A = ['#c00000','#ff0000','#ffc000','#ffff00','#92d050','#00b050','#00b0f0','#0070c0','#002060','#7030a0']

                    const handleAppearanceSave = (section: string) => {
                      try {
                        localStorage.setItem('appearanceCustomize', JSON.stringify(appearanceCustomize))
                        localStorage.setItem('periodAppearanceColors', JSON.stringify(periodAppearanceColors))
                        setSavedFeedbackAppearance(section); setTimeout(() => setSavedFeedbackAppearance(null), 1500)
                      } catch (e) { console.error(e) }
                    }
                    const PERIODS_A: Array<'morning' | 'afternoon' | 'evening' | 'night'> = ['morning', 'afternoon', 'evening', 'night']

                    const renderAppearanceSlider = (subKey: 'tabBg' | 'tabText' | 'tabActive', currentColor: string, label: string) => {
                      const h = hueAppearance[subKey]; const l = lightnessAppearance[subKey]
                      const color = `hsl(${h}, 70%, ${l}%)`
                      const applyA = (c: string) => {
                        if (subKey === 'tabBg') setAppearanceCustomize((p: typeof appearanceCustomize) => ({ ...p, tabBgColor: c }))
                        else if (subKey === 'tabText') setAppearanceCustomize((p: typeof appearanceCustomize) => ({ ...p, tabTextColor: c }))
                        else setAppearanceCustomize((p: typeof appearanceCustomize) => ({ ...p, tabActiveColor: c }))
                      }
                      return (
                        <div style={{ marginBottom: '10px' }} key={subKey}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: color, flexShrink: 0, border: '1px solid rgba(255,255,255,0.2)' }} />
                            <div style={{ flex: 1 }}>
                              <input className="hue-slider" type="range" min={0} max={360} value={h}
                                onChange={e => { const v = Number(e.target.value); setHueAppearance(p => ({ ...p, [subKey]: v })); applyA(`hsl(${v}, 70%, ${l}%)`) }}
                                onInput={e => { const v = Number((e.target as HTMLInputElement).value); setHueAppearance(p => ({ ...p, [subKey]: v })); applyA(`hsl(${v}, 70%, ${l}%)`) }}
                                style={{ width: '100%', pointerEvents: 'auto' }} />
                            </div>
                            <button onClick={() => setPaletteOpenAppearance(p => p === subKey ? null : subKey)} style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>🎨</button>
                          </div>
                          <div style={{ paddingLeft: '40px', paddingRight: '40px', marginBottom: '6px' }}>
                            <input type="range" min={10} max={90} value={l} className="hue-slider"
                              style={{ background: `linear-gradient(to right, hsl(${h},70%,10%), hsl(${h},70%,50%), hsl(${h},70%,90%))`, width: '100%', pointerEvents: 'auto' }}
                              onChange={e => { const v = Number(e.target.value); setLightnessAppearance(p => ({ ...p, [subKey]: v })); applyA(`hsl(${h}, 70%, ${v}%)`) }}
                              onInput={e => { const v = Number((e.target as HTMLInputElement).value); setLightnessAppearance(p => ({ ...p, [subKey]: v })); applyA(`hsl(${h}, 70%, ${v}%)`) }} />
                          </div>
                          {paletteOpenAppearance === subKey && (
                            <>
                              <div onClick={() => setPaletteOpenAppearance(null)} style={{ position: 'fixed', inset: 0, zIndex: 0 }} />
                              <div style={{ position: 'relative', zIndex: 1, backgroundColor: 'rgba(20,20,40,0.97)', borderRadius: 12, padding: 8, marginTop: 8 }}>
                                <div style={{ display: 'flex', gap: '2px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                  {THEME_COLORS_A.map((col, ci) => (
                                    <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      {col.map((c, ri) => <button key={ri} onClick={() => applyA(c)} style={{ width: 22, height: 16, borderRadius: 2, background: c, border: currentColor === c ? '2px solid white' : '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', padding: 0 }} />)}
                                    </div>
                                  ))}
                                </div>
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                  {STANDARD_A.map(c => <button key={c} onClick={() => applyA(c)} style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: currentColor === c ? '2px solid white' : '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', padding: 0 }} />)}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )
                    }

                    return (
                      <>
                        {/* タブ背景色 */}
                        <div style={{ borderRadius: '8px', background: 'rgba(255,255,255,0.03)', marginTop: '8px', overflow: 'hidden' }}>
                          <div onClick={() => setOpenSubAppearance(p => p === 'tabBg' ? null : 'tabBg')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', cursor: 'pointer' }}>
                            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600 }}>🖼️ タブ背景色</span>
                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>{openSubAppearance === 'tabBg' ? '▼' : '▶'}</span>
                          </div>
                          {openSubAppearance === 'tabBg' && (
                            <div style={{ padding: '0 12px 12px' }}>
                              <div style={{ height: '48px', borderRadius: '8px', background: appearanceCustomize.tabBgColor, marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                {['Profile','Museum','Decoration'].map((t, i) => <span key={i} style={{ color: i === 1 ? appearanceCustomize.tabActiveColor : appearanceCustomize.tabTextColor, fontSize: '11px', fontWeight: i === 1 ? 700 : 400, borderBottom: i === 1 ? `2px solid ${appearanceCustomize.tabActiveColor}` : 'none', paddingBottom: '2px' }}>{t}</span>)}
                              </div>
                              {renderAppearanceSlider('tabBg', appearanceCustomize.tabBgColor, 'タブ背景色')}
                              {periodSync.appearance && (
                                <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 10 }}>
                                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 8 }}>⏰ 時間帯別設定</div>
                                  {PERIODS_A.map(p => <PeriodColorPicker key={p} label="tabBg" colorKey={p} colors={periodAppearanceColors.tabBg} setColors={c => setPeriodAppearanceColors(prev => ({ ...prev, tabBg: c(prev.tabBg) as typeof prev.tabBg }))} hues={{ morning:0, afternoon:0, evening:0, night:0 }} setHues={() => {}} lightnesses={{ morning:50, afternoon:50, evening:50, night:50 }} setLightnesses={() => {}} openKey={openPeriodColorKey} setOpenKey={setOpenPeriodColorKey} paletteKey={paletteOpenPeriod} setPaletteKey={setPaletteOpenPeriod} />)}
                                </div>
                              )}
                              <button onClick={() => setAppearanceCustomize(DEFAULT_APPEARANCE_CUSTOMIZE)} style={{ width: '100%', padding: '8px 0', borderRadius: 8, marginBottom: 6, background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer' }}>⟳ デフォルトに戻す</button>
                              <button onClick={() => handleAppearanceSave('tabBg')} style={{ backgroundColor: '#7c3aed', borderRadius: 8, padding: '10px 0', width: '100%', color: 'white', fontSize: 14, border: 'none', cursor: 'pointer', fontWeight: 600, marginTop: 0 }}>
                                {savedFeedbackAppearance === 'tabBg' ? '保存しました ✓' : '保存する'}
                              </button>
                            </div>
                          )}
                        </div>
                        {/* タブ文字色 */}
                        <div style={{ borderRadius: '8px', background: 'rgba(255,255,255,0.03)', marginTop: '8px', overflow: 'hidden' }}>
                          <div onClick={() => setOpenSubAppearance(p => p === 'tabText' ? null : 'tabText')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', cursor: 'pointer' }}>
                            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600 }}>🔤 タブ文字色</span>
                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>{openSubAppearance === 'tabText' ? '▼' : '▶'}</span>
                          </div>
                          {openSubAppearance === 'tabText' && (
                            <div style={{ padding: '0 12px 12px' }}>
                              <div style={{ height: '48px', borderRadius: '8px', background: appearanceCustomize.tabBgColor, marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                {['Profile','Museum','Decoration'].map((t, i) => <span key={i} style={{ color: i === 1 ? appearanceCustomize.tabActiveColor : appearanceCustomize.tabTextColor, fontSize: '11px' }}>{t}</span>)}
                              </div>
                              {renderAppearanceSlider('tabText', appearanceCustomize.tabTextColor, 'タブ文字色')}
                              {periodSync.appearance && (
                                <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 10 }}>
                                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 8 }}>⏰ 時間帯別設定</div>
                                  {PERIODS_A.map(p => <PeriodColorPicker key={p} label="tabText" colorKey={p} colors={periodAppearanceColors.tabText} setColors={c => setPeriodAppearanceColors(prev => ({ ...prev, tabText: c(prev.tabText) as typeof prev.tabText }))} hues={{ morning:0, afternoon:0, evening:0, night:0 }} setHues={() => {}} lightnesses={{ morning:50, afternoon:50, evening:50, night:50 }} setLightnesses={() => {}} paletteKey={paletteOpenPeriod} setPaletteKey={setPaletteOpenPeriod} openKey={openPeriodColorKey} setOpenKey={setOpenPeriodColorKey} />)}
                                </div>
                              )}
                              <button onClick={() => setAppearanceCustomize(DEFAULT_APPEARANCE_CUSTOMIZE)} style={{ width: '100%', padding: '8px 0', borderRadius: 8, marginBottom: 6, background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer' }}>⟳ デフォルトに戻す</button>
                              <button onClick={() => handleAppearanceSave('tabText')} style={{ backgroundColor: '#7c3aed', borderRadius: 8, padding: '10px 0', width: '100%', color: 'white', fontSize: 14, border: 'none', cursor: 'pointer', fontWeight: 600, marginTop: 0 }}>
                                {savedFeedbackAppearance === 'tabText' ? '保存しました ✓' : '保存する'}
                              </button>
                            </div>
                          )}
                        </div>
                        {/* タブアクティブ色 */}
                        <div style={{ borderRadius: '8px', background: 'rgba(255,255,255,0.03)', marginTop: '8px', overflow: 'hidden' }}>
                          <div onClick={() => setOpenSubAppearance(p => p === 'tabActive' ? null : 'tabActive')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', cursor: 'pointer' }}>
                            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600 }}>✨ タブアクティブ色</span>
                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>{openSubAppearance === 'tabActive' ? '▼' : '▶'}</span>
                          </div>
                          {openSubAppearance === 'tabActive' && (
                            <div style={{ padding: '0 12px 12px' }}>
                              <div style={{ height: '48px', borderRadius: '8px', background: appearanceCustomize.tabBgColor, marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                {['Profile','Museum','Decoration'].map((t, i) => <span key={i} style={{ color: i === 1 ? appearanceCustomize.tabActiveColor : appearanceCustomize.tabTextColor, fontSize: '11px', fontWeight: i === 1 ? 700 : 400, borderBottom: i === 1 ? `2px solid ${appearanceCustomize.tabActiveColor}` : 'none', paddingBottom: '2px' }}>{t}</span>)}
                              </div>
                              {renderAppearanceSlider('tabActive', appearanceCustomize.tabActiveColor, 'アクティブ色')}
                              {periodSync.appearance && (
                                <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 10 }}>
                                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 8 }}>⏰ 時間帯別設定</div>
                                  {PERIODS_A.map(p => <PeriodColorPicker key={p} label="tabActive" colorKey={p} colors={periodAppearanceColors.tabActive} setColors={c => setPeriodAppearanceColors(prev => ({ ...prev, tabActive: c(prev.tabActive) as typeof prev.tabActive }))} hues={{ morning:0, afternoon:0, evening:0, night:0 }} setHues={() => {}} lightnesses={{ morning:50, afternoon:50, evening:50, night:50 }} setLightnesses={() => {}} paletteKey={paletteOpenPeriod} setPaletteKey={setPaletteOpenPeriod} openKey={openPeriodColorKey} setOpenKey={setOpenPeriodColorKey} />)}
                                </div>
                              )}
                              <button onClick={() => setAppearanceCustomize(DEFAULT_APPEARANCE_CUSTOMIZE)} style={{ width: '100%', padding: '8px 0', borderRadius: 8, marginBottom: 6, background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer' }}>⟳ デフォルトに戻す</button>
                              <button onClick={() => handleAppearanceSave('tabActive')} style={{ backgroundColor: '#7c3aed', borderRadius: 8, padding: '10px 0', width: '100%', color: 'white', fontSize: 14, border: 'none', cursor: 'pointer', fontWeight: 600, marginTop: 0 }}>
                                {savedFeedbackAppearance === 'tabActive' ? '保存しました ✓' : '保存する'}
                              </button>
                            </div>
                          )}
                        </div>
                        {/* Museum編集ボタン絵文字・ドアのアレンジ */}
                        <div style={{ padding: '4px 0 4px', marginTop: '8px' }}>
                          <div onClick={() => setDecorSubPage('emoji')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }}>
                            <span style={{ color: 'white', fontSize: 14 }}>🎨 Museum編集ボタン絵文字</span>
                            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{editBtnEmoji} ›</span>
                          </div>
                          <div onClick={() => setDecorSubPage('zukan')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', cursor: 'pointer' }}>
                            <span style={{ color: 'white', fontSize: 14 }}>📚 ドアのアレンジ</span>
                            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>図鑑から ›</span>
                          </div>
                        </div>
                      </>
                    )
                  })()}
                </div>
              )}
            </div>

            {/* ナビ設定 親折りたたみ */}
            <div style={{ borderRadius: '12px', background: 'rgba(255,255,255,0.05)', marginBottom: '8px', overflow: 'hidden' }}>
              <div onClick={() => setNaviOpen(p => !p)} style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', cursor: 'pointer' }}>
                <span style={{ color: 'white', fontSize: '14px', fontWeight: 600 }}>🧭 ナビ設定</span>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>{naviOpen ? '▼' : '▶'}</span>
              </div>
              {naviOpen && (
                <div style={{ padding: '0 12px 12px' }}>
                  {(() => {
                    const THEME_COLORS_N = [
                      ['#1a0000','#330000','#660000','#990000','#cc0000','#ff0000','#ff4d4d','#ff9999','#ffcccc','#fff0f0'],
                      ['#1a0d00','#331a00','#663300','#994d00','#cc6600','#ff8000','#ffaa4d','#ffcc99','#ffe5cc','#fff5e6'],
                      ['#1a1a00','#333300','#666600','#999900','#cccc00','#ffff00','#ffff4d','#ffff99','#ffffcc','#fffff0'],
                      ['#001a00','#003300','#006600','#009900','#00cc00','#00ff00','#4dff4d','#99ff99','#ccffcc','#f0fff0'],
                      ['#001a1a','#003333','#006666','#009999','#00cccc','#00ffff','#4dffff','#99ffff','#ccffff','#f0ffff'],
                      ['#00001a','#000033','#000066','#000099','#0000cc','#0000ff','#4d4dff','#9999ff','#ccccff','#f0f0ff'],
                      ['#0d001a','#1a0033','#330066','#4d0099','#6600cc','#8000ff','#aa4dff','#cc99ff','#e5ccff','#f5e6ff'],
                      ['#1a0011','#330022','#660044','#990066','#cc0088','#ff00aa','#ff4dc4','#ff99dd','#ffcced','#fff0f8'],
                      ['#0a0a0a','#1a1a1a','#333333','#4d4d4d','#666666','#808080','#999999','#b3b3b3','#cccccc','#e6e6e6'],
                      ['#ffffff','#f5f5f5','#ebebeb','#e0e0e0','#d6d6d6','#cccccc','#c2c2c2','#b8b8b8','#adadad','#a3a3a3'],
                    ]
                    const STANDARD_N = ['#c00000','#ff0000','#ffc000','#ffff00','#92d050','#00b050','#00b0f0','#0070c0','#002060','#7030a0']

                    const handleNaviSave = (section: string) => {
                      try {
                        localStorage.setItem('naviCustomize', JSON.stringify(naviCustomize))
                        localStorage.setItem('periodNaviColors', JSON.stringify(periodNaviColors))
                        setSavedFeedbackNavi(section); setTimeout(() => setSavedFeedbackNavi(null), 1500)
                      } catch (e) { console.error(e) }
                    }
                    const PERIODS_N: Array<'morning' | 'afternoon' | 'evening' | 'night'> = ['morning', 'afternoon', 'evening', 'night']

                    const renderNaviSlider = (subKey: 'bg' | 'text' | 'active', currentColor: string) => {
                      const h = hueNavi[subKey]; const l = lightnessNavi[subKey]
                      const applyN = (c: string) => {
                        if (subKey === 'bg') setNaviCustomize((p: typeof naviCustomize) => ({ ...p, bgColor: c }))
                        else if (subKey === 'text') setNaviCustomize((p: typeof naviCustomize) => ({ ...p, textColor: c }))
                        else setNaviCustomize((p: typeof naviCustomize) => ({ ...p, activeColor: c }))
                      }
                      return (
                        <div style={{ marginBottom: '10px' }} key={subKey}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: `hsl(${h}, 70%, ${l}%)`, flexShrink: 0, border: '1px solid rgba(255,255,255,0.2)' }} />
                            <div style={{ flex: 1 }}>
                              <input className="hue-slider" type="range" min={0} max={360} value={h}
                                onChange={e => { const v = Number(e.target.value); setHueNavi(p => ({ ...p, [subKey]: v })); applyN(`hsl(${v}, 70%, ${l}%)`) }}
                                onInput={e => { const v = Number((e.target as HTMLInputElement).value); setHueNavi(p => ({ ...p, [subKey]: v })); applyN(`hsl(${v}, 70%, ${l}%)`) }}
                                style={{ width: '100%', pointerEvents: 'auto' }} />
                            </div>
                            <button onClick={() => setPaletteOpenNavi(p => p === subKey ? null : subKey)} style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>🎨</button>
                          </div>
                          <div style={{ paddingLeft: '40px', paddingRight: '40px', marginBottom: '6px' }}>
                            <input type="range" min={10} max={90} value={l} className="hue-slider"
                              style={{ background: `linear-gradient(to right, hsl(${h},70%,10%), hsl(${h},70%,50%), hsl(${h},70%,90%))`, width: '100%', pointerEvents: 'auto' }}
                              onChange={e => { const v = Number(e.target.value); setLightnessNavi(p => ({ ...p, [subKey]: v })); applyN(`hsl(${h}, 70%, ${v}%)`) }}
                              onInput={e => { const v = Number((e.target as HTMLInputElement).value); setLightnessNavi(p => ({ ...p, [subKey]: v })); applyN(`hsl(${h}, 70%, ${v}%)`) }} />
                          </div>
                          {paletteOpenNavi === subKey && (
                            <>
                              <div onClick={() => setPaletteOpenNavi(null)} style={{ position: 'fixed', inset: 0, zIndex: 0 }} />
                              <div style={{ position: 'relative', zIndex: 1, backgroundColor: 'rgba(20,20,40,0.97)', borderRadius: 12, padding: 8, marginTop: 8 }}>
                                <div style={{ display: 'flex', gap: '2px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                  {THEME_COLORS_N.map((col, ci) => (
                                    <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      {col.map((c, ri) => <button key={ri} onClick={() => applyN(c)} style={{ width: 22, height: 16, borderRadius: 2, background: c, border: currentColor === c ? '2px solid white' : '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', padding: 0 }} />)}
                                    </div>
                                  ))}
                                </div>
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                  {STANDARD_N.map(c => <button key={c} onClick={() => applyN(c)} style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: currentColor === c ? '2px solid white' : '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', padding: 0 }} />)}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )
                    }

                    return (
                      <>
                        {/* ナビ背景色 */}
                        <div style={{ borderRadius: '8px', background: 'rgba(255,255,255,0.03)', marginTop: '8px', overflow: 'hidden' }}>
                          <div onClick={() => setOpenSubNavi(p => p === 'bg' ? null : 'bg')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', cursor: 'pointer' }}>
                            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600 }}>🟦 ナビ背景色</span>
                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>{openSubNavi === 'bg' ? '▼' : '▶'}</span>
                          </div>
                          {openSubNavi === 'bg' && (
                            <div style={{ padding: '0 12px 12px' }}>
                              <div style={{ height: '48px', borderRadius: '8px', background: naviCustomize.bgColor, marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-around', border: '1px solid rgba(255,255,255,0.1)' }}>
                                {[['🏛️','Museum'],['🌐','Room'],['🔍','Explore']].map(([ic, lb], i) => (
                                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                    <span style={{ fontSize: '16px' }}>{ic}</span>
                                    <span style={{ color: naviCustomize.textColor, fontSize: '9px' }}>{lb}</span>
                                  </div>
                                ))}
                              </div>
                              {renderNaviSlider('bg', naviCustomize.bgColor)}
                              {periodSync.navi && (
                                <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 10 }}>
                                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 8 }}>⏰ 時間帯別設定</div>
                                  {PERIODS_N.map(p => <PeriodColorPicker key={p} label="naviBg" colorKey={p} colors={periodNaviColors.bg} setColors={c => setPeriodNaviColors(prev => ({ ...prev, bg: c(prev.bg) as typeof prev.bg }))} hues={{ morning:0, afternoon:0, evening:0, night:0 }} setHues={() => {}} lightnesses={{ morning:50, afternoon:50, evening:50, night:50 }} setLightnesses={() => {}} paletteKey={paletteOpenPeriod} setPaletteKey={setPaletteOpenPeriod} openKey={openPeriodColorKey} setOpenKey={setOpenPeriodColorKey} />)}
                                </div>
                              )}
                              <button onClick={() => setNaviCustomize(DEFAULT_NAVI_CUSTOMIZE)} style={{ width: '100%', padding: '8px 0', borderRadius: 8, marginBottom: 6, background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer' }}>⟳ デフォルトに戻す</button>
                              <button onClick={() => handleNaviSave('bg')} style={{ backgroundColor: '#7c3aed', borderRadius: 8, padding: '10px 0', width: '100%', color: 'white', fontSize: 14, border: 'none', cursor: 'pointer', fontWeight: 600, marginTop: 0 }}>
                                {savedFeedbackNavi === 'bg' ? '保存しました ✓' : '保存する'}
                              </button>
                            </div>
                          )}
                        </div>
                        {/* ナビ文字色 */}
                        <div style={{ borderRadius: '8px', background: 'rgba(255,255,255,0.03)', marginTop: '8px', overflow: 'hidden' }}>
                          <div onClick={() => setOpenSubNavi(p => p === 'text' ? null : 'text')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', cursor: 'pointer' }}>
                            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600 }}>🔤 ナビ文字色</span>
                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>{openSubNavi === 'text' ? '▼' : '▶'}</span>
                          </div>
                          {openSubNavi === 'text' && (
                            <div style={{ padding: '0 12px 12px' }}>
                              <div style={{ height: '48px', borderRadius: '8px', background: naviCustomize.bgColor, marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-around', border: '1px solid rgba(255,255,255,0.1)' }}>
                                {[['🏛️','Museum'],['🌐','Room'],['🔍','Explore']].map(([ic, lb], i) => (
                                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                    <span style={{ fontSize: '16px' }}>{ic}</span>
                                    <span style={{ color: naviCustomize.textColor, fontSize: '9px' }}>{lb}</span>
                                  </div>
                                ))}
                              </div>
                              {renderNaviSlider('text', naviCustomize.textColor)}
                              {periodSync.navi && (
                                <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 10 }}>
                                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 8 }}>⏰ 時間帯別設定</div>
                                  {PERIODS_N.map(p => <PeriodColorPicker key={p} label="naviText" colorKey={p} colors={periodNaviColors.text} setColors={c => setPeriodNaviColors(prev => ({ ...prev, text: c(prev.text) as typeof prev.text }))} hues={{ morning:0, afternoon:0, evening:0, night:0 }} setHues={() => {}} lightnesses={{ morning:50, afternoon:50, evening:50, night:50 }} setLightnesses={() => {}} paletteKey={paletteOpenPeriod} setPaletteKey={setPaletteOpenPeriod} openKey={openPeriodColorKey} setOpenKey={setOpenPeriodColorKey} />)}
                                </div>
                              )}
                              <button onClick={() => setNaviCustomize(DEFAULT_NAVI_CUSTOMIZE)} style={{ width: '100%', padding: '8px 0', borderRadius: 8, marginBottom: 6, background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer' }}>⟳ デフォルトに戻す</button>
                              <button onClick={() => handleNaviSave('text')} style={{ backgroundColor: '#7c3aed', borderRadius: 8, padding: '10px 0', width: '100%', color: 'white', fontSize: 14, border: 'none', cursor: 'pointer', fontWeight: 600, marginTop: 0 }}>
                                {savedFeedbackNavi === 'text' ? '保存しました ✓' : '保存する'}
                              </button>
                            </div>
                          )}
                        </div>
                        {/* ナビアクティブ色 */}
                        <div style={{ borderRadius: '8px', background: 'rgba(255,255,255,0.03)', marginTop: '8px', overflow: 'hidden' }}>
                          <div onClick={() => setOpenSubNavi(p => p === 'active' ? null : 'active')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', cursor: 'pointer' }}>
                            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600 }}>✨ ナビアクティブ色</span>
                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>{openSubNavi === 'active' ? '▼' : '▶'}</span>
                          </div>
                          {openSubNavi === 'active' && (
                            <div style={{ padding: '0 12px 12px' }}>
                              <div style={{ height: '48px', borderRadius: '8px', background: naviCustomize.bgColor, marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-around', border: '1px solid rgba(255,255,255,0.1)' }}>
                                {[['🏛️','Museum'],['🌐','Room'],['🔍','Explore']].map(([ic, lb], i) => (
                                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                    <span style={{ fontSize: '16px' }}>{ic}</span>
                                    <span style={{ color: i === 0 ? naviCustomize.activeColor : naviCustomize.textColor, fontSize: '9px', fontWeight: i === 0 ? 700 : 400 }}>{lb}</span>
                                  </div>
                                ))}
                              </div>
                              {renderNaviSlider('active', naviCustomize.activeColor)}
                              {periodSync.navi && (
                                <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 10 }}>
                                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 8 }}>⏰ 時間帯別設定</div>
                                  {PERIODS_N.map(p => <PeriodColorPicker key={p} label="naviActive" colorKey={p} colors={periodNaviColors.active} setColors={c => setPeriodNaviColors(prev => ({ ...prev, active: c(prev.active) as typeof prev.active }))} hues={{ morning:0, afternoon:0, evening:0, night:0 }} setHues={() => {}} lightnesses={{ morning:50, afternoon:50, evening:50, night:50 }} setLightnesses={() => {}} paletteKey={paletteOpenPeriod} setPaletteKey={setPaletteOpenPeriod} openKey={openPeriodColorKey} setOpenKey={setOpenPeriodColorKey} />)}
                                </div>
                              )}
                              <button onClick={() => setNaviCustomize(DEFAULT_NAVI_CUSTOMIZE)} style={{ width: '100%', padding: '8px 0', borderRadius: 8, marginBottom: 6, background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer' }}>⟳ デフォルトに戻す</button>
                              <button onClick={() => handleNaviSave('active')} style={{ backgroundColor: '#7c3aed', borderRadius: 8, padding: '10px 0', width: '100%', color: 'white', fontSize: 14, border: 'none', cursor: 'pointer', fontWeight: 600, marginTop: 0 }}>
                                {savedFeedbackNavi === 'active' ? '保存しました ✓' : '保存する'}
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )
                  })()}
                </div>
              )}
            </div>

            {/* 時間帯設定 親折りたたみ */}
            <div style={{ borderRadius: '12px', background: 'rgba(255,255,255,0.05)', marginBottom: '8px', overflow: 'hidden' }}>
              <div onClick={() => setPeriodSettingOpen(p => !p)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', cursor: 'pointer' }}>
                <span style={{ color: 'white', fontSize: '14px', fontWeight: 600 }}>🕐 時間帯設定</span>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>{periodSettingOpen ? '▼' : '▶'}</span>
              </div>
              {periodSettingOpen && (() => {
                const PERIOD_DEFAULTS = {
                  morning:   { start: 6,  end: 11 },
                  afternoon: { start: 11, end: 17 },
                  evening:   { start: 17, end: 21 },
                  night:     { start: 21, end: 6  },
                }
                const handlePeriodSave = () => {
                  try {
                    localStorage.setItem('periodHours', JSON.stringify(periodHours))
                    localStorage.setItem('periodSync', JSON.stringify(periodSync))
                    setSavedFeedbackPeriod(true)
                    setTimeout(() => setSavedFeedbackPeriod(false), 1500)
                  } catch (e) { console.error(e) }
                }
                const PERIOD_INFO: { key: 'morning' | 'afternoon' | 'evening' | 'night'; icon: string; label: string }[] = [
                  { key: 'morning',   icon: '🌅', label: '朝' },
                  { key: 'afternoon', icon: '🌤️', label: '昼' },
                  { key: 'evening',   icon: '🌆', label: '夕方' },
                  { key: 'night',     icon: '🌙', label: '夜' },
                ]
                return (
                  <div style={{ padding: '0 12px 12px' }}>
                    {/* 時間帯連動トグル */}
                    <div style={{ borderRadius: '8px', background: 'rgba(255,255,255,0.03)', padding: '4px 12px', marginTop: '8px', marginBottom: '8px' }}>
                      {([
                        ['chatBg',     'チャット背景'],
                        ['chatBubble', '吹き出し'],
                        ['chatText',   '文字色'],
                        ['appearance', '外観（タブ）'],
                        ['navi',       'ナビ'],
                      ] as const).map(([key, label]) => (
                        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          <span style={{ color: 'white', fontSize: 14 }}>{label}</span>
                          <div onClick={() => setPeriodSync((prev: typeof periodSync) => ({ ...prev, [key]: !prev[key] }))} style={{ width: 44, height: 24, borderRadius: 12, cursor: 'pointer', backgroundColor: periodSync[key] ? '#7c3aed' : 'rgba(255,255,255,0.2)', position: 'relative', transition: 'background 0.2s' }}>
                            <div style={{ position: 'absolute', top: 2, left: periodSync[key] ? 22 : 2, width: 20, height: 20, borderRadius: '50%', backgroundColor: 'white', transition: 'left 0.2s' }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 各時間帯サブ折りたたみ */}
                    {PERIOD_INFO.map(({ key, icon, label }) => (
                      <div key={key} style={{ borderRadius: '8px', background: 'rgba(255,255,255,0.03)', marginTop: '6px', overflow: 'hidden' }}>
                        <div onClick={() => setOpenSubPeriod(p => p === key ? null : key)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', cursor: 'pointer' }}>
                          <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600 }}>{icon} {label}</span>
                          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>{openSubPeriod === key ? '▼' : '▶'}</span>
                        </div>
                        {openSubPeriod === key && (
                          <div style={{ padding: '0 12px 12px' }}>
                            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '8px 12px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontSize: 20 }}>{icon}</span>
                              <span style={{ color: 'white', fontSize: 13 }}>{label}  {periodHours[key].start}:00 〜 {periodHours[key].end}:00</span>
                            </div>
                            {/* 開始時刻 */}
                            <div style={{ marginBottom: 8 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>開始</span>
                                <span style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>{periodHours[key].start}:00</span>
                              </div>
                              <input type="range" min={0} max={23} value={periodHours[key].start}
                                className="hue-slider"
                                style={{ background: `linear-gradient(to right, #7c3aed ${periodHours[key].start / 23 * 100}%, rgba(255,255,255,0.2) ${periodHours[key].start / 23 * 100}%)`, width: '100%', pointerEvents: 'auto' }}
                                onChange={e => setPeriodHours((prev: typeof periodHours) => ({ ...prev, [key]: { ...prev[key], start: Number(e.target.value) } }))}
                                onInput={e => setPeriodHours((prev: typeof periodHours) => ({ ...prev, [key]: { ...prev[key], start: Number((e.target as HTMLInputElement).value) } }))}
                              />
                            </div>
                            {/* 終了時刻 */}
                            <div style={{ marginBottom: 8 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>終了</span>
                                <span style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>{periodHours[key].end}:00</span>
                              </div>
                              <input type="range" min={0} max={23} value={periodHours[key].end}
                                className="hue-slider"
                                style={{ background: `linear-gradient(to right, #a78bfa ${periodHours[key].end / 23 * 100}%, rgba(255,255,255,0.2) ${periodHours[key].end / 23 * 100}%)`, width: '100%', pointerEvents: 'auto' }}
                                onChange={e => setPeriodHours((prev: typeof periodHours) => ({ ...prev, [key]: { ...prev[key], end: Number(e.target.value) } }))}
                                onInput={e => setPeriodHours((prev: typeof periodHours) => ({ ...prev, [key]: { ...prev[key], end: Number((e.target as HTMLInputElement).value) } }))}
                              />
                            </div>
                            <button onClick={() => setPeriodHours((prev: typeof periodHours) => ({ ...prev, [key]: PERIOD_DEFAULTS[key] }))} style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', marginTop: 6 }}>
                              デフォルトに戻す
                            </button>
                          </div>
                        )}
                      </div>
                    ))}

                    <div style={{ height: 12 }} />
                    <button onClick={() => {
                      setPeriodHours(PERIOD_DEFAULTS)
                      setPeriodChatColors(DEFAULT_PERIOD_CHAT_COLORS)
                      setPeriodChatHue(DEFAULT_PERIOD_CHAT_HUE)
                      setPeriodChatLightness(DEFAULT_PERIOD_CHAT_LIGHTNESS)
                    }} style={{ width: '100%', padding: '10px 0', borderRadius: 8, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: 'none', fontSize: 14, cursor: 'pointer', marginBottom: 8 }}>
                      ⟳ すべてデフォルトに戻す
                    </button>
                    <button onClick={handlePeriodSave} style={{ backgroundColor: '#7c3aed', borderRadius: 8, padding: '10px 0', width: '100%', color: 'white', fontSize: 14, border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                      {savedFeedbackPeriod ? '保存しました ✓' : '保存する'}
                    </button>
                  </div>
                )
              })()}
            </div>

            {/* タイムラインカード色 親折りたたみ */}
            <div style={{ borderRadius: '12px', background: 'rgba(255,255,255,0.05)', marginBottom: '8px', overflow: 'hidden' }}>
              <div onClick={() => setCardColorSectionOpen(p => !p)} style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', cursor: 'pointer' }}>
                <span style={{ color: 'white', fontSize: '14px', fontWeight: 600 }}>📋 タイムラインカード色</span>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>{cardColorSectionOpen ? '▼' : '▶'}</span>
              </div>
              {cardColorSectionOpen && (
                <div style={{ padding: '0 12px 12px' }}>
                  {/* プレビュー */}
                  <div style={{
                    borderRadius: '12px', padding: '14px 16px', marginBottom: '12px',
                    background: `rgb(${globalCardBgColor.r},${globalCardBgColor.g},${globalCardBgColor.b})`,
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}>
                    <p style={{ color: `rgb(${globalCardTextColor.r},${globalCardTextColor.g},${globalCardTextColor.b})`, fontSize: '13px', margin: 0 }}>
                      タイムライン投稿カードのプレビューです
                    </p>
                  </div>

                  {/* カード背景色 RGB */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, margin: 0, flex: 1 }}>カード背景色</p>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: `rgb(${globalCardBgColor.r},${globalCardBgColor.g},${globalCardBgColor.b})`, flexShrink: 0, border: '2px solid rgba(255,255,255,0.2)' }} />
                    <button onClick={() => setCardBgPaletteOpen(p => !p)} style={{ width: '28px', height: '28px', borderRadius: '7px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', fontSize: '14px', cursor: 'pointer', flexShrink: 0 }}>🎨</button>
                  </div>
                  {([
                    { ch: 'r', lbl: 'R', val: globalCardBgColor.r },
                    { ch: 'g', lbl: 'G', val: globalCardBgColor.g },
                    { ch: 'b', lbl: 'B', val: globalCardBgColor.b },
                  ] as const).map(({ ch, lbl, val }) => (
                    <div key={ch} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', width: 10, flexShrink: 0, fontWeight: 600 }}>{lbl}</span>
                      <div style={{ position: 'relative', flex: 1, height: '20px', display: 'flex', alignItems: 'center' }}>
                        <div style={{ position: 'absolute', left: 0, right: 0, height: '6px', borderRadius: '3px', pointerEvents: 'none',
                          background: ch==='r'
                            ? `linear-gradient(to right, rgb(0,${globalCardBgColor.g},${globalCardBgColor.b}), rgb(255,${globalCardBgColor.g},${globalCardBgColor.b}))`
                            : ch==='g'
                            ? `linear-gradient(to right, rgb(${globalCardBgColor.r},0,${globalCardBgColor.b}), rgb(${globalCardBgColor.r},255,${globalCardBgColor.b}))`
                            : `linear-gradient(to right, rgb(${globalCardBgColor.r},${globalCardBgColor.g},0), rgb(${globalCardBgColor.r},${globalCardBgColor.g},255))`,
                        }} />
                        <input type="range" min={0} max={255} value={val}
                          style={{ position: 'absolute', left: 0, right: 0, width: '100%', opacity: 0, cursor: 'pointer', height: '20px', margin: 0 }}
                          onChange={e => setGlobalCardBgColor(p => ({ ...p, [ch]: Number(e.target.value) }))}
                        />
                        <div style={{ position: 'absolute', left: `calc(${val/255*100}% - 8px)`, width: '16px', height: '16px', borderRadius: '50%', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.3)', pointerEvents: 'none' }} />
                      </div>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', width: 22, textAlign: 'right', flexShrink: 0 }}>{val}</span>
                    </div>
                  ))}
                  {cardBgPaletteOpen && (
                    <>
                      <div onClick={() => setCardBgPaletteOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 0 }} />
                      <div style={{ position: 'relative', zIndex: 1, background: 'rgba(20,20,40,0.97)', borderRadius: 10, padding: 8, marginTop: 6, marginBottom: 6 }}>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, margin: '0 0 4px' }}>おすすめ</p>
                        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                          {CARD_PALETTE_DEFAULTS.map(c => {
                            const m = c.match(/^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
                            if (!m) return null
                            return <button key={c} onClick={() => setGlobalCardBgColor({ r: parseInt(m[1],16), g: parseInt(m[2],16), b: parseInt(m[3],16) })} style={{ width: 22, height: 22, borderRadius: 3, background: c, border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', padding: 0 }} />
                          })}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginBottom: 6 }}>
                          {CARD_PALETTE_COLORS.flat().map((c, i) => {
                            const m = c.match(/^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
                            if (!m) return null
                            return <button key={i} onClick={() => setGlobalCardBgColor({ r: parseInt(m[1],16), g: parseInt(m[2],16), b: parseInt(m[3],16) })} style={{ width: 22, height: 16, borderRadius: 2, background: c, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', padding: 0 }} />
                          })}
                        </div>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                          {['#ff0000','#ff4400','#ffaa00','#aaff00','#00cc00','#00cccc','#0088ff','#000088','#6600cc'].map(c => {
                            const m = c.match(/^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
                            if (!m) return null
                            return <button key={c} onClick={() => setGlobalCardBgColor({ r: parseInt(m[1],16), g: parseInt(m[2],16), b: parseInt(m[3],16) })} style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', padding: 0 }} />
                          })}
                        </div>
                      </div>
                    </>
                  )}

                  {/* カード文字色 RGB */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, marginTop: 10 }}>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, margin: 0, flex: 1 }}>カード文字色</p>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: `rgb(${globalCardTextColor.r},${globalCardTextColor.g},${globalCardTextColor.b})`, flexShrink: 0, border: '2px solid rgba(255,255,255,0.2)' }} />
                    <button onClick={() => setCardTextPaletteOpen(p => !p)} style={{ width: '28px', height: '28px', borderRadius: '7px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', fontSize: '14px', cursor: 'pointer', flexShrink: 0 }}>🎨</button>
                  </div>
                  {([
                    { ch: 'r', lbl: 'R', val: globalCardTextColor.r },
                    { ch: 'g', lbl: 'G', val: globalCardTextColor.g },
                    { ch: 'b', lbl: 'B', val: globalCardTextColor.b },
                  ] as const).map(({ ch, lbl, val }) => (
                    <div key={ch} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', width: 10, flexShrink: 0, fontWeight: 600 }}>{lbl}</span>
                      <div style={{ position: 'relative', flex: 1, height: '20px', display: 'flex', alignItems: 'center' }}>
                        <div style={{ position: 'absolute', left: 0, right: 0, height: '6px', borderRadius: '3px', pointerEvents: 'none',
                          background: ch==='r'
                            ? `linear-gradient(to right, rgb(0,${globalCardTextColor.g},${globalCardTextColor.b}), rgb(255,${globalCardTextColor.g},${globalCardTextColor.b}))`
                            : ch==='g'
                            ? `linear-gradient(to right, rgb(${globalCardTextColor.r},0,${globalCardTextColor.b}), rgb(${globalCardTextColor.r},255,${globalCardTextColor.b}))`
                            : `linear-gradient(to right, rgb(${globalCardTextColor.r},${globalCardTextColor.g},0), rgb(${globalCardTextColor.r},${globalCardTextColor.g},255))`,
                        }} />
                        <input type="range" min={0} max={255} value={val}
                          style={{ position: 'absolute', left: 0, right: 0, width: '100%', opacity: 0, cursor: 'pointer', height: '20px', margin: 0 }}
                          onChange={e => setGlobalCardTextColor(p => ({ ...p, [ch]: Number(e.target.value) }))}
                        />
                        <div style={{ position: 'absolute', left: `calc(${val/255*100}% - 8px)`, width: '16px', height: '16px', borderRadius: '50%', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.3)', pointerEvents: 'none' }} />
                      </div>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', width: 22, textAlign: 'right', flexShrink: 0 }}>{val}</span>
                    </div>
                  ))}
                  {cardTextPaletteOpen && (
                    <>
                      <div onClick={() => setCardTextPaletteOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 0 }} />
                      <div style={{ position: 'relative', zIndex: 1, background: 'rgba(20,20,40,0.97)', borderRadius: 10, padding: 8, marginTop: 6, marginBottom: 6 }}>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, margin: '0 0 4px' }}>おすすめ</p>
                        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                          {CARD_PALETTE_DEFAULTS.map(c => {
                            const m = c.match(/^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
                            if (!m) return null
                            return <button key={c} onClick={() => setGlobalCardTextColor({ r: parseInt(m[1],16), g: parseInt(m[2],16), b: parseInt(m[3],16) })} style={{ width: 22, height: 22, borderRadius: 3, background: c, border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', padding: 0 }} />
                          })}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginBottom: 6 }}>
                          {CARD_PALETTE_COLORS.flat().map((c, i) => {
                            const m = c.match(/^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
                            if (!m) return null
                            return <button key={i} onClick={() => setGlobalCardTextColor({ r: parseInt(m[1],16), g: parseInt(m[2],16), b: parseInt(m[3],16) })} style={{ width: 22, height: 16, borderRadius: 2, background: c, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', padding: 0 }} />
                          })}
                        </div>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                          {['#ff0000','#ff4400','#ffaa00','#aaff00','#00cc00','#00cccc','#0088ff','#000088','#6600cc'].map(c => {
                            const m = c.match(/^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
                            if (!m) return null
                            return <button key={c} onClick={() => setGlobalCardTextColor({ r: parseInt(m[1],16), g: parseInt(m[2],16), b: parseInt(m[3],16) })} style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', padding: 0 }} />
                          })}
                        </div>
                      </div>
                    </>
                  )}

                  {/* 自分の設定を優先するトグル */}
                  <div style={{ marginTop: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                    <div
                      onClick={() => setGlobalUseOwnCardColor(p => !p)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', cursor: 'pointer' }}
                    >
                      <div>
                        <p style={{ color: 'white', fontSize: '14px', fontWeight: 600, margin: 0 }}>自分の設定を優先する</p>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', margin: '3px 0 0' }}>
                          {globalUseOwnCardColor ? '自分のカード色設定で投稿されます' : '相手のカード色設定に合わせます'}
                        </p>
                      </div>
                      <div style={{ width: '44px', height: '26px', borderRadius: '13px', background: globalUseOwnCardColor ? '#a78bfa' : 'rgba(255,255,255,0.15)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                        <div style={{ position: 'absolute', top: '3px', left: globalUseOwnCardColor ? '21px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
                      </div>
                    </div>
                  </div>

                  {/* 保存ボタン */}
                  <button
                    onClick={() => {
                      try {
                        localStorage.setItem('globalCardColors', JSON.stringify({ bg: globalCardBgColor, text: globalCardTextColor, useOwn: globalUseOwnCardColor }))
                        setCardColorSavedFeedback(true)
                        setTimeout(() => setCardColorSavedFeedback(false), 1500)
                      } catch (e) { console.error(e) }
                    }}
                    style={{ width: '100%', padding: '10px 0', borderRadius: 8, marginTop: 10, background: cardColorSavedFeedback ? '#059669' : '#7c3aed', border: 'none', color: 'white', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}
                  >
                    {cardColorSavedFeedback ? '保存しました ✓' : '保存する'}
                  </button>
                </div>
              )}
            </div>

          </div>
        )}

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

      {/* Collection タブ 図鑑 全画面オーバーレイ */}
      {isDoorHallOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: '390px',
          height: '100dvh',
          zIndex: 200,
          background: 'white',
          overflow: 'hidden',
        }}>
          <DoorHall onEnterRoom={() => {}} initialView="list" onBack={() => { setIsDoorHallOpen(false); document.body.style.overflow = '' }} />
        </div>
      )}

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
      {editMenuOpen && canvasEditMode === 'menu' && (
        <div onClick={e => e.stopPropagation()} style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#1a1a2e', borderRadius: '20px',
          padding: '20px 16px', width: '280px',
          border: '1px solid rgba(167,139,250,0.2)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
          zIndex: 30,
        }}>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: '0 0 4px' }}>作品名</p>
            {isEditingTitle ? (
              <input
                autoFocus
                value={canvases[activeCanvas]?.title ?? ''}
                onChange={e => {
                  const val = e.target.value
                  setCanvases(prev => prev.map((c, i) => i === activeCanvas ? { ...c, title: val } : c))
                }}
                onBlur={() => setIsEditingTitle(false)}
                onKeyDown={e => { if (e.key === 'Enter') setIsEditingTitle(false) }}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(167,139,250,0.4)',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: 700,
                  textAlign: 'center',
                  padding: '4px 8px',
                  width: '100%',
                  outline: 'none',
                }}
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <p style={{ fontSize: '16px', fontWeight: 700, color: 'white', margin: 0 }}>
                  {canvases[activeCanvas]?.title || '無題'}
                </p>
                <span
                  onClick={() => setIsEditingTitle(true)}
                  style={{ fontSize: '14px', cursor: 'pointer', opacity: 0.6 }}
                >
                  ✏️
                </span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={() => setCanvasEditMode('tag-edit')}
              style={{
                width: '100%', padding: '13px', borderRadius: '12px',
                background: 'rgba(167,139,250,0.15)', color: '#c4b5fd',
                border: '1px solid rgba(167,139,250,0.3)',
                fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
            >🏷️ タグを編集する</button>
            <button
              onClick={() => setCanvasEditMode('emoji-edit')}
              style={{
                width: '100%', padding: '13px', borderRadius: '12px',
                background: 'rgba(167,139,250,0.15)', color: '#c4b5fd',
                border: '1px solid rgba(167,139,250,0.3)',
                fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
            >✨ 絵文字を編集する</button>
            <button
              onClick={() => setCanvasEditMode('avatar-edit')}
              style={{
                width: '100%', padding: '13px', borderRadius: '12px',
                background: 'rgba(167,139,250,0.15)', color: '#c4b5fd',
                border: '1px solid rgba(167,139,250,0.3)',
                fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
            >🧍 アバターを編集する</button>
            <button
              onClick={() => setIsBgEditOpen(true)}
              style={{
                width: '100%', padding: '13px', borderRadius: '12px',
                background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)',
                border: '1px solid rgba(255,255,255,0.1)',
                fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
            >🖼️ 背景を変更</button>
            <button
              onClick={() => { setEditMenuOpen(false); setCanvasEditMode('menu') }}
              style={{
                width: '100%', padding: '10px', borderRadius: '12px',
                background: 'none', color: 'rgba(255,255,255,0.4)',
                border: 'none', fontSize: '13px', cursor: 'pointer',
              }}
            >とじる</button>
          </div>
        </div>
      )}

      {editMenuOpen && canvasEditMode === 'tag-edit' && (
        <div onClick={e => e.stopPropagation()} style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#1a1a2e', borderRadius: '20px',
          padding: '20px 16px', width: '280px',
          border: '1px solid rgba(167,139,250,0.2)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
          zIndex: 30,
        }}>
          <p style={{ textAlign: 'center', fontWeight: 700, color: 'white', fontSize: '15px', margin: '0 0 16px' }}>🏷️ タグを編集する</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={() => { setItemEditSubMode('move-tag'); setEditMenuOpen(false); setCanvasEditMode('menu') }}
              style={{
                width: '100%', padding: '13px', borderRadius: '12px',
                background: 'rgba(167,139,250,0.15)', color: '#c4b5fd',
                border: '1px solid rgba(167,139,250,0.3)',
                fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              }}
            >既存のタグを編集</button>
            <button
              onClick={() => { setTagPickerOpen(true); setEditMenuOpen(false); setCanvasEditMode('menu') }}
              style={{
                width: '100%', padding: '13px', borderRadius: '12px',
                background: 'rgba(167,139,250,0.15)', color: '#c4b5fd',
                border: '1px solid rgba(167,139,250,0.3)',
                fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              }}
            >＋ 新規追加</button>
            <button
              onClick={() => setCanvasEditMode('menu')}
              style={{
                width: '100%', padding: '10px', borderRadius: '12px',
                background: 'none', color: 'rgba(255,255,255,0.4)',
                border: 'none', fontSize: '13px', cursor: 'pointer',
              }}
            >← もどる</button>
          </div>
        </div>
      )}

      {editMenuOpen && canvasEditMode === 'emoji-edit' && (
        <div onClick={e => e.stopPropagation()} style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#1a1a2e', borderRadius: '20px',
          padding: '20px 16px', width: '280px',
          border: '1px solid rgba(167,139,250,0.2)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
          zIndex: 30,
        }}>
          <p style={{ textAlign: 'center', fontWeight: 700, color: 'white', fontSize: '15px', margin: '0 0 16px' }}>✨ 絵文字を編集する</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={() => { setItemEditSubMode('move-emoji'); setEditMenuOpen(false); setCanvasEditMode('menu') }}
              style={{
                width: '100%', padding: '13px', borderRadius: '12px',
                background: 'rgba(167,139,250,0.15)', color: '#c4b5fd',
                border: '1px solid rgba(167,139,250,0.3)',
                fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              }}
            >既存の絵文字を編集</button>
            <button
              onClick={() => { setEmojiPickerOpen(true); setEditMenuOpen(false); setCanvasEditMode('menu') }}
              style={{
                width: '100%', padding: '13px', borderRadius: '12px',
                background: 'rgba(167,139,250,0.15)', color: '#c4b5fd',
                border: '1px solid rgba(167,139,250,0.3)',
                fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              }}
            >＋ 新規追加</button>
            <button
              onClick={() => setCanvasEditMode('menu')}
              style={{
                width: '100%', padding: '10px', borderRadius: '12px',
                background: 'none', color: 'rgba(255,255,255,0.4)',
                border: 'none', fontSize: '13px', cursor: 'pointer',
              }}
            >← もどる</button>
          </div>
        </div>
      )}

      {editMenuOpen && canvasEditMode === 'avatar-edit' && (
        <div onClick={e => e.stopPropagation()} style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#1a1a2e', borderRadius: '20px',
          padding: '20px 16px', width: '280px',
          border: '1px solid rgba(167,139,250,0.2)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
          zIndex: 30,
        }}>
          <p style={{ textAlign: 'center', fontWeight: 700, color: 'white', fontSize: '15px', margin: '0 0 16px' }}>🧍 アバターを編集する</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={() => { setItemEditSubMode('move-avatar'); setEditMenuOpen(false); setCanvasEditMode('menu') }}
              style={{
                width: '100%', padding: '13px', borderRadius: '12px',
                background: 'rgba(167,139,250,0.15)', color: '#c4b5fd',
                border: '1px solid rgba(167,139,250,0.3)',
                fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              }}
            >既存のアバターを編集</button>
            <button
              onClick={() => { setItemEditSubMode('change'); setEditMenuOpen(false); setCanvasEditMode('menu') }}
              style={{
                width: '100%', padding: '13px', borderRadius: '12px',
                background: 'rgba(167,139,250,0.15)', color: '#c4b5fd',
                border: '1px solid rgba(167,139,250,0.3)',
                fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              }}
            >アバターを変更する</button>
            <button
              onClick={() => setCanvasEditMode('menu')}
              style={{
                width: '100%', padding: '10px', borderRadius: '12px',
                background: 'none', color: 'rgba(255,255,255,0.4)',
                border: 'none', fontSize: '13px', cursor: 'pointer',
              }}
            >← もどる</button>
          </div>
        </div>
      )}

      {(itemEditSubMode === 'move-tag' || itemEditSubMode === 'move-emoji' || itemEditSubMode === 'move-avatar') && (
        <div style={{
          position: 'fixed', bottom: '84px', left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: '390px', zIndex: 50,
          background: '#1a1a2e',
          borderTopLeftRadius: '20px', borderTopRightRadius: '20px',
          borderTop: '1px solid rgba(167,139,250,0.18)',
          padding: '10px 14px 14px',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ color: 'white', fontWeight: 700, fontSize: '13px' }}>
              {itemEditSubMode === 'move-tag' ? 'タグを編集中' : itemEditSubMode === 'move-emoji' ? '絵文字を編集中' : 'アバターを編集中'}
            </span>
            <button
              onClick={() => setItemEditSubMode(null)}
              style={{ color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', fontSize: '12px', cursor: 'pointer' }}
            >完了</button>
          </div>
          {selectedItemId && (
            <div style={{ maxWidth: '360px', margin: '0 auto' }}>
              <div style={{ marginBottom: '8px' }}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px', margin: '0 0 4px' }}>大きさ</p>
                <input
                  type="range" min="20" max="200" step="1"
                  value={canvases[activeCanvas]?.items.find(i => i.id === selectedItemId)?.size ?? 60}
                  onChange={e => {
                    const val = Number(e.target.value)
                    setCanvases(prev => prev.map((c, ci) => ci !== activeCanvas ? c : {
                      ...c,
                      items: c.items.map(it => it.id === selectedItemId ? { ...it, size: val } : it)
                    }))
                  }}
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ marginBottom: '8px' }}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px', margin: '0 0 4px' }}>角度</p>
                <input
                  type="range" min="-180" max="180" step="1"
                  value={canvases[activeCanvas]?.items.find(i => i.id === selectedItemId)?.rotation ?? 0}
                  onChange={e => {
                    const val = Number(e.target.value)
                    setCanvases(prev => prev.map((c, ci) => ci !== activeCanvas ? c : {
                      ...c,
                      items: c.items.map(it => it.id === selectedItemId ? { ...it, rotation: val } : it)
                    }))
                  }}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {itemEditSubMode === 'change' && (
        <div style={{
          position: 'fixed', bottom: '56px', left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: '390px', zIndex: 50,
          background: '#1a1a2e',
          borderTopLeftRadius: '20px', borderTopRightRadius: '20px',
          borderTop: '1px solid rgba(167,139,250,0.18)',
          padding: '16px 16px 24px',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ color: 'white', fontWeight: 700, fontSize: '14px' }}>アバターを変更する</span>
            <button
              onClick={() => setItemEditSubMode(null)}
              style={{ color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', fontSize: '13px', cursor: 'pointer' }}
            >完了</button>
          </div>
          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {savedAvatars.map((av, i) => (
              <div
                key={av.id}
                onClick={() => {
                  setAvatarConfig(prev => ({ ...prev, rpmUrl: av.imageUrl }))
                  setItemEditSubMode(null)
                }}
                style={{
                  flexShrink: 0, width: '72px', height: '104px',
                  borderRadius: '12px',
                  border: avatarConfig.rpmUrl === av.imageUrl ? '2px solid #a78bfa' : '2px solid rgba(255,255,255,0.1)',
                  overflow: 'hidden', cursor: 'pointer',
                }}
              >
                <img src={av.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={`アバター${i + 1}`} />
              </div>
            ))}
            {savedAvatars.length === 0 && (
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>アバターがまだありません。プロフィールから作成してください。</p>
            )}
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
              <div style={{ position: 'relative', height: '20px' }}>
                <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '6px', transform: 'translateY(-50%)', borderRadius: '3px', background: 'linear-gradient(to right, hsl(0,80%,60%), hsl(60,80%,60%), hsl(120,80%,60%), hsl(180,80%,60%), hsl(240,80%,60%), hsl(300,80%,60%), hsl(360,80%,60%))' }} />
                <input type="range" min={0} max={360} value={bgHue}
                  onChange={e => setBgHue(Number(e.target.value))}
                  style={{ position: 'absolute', inset: 0, width: '100%', opacity: 0, cursor: 'pointer', margin: 0 }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>彩度</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>{bgSaturation}%</p>
              </div>
              <div style={{ position: 'relative', height: '20px' }}>
                <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '6px', transform: 'translateY(-50%)', borderRadius: '3px', background: `linear-gradient(to right, hsl(${bgHue},0%,60%), hsl(${bgHue},100%,60%))` }} />
                <input type="range" min={0} max={100} value={bgSaturation}
                  onChange={e => setBgSaturation(Number(e.target.value))}
                  style={{ position: 'absolute', inset: 0, width: '100%', opacity: 0, cursor: 'pointer', margin: 0 }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>明度</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>{bgLightness}%</p>
              </div>
              <div style={{ position: 'relative', height: '20px' }}>
                <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '6px', transform: 'translateY(-50%)', borderRadius: '3px', background: `linear-gradient(to right, hsl(${bgHue},${bgSaturation}%,5%), hsl(${bgHue},${bgSaturation}%,50%), hsl(${bgHue},${bgSaturation}%,100%))` }} />
                <input type="range" min={5} max={100} value={bgLightness}
                  onChange={e => setBgLightness(Number(e.target.value))}
                  style={{ position: 'absolute', inset: 0, width: '100%', opacity: 0, cursor: 'pointer', margin: 0 }}
                />
              </div>
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
                  <div style={{ height: '72px', borderRadius: '12px', backgroundImage: profileHeaderImage ? `url(${profileHeaderImage})` : profileHeaderGradient, backgroundSize: 'cover', backgroundPosition: 'center', marginBottom: '10px' }} />
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {HEADER_PRESETS.map(g => (
                      <button key={g} onClick={() => { setProfileHeaderGradient(g); setProfileHeaderImage(null) }} style={{
                        width: '36px', height: '36px', borderRadius: '8px', background: g, flexShrink: 0,
                        border: (!profileHeaderImage && profileHeaderGradient === g) ? '2px solid white' : '2px solid transparent',
                        boxShadow: (!profileHeaderImage && profileHeaderGradient === g) ? '0 0 0 2px #a78bfa' : 'none',
                      }} />
                    ))}
                    <button onClick={() => headerImageInputRef.current?.click()} style={{ fontSize: '11px', padding: '6px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', flexShrink: 0 }}>
                      📷 画像
                    </button>
                    <input ref={headerImageInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) setProfileHeaderImage(URL.createObjectURL(file))
                    }} />
                    {profileHeaderImage && (
                      <button onClick={() => setProfileHeaderImage(null)} style={{ fontSize: '11px', padding: '6px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', flexShrink: 0 }}>
                        × 削除
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginBottom: '8px', letterSpacing: '0.8px' }}>アイコン</div>
                  {/* プレビュー */}
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                    {iconType === 'photo' && profileIconImage
                      ? <img src={profileIconImage} style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.2)' }} alt="icon" />
                      : iconType === 'avatar' && selectedAvatarForIcon
                        ? <img src={selectedAvatarForIcon} style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', border: '3px solid rgba(255,255,255,0.2)' }} alt="icon" />
                        : <ProfileAvatar config={avatarConfig} />
                    }
                  </div>
                  {/* アイコン種類トグル */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    {(['avatar', 'photo'] as const).map(type => (
                      <button key={type} onClick={() => setIconType(type)} style={{
                        flex: 1, padding: '8px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer',
                        background: iconType === type ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.06)',
                        color: iconType === type ? '#c4b5fd' : 'rgba(255,255,255,0.5)',
                        border: iconType === type ? '1px solid rgba(167,139,250,0.4)' : '1px solid rgba(255,255,255,0.1)',
                        fontWeight: iconType === type ? 600 : 400,
                      }}>
                        {type === 'avatar' ? '🧍 アバター' : '📷 写真'}
                      </button>
                    ))}
                  </div>
                  {/* アバター選択 */}
                  {iconType === 'avatar' && (
                    <div>
                      {savedAvatars.length === 0 ? (
                        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', margin: 0, textAlign: 'center' }}>保存済みアバターがありません</p>
                      ) : (
                        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '4px' }}>
                          {savedAvatars.map(av => (
                            <div key={av.id} onClick={() => setSelectedAvatarForIcon(av.imageUrl)} style={{
                              flexShrink: 0, width: '56px', height: '80px', borderRadius: '10px', overflow: 'hidden', cursor: 'pointer',
                              border: selectedAvatarForIcon === av.imageUrl ? '2px solid #a78bfa' : '2px solid rgba(255,255,255,0.1)',
                            }}>
                              <img src={av.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} alt="" />
                            </div>
                          ))}
                        </div>
                      )}
                      {selectedAvatarForIcon && (
                        <button onClick={() => setSelectedAvatarForIcon(null)} style={{ marginTop: '8px', fontSize: '11px', padding: '4px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>
                          × 選択解除
                        </button>
                      )}
                    </div>
                  )}
                  {/* 写真アップロード */}
                  {iconType === 'photo' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <button onClick={() => iconImageInputRef.current?.click()} style={{ padding: '9px', borderRadius: '10px', fontSize: '13px', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer' }}>
                        📷 画像をアップロード
                      </button>
                      <input ref={iconImageInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) setProfileIconImage(URL.createObjectURL(file))
                      }} />
                      {profileIconImage && (
                        <button onClick={() => setProfileIconImage(null)} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>
                          × 写真を削除
                        </button>
                      )}
                    </div>
                  )}
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

function ConnectionAvatar({ seed: _seed }: { seed: string }) {
  return (
    <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: '#b6e3f4', border: '2px solid rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>👤</div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.45)', marginBottom: '10px', letterSpacing: '0.4px' }}>
      {children}
    </div>
  )
}


// Canvas / profile avatar
const AvatarSVG = memo(function AvatarSVG({
  config: _config,
  size = 80,
}: {
  config: AvatarConfig
  size?: number
  pose?: string
  clothing?: Record<string, unknown>
}) {
  return (
    <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.6 }}>
      👤
    </div>
  )
})

// ── PeriodColorPicker ─────────────────────────────────────────────────────────
const PERIOD_LABELS: Record<'morning' | 'afternoon' | 'evening' | 'night', string> = {
  morning: '🌅 朝', afternoon: '🌤 昼', evening: '🌆 夕方', night: '🌙 夜',
}
const PERIOD_THEME_COLORS = [
  ['#1a0000','#330000','#660000','#990000','#cc0000','#ff0000','#ff4d4d','#ff9999','#ffcccc','#fff0f0'],
  ['#1a0d00','#331a00','#663300','#994d00','#cc6600','#ff8000','#ffaa4d','#ffcc99','#ffe5cc','#fff5e6'],
  ['#1a1a00','#333300','#666600','#999900','#cccc00','#ffff00','#ffff4d','#ffff99','#ffffcc','#fffff0'],
  ['#001a00','#003300','#006600','#009900','#00cc00','#00ff00','#4dff4d','#99ff99','#ccffcc','#f0fff0'],
  ['#00001a','#000033','#000066','#000099','#0000cc','#0000ff','#4d4dff','#9999ff','#ccccff','#f0f0ff'],
  ['#0d001a','#1a0033','#330066','#4d0099','#6600cc','#8000ff','#aa4dff','#cc99ff','#e5ccff','#f5e6ff'],
  ['#0a0a0a','#1a1a1a','#333333','#4d4d4d','#666666','#808080','#999999','#b3b3b3','#cccccc','#e6e6e6'],
  ['#ffffff','#f5f5f5','#ebebeb','#e0e0e0','#d6d6d6','#cccccc','#c2c2c2','#b8b8b8','#adadad','#a3a3a3'],
]
const PERIOD_STD_COLORS = ['#c00000','#ff0000','#ffc000','#ffff00','#92d050','#00b050','#00b0f0','#0070c0','#002060','#7030a0']

function PeriodColorPicker({ label, colorKey, colors, setColors, hues, setHues, lightnesses, setLightnesses, openKey, setOpenKey, paletteKey, setPaletteKey, previewBg, previewMyBubble, previewOtherBubble, previewMyText, previewOtherText }: {
  label: string
  colorKey: 'morning' | 'afternoon' | 'evening' | 'night'
  colors: Record<string, string>
  setColors: (fn: (prev: Record<string, string>) => Record<string, string>) => void
  hues: Record<string, number>
  setHues: (fn: (prev: Record<string, number>) => Record<string, number>) => void
  lightnesses: Record<string, number>
  setLightnesses: (fn: (prev: Record<string, number>) => Record<string, number>) => void
  openKey: string | null
  setOpenKey: (k: string | null) => void
  paletteKey: string | null
  setPaletteKey: (k: string | null) => void
  previewBg?: string
  previewMyBubble?: string
  previewOtherBubble?: string
  previewMyText?: string
  previewOtherText?: string
}) {
  const uid = `${label}-${colorKey}`
  const currentColor = colors[colorKey] ?? '#ffffff'
  const currentHue = hues[colorKey] ?? 0
  const currentL = lightnesses[colorKey] ?? 50
  return (
    <div style={{ marginBottom: 6 }}>
      <div onClick={() => setOpenKey(openKey === uid ? null : uid)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 16, height: 16, borderRadius: '50%', background: currentColor, border: '1px solid rgba(255,255,255,0.3)', flexShrink: 0 }} />
          <span style={{ color: 'white', fontSize: 13 }}>{PERIOD_LABELS[colorKey]}</span>
        </div>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{openKey === uid ? '▼' : '▶'}</span>
      </div>
      {openKey === uid && (
        <div style={{ padding: '10px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: '0 0 8px 8px' }}>
          {/* プレビュー */}
          {previewBg !== undefined && (
            <div style={{ background: previewBg, borderRadius: 10, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', marginBottom: 10, border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ background: previewOtherBubble, borderRadius: 12, padding: '5px 10px' }}>
                <span style={{ color: previewOtherText, fontSize: 12 }}>こんにちは</span>
              </div>
              <div style={{ background: previewMyBubble, borderRadius: 12, padding: '5px 10px' }}>
                <span style={{ color: previewMyText, fontSize: 12 }}>よろしく！</span>
              </div>
            </div>
          )}
          {/* Hueスライダー */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: currentColor, flexShrink: 0, border: '1px solid rgba(255,255,255,0.2)' }} />
            <input type="range" min={0} max={360} value={currentHue} className="hue-slider"
              style={{ flex: 1, pointerEvents: 'auto' }}
              onChange={e => { const v = Number(e.target.value); setHues(p => ({ ...p, [colorKey]: v })); setColors(p => ({ ...p, [colorKey]: `hsl(${v},70%,${currentL}%)` })) }}
              onInput={e => { const v = Number((e.target as HTMLInputElement).value); setHues(p => ({ ...p, [colorKey]: v })); setColors(p => ({ ...p, [colorKey]: `hsl(${v},70%,${currentL}%)` })) }}
            />
            <button onClick={() => setPaletteKey(paletteKey === uid ? null : uid)} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.1)', fontSize: 16 }}>🎨</button>
          </div>
          {/* 明度スライダー */}
          <input type="range" min={10} max={90} value={currentL} className="hue-slider"
            style={{ width: '100%', background: `linear-gradient(to right, hsl(${currentHue},70%,10%), hsl(${currentHue},70%,50%), hsl(${currentHue},70%,90%))`, pointerEvents: 'auto' }}
            onChange={e => { const v = Number(e.target.value); setLightnesses(p => ({ ...p, [colorKey]: v })); setColors(p => ({ ...p, [colorKey]: `hsl(${currentHue},70%,${v}%)` })) }}
            onInput={e => { const v = Number((e.target as HTMLInputElement).value); setLightnesses(p => ({ ...p, [colorKey]: v })); setColors(p => ({ ...p, [colorKey]: `hsl(${currentHue},70%,${v}%)` })) }}
          />
          {/* パレット */}
          {paletteKey === uid && (
            <>
              <div onClick={() => setPaletteKey(null)} style={{ position: 'fixed', inset: 0, zIndex: 0 }} />
              <div style={{ position: 'relative', zIndex: 1, marginTop: 8, background: 'rgba(20,20,40,0.97)', borderRadius: 10, padding: 8 }}>
                <div style={{ display: 'flex', gap: 2, marginBottom: 6, flexWrap: 'wrap' }}>
                  {PERIOD_THEME_COLORS.map((col, ci) => (
                    <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {col.map((c, ri) => <button key={ri} onClick={() => setColors(p => ({ ...p, [colorKey]: c }))} style={{ width: 22, height: 16, borderRadius: 2, background: c, border: currentColor === c ? '2px solid white' : '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', padding: 0 }} />)}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {PERIOD_STD_COLORS.map(c => <button key={c} onClick={() => setColors(p => ({ ...p, [colorKey]: c }))} style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: currentColor === c ? '2px solid white' : '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', padding: 0 }} />)}
                </div>
              </div>
            </>
          )}
          {/* この時間帯をデフォルトに戻す */}
          <button
            onClick={() => {
              const defaultColors = DEFAULT_PERIOD_CHAT_COLORS_CONST as Record<string, Record<string, string>>
              const labelKey = label.replace(/-.*/, '')
              const defaultColor = defaultColors[labelKey]?.[colorKey]
              if (defaultColor) setColors(p => ({ ...p, [colorKey]: defaultColor }))
            }}
            style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', marginTop: 6 }}
          >⟳ この時間帯をデフォルトに戻す</button>
        </div>
      )}
    </div>
  )
}

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
