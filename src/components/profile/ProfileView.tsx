'use client'

import { useWorldStore } from '@/store/useWorldStore'

const IDENTITY_TAGS = ['#内向型', '#夜型人間', '#HSP', '#コーヒー好き']

const AI_MESSAGE = '最近、穏やかな気持ちの日が多いですね。あなたの心は少しずつ部屋を広げているみたいです。'

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

export function ProfileView() {
  const posts = useWorldStore((s) => s.posts)

  return (
    <div
      className="h-full overflow-y-auto no-scrollbar"
      style={{ background: '#0a0812', fontFamily: 'system-ui, sans-serif' }}
    >
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-4 px-5 pt-6 pb-5"
        style={{ background: '#0d0a1a' }}
      >
        <div
          className="w-12 h-12 rounded-full flex-shrink-0"
          style={{ background: '#2a1f4a', border: '1px solid #534ab7' }}
        />
        <div>
          <p className="text-white font-medium" style={{ fontSize: '16px' }}>
            あなた
          </p>
          <p className="mt-0.5" style={{ color: '#666', fontSize: '12px' }}>
            今日も穏やかに
          </p>
        </div>
      </div>

      {/* ── Identity tags (horizontal scroll) ───────────────────────── */}
      <div className="overflow-x-auto no-scrollbar flex gap-2 px-5 py-4">
        {IDENTITY_TAGS.map((tag) => (
          <button
            key={tag}
            className="flex-shrink-0 rounded-full"
            style={{
              background: '#1e1535',
              border: '1px solid #534ab7',
              color: '#c4b5fd',
              borderRadius: '20px',
              padding: '4px 12px',
              fontSize: '11px',
            }}
          >
            {tag}
          </button>
        ))}
        <button
          className="flex-shrink-0 rounded-full"
          style={{
            background: '#0d0a1a',
            border: '1px solid #333',
            color: '#555',
            borderRadius: '20px',
            padding: '4px 12px',
            fontSize: '11px',
          }}
        >
          ＋ 追加
        </button>
      </div>

      <div className="px-4 pb-8 space-y-5">
        {/* ── Posts ───────────────────────────────────────────────────── */}
        <div>
          <h2
            className="mb-3 uppercase"
            style={{ color: '#444', fontSize: '11px', letterSpacing: '1px' }}
          >
            心のポスト
          </h2>

          {posts.length === 0 ? (
            <p className="text-center py-8" style={{ color: '#333', fontSize: '12px' }}>
              まだ投稿がありません
            </p>
          ) : (
            <div className="space-y-2">
              {[...posts].reverse().map((post) => {
                const time = formatTime(post.id)
                return (
                  <div
                    key={post.id}
                    className="rounded-md overflow-hidden"
                    style={{
                      background: '#0d0a1a',
                      borderLeft: `3px solid ${post.color}`,
                    }}
                  >
                    <div style={{ padding: '10px 14px' }}>
                      <p style={{ color: '#c4b5fd', fontSize: '13px', lineHeight: '1.5' }}>
                        {post.text}
                      </p>
                      {time && (
                        <p className="mt-1" style={{ color: '#444', fontSize: '10px' }}>
                          {time}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── AI message ──────────────────────────────────────────────── */}
        <div
          className="rounded-lg"
          style={{
            background: '#1e1535',
            border: '1px solid #534ab7',
            padding: '12px',
          }}
        >
          <p className="mb-1.5" style={{ color: '#a78bfa', fontSize: '10px' }}>
            ソウルメイトより
          </p>
          <p style={{ color: '#c4b5fd', fontSize: '12px', lineHeight: '1.6' }}>
            {AI_MESSAGE}
          </p>
        </div>
      </div>
    </div>
  )
}
