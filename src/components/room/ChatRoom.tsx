'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createAvatar } from '@dicebear/core'
import { adventurer } from '@dicebear/collection'

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

const MOCK_COMMENTS: CommentItem[] = [
  { id: '1', user: 'kaze', color: '#818cf8', text: 'わかりすぎる', time: '今' },
  { id: '2', user: 'suki', color: '#f472b6', text: '毎日そう思ってる', time: '1分前' },
]

// ── ChatRoom ──────────────────────────────────────────────────────────────────

type Props = { roomKey: string; onBack: () => void }
type ChatTab = 'timeline' | 'chat'

export function ChatRoom({ roomKey, onBack }: Props) {
  const meta       = ROOM_META[roomKey] ?? { label: roomKey, dot: '#a78bfa', members: '', type: 'my' as RoomType }
  const isIdentity = meta.type === 'identity'
  const hasTabs    = meta.type === 'friend'

  // Period + theme
  const [period, setPeriod] = useState<Period>('night')
  useEffect(() => {
    setPeriod(getPeriod(new Date().getHours()))
  }, [])
  const t = THEME[period]

  // ── Identity: subroom list state ─────────────────────────────────
  const [activeSubRoom, setActiveSubRoom]       = useState<SubRoom | null>(null)
  const [subRooms, setSubRooms]                 = useState<SubRoom[]>(DEFAULT_SUBROOMS[roomKey] ?? [])
  const [isCreating, setIsCreating]             = useState(false)
  const [newRoomName, setNewRoomName]           = useState('')
  const [activeListTab, setActiveListTab]       = useState<'rooms' | 'timeline'>('rooms')

  // ── Identity: timeline state ─────────────────────────────────────
  const [timelinePosts, setTimelinePosts]     = useState<TimelinePost[]>(TIMELINE_POSTS[roomKey] ?? [])
  const [timelineFilter, setTimelineFilter]   = useState<'all' | 'friend'>('all')
  const [likeMap, setLikeMap]                 = useState<Record<string, boolean>>({})
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

  // ── Chat state ───────────────────────────────────────────────────
  const [tab, setTab]           = useState<ChatTab>(hasTabs ? 'timeline' : 'chat')
  const [msgs, setMsgs]         = useState<Message[]>(MOCK_MESSAGES[roomKey] ?? [])
  const [input, setInput]       = useState('')
  const [aiTyping, setAiTyping] = useState(false)
  const bottomRef               = useRef<HTMLDivElement>(null)
  const incomingTimer           = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // ── Handlers ─────────────────────────────────────────────────────

  const send = () => {
    const text = input.trim()
    if (!text) return
    setMsgs(prev => [...prev, { id: Date.now().toString(), sender: 'me', text, timestamp: 'たった今' }])
    setInput('')
    const total = 3000 + Math.random() * 3000
    setTimeout(() => setAiTyping(true), Math.max(0, total - 1500))
    setTimeout(() => {
      const replies = AI_REPLIES[roomKey] ?? ['...']
      setAiTyping(false)
      setMsgs(prev => [...prev, { id: (Date.now() + 1).toString(), sender: 'ai', text: replies[Math.floor(Math.random() * replies.length)], timestamp: 'たった今' }])
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

  const toggleLike = (postId: string) => {
    setLikeMap(prev => ({ ...prev, [postId]: !prev[postId] }))
  }

  const openUserProfile = (name: string) => {
    const profile = dummyProfiles[name] ?? { bio: `${name}さん`, tags: [], color: '#a78bfa' }
    setViewingUser({ name, ...profile })
  }

  // ── Identity: subroom list view ──────────────────────────────────
  if (isIdentity && activeSubRoom === null) {
    const postTagOptions = subRooms.filter(s => s.id !== 'all').map(s => s.tag)
    const filteredPosts  = timelineFilter === 'all'
      ? timelinePosts
      : timelinePosts.filter(p => p.isFriend)

    return (
      <div
        className="flex flex-col"
        style={{ height: '100dvh', background: t.bg, fontFamily: 'system-ui, sans-serif', maxWidth: '390px', margin: '0 auto', position: 'relative' }}
      >
        {/* Header */}
        <header
          className="flex items-center gap-3 px-4 flex-shrink-0"
          style={{ height: '56px', background: t.headerBg, borderBottom: `1px solid ${t.border}` }}
        >
          <button onClick={onBack} style={{ color: t.accent, fontSize: '20px', lineHeight: 1, paddingRight: '4px' }}>←</button>
          <p className="flex-1 min-w-0 text-center" style={{ color: t.text, fontSize: '14px', fontWeight: 600 }}>{meta.label}</p>
          <button
            onClick={() => setIsParticipantsOpen(true)}
            className="flex items-center gap-1.5 flex-shrink-0"
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            <span style={{ color: meta.dot, fontSize: '10px', animation: 'blink 1.4s ease-in-out infinite' }}>●</span>
            <span style={{ color: t.subText, fontSize: '11px', textDecoration: 'underline', textDecorationColor: `${t.subText}55` }}>{meta.members}人がいる</span>
          </button>
        </header>

        {/* ルーム / タイムライン tabs */}
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>
          {activeListTab === 'rooms' ? (
            <>
              {/* Sub-rooms */}
              {subRooms.map(sub =>
                sub.id === 'all' ? (
                  <button key={sub.id} onClick={() => setActiveSubRoom(sub)} className="w-full flex items-center gap-3 text-left"
                    style={{ padding: '16px', background: t.tagBg, borderBottom: `2px solid ${t.tagBorder}` }}>
                    <span style={{ fontSize: '18px' }}>💬</span>
                    <span style={{ flex: 1, color: t.text, fontSize: '15px', fontWeight: 600 }}>ALL</span>
                    <span style={{ color: t.accent, fontSize: '12px' }}>{sub.memberCount.toLocaleString()}人</span>
                  </button>
                ) : (
                  <button key={sub.id} onClick={() => setActiveSubRoom(sub)} className="w-full flex items-center gap-3 text-left"
                    style={{ padding: '14px 16px', borderBottom: `1px solid ${t.cardBorder}` }}>
                    <span style={{ color: t.accent, fontSize: '16px', fontWeight: 700 }}>#</span>
                    <span style={{ flex: 1, color: t.text, fontSize: '14px' }}>
                      {sub.tag.startsWith('#') ? sub.tag.slice(1) : sub.tag}
                      {sub.isNew && <span style={{ marginLeft: '6px', color: t.accent, fontSize: '10px' }}>NEW</span>}
                    </span>
                    <span style={{ color: t.subText, fontSize: '11px' }}>{sub.memberCount.toLocaleString()}人</span>
                  </button>
                )
              )}
            </>
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
                  liked={likeMap[post.id] ?? false}
                  likeCount={(post.likes ?? 0) + (likeMap[post.id] ? 1 : 0)}
                  onToggleLike={() => toggleLike(post.id)}
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
        {activeListTab === 'rooms' && (
          <button onClick={() => setIsCreating(true)} className="flex items-center justify-center"
            style={{ position: 'absolute', bottom: '80px', right: '16px', width: '52px', height: '52px', borderRadius: '50%', background: t.accent, color: '#fff', fontSize: '22px', boxShadow: `0 4px 14px ${t.accent}66`, zIndex: 10 }}>
            💬
          </button>
        )}
        {activeListTab === 'timeline' && (
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
              <input value={newRoomName} onChange={e => setNewRoomName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleCreateRoom() }} placeholder="ルーム名を入力" autoFocus
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
            <textarea value={newPostText} onChange={e => setNewPostText(e.target.value)} rows={3} placeholder="今どんな気持ち？"
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
            <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '390px', height: '60dvh', background: t.headerBg, borderTop: `2px solid ${t.border}`, borderRadius: '16px 16px 0 0', zIndex: 201, display: 'flex', flexDirection: 'column' }}>
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
      </div>
    )
  }

  // ── Chat view (friend / my / identity subroom) ───────────────────
  const showBottom = isIdentity || tab === 'chat'

  return (
    <div
      className="flex flex-col"
      style={{ height: '100dvh', background: t.bg, fontFamily: 'system-ui, sans-serif', maxWidth: '390px', margin: '0 auto', position: 'relative' }}
    >
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
          </div>
        </header>
      )}

      {/* Friend tabs */}
      {hasTabs && (
        <div className="flex flex-shrink-0"
          style={{ height: '36px', background: t.headerBg, borderBottom: `1px solid ${t.border}` }}>
          {(['timeline', 'chat'] as ChatTab[]).map(tb => (
            <button key={tb} onClick={() => setTab(tb)} className="flex-1 flex items-center justify-center"
              style={{
                fontSize: '12px',
                color: tab === tb ? t.tabActive : t.tabInactive,
                borderBottom: tab === tb ? `2px solid ${t.tabBorder}` : '2px solid transparent',
                fontWeight: tab === tb ? 600 : 400,
                transition: 'color 0.15s',
              }}>
              {tb === 'timeline' ? 'タイムライン' : 'チャット'}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>
        {tab === 'timeline'
          ? <FriendTimelineView msgs={msgs} dot={meta.dot} t={t} onAvatarTap={openUserProfile} />
          : <ChatView msgs={msgs} aiTyping={aiTyping} bottomRef={bottomRef} t={t} onAvatarTap={openUserProfile} />
        }
      </div>

      {/* Bottom: input */}
      {showBottom && (
        <div className="flex-shrink-0 flex items-center gap-2 px-3"
          style={{ height: '56px', background: t.headerBg, borderTop: `1px solid ${t.border}` }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKeyDown}
            placeholder="メッセージを入力..."
            style={{ flex: 1, background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: '20px', padding: '8px 14px', fontSize: '13px', color: t.inputText, outline: 'none' }} />
          <button onClick={send} disabled={!input.trim()} className="flex items-center justify-center flex-shrink-0 transition-opacity disabled:opacity-35"
            style={{ width: '36px', height: '36px', borderRadius: '50%', background: t.accent, color: '#fff', fontSize: '16px' }}>
            ↑
          </button>
        </div>
      )}

      {/* Profile sub-page overlay */}
      <UserProfileSubPage user={viewingUser} onClose={() => setViewingUser(null)} t={t} />
    </div>
  )
}

// ── Timeline post card ────────────────────────────────────────────────────────

type PostCardProps = {
  post: TimelinePost
  liked: boolean
  likeCount: number
  onToggleLike: () => void
  commentCount: number
  onComment: () => void
  onAvatarTap: () => void
  t: PT
}

function PostCard({ post, liked, likeCount, onToggleLike, commentCount, onComment, onAvatarTap, t }: PostCardProps) {
  return (
    <div style={{ padding: '14px 16px', borderBottom: `1px solid ${t.cardBorder}`, background: t.cardBg, borderLeft: post.isFriend ? `2px solid ${post.color}` : undefined }}>
      <div className="flex items-center" style={{ gap: '8px' }}>
        <button onClick={onAvatarTap} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0 }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: post.color, fontSize: '11px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {post.user[0]}
          </div>
        </button>
        <span style={{ color: t.subText, fontSize: '12px' }}>{post.user}</span>
        <span style={{ background: t.tagBg, color: t.tagText, fontSize: '10px', padding: '2px 8px', borderRadius: '10px', border: `1px solid ${t.tagBorder}`, flexShrink: 0 }}>{post.tag}</span>
        <span style={{ color: t.dimText, fontSize: '10px', marginLeft: 'auto', flexShrink: 0 }}>{post.time}</span>
      </div>
      <p style={{ color: t.text, fontSize: '13px', lineHeight: '1.6', marginTop: '8px', wordBreak: 'break-word' }}>{post.text}</p>
      <div className="flex" style={{ justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
        <button onClick={onToggleLike} className="flex items-center gap-1">
          <span style={{ fontSize: '13px' }}>{liked ? '❤️' : '🤍'}</span>
          <span style={{ color: liked ? t.likeActive : t.dimText, fontSize: '12px' }}>{likeCount}</span>
        </button>
        <button onClick={onComment} className="flex items-center gap-1">
          <span style={{ fontSize: '13px' }}>💬</span>
          <span style={{ color: t.dimText, fontSize: '12px' }}>{commentCount}</span>
        </button>
      </div>
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
    <div style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: '12px', padding: '12px 14px' }}>
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
