'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTagStore } from '@/store/useTagStore'

// ── Period & Theme ────────────────────────────────────────────────────────────

type Period = 'morning' | 'afternoon' | 'evening' | 'night'

function getPeriod(h: number): Period {
  if (h >= 18 || h < 5) return 'night'
  if (h < 11) return 'morning'
  if (h < 15) return 'afternoon'
  return 'evening'
}

type Theme = {
  bg: string; headerBg: string; border: string; accent: string
  text: string; subText: string; dimText: string
  cardBg: string; cardBorder: string
  tagBg: string; tagBorder: string; tagText: string
  bubbleOther: string; bubbleOtherText: string
  inputBg: string; inputBorder: string; inputText: string
  isNight: boolean
}

const THEME: Record<Period, Theme> = {
  morning: {
    bg: '#f0f9ff', headerBg: '#ffffff', border: '#f3f4f6',
    accent: '#0284c7', text: '#111827', subText: '#6b7280', dimText: '#9ca3af',
    cardBg: 'rgba(220, 240, 255, 0.45)', cardBorder: '#f3f4f6',
    tagBg: '#e0f2fe', tagBorder: '#7dd3fc', tagText: '#0284c7',
    bubbleOther: '#f8fafc', bubbleOtherText: '#1e293b',
    inputBg: '#f8fafc', inputBorder: '#bae6fd', inputText: '#111827',
    isNight: false,
  },
  afternoon: {
    bg: '#eff6ff', headerBg: '#ffffff', border: '#f3f4f6',
    accent: '#2563eb', text: '#111827', subText: '#6b7280', dimText: '#9ca3af',
    cardBg: 'rgba(240, 248, 255, 0.45)', cardBorder: '#f3f4f6',
    tagBg: '#dbeafe', tagBorder: '#93c5fd', tagText: '#2563eb',
    bubbleOther: '#f8fafc', bubbleOtherText: '#1e293b',
    inputBg: '#f8fafc', inputBorder: '#bfdbfe', inputText: '#111827',
    isNight: false,
  },
  evening: {
    bg: '#fff7ed', headerBg: '#ffffff', border: '#f3f4f6',
    accent: '#ea580c', text: '#111827', subText: '#6b7280', dimText: '#9ca3af',
    cardBg: 'rgba(255, 240, 220, 0.45)', cardBorder: '#f3f4f6',
    tagBg: '#ffedd5', tagBorder: '#fdba74', tagText: '#ea580c',
    bubbleOther: '#fff7ed', bubbleOtherText: '#1e293b',
    inputBg: '#fff7ed', inputBorder: '#fed7aa', inputText: '#111827',
    isNight: false,
  },
  night: {
    bg: '#07060f', headerBg: '#0d0a1a', border: '#1a1530',
    accent: '#a78bfa', text: '#e8e0ff', subText: '#888', dimText: '#444',
    cardBg: 'rgba(10, 8, 30, 0.60)', cardBorder: '#1a1530',
    tagBg: '#1e1535', tagBorder: '#2a1f4a', tagText: '#a78bfa',
    bubbleOther: '#1e1a2e', bubbleOtherText: '#c4b5fd',
    inputBg: '#1a1528', inputBorder: '#2a2040', inputText: '#e8e0ff',
    isNight: true,
  },
}

// ── Constants ─────────────────────────────────────────────────────────────────

const REACTION_EMOJIS = ['😂', '🥲', '👀', '🤝', '🌙', '✨'] as const

// ── Mock data ─────────────────────────────────────────────────────────────────

type MockRoom = { id: string; name: string; members: number; unread: number }

const MOCK_ROOMS_BY_TAG: Record<string, MockRoom[]> = {
  内向型: [
    { id: '1', name: '充電中',     members: 43,  unread: 3 },
    { id: '2', name: '読書',       members: 28,  unread: 0 },
    { id: '3', name: 'ひとり時間', members: 61,  unread: 0 },
  ],
  夜型人間: [
    { id: '4', name: '深夜作業',     members: 312, unread: 0 },
    { id: '5', name: '朝型羨ましい', members: 89,  unread: 0 },
    { id: '6', name: '夜型リズム',   members: 156, unread: 0 },
  ],
  HSP: [
    { id: '7', name: '音過敏',     members: 134, unread: 0 },
    { id: '8', name: '共感疲労',   members: 201, unread: 0 },
    { id: '9', name: '繊細な才能', members: 87,  unread: 0 },
  ],
  default: [
    { id: '10', name: 'メインルーム',       members: 20, unread: 0 },
    { id: '11', name: 'ゆるトーク',         members: 15, unread: 0 },
    { id: '12', name: 'はじめましての部屋', members: 8,  unread: 0 },
  ],
}

