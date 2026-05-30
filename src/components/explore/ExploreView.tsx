'use client'

import { useState, useEffect } from 'react'
import { useTagStore } from '@/store/useTagStore'
import { TagRoom } from '@/components/TagRoom'

// ── Period ────────────────────────────────────────────────────────────────────

type Period = 'morning' | 'afternoon' | 'evening' | 'night'

function getPeriod(h: number): Period {
  if (h >= 18 || h < 5) return 'night'
  if (h < 11) return 'morning'
  if (h < 15) return 'afternoon'
  return 'evening'
}

// ── Theme ─────────────────────────────────────────────────────────────────────

type Theme = {
  dot: string; bg: string; text: string; sub: string; card: string; dimText: string
  border: string; tabActive: string; tabBorder: string; tabInactive: string
}

const MAP_THEME: Record<Period, Theme> = {
  morning:   { dot: '#0ea5e9', bg: '#eff6ff', text: '#1e40af', sub: '#6b7280', card: 'rgba(255,255,255,0.75)', dimText: '#9ca3af', border: '#f3f4f6', tabActive: '#0284c7', tabBorder: '#0ea5e9', tabInactive: '#9ca3af' },
  afternoon: { dot: '#3b82f6', bg: '#dbeafe', text: '#1d4ed8', sub: '#6b7280', card: 'rgba(255,255,255,0.75)', dimText: '#9ca3af', border: '#f3f4f6', tabActive: '#2563eb', tabBorder: '#3b82f6', tabInactive: '#9ca3af' },
  evening:   { dot: '#f97316', bg: '#fff7ed', text: '#c2410c', sub: '#9ca3af', card: 'rgba(255,255,255,0.75)', dimText: '#d1d5db', border: '#f3f4f6', tabActive: '#ea580c', tabBorder: '#f97316', tabInactive: '#9ca3af' },
  night:     { dot: '#818cf8', bg: '#0f0a2e', text: '#c7d2fe', sub: '#94a3b8', card: 'rgba(255,255,255,0.06)', dimText: '#4b5563', border: '#1a1530', tabActive: '#a78bfa', tabBorder: '#7f77dd', tabInactive: '#444'    },
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const RELATED_TAGS: Record<string, { tag: string; count: number }[]> = {
  夜型人間: [
    { tag: '深夜作業',      count: 892  },
    { tag: '夜食',          count: 654  },
    { tag: '朝型になりたい', count: 431  },
  ],
  内向型: [
    { tag: 'HSP',      count: 1200 },
    { tag: 'ひとり時間', count: 980  },
    { tag: '読書垢',    count: 760  },
  ],
  猫好き: [
    { tag: '猫のいる生活', count: 543  },
    { tag: 'ねこ部',      count: 1100 },
    { tag: '保護猫',      count: 320  },
  ],
}

const ALL_TAGS = [
  { tag: '夜型人間',      count: 1200 },
  { tag: '夜食',          count: 654  },
  { tag: '深夜作業',      count: 892  },
  { tag: '夜景好き',      count: 234  },
  { tag: '朝型になりたい', count: 431  },
  { tag: '内向型',        count: 1900 },
  { tag: 'HSP',           count: 3200 },
  { tag: 'ひとり時間',    count: 980  },
  { tag: '読書垢',        count: 1700 },
  { tag: 'コーヒー好き',  count: 2100 },
  { tag: '猫好き',        count: 1200 },
  { tag: '猫のいる生活',  count: 543  },
  { tag: 'ねこ部',        count: 1100 },
  { tag: '音楽好き',      count: 1400 },
  { tag: '保護猫',        count: 320  },
]

const MOCK_USERS = [
  { name: 'ゆき',   tags: ['#夜型人間', '#HSP'],          commonTags: ['#夜型人間'] },
  { name: 'あおい', tags: ['#夜型人間', '#内向型'],        commonTags: ['#夜型人間', '#内向型'] },
  { name: 'れん',   tags: ['#コーヒー好き', '#夜型人間'], commonTags: ['#夜型人間'] },
]

const MOCK_FRIENDS = [
  { name: 'Ryo',  tags: ['#内向型', '#読書垢'],    commonTags: ['#内向型'] },
  { name: 'Hana', tags: ['#猫好き', '#夜型人間'],  commonTags: ['#猫好き'] },
]

const MOCK_HISTORY = [
  { tag: '夜型人間', count: 1200 },
  { tag: 'HSP',      count: 3200 },
  { tag: '内向型',   count: 1900 },
]

function fmtCount(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k人` : `${n}人`
}

// ── Main component ────────────────────────────────────────────────────────────

type Props = { onEnterRoom?: (key: string) => void }
type InitTab   = 'recommend' | 'history'
type SearchTab = 'tags' | 'users' | 'friends'

export function ExploreView({ onEnterRoom }: Props) {
  const [period,      setPeriod]      = useState<Period>('night')
  const [query,       setQuery]       = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [activeTab,   setActiveTab]   = useState<InitTab>('recommend')
  const [searchTab,   setSearchTab]   = useState<SearchTab>('tags')

  const { followingTags, isFollowing } = useTagStore()

  useEffect(() => {
    setPeriod(getPeriod(new Date().getHours()))
    const id = setInterval(() => setPeriod(getPeriod(new Date().getHours())), 60_000)
    return () => clearInterval(id)
  }, [])

  const t = MAP_THEME[period]
  const q = query.trim().toLowerCase()

  // Recommended tags: deduplicated related tags from followed tags
  const recommendedTags = (() => {
    const seen = new Set<string>()
    const result: { tag: string; count: number }[] = []
    for (const followed of followingTags) {
      for (const related of RELATED_TAGS[followed] ?? []) {
        if (!seen.has(related.tag)) {
          seen.add(related.tag)
          result.push(related)
        }
      }
    }
    return result
  })()

  // Search results
  const matchedTags = q ? ALL_TAGS.filter(item => item.tag.toLowerCase().includes(q)) : []

  const scoreUser = (u: { name: string; tags: string[]; commonTags: string[] }) => {
    let s = 0
    if (u.name.toLowerCase().includes(q)) s += 10
    if (u.commonTags.some(tag => tag.toLowerCase().includes(q))) s += 5
    if (u.tags.some(tag => tag.toLowerCase().includes(q))) s += 2
    return s
  }

  const matchedUsers = q
    ? MOCK_USERS.filter(u => scoreUser(u) > 0).sort((a, b) => scoreUser(b) - scoreUser(a))
    : MOCK_USERS

  const matchedFriends = q
    ? MOCK_FRIENDS.filter(u => scoreUser(u) > 0).sort((a, b) => scoreUser(b) - scoreUser(a))
    : MOCK_FRIENDS

  return (
    <>
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ background: t.bg, fontFamily: 'system-ui, sans-serif' }}
    >
      {/* ── Search bar ──────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3">
        <div
          className="flex items-center gap-2"
          style={{ background: 'rgba(0,0,0,0.07)', borderRadius: '24px', padding: '10px 16px' }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke={t.text} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ユーザー名や #タグ で検索"
            className="flex-1 bg-transparent outline-none"
            style={{ fontSize: '14px', color: t.text }}
          />
          {query.length > 0 && (
            <button
              onClick={() => setQuery('')}
              className="border-0"
              style={{ color: t.sub, fontSize: '18px', lineHeight: 1, background: 'none', cursor: 'pointer', padding: 0 }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {q === '' ? (
          /* ── Initial state: tabs ──────────────────────────────────── */
          <>
            {/* Tab bar */}
            <div
              className="flex flex-shrink-0 border-b bg-transparent"
              style={{ borderBottomColor: t.border }}
            >
              {(['recommend', 'history'] as InitTab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="flex-1 flex items-center justify-center border-0 border-b-2"
                  style={{
                    height: '38px', fontSize: '13px', fontWeight: activeTab === tab ? 600 : 400,
                    color: activeTab === tab ? t.tabActive : t.tabInactive,
                    borderBottomColor: activeTab === tab ? t.tabBorder : 'transparent',
                    background: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {tab === 'recommend' ? '気になる？' : '履歴'}
                </button>
              ))}
            </div>

            {activeTab === 'recommend' ? (
              recommendedTags.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center h-full"
                  style={{ paddingBottom: '80px', gap: '12px' }}
                >
                  <span style={{ fontSize: '52px', lineHeight: 1 }}>🔍</span>
                  <p style={{ fontSize: '17px', fontWeight: 700, color: t.text, marginTop: '4px' }}>
                    誰かを探してみよう
                  </p>
                  <p style={{ fontSize: '13px', color: t.sub, textAlign: 'center', lineHeight: 1.6 }}>
                    ユーザー名や #タグ で検索できます
                  </p>
                </div>
              ) : (
                <div>
                  {recommendedTags.map((item) => (
                    <TagRow
                      key={item.tag}
                      tag={item.tag}
                      count={item.count}
                      t={t}
                      onClick={() => setSelectedTag(item.tag)}
                    />
                  ))}
                </div>
              )
            ) : (
              /* ── 履歴タブ ─────────────────────────────────────────── */
              <div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 16px 4px' }}>
                  <button className="border-0" style={{ fontSize: '12px', color: t.sub, background: 'none', cursor: 'pointer', padding: 0 }}>
                    履歴を消去
                  </button>
                </div>
                {MOCK_HISTORY.map((item) => (
                  <TagRow
                    key={item.tag}
                    tag={item.tag}
                    count={item.count}
                    t={t}
                    onClick={() => setSelectedTag(item.tag)}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          /* ── Search results: 3-tab ────────────────────────────────── */
          <>
            {/* Search tab bar */}
            <div
              className="flex flex-shrink-0 border-b"
              style={{ borderBottomColor: t.border }}
            >
              {(['tags', 'users', 'friends'] as SearchTab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setSearchTab(tab)}
                  className="flex-1 flex items-center justify-center border-0 border-b-2"
                  style={{
                    height: '38px', fontSize: '13px', fontWeight: searchTab === tab ? 600 : 400,
                    color: searchTab === tab ? t.tabActive : t.tabInactive,
                    borderBottomColor: searchTab === tab ? t.tabBorder : 'transparent',
                    background: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {tab === 'tags' ? 'タグ' : tab === 'users' ? 'ユーザー' : 'フレンド'}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {searchTab === 'tags' && (
              matchedTags.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center"
                  style={{ paddingTop: '60px', paddingBottom: '80px', gap: '10px' }}
                >
                  <span style={{ fontSize: '40px', lineHeight: 1 }}>😶</span>
                  <p style={{ fontSize: '15px', fontWeight: 600, color: t.text, marginTop: '4px' }}>
                    見つかりませんでした
                  </p>
                  <p style={{ fontSize: '12px', color: t.sub }}>
                    別のキーワードで試してみてください
                  </p>
                </div>
              ) : (
                <div>
                  {matchedTags.map((item) => (
                    <TagRow
                      key={item.tag}
                      tag={item.tag}
                      count={item.count}
                      t={t}
                      onClick={() => setSelectedTag(item.tag)}
                    />
                  ))}
                </div>
              )
            )}

            {searchTab === 'users' && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {matchedUsers.map((user) => (
                  <UserCard key={user.name} user={user} t={t} />
                ))}
              </div>
            )}

            {searchTab === 'friends' && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {matchedFriends.map((friend) => (
                  <UserCard key={friend.name} user={friend} t={t} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
    <TagRoom
      tag={selectedTag ?? ''}
      isOpen={selectedTag !== null}
      onClose={() => setSelectedTag(null)}
      onEnterRoom={onEnterRoom}
      isFollowed={isFollowing(selectedTag ?? '')}
    />
    </>
  )
}

// ── Tag row ───────────────────────────────────────────────────────────────────

function TagRow({ tag, count, t, onClick }: {
  tag: string
  count: number
  t: Theme
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', width: '100%',
        padding: '14px 16px', background: 'none',
        borderBottom: `1px solid ${t.border}`,
        cursor: 'pointer', textAlign: 'left',
      }}
    >
      <span style={{ flex: 1, fontSize: '15px', fontWeight: 500, color: t.text }}>
        #{tag}
      </span>
      <span style={{ fontSize: '13px', color: t.sub, marginRight: '8px' }}>
        {fmtCount(count)}
      </span>
      <span style={{ fontSize: '16px', color: t.sub, lineHeight: 1 }}>›</span>
    </button>
  )
}

// ── User card ─────────────────────────────────────────────────────────────────

function UserCard({ user, t }: {
  user: { name: string; tags: string[]; commonTags: string[] }
  t: Theme
}) {
  return (
    <div
      className="border-b"
      style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '12px 16px', borderBottomColor: t.border,
      }}
    >
      <div
        style={{
          width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0,
          background: 'rgba(0,0,0,0.10)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px', fontWeight: 700, color: t.text,
        }}
      >
        {user.name.slice(0, 1)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '14px', fontWeight: 600, color: t.text }}>{user.name}</p>
        {user.commonTags.length > 0 && (() => {
          const visible = user.commonTags.slice(0, 10)
          const hidden  = user.commonTags.length - visible.length
          return (
            <p style={{ fontSize: '11px', marginTop: '3px' }}>
              <span style={{ color: t.sub }}>共通 </span>
              <span style={{ color: t.tabActive }}>
                {visible.join('  ')}{hidden > 0 ? `  +${hidden}` : ''}
              </span>
            </p>
          )
        })()}
      </div>
    </div>
  )
}
