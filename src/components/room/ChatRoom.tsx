'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { createAvatar } from '@dicebear/core'
import { adventurer } from '@dicebear/collection'
import { useTagStore } from '@/store/useTagStore'
import { useWorldStore } from '@/store/useWorldStore'
import AvatarChat from '@/components/room/AvatarChat'
import { DoorHall, DoorLibrary, DoorFullEditor } from '@/components/world/DoorHall'
import type { DoorRoom } from '@/components/world/DoorHall'

// ── SVG Icons ────────────────────────────────────────────────────────────────

const PlusIcon = () => (
  <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
    <circle cx="13" cy="13" r="12" stroke="#7c3aed" strokeWidth="1.8"/>
    <path d="M13 8v10M8 13h10" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round"/>
  </svg>
)
const MicIcon = ({ recording }: { recording?: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <rect x="9" y="2" width="6" height="11" rx="3" fill={recording ? '#dc2626' : '#7c3aed'}/>
    <path d="M5 10a7 7 0 0014 0" stroke={recording ? '#dc2626' : '#7c3aed'} strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M12 17v4M9 21h6" stroke={recording ? '#dc2626' : '#7c3aed'} strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
)
const SendIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M3 10L17 10M11 4l6 6-6 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)
const PhotoIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <rect x="2" y="5" width="24" height="18" rx="3" stroke="#7c3aed" strokeWidth="1.8"/>
    <circle cx="9" cy="11" r="2.5" fill="#7c3aed"/>
    <path d="M2 19l6-5 4 4 4-3 8 6" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)
const CameraIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <path d="M10 5l-2 3H4a2 2 0 00-2 2v12a2 2 0 002 2h20a2 2 0 002-2V10a2 2 0 00-2-2h-4l-2-3h-8z" stroke="#7c3aed" strokeWidth="1.8"/>
    <circle cx="14" cy="15" r="4" stroke="#7c3aed" strokeWidth="1.8"/>
  </svg>
)
const LocationIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <path d="M14 2C9.58 2 6 5.58 6 10c0 6 8 16 8 16s8-10 8-16c0-4.42-3.58-8-8-8z" stroke="#7c3aed" strokeWidth="1.8"/>
    <circle cx="14" cy="10" r="3" stroke="#7c3aed" strokeWidth="1.8"/>
  </svg>
)
const FileIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <path d="M6 3h10l6 6v16a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2z" stroke="#7c3aed" strokeWidth="1.8"/>
    <path d="M16 3v6h6" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M9 13h10M9 17h7" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
)
const StickerIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <circle cx="14" cy="14" r="11" stroke="#7c3aed" strokeWidth="1.8"/>
    <path d="M9 16s1.5 3 5 3 5-3 5-3" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round"/>
    <circle cx="10" cy="12" r="1.5" fill="#7c3aed"/>
    <circle cx="18" cy="12" r="1.5" fill="#7c3aed"/>
  </svg>
)