type MockMsg = { id: string; user: string; color: string; text: string; time: string }

const INITIAL_MESSAGES: MockMsg[] = [
  { id: '1', user: 'nox',   color: '#fbbf24', text: '深夜2時が一番頭が冴える。なんでこうなった。',     time: '1分前'  },
  { id: '2', user: 'luna',  color: '#fb923c', text: '朝8時の会議を設定した人間を恨んでいる',           time: '9分前'  },
  { id: '3', user: 'tsuki', color: '#a78bfa', text: '夜だけ本当の自分になれる気がする。静かだから。',   time: '22分前' },
  { id: '4', user: 'yomi',  color: '#6ee7b7', text: 'サマータイム導入とか地獄すぎる議論やめてほしい', time: '45分前' },
]

type CatchupItem = {
  id: string; roomName: string; sender: string; senderColor: string
  text: string; time: string
  context?: { sender: string; senderColor: string; text: string; time: string }[]
}

const MOCK_CATCHUP_ITEMS: CatchupItem[] = [
  {
    id: 'c1', roomName: '充電中', sender: 'tsuki', senderColor: '#a78bfa',
    text: 'ひとりの時間って本当に大事だよね。充電できた気がする', time: '3分前',
    context: [
      { sender: 'luna', senderColor: '#fb923c', text: '最近人と会いすぎてちょっと疲れた',        time: '15分前' },
      { sender: 'nox',  senderColor: '#6ee7b7', text: 'わかる。一人でいる時間がないとしんどい', time: '10分前' },
    ],
  },
  {
    id: 'c2', roomName: '充電中', sender: 'luna', senderColor: '#fb923c',
    text: '今日はカフェで一人作業してきた。最高だった', time: '8分前',
    context: [
      { sender: 'tsuki', senderColor: '#a78bfa', text: 'ひとりの時間って本当に大事だよね', time: '3分前' },
    ],
  },
  {
    id: 'c3', roomName: '充電中', sender: 'nox', senderColor: '#6ee7b7',
    text: '静かな場所で過ごすだけで回復する気がする', time: '20分前',
    context: [
      { sender: 'luna',  senderColor: '#fb923c', text: '今日はカフェで一人作業してきた',   time: '8分前'  },
      { sender: 'tsuki', senderColor: '#a78bfa', text: 'わかる、雑音がないだけで全然違う', time: '12分前' },
    ],
  },
]

const CATCHUP_TAGS = new Set(['内向型'])

type TimelinePost = {
  id: string; sender: string; senderColor: string; text: string; time: string; reactions: string[]
}

const MOCK_TIMELINE: Record<string, TimelinePost[]> = {
  内向型: [
    { id: 't1', sender: 'tsuki', senderColor: '#a78bfa', text: 'ひとり時間が一番好き。誰にも邪魔されない夜。',     time: '1分前',  reactions: ['😌'] },
    { id: 't2', sender: 'luna',  senderColor: '#fb923c', text: '朝8時の会議を設定した人間を恨んでいる',           time: '9分前',  reactions: ['👀', '🌙'] },
    { id: 't3', sender: 'nox',   senderColor: '#6ee7b7', text: '夜だけ本当の自分になれる気がする。静かだから。',   time: '22分前', reactions: ['😌'] },
    { id: 't4', sender: 'yomi',  senderColor: '#fbbf24', text: 'サマータイム導入とか地獄すぎる議論やめてほしい', time: '45分前', reactions: ['🌙'] },
  ],
  default: [
    { id: 't5', sender: 'mio',   senderColor: '#f472b6', text: 'やっと静かな時間。今日も頑張った。', time: '5分前',  reactions: ['😌'] },
    { id: 't6', sender: 'tsuki', senderColor: '#a78bfa', text: '深夜の読書が一番集中できる。',       time: '18分前', reactions: ['📚'] },
  ],
}

