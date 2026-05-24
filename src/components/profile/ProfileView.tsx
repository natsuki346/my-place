'use client'

import { useWorldStore } from '@/store/useWorldStore'
import type { ThemeColors } from '@/components/room/RoomCanvas'
import { SHOP_AVATARS } from '@/constants/avatars'

const IDENTITY_TAGS = ['#内向型', '#夜型人間', '#HSP', '#コーヒー好き']

const AI_MESSAGE = '最近、穏やかな気持ちの日が多いですね。'

function formatTime(id: string): string {
  const n = Number(id)
  if (isNaN(n) || n < 1_000_000_000_000) return ''
  const diff = Date.now() - n
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'たった今'
  if (min < 60) return `${min}分前`
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return `${hrs}時間前`
  return `${Math.floor(hrs / 24)}日前`
}

interface Props {
  theme: ThemeColors
}

export function ProfileView({ theme }: Props) {
  const posts              = useWorldStore((s) => s.posts)
  const selectedAvatarId   = useWorldStore((s) => s.selectedAvatarId)
  const setSelectedAvatarId = useWorldStore((s) => s.setSelectedAvatarId)

  return (
    <div
      className="h-full overflow-y-auto no-scrollbar"
      style={{
        background: `linear-gradient(to bottom, ${theme.bg1}, ${theme.bg2})`,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* ── Avatar area ─────────────────────────────────────────────── */}
      <div
        className="flex flex-col items-center"
        style={{ padding: '24px 16px 16px' }}
      >
        <div
          className="rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            width: '64px',
            height: '64px',
            background: theme.accent + '33',
            border: `2px solid ${theme.accent}`,
          }}
        >
          <span style={{ color: theme.accent, fontSize: '24px' }}>あ</span>
        </div>
        <p style={{ color: '#333', fontSize: '18px', fontWeight: 600, marginTop: '8px' }}>
          あなた
        </p>
        <p style={{ color: '#888', fontSize: '12px', marginTop: '4px' }}>
          今日も穏やかに
        </p>
        <button
          style={{
            border: `1px solid ${theme.accent}`,
            color: theme.accent,
            fontSize: '11px',
            padding: '4px 16px',
            borderRadius: '20px',
            marginTop: '8px',
            background: 'transparent',
          }}
        >
          編集
        </button>
      </div>

      {/* ── Identity tags ───────────────────────────────────────────── */}
      <div style={{ padding: '0 16px 16px' }}>
        <p style={{ color: '#aaa', fontSize: '10px', letterSpacing: '1px', marginBottom: '8px' }}>
          アイデンティティ
        </p>
        <div
          className="no-scrollbar"
          style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}
        >
          {IDENTITY_TAGS.map((tag) => (
            <button
              key={tag}
              style={{
                background: theme.accent + '22',
                border: `1px solid ${theme.accent}66`,
                color: theme.accent,
                borderRadius: '20px',
                padding: '4px 12px',
                fontSize: '11px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {tag}
            </button>
          ))}
          <button
            style={{
              background: 'transparent',
              border: `1px solid ${theme.accent}66`,
              color: theme.accent,
              borderRadius: '20px',
              padding: '4px 12px',
              fontSize: '11px',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            ＋
          </button>
        </div>
      </div>

      {/* ── Avatar shop ─────────────────────────────────────────────── */}
      <div style={{ padding: '0 16px 16px' }}>
        <p style={{ color: '#aaa', fontSize: '10px', letterSpacing: '1px', marginBottom: '8px' }}>
          アバターショップ
        </p>
        <div className="grid grid-cols-3 gap-2">
          {SHOP_AVATARS.map((av) => {
            const active = selectedAvatarId === av.id
            return (
              <button
                key={av.id}
                onClick={() => setSelectedAvatarId(active ? null : av.id)}
                className="flex flex-col items-center transition-transform active:scale-95"
                style={{
                  background: active ? theme.accent + '22' : 'rgba(0,0,0,0.06)',
                  border: active ? `2px solid ${theme.accent}` : '2px solid transparent',
                  borderRadius: '14px',
                  padding: '12px 6px',
                }}
              >
                <span style={{ fontSize: '30px', lineHeight: 1 }}>{av.emoji}</span>
                <span style={{ color: '#444', fontSize: '11px', marginTop: '5px' }}>{av.name}</span>
                <span style={{ color: '#d97706', fontSize: '10px', marginTop: '2px' }}>
                  🪙 {av.coins}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Posts ───────────────────────────────────────────────────── */}
      <div style={{ padding: '0 16px' }}>
        <p style={{ color: '#aaa', fontSize: '10px', letterSpacing: '1px', marginBottom: '8px' }}>
          心のポスト
        </p>

        {posts.length === 0 ? (
          <p className="text-center py-8" style={{ color: '#888', fontSize: '12px' }}>
            まだ投稿がありません
          </p>
        ) : (
          <div>
            {[...posts].reverse().map((post) => {
              const time = formatTime(post.id)
              return (
                <div
                  key={post.id}
                  style={{
                    background: 'rgba(255,255,255,0.6)',
                    borderLeft: `3px solid ${post.color}`,
                    borderRadius: '0 8px 8px 0',
                    padding: '10px 14px',
                    marginBottom: '8px',
                  }}
                >
                  <p style={{ color: '#333', fontSize: '13px', lineHeight: '1.5' }}>
                    {post.text}
                  </p>
                  {time && (
                    <p style={{ color: '#aaa', fontSize: '10px', marginTop: '4px' }}>
                      {time}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── AI message ──────────────────────────────────────────────── */}
      <div style={{ padding: '16px' }}>
        <div
          style={{
            background: 'rgba(255,255,255,0.5)',
            border: `1px solid ${theme.accent}44`,
            borderRadius: '12px',
            padding: '12px',
          }}
        >
          <p style={{ color: theme.accent, fontSize: '10px', marginBottom: '6px' }}>
            ソウルメイトより
          </p>
          <p style={{ color: '#555', fontSize: '13px', lineHeight: '1.6' }}>
            {AI_MESSAGE}
          </p>
        </div>
      </div>
    </div>
  )
}