// ── Color palette constants ───────────────────────────────────────────────────
const ROOM_PALETTE_THEME_COLORS = [
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
const ROOM_PALETTE_STD_COLORS = ['#c00000','#ff0000','#ffc000','#ffff00','#92d050','#00b050','#00b0f0','#0070c0','#002060','#7030a0']

// ── Period & Theme ────────────────────────────────────────────────────────────

type Period = 'morning' | 'afternoon' | 'evening' | 'night'

function getPeriod(hour: number): Period {
  if (hour >= 18 || hour < 5) return 'night'
  if (hour < 11) return 'morning'
  if (hour < 15) return 'afternoon'
  return 'evening'
}

type PT = {
  bg: string
  headerBg: string
  border: string
  accent: string
  tabBorder: string
  tabActive: string
  tabInactive: string
  cardBg: string
  cardBorder: string
  text: string
  subText: string
  dimText: string
  inputBg: string
  inputBorder: string
  inputText: string
  tagBg: string
  tagBorder: string
  tagText: string
  badgeBg: string
  badgeBorder: string
  badgeText: string
  bubbleMe: string
  bubbleMeText: string
  bubbleAi: string
  bubbleAiBorder: string
  bubbleAiText: string
  bubbleOther: string
  bubbleOtherText: string
  likeActive: string
  isNight: boolean
}

const THEME: Record<Period, PT> = {
  morning: {
    bg: '#f0f9ff', headerBg: '#ffffff', border: '#f3f4f6',
    accent: '#0284c7', tabBorder: '#0ea5e9', tabActive: '#0284c7', tabInactive: '#9ca3af',
    cardBg: '#ffffff', cardBorder: '#f3f4f6',
    text: '#111827', subText: '#6b7280', dimText: '#9ca3af',
    inputBg: '#f8fafc', inputBorder: '#bae6fd', inputText: '#111827',
    tagBg: '#e0f2fe', tagBorder: '#7dd3fc', tagText: '#0284c7',
    badgeBg: '#e0f2fe', badgeBorder: '#7dd3fc', badgeText: '#0284c7',
    bubbleMe: '#0ea5e9', bubbleMeText: '#ffffff',
    bubbleAi: '#f1f5f9', bubbleAiBorder: '#0ea5e9', bubbleAiText: '#1e293b',
    bubbleOther: '#f8fafc', bubbleOtherText: '#1e293b',
    likeActive: '#0284c7', isNight: false,
  },
  afternoon: {
    bg: '#eff6ff', headerBg: '#ffffff', border: '#f3f4f6',
    accent: '#2563eb', tabBorder: '#3b82f6', tabActive: '#2563eb', tabInactive: '#9ca3af',
    cardBg: '#ffffff', cardBorder: '#f3f4f6',
    text: '#111827', subText: '#6b7280', dimText: '#9ca3af',
    inputBg: '#f8fafc', inputBorder: '#bfdbfe', inputText: '#111827',
    tagBg: '#dbeafe', tagBorder: '#93c5fd', tagText: '#2563eb',
    badgeBg: '#dbeafe', badgeBorder: '#93c5fd', badgeText: '#2563eb',
    bubbleMe: '#3b82f6', bubbleMeText: '#ffffff',
    bubbleAi: '#f1f5f9', bubbleAiBorder: '#3b82f6', bubbleAiText: '#1e293b',
    bubbleOther: '#f8fafc', bubbleOtherText: '#1e293b',
    likeActive: '#2563eb', isNight: false,
  },
  evening: {
    bg: '#fff7ed', headerBg: '#ffffff', border: '#f3f4f6',
    accent: '#ea580c', tabBorder: '#f97316', tabActive: '#ea580c', tabInactive: '#9ca3af',
    cardBg: '#ffffff', cardBorder: '#f3f4f6',
    text: '#111827', subText: '#6b7280', dimText: '#9ca3af',
    inputBg: '#fff7ed', inputBorder: '#fed7aa', inputText: '#111827',
    tagBg: '#ffedd5', tagBorder: '#fdba74', tagText: '#ea580c',
    badgeBg: '#ffedd5', badgeBorder: '#fdba74', badgeText: '#ea580c',
    bubbleMe: '#f97316', bubbleMeText: '#ffffff',
    bubbleAi: '#fef3c7', bubbleAiBorder: '#f97316', bubbleAiText: '#1e293b',
    bubbleOther: '#fff7ed', bubbleOtherText: '#1e293b',
    likeActive: '#ea580c', isNight: false,
  },
  night: {
    bg: '#07060f', headerBg: '#0d0a1a', border: '#1a1530',
    accent: '#a78bfa', tabBorder: '#7f77dd', tabActive: '#a78bfa', tabInactive: '#444',
    cardBg: '#07060f', cardBorder: '#1a1530',
    text: '#e8e0ff', subText: '#888', dimText: '#444',
    inputBg: '#1a1528', inputBorder: '#2a2040', inputText: '#e8e0ff',
    tagBg: '#1e1535', tagBorder: '#2a1f4a', tagText: '#a78bfa',
    badgeBg: '#1e1535', badgeBorder: '#534ab7', badgeText: '#a78bfa',
    bubbleMe: '#534ab7', bubbleMeText: '#ffffff',
    bubbleAi: '#1e1535', bubbleAiBorder: '#a78bfa', bubbleAiText: '#c4b5fd',
    bubbleOther: '#1e1a2e', bubbleOtherText: '#c4b5fd',
    likeActive: '#f472b6', isNight: true,
  },
}

// ── Types ─────────────────────────────────────────────────────────────────────

type RoomType = 'my' | 'friend' | 'identity'
type RoomMeta = { label: string; dot: string; members: string; type: RoomType }

type SubRoom = {
  id: string
  tag: string
  memberCount: number
  isNew?: boolean
}

type Message = {
  id: string
  sender: string
  text: string
  timestamp: string
  color?: string
  likes?: number
}

type TimelinePost = {
  id: string
  user: string
  color: string
  tag: string
  text: string
  time: string
  likes?: number
  isFriend?: boolean
}

type CommentItem = {
  id: string
  user: string
  color: string
  text: string
  time: string
}

type ViewingUser = {
  name: string
  bio: string
  tags: string[]
  color: string
} | null

type CatchupItem = {
  id: string
  roomName: string
  sender: string
  senderColor: string
  text: string
  time: string
  context?: { sender: string; senderColor: string; text: string; time: string }[]
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ROOM_META: Record<string, RoomMeta> = {
  myroom:  { label: '心の部屋',  dot: '#a78bfa', members: 'あなただけ', type: 'my' },
  friend1: { label: 'Hana',       dot: '#34d399', members: 'friend',     type: 'friend' },
  friend2: { label: 'Ryo',        dot: '#60a5fa', members: 'friend',     type: 'friend' },
  id1:     { label: '#内向型',    dot: '#f472b6', members: '247',        type: 'identity' },
  id2:     { label: '#夜型人間',  dot: '#fbbf24', members: '1.2k',       type: 'identity' },
  id3:     { label: '#HSP',       dot: '#6ee7b7', members: '892',        type: 'identity' },
}

const DEFAULT_SUBROOMS: Record<string, SubRoom[]> = {
  id1: [
    { id: 'all',      tag: 'ALL',         memberCount: 247 },
    { id: 'charging', tag: '#充電中',     memberCount: 43  },
    { id: 'reading',  tag: '#読書',       memberCount: 28  },
    { id: 'alone',    tag: '#ひとり時間', memberCount: 61  },
  ],
  id2: [
    { id: 'all',       tag: 'ALL',           memberCount: 1200 },
    { id: 'latenight', tag: '#深夜作業',     memberCount: 312  },
    { id: 'morning',   tag: '#朝型羨ましい', memberCount: 89   },
    { id: 'rhythm',    tag: '#夜型リズム',   memberCount: 156  },
  ],
  id3: [
    { id: 'all',     tag: 'ALL',         memberCount: 892 },
    { id: 'sound',   tag: '#音過敏',     memberCount: 134 },
    { id: 'empathy', tag: '#共感疲労',   memberCount: 201 },
    { id: 'gift',    tag: '#繊細な才能', memberCount: 87  },
  ],
}

const INCOMING_MSGS: Record<string, string[]> = {
  id1: ['人と話した後はしばらくひとりになりたい', '静かな空間が一番落ち着く', 'ひとりの時間＝充電時間', '大人数の飲み会が苦手すぎる'],
  id2: ['深夜2時が一番頭が冴える', '朝の会議がつらい', '夜だけ本当の自分になれる気がする', 'サマータイムとか地獄'],
  id3: ['映画で泣きすぎて疲れた', '他人の感情をもらいすぎる', 'ニュース見るのがしんどくなってきた', 'でも感動も人一倍感じられるのは好き'],
}

const NICKNAMES   = ['すず', 'あお', 'もも', 'かい', 'ゆい', 'なつ']
const NICK_COLORS = ['#f472b6', '#a78bfa', '#60a5fa', '#34d399', '#fbbf24', '#fb923c']

const MOCK_USERS = [
  { id: 'rin',  name: 'rin',  color: '#f472b6' },
  { id: 'kei',  name: 'kei',  color: '#60a5fa' },
  { id: 'yuu',  name: 'yuu',  color: '#34d399' },
  { id: 'ai',   name: 'ai',   color: '#fbbf24' },
  { id: 'sora', name: 'sora', color: '#a78bfa' },
  { id: 'mio',  name: 'mio',  color: '#fb923c' },
  { id: 'haru', name: 'haru', color: '#38bdf8' },
  { id: 'nao',  name: 'nao',  color: '#f87171' },
  { id: 'tomo', name: 'tomo', color: '#4ade80' },
  { id: 'riku', name: 'riku', color: '#e879f9' },
]

const AVATAR_MOCK_MESSAGES = [
  'ひとりの時間が一番落ち着く',
  '静かな空間が好きすぎる',
  '大人数の飲み会は苦手だな',
  '人と話した後はしばらく一人になりたい',
  '今日も充電できた気がする',
  'ひとりの時間＝充電時間',
  '内向型って生きやすい世界になってきた？',
  '読書してたら気づいたら3時間経ってた',
  'カフェのひとり席最高すぎる',
  '静寂って贅沢だよね',
  'SNSも少し疲れてきた',
  'ゆっくり話せる人と話したい',
  '今日はほぼ誰とも話さなかった、最高の1日',
  '深夜の一人時間が好き',
  '雨の日に家にいるの幸せすぎる',
]

const MOCK_MESSAGES: Record<string, Message[]> = {
  myroom: [
    { id: '1', sender: 'ai', text: 'おかえり。今日はどんな一日だった？', timestamp: '今' },
  ],
  friend1: [
    { id: '1', sender: 'Hana', text: 'ねえ最近どう？', timestamp: '5分前', color: '#34d399' },
    { id: '2', sender: 'ai',   text: 'お二人の会話、温かいですね。', timestamp: '3分前' },
  ],
  friend2: [
    { id: '1', sender: 'Ryo', text: '眠れない夜が続いてる。', timestamp: '10分前', color: '#60a5fa' },
    { id: '2', sender: 'ai',  text: '少し話しませんか。', timestamp: '8分前' },
  ],
  id1: [
    { id: '1', sender: 'rin',  text: '今日もひとりの時間が必要だった。',  timestamp: '12分前', color: '#f472b6' },
    { id: '2', sender: 'kei',  text: 'わかりすぎる。',                    timestamp: '10分前', color: '#a78bfa' },
    { id: '3', sender: 'yuu',  text: '人と話すと疲れちゃう。',            timestamp: '7分前',  color: '#60a5fa' },
    { id: '4', sender: 'ai',   text: '内向型は一人の時間がエネルギー源ですね。', timestamp: '5分前' },
  ],
  id2: [
    { id: '1', sender: 'nox',  text: '深夜の方が集中できる。',               timestamp: '20分前', color: '#fbbf24' },
    { id: '2', sender: 'luna', text: '朝型の人間が羨ましい。',               timestamp: '15分前', color: '#f87171' },
    { id: '3', sender: 'sin',  text: '夜は静かで好きだけど、孤独も感じる。', timestamp: '8分前',  color: '#c4b5fd' },
    { id: '4', sender: 'ai',   text: '夜型の感性、大切にしてください。',      timestamp: '5分前' },
  ],
  id3: [
    { id: '1', sender: 'mio',   text: '音に敏感すぎて疲れた。',      timestamp: '18分前', color: '#34d399' },
    { id: '2', sender: 'haru',  text: '共感。カフェとか無理すぎる。', timestamp: '15分前', color: '#60a5fa' },
    { id: '3', sender: 'tsuki', text: '感情の波が激しい日があって。', timestamp: '10分前', color: '#a78bfa' },
    { id: '4', sender: 'ai',    text: 'HSPの感受性は、世界を豊かに感じる力でもあります。', timestamp: '7分前' },
  ],
}

const AI_REPLIES: Record<string, string[]> = {
  myroom:  ['そうか、話してくれてありがとう。', 'もう少し聞かせてほしいな。', 'あなたの気持ち、ちゃんと受け取ったよ。'],
  friend1: ['Hanaも聞いてるよ、きっと。', 'お二人の会話、大切にしてくださいね。', '温かい場所ですね、ここ。'],
  friend2: ['Ryoの言葉、重みがある。', 'あなたの話、ちゃんと届いてる。', '眠れない夜も、一人じゃないよ。'],
  id1:     ['内向型の繊細さ、大切にしてください。', 'ひとりの時間、必要なことあります。', 'みんなも同じ気持ちだよ。'],
  id2:     ['夜型の感性って、独特の美しさがあります。', '深夜の静けさ、共鳴しますね。', '夜の孤独も、あなたの一部だから。'],
  id3:     ['感じやすい心は、宝物だと思う。', 'HSPの感受性、守ってあげてください。', 'みんな、繊細さと生きてる。'],
}

const TIMELINE_POSTS: Record<string, TimelinePost[]> = {
  id1: [
    { id: '1', user: 'umi',  color: '#818cf8', tag: '#充電中',    likes: 14, text: '今日は誰とも話さない日にした。それだけで回復する。',          time: '3分前'  },
    { id: '2', user: 'haru', color: '#f472b6', tag: '#ひとり時間', likes: 8,  text: 'カフェにひとりで来たけど隣の会話がうるさくて早退した',        time: '11分前' },
    { id: '3', user: 'sora', color: '#60a5fa', tag: '#充電中',    likes: 22, text: '読書してたら3時間経ってた。最高の時間。',                    time: '28分前' },
    { id: '4', user: 'kiri', color: '#34d399', tag: '#読書',      likes: 31, text: '内向型あるある：飲み会断った後の罪悪感と解放感が同時にくる', time: '1時間前' },
  ],
  id2: [
    { id: '1', user: 'nox',   color: '#fbbf24', tag: '#深夜作業',     likes: 18, text: '深夜2時が一番頭が冴える。なんでこうなった。',       time: '1分前'  },
    { id: '2', user: 'luna',  color: '#fb923c', tag: '#夜型リズム',   likes: 45, text: '朝8時の会議を設定した人間を恨んでいる',             time: '9分前'  },
    { id: '3', user: 'tsuki', color: '#a78bfa', tag: '#深夜作業',     likes: 27, text: '夜だけ本当の自分になれる気がする。静かだから。',     time: '22分前' },
    { id: '4', user: 'yomi',  color: '#6ee7b7', tag: '#朝型羨ましい', likes: 33, text: 'サマータイム導入とか地獄すぎる議論やめてほしい',     time: '45分前' },
    { id: '5', user: 'Hana',  color: '#34d399', tag: '#深夜作業',     likes: 2,  text: '私も夜型だよ〜一緒に頑張ろ',   time: '2分前',  isFriend: true },
    { id: '6', user: 'Ryo',   color: '#60a5fa', tag: '#夜型リズム',   likes: 1,  text: '深夜のテンションで送ってごめん', time: '30分前', isFriend: true },
  ],
  id3: [
    { id: '1', user: 'shio', color: '#6ee7b7', tag: '#共感疲労',  likes: 11, text: '映画で泣きすぎて逆に疲れた。感受性よ。',                        time: '5分前'  },
    { id: '2', user: 'hana', color: '#f472b6', tag: '#音過敏',    likes: 19, text: '工事の音が頭に刺さる感じする。みんなはそうじゃないの？',        time: '18分前' },
    { id: '3', user: 'ao',   color: '#60a5fa', tag: '#繊細な才能', likes: 7,  text: '他人の感情を読みすぎてへとへとになる。でもそれが強みとも聞いた', time: '33分前' },
    { id: '4', user: 'rin',  color: '#a78bfa', tag: '#共感疲労',  likes: 24, text: 'ニュース見るのしんどくて最近SNS断ちしてる',                    time: '1時間前' },
  ],
}

const dummyProfiles: Record<string, { bio: string; tags: string[]; color: string }> = {
  umi:  { bio: '海と本が好き🌊 充電中はひとりの時間大切に',  tags: ['#充電中', '#読書', '#内向型', '#海好き'],        color: '#3B82F6' },
  haru: { bio: 'カフェ巡りが趣味☕ ひとり時間を愛してます',   tags: ['#ひとり時間', '#カフェ', '#内向型'],             color: '#10B981' },
  sora: { bio: '読書と音楽で生きてる🎵',                     tags: ['#充電中', '#読書', '#音楽好き', '#内向型'],      color: '#8B5CF6' },
  kiri: { bio: '内向型あるあるを発信中',                      tags: ['#読書', '#内向型', '#インドア'],                 color: '#F59E0B' },
}

const ALL_PARTICIPANT_NAMES = ['umi','haru','sora','kiri','mao','ren','yuki','tomo','nana','kai','riku','sara','jin','mei','ryo']
const ALL_PARTICIPANT_TAGS  = ['#充電中','#読書','#内向型','#ひとり時間','#音楽好き','#カフェ','#夜型','#HSP','#共感疲労','#インドア']

const MY_TAGS          = ['#充電中', '#読書', '#夜型', '#内向型', '#音楽好き']
const MY_IDENTITY_TAGS = ['#夜型', '#音楽好き', '#猫派', '#インドア']

const ALL_EMOJIS: string[] = [
  '😀','😂','🥹','😊','😇','🥰','😍','🤩','😘','😎','🥳','😤','😢','😭','😱','😴','🤔','😶','🫠','🥲',
  '👍','👎','👏','🙌','🤝','🫶','❤️','🔥','✨','💫','🎉','🎊','💯','🙏','👋','✌️','🤞','🫡','💪','🫂',
  '🌙','⭐','🌟','☀️','🌈','🌸','🍀','🐱','🐶','🦋','🌊','❄️','🍃','🌿','🪴',
  '☕','🍵','🧋','🍺','🍜','🍣','🍰','🎂','🍩','🍪',
  '📚','🎵','🎮','💻','📱','💡','🔑','🎯','🧩','💤','🛌','🏠','✏️','📝','💬',
]

const MOCK_COMMENTS: CommentItem[] = [
  { id: '1', user: 'kaze', color: '#818cf8', text: 'わかりすぎる', time: '今' },
  { id: '2', user: 'suki', color: '#f472b6', text: '毎日そう思ってる', time: '1分前' },
]

const MOCK_CATCHUP_ITEMS: CatchupItem[] = [
  {
    id: 'c1',
    roomName: '充電中',
    sender: 'tsuki',
    senderColor: '#a78bfa',
    text: 'ひとりの時間って本当に大事だよね。充電できた気がする',
    time: '3分前',
    context: [
      { sender: 'luna', senderColor: '#fb923c', text: '最近人と会いすぎてちょっと疲れた',          time: '15分前' },
      { sender: 'nox',  senderColor: '#6ee7b7', text: 'わかる。一人でいる時間がないとしんどい',   time: '10分前' },
    ],
  },
  {
    id: 'c2',
    roomName: '充電中',
    sender: 'luna',
    senderColor: '#fb923c',
    text: '今日はカフェで一人作業してきた。最高だった',
    time: '8分前',
    context: [
      { sender: 'tsuki', senderColor: '#a78bfa', text: 'ひとりの時間って本当に大事だよね', time: '3分前' },
    ],
  },
  {
    id: 'c3',
    roomName: '充電中',
    sender: 'nox',
    senderColor: '#6ee7b7',
    text: '静かな場所で過ごすだけで回復する気がする',
    time: '20分前',
    context: [
      { sender: 'luna',  senderColor: '#fb923c', text: '今日はカフェで一人作業してきた。最高だった', time: '8分前'  },
      { sender: 'tsuki', senderColor: '#a78bfa', text: 'わかる、雑音がないだけで全然違う',           time: '12分前' },
    ],
  },
]

const CATCHUP_ROOMS = new Set(['内向型'])

// ── ChatRoom ──────────────────────────────────────────────────────────────────

type Props = { roomKey?: string; roomId?: string; roomName?: string; tagName?: string; onBack: () => void; forceLocked?: boolean }
type ChatTab = 'timeline' | 'chat'

export function ChatRoom({ roomKey: roomKeyProp, roomId, roomName, tagName: tagNameProp, onBack, forceLocked = false }: Props) {
  const roomKey  = (roomKeyProp && ROOM_META[roomKeyProp]) ? roomKeyProp
                 : (roomId && ROOM_META[roomId]) ? roomId
                 : 'id2'
  const baseMeta = ROOM_META[roomKey] ?? { label: roomKey, dot: '#a78bfa', members: '', type: 'identity' as RoomType }
  const meta     = roomName ? { ...baseMeta, label: roomName } : baseMeta
  const isIdentity = meta.type === 'identity'
  const hasTabs    = meta.type === 'friend'

  // Period + theme
  const [period, setPeriod] = useState<Period>('night')
  useEffect(() => {
    setPeriod(getPeriod(new Date().getHours()))
  }, [])
  const t = THEME[period]

  // Tag follow state
  const { followTag, unfollowTag, isFollowing } = useTagStore()
  const internalTagName = meta.label.startsWith('#') ? meta.label.slice(1) : meta.label
  const tagName  = (forceLocked && tagNameProp) ? tagNameProp : internalTagName
  const following = isIdentity && isFollowing(tagName)

  // ── Identity: subroom list state ─────────────────────────────────
  const [activeSubRoom, setActiveSubRoom]       = useState<SubRoom | null>(null)
  const [subRooms, setSubRooms]                 = useState<SubRoom[]>(DEFAULT_SUBROOMS[roomKey] ?? [])
  const [isCreating, setIsCreating]             = useState(false)
  const [newRoomName, setNewRoomName]           = useState('')
  const [activeListTab, setActiveListTab]       = useState<'rooms' | 'timeline'>('rooms')

  // ── Identity: timeline state ─────────────────────────────────────
  const [timelinePosts, setTimelinePosts]     = useState<TimelinePost[]>(TIMELINE_POSTS[roomKey] ?? [])
  const [timelineFilter, setTimelineFilter]   = useState<'all' | 'friend'>('all')
  const [timelineSub, setTimelineSub]         = useState<string>('all')
  const [selectedPost, setSelectedPost]       = useState<TimelinePost | null>(null)
  const [commentMap, setCommentMap]           = useState<Record<string, CommentItem[]>>({})
  const [commentInput, setCommentInput]       = useState('')
  const [isPosting, setIsPosting]             = useState(false)
  const [newPostText, setNewPostText]         = useState('')
  const [selectedPostTag, setSelectedPostTag] = useState('')

  // ── Profile sub-page state ───────────────────────────────────────
  const [viewingUser, setViewingUser] = useState<ViewingUser>(null)

  // ── Participants sub-page state ──────────────────────────────────
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false)
  const [isExitConfirmOpen, setIsExitConfirmOpen]   = useState(false)

  // ── Catchup state ────────────────────────────────────────────────
  const [catchupOpen, setCatchupOpen] = useState(false)
  const [showCatchUp, setShowCatchUp] = useState(false)

  useEffect(() => {
    const count = CATCHUP_ROOMS.has(internalTagName) ? MOCK_CATCHUP_ITEMS.length : 0
    if (count > 0) {
      setShowCatchUp(true)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Chat state ───────────────────────────────────────────────────
  const [tab, setTab]           = useState<ChatTab>('chat')
  const [msgs, setMsgs]         = useState<Message[]>(MOCK_MESSAGES[roomKey] ?? [])
  const [input, setInput]       = useState('')
  const [isTypingChat, setIsTypingChat] = useState(false)
  const [showActionSheetChat, setShowActionSheetChat] = useState(false)
  const [isRecordingChat, setIsRecordingChat] = useState(false)
  const [recordingSecondsChat, setRecordingSecondsChat] = useState(0)
  const fileInputChatRef = useRef<HTMLInputElement>(null)
  const recordingTimerChatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [aiTyping, setAiTyping] = useState(false)
  const [sharedImages, setSharedImages] = useState<{ id: number; url: string; sender: string; time: string }[]>([])
  const [isImagesOpen, setIsImagesOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isRoomSettingsOpen, setIsRoomSettingsOpen] = useState(false)
  const [isRoomMuted, setIsRoomMuted] = useState(false)
  const [roomSettingsTab, setRoomSettingsTab] = useState<'general' | 'custom'>('general')

  const FRIEND_CHAT_STORAGE_KEY = `friendChatCustomize_${roomKey}`
  const [friendChatCustomize, setFriendChatCustomize] = useState(() => {
    try {
      const r = localStorage.getItem(`friendChatCustomize_${roomKey}`)
      if (r) return JSON.parse(r)
      const g = localStorage.getItem('chatCustomize')
      if (g) return { ...JSON.parse(g), roomThemeColor: '#7c3aed', timelineCardColor: '#1e1e3a', timelineCardTextColor: '#ffffff' }
    } catch {}
    return { bgColor: '#0f0f1a', myBubbleColor: '#7c3aed', otherBubbleColor: '#1e1e3a', myTextColor: '#ffffff', otherTextColor: '#ffffff', roomThemeColor: '#7c3aed', timelineCardColor: '#1e1e3a', timelineCardTextColor: '#ffffff' }
  })
  const [friendChatHue, setFriendChatHue] = useState({ bg: 240, myBubble: 270, otherBubble: 220, myText: 0, otherText: 0, roomTheme: 270, timelineCard: 220, timelineCardText: 0 })
  const [friendChatLightness, setFriendChatLightness] = useState({ bg: 10, myBubble: 50, otherBubble: 15, myText: 100, otherText: 100, roomTheme: 50, timelineCard: 15, timelineCardText: 100 })
  const [friendChatOpenSub, setFriendChatOpenSub] = useState<string | null>(null)
  const [friendChatSavedFeedback, setFriendChatSavedFeedback] = useState<string | null>(null)
  const [friendChatPaletteOpen, setFriendChatPaletteOpen] = useState<string | null>(null)
  const [chatSharedDecoOpen, setChatSharedDecoOpen] = useState(false)
  const [sharedDecoAll, setSharedDecoAll] = useState(true)
  const [sharedDecoBg, setSharedDecoBg] = useState(true)
  const [sharedDecoBubble, setSharedDecoBubble] = useState(true)
  const [sharedDecoText, setSharedDecoText] = useState(true)
  const [sharedDecoTheme, setSharedDecoTheme] = useState(true)
  const [sharedDecoTimeline, setSharedDecoTimeline] = useState(true)
  const [useFriendChatGlobalSetting, setUseFriendChatGlobalSetting] = useState(() => {
    try { return !localStorage.getItem(`friendChatCustomize_${roomKey}`) } catch { return true }
  })
  const handleFriendChatSave = (section: string) => {
    try {
      localStorage.setItem(FRIEND_CHAT_STORAGE_KEY, JSON.stringify(friendChatCustomize))
      setUseFriendChatGlobalSetting(false)
      setFriendChatSavedFeedback(section)
      setTimeout(() => setFriendChatSavedFeedback(null), 1500)
    } catch (e) { console.error(e) }
  }
  const renderFriendChatSlider = (
    hueKey: keyof typeof friendChatHue,
    colorProp: keyof typeof friendChatCustomize,
    paletteId: string
  ) => {
    const h = friendChatHue[hueKey]; const l = friendChatLightness[hueKey as keyof typeof friendChatLightness]
    const currentColor = String(friendChatCustomize[colorProp])
    const updateColor = (v: number, isHue: boolean) => {
      if (isHue) { setFriendChatHue((p: typeof friendChatHue) => ({ ...p, [hueKey]: v })); setFriendChatCustomize((p: typeof friendChatCustomize) => ({ ...p, [colorProp]: `hsl(${v},70%,${l}%)` })) }
      else { setFriendChatLightness((p: typeof friendChatLightness) => ({ ...p, [hueKey]: v })); setFriendChatCustomize((p: typeof friendChatCustomize) => ({ ...p, [colorProp]: `hsl(${h},70%,${v}%)` })) }
    }
    return (
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: currentColor, flexShrink: 0, border: '2px solid rgba(255,255,255,0.4)', boxShadow: '0 0 0 1px rgba(0,0,0,0.4)' }} />
          <input type="range" min={0} max={360} value={h} className="hue-slider"
            onChange={e => updateColor(Number(e.target.value), true)}
            onInput={e => updateColor(Number((e.target as HTMLInputElement).value), true)}
            style={{ flex: 1 }} />
          <button onClick={() => setFriendChatPaletteOpen(p => p === paletteId ? null : paletteId)} style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: friendChatPaletteOpen === paletteId ? '#7c3aed' : 'rgba(255,255,255,0.1)', cursor: 'pointer', fontSize: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🎨</button>
        </div>
        <input type="range" min={10} max={90} value={l} className="hue-slider"
          style={{ width: '100%', marginBottom: 8, background: `linear-gradient(to right, hsl(${h},70%,10%), hsl(${h},70%,50%), hsl(${h},70%,90%))` }}
          onChange={e => updateColor(Number(e.target.value), false)}
          onInput={e => updateColor(Number((e.target as HTMLInputElement).value), false)}
        />
        {friendChatPaletteOpen === paletteId && (
          <>
            <div onClick={() => setFriendChatPaletteOpen(null)} style={{ position: 'fixed', inset: 0, zIndex: 0 }} />
            <div style={{ position: 'relative', zIndex: 1, background: 'rgba(20,20,40,0.97)', borderRadius: 12, padding: 10, marginBottom: 6 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginBottom: 6 }}>
                {ROOM_PALETTE_THEME_COLORS.flat().map((c, i) => <button key={i} onClick={() => setFriendChatCustomize((p: typeof friendChatCustomize) => ({ ...p, [colorProp]: c }))} style={{ width: 22, height: 16, borderRadius: 2, background: c, border: currentColor === c ? '2px solid white' : '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', padding: 0 }} />)}
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {ROOM_PALETTE_STD_COLORS.map((c, i) => <button key={i} onClick={() => setFriendChatCustomize((p: typeof friendChatCustomize) => ({ ...p, [colorProp]: c }))} style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: currentColor === c ? '2px solid white' : '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', padding: 0 }} />)}
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  const GROUP_ROOM_STORAGE_KEY = `groupRoomCustomize_${roomKey}`
  const [groupRoomCustomize, setGroupRoomCustomize] = useState(() => {
    try {
      const r = localStorage.getItem(`groupRoomCustomize_${roomKey}`)
      if (r) return JSON.parse(r)
      const g = localStorage.getItem('chatCustomize')
      if (g) return { ...JSON.parse(g), roomThemeColor: '#7c3aed', timelineCardColor: '#1e1e3a', timelineCardTextColor: '#ffffff' }
    } catch {}
    return { bgColor: '#0f0f1a', myBubbleColor: '#7c3aed', otherBubbleColor: '#1e1e3a', myTextColor: '#ffffff', otherTextColor: '#ffffff', roomThemeColor: '#7c3aed', timelineCardColor: '#1e1e3a', timelineCardTextColor: '#ffffff' }
  })
  const [groupRoomHue, setGroupRoomHue] = useState({ bg: 240, myBubble: 270, otherBubble: 220, myText: 0, otherText: 0, roomTheme: 270, timelineCard: 220, timelineCardText: 0 })
  const [groupRoomLightness, setGroupRoomLightness] = useState({ bg: 10, myBubble: 50, otherBubble: 15, myText: 100, otherText: 100, roomTheme: 50, timelineCard: 15, timelineCardText: 100 })
  const [groupRoomOpenSub, setGroupRoomOpenSub] = useState<string | null>(null)
  const [groupRoomSavedFeedback, setGroupRoomSavedFeedback] = useState<string | null>(null)
  const [roomBgSubOpen,     setRoomBgSubOpen]     = useState(false)
  const [roomAvatarBgSubOpen,    setRoomAvatarBgSubOpen]    = useState(false)
  const [roomAvatarBgChangeOpen, setRoomAvatarBgChangeOpen] = useState(false)
  const [roomAvatarChangeOpen,   setRoomAvatarChangeOpen]   = useState(false)
  const [roomSelectedAvatar,     setRoomSelectedAvatar]     = useState<string | null>(null)
  const [roomMyBubbleOpen,  setRoomMyBubbleOpen]  = useState(false)
  const [roomTheirBubbleOpen, setRoomTheirBubbleOpen] = useState(false)
  const [roomMyTextOpen,    setRoomMyTextOpen]    = useState(false)
  const [roomTheirTextOpen, setRoomTheirTextOpen] = useState(false)
  const [roomCardBgOpen,    setRoomCardBgOpen]    = useState(false)
  const [roomCardTextOpen,  setRoomCardTextOpen]  = useState(false)
  const [chatBgSubOpen2,         setChatBgSubOpen2]         = useState(false)
  const [chatAvatarBgSubOpen,    setChatAvatarBgSubOpen]    = useState(false)
  const [chatAvatarBgChangeOpen, setChatAvatarBgChangeOpen] = useState(false)
  const [chatAvatarChangeOpen,   setChatAvatarChangeOpen]   = useState(false)
  const [chatSelectedAvatar,     setChatSelectedAvatar]     = useState<string | null>(null)
  const [chatMyBubbleOpen,     setChatMyBubbleOpen]     = useState(false)
  const [chatTheirBubbleOpen,  setChatTheirBubbleOpen]  = useState(false)
  const [chatMyTextOpen,       setChatMyTextOpen]       = useState(false)
  const [chatTheirTextOpen,    setChatTheirTextOpen]    = useState(false)
  const [chatCardBgOpen,       setChatCardBgOpen]       = useState(false)
  const [chatCardTextOpen,     setChatCardTextOpen]     = useState(false)
  const [roomAvatarBgOpen,        setRoomAvatarBgOpen]        = useState(false)
  const [roomAvatarBgMode,        setRoomAvatarBgMode]        = useState<'color' | 'image' | 'virtual'>('color')
  const [roomAvatarBgImage,       setRoomAvatarBgImage]       = useState<string | null>(null)
  const [roomAvatarBg,            setRoomAvatarBg]            = useState<string | undefined>(undefined)
  const [roomAvatarBgPaletteOpen, setRoomAvatarBgPaletteOpen] = useState(false)
  const [savedAvatars] = useState<{ id: number; imageUrl: string }[]>([])
  const [roomAvatarBgHue,   setRoomAvatarBgHue]   = useState(270)
  const [roomAvatarBgSat,   setRoomAvatarBgSat]   = useState(60)
  const [roomAvatarBgLight, setRoomAvatarBgLight] = useState(10)
  const roomAvatarBgImageInputRef = useRef<HTMLInputElement>(null)
  const AVATAR_BG_RECOMMEND = ['#8B5E3C','#6B4423','#A0522D','#CD853F','#D2691E','#556B2F','#2F4F4F','#4A4A8A','#8B3A3A','#1C1C1C','#F5DEB3','#FAEBD7','#DEB887','#BC8F5F','#A9A9A9','#C0C0C0','#808080']
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
  const ROOM_VIRTUAL_BGSETS = [
    { label: '宇宙',    gradient: 'linear-gradient(135deg, #0d0221, #1a0533, #0d1b4b)' },
    { label: '夜の街',  gradient: 'linear-gradient(180deg, #0a0a2e 0%, #1a1040 50%, #0d0a1e 100%)' },
    { label: 'オーロラ',gradient: 'linear-gradient(135deg, #0d4f3c, #1a2a4a, #3d1a5c)' },
    { label: '夕焼け',  gradient: 'linear-gradient(135deg, #ff6b35, #f7931e, #ffcd3c)' },
    { label: '深海',    gradient: 'linear-gradient(180deg, #001233, #023e8a, #0077b6)' },
    { label: '桜',      gradient: 'linear-gradient(135deg, #ffecd2, #fcb69f, #ff9a9e)' },
  ]
  const [roomPaletteOpen, setRoomPaletteOpen] = useState<string | null>(null)
  const [useOwnCardColor, setUseOwnCardColor] = useState(true)
  const [useGroupGlobalSetting, setUseGroupGlobalSetting] = useState(() => {
    try { return !localStorage.getItem(`groupRoomCustomize_${roomKey}`) } catch { return true }
  })
  const handleGroupRoomSave = (section: string) => {
    try {
      localStorage.setItem(GROUP_ROOM_STORAGE_KEY, JSON.stringify(groupRoomCustomize))
      setUseGroupGlobalSetting(false)
      setGroupRoomSavedFeedback(section)
      setTimeout(() => setGroupRoomSavedFeedback(null), 1500)
    } catch (e) { console.error(e) }
  }

  const renderGroupSlider = (
    hueKey: keyof typeof groupRoomHue,
    colorProp: keyof typeof groupRoomCustomize,
    paletteId: string
  ) => {
    const h = groupRoomHue[hueKey]; const l = groupRoomLightness[hueKey as keyof typeof groupRoomLightness]
    const currentColor = String(groupRoomCustomize[colorProp])
    const updateColor = (v: number, isHue: boolean) => {
      if (isHue) { setGroupRoomHue((p: typeof groupRoomHue) => ({ ...p, [hueKey]: v })); setGroupRoomCustomize((p: typeof groupRoomCustomize) => ({ ...p, [colorProp]: `hsl(${v},70%,${l}%)` })) }
      else { setGroupRoomLightness((p: typeof groupRoomLightness) => ({ ...p, [hueKey]: v })); setGroupRoomCustomize((p: typeof groupRoomCustomize) => ({ ...p, [colorProp]: `hsl(${h},70%,${v}%)` })) }
    }
    return (
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: currentColor, flexShrink: 0, border: '2px solid rgba(255,255,255,0.6)', boxShadow: '0 0 0 1px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.1)' }} />
          <input type="range" min={0} max={360} value={h} className="hue-slider"
            onChange={e => updateColor(Number(e.target.value), true)}
            onInput={e => updateColor(Number((e.target as HTMLInputElement).value), true)}
            style={{ flex: 1 }} />
          <button onClick={() => setRoomPaletteOpen(roomPaletteOpen === paletteId ? null : paletteId)} style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: roomPaletteOpen === paletteId ? '#7c3aed' : 'rgba(255,255,255,0.1)', cursor: 'pointer', fontSize: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🎨</button>
        </div>
        <input type="range" min={10} max={90} value={l} className="hue-slider"
          style={{ width: '100%', marginBottom: 8, background: `linear-gradient(to right, hsl(${h},70%,10%), hsl(${h},70%,50%), hsl(${h},70%,90%))` }}
          onChange={e => updateColor(Number(e.target.value), false)}
          onInput={e => updateColor(Number((e.target as HTMLInputElement).value), false)}
        />
        {roomPaletteOpen === paletteId && (
          <>
            <div onClick={() => setRoomPaletteOpen(null)} style={{ position: 'fixed', inset: 0, zIndex: 0 }} />
            <div style={{ background: 'rgba(20,20,40,0.97)', borderRadius: 12, padding: 10, marginBottom: 8, position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginBottom: 8 }}>
                {ROOM_PALETTE_THEME_COLORS.flat().map((c, i) => (
                  <button key={i} onClick={() => setGroupRoomCustomize((p: typeof groupRoomCustomize) => ({ ...p, [colorProp]: c }))} style={{ width: 22, height: 16, borderRadius: 2, background: c, border: currentColor === c ? '2px solid white' : '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', padding: 0 }} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {ROOM_PALETTE_STD_COLORS.map((c, i) => <button key={i} onClick={() => setGroupRoomCustomize((p: typeof groupRoomCustomize) => ({ ...p, [colorProp]: c }))} style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: currentColor === c ? '2px solid white' : '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', padding: 0 }} />)}
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  const [chatSettingsTab, setChatSettingsTab] = useState<'general' | 'custom'>('general')
  const [useDefaultDoor, setUseDefaultDoor] = useState(true)
  const [useSharedDoor, setUseSharedDoor] = useState(false)

  // ── friend chat customize state ──────────────────────────────────
  const CS_DEFAULT = { bgColor: '#0f0f1a', myBubbleColor: '#7c3aed', otherBubbleColor: '#1e1e3a', myTextColor: '#ffffff', otherTextColor: '#ffffff' }
  const [csChatOpen,    setCsChatOpen]    = useState(false)
  const [csOuterOpen,   setCsOuterOpen]   = useState(false)
  const [csNaviOpen,    setCsNaviOpen]    = useState(false)
  const [csPeriodOpen,  setCsPeriodOpen]  = useState(false)
  const [csChatCustomize, setCsChatCustomize] = useState(() => { try { const s = localStorage.getItem('chatCustomize'); return s ? JSON.parse(s) : CS_DEFAULT } catch { return CS_DEFAULT } })
  const [csHue,  setCsHue]  = useState({ bg: 240, myBubble: 270, otherBubble: 220, myText: 0, otherText: 0 })
  const [csLightness, setCsLightness] = useState({ bg: 10, myBubble: 50, otherBubble: 15, myText: 100, otherText: 100 })
  const [csOpenSub,    setCsOpenSub]    = useState<string | null>(null)
  const [csPaletteOpen, setCsPaletteOpen] = useState<string | null>(null)
  const [csSavedFeedback, setCsSavedFeedback] = useState<string | null>(null)
  const CS_APPEAR_DEF = { tabBgColor: '#0f0f1a', tabTextColor: '#ffffff', tabActiveColor: '#7c3aed' }
  const CS_NAVI_DEF   = { bgColor: '#1a1a2e', textColor: '#ffffff', activeColor: '#7c3aed' }
  const [csAppear, setCsAppear] = useState(() => { try { const s = localStorage.getItem('appearanceCustomize'); return s ? JSON.parse(s) : CS_APPEAR_DEF } catch { return CS_APPEAR_DEF } })
  const [csNavi,   setCsNavi]   = useState(() => { try { const s = localStorage.getItem('naviCustomize');      return s ? JSON.parse(s) : CS_NAVI_DEF }   catch { return CS_NAVI_DEF } })
  const [csHueA, setCsHueA] = useState({ tabBg: 240, tabText: 0, tabActive: 270 })
  const [csLightA, setCsLightA] = useState({ tabBg: 10, tabText: 100, tabActive: 50 })
  const [csHueN, setCsHueN] = useState({ bg: 230, text: 0, active: 270 })
  const [csLightN, setCsLightN] = useState({ bg: 15, text: 100, active: 50 })
  const [csOpenSub2, setCsOpenSub2] = useState<string | null>(null)
  const [csOpenSub3, setCsOpenSub3] = useState<string | null>(null)
  const [csPaletteA, setCsPaletteA] = useState<string | null>(null)
  const [csPaletteN, setCsPaletteN] = useState<string | null>(null)
  const [csSavedA, setCsSavedA] = useState<string | null>(null)
  const [csSavedN, setCsSavedN] = useState<string | null>(null)
  const CS_PERIOD_DEF = { morning: { start: 6, end: 11 }, afternoon: { start: 11, end: 17 }, evening: { start: 17, end: 21 }, night: { start: 21, end: 6 } }
  const [csPeriodHours, setCsPeriodHours] = useState(() => { try { const s = localStorage.getItem('periodHours'); return s ? JSON.parse(s) : CS_PERIOD_DEF } catch { return CS_PERIOD_DEF } })
  const [csPeriodSync, setCsPeriodSync] = useState(() => { try { const s = localStorage.getItem('periodSync'); return s ? JSON.parse(s) : { chatBg: false, chatBubble: false, chatText: false, appearance: false, navi: false } } catch { return { chatBg: false, chatBubble: false, chatText: false, appearance: false, navi: false } } })
  const [csOpenPeriod, setCsOpenPeriod] = useState<string | null>(null)
  const [csSavedPeriod, setCsSavedPeriod] = useState(false)
  const [isSharedDoorEditOpen, setIsSharedDoorEditOpen] = useState(false)
  const { savedDoorMap, sharedDoorMap, setSharedDoor } = useWorldStore()
  const sharedDoorDoors: DoorRoom[] = [{
    key: roomKey ?? 'friend',
    label: meta.label,
    sublabel: 'friend',
    doorColor: sharedDoorMap[roomKey ?? '']?.doorColor ?? '#8B5E3C',
    doorAccentColor: sharedDoorMap[roomKey ?? '']?.doorAccentColor ?? '#6B4423',
    labelBgColor: sharedDoorMap[roomKey ?? '']?.labelBgColor ?? '#1a0a00cc',
    labelTextColor: sharedDoorMap[roomKey ?? '']?.labelTextColor ?? '#ffffff',
    knobColor: sharedDoorMap[roomKey ?? '']?.knobColor ?? '#D4AF37',
  }]
  const [roomChatMode, setRoomChatMode] = useState<'chat' | 'avatar'>('chat')

  type AvatarSlot = {
    senderId: string
    senderName: string
    avatarUrl?: string
    text: string
    count: number
    time: string
  }
  const [avatarSlots, setAvatarSlots] = useState<AvatarSlot[]>([])
  const bottomRef               = useRef<HTMLDivElement>(null)
  const incomingTimer           = useRef<ReturnType<typeof setTimeout> | null>(null)
  const chatScrollRef           = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isIdentity || activeSubRoom === null) return
    setInput('')
    setAiTyping(false)
    setMsgs(MOCK_MESSAGES[roomKey] ?? [])
  }, [activeSubRoom, isIdentity, roomKey])

  useEffect(() => {
    if (tab !== 'chat') return
    if (isIdentity && activeSubRoom === null) return
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, tab, isIdentity, activeSubRoom])

  useEffect(() => {
    if (!isIdentity || activeSubRoom === null) return
    const pool = INCOMING_MSGS[roomKey] ?? []
    if (!pool.length) return
    const schedule = () => {
      incomingTimer.current = setTimeout(() => {
        const text  = pool[Math.floor(Math.random() * pool.length)]
        const nick  = NICKNAMES[Math.floor(Math.random() * NICKNAMES.length)]
        const color = NICK_COLORS[Math.floor(Math.random() * NICK_COLORS.length)]
        setMsgs(prev => [...prev, { id: Date.now().toString(), sender: nick, text, timestamp: 'たった今', color }])
        schedule()
      }, 8000 + Math.random() * 7000)
    }
    schedule()
    return () => { if (incomingTimer.current) clearTimeout(incomingTimer.current) }
  }, [isIdentity, roomKey, activeSubRoom])

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [msgs])

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [])

  // ── Handlers ─────────────────────────────────────────────────────

  const updateAvatarSlots = (senderId: string, senderName: string, text: string, avatarUrl?: string) => {
    setAvatarSlots(prev => {
      const existingIndex = prev.findIndex(s => s.senderId === senderId)

      if (existingIndex !== -1) {
        const existing = prev[existingIndex]
        const without = prev.filter((_, i) => i !== existingIndex)
        const updated = [
          ...without,
          {
            ...existing,
            text,
            count: existing.count + 1,
            time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
          },
        ]
        return updated.slice(-4)
      } else {
        const newSlot: AvatarSlot = {
          senderId,
          senderName,
          avatarUrl,
          text,
          count: 1,
          time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
        }
        return [...prev, newSlot].slice(-4)
      }
    })
  }

  useEffect(() => {
    if (roomChatMode !== 'avatar') return
    const interval = setInterval(() => {
      const user = MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)]
      const text = AVATAR_MOCK_MESSAGES[Math.floor(Math.random() * AVATAR_MOCK_MESSAGES.length)]
      updateAvatarSlots(user.id, user.name, text, undefined)
    }, 2000)
    return () => clearInterval(interval)
  }, [roomChatMode]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleInputChangeChat = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInput(val)
    setIsTypingChat(val.length > 0)
  }
  const handleMicPressStartChat = () => {
    setIsRecordingChat(true)
    setRecordingSecondsChat(0)
    recordingTimerChatRef.current = setInterval(() => setRecordingSecondsChat(p => p + 1), 1000)
  }
  const handleMicPressEndChat = () => {
    if (!isRecordingChat) return
    if (recordingTimerChatRef.current) { clearInterval(recordingTimerChatRef.current); recordingTimerChatRef.current = null }
    setIsRecordingChat(false)
    if (recordingSecondsChat > 0) {
      setMsgs(prev => [...prev, { id: Date.now().toString(), sender: 'me', text: `🎤 ボイスメッセージ (${recordingSecondsChat}秒)`, timestamp: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) }])
    }
    setRecordingSecondsChat(0)
  }
  const handleImageSelectChat = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const imageUrl = reader.result as string
      const time = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
      setSharedImages(prev => [...prev, { id: Date.now(), url: imageUrl, sender: 'me', time }])
    }
    reader.readAsDataURL(file)
  }

  const send = () => {
    const text = input.trim()
    if (!text) return
    setMsgs(prev => [...prev, { id: Date.now().toString(), sender: 'me', text, timestamp: 'たった今' }])
    updateAvatarSlots('me', 'あなた', text)
    setInput('')
    setIsTypingChat(false)
    const total = 3000 + Math.random() * 3000
    setTimeout(() => setAiTyping(true), Math.max(0, total - 1500))
    setTimeout(() => {
      const replies = AI_REPLIES[roomKey] ?? ['...']
      const replyText = replies[Math.floor(Math.random() * replies.length)]
      setAiTyping(false)
      setMsgs(prev => [...prev, { id: (Date.now() + 1).toString(), sender: 'ai', text: replyText, timestamp: 'たった今' }])
      updateAvatarSlots('ai', meta.label, replyText)
    }, total)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); send() }
  }

  const handleCreateRoom = () => {
    const name = newRoomName.trim()
    if (!name) return
    setSubRooms(prev => [...prev, { id: Date.now().toString(), tag: '#' + name, memberCount: 1, isNew: true }])
    setNewRoomName('')
    setIsCreating(false)
  }

  const handlePost = () => {
    const text = newPostText.trim()
    if (!text) return
    const tag = selectedPostTag || subRooms.find(s => s.id !== 'all')?.tag || '#全般'
    setTimelinePosts(prev => [{
      id: Date.now().toString(), user: 'あなた', color: t.accent,
      tag, text, time: '今', likes: 0, isFriend: false,
    }, ...prev])
    setNewPostText('')
    setSelectedPostTag('')
    setIsPosting(false)
  }

  const handleAddComment = () => {
    if (!selectedPost || !commentInput.trim()) return
    setCommentMap(prev => ({
      ...prev,
      [selectedPost.id]: [...(prev[selectedPost.id] ?? MOCK_COMMENTS), {
        id: Date.now().toString(), user: 'あなた', color: t.accent,
        text: commentInput.trim(), time: '今',
      }],
    }))
    setCommentInput('')
  }

  const openUserProfile = (name: string) => {
    const profile = dummyProfiles[name] ?? { bio: `${name}さん`, tags: [], color: '#a78bfa' }
    setViewingUser({ name, ...profile })
  }

  // ── Identity: subroom list view ──────────────────────────────────
  if (isIdentity && activeSubRoom === null) {
    const postTagOptions = subRooms.filter(s => s.id !== 'all').map(s => s.tag)
    const parseTime = (s: string) => {
      const n = parseInt(s)
      return s.includes('時間') ? n * 60 : n
    }
    const subroomPosts = timelineSub === 'all'
      ? [...timelinePosts].sort((a, b) => parseTime(a.time) - parseTime(b.time))
      : timelinePosts.filter(p => p.tag === subRooms.find(s => s.id === timelineSub)?.tag)
    const filteredPosts = timelineFilter === 'all'
      ? subroomPosts
      : subroomPosts.filter(p => p.isFriend)

    return (
      <div
        className="flex flex-col"
        style={{ height: '100%', background: t.bg, fontFamily: 'system-ui, sans-serif', maxWidth: '390px', margin: '0 auto', position: 'relative' }}
      >
        {/* Header */}
        <header
          className="flex items-center gap-3 px-4 flex-shrink-0"
          style={{ height: '56px', background: t.headerBg, borderBottom: `1px solid ${t.border}` }}
        >
          <button onClick={onBack} style={{ color: t.accent, fontSize: '20px', lineHeight: 1, paddingRight: '4px' }}>←</button>
          <p className="flex-1 min-w-0 text-center" style={{ color: t.text, fontSize: '14px', fontWeight: 600 }}>{meta.label}</p>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setIsParticipantsOpen(true)}
              style={{ fontSize: '11px', color: t.subText, borderRadius: '12px', padding: '3px 10px', background: 'none', cursor: 'pointer', border: `1px solid ${t.border}` }}
            >
              👥 {(subRooms.find(s => s.id === 'all')?.memberCount ?? 0).toLocaleString()}人
            </button>
            <button
              onClick={() => setIsRoomSettingsOpen(true)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.5)', fontSize: '18px',
                padding: '4px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >⚙️</button>
          </div>
        </header>

        {/* ルーム / タイムライン tabs */}
        {!forceLocked && (
          <div
            className="flex flex-shrink-0"
            style={{ height: '36px', background: t.headerBg, borderBottom: `1px solid ${t.border}` }}
          >
            {(['rooms', 'timeline'] as const).map(tb => (
              <button key={tb} onClick={() => setActiveListTab(tb)} className="flex-1 flex items-center justify-center"
                style={{
                  fontSize: '12px',
                  color: activeListTab === tb ? t.tabActive : t.tabInactive,
                  borderBottom: activeListTab === tb ? `2px solid ${t.tabBorder}` : '2px solid transparent',
                  fontWeight: activeListTab === tb ? 600 : 400,
                }}>
                {tb === 'rooms' ? 'ルーム' : 'タイムライン'}
              </button>
            ))}
          </div>
        )}

        {/* Avatar mode */}
        {roomChatMode === 'avatar' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {Array.from({ length: 4 }).map((_, idx) => {
              const slot = avatarSlots[idx]
              const userColor = MOCK_USERS.find(u => u.id === slot?.senderId)?.color ?? '#4c1d95'
              return (
                <div
                  key={idx}
                  style={{
                    flex: 1, position: 'relative',
                    background: slot
                      ? '#0a0a18'
                      : '#080810',
                    borderBottom: idx < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                    overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {slot ? (
                    <>
                      <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '60px', height: '85px', zIndex: 1 }}>
                        {slot.avatarUrl ? (
                          <img src={slot.avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} alt={slot.senderName} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', background: `linear-gradient(180deg, ${userColor}44 0%, #0a0a18 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>👤</div>
                        )}
                      </div>
                      <div style={{
                        position: 'absolute', bottom: '82px',
                        left: '50%', transform: 'translateX(-50%)',
                        zIndex: 2, width: '85%',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                      }}>
                        <div style={{
                          background: 'rgba(255,255,255,0.12)',
                          borderRadius: '12px', padding: '6px 12px',
                          backdropFilter: 'blur(12px)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          maxWidth: '100%',
                          display: 'flex', alignItems: 'center', gap: '6px',
                        }}>
                          <p style={{ color: 'white', fontSize: '12px', margin: 0, lineHeight: 1.4, flex: 1 }}>
                            {slot.text.length > 40 ? slot.text.slice(0, 40) + '…' : slot.text}
                          </p>
                          {slot.count > 1 && (
                            <span style={{
                              background: 'rgba(167,139,250,0.4)', borderRadius: '10px',
                              padding: '1px 7px', fontSize: '10px', color: 'white', fontWeight: 700, flexShrink: 0,
                            }}>+{slot.count - 1}件</span>
                          )}
                        </div>
                        <div style={{ width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '6px solid rgba(255,255,255,0.12)' }} />
                      </div>
                      <div style={{ position: 'absolute', bottom: '6px', left: '12px', zIndex: 2 }}>
                        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '10px', margin: 0 }}>{slot.senderName}</p>
                      </div>
                    </>
                  ) : (
                    <p style={{ color: 'rgba(255,255,255,0.12)', fontSize: '12px' }}>—</p>
                  )}
                </div>
              )
            })}
            <div style={{
              flexShrink: 0, padding: '10px 12px 16px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              background: '#0d0d1a',
              display: 'flex', gap: '8px', alignItems: 'center',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                onFocus={e => { const el = e.target; setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300) }}
                placeholder="メッセージを入力..."
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '20px', padding: '10px 16px',
                  color: 'white', fontSize: '14px', outline: 'none',
                }}
              />
              <button
                onClick={send}
                style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  background: '#a78bfa', border: 'none',
                  color: 'white', fontSize: '18px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >▶</button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={{ overscrollBehavior: 'contain', display: roomChatMode === 'avatar' ? 'none' : undefined }}>
          {(forceLocked || activeListTab === 'rooms') ? (
            <>
              {/* Catch up card（常に表示） */}
              {!forceLocked && (() => {
                const count  = CATCHUP_ROOMS.has(internalTagName) ? MOCK_CATCHUP_ITEMS.length : 0
                const isDone = count === 0
                return (
                  <div
                    onClick={() => !isDone && setCatchupOpen(true)}
                    style={{ margin: '12px 16px', borderRadius: '16px', padding: '14px 16px', background: isDone ? (t.isNight ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)') : (t.isNight ? 'rgba(167,139,250,0.12)' : 'rgba(59,130,246,0.10)'), border: `1.5px solid ${isDone ? (t.isNight ? 'rgba(255,255,255,0.08)' : t.border) : (t.isNight ? 'rgba(167,139,250,0.5)' : t.accent + '55')}`, display: 'flex', alignItems: 'center', gap: '12px', cursor: isDone ? 'default' : 'pointer', flexShrink: 0 }}
                  >
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div style={{ width: 44, height: 44, borderRadius: '12px', background: isDone ? (t.isNight ? 'rgba(255,255,255,0.06)' : '#e5e7eb') : (t.isNight ? 'rgba(167,139,250,0.25)' : t.accent + '22'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                        {isDone ? '✅' : '⚡'}
                      </div>
                      {!isDone && (
                        <div style={{ position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, borderRadius: '9px', background: '#ef4444', color: '#fff', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{count}</div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: t.text, fontSize: '14px', fontWeight: 700, marginBottom: '2px' }}>Catch up</p>
                      <p style={{ color: t.subText, fontSize: '12px' }}>{isDone ? 'すべて読みました' : `充電中 に ${count} 件の未読`}</p>
                    </div>
                    {!isDone && <span style={{ color: t.accent, fontSize: '20px', flexShrink: 0 }}>›</span>}
                  </div>
                )
              })()}

              {/* Sub-rooms */}
              {subRooms.map(sub =>
                sub.id === 'all' ? (
                  <button key={sub.id} onClick={() => setActiveSubRoom(sub)} className="w-full flex items-center gap-3 text-left"
                    style={{ padding: '16px', background: t.tagBg, borderBottom: `2px solid ${t.tagBorder}` }}>
                    <span style={{ fontSize: '18px' }}>💬</span>
                    <span style={{ flex: 1, color: t.text, fontSize: '15px', fontWeight: 600 }}>ALL</span>
                  </button>
                ) : (
                  <button key={sub.id} onClick={() => setActiveSubRoom(sub)} className="w-full flex items-center gap-3 text-left"
                    style={{ padding: '14px 16px', borderBottom: `1px solid ${t.cardBorder}` }}>
                    <span style={{ color: t.accent, fontSize: '16px', fontWeight: 700 }}>#</span>
                    <span style={{ flex: 1, color: t.text, fontSize: '14px' }}>
                      {sub.tag.startsWith('#') ? sub.tag.slice(1) : sub.tag}
                      {sub.isNew && <span style={{ marginLeft: '6px', color: t.accent, fontSize: '10px' }}>NEW</span>}
                    </span>
                  </button>
                )
              )}
            </>
          ) : !following ? (
            /* ── Follow gate ─────────────────────────────────────── */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '72px 32px', gap: '16px', textAlign: 'center' }}>
              <span style={{ fontSize: '48px', lineHeight: 1 }}>🔒</span>
              <button
                onClick={() => followTag(tagName)}
                style={{ padding: '12px 28px', borderRadius: '24px', background: t.accent, color: '#fff', fontSize: '15px', fontWeight: 700, boxShadow: `0 4px 14px ${t.accent}55`, cursor: 'pointer', border: 'none' }}
              >
                フォローして参加する
              </button>
              <p style={{ color: t.dimText, fontSize: '12px', lineHeight: 1.8 }}>
                フォローするとタイムラインと<br />投稿が解放されます
              </p>
            </div>
          ) : (
            <>
              {/* ALL / フレンド toggle */}
              <div style={{ display: 'flex', background: t.inputBg, borderRadius: '20px', padding: '2px', margin: '8px 16px', border: `1px solid ${t.inputBorder}` }}>
                <button onClick={() => setTimelineFilter('all')}
                  style={{ flex: 1, textAlign: 'center', fontSize: '13px', padding: '6px 24px', borderRadius: '18px', background: timelineFilter === 'all' ? t.accent : 'transparent', color: timelineFilter === 'all' ? '#fff' : t.subText }}>
                  ALL
                </button>
                <button onClick={() => setTimelineFilter('friend')}
                  style={{ flex: 1, textAlign: 'center', fontSize: '13px', padding: '6px 24px', borderRadius: '18px', background: timelineFilter === 'friend' ? t.accent : 'transparent', color: timelineFilter === 'friend' ? '#fff' : t.subText }}>
                  フレンド
                </button>
              </div>

              {filteredPosts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  commentCount={(commentMap[post.id] ?? MOCK_COMMENTS).length}
                  onComment={() => { setSelectedPost(post); setCommentInput('') }}
                  onAvatarTap={() => openUserProfile(post.user)}
                  t={t}
                />
              ))}
            </>
          )}
        </div>

        {/* FAB */}
        {!forceLocked && activeListTab === 'rooms' && (
          <button onClick={() => setIsCreating(true)} className="flex items-center justify-center"
            style={{ position: 'absolute', bottom: '80px', right: '16px', width: '52px', height: '52px', borderRadius: '50%', background: t.accent, color: '#fff', fontSize: '22px', boxShadow: `0 4px 14px ${t.accent}66`, zIndex: 10 }}>
            💬
          </button>
        )}
        {!forceLocked && activeListTab === 'timeline' && following && (
          <button onClick={() => { setIsPosting(true); setSelectedPostTag(subRooms.find(s => s.id !== 'all')?.tag ?? '') }}
            className="flex items-center justify-center"
            style={{ position: 'absolute', bottom: '80px', right: '16px', width: '48px', height: '48px', borderRadius: '50%', background: t.accent, color: '#fff', fontSize: '20px', boxShadow: `0 4px 12px ${t.accent}66`, zIndex: 10 }}>
            ＋
          </button>
        )}

        {/* Room creation modal */}
        {isCreating && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: t.headerBg, borderTop: `2px solid ${t.tabBorder}`, padding: '20px 16px', zIndex: 100 }}>
            <p style={{ color: t.text, fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>新しいルームを作成</p>
            <div className="flex items-center" style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: '8px', padding: '10px 12px' }}>
              <span style={{ color: t.accent, fontSize: '18px', fontWeight: 700, marginRight: '4px' }}>#</span>
              <input value={newRoomName} onChange={e => setNewRoomName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleCreateRoom() }} onFocus={e => { const el = e.target; setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300) }} placeholder="ルーム名を入力"
                style={{ flex: 1, background: 'transparent', border: 'none', color: t.inputText, fontSize: '16px', outline: 'none' }} />
            </div>
            <button onClick={handleCreateRoom} disabled={!newRoomName.trim()}
              style={{ width: '100%', padding: '12px', background: t.accent, color: '#fff', borderRadius: '8px', marginTop: '16px', fontSize: '14px', fontWeight: 600, opacity: newRoomName.trim() ? 1 : 0.5 }}>
              作成する
            </button>
            <button onClick={() => { setIsCreating(false); setNewRoomName('') }}
              style={{ width: '100%', padding: '10px', color: t.subText, fontSize: '13px', marginTop: '8px' }}>
              キャンセル
            </button>
          </div>
        )}

        {/* Post modal */}
        {isPosting && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: t.headerBg, borderTop: `2px solid ${t.tabBorder}`, padding: '20px 16px', zIndex: 100 }}>
            <p style={{ color: t.text, fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>今の気持ちをつぶやく</p>
            <textarea value={newPostText} onChange={e => setNewPostText(e.target.value)} onFocus={e => { const el = e.target; setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300) }} rows={3} placeholder="今どんな気持ち？"
              style={{ width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: '8px', padding: '10px 12px', fontSize: '14px', color: t.inputText, outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
            <div className="flex gap-2 flex-wrap" style={{ marginTop: '12px' }}>
              {postTagOptions.map(tag => (
                <button key={tag} onClick={() => setSelectedPostTag(tag)}
                  style={{ flexShrink: 0, padding: '4px 12px', borderRadius: '20px', fontSize: '11px', border: selectedPostTag === tag ? `1px solid ${t.accent}` : `1px solid ${t.inputBorder}`, background: selectedPostTag === tag ? t.tagBg : 'transparent', color: selectedPostTag === tag ? t.accent : t.subText }}>
                  {tag}
                </button>
              ))}
            </div>
            <button onClick={handlePost} disabled={!newPostText.trim()}
              style={{ width: '100%', padding: '12px', background: t.accent, color: '#fff', borderRadius: '8px', marginTop: '16px', fontSize: '14px', fontWeight: 600, opacity: newPostText.trim() ? 1 : 0.5 }}>
              投稿する
            </button>
            <button onClick={() => { setIsPosting(false); setNewPostText('') }}
              style={{ width: '100%', padding: '10px', color: t.subText, fontSize: '13px', marginTop: '8px' }}>
              キャンセル
            </button>
          </div>
        )}

        {/* Comment sheet */}
        {selectedPost && (
          <>
            <div onClick={() => { setSelectedPost(null); setCommentInput('') }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200 }} />
            <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '390px', height: '60dvh', background: t.headerBg, borderTop: `2px solid ${t.border}`, borderRadius: '20px 20px 0 0', zIndex: 201, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0' }}>
                <div style={{ width: '32px', height: '3px', background: t.border, borderRadius: '2px' }} />
              </div>
              <div className="flex items-start gap-2" style={{ padding: '8px 16px', borderBottom: `1px solid ${t.border}` }}>
                <div className="flex items-center justify-center flex-shrink-0" style={{ width: '24px', height: '24px', borderRadius: '50%', background: selectedPost.color, fontSize: '9px', fontWeight: 700, color: '#fff', marginTop: '2px' }}>
                  {selectedPost.user[0]}
                </div>
                <div className="min-w-0">
                  <p style={{ color: t.subText, fontSize: '11px', marginBottom: '2px' }}>{selectedPost.user}</p>
                  <p style={{ color: t.text, fontSize: '12px', lineHeight: '1.4', overflow: 'hidden', maxHeight: '2.8em' }}>{selectedPost.text}</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {(commentMap[selectedPost.id] ?? MOCK_COMMENTS).map(c => (
                  <div key={c.id} className="flex items-start gap-2" style={{ padding: '10px 16px' }}>
                    <div className="flex items-center justify-center flex-shrink-0" style={{ width: '24px', height: '24px', borderRadius: '50%', background: c.color, fontSize: '9px', fontWeight: 700, color: '#fff' }}>
                      {c.user[0]}
                    </div>
                    <div>
                      <p style={{ color: t.subText, fontSize: '10px', marginBottom: '2px' }}>{c.user} · {c.time}</p>
                      <p style={{ color: t.text, fontSize: '12px', lineHeight: '1.4' }}>{c.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 px-3 flex-shrink-0" style={{ height: '48px', borderTop: `1px solid ${t.border}` }}>
                <input value={commentInput} onChange={e => setCommentInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddComment() } }}
                  onFocus={e => { const el = e.target; setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300) }}
                  placeholder="コメントを入力..."
                  style={{ flex: 1, background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: '20px', padding: '6px 12px', fontSize: '13px', color: t.inputText, outline: 'none' }} />
                <button onClick={handleAddComment} disabled={!commentInput.trim()} className="flex items-center justify-center flex-shrink-0 transition-opacity disabled:opacity-35"
                  style={{ width: '32px', height: '32px', borderRadius: '50%', background: t.accent, color: '#fff', fontSize: '14px' }}>
                  ↑
                </button>
              </div>
            </div>
          </>
        )}

        {/* Participants sub-page */}
        <ParticipantsSubPage
          isOpen={isParticipantsOpen}
          onClose={() => setIsParticipantsOpen(false)}
          totalLabel={meta.members}
          t={t}
          onViewUser={name => { openUserProfile(name) }}
        />

        {/* Profile sub-page overlay */}
        <UserProfileSubPage user={viewingUser} onClose={() => setViewingUser(null)} t={t} />

        {/* Catchup modal */}
        {(catchupOpen || showCatchUp) && createPortal(
          <CatchupModal
            items={MOCK_CATCHUP_ITEMS}
            t={t}
            onClose={() => { setCatchupOpen(false); setShowCatchUp(false) }}
            onMarkAction={() => setShowCatchUp(false)}
          />,
          document.body
        )}

        {/* Exit confirm modal */}
        {isExitConfirmOpen && (
          <div
            style={{
              position: 'fixed', inset: 0, zIndex: 10000,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              left: '50%', transform: 'translateX(-50%)',
              width: '100%', maxWidth: '390px',
            }}
          >
            <div style={{
              background: t.headerBg, borderRadius: '16px',
              padding: '28px 24px', width: '80%', textAlign: 'center',
              display: 'flex', flexDirection: 'column', gap: '16px',
            }}>
              <p style={{ color: t.text, fontSize: '16px', fontWeight: 700 }}>ルームを退出しますか？</p>
              <button
                onClick={() => { setIsExitConfirmOpen(false); onBack(); }}
                style={{ width: '100%', padding: '12px', borderRadius: '24px', background: t.accent, color: '#fff', fontSize: '15px', fontWeight: 700, border: 'none', cursor: 'pointer' }}
              >ルームを退出する</button>
              <button
                onClick={() => setIsExitConfirmOpen(false)}
                style={{ background: 'none', border: 'none', color: t.subText, fontSize: '14px', cursor: 'pointer', padding: '4px' }}
              >やっぱりしない</button>
            </div>
          </div>
        )}
      {/* ルーム設定全画面 */}
      {isRoomSettingsOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: '#0d0d1a',
          display: 'flex', flexDirection: 'column',
          width: '100%',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '16px 16px 12px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}>
            <button
              onClick={() => setIsRoomSettingsOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: '20px', display: 'flex', alignItems: 'center', padding: '4px' }}
            >←</button>
            <p style={{ color: 'white', fontWeight: 700, fontSize: '16px', margin: 0 }}>ルーム設定</p>
          </div>

          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '28px 16px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #4c1d95, #2563eb)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '32px', marginBottom: '12px',
            }}>#</div>
            <p style={{ color: 'white', fontWeight: 700, fontSize: '18px', margin: '0 0 4px' }}>{meta.label.startsWith('#') ? meta.label.slice(1) : meta.label}</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 }}>{meta.members}人が参加中</p>
          </div>

          {/* タブ */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, padding: '0 16px' }}>
            {(['general', 'custom'] as const).map(tb => {
              const labels = { general: '一般', custom: 'カスタマイズ' }
              const on = roomSettingsTab === tb
              return (
                <button key={tb} onClick={() => setRoomSettingsTab(tb)} style={{ padding: '10px 16px', fontSize: '13px', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', color: on ? 'white' : 'rgba(255,255,255,0.4)', borderBottom: on ? '2px solid #a78bfa' : '2px solid transparent', marginBottom: '-1px' }}>
                  {labels[tb]}
                </button>
              )
            })}
          </div>

          {roomSettingsTab === 'general' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', fontWeight: 600, padding: '16px 20px 8px', margin: 0, letterSpacing: '0.8px' }}>通知</p>
              <div style={{ margin: '0 16px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                <div onClick={() => setIsRoomMuted(p => !p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '18px' }}>{isRoomMuted ? '🔕' : '🔔'}</span>
                    <div>
                      <p style={{ color: 'white', fontSize: '14px', fontWeight: 600, margin: 0 }}>通知</p>
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', margin: '2px 0 0' }}>{isRoomMuted ? 'ミュート中' : 'オン'}</p>
                    </div>
                  </div>
                  <div style={{ width: '44px', height: '26px', borderRadius: '13px', background: isRoomMuted ? 'rgba(255,255,255,0.15)' : '#a78bfa', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                    <div style={{ position: 'absolute', top: '3px', left: isRoomMuted ? '3px' : '21px', width: '20px', height: '20px', borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
                  </div>
                </div>
              </div>

              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', fontWeight: 600, padding: '20px 20px 8px', margin: 0, letterSpacing: '0.8px' }}>操作</p>
              <div style={{ margin: '0 16px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                <div
                  onClick={() => { if (window.confirm('このルームを退出しますか？')) { setIsRoomSettingsOpen(false) } }}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <span style={{ fontSize: '18px' }}>🚪</span>
                  <div>
                    <p style={{ color: '#f87171', fontSize: '14px', fontWeight: 600, margin: 0 }}>ルームを退出</p>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', margin: '2px 0 0' }}>このルームから退出する</p>
                  </div>
                </div>
                <div
                  onClick={() => { if (window.confirm('このルームを通報しますか？')) { setIsRoomSettingsOpen(false) } }}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', cursor: 'pointer' }}
                >
                  <span style={{ fontSize: '18px' }}>⚠️</span>
                  <div>
                    <p style={{ color: '#f87171', fontSize: '14px', fontWeight: 600, margin: 0 }}>通報</p>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', margin: '2px 0 0' }}>不適切なコンテンツを報告する</p>
                  </div>
                </div>
              </div>

              <div style={{ height: '40px' }} />
            </div>
          )}

          {roomSettingsTab === 'custom' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: 40, scrollbarWidth: 'none' as const }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 600, margin: '0 0 12px 4px', letterSpacing: '0.8px' }}>ルームのカスタマイズ</p>
              {/* デフォルト設定トグル */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 12 }}>
                <div style={{ flex: 1, marginRight: 12 }}>
                  <div style={{ color: 'white', fontSize: 14, fontWeight: 500 }}>デフォルト設定を使用</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 }}>Decorationの設定を使用します</div>
                </div>
                <div onClick={() => {
                  if (!useGroupGlobalSetting) {
                    localStorage.removeItem(GROUP_ROOM_STORAGE_KEY)
                    const g = localStorage.getItem('chatCustomize')
                    if (g) setGroupRoomCustomize({ ...JSON.parse(g), roomThemeColor: '#7c3aed', timelineCardColor: '#1e1e3a', timelineCardTextColor: '#ffffff' })
                  }
                  setUseGroupGlobalSetting(p => !p)
                }} style={{ width: 44, height: 24, borderRadius: 12, cursor: 'pointer', backgroundColor: useGroupGlobalSetting ? '#7c3aed' : 'rgba(255,255,255,0.2)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', top: 2, left: useGroupGlobalSetting ? 22 : 2, width: 20, height: 20, borderRadius: '50%', backgroundColor: 'white', transition: 'left 0.2s' }} />
                </div>
              </div>
              {/* 色設定折りたたみ */}
              <div style={{ opacity: useGroupGlobalSetting ? 0.4 : 1, pointerEvents: useGroupGlobalSetting ? 'none' : 'auto' }}>
                {([
                  { key: 'bg',           label: '🖼 背景' },
                  { key: 'bubble',       label: '💬 吹き出し' },
                  { key: 'text',         label: '🔤 文字色' },
                  { key: 'timelineCard', label: '📋 タイムラインカード色' },
                ] as const).map(({ key, label }) => (
                  <div key={key} style={{ marginBottom: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 12, overflow: 'hidden' }}>
                    <div onClick={() => setGroupRoomOpenSub(groupRoomOpenSub === key ? null : key)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', cursor: 'pointer' }}>
                      <span style={{ color: 'white', fontSize: 14 }}>{label}</span>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{groupRoomOpenSub === key ? '▼' : '▶'}</span>
                    </div>
                    {groupRoomOpenSub === key && (
                      <div style={{ padding: '8px 0' }}>
                        {/* プレビュー */}
                        <div style={{ padding: '0 14px 10px' }}>
                          <div style={{ background: groupRoomCustomize.bgColor, borderRadius: 10, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <div style={{ background: groupRoomCustomize.otherBubbleColor, borderRadius: 12, padding: '5px 10px' }}><span style={{ color: groupRoomCustomize.otherTextColor, fontSize: 12 }}>こんにちは</span></div>
                            <div style={{ background: groupRoomCustomize.myBubbleColor, borderRadius: 12, padding: '5px 10px' }}><span style={{ color: groupRoomCustomize.myTextColor, fontSize: 12 }}>よろしく！</span></div>
                          </div>
                        </div>

                        {/* 背景 */}
                        {key === 'bg' && (
                          <>
                            <div onClick={() => setRoomBgSubOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                              <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600 }}>💬 チャット背景</span>
                              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{roomBgSubOpen ? '▼' : '▶'}</span>
                            </div>
                            {roomBgSubOpen && <div style={{ padding: '0 16px 16px' }}>{renderGroupSlider('bg', 'bgColor', `r-bg`)}</div>}
                            <div onClick={() => setRoomAvatarBgSubOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                              <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600 }}>🧍 アバターチャット背景</span>
                              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{roomAvatarBgSubOpen ? '▼' : '▶'}</span>
                            </div>
                            {roomAvatarBgSubOpen && (
                              <div style={{ padding: '0 16px 12px' }}>
                                {/* プレビュー */}
                                <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', height: 110, marginBottom: 10, background: roomAvatarBg ?? '#0f0a1e' }}>
                                  <div style={{ position: 'absolute', inset: 0, backgroundColor: roomAvatarBgMode === 'color' ? `hsl(${roomAvatarBgHue},${roomAvatarBgSat}%,${roomAvatarBgLight}%)` : '#0f0a1e', backgroundImage: roomAvatarBgMode !== 'color' ? (roomAvatarBg ?? 'none') : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }} />
                                  <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 55, height: 78 }}>
                                    {roomSelectedAvatar ? <img src={roomSelectedAvatar} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} alt="" /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>👤</div>}
                                  </div>
                                </div>
                                {/* 🎨 背景を変える */}
                                <div onClick={() => setRoomAvatarBgChangeOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: 600 }}>🎨 背景を変える</span>
                                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{roomAvatarBgChangeOpen ? '▼' : '▶'}</span>
                                </div>
                                {roomAvatarBgChangeOpen && (
                                  <div style={{ paddingBottom: 8 }}>
                                    <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                                      {(['color', 'image', 'virtual'] as const).map(m => (
                                        <button key={m} onClick={() => setRoomAvatarBgMode(m)} style={{ flex: 1, padding: '5px 2px', borderRadius: 7, background: roomAvatarBgMode === m ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.05)', border: roomAvatarBgMode === m ? '1px solid rgba(167,139,250,0.4)' : '1px solid rgba(255,255,255,0.1)', color: roomAvatarBgMode === m ? '#c4b5fd' : 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                                          {m === 'color' ? '🎨 カラー' : m === 'image' ? '🖼️ 画像' : '✨ バーチャル'}
                                        </button>
                                      ))}
                                    </div>
                                    {roomAvatarBgMode === 'color' && (() => {
                                      const applyHex = (c: string) => { const r=parseInt(c.slice(1,3),16)/255,g=parseInt(c.slice(3,5),16)/255,b=parseInt(c.slice(5,7),16)/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2,d=mx-mn; setRoomAvatarBgLight(Math.round(l*95)); if(d<0.001){setRoomAvatarBgHue(0);setRoomAvatarBgSat(0)}else{const s=l>0.5?d/(2-mx-mn):d/(mx+mn),h=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4;setRoomAvatarBgHue(Math.round(h/6*360));setRoomAvatarBgSat(Math.round(s*100))} }
                                      return (
                                      <div>
                                        <div style={{ height: 22, borderRadius: 7, background: `hsl(${roomAvatarBgHue},${roomAvatarBgSat}%,${roomAvatarBgLight}%)`, marginBottom: 6, border: '1px solid rgba(255,255,255,0.1)' }} />
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                                          <div style={{ flex: 1, position: 'relative', height: 20 }}>
                                            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 5, transform: 'translateY(-50%)', borderRadius: 3, background: 'linear-gradient(to right,hsl(0,80%,55%),hsl(60,80%,55%),hsl(120,80%,55%),hsl(180,80%,55%),hsl(240,80%,55%),hsl(300,80%,55%),hsl(360,80%,55%))', pointerEvents: 'none' }} />
                                            <input type="range" min={0} max={360} value={roomAvatarBgHue} style={{ position: 'absolute', inset: 0, width: '100%', opacity: 0, cursor: 'pointer', margin: 0 }} onChange={e => setRoomAvatarBgHue(Number(e.target.value))} onInput={e => setRoomAvatarBgHue(Number((e.target as HTMLInputElement).value))} />
                                            <div style={{ position: 'absolute', top: '50%', left: `calc(${roomAvatarBgHue / 360 * 100}% - 8px)`, transform: 'translateY(-50%)', width: 16, height: 16, borderRadius: '50%', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.5)', pointerEvents: 'none' }} />
                                          </div>
                                          <button onClick={() => setRoomAvatarBgPaletteOpen(p => !p)} style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0 }}>🎨</button>
                                        </div>
                                        <div style={{ position: 'relative', height: 20, marginBottom: 5 }}>
                                          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 5, transform: 'translateY(-50%)', borderRadius: 3, background: `linear-gradient(to right,hsl(${roomAvatarBgHue},0%,${roomAvatarBgLight}%),hsl(${roomAvatarBgHue},100%,${roomAvatarBgLight}%))`, pointerEvents: 'none' }} />
                                          <input type="range" min={0} max={100} value={roomAvatarBgSat} style={{ position: 'absolute', inset: 0, width: '100%', opacity: 0, cursor: 'pointer', margin: 0 }} onChange={e => setRoomAvatarBgSat(Number(e.target.value))} onInput={e => setRoomAvatarBgSat(Number((e.target as HTMLInputElement).value))} />
                                          <div style={{ position: 'absolute', top: '50%', left: `calc(${roomAvatarBgSat / 100 * 100}% - 8px)`, transform: 'translateY(-50%)', width: 16, height: 16, borderRadius: '50%', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.5)', pointerEvents: 'none' }} />
                                        </div>
                                        <div style={{ position: 'relative', height: 20, marginBottom: 5 }}>
                                          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 5, transform: 'translateY(-50%)', borderRadius: 3, background: `linear-gradient(to right,hsl(${roomAvatarBgHue},${roomAvatarBgSat}%,5%),hsl(${roomAvatarBgHue},${roomAvatarBgSat}%,95%))`, pointerEvents: 'none' }} />
                                          <input type="range" min={0} max={95} value={roomAvatarBgLight} style={{ position: 'absolute', inset: 0, width: '100%', opacity: 0, cursor: 'pointer', margin: 0 }} onChange={e => setRoomAvatarBgLight(Number(e.target.value))} onInput={e => setRoomAvatarBgLight(Number((e.target as HTMLInputElement).value))} />
                                          <div style={{ position: 'absolute', top: '50%', left: `calc(${roomAvatarBgLight / 95 * 100}% - 8px)`, transform: 'translateY(-50%)', width: 16, height: 16, borderRadius: '50%', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.5)', pointerEvents: 'none' }} />
                                        </div>
                                        {roomAvatarBgPaletteOpen && (
                                          <>
                                            <div onClick={() => setRoomAvatarBgPaletteOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 0 }} />
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
                                    {roomAvatarBgMode === 'image' && (
                                      <div>
                                        <input ref={roomAvatarBgImageInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) setRoomAvatarBgImage(URL.createObjectURL(f)) }} />
                                        <button onClick={() => roomAvatarBgImageInputRef.current?.click()} style={{ width: '100%', padding: '8px', borderRadius: 7, background: 'rgba(255,255,255,0.06)', border: '1px dashed rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', fontSize: 12, cursor: 'pointer', marginBottom: 6 }}>📷 写真をアップロード</button>
                                      </div>
                                    )}
                                    {roomAvatarBgMode === 'virtual' && (
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
                                        {ROOM_VIRTUAL_BGSETS.map(bg => <button key={bg.label} onClick={() => setRoomAvatarBg(bg.gradient)} style={{ width: 48, height: 48, borderRadius: 7, background: bg.gradient, border: roomAvatarBg === bg.gradient ? '2px solid #a78bfa' : '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', position: 'relative', padding: 0 }}><span style={{ position: 'absolute', bottom: 2, left: 0, right: 0, textAlign: 'center', fontSize: 8, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{bg.label}</span></button>)}
                                      </div>
                                    )}
                                    <button onClick={() => { if (roomAvatarBgMode === 'color') setRoomAvatarBg(`hsl(${roomAvatarBgHue},${roomAvatarBgSat}%,${roomAvatarBgLight}%)`); else if (roomAvatarBgMode === 'image') setRoomAvatarBg(roomAvatarBgImage ?? undefined) }} style={{ width: '100%', padding: '8px 0', borderRadius: 7, background: '#7c3aed', border: 'none', color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>この背景を適用する</button>
                                  </div>
                                )}
                                {/* 👤 アバターを変える */}
                                <div onClick={() => setRoomAvatarChangeOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: 600 }}>👤 アバターを変える</span>
                                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{roomAvatarChangeOpen ? '▼' : '▶'}</span>
                                </div>
                                {roomAvatarChangeOpen && (
                                  <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 4, paddingTop: 6 }}>
                                    <div onClick={() => setRoomSelectedAvatar(null)} style={{ flexShrink: 0, width: 44, height: 62, borderRadius: 8, border: roomSelectedAvatar === null ? '2px solid #a78bfa' : '2px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, cursor: 'pointer' }}>👤</div>
                                    {(savedAvatars ?? []).map((av: { id: number; imageUrl: string }) => (
                                      <div key={av.id} onClick={() => setRoomSelectedAvatar(av.imageUrl)} style={{ flexShrink: 0, width: 44, height: 62, borderRadius: 8, border: roomSelectedAvatar === av.imageUrl ? '2px solid #a78bfa' : '2px solid rgba(255,255,255,0.1)', overflow: 'hidden', cursor: 'pointer' }}>
                                        <img src={av.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} alt="" />
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}

                        {/* 吹き出し */}
                        {key === 'bubble' && (<>
                          <div onClick={() => setRoomMyBubbleOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600 }}>🟣 自分の吹き出し</span>
                            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{roomMyBubbleOpen ? '▼' : '▶'}</span>
                          </div>
                          {roomMyBubbleOpen && <div style={{ padding: '0 16px 16px' }}>{renderGroupSlider('myBubble', 'myBubbleColor', `r-myBubble`)}</div>}
                          <div onClick={() => setRoomTheirBubbleOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600 }}>🔵 相手の吹き出し</span>
                            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{roomTheirBubbleOpen ? '▼' : '▶'}</span>
                          </div>
                          {roomTheirBubbleOpen && <div style={{ padding: '0 16px 16px' }}>{renderGroupSlider('otherBubble', 'otherBubbleColor', `r-otherBubble`)}</div>}
                        </>)}

                        {/* 文字色 */}
                        {key === 'text' && (<>
                          <div onClick={() => setRoomMyTextOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600 }}>🟣 自分の文字色</span>
                            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{roomMyTextOpen ? '▼' : '▶'}</span>
                          </div>
                          {roomMyTextOpen && <div style={{ padding: '0 16px 16px' }}>{renderGroupSlider('myText', 'myTextColor', `r-myText`)}</div>}
                          <div onClick={() => setRoomTheirTextOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600 }}>🔵 相手の文字色</span>
                            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{roomTheirTextOpen ? '▼' : '▶'}</span>
                          </div>
                          {roomTheirTextOpen && <div style={{ padding: '0 16px 16px' }}>{renderGroupSlider('otherText', 'otherTextColor', `r-otherText`)}</div>}
                        </>)}

                        {/* タイムラインカード色 */}
                        {key === 'timelineCard' && (<>
                          <div style={{ padding: '0 14px 10px' }}>
                            <div style={{ background: groupRoomCustomize.timelineCardColor, borderRadius: 10, padding: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                              <span style={{ color: groupRoomCustomize.timelineCardTextColor, fontSize: 13 }}>タイムライン投稿カードのプレビューです</span>
                            </div>
                          </div>
                          <div onClick={() => setRoomCardBgOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600 }}>📋 カード背景色</span>
                            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{roomCardBgOpen ? '▼' : '▶'}</span>
                          </div>
                          {roomCardBgOpen && <div style={{ padding: '0 16px 16px' }}>{renderGroupSlider('timelineCard', 'timelineCardColor', `r-timelineCard`)}</div>}
                          <div onClick={() => setRoomCardTextOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600 }}>🔡 カード文字色</span>
                            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{roomCardTextOpen ? '▼' : '▶'}</span>
                          </div>
                          {roomCardTextOpen && (
                            <div style={{ padding: '0 16px 16px' }}>
                              {renderGroupSlider('timelineCardText', 'timelineCardTextColor', `r-timelineCardText`)}
                              <div style={{ marginTop: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                                <div onClick={() => setUseOwnCardColor(p => !p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', cursor: 'pointer' }}>
                                  <div>
                                    <p style={{ color: 'white', fontSize: '14px', fontWeight: 600, margin: 0 }}>自分の設定を優先する</p>
                                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', margin: '3px 0 0' }}>{useOwnCardColor ? '自分のカード色設定で投稿されます' : '相手のカード色設定に合わせます'}</p>
                                  </div>
                                  <div style={{ width: '44px', height: '26px', borderRadius: '13px', background: useOwnCardColor ? '#a78bfa' : 'rgba(255,255,255,0.15)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                                    <div style={{ position: 'absolute', top: '3px', left: useOwnCardColor ? '21px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </>)}

                        <div style={{ padding: '10px 14px 12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                          <button onClick={() => handleGroupRoomSave(key)} style={{ width: '100%', padding: '10px 0', borderRadius: 8, background: groupRoomSavedFeedback === key ? '#059669' : '#7c3aed', border: 'none', color: 'white', fontSize: 14, cursor: 'pointer' }}>
                            {groupRoomSavedFeedback === key ? '保存しました ✓' : '保存する'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <button onClick={() => {
                  localStorage.removeItem(GROUP_ROOM_STORAGE_KEY)
                  const g = localStorage.getItem('chatCustomize')
                  if (g) setGroupRoomCustomize({ ...JSON.parse(g), roomThemeColor: '#7c3aed', timelineCardColor: '#1e1e3a', timelineCardTextColor: '#ffffff' })
                  setUseGroupGlobalSetting(true)
                }} style={{ width: '100%', padding: '12px 0', borderRadius: 10, marginTop: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', fontSize: 14, cursor: 'pointer' }}>
                  ⟳ グローバル設定に戻す
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    )
  }

  // ── Chat view (friend / my / identity subroom) ───────────────────
  const showBottom = isIdentity && tab !== 'chat'

  return (
    <div
      className="flex flex-col"
      style={{ height: '100%', background: t.bg, fontFamily: 'system-ui, sans-serif', maxWidth: '390px', margin: '0 auto', position: 'relative' }}
    >
      <style>{`
        .hue-slider { -webkit-appearance:none; appearance:none; width:100%; height:12px; border-radius:6px; outline:none; cursor:pointer; background:linear-gradient(to right,hsl(0,80%,55%),hsl(45,80%,55%),hsl(90,80%,55%),hsl(135,80%,55%),hsl(180,80%,55%),hsl(225,80%,55%),hsl(270,80%,55%),hsl(315,80%,55%),hsl(360,80%,55%)); }
        .hue-slider::-webkit-slider-thumb { -webkit-appearance:none; width:22px; height:22px; border-radius:50%; background:white; border:3px solid rgba(0,0,0,0.4); box-shadow:0 2px 6px rgba(0,0,0,0.4); cursor:pointer; }
        .hue-slider::-moz-range-thumb { width:22px; height:22px; border-radius:50%; background:white; border:3px solid rgba(0,0,0,0.4); box-shadow:0 2px 6px rgba(0,0,0,0.4); cursor:pointer; }
      `}</style>
      {/* Header */}
      {isIdentity && activeSubRoom !== null ? (
        <header className="flex items-center gap-3 px-4 flex-shrink-0"
          style={{ height: '44px', background: t.headerBg, borderBottom: `1px solid ${t.border}` }}>
          <button onClick={() => setActiveSubRoom(null)} style={{ color: t.accent, fontSize: '20px', lineHeight: 1, paddingRight: '4px' }}>←</button>
          <div className="flex-1 min-w-0 text-center">
            <p style={{ color: t.text, fontSize: '14px', fontWeight: 600 }}>{activeSubRoom.tag}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span style={{ color: t.subText, fontSize: '11px' }}>{activeSubRoom.memberCount.toLocaleString()}人</span>
          </div>
        </header>
      ) : (
        <header className="flex items-center gap-3 px-4 flex-shrink-0"
          style={{ height: '44px', background: t.headerBg, borderBottom: `1px solid ${t.border}` }}>
          <button onClick={onBack} style={{ color: t.accent, fontSize: '20px', lineHeight: 1, paddingRight: '4px' }}>←</button>
          <div className="flex-1 min-w-0 text-center">
            <p style={{ color: t.text, fontSize: '14px', fontWeight: 600 }}>{meta.label}</p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: meta.dot }} />
            <span style={{ color: t.subText, fontSize: '11px' }}>{meta.members}</span>
            <button
              onClick={() => setIsSettingsOpen(true)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.5)', fontSize: '18px',
                padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >⚙️</button>
          </div>
        </header>
      )}

      {/* Identity subroom mode tabs */}
      {isIdentity && activeSubRoom !== null && (
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
          <button
            onClick={() => setRoomChatMode('chat')}
            style={{
              flex: 1, padding: '10px', fontSize: '13px', fontWeight: 600,
              background: 'none', border: 'none', cursor: 'pointer',
              color: roomChatMode === 'chat' ? 'white' : 'rgba(255,255,255,0.4)',
              borderBottom: roomChatMode === 'chat' ? '2px solid #a78bfa' : '2px solid transparent',
            }}
          >💬 チャット</button>
          <button
            onClick={() => setRoomChatMode('avatar')}
            style={{
              flex: 1, padding: '10px', fontSize: '13px', fontWeight: 600,
              background: 'none', border: 'none', cursor: 'pointer',
              color: roomChatMode === 'avatar' ? 'white' : 'rgba(255,255,255,0.4)',
              borderBottom: roomChatMode === 'avatar' ? '2px solid #a78bfa' : '2px solid transparent',
            }}
          >🧍 アバター</button>
        </div>
      )}

      {/* Friend tabs */}
      {hasTabs && (
        <div className="flex flex-shrink-0"
          style={{ height: '36px', background: t.headerBg, borderBottom: `1px solid ${t.border}` }}>
          {(['chat', 'timeline'] as ChatTab[]).map(tb => (
            <button key={tb} onClick={() => setTab(tb)} className="flex-1 flex items-center justify-center"
              style={{
                fontSize: '12px',
                color: tab === tb ? t.tabActive : t.tabInactive,
                borderBottom: tab === tb ? `2px solid ${t.tabBorder}` : '2px solid transparent',
                fontWeight: tab === tb ? 600 : 400,
                transition: 'color 0.15s',
              }}>
              {tb === 'chat' ? 'チャット' : '記録'}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1" style={{ overflow: 'hidden', height: '100%' }}>
        {tab === 'timeline'
          ? <div style={{ height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {sharedImages.length > 0 && (
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
                  <div
                    onClick={() => setIsImagesOpen(p => !p)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 16px', cursor: 'pointer',
                      background: 'rgba(255,255,255,0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px' }}>🖼️</span>
                      <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 600 }}>
                        画像 ({sharedImages.length})
                      </span>
                    </div>
                    <span style={{
                      color: 'rgba(255,255,255,0.4)', fontSize: '11px',
                      transform: isImagesOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s', display: 'inline-block',
                    }}>▼</span>
                  </div>
                  {isImagesOpen && (
                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '8px 16px 12px', scrollbarWidth: 'none' }}>
                      {sharedImages.map(img => (
                        <div key={img.id} style={{ flexShrink: 0 }}>
                          <img
                            src={img.url}
                            style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', display: 'block', cursor: 'pointer' }}
                            alt="共有画像"
                            onClick={() => window.open(img.url, '_blank')}
                          />
                          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '9px', margin: '3px 0 0', textAlign: 'center' }}>{img.time}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div style={{
                flex: 1, overflowY: 'auto', padding: '12px 16px 80px',
                display: 'flex', flexDirection: 'column', gap: '16px',
                scrollbarWidth: 'none',
              }}>
                {/* ヘッダー */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0 8px' }}>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', flexShrink: 0 }}>対話の記録</span>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
                </div>

                {/* メッセージがない場合 */}
                {msgs.length === 0 && (
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', flex: 1, gap: '12px', paddingTop: '60px',
                  }}>
                    <span style={{ fontSize: '40px', opacity: 0.4 }}>💬</span>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', margin: 0, textAlign: 'center' }}>
                      まだメッセージがありません
                    </p>
                  </div>
                )}

                {/* メッセージ一覧 */}
                {msgs.map((msg) => {
                  const isMe = msg.sender === 'me'
                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: 'flex',
                        flexDirection: isMe ? 'row-reverse' : 'row',
                        alignItems: 'flex-end',
                        gap: '8px',
                      }}
                    >
                      {/* アバターアイコン */}
                      {!isMe && (
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '50%',
                          background: 'linear-gradient(135deg, #2d1f5e, #1a1040)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '16px', flexShrink: 0,
                          border: '1px solid rgba(167,139,250,0.25)',
                        }}>👤</div>
                      )}

                      <div style={{
                        display: 'flex', flexDirection: 'column',
                        gap: '3px', maxWidth: '74%',
                        alignItems: isMe ? 'flex-end' : 'flex-start',
                      }}>
                        {/* 送信者名（相手のみ） */}
                        {!isMe && (
                          <span style={{
                            color: 'rgba(255,255,255,0.4)', fontSize: '10px',
                            paddingLeft: '4px', fontWeight: 600,
                          }}>
                            {meta.label}
                          </span>
                        )}

                        {/* バブル */}
                        <div style={{
                          background: isMe
                            ? 'rgba(109,40,217,0.4)'
                            : 'rgba(255,255,255,0.07)',
                          borderRadius: isMe
                            ? '16px 4px 16px 16px'
                            : '4px 16px 16px 16px',
                          padding: '10px 14px',
                          border: isMe
                            ? '1px solid rgba(167,139,250,0.3)'
                            : '1px solid rgba(255,255,255,0.09)',
                          backdropFilter: 'blur(8px)',
                        }}>
                          <p style={{
                            color: 'white', fontSize: '14px',
                            margin: 0, lineHeight: 1.55,
                          }}>
                            {msg.text}
                          </p>
                        </div>

                        {/* 時刻 */}
                        <span style={{
                          color: 'rgba(255,255,255,0.28)', fontSize: '10px',
                          paddingLeft: isMe ? 0 : '4px',
                          paddingRight: isMe ? '4px' : 0,
                        }}>
                          {msg.timestamp}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          : isIdentity && activeSubRoom !== null ? (
            /* ── Identity subroom: Discord chat or Avatar mode ── */
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {roomChatMode === 'avatar' ? (
                /* Avatar mode: 4-slot full-bleed */
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {Array.from({ length: 4 }).map((_, idx) => {
                      const slot = avatarSlots[idx]
                      const userColor = MOCK_USERS.find(u => u.id === slot?.senderId)?.color ?? '#4c1d95'
                      return (
                        <div key={idx} style={{
                          flex: 1, position: 'relative',
                          background: slot ? '#0a0a18' : '#080810',
                          borderBottom: idx < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                          overflow: 'hidden', minHeight: 0,
                        }}>
                          {slot ? (
                            <>
                              <div style={{ position: 'absolute', inset: 0 }}>
                                {slot.avatarUrl ? (
                                  <img src={slot.avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} alt={slot.senderName} />
                                ) : (
                                  <div style={{ width: '100%', height: '100%', background: `linear-gradient(180deg, ${userColor}44 0%, #0a0a18 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>👤</div>
                                )}
                                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, transparent 40%, rgba(0,0,0,0.3) 100%)' }} />
                              </div>
                              <div style={{
                                position: 'absolute', top: '10px',
                                left: idx % 2 === 0 ? '12px' : 'auto',
                                right: idx % 2 === 1 ? '12px' : 'auto',
                                zIndex: 2, maxWidth: '72%',
                              }}>
                                <div style={{
                                  background: 'rgba(255,255,255,0.92)',
                                  borderRadius: idx % 2 === 0 ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
                                  padding: '8px 12px',
                                  backdropFilter: 'blur(12px)',
                                  boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '3px' }}>
                                    <span style={{ color: '#1e1b4b', fontSize: '11px', fontWeight: 700 }}>{slot.senderName}</span>
                                    {slot.count > 1 && (
                                      <span style={{ background: 'rgba(109,40,217,0.15)', color: '#7c3aed', borderRadius: '8px', padding: '1px 6px', fontSize: '10px', fontWeight: 700 }}>+{slot.count - 1}件</span>
                                    )}
                                  </div>
                                  <p style={{ color: '#1e1b4b', fontSize: '13px', margin: 0, lineHeight: 1.4 }}>
                                    {slot.text.length > 45 ? slot.text.slice(0, 45) + '…' : slot.text}
                                  </p>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <p style={{ color: 'rgba(255,255,255,0.06)', fontSize: '12px', margin: 0 }}>waiting...</p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'white', borderTop: '1px solid rgba(0,0,0,0.08)', flexShrink: 0, paddingBottom: 'env(safe-area-inset-bottom)' }}>
                    <input ref={fileInputChatRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageSelectChat} />
                    {isRecordingChat ? (
                      <div onClick={handleMicPressEndChat} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', background: '#fef2f2', borderRadius: 20, cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626' }} />
                          <span style={{ color: '#dc2626', fontSize: 14 }}>録音中... {recordingSecondsChat}秒</span>
                        </div>
                        <span style={{ color: '#dc2626', fontSize: 12, fontWeight: 'bold' }}>■ 停止</span>
                      </div>
                    ) : (
                      <>
                        {!isTypingChat && (
                          <button onClick={() => setShowActionSheetChat(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0, display: 'flex' }}>
                            <PlusIcon />
                          </button>
                        )}
                        <input value={input} onChange={handleInputChangeChat} onKeyDown={onKeyDown} onFocus={e => { const el = e.target; setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300) }} placeholder="メッセージを送る..."
                          style={{ flex: 1, border: '1px solid rgba(0,0,0,0.12)', borderRadius: 20, padding: '8px 14px', fontSize: 14, outline: 'none', background: '#f5f5f5', color: '#111', minWidth: 0 }}
                        />
                        {!isTypingChat ? (
                          <button
                            onMouseDown={handleMicPressStartChat}
                            onMouseUp={handleMicPressEndChat}
                            onMouseLeave={handleMicPressEndChat}
                            onTouchStart={e => { e.preventDefault(); handleMicPressStartChat() }}
                            onTouchEnd={e => { e.preventDefault(); handleMicPressEndChat() }}
                            onTouchCancel={handleMicPressEndChat}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0, display: 'flex' }}
                          >
                            <MicIcon recording={isRecordingChat} />
                          </button>
                        ) : (
                          <button onClick={send} style={{ backgroundColor: '#7c3aed', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                            <SendIcon />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ) : (
                /* Discord-style chat */
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <div ref={chatScrollRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 0', scrollbarWidth: 'none' }}>
                    {msgs.map((msg, idx) => {
                      const prevMsg = msgs[idx - 1]
                      const isSameSender = prevMsg?.sender === msg.sender
                      const isMe = msg.sender === 'me'
                      return (
                        <div key={msg.id} style={{ padding: isSameSender ? '1px 16px' : '8px 16px 1px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                          <div style={{ width: '36px', flexShrink: 0, marginTop: isSameSender ? 0 : 2 }}>
                            {!isSameSender && (
                              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: isMe ? 'linear-gradient(135deg, #5b21b6, #7c3aed)' : 'linear-gradient(135deg, #1e3a5f, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>👤</div>
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {!isSameSender && (
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '2px' }}>
                                <span style={{ color: isMe ? '#c4b5fd' : 'rgba(255,255,255,0.85)', fontSize: '13px', fontWeight: 700 }}>
                                  {isMe ? 'あなた' : msg.sender}
                                </span>
                                <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px' }}>{msg.timestamp}</span>
                              </div>
                            )}
                            <p style={{ color: '#111111', fontSize: '14px', margin: 0, lineHeight: 1.5, wordBreak: 'break-word' }}>{msg.text}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'white', borderTop: '1px solid rgba(0,0,0,0.08)', flexShrink: 0, paddingBottom: 'env(safe-area-inset-bottom)' }}>
                    <input ref={fileInputChatRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageSelectChat} />
                    {isRecordingChat ? (
                      <div onClick={handleMicPressEndChat} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', background: '#fef2f2', borderRadius: 20, cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626' }} />
                          <span style={{ color: '#dc2626', fontSize: 14 }}>録音中... {recordingSecondsChat}秒</span>
                        </div>
                        <span style={{ color: '#dc2626', fontSize: 12, fontWeight: 'bold' }}>■ 停止</span>
                      </div>
                    ) : (
                      <>
                        {!isTypingChat && (
                          <button onClick={() => setShowActionSheetChat(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0, display: 'flex' }}>
                            <PlusIcon />
                          </button>
                        )}
                        <input value={input} onChange={handleInputChangeChat} onKeyDown={onKeyDown} onFocus={e => { const el = e.target; setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300) }} placeholder="メッセージを送る..."
                          style={{ flex: 1, border: '1px solid rgba(0,0,0,0.12)', borderRadius: 20, padding: '8px 14px', fontSize: 14, outline: 'none', background: '#f5f5f5', color: '#111', minWidth: 0 }}
                        />
                        {!isTypingChat ? (
                          <button
                            onMouseDown={handleMicPressStartChat}
                            onMouseUp={handleMicPressEndChat}
                            onMouseLeave={handleMicPressEndChat}
                            onTouchStart={e => { e.preventDefault(); handleMicPressStartChat() }}
                            onTouchEnd={e => { e.preventDefault(); handleMicPressEndChat() }}
                            onTouchCancel={handleMicPressEndChat}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0, display: 'flex' }}
                          >
                            <MicIcon recording={isRecordingChat} />
                          </button>
                        ) : (
                          <button onClick={send} style={{ backgroundColor: '#7c3aed', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                            <SendIcon />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ── Friend chat: AvatarChat ── */
            <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {sharedImages.length > 0 && (
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
                  <div onClick={() => setIsImagesOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', cursor: 'pointer', background: 'rgba(255,255,255,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px' }}>🖼️</span>
                      <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 600 }}>画像 ({sharedImages.length})</span>
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', transform: isImagesOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block' }}>▼</span>
                  </div>
                  {isImagesOpen && (
                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '8px 16px 12px', scrollbarWidth: 'none' }}>
                      {sharedImages.map(img => (
                        <div key={img.id} style={{ flexShrink: 0 }}>
                          <img src={img.url} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', display: 'block', cursor: 'pointer' }} alt="共有画像" onClick={() => window.open(img.url, '_blank')} />
                          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '9px', margin: '3px 0 0', textAlign: 'center' }}>{img.time}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <AvatarChat
                  partnerName={meta.label}
                  partnerAvatarUrl={undefined}
                  myAvatarUrl={undefined}
                  period={period}
                  chatBg={undefined}
                  initialMessages={msgs.map(m => ({
                    id: m.id,
                    sender: (m.sender === 'me' ? 'me' : 'them') as 'me' | 'them',
                    text: m.text,
                    time: m.timestamp ?? '',
                  }))}
                  onSend={(text, imageUrl) => {
                    const time = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
                    if (imageUrl) {
                      setSharedImages(prev => [...prev, { id: Date.now(), url: imageUrl, sender: 'me', time }])
                    } else {
                      const newMsg: Message = { id: Date.now().toString(), sender: 'me', text, timestamp: time }
                      setMsgs(prev => [...prev, newMsg])
                    }
                  }}
                />
              </div>
            </div>
          )
        }
      </div>

      {/* Bottom: input */}
      {showBottom && (
        <div className="flex-shrink-0" style={{ background: t.headerBg, borderTop: `1px solid ${t.border}`, paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {forceLocked && (
            <p style={{ fontSize: '11px', color: t.dimText, textAlign: 'center', padding: '6px 16px 0' }}>
              フォローすると投稿できます
            </p>
          )}
          <div className="flex items-center gap-2 px-3" style={{ height: '56px' }}>
            <input value={input} onChange={e => { if (!forceLocked) setInput(e.target.value) }}
              onKeyDown={!forceLocked ? onKeyDown : undefined}
              onFocus={e => { const el = e.target; setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300) }}
              disabled={forceLocked}
              placeholder="メッセージを入力..."
              style={{ flex: 1, background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: '20px', padding: '8px 14px', fontSize: '13px', color: t.inputText, outline: 'none', opacity: forceLocked ? 0.5 : 1 }} />
            <button onClick={!forceLocked ? send : undefined} disabled={!input.trim() || forceLocked}
              className="flex items-center justify-center flex-shrink-0 transition-opacity disabled:opacity-35"
              style={{ width: '36px', height: '36px', borderRadius: '50%', background: t.accent, color: '#fff', fontSize: '16px' }}>
              ↑
            </button>
          </div>
        </div>
      )}

      {/* Profile sub-page overlay */}
      <UserProfileSubPage user={viewingUser} onClose={() => setViewingUser(null)} t={t} />

      {/* アクションシート */}
      {showActionSheetChat && (
        <>
          <div onClick={() => setShowActionSheetChat(false)} style={{ position: 'fixed', inset: 0, zIndex: 10, background: 'rgba(0,0,0,0.4)' }} />
          <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 390, background: 'white', borderRadius: '20px 20px 0 0', paddingBottom: 32, zIndex: 11 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.15)', margin: '12px auto 8px' }} />
            {[
              { icon: <PhotoIcon />,    label: '写真・動画', sub: 'アルバムから選択',   action: () => { fileInputChatRef.current?.click(); setShowActionSheetChat(false) } },
              { icon: <CameraIcon />,   label: 'カメラ',     sub: '撮影して送信',       action: () => setShowActionSheetChat(false) },
              { icon: <LocationIcon />, label: '位置情報',   sub: '現在地を共有',       action: () => setShowActionSheetChat(false) },
              { icon: <FileIcon />,     label: 'ファイル',   sub: 'ドキュメントを送信', action: () => setShowActionSheetChat(false) },
              { icon: <StickerIcon />,  label: 'スタンプ',   sub: '近日公開',           action: () => setShowActionSheetChat(false) },
            ].map((item, i, arr) => (
              <button key={item.label} onClick={item.action} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 24px', width: '100%', background: 'none', border: 'none', borderBottom: i < arr.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(124,58,237,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {item.icon}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)', marginTop: 1 }}>{item.sub}</div>
                </div>
              </button>
            ))}
            <button onClick={() => setShowActionSheetChat(false)} style={{ margin: '8px 16px 0', width: 'calc(100% - 32px)', padding: '14px', borderRadius: 14, background: 'rgba(0,0,0,0.06)', border: 'none', fontSize: 15, color: '#111', cursor: 'pointer', fontWeight: 'bold', display: 'block' }}>
              キャンセル
            </button>
          </div>
        </>
      )}

      {/* 共通ドア編集全画面 */}
      {isSharedDoorEditOpen && (
        <div style={{
          position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: '390px', height: '100%',
          zIndex: 300, overflow: 'hidden',
        }}>
          <DoorFullEditor
            doorKey={roomKey ?? 'friend'}
            label={meta.label}
            initialCustom={sharedDoorMap[roomKey ?? ''] ?? { doorColor: '#8B5E3C', doorAccentColor: '#6B4423', labelBgColor: '#1a0a00cc', labelTextColor: '#ffffff', knobColor: '#D4AF37' }}
            onSave={(custom) => {
              setSharedDoor(roomKey ?? 'friend', custom)
              setIsSharedDoorEditOpen(false)
            }}
            onBack={() => { setIsSharedDoorEditOpen(false); document.body.style.overflow = '' }}
          />
        </div>
      )}

      {/* 共通デコ確認モーダル */}
      {chatSharedDecoOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: '390px',
        }}>
          <div style={{
            background: '#1e1b2e', borderRadius: '20px',
            padding: '28px 20px', width: '85%',
            display: 'flex', flexDirection: 'column', gap: '12px',
          }}>
            <p style={{ color: 'white', fontSize: '16px', fontWeight: 700, textAlign: 'center', margin: 0 }}>共通デコを設定</p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', textAlign: 'center', lineHeight: 1.6, margin: 0 }}>
              現在の背景・吹き出し・文字色の設定を<br />{meta.label}とのチャットの共通デコとして設定します
            </p>
            <div style={{ borderRadius: '12px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
              <div onClick={() => {
                const next = !sharedDecoAll
                setSharedDecoAll(next)
                setSharedDecoBg(next); setSharedDecoBubble(next)
                setSharedDecoText(next); setSharedDecoTheme(next); setSharedDecoTimeline(next)
              }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                <span style={{ color: 'white', fontSize: '14px', fontWeight: 700 }}>ALL</span>
                <div style={{ width: '44px', height: '26px', borderRadius: '13px', background: sharedDecoAll ? '#a78bfa' : 'rgba(255,255,255,0.15)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', top: '3px', left: sharedDecoAll ? '21px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
                </div>
              </div>
              {([
                { label: '🖼️ 背景',               val: sharedDecoBg,       set: setSharedDecoBg },
                { label: '💬 吹き出し',             val: sharedDecoBubble,   set: setSharedDecoBubble },
                { label: '🔡 文字色',               val: sharedDecoText,     set: setSharedDecoText },
                { label: '🎨 ルームテーマ色',       val: sharedDecoTheme,    set: setSharedDecoTheme },
                { label: '📋 タイムラインカード色',  val: sharedDecoTimeline, set: setSharedDecoTimeline },
              ] as const).map(({ label, val, set }, i, arr) => (
                <div key={label} onClick={() => set(!val)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', cursor: 'pointer' }}>
                  <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>{label}</span>
                  <div style={{ width: '44px', height: '26px', borderRadius: '13px', background: val ? '#a78bfa' : 'rgba(255,255,255,0.15)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                    <div style={{ position: 'absolute', top: '3px', left: val ? '21px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setChatSharedDecoOpen(false)}
              style={{ width: '100%', padding: '13px', borderRadius: '24px', background: '#a78bfa', color: '#fff', fontSize: '15px', fontWeight: 700, border: 'none', cursor: 'pointer' }}
            >共通デコとして設定する</button>
            <button
              onClick={() => setChatSharedDecoOpen(false)}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '13px', cursor: 'pointer', padding: '4px' }}
            >キャンセル</button>
          </div>
        </div>
      )}

      {/* 設定全画面 */}
      {isSettingsOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: '#0d0d1a',
          display: 'flex', flexDirection: 'column',
          width: '100%',
        }}>
          {/* ヘッダー */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '16px 16px 12px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}>
            <button
              onClick={() => setIsSettingsOpen(false)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.7)', fontSize: '20px',
                display: 'flex', alignItems: 'center', padding: '4px',
              }}
            >←</button>
            <p style={{ color: 'white', fontWeight: 700, fontSize: '16px', margin: 0 }}>設定</p>
          </div>

          {/* 相手のプロフィール */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '28px 16px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #2d1f5e, #1a1040)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '40px', marginBottom: '12px',
              border: '2px solid rgba(167,139,250,0.3)',
            }}>👤</div>
            <p style={{ color: 'white', fontWeight: 700, fontSize: '18px', margin: '0 0 4px' }}>{meta.label}</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 }}>{meta.members}</p>
          </div>

          {/* タブ */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, padding: '0 16px' }}>
            {(['general', 'custom'] as const).map(tb => {
              const labels = { general: '一般', custom: 'カスタマイズ' }
              const on = chatSettingsTab === tb
              return (
                <button key={tb} onClick={() => setChatSettingsTab(tb)} style={{ padding: '10px 16px', fontSize: '13px', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', color: on ? 'white' : 'rgba(255,255,255,0.4)', borderBottom: on ? '2px solid #a78bfa' : '2px solid transparent', marginBottom: '-1px' }}>
                  {labels[tb]}
                </button>
              )
            })}
          </div>

          {chatSettingsTab === 'general' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>

              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', fontWeight: 600, padding: '16px 20px 8px', margin: 0, letterSpacing: '0.8px' }}>通知</p>
              <div style={{ margin: '0 16px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                <div onClick={() => setIsMuted(p => !p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '18px' }}>{isMuted ? '🔕' : '🔔'}</span>
                    <p style={{ color: 'white', fontSize: '14px', margin: 0 }}>{isMuted ? 'ミュート中' : 'メッセージ通知'}</p>
                  </div>
                  <div style={{ width: '44px', height: '26px', borderRadius: '13px', background: isMuted ? 'rgba(255,255,255,0.15)' : '#a78bfa', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                    <div style={{ position: 'absolute', top: '3px', left: isMuted ? '3px' : '21px', width: '20px', height: '20px', borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
                  </div>
                </div>
              </div>

              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', fontWeight: 600, padding: '20px 20px 8px', margin: 0, letterSpacing: '0.8px' }}>チャット</p>
              <div style={{ margin: '0 16px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: '18px' }}>🖼️</span>
                  <div>
                    <p style={{ color: 'white', fontSize: '14px', margin: 0 }}>共有した画像</p>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', margin: '2px 0 0' }}>チャット・記録タブで確認できます</p>
                  </div>
                </div>
                <div onClick={() => { if (window.confirm('このチャットの履歴を全て削除しますか？この操作は元に戻せません。')) { setIsSettingsOpen(false) } }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', cursor: 'pointer' }}>
                  <span style={{ fontSize: '18px' }}>🗑️</span>
                  <p style={{ color: '#f87171', fontSize: '14px', margin: 0 }}>チャット履歴を削除</p>
                </div>
              </div>

              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', fontWeight: 600, padding: '20px 20px 8px', margin: 0, letterSpacing: '0.8px' }}>ユーザー</p>
              <div style={{ margin: '0 16px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                <div onClick={() => { if (window.confirm('このユーザーをブロックしますか？')) { setIsSettingsOpen(false) } }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: '18px' }}>🚫</span>
                  <div>
                    <p style={{ color: '#f87171', fontSize: '14px', margin: 0 }}>ブロック</p>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', margin: '2px 0 0' }}>このユーザーのメッセージを受け取らない</p>
                  </div>
                </div>
                <div onClick={() => { if (window.confirm('このユーザーを通報しますか？')) { setIsSettingsOpen(false) } }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', cursor: 'pointer' }}>
                  <span style={{ fontSize: '18px' }}>⚠️</span>
                  <div>
                    <p style={{ color: '#f87171', fontSize: '14px', margin: 0 }}>通報</p>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', margin: '2px 0 0' }}>不適切なコンテンツを報告する</p>
                  </div>
                </div>
              </div>

              <div style={{ height: '40px' }} />
            </div>
          )}

          {chatSettingsTab === 'custom' && meta.type === 'friend' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: 40, scrollbarWidth: 'none' as const, display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 600, margin: '0 0 12px 4px', letterSpacing: '0.8px' }}>ドアデザイン連携</p>

              {/* デフォルト設定を使用 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 12 }}>
                <div style={{ flex: 1, marginRight: 12 }}>
                  <div style={{ color: 'white', fontSize: 14, fontWeight: 500 }}>デフォルト設定を使用</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 }}>図鑑で設定したドアデザインを使用します</div>
                </div>
                <div onClick={() => setUseDefaultDoor(p => !p)} style={{ width: 44, height: 24, borderRadius: 12, cursor: 'pointer', backgroundColor: useDefaultDoor ? '#7c3aed' : 'rgba(255,255,255,0.2)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', top: 2, left: useDefaultDoor ? 22 : 2, width: 20, height: 20, borderRadius: '50%', backgroundColor: 'white', transition: 'left 0.2s' }} />
                </div>
              </div>

              {/* 共通ドアを作る（常に操作可能） */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 12 }}>
                <div style={{ flex: 1, marginRight: 12 }}>
                  <div style={{ color: 'white', fontSize: 14, fontWeight: 500 }}>共通ドアを作る</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 }}>お互いに同じドアデザインを共有します</div>
                </div>
                <div onClick={() => setUseSharedDoor(p => !p)} style={{ width: 44, height: 24, borderRadius: 12, cursor: 'pointer', backgroundColor: useSharedDoor ? '#7c3aed' : 'rgba(255,255,255,0.2)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', top: 2, left: useSharedDoor ? 22 : 2, width: 20, height: 20, borderRadius: '50%', backgroundColor: 'white', transition: 'left 0.2s' }} />
                </div>
              </div>

              {/* 共通ドア ON 時のUI */}
              {useSharedDoor && (
                <div style={{ marginTop: '16px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                  {sharedDoorMap[roomKey] ? (
                    <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                        {(['doorColor', 'doorAccentColor', 'knobColor'] as const).map(k => (
                          <div key={k} style={{ width: 20, height: 20, borderRadius: 4, background: sharedDoorMap[roomKey][k], border: '1px solid rgba(255,255,255,0.15)' }} />
                        ))}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ color: 'white', fontSize: '13px', fontWeight: 600, margin: 0 }}>共通ドア設定済み</p>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', margin: '3px 0 0' }}>{meta.label}と共有中</p>
                      </div>
                      <button onClick={() => setIsSharedDoorEditOpen(true)} style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '12px', background: 'rgba(167,139,250,0.2)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.3)', cursor: 'pointer' }}>編集</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsSharedDoorEditOpen(true)}
                      style={{ width: '100%', padding: '20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      <span style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(167,139,250,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>＋</span>
                      <span style={{ color: '#a78bfa', fontSize: '14px', fontWeight: 600 }}>共通ドアを作成する</span>
                    </button>
                  )}
                </div>
              )}
              </div>
              <div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600, margin: '0 0 12px 4px', letterSpacing: '0.8px' }}>チャットのカスタマイズ</p>
              {/* デフォルト設定トグル */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 12 }}>
                <div style={{ flex: 1, marginRight: 12 }}>
                  <div style={{ color: 'white', fontSize: 14, fontWeight: 500 }}>デフォルト設定を使用</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 }}>Decorationの設定を使用します</div>
                </div>
                <div onClick={() => {
                  if (!useFriendChatGlobalSetting) {
                    localStorage.removeItem(FRIEND_CHAT_STORAGE_KEY)
                    const g = localStorage.getItem('chatCustomize')
                    if (g) setFriendChatCustomize({ ...JSON.parse(g), roomThemeColor: '#7c3aed', timelineCardColor: '#1e1e3a', timelineCardTextColor: '#ffffff' })
                  }
                  setUseFriendChatGlobalSetting(p => !p)
                }} style={{ width: 44, height: 24, borderRadius: 12, cursor: 'pointer', backgroundColor: useFriendChatGlobalSetting ? '#7c3aed' : 'rgba(255,255,255,0.2)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', top: 2, left: useFriendChatGlobalSetting ? 22 : 2, width: 20, height: 20, borderRadius: '50%', backgroundColor: 'white', transition: 'left 0.2s' }} />
                </div>
              </div>
              {/* 色設定折りたたみ */}
              <div style={{ opacity: useFriendChatGlobalSetting ? 0.4 : 1, pointerEvents: useFriendChatGlobalSetting ? 'none' : 'auto' }}>
                {([
                  { key: 'bg',           label: '🖼️ 背景' },
                  { key: 'bubble',       label: '💬 吹き出し' },
                  { key: 'text',         label: '🔤 文字色' },
                  { key: 'timelineCard', label: '📋 タイムラインカード色' },
                ] as const).map(({ key, label }) => (
                  <div key={key} style={{ marginBottom: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 12, overflow: 'hidden' }}>
                    <div onClick={() => setFriendChatOpenSub(friendChatOpenSub === key ? null : key)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', cursor: 'pointer' }}>
                      <span style={{ color: 'white', fontSize: 14 }}>{label}</span>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{friendChatOpenSub === key ? '▼' : '▶'}</span>
                    </div>
                    {friendChatOpenSub === key && (
                      <div style={{ padding: '8px 0' }}>
                        <div style={{ padding: '0 14px 10px' }}>
                          <div style={{ background: friendChatCustomize.bgColor, borderRadius: 10, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <div style={{ background: friendChatCustomize.otherBubbleColor, borderRadius: 12, padding: '5px 10px' }}><span style={{ color: friendChatCustomize.otherTextColor, fontSize: 12 }}>こんにちは</span></div>
                            <div style={{ background: friendChatCustomize.myBubbleColor, borderRadius: 12, padding: '5px 10px' }}><span style={{ color: friendChatCustomize.myTextColor, fontSize: 12 }}>よろしく！</span></div>
                          </div>
                        </div>
                        {key === 'bg' && (
                          <>
                            <div onClick={() => setChatBgSubOpen2(p => !p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                              <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600 }}>💬 チャット背景</span>
                              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{chatBgSubOpen2 ? '▼' : '▶'}</span>
                            </div>
                            {chatBgSubOpen2 && <div style={{ padding: '0 16px 16px' }}>{renderFriendChatSlider('bg', 'bgColor', `f-bg`)}</div>}
                            <div onClick={() => setChatAvatarBgSubOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                              <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600 }}>🧍 アバターチャット背景</span>
                              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{chatAvatarBgSubOpen ? '▼' : '▶'}</span>
                            </div>
                            {chatAvatarBgSubOpen && (
                              <div style={{ padding: '0 16px 12px' }}>
                                <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', height: 110, marginBottom: 10, background: roomAvatarBg ?? '#0f0a1e' }}>
                                  <div style={{ position: 'absolute', inset: 0, backgroundColor: roomAvatarBgMode === 'color' ? `hsl(${roomAvatarBgHue},${roomAvatarBgSat}%,${roomAvatarBgLight}%)` : '#0f0a1e', backgroundImage: roomAvatarBgMode !== 'color' ? (roomAvatarBg ?? 'none') : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }} />
                                  <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 55, height: 78 }}>
                                    {chatSelectedAvatar ? <img src={chatSelectedAvatar} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} alt="" /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>👤</div>}
                                  </div>
                                </div>
                                <div onClick={() => setChatAvatarBgChangeOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: 600 }}>🎨 背景を変える</span>
                                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{chatAvatarBgChangeOpen ? '▼' : '▶'}</span>
                                </div>
                                {chatAvatarBgChangeOpen && (
                                  <div style={{ paddingBottom: 8 }}>
                                    <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                                      {(['color', 'image', 'virtual'] as const).map(m => (
                                        <button key={m} onClick={() => setRoomAvatarBgMode(m)} style={{ flex: 1, padding: '5px 2px', borderRadius: 7, background: roomAvatarBgMode === m ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.05)', border: roomAvatarBgMode === m ? '1px solid rgba(167,139,250,0.4)' : '1px solid rgba(255,255,255,0.1)', color: roomAvatarBgMode === m ? '#c4b5fd' : 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                                          {m === 'color' ? '🎨 カラー' : m === 'image' ? '🖼️ 画像' : '✨ バーチャル'}
                                        </button>
                                      ))}
                                    </div>
                                    {roomAvatarBgMode === 'color' && (() => {
                                      const applyHex = (c: string) => { const r=parseInt(c.slice(1,3),16)/255,g=parseInt(c.slice(3,5),16)/255,b=parseInt(c.slice(5,7),16)/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2,d=mx-mn; setRoomAvatarBgLight(Math.round(l*95)); if(d<0.001){setRoomAvatarBgHue(0);setRoomAvatarBgSat(0)}else{const s=l>0.5?d/(2-mx-mn):d/(mx+mn),h=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4;setRoomAvatarBgHue(Math.round(h/6*360));setRoomAvatarBgSat(Math.round(s*100))} }
                                      return (
                                      <div>
                                        <div style={{ height: 22, borderRadius: 7, background: `hsl(${roomAvatarBgHue},${roomAvatarBgSat}%,${roomAvatarBgLight}%)`, marginBottom: 6, border: '1px solid rgba(255,255,255,0.1)' }} />
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                                          <div style={{ flex: 1, position: 'relative', height: 20 }}>
                                            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 5, transform: 'translateY(-50%)', borderRadius: 3, background: 'linear-gradient(to right,hsl(0,80%,55%),hsl(60,80%,55%),hsl(120,80%,55%),hsl(180,80%,55%),hsl(240,80%,55%),hsl(300,80%,55%),hsl(360,80%,55%))', pointerEvents: 'none' }} />
                                            <input type="range" min={0} max={360} value={roomAvatarBgHue} style={{ position: 'absolute', inset: 0, width: '100%', opacity: 0, cursor: 'pointer', margin: 0 }} onChange={e => setRoomAvatarBgHue(Number(e.target.value))} onInput={e => setRoomAvatarBgHue(Number((e.target as HTMLInputElement).value))} />
                                            <div style={{ position: 'absolute', top: '50%', left: `calc(${roomAvatarBgHue / 360 * 100}% - 8px)`, transform: 'translateY(-50%)', width: 16, height: 16, borderRadius: '50%', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.5)', pointerEvents: 'none' }} />
                                          </div>
                                          <button onClick={() => setRoomAvatarBgPaletteOpen(p => !p)} style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0 }}>🎨</button>
                                        </div>
                                        <div style={{ position: 'relative', height: 20, marginBottom: 5 }}>
                                          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 5, transform: 'translateY(-50%)', borderRadius: 3, background: `linear-gradient(to right,hsl(${roomAvatarBgHue},0%,${roomAvatarBgLight}%),hsl(${roomAvatarBgHue},100%,${roomAvatarBgLight}%))`, pointerEvents: 'none' }} />
                                          <input type="range" min={0} max={100} value={roomAvatarBgSat} style={{ position: 'absolute', inset: 0, width: '100%', opacity: 0, cursor: 'pointer', margin: 0 }} onChange={e => setRoomAvatarBgSat(Number(e.target.value))} onInput={e => setRoomAvatarBgSat(Number((e.target as HTMLInputElement).value))} />
                                          <div style={{ position: 'absolute', top: '50%', left: `calc(${roomAvatarBgSat / 100 * 100}% - 8px)`, transform: 'translateY(-50%)', width: 16, height: 16, borderRadius: '50%', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.5)', pointerEvents: 'none' }} />
                                        </div>
                                        <div style={{ position: 'relative', height: 20, marginBottom: 5 }}>
                                          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 5, transform: 'translateY(-50%)', borderRadius: 3, background: `linear-gradient(to right,hsl(${roomAvatarBgHue},${roomAvatarBgSat}%,5%),hsl(${roomAvatarBgHue},${roomAvatarBgSat}%,95%))`, pointerEvents: 'none' }} />
                                          <input type="range" min={0} max={95} value={roomAvatarBgLight} style={{ position: 'absolute', inset: 0, width: '100%', opacity: 0, cursor: 'pointer', margin: 0 }} onChange={e => setRoomAvatarBgLight(Number(e.target.value))} onInput={e => setRoomAvatarBgLight(Number((e.target as HTMLInputElement).value))} />
                                          <div style={{ position: 'absolute', top: '50%', left: `calc(${roomAvatarBgLight / 95 * 100}% - 8px)`, transform: 'translateY(-50%)', width: 16, height: 16, borderRadius: '50%', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.5)', pointerEvents: 'none' }} />
                                        </div>
                                        {roomAvatarBgPaletteOpen && (
                                          <>
                                            <div onClick={() => setRoomAvatarBgPaletteOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 0 }} />
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
                                    {roomAvatarBgMode === 'image' && (
                                      <div>
                                        <input ref={roomAvatarBgImageInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) setRoomAvatarBgImage(URL.createObjectURL(f)) }} />
                                        <button onClick={() => roomAvatarBgImageInputRef.current?.click()} style={{ width: '100%', padding: '8px', borderRadius: 7, background: 'rgba(255,255,255,0.06)', border: '1px dashed rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', fontSize: 12, cursor: 'pointer', marginBottom: 6 }}>📷 写真をアップロード</button>
                                      </div>
                                    )}
                                    {roomAvatarBgMode === 'virtual' && (
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
                                        {ROOM_VIRTUAL_BGSETS.map(bg => <button key={bg.label} onClick={() => setRoomAvatarBg(bg.gradient)} style={{ width: 48, height: 48, borderRadius: 7, background: bg.gradient, border: roomAvatarBg === bg.gradient ? '2px solid #a78bfa' : '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', position: 'relative', padding: 0 }}><span style={{ position: 'absolute', bottom: 2, left: 0, right: 0, textAlign: 'center', fontSize: 8, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{bg.label}</span></button>)}
                                      </div>
                                    )}
                                    <button onClick={() => { if (roomAvatarBgMode === 'color') setRoomAvatarBg(`hsl(${roomAvatarBgHue},${roomAvatarBgSat}%,${roomAvatarBgLight}%)`); else if (roomAvatarBgMode === 'image') setRoomAvatarBg(roomAvatarBgImage ?? undefined) }} style={{ width: '100%', padding: '8px 0', borderRadius: 7, background: '#7c3aed', border: 'none', color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>この背景を適用する</button>
                                  </div>
                                )}
                                <div onClick={() => setChatAvatarChangeOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: 600 }}>👤 アバターを変える</span>
                                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{chatAvatarChangeOpen ? '▼' : '▶'}</span>
                                </div>
                                {chatAvatarChangeOpen && (
                                  <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 4, paddingTop: 6 }}>
                                    <div onClick={() => setChatSelectedAvatar(null)} style={{ flexShrink: 0, width: 44, height: 62, borderRadius: 8, border: chatSelectedAvatar === null ? '2px solid #a78bfa' : '2px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, cursor: 'pointer' }}>👤</div>
                                    {(savedAvatars ?? []).map((av) => (
                                      <div key={av.id} onClick={() => setChatSelectedAvatar(av.imageUrl)} style={{ flexShrink: 0, width: 44, height: 62, borderRadius: 8, border: chatSelectedAvatar === av.imageUrl ? '2px solid #a78bfa' : '2px solid rgba(255,255,255,0.1)', overflow: 'hidden', cursor: 'pointer' }}>
                                        <img src={av.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} alt="" />
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}
                        {key === 'bubble' && (<>
                          <div onClick={() => setChatMyBubbleOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600 }}>🟣 自分の吹き出し</span>
                            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{chatMyBubbleOpen ? '▼' : '▶'}</span>
                          </div>
                          {chatMyBubbleOpen && <div style={{ padding: '0 16px 16px' }}>{renderFriendChatSlider('myBubble', 'myBubbleColor', `f-myBubble`)}</div>}
                          <div onClick={() => setChatTheirBubbleOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600 }}>🔵 相手の吹き出し</span>
                            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{chatTheirBubbleOpen ? '▼' : '▶'}</span>
                          </div>
                          {chatTheirBubbleOpen && <div style={{ padding: '0 16px 16px' }}>{renderFriendChatSlider('otherBubble', 'otherBubbleColor', `f-otherBubble`)}</div>}
                        </>)}
                        {key === 'text' && (<>
                          <div onClick={() => setChatMyTextOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600 }}>🟣 自分の文字色</span>
                            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{chatMyTextOpen ? '▼' : '▶'}</span>
                          </div>
                          {chatMyTextOpen && <div style={{ padding: '0 16px 16px' }}>{renderFriendChatSlider('myText', 'myTextColor', `f-myText`)}</div>}
                          <div onClick={() => setChatTheirTextOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600 }}>🔵 相手の文字色</span>
                            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{chatTheirTextOpen ? '▼' : '▶'}</span>
                          </div>
                          {chatTheirTextOpen && <div style={{ padding: '0 16px 16px' }}>{renderFriendChatSlider('otherText', 'otherTextColor', `f-otherText`)}</div>}
                        </>)}
                        {key === 'timelineCard' && (<>
                          <div style={{ padding: '0 14px 10px' }}>
                            <div style={{ background: friendChatCustomize.timelineCardColor, borderRadius: 10, padding: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                              <span style={{ color: friendChatCustomize.timelineCardTextColor, fontSize: 13 }}>タイムライン投稿カードのプレビューです</span>
                            </div>
                          </div>
                          <div onClick={() => setChatCardBgOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600 }}>📋 カード背景色</span>
                            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{chatCardBgOpen ? '▼' : '▶'}</span>
                          </div>
                          {chatCardBgOpen && <div style={{ padding: '0 16px 16px' }}>{renderFriendChatSlider('timelineCard', 'timelineCardColor', `f-timelineCard`)}</div>}
                          <div onClick={() => setChatCardTextOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600 }}>🔡 カード文字色</span>
                            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{chatCardTextOpen ? '▼' : '▶'}</span>
                          </div>
                          {chatCardTextOpen && <div style={{ padding: '0 16px 16px' }}>{renderFriendChatSlider('timelineCardText', 'timelineCardTextColor', `f-timelineCardText`)}</div>}
                        </>)}
                        <div style={{ padding: '10px 14px 12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                          <button onClick={() => handleFriendChatSave(key)} style={{ width: '100%', padding: '10px 0', borderRadius: 8, background: friendChatSavedFeedback === key ? '#059669' : '#7c3aed', border: 'none', color: 'white', fontSize: 14, cursor: 'pointer' }}>
                            {friendChatSavedFeedback === key ? '保存しました ✓' : '保存する'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <button onClick={() => {
                  localStorage.removeItem(FRIEND_CHAT_STORAGE_KEY)
                  const g = localStorage.getItem('chatCustomize')
                  if (g) setFriendChatCustomize({ ...JSON.parse(g), roomThemeColor: '#7c3aed', timelineCardColor: '#1e1e3a', timelineCardTextColor: '#ffffff' })
                  setUseFriendChatGlobalSetting(true)
                }} style={{ width: '100%', padding: '12px 0', borderRadius: 10, marginTop: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', fontSize: 14, cursor: 'pointer' }}>
                  ⟳ グローバル設定に戻す
                </button>
              </div>
              {/* 共通デコ設定 */}
              <div style={{ marginTop: '8px' }}>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', fontWeight: 600, margin: '0 0 8px 4px', letterSpacing: '0.8px' }}>共通設定</p>
                <div style={{ borderRadius: '14px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                  <div
                    onClick={() => setChatSharedDecoOpen(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', cursor: 'pointer' }}
                  >
                    <span style={{ fontSize: '18px' }}>🎨</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ color: 'white', fontSize: '14px', fontWeight: 600, margin: 0 }}>共通のデコ設定にする</p>
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', margin: '2px 0 0' }}>背景・吹き出し・文字色を{meta.label}と揃える</p>
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '16px' }}>›</span>
                  </div>
                </div>
              </div>
              </div>
            </div>
          )}

          {chatSettingsTab === 'custom' && meta.type !== 'friend' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: 40, scrollbarWidth: 'none' as const }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 600, margin: '0 0 12px 4px', letterSpacing: '0.8px' }}>チャットのカスタマイズ</p>
              {/* デフォルト設定トグル */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 12 }}>
                <div style={{ flex: 1, marginRight: 12 }}>
                  <div style={{ color: 'white', fontSize: 14, fontWeight: 500 }}>デフォルト設定を使用</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 }}>Decorationの設定を使用します</div>
                </div>
                <div onClick={() => {
                  if (!useGroupGlobalSetting) {
                    localStorage.removeItem(GROUP_ROOM_STORAGE_KEY)
                    const g = localStorage.getItem('chatCustomize')
                    if (g) setGroupRoomCustomize({ ...JSON.parse(g), roomThemeColor: '#7c3aed', timelineCardColor: '#1e1e3a', timelineCardTextColor: '#ffffff' })
                  }
                  setUseGroupGlobalSetting(p => !p)
                }} style={{ width: 44, height: 24, borderRadius: 12, cursor: 'pointer', backgroundColor: useGroupGlobalSetting ? '#7c3aed' : 'rgba(255,255,255,0.2)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', top: 2, left: useGroupGlobalSetting ? 22 : 2, width: 20, height: 20, borderRadius: '50%', backgroundColor: 'white', transition: 'left 0.2s' }} />
                </div>
              </div>
              <div style={{ opacity: useGroupGlobalSetting ? 0.4 : 1, pointerEvents: useGroupGlobalSetting ? 'none' : 'auto' }}>
                {([
                  { key: 'bg',           label: '🖼 背景' },
                  { key: 'bubble',       label: '💬 吹き出し' },
                  { key: 'text',         label: '🔤 文字色' },
                  { key: 'timelineCard', label: '📋 タイムラインカード色' },
                ] as const).map(({ key, label }) => (
                  <div key={key} style={{ marginBottom: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 12, overflow: 'hidden' }}>
                    <div onClick={() => setGroupRoomOpenSub(groupRoomOpenSub === key ? null : key)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', cursor: 'pointer' }}>
                      <span style={{ color: 'white', fontSize: 14 }}>{label}</span>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{groupRoomOpenSub === key ? '▼' : '▶'}</span>
                    </div>
                    {groupRoomOpenSub === key && (
                      <div style={{ padding: '8px 0' }}>
                        <div style={{ padding: '0 14px 10px' }}>
                          <div style={{ background: groupRoomCustomize.bgColor, borderRadius: 10, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <div style={{ background: groupRoomCustomize.otherBubbleColor, borderRadius: 12, padding: '5px 10px' }}><span style={{ color: groupRoomCustomize.otherTextColor, fontSize: 12 }}>こんにちは</span></div>
                            <div style={{ background: groupRoomCustomize.myBubbleColor, borderRadius: 12, padding: '5px 10px' }}><span style={{ color: groupRoomCustomize.myTextColor, fontSize: 12 }}>よろしく！</span></div>
                          </div>
                        </div>
                        {key === 'bg' && (
                          <>
                            <div onClick={() => setChatBgSubOpen2(p => !p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                              <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600 }}>💬 チャット背景</span>
                              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{chatBgSubOpen2 ? '▼' : '▶'}</span>
                            </div>
                            {chatBgSubOpen2 && <div style={{ padding: '0 16px 16px' }}>{renderGroupSlider('bg', 'bgColor', `c-bg`)}</div>}
                            <div onClick={() => setChatAvatarBgSubOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                              <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600 }}>🧍 アバターチャット背景</span>
                              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{chatAvatarBgSubOpen ? '▼' : '▶'}</span>
                            </div>
                            {chatAvatarBgSubOpen && (
                              <div style={{ padding: '0 16px 12px' }}>
                                {/* プレビュー */}
                                <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', height: 110, marginBottom: 10, background: roomAvatarBg ?? '#0f0a1e' }}>
                                  <div style={{ position: 'absolute', inset: 0, backgroundColor: roomAvatarBgMode === 'color' ? `hsl(${roomAvatarBgHue},${roomAvatarBgSat}%,${roomAvatarBgLight}%)` : '#0f0a1e', backgroundImage: roomAvatarBgMode !== 'color' ? (roomAvatarBg ?? 'none') : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }} />
                                  <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 55, height: 78 }}>
                                    {chatSelectedAvatar ? <img src={chatSelectedAvatar} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} alt="" /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>👤</div>}
                                  </div>
                                </div>
                                {/* 🎨 背景を変える */}
                                <div onClick={() => setChatAvatarBgChangeOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: 600 }}>🎨 背景を変える</span>
                                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{chatAvatarBgChangeOpen ? '▼' : '▶'}</span>
                                </div>
                                {chatAvatarBgChangeOpen && (
                                  <div style={{ paddingBottom: 8 }}>
                                    <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                                      {(['color', 'image', 'virtual'] as const).map(m => (
                                        <button key={m} onClick={() => setRoomAvatarBgMode(m)} style={{ flex: 1, padding: '5px 2px', borderRadius: 7, background: roomAvatarBgMode === m ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.05)', border: roomAvatarBgMode === m ? '1px solid rgba(167,139,250,0.4)' : '1px solid rgba(255,255,255,0.1)', color: roomAvatarBgMode === m ? '#c4b5fd' : 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                                          {m === 'color' ? '🎨 カラー' : m === 'image' ? '🖼️ 画像' : '✨ バーチャル'}
                                        </button>
                                      ))}
                                    </div>
                                    {roomAvatarBgMode === 'color' && (() => {
                                      const applyHex = (c: string) => { const r=parseInt(c.slice(1,3),16)/255,g=parseInt(c.slice(3,5),16)/255,b=parseInt(c.slice(5,7),16)/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2,d=mx-mn; setRoomAvatarBgLight(Math.round(l*95)); if(d<0.001){setRoomAvatarBgHue(0);setRoomAvatarBgSat(0)}else{const s=l>0.5?d/(2-mx-mn):d/(mx+mn),h=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4;setRoomAvatarBgHue(Math.round(h/6*360));setRoomAvatarBgSat(Math.round(s*100))} }
                                      return (
                                      <div>
                                        <div style={{ height: 22, borderRadius: 7, background: `hsl(${roomAvatarBgHue},${roomAvatarBgSat}%,${roomAvatarBgLight}%)`, marginBottom: 6, border: '1px solid rgba(255,255,255,0.1)' }} />
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                                          <div style={{ flex: 1, position: 'relative', height: 20 }}>
                                            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 5, transform: 'translateY(-50%)', borderRadius: 3, background: 'linear-gradient(to right,hsl(0,80%,55%),hsl(60,80%,55%),hsl(120,80%,55%),hsl(180,80%,55%),hsl(240,80%,55%),hsl(300,80%,55%),hsl(360,80%,55%))', pointerEvents: 'none' }} />
                                            <input type="range" min={0} max={360} value={roomAvatarBgHue} style={{ position: 'absolute', inset: 0, width: '100%', opacity: 0, cursor: 'pointer', margin: 0 }} onChange={e => setRoomAvatarBgHue(Number(e.target.value))} onInput={e => setRoomAvatarBgHue(Number((e.target as HTMLInputElement).value))} />
                                            <div style={{ position: 'absolute', top: '50%', left: `calc(${roomAvatarBgHue / 360 * 100}% - 8px)`, transform: 'translateY(-50%)', width: 16, height: 16, borderRadius: '50%', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.5)', pointerEvents: 'none' }} />
                                          </div>
                                          <button onClick={() => setRoomAvatarBgPaletteOpen(p => !p)} style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0 }}>🎨</button>
                                        </div>
                                        <div style={{ position: 'relative', height: 20, marginBottom: 5 }}>
                                          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 5, transform: 'translateY(-50%)', borderRadius: 3, background: `linear-gradient(to right,hsl(${roomAvatarBgHue},0%,${roomAvatarBgLight}%),hsl(${roomAvatarBgHue},100%,${roomAvatarBgLight}%))`, pointerEvents: 'none' }} />
                                          <input type="range" min={0} max={100} value={roomAvatarBgSat} style={{ position: 'absolute', inset: 0, width: '100%', opacity: 0, cursor: 'pointer', margin: 0 }} onChange={e => setRoomAvatarBgSat(Number(e.target.value))} onInput={e => setRoomAvatarBgSat(Number((e.target as HTMLInputElement).value))} />
                                          <div style={{ position: 'absolute', top: '50%', left: `calc(${roomAvatarBgSat / 100 * 100}% - 8px)`, transform: 'translateY(-50%)', width: 16, height: 16, borderRadius: '50%', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.5)', pointerEvents: 'none' }} />
                                        </div>
                                        <div style={{ position: 'relative', height: 20, marginBottom: 5 }}>
                                          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 5, transform: 'translateY(-50%)', borderRadius: 3, background: `linear-gradient(to right,hsl(${roomAvatarBgHue},${roomAvatarBgSat}%,5%),hsl(${roomAvatarBgHue},${roomAvatarBgSat}%,95%))`, pointerEvents: 'none' }} />
                                          <input type="range" min={0} max={95} value={roomAvatarBgLight} style={{ position: 'absolute', inset: 0, width: '100%', opacity: 0, cursor: 'pointer', margin: 0 }} onChange={e => setRoomAvatarBgLight(Number(e.target.value))} onInput={e => setRoomAvatarBgLight(Number((e.target as HTMLInputElement).value))} />
                                          <div style={{ position: 'absolute', top: '50%', left: `calc(${roomAvatarBgLight / 95 * 100}% - 8px)`, transform: 'translateY(-50%)', width: 16, height: 16, borderRadius: '50%', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.5)', pointerEvents: 'none' }} />
                                        </div>
                                        {roomAvatarBgPaletteOpen && (
                                          <>
                                            <div onClick={() => setRoomAvatarBgPaletteOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 0 }} />
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
                                    {roomAvatarBgMode === 'image' && (
                                      <div>
                                        <input ref={roomAvatarBgImageInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) setRoomAvatarBgImage(URL.createObjectURL(f)) }} />
                                        <button onClick={() => roomAvatarBgImageInputRef.current?.click()} style={{ width: '100%', padding: '8px', borderRadius: 7, background: 'rgba(255,255,255,0.06)', border: '1px dashed rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', fontSize: 12, cursor: 'pointer', marginBottom: 6 }}>📷 写真をアップロード</button>
                                      </div>
                                    )}
                                    {roomAvatarBgMode === 'virtual' && (
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
                                        {ROOM_VIRTUAL_BGSETS.map(bg => <button key={bg.label} onClick={() => setRoomAvatarBg(bg.gradient)} style={{ width: 48, height: 48, borderRadius: 7, background: bg.gradient, border: roomAvatarBg === bg.gradient ? '2px solid #a78bfa' : '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', position: 'relative', padding: 0 }}><span style={{ position: 'absolute', bottom: 2, left: 0, right: 0, textAlign: 'center', fontSize: 8, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{bg.label}</span></button>)}
                                      </div>
                                    )}
                                    <button onClick={() => { if (roomAvatarBgMode === 'color') setRoomAvatarBg(`hsl(${roomAvatarBgHue},${roomAvatarBgSat}%,${roomAvatarBgLight}%)`); else if (roomAvatarBgMode === 'image') setRoomAvatarBg(roomAvatarBgImage ?? undefined) }} style={{ width: '100%', padding: '8px 0', borderRadius: 7, background: '#7c3aed', border: 'none', color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>この背景を適用する</button>
                                  </div>
                                )}
                                {/* 👤 アバターを変える */}
                                <div onClick={() => setChatAvatarChangeOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: 600 }}>👤 アバターを変える</span>
                                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{chatAvatarChangeOpen ? '▼' : '▶'}</span>
                                </div>
                                {chatAvatarChangeOpen && (
                                  <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 4, paddingTop: 6 }}>
                                    <div onClick={() => setChatSelectedAvatar(null)} style={{ flexShrink: 0, width: 44, height: 62, borderRadius: 8, border: chatSelectedAvatar === null ? '2px solid #a78bfa' : '2px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, cursor: 'pointer' }}>👤</div>
                                    {(savedAvatars ?? []).map((av) => (
                                      <div key={av.id} onClick={() => setChatSelectedAvatar(av.imageUrl)} style={{ flexShrink: 0, width: 44, height: 62, borderRadius: 8, border: chatSelectedAvatar === av.imageUrl ? '2px solid #a78bfa' : '2px solid rgba(255,255,255,0.1)', overflow: 'hidden', cursor: 'pointer' }}>
                                        <img src={av.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} alt="" />
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}
                        {key === 'bubble' && (<>
                          <div onClick={() => setChatMyBubbleOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600 }}>🟣 自分の吹き出し</span>
                            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{chatMyBubbleOpen ? '▼' : '▶'}</span>
                          </div>
                          {chatMyBubbleOpen && <div style={{ padding: '0 16px 16px' }}>{renderGroupSlider('myBubble', 'myBubbleColor', `c-myBubble`)}</div>}
                          <div onClick={() => setChatTheirBubbleOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600 }}>🔵 相手の吹き出し</span>
                            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{chatTheirBubbleOpen ? '▼' : '▶'}</span>
                          </div>
                          {chatTheirBubbleOpen && <div style={{ padding: '0 16px 16px' }}>{renderGroupSlider('otherBubble', 'otherBubbleColor', `c-otherBubble`)}</div>}
                        </>)}
                        {key === 'text' && (<>
                          <div onClick={() => setChatMyTextOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600 }}>🟣 自分の文字色</span>
                            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{chatMyTextOpen ? '▼' : '▶'}</span>
                          </div>
                          {chatMyTextOpen && <div style={{ padding: '0 16px 16px' }}>{renderGroupSlider('myText', 'myTextColor', `c-myText`)}</div>}
                          <div onClick={() => setChatTheirTextOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600 }}>🔵 相手の文字色</span>
                            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{chatTheirTextOpen ? '▼' : '▶'}</span>
                          </div>
                          {chatTheirTextOpen && <div style={{ padding: '0 16px 16px' }}>{renderGroupSlider('otherText', 'otherTextColor', `c-otherText`)}</div>}
                        </>)}
                        {key === 'timelineCard' && (<>
                          <div style={{ padding: '0 14px 10px' }}>
                            <div style={{ background: groupRoomCustomize.timelineCardColor, borderRadius: 10, padding: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                              <span style={{ color: groupRoomCustomize.timelineCardTextColor, fontSize: 13 }}>タイムライン投稿カードのプレビューです</span>
                            </div>
                          </div>
                          <div onClick={() => setChatCardBgOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600 }}>📋 カード背景色</span>
                            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{chatCardBgOpen ? '▼' : '▶'}</span>
                          </div>
                          {chatCardBgOpen && <div style={{ padding: '0 16px 16px' }}>{renderGroupSlider('timelineCard', 'timelineCardColor', `c-timelineCard`)}</div>}
                          <div onClick={() => setChatCardTextOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600 }}>🔡 カード文字色</span>
                            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{chatCardTextOpen ? '▼' : '▶'}</span>
                          </div>
                          {chatCardTextOpen && <div style={{ padding: '0 16px 16px' }}>{renderGroupSlider('timelineCardText', 'timelineCardTextColor', `c-timelineCardText`)}</div>}
                        </>)}
                        <div style={{ padding: '10px 14px 12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                          <button onClick={() => handleGroupRoomSave(key)} style={{ width: '100%', padding: '10px 0', borderRadius: 8, background: groupRoomSavedFeedback === key ? '#059669' : '#7c3aed', border: 'none', color: 'white', fontSize: 14, cursor: 'pointer' }}>
                            {groupRoomSavedFeedback === key ? '保存しました ✓' : '保存する'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <button onClick={() => {
                  localStorage.removeItem(GROUP_ROOM_STORAGE_KEY)
                  const g = localStorage.getItem('chatCustomize')
                  if (g) setGroupRoomCustomize({ ...JSON.parse(g), roomThemeColor: '#7c3aed', timelineCardColor: '#1e1e3a', timelineCardTextColor: '#ffffff' })
                  setUseGroupGlobalSetting(true)
                }} style={{ width: '100%', padding: '12px 0', borderRadius: 10, marginTop: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', fontSize: 14, cursor: 'pointer' }}>
                  ⟳ グローバル設定に戻す
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Catchup modal ─────────────────────────────────────────────────────────────

function CatchupModal({ items, t, onClose, onMarkAction }: {
  items: CatchupItem[]
  t: { isNight: boolean; text: string; subText: string; accent: string; border: string }
  onClose: () => void
  onMarkAction?: () => void
}) {
  const [index, setIndex]                           = useState(0)
  const [replyText, setReplyText]                   = useState('')
  const [showCatchUpActionSheet, setShowCatchUpActionSheet] = useState(false)
  const catchUpFileInputRef                         = useRef<HTMLInputElement>(null)
  const isDone    = index >= items.length
  const current   = items[index] ?? null
  const remaining = items.length - index

  const goNext = () => { setReplyText(''); setIndex(i => i + 1) }

  return (
    <div style={{
      position: 'fixed', top: 0, bottom: 0,
      left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: '390px',
      zIndex: 10100,
      background: t.isNight ? '#0d0a1a' : '#e8e8e8',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>

      {/* ヘッダー */}
      <div style={{
        height: 52, flexShrink: 0,
        display: 'flex', alignItems: 'center', padding: '0 16px',
        background: t.isNight ? '#1a1530' : '#ffffff',
        borderBottom: `1px solid ${t.border}`,
      }}>
        <button onClick={onClose} style={{ color: t.accent, fontSize: '22px', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1, padding: '0 12px 0 0' }}>‹</button>
        <span style={{ flex: 1, textAlign: 'center', color: t.text, fontSize: '17px', fontWeight: 700 }}>
          {isDone ? 'Caught up!' : `${remaining} Left`}
        </span>
        <div style={{ width: 40 }} />
      </div>

      {/* メインコンテンツ */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '5% 5% 0' }}>
        {isDone ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '40px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', lineHeight: 1 }}>🎉</div>
            <p style={{ color: t.text, fontSize: '22px', fontWeight: 800, letterSpacing: '-0.3px' }}>You're all caught up!</p>
            <p style={{ color: t.subText, fontSize: '14px', lineHeight: 1.6 }}>すべてのメッセージを確認しました</p>
            <button onClick={onClose} style={{ marginTop: '8px', padding: '14px 40px', borderRadius: '28px', background: t.accent, color: '#fff', fontSize: '15px', fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: `0 4px 16px ${t.accent}55` }}>ルームに戻る</button>
          </div>
        ) : (
          <div style={{
            flex: 1,
            background: t.isNight ? '#1e1a2e' : '#ffffff',
            borderRadius: '16px 16px 0 0',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 -2px 16px rgba(0,0,0,0.15)',
          }}>
            {/* チャンネル名 + サブタイトル */}
            <div style={{ padding: '14px 16px 10px', borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
              <p style={{ color: t.text, fontSize: '15px', fontWeight: 700 }}>#{current.roomName}</p>
              <p style={{ color: t.accent, fontSize: '12px', marginTop: '2px' }}>New messages</p>
            </div>

            {/* メッセージスクロールエリア */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
              {/* コンテキスト（過去メッセージ） */}
              {current.context?.map((msg, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '8px', background: msg.senderColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {msg.sender[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'baseline', marginBottom: '3px' }}>
                      <span style={{ color: t.text, fontSize: '13px', fontWeight: 700 }}>{msg.sender}</span>
                      <span style={{ color: t.subText, fontSize: '11px' }}>{msg.time}</span>
                    </div>
                    <p style={{ color: t.isNight ? 'rgba(232,224,255,0.6)' : '#6b7280', fontSize: '14px', lineHeight: 1.55 }}>{msg.text}</p>
                  </div>
                </div>
              ))}

              {/* NEW ライン */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '8px 0 14px' }}>
                <div style={{ flex: 1, height: 1, background: '#ef4444' }} />
                <span style={{ color: '#ef4444', fontSize: '11px', fontWeight: 700 }}>NEW</span>
              </div>

              {/* メインメッセージ（未読） */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                <div style={{ width: 36, height: 36, borderRadius: '8px', background: current.senderColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {current.sender[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'baseline', marginBottom: '3px' }}>
                    <span style={{ color: t.text, fontSize: '13px', fontWeight: 700 }}>{current.sender}</span>
                    <span style={{ color: t.subText, fontSize: '11px' }}>{current.time}</span>
                  </div>
                  <p style={{ color: t.isNight ? '#e8e0ff' : '#111827', fontSize: '14px', lineHeight: 1.55 }}>{current.text}</p>
                </div>
              </div>
            </div>

            {/* 返信入力欄 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'white', borderTop: `1px solid ${t.border}`, flexShrink: 0, position: 'relative', zIndex: 10101, pointerEvents: 'auto', paddingBottom: 'env(safe-area-inset-bottom)' }}>
              <input ref={catchUpFileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={() => {}} />
              {replyText.length === 0 && (
                <button onClick={() => setShowCatchUpActionSheet(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0, display: 'flex', pointerEvents: 'auto' }}>
                  <PlusIcon />
                </button>
              )}
              <input
                type="text"
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onFocus={e => { const el = e.target; setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300) }}
                placeholder={`#${current.roomName} に返信する`}
                style={{ flex: 1, border: '1px solid rgba(0,0,0,0.12)', borderRadius: 20, padding: '8px 14px', fontSize: 14, outline: 'none', background: '#f5f5f5', color: '#111', minWidth: 0 }}
              />
              {replyText.length === 0 ? (
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0, display: 'flex', pointerEvents: 'auto' }}>
                  <MicIcon />
                </button>
              ) : (
                <button onClick={() => setReplyText('')} style={{ backgroundColor: '#7c3aed', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, pointerEvents: 'auto' }}>
                  <SendIcon />
                </button>
              )}
            </div>

            {/* CatchUp アクションシート */}
            {showCatchUpActionSheet && (
              <>
                <div onClick={() => setShowCatchUpActionSheet(false)} style={{ position: 'fixed', inset: 0, zIndex: 10200, background: 'rgba(0,0,0,0.4)' }} />
                <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 390, background: 'white', borderRadius: '20px 20px 0 0', paddingBottom: 32, zIndex: 10201 }}>
                  <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.15)', margin: '12px auto 8px' }} />
                  {[
                    { icon: <PhotoIcon />,    label: '写真・動画', sub: 'アルバムから選択',   action: () => { catchUpFileInputRef.current?.click(); setShowCatchUpActionSheet(false) } },
                    { icon: <CameraIcon />,   label: 'カメラ',     sub: '撮影して送信',       action: () => setShowCatchUpActionSheet(false) },
                    { icon: <LocationIcon />, label: '位置情報',   sub: '現在地を共有',       action: () => setShowCatchUpActionSheet(false) },
                    { icon: <FileIcon />,     label: 'ファイル',   sub: 'ドキュメントを送信', action: () => setShowCatchUpActionSheet(false) },
                    { icon: <StickerIcon />,  label: 'スタンプ',   sub: '近日公開',           action: () => setShowCatchUpActionSheet(false) },
                  ].map((item, i, arr) => (
                    <button key={item.label} onClick={item.action} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 24px', width: '100%', background: 'none', border: 'none', borderBottom: i < arr.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none', cursor: 'pointer', textAlign: 'left' }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(124,58,237,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {item.icon}
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>{item.label}</div>
                        <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)', marginTop: 1 }}>{item.sub}</div>
                      </div>
                    </button>
                  ))}
                  <button onClick={() => setShowCatchUpActionSheet(false)} style={{ margin: '8px 16px 0', width: 'calc(100% - 32px)', padding: '14px', borderRadius: 14, background: 'rgba(0,0,0,0.06)', border: 'none', fontSize: 15, color: '#111', cursor: 'pointer', fontWeight: 'bold', display: 'block' }}>
                    キャンセル
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* 下部ボタン */}
      {!isDone && (
        <div style={{
          flexShrink: 0, display: 'flex',
          background: t.isNight ? '#1e1a2e' : '#ffffff',
          borderTop: `1px solid ${t.border}`,
        }}>
          <button
            onClick={() => { goNext(); onMarkAction?.() }}
            style={{ flex: 1, padding: '16px', background: 'transparent', color: t.text, fontSize: '15px', fontWeight: 700, border: 'none', cursor: 'pointer' }}
          >Keep Unread</button>
          <button
            onClick={() => { goNext(); onMarkAction?.() }}
            style={{ flex: 2, padding: '16px', background: '#1a7f4b', color: '#ffffff', fontSize: '15px', fontWeight: 700, border: 'none', cursor: 'pointer' }}
          >Mark as Read</button>
        </div>
      )}
    </div>
  )
}

// ── Timeline post card ────────────────────────────────────────────────────────

type PostCardProps = {
  post: TimelinePost
  commentCount: number
  onComment: () => void
  onAvatarTap: () => void
  t: PT
}

function PostCard({ post, commentCount, onComment, onAvatarTap, t }: PostCardProps) {
  const [myReactions,  setMyReactions]  = useState<Set<string>>(new Set())
  const [allReactions, setAllReactions] = useState<string[]>([])
  const [showPicker,        setShowPicker]        = useState(false)
  const [pickerTab,         setPickerTab]         = useState<'myemoji' | 'all'>('myemoji')
  const [myEmojis,          setMyEmojis]          = useState<string[]>(['❤️', '👍', '🔥', '😭', '😊'])
  const [isEditingMyEmoji,  setIsEditingMyEmoji]  = useState(false)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const code  = post.id.charCodeAt(0)
    const count = code % 4
    const seeds: string[] = []
    for (let i = 0; i < count; i++) {
      seeds.push(ALL_EMOJIS[(code + i * 2) % ALL_EMOJIS.length])
    }
    setAllReactions(seeds)
  }, [post.id])

  const toggleReaction = (emoji: string) => {
    setMyReactions(prev => {
      const next = new Set(prev)
      if (next.has(emoji)) { next.delete(emoji) } else { next.add(emoji) }
      return next
    })
    setAllReactions(prev => prev.includes(emoji) ? prev : [...prev, emoji])
    setShowPicker(false)
  }

  const onPressStart = () => {
    pressTimer.current = setTimeout(() => setShowPicker(true), 500)
  }
  const onPressEnd = () => {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null }
  }

  return (
    <div style={{ padding: '14px 16px', borderBottom: `1px solid ${t.cardBorder}`, background: t.cardBg, borderLeft: post.isFriend ? `2px solid ${post.color}` : undefined }}>
      {/* Header */}
      <div className="flex items-center" style={{ gap: '8px' }}>
        <button onClick={onAvatarTap} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0 }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: post.color, fontSize: '11px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {post.user[0]}
          </div>
        </button>
        <span style={{ color: t.subText, fontSize: '12px', fontWeight: 500 }}>{post.user}</span>
        <span style={{ background: t.tagBg, color: t.tagText, fontSize: '10px', padding: '2px 8px', borderRadius: '10px', border: `1px solid ${t.tagBorder}`, flexShrink: 0 }}>{post.tag}</span>
        <span style={{ color: t.dimText, fontSize: '10px', marginLeft: 'auto', flexShrink: 0 }}>{post.time}</span>
      </div>

      {/* Text — long-press opens picker */}
      <p
        style={{ color: t.text, fontSize: '13px', lineHeight: '1.6', marginTop: '8px', wordBreak: 'break-word', userSelect: 'none' }}
        onMouseDown={onPressStart} onMouseUp={onPressEnd} onMouseLeave={onPressEnd}
        onTouchStart={onPressStart} onTouchEnd={onPressEnd} onTouchCancel={onPressEnd}
      >
        {post.text}
      </p>

      {/* Reaction chips */}
      {allReactions.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
          {allReactions.map(emoji => (
            <button
              key={emoji}
              onClick={() => toggleReaction(emoji)}
              style={{
                fontSize: '15px', lineHeight: 1.2,
                padding: '3px 8px', borderRadius: '12px', cursor: 'pointer',
                background: myReactions.has(emoji)
                  ? (t.isNight ? 'rgba(167,139,250,0.22)' : 'rgba(0,0,0,0.07)')
                  : 'transparent',
                border: `1px solid ${myReactions.has(emoji) ? t.accent + '66' : t.cardBorder}`,
                opacity: myReactions.has(emoji) ? 1 : 0.55,
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Action row */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '14px', marginTop: '8px', alignItems: 'center' }}>
        <button
          onClick={() => setShowPicker(p => !p)}
          style={{ fontSize: '14px', color: showPicker ? t.accent : t.dimText, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          😊
        </button>
        <button onClick={onComment} style={{ fontSize: '14px', lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          💬
        </button>
      </div>

      {/* Emoji picker */}
      {showPicker && (
        <div style={{
          marginTop: '8px', padding: '10px', borderRadius: '16px',
          background: t.isNight ? 'rgba(30,21,67,0.95)' : 'rgba(243,244,246,0.97)',
          borderTop: `1px solid ${t.border}`, borderBottom: `1px solid ${t.border}`,
          borderLeft: `1px solid ${t.border}`, borderRight: `1px solid ${t.border}`,
        }}>
          {/* タブ */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
            {(['myemoji', 'all'] as const).map(tb => (
              <button
                key={tb}
                onClick={() => setPickerTab(tb)}
                style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '10px', cursor: 'pointer',
                  background: pickerTab === tb ? t.accent : 'none',
                  color: pickerTab === tb ? '#fff' : t.subText,
                  border: 'none' }}
              >{tb === 'myemoji' ? 'My Emoji' : 'All'}</button>
            ))}
          </div>

          {pickerTab === 'myemoji' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {myEmojis.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => toggleReaction(emoji)}
                  style={{ fontSize: '20px', lineHeight: 1, padding: '4px 6px', borderRadius: '8px', cursor: 'pointer',
                    background: myReactions.has(emoji) ? (t.isNight ? 'rgba(167,139,250,0.25)' : 'rgba(0,0,0,0.08)') : 'none',
                    border: 'none' }}
                >{emoji}</button>
              ))}
              <button
                onClick={() => setIsEditingMyEmoji(true)}
                style={{ fontSize: '14px', lineHeight: 1, padding: '4px 6px', borderRadius: '8px', cursor: 'pointer',
                  background: 'none', border: 'none', color: t.subText }}
              >🖊️</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', maxHeight: '240px', overflowY: 'auto' }}>
              {ALL_EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => toggleReaction(emoji)}
                  style={{ fontSize: '20px', lineHeight: 1, padding: '4px', borderRadius: '8px', cursor: 'pointer',
                    background: myReactions.has(emoji) ? (t.isNight ? 'rgba(167,139,250,0.25)' : 'rgba(0,0,0,0.08)') : 'none',
                    border: 'none' }}
                >{emoji}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* My Emoji 編集モーダル */}
      {isEditingMyEmoji && createPortal(
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10001,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: '390px',
        }}>
          <div style={{
            width: '100%', background: t.isNight ? '#1e1535' : '#ffffff',
            borderRadius: '20px 20px 0 0', padding: '20px 16px 32px',
            maxHeight: '80dvh', display: 'flex', flexDirection: 'column', gap: '12px',
          }}>
            <p style={{ color: t.text, fontSize: '15px', fontWeight: 700, textAlign: 'center' }}>My Emoji を編集</p>

            <div>
              <p style={{ fontSize: '11px', color: t.subText, marginBottom: '6px' }}>現在（最大5個）</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {myEmojis.map(emoji => (
                  <div key={emoji} style={{ position: 'relative' }}>
                    <span style={{ fontSize: '24px' }}>{emoji}</span>
                    <button
                      onClick={() => setMyEmojis(prev => prev.filter(e => e !== emoji))}
                      style={{ position: 'absolute', top: -4, right: -4, width: '14px', height: '14px', borderRadius: '50%',
                        background: '#ef4444', color: '#fff', fontSize: '9px', fontWeight: 700,
                        border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        lineHeight: 1 }}
                    >×</button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              <p style={{ fontSize: '11px', color: t.subText, marginBottom: '6px' }}>追加する</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '2px' }}>
                {ALL_EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => {
                      if (myEmojis.includes(emoji) || myEmojis.length >= 5) return
                      setMyEmojis(prev => [...prev, emoji])
                    }}
                    style={{ fontSize: '22px', lineHeight: 1, padding: '5px', borderRadius: '8px', cursor: 'pointer',
                      background: myEmojis.includes(emoji) ? (t.isNight ? 'rgba(167,139,250,0.25)' : 'rgba(0,0,0,0.08)') : 'none',
                      border: 'none',
                      opacity: myEmojis.length >= 5 && !myEmojis.includes(emoji) ? 0.3 : 1 }}
                  >{emoji}</button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setIsEditingMyEmoji(false)}
              style={{ width: '100%', padding: '12px', borderRadius: '24px', background: t.accent, color: '#fff',
                fontSize: '15px', fontWeight: 700, border: 'none', cursor: 'pointer' }}
            >保存</button>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

// ── Friend timeline view ──────────────────────────────────────────────────────

function FriendTimelineView({ msgs, dot, t, onAvatarTap }: { msgs: Message[]; dot: string; t: PT; onAvatarTap: (name: string) => void }) {
  const visible = msgs.filter(m => m.sender !== 'ai')
  return (
    <div className="px-4 py-3 space-y-3">
      {visible.map(msg => <FriendTimelineCard key={msg.id} msg={msg} dot={dot} t={t} onAvatarTap={onAvatarTap} />)}
    </div>
  )
}

function FriendTimelineCard({ msg, dot, t, onAvatarTap }: { msg: Message; dot: string; t: PT; onAvatarTap: (name: string) => void }) {
  const [liked, setLiked] = useState(false)
  const [count, setCount] = useState(msg.likes ?? 0)
  const isMe = msg.sender === 'me'

  return (
    <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: '16px', padding: '12px 14px' }}>
      <div className="flex items-center gap-2 mb-2">
        <button onClick={() => { if (!isMe) onAvatarTap(msg.sender) }} style={{ background: 'none', border: 'none', padding: 0, cursor: isMe ? 'default' : 'pointer' }}>
          <Avatar label={isMe ? 'me' : msg.sender.charAt(0).toUpperCase()} color={isMe ? t.accent : (msg.color ?? dot)} />
        </button>
        <span style={{ color: isMe ? t.accent : (msg.color ?? t.subText), fontSize: '12px', fontWeight: 600 }}>{isMe ? 'あなた' : msg.sender}</span>
        <span style={{ color: t.dimText, fontSize: '10px', marginLeft: 'auto' }}>{msg.timestamp}</span>
      </div>
      <p style={{ color: t.text, fontSize: '13px', lineHeight: '1.6', wordBreak: 'break-word' }}>{msg.text}</p>
      <div className="flex items-center gap-1 mt-3">
        <button onClick={() => { setLiked(p => !p); setCount(p => p + (liked ? -1 : 1)) }}
          style={{ color: liked ? t.likeActive : t.dimText, fontSize: '14px', lineHeight: 1 }}>
          {liked ? '♥' : '♡'}
        </button>
        <span style={{ color: t.dimText, fontSize: '11px' }}>{count}</span>
      </div>
    </div>
  )
}

// ── Chat view ─────────────────────────────────────────────────────────────────

function ChatView({ msgs, aiTyping, bottomRef, t, onAvatarTap }: { msgs: Message[]; aiTyping: boolean; bottomRef: React.RefObject<HTMLDivElement | null>; t: PT; onAvatarTap: (name: string) => void }) {
  return (
    <div className="px-4 py-4 space-y-4">
      {msgs.map(msg => <Bubble key={msg.id} msg={msg} t={t} onAvatarTap={onAvatarTap} />)}
      {aiTyping && <TypingIndicator t={t} />}
      <div ref={bottomRef} />
    </div>
  )
}

function TypingIndicator({ t }: { t: PT }) {
  return (
    <div className="flex gap-2 items-start">
      <Avatar label="AI" color={t.accent} />
      <div style={{ background: t.bubbleAi, borderLeft: `2px solid ${t.bubbleAiBorder}`, borderRadius: '12px 12px 12px 2px', padding: '10px 14px' }}>
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <span key={i} style={{ display: 'inline-block', width: '5px', height: '5px', borderRadius: '50%', background: t.accent, animation: `bounce 1s ease-in-out ${i * 0.15}s infinite` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Bubble ────────────────────────────────────────────────────────────────────

function Bubble({ msg, t, onAvatarTap }: { msg: Message; t: PT; onAvatarTap: (name: string) => void }) {
  const isMe = msg.sender === 'me'
  const isAI = msg.sender === 'ai'

  if (isMe) return (
    <div className="flex justify-end">
      <div>
        <div style={{ background: t.bubbleMe, color: t.bubbleMeText, borderRadius: '12px 12px 2px 12px', padding: '8px 12px', fontSize: '13px', maxWidth: '220px', lineHeight: '1.5', wordBreak: 'break-word' }}>{msg.text}</div>
        <p style={{ color: t.dimText, fontSize: '10px', textAlign: 'right', marginTop: '2px' }}>{msg.timestamp}</p>
      </div>
    </div>
  )

  if (isAI) return (
    <div className="flex gap-2 items-start">
      <Avatar label="AI" color={t.accent} />
      <div>
        <div style={{ background: t.bubbleAi, borderLeft: `2px solid ${t.bubbleAiBorder}`, color: t.bubbleAiText, borderRadius: '12px 12px 12px 2px', padding: '8px 12px', fontSize: '13px', maxWidth: '220px', lineHeight: '1.5', fontStyle: 'italic', wordBreak: 'break-word' }}>{msg.text}</div>
        <p style={{ color: t.dimText, fontSize: '10px', marginTop: '2px' }}>{msg.timestamp}</p>
      </div>
    </div>
  )

  return (
    <div className="flex gap-2 items-start">
      <button onClick={() => onAvatarTap(msg.sender)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
        <Avatar label={msg.sender.charAt(0).toUpperCase()} color={msg.color ?? t.accent} />
      </button>
      <div>
        <p style={{ color: t.subText, fontSize: '10px', marginBottom: '2px' }}>{msg.sender}</p>
        <div style={{ background: t.bubbleOther, color: t.bubbleOtherText, borderRadius: '12px 12px 12px 2px', padding: '8px 12px', fontSize: '13px', maxWidth: '220px', lineHeight: '1.5', wordBreak: 'break-word' }}>{msg.text}</div>
        <p style={{ color: t.dimText, fontSize: '10px', marginTop: '2px' }}>{msg.timestamp}</p>
      </div>
    </div>
  )
}

function Avatar({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center justify-center flex-shrink-0"
      style={{ width: '24px', height: '24px', borderRadius: '50%', background: color, fontSize: '9px', fontWeight: 700, color: '#fff' }}>
      {label}
    </div>
  )
}

function DiceBearAvatar({ seed, size = 48, accentColor = '#a78bfa' }: { seed: string; size?: number; accentColor?: string }) {
  const [svgString, setSvgString] = useState('')
  useEffect(() => {
    setSvgString(createAvatar(adventurer, { seed, backgroundColor: ['b6e3f4'] }).toString().replace('<svg ', '<svg width="100%" '))
  }, [seed])
  return (
    <div
      style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: '#b6e3f4', border: `2px solid ${accentColor}44` }}
      dangerouslySetInnerHTML={{ __html: svgString }}
    />
  )
}

// ── Participants sub-page ─────────────────────────────────────────────────────

function ParticipantsSubPage({ isOpen, onClose, totalLabel, t, onViewUser }: {
  isOpen: boolean
  onClose: () => void
  totalLabel: string
  t: PT
  onViewUser: (name: string) => void
}) {
  const [search, setSearch] = useState('')
  const [tags, setTags] = useState<Record<string, string[]>>({})

  useEffect(() => {
    const result: Record<string, string[]> = {}
    for (const name of ALL_PARTICIPANT_NAMES) {
      const count = 2 + Math.floor(Math.random() * 2)
      const shuffled = [...ALL_PARTICIPANT_TAGS].sort(() => Math.random() - 0.5)
      result[name] = shuffled.slice(0, count)
    }
    setTags(result)
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return ALL_PARTICIPANT_NAMES
    return ALL_PARTICIPANT_NAMES.filter(name =>
      name.toLowerCase().includes(q) ||
      (tags[name] ?? []).some(tag => tag.toLowerCase().includes(q))
    )
  }, [search, tags])

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 60,
      background: t.bg,
      transform: `translateX(${isOpen ? '0%' : '100%'})`,
      transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 16px', background: t.headerBg, borderBottom: `1px solid ${t.border}`, gap: 8 }}>
        <button onClick={onClose} style={{ color: t.accent, fontSize: '14px', background: 'none', border: 'none', cursor: 'pointer', minWidth: 60, textAlign: 'left' }}>← 戻る</button>
        <span style={{ flex: 1, textAlign: 'center', color: t.text, fontSize: '14px', fontWeight: 600 }}>参加中 {totalLabel}人</span>
        <span style={{ minWidth: 60 }} />
      </div>
      {/* Search */}
      <div style={{ padding: '10px 16px', background: t.headerBg, borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="名前・タグで検索..."
          style={{ width: '100%', background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: '20px', padding: '7px 14px', fontSize: '13px', color: t.inputText, outline: 'none', boxSizing: 'border-box' }}
        />
      </div>
      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '80px' }}>
        {filtered.map(name => {
          const userTags   = tags[name] ?? []
          const commonTags = userTags.filter(tag => MY_IDENTITY_TAGS.includes(tag))
          return (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', borderBottom: `1px solid ${t.border}` }}>
              <DiceBearAvatar seed={name} size={40} accentColor={t.accent} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: t.text, fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>{name}</p>
                <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', scrollbarWidth: 'none' }}>
                  {commonTags.length > 0
                    ? commonTags.map(tag => (
                        <span key={tag} style={{ flexShrink: 0, fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: '#f3e8ff', color: '#7e22ce', border: '1px solid #d8b4fe', whiteSpace: 'nowrap' }}>{tag}</span>
                      ))
                    : <span style={{ fontSize: '10px', color: t.dimText }}>共通タグなし</span>
                  }
                </div>
              </div>
              <button
                onClick={() => onViewUser(name)}
                style={{ flexShrink: 0, fontSize: '12px', padding: '5px 12px', borderRadius: '14px', background: `${t.accent}18`, color: t.accent, border: `1px solid ${t.accent}44`, cursor: 'pointer' }}
              >見る</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function UserProfileSubPage({ user, onClose, t }: { user: ViewingUser; onClose: () => void; t: PT }) {
  const commonCount = user ? user.tags.filter(tag => MY_TAGS.includes(tag)).length : 0
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 65,
      background: t.bg,
      transform: `translateX(${user ? '0%' : '100%'})`,
      transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header bar */}
      <div style={{ height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 16px', background: t.headerBg, borderBottom: `1px solid ${t.border}`, gap: 8 }}>
        <button onClick={onClose} style={{ color: t.accent, fontSize: '14px', background: 'none', border: 'none', cursor: 'pointer', minWidth: 60, textAlign: 'left' }}>← 戻る</button>
        <span style={{ flex: 1 }} />
        <button style={{ fontSize: '12px', color: t.accent, border: `1px solid ${t.accent}55`, borderRadius: '14px', padding: '4px 12px', background: `${t.accent}11`, cursor: 'pointer', flexShrink: 0 }}>つながる</button>
      </div>
      {/* Scrollable content */}
      <div style={{ overflowY: 'auto', flex: 1, scrollbarWidth: 'none' }}>
        {/* Color header */}
        <div style={{ height: 100, background: user?.color ?? t.accent, flexShrink: 0 }} />
        {/* Avatar overlapping header */}
        <div style={{ position: 'relative', marginTop: -44, paddingLeft: 16, marginBottom: 10 }}>
          <DiceBearAvatar seed={user?.name ?? ''} size={80} accentColor="rgba(255,255,255,0.9)" />
        </div>
        {/* Profile info */}
        <div style={{ padding: '0 16px 24px' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: t.text, marginBottom: 2 }}>{user?.name ?? ''}</div>
          <div style={{ fontSize: 12, color: t.subText, marginBottom: 10 }}>@{user?.name ?? ''}_user</div>
          <div style={{ fontSize: 13, color: t.text, lineHeight: 1.6, marginBottom: 14 }}>{user?.bio ?? ''}</div>
          {/* Identity tags */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 16, paddingBottom: 2 }}>
            {(user?.tags ?? []).map(tag => (
              <span key={tag} style={{ flexShrink: 0, fontSize: 11, padding: '3px 10px', borderRadius: 12, background: t.tagBg, color: t.tagText, border: `1px solid ${t.tagBorder}`, whiteSpace: 'nowrap' }}>{tag}</span>
            ))}
          </div>
          {/* Divider */}
          <div style={{ height: 1, background: t.border, marginBottom: 14 }} />
          {/* MY MUSEUM */}
          <div style={{ fontSize: 10, fontWeight: 600, color: t.subText, marginBottom: 10, letterSpacing: '1.2px', textTransform: 'uppercase' }}>My Museum</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ aspectRatio: '3/4', width: '100%', borderRadius: 4, background: '#ffffff', border: '3px solid #c0c0c0', boxShadow: '0 2px 8px rgba(0,0,0,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DiceBearAvatar seed={`${user?.name ?? 'x'}-${i}`} size={36} accentColor="transparent" />
              </div>
            ))}
          </div>
          {/* Common tags */}
          {commonCount > 0 && (
            <>
              <div style={{ height: 1, background: t.border, marginBottom: 14 }} />
              <div style={{ fontSize: 13, color: t.accent, fontWeight: 600 }}>
                あなたと{commonCount}つの共通タグ
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