const MOCK_MEMBERS = [
  { name: 'tsuki', color: '#a78bfa' },
  { name: 'luna',  color: '#fb923c' },
  { name: 'nox',   color: '#6ee7b7' },
  { name: 'yomi',  color: '#fbbf24' },
  { name: 'mio',   color: '#f472b6' },
]

export function TagRoom({ tag, isOpen, onClose, onEnterRoom, isFollowed }: {
  tag: string
  isOpen: boolean
  onClose: () => void
  onEnterRoom?: (key: string) => void
  isFollowed?: boolean
}) {
  const mounted = useRef(false)
  const [period, setPeriod]           = useState<Period>('night')
  const [selectedRoom, setSelectedRoom] = useState<{ id: string; name: string } | null>(null)
  const [activeTab, setActiveTab]     = useState<'rooms' | 'timeline'>('rooms')
  const [chatInput, setChatInput]     = useState('')
  const [chatMessages, setChatMessages] = useState<MockMsg[]>(INITIAL_MESSAGES)
  const [leaveConfirm, setLeaveConfirm] = useState(false)
  const [membersOpen, setMembersOpen]   = useState(false)

  useEffect(() => {
    mounted.current = true
  }, [])

  useEffect(() => {
    setPeriod(getPeriod(new Date().getHours()))
  }, [])

  const { isFollowing, followTag, unfollowTag } = useTagStore()
  const following        = isFollowing(tag)
  const effectiveFollowed = isFollowed ?? following
  const t             = THEME[period]
  const rooms         = MOCK_ROOMS_BY_TAG[tag] ?? MOCK_ROOMS_BY_TAG['default']
  const timelinePosts = MOCK_TIMELINE[tag] ?? MOCK_TIMELINE['default']
  const totalMembers = rooms.reduce((sum, r) => sum + r.members, 0)
  const totalUnread  = rooms.reduce((sum, r) => sum + r.unread, 0)

  if (!mounted.current && !isOpen) return null

  const selectedMembers = selectedRoom?.id === 'all'
    ? totalMembers
    : rooms.find(r => r.id === selectedRoom?.id)?.members ?? 0

  const handleSend = () => {
    const text = chatInput.trim()
    if (!text) return
    setChatMessages(prev => [...prev, {
      id: Date.now().toString(),
      user: 'あなた',
      color: t.accent,
      text,
      time: 'たった今',
    }])
    setChatInput('')
  }

  const content = (
    <div
      className="fixed inset-0 z-[9999] transition-transform duration-300 ease-out"
      style={{ transform: isOpen ? 'translateX(0)' : 'translateX(100%)' }}
    >
      <div
        className="w-full max-w-[390px] mx-auto h-full overflow-y-auto pb-20"
        style={{ background: t.bg, fontFamily: 'system-ui, sans-serif' }}
      >
        {/* Header */}
        <header
          style={{
            height: '56px', flexShrink: 0,
            display: 'flex', alignItems: 'center', padding: '0 16px', gap: '12px',
            background: t.headerBg, borderBottom: `1px solid ${t.border}`,
          }}
        >
          <button
            onClick={onClose}
            style={{ color: t.accent, fontSize: '20px', lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer', paddingRight: '4px' }}
          >
            ←
          </button>
          <p style={{ flex: 1, textAlign: 'center', color: t.text, fontSize: '15px', fontWeight: 700 }}>
            #{tag}
          </p>
          {following ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <span style={{ color: t.subText, fontSize: '12px' }}>1.2k人参加中</span>
              <button
                onClick={() => { unfollowTag(tag); onClose(); }}
                style={{ color: t.subText, fontSize: '18px', lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
              >×</button>
            </div>
          ) : (
            <div style={{ width: '60px', flexShrink: 0 }} />
          )}
        </header>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '80px' }}>

          {/* Follow section */}
          {!following && (
            <div style={{ padding: '16px', borderBottom: `1px solid ${t.border}` }}>
              <button
                onClick={() => followTag(tag)}
                style={{ width: '100%', padding: '13px', borderRadius: '24px', background: t.accent, color: '#fff', fontSize: '15px', fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: `0 4px 14px ${t.accent}55` }}
              >
                フォローして参加する
              </button>
            </div>
          )}

          {/* Tab bar */}
          <div
            className="flex flex-shrink-0"
            style={{ height: '36px', background: t.headerBg, borderBottom: `1px solid ${t.border}` }}
          >
            {(['rooms', 'timeline'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-1 flex items-center justify-center"
                style={{
                  fontSize: '12px', fontWeight: activeTab === tab ? 600 : 400,
                  color: activeTab === tab ? t.accent : t.subText,
                  borderBottom: activeTab === tab ? `2px solid ${t.accent}` : '2px solid transparent',
                  background: 'none', cursor: 'pointer',
                  borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                }}
              >
                {tab === 'rooms' ? 'ルーム' : 'タイムライン'}
              </button>
            ))}
          </div>

          {/* タイムラインタブ */}
          {activeTab === 'timeline' ? (
            effectiveFollowed ? (
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {timelinePosts.map(post => (
                  <div key={post.id} style={{ padding: '14px 16px', borderBottom: `1px solid ${t.border}` }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: post.senderColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                        {post.sender[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ color: t.text, fontSize: '13px', fontWeight: 700 }}>{post.sender}</span>
                          <span style={{ color: t.subText, fontSize: '11px' }}>{post.time}</span>
                        </div>
                        <p style={{ color: t.isNight ? '#e8e0ff' : '#111827', fontSize: '14px', lineHeight: 1.6 }}>{post.text}</p>
                        <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                          {post.reactions.map((r, i) => (
                            <span key={i} style={{ fontSize: '16px', cursor: 'pointer' }}>{r}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '40px' }}>
                <span style={{ fontSize: '44px' }}>🔒</span>
                <button
                  onClick={() => followTag(tag)}
                  style={{ padding: '13px 36px', borderRadius: '24px', background: t.accent, color: '#fff', fontSize: '15px', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                >フォローして参加する</button>
                <p style={{ color: t.subText, fontSize: '12px', textAlign: 'center' }}>フォローするとタイムラインと投稿が解放されます</p>
              </div>
            )
          ) : (
            /* ルームタブ */
            <div>
              {/* Catch up カード */}
              {effectiveFollowed && CATCHUP_TAGS.has(tag) && (() => {
                const count = MOCK_CATCHUP_ITEMS.length
                return (
                  <div style={{ margin: '12px 16px', borderRadius: '12px', padding: '12px 14px', background: t.isNight ? 'rgba(167,139,250,0.08)' : 'rgba(59,130,246,0.05)', border: `1px solid ${t.isNight ? 'rgba(167,139,250,0.2)' : 'rgba(59,130,246,0.15)'}`, display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <span style={{ fontSize: '20px' }}>⚡</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ color: t.text, fontSize: '13px', fontWeight: 700, margin: 0 }}>Catch up</p>
                      <p style={{ color: t.subText, fontSize: '12px', margin: 0 }}>充電中 に {count} 件の未読</p>
                    </div>
                    <span style={{ color: t.accent, fontSize: '16px', fontWeight: 700 }}>›</span>
                  </div>
                )
              })()}

              {/* ALL card */}
              <div
                className="flex items-center gap-3"
                onClick={() => setSelectedRoom({ id: 'all', name: 'ALL' })}
                style={{ padding: '16px', background: t.tagBg, borderBottom: `2px solid ${t.tagBorder}`, cursor: 'pointer' }}
              >
                <span style={{ fontSize: '18px' }}>💬</span>
                <span style={{ flex: 1, color: t.text, fontSize: '15px', fontWeight: 600 }}>ALL</span>
                <span style={{ color: t.accent, fontSize: '12px' }}>{totalMembers.toLocaleString()}人</span>
              </div>

              {/* Sub-room rows */}
              {rooms.map(room => (
                <div
                  key={room.id}
                  onClick={() => setSelectedRoom({ id: room.id, name: room.name })}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '13px 16px',
                    borderBottom: `1px solid ${t.cardBorder}`,
                    cursor: 'pointer',
                    background: room.unread > 0
                      ? (t.isNight ? 'rgba(167,139,250,0.06)' : 'rgba(59,130,246,0.04)')
                      : 'transparent',
                  }}
                >
                  <span style={{ color: t.accent, fontSize: '16px', fontWeight: 700, flexShrink: 0 }}>#</span>
                  <span style={{
                    flex: 1, fontSize: '14px',
                    color: room.unread > 0 ? t.text : t.subText,
                    fontWeight: room.unread > 0 ? 700 : 400,
                  }}>{room.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span style={{ color: t.subText, fontSize: '11px' }}>{room.members.toLocaleString()}人</span>
                    {room.unread > 0 && (
                      <span style={{
                        minWidth: '20px', height: '20px', borderRadius: '10px',
                        background: t.accent, color: '#fff',
                        fontSize: '11px', fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '0 5px',
                      }}>{room.unread > 99 ? '99+' : room.unread}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  )

  return (
    <>
      {createPortal(content, document.body)}
      {createPortal(
        <div
          className="fixed inset-0 z-[10000] transition-transform duration-300 ease-out"
          style={{ transform: selectedRoom ? 'translateX(0)' : 'translateX(100%)' }}
        >
          <div
            className="flex flex-col w-full max-w-[390px] mx-auto"
            style={{ height: '100dvh', background: t.bg, fontFamily: 'system-ui, sans-serif' }}
          >
            {/* ヘッダー */}
            <header className="flex items-center gap-3 px-4 flex-shrink-0"
              style={{ height: '44px', background: t.headerBg, borderBottom: `1px solid ${t.border}` }}>
              <button
                onClick={() => setSelectedRoom(null)}
                style={{ color: t.accent, fontSize: '20px', lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer', paddingRight: '4px' }}
              >←</button>
              <div className="flex-1 min-w-0 text-center">
                <p style={{ color: t.text, fontSize: '14px', fontWeight: 600 }}>{selectedRoom?.name}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span style={{ color: t.subText, fontSize: '11px' }}>{selectedMembers.toLocaleString()}人</span>
              </div>
            </header>

            {/* メッセージ一覧 */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ overscrollBehavior: 'contain' }}>
              {chatMessages.map(msg => (
                <div key={msg.id} className="flex gap-2 items-start">
                  <div className="flex items-center justify-center flex-shrink-0"
                    style={{ width: '24px', height: '24px', borderRadius: '50%', background: msg.color, fontSize: '9px', fontWeight: 700, color: '#fff' }}>
                    {msg.user[0]}
                  </div>
                  <div>
                    <p style={{ color: t.subText, fontSize: '10px', marginBottom: '2px' }}>{msg.user}</p>
                    <div style={{ background: t.bubbleOther, color: t.bubbleOtherText, borderRadius: '12px 12px 12px 2px', padding: '8px 12px', fontSize: '13px', maxWidth: '220px', lineHeight: '1.5', wordBreak: 'break-word' }}>
                      {msg.text}
                    </div>
                    <p style={{ color: t.dimText, fontSize: '10px', marginTop: '2px' }}>{msg.time}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* 送信フォーム（フォロー済み時のみ） */}
            {effectiveFollowed && (
              <div className="flex-shrink-0 flex items-center gap-2 px-3"
                style={{ height: '56px', background: t.headerBg, borderTop: `1px solid ${t.border}` }}>
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSend() } }}
                  placeholder="メッセージを入力..."
                  style={{ flex: 1, background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: '20px', padding: '8px 14px', fontSize: '13px', color: t.inputText, outline: 'none' }}
                />
                <button
                  onClick={handleSend}
                  disabled={!chatInput.trim()}
                  className="flex items-center justify-center flex-shrink-0 transition-opacity disabled:opacity-35"
                  style={{ width: '36px', height: '36px', borderRadius: '50%', background: t.accent, color: '#fff', fontSize: '16px', border: 'none' }}
                >↑</button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
      {leaveConfirm && createPortal(
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 10200, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={() => setLeaveConfirm(false)}
        >
          <div
            style={{ width: '100%', maxWidth: '390px', background: t.isNight ? '#1a1530' : '#ffffff', borderRadius: '20px 20px 0 0', padding: '24px 20px 40px' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ width: 36, height: 4, borderRadius: 2, background: t.isNight ? 'rgba(255,255,255,0.2)' : '#e5e7eb', margin: '0 auto 20px' }} />
            <p style={{ color: t.text, fontSize: '17px', fontWeight: 700, textAlign: 'center', marginBottom: '6px' }}>
              #{tag} を退室しますか？
            </p>
            <p style={{ color: t.subText, fontSize: '13px', textAlign: 'center', marginBottom: '28px' }}>
              フォローが解除されルームから退出します
            </p>
            <button
              onClick={() => { unfollowTag(tag); setLeaveConfirm(false); onClose() }}
              style={{ width: '100%', padding: '14px', borderRadius: '14px', background: '#ef4444', color: '#fff', fontSize: '15px', fontWeight: 700, border: 'none', cursor: 'pointer', marginBottom: '10px' }}
            >退室してフォロー解除</button>
            <button
              onClick={() => setLeaveConfirm(false)}
              style={{ width: '100%', padding: '14px', borderRadius: '14px', background: t.isNight ? 'rgba(255,255,255,0.08)' : '#f3f4f6', color: t.text, fontSize: '15px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
            >キャンセル</button>
          </div>
        </div>,
        document.body
      )}

      {membersOpen && createPortal(
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 10200, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={() => setMembersOpen(false)}
        >
          <div
            style={{ width: '100%', maxWidth: '390px', background: t.isNight ? '#1a1530' : '#ffffff', borderRadius: '20px 20px 0 0', padding: '20px 20px 40px' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(128,128,128,0.3)', margin: '0 auto 16px' }} />
            <p style={{ color: t.text, fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>
              参加者 {totalMembers}人
            </p>
            {MOCK_MEMBERS.map((m, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: i < MOCK_MEMBERS.length - 1 ? `1px solid ${t.border}` : 'none' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: '#fff' }}>
                  {m.name[0].toUpperCase()}
                </div>
                <span style={{ color: t.text, fontSize: '14px', fontWeight: 600 }}>{m.name}</span>
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

// ── TagTimelineItem (unused — kept for reference) ────────────────────────────

function TagTimelineItem({ msg, t }: { msg: MockMsg; t: Theme }) {
  const [myReactions,  setMyReactions]  = useState<Set<string>>(new Set())
  const [allReactions, setAllReactions] = useState<string[]>([])
  const [showPicker,   setShowPicker]   = useState(false)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const code  = msg.id.charCodeAt(0)
    const count = code % 3
    const seeds: string[] = []
    for (let i = 0; i < count; i++) {
      seeds.push(REACTION_EMOJIS[(code + i * 2) % REACTION_EMOJIS.length])
    }
    setAllReactions(seeds)
  }, [msg.id])

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
    <div style={{ padding: '14px 16px', borderBottom: `1px solid ${t.cardBorder}`, background: t.cardBg, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
      <div className="flex items-center" style={{ gap: '8px' }}>
        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: msg.color, fontSize: '11px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {msg.user[0]}
        </div>
        <span style={{ color: t.subText, fontSize: '12px' }}>{msg.user}</span>
        <span style={{ color: t.dimText, fontSize: '10px', marginLeft: 'auto' }}>{msg.time}</span>
      </div>

      <p
        style={{ color: t.text, fontSize: '13px', lineHeight: '1.6', marginTop: '8px', wordBreak: 'break-word', userSelect: 'none' }}
        onMouseDown={onPressStart} onMouseUp={onPressEnd} onMouseLeave={onPressEnd}
        onTouchStart={onPressStart} onTouchEnd={onPressEnd} onTouchCancel={onPressEnd}
      >
        {msg.text}
      </p>

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

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
        <button
          onClick={() => setShowPicker(p => !p)}
          style={{ fontSize: '14px', color: showPicker ? t.accent : t.dimText, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          😊
        </button>
      </div>

      {showPicker && (
        <div style={{
          display: 'flex', gap: '6px', justifyContent: 'center',
          marginTop: '8px', padding: '8px 12px', borderRadius: '16px',
          background: t.isNight ? 'rgba(30,21,67,0.95)' : 'rgba(243,244,246,0.97)',
          border: `1px solid ${t.border}`,
        }}>
          {REACTION_EMOJIS.map(emoji => (
            <button
              key={emoji}
              onClick={() => toggleReaction(emoji)}
              style={{
                fontSize: '20px', lineHeight: 1, padding: '4px 6px', borderRadius: '8px', cursor: 'pointer',
                background: myReactions.has(emoji)
                  ? (t.isNight ? 'rgba(167,139,250,0.25)' : 'rgba(0,0,0,0.08)')
                  : 'none',
                border: 'none',
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
