'use client'

import { useState, useEffect, useRef } from 'react'
import { useWorldStore } from '@/store/useWorldStore'
import { SHOP_AVATARS } from '@/constants/avatars'

type Message = {
  id: string
  role: 'ai' | 'user'
  text: string
}

const AI_REPLIES = [
  'そうなんだね。もう少し教えてくれる？',
  'なるほど、それは大変だったね。',
  '気持ちを話してくれてありがとう。',
  '一緒にいるから、安心してね。',
  'うんうん、わかるよ。',
  'そっか、それは嬉しいね！',
  '無理しないでね。',
  'それは素敵だね！',
]

type Props = { onClose: () => void }

export function AvatarChat({ onClose }: Props) {
  const selectedAvatarId = useWorldStore((s) => s.selectedAvatarId)
  const selectedAvatar   = SHOP_AVATARS.find((a) => a.id === selectedAvatarId)
  const avatarEmoji = selectedAvatar?.emoji ?? '✨'
  const avatarName  = selectedAvatar?.name  ?? 'ソウルメイト'

  const [messages, setMessages] = useState<Message[]>([
    { id: '0', role: 'ai', text: 'こんにちは！今日はどんな気分？' },
  ])
  const [input,    setInput]    = useState('')
  const [thinking, setThinking] = useState(false)
  const historyRef = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLInputElement>(null)

  // Scroll history to bottom when messages update
  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight
    }
  }, [messages, thinking])

  useEffect(() => {
    const id = setTimeout(() => inputRef.current?.focus(), 120)
    return () => clearTimeout(id)
  }, [])

  const handleSend = () => {
    const text = input.trim()
    if (!text || thinking) return
    setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'user', text }])
    setInput('')
    setThinking(true)
    setTimeout(() => {
      const reply = AI_REPLIES[Math.floor(Math.random() * AI_REPLIES.length)]
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: 'ai', text: reply }])
      setThinking(false)
    }, 900)
  }

  // Latest AI message → shown in main bubble
  const latestAiMsg = [...messages].reverse().find((m) => m.role === 'ai')
  // History = everything except the latest AI message
  const historyMsgs = messages.filter((m) => m.id !== latestAiMsg?.id)

  const bubbleKey = thinking ? 'thinking' : (latestAiMsg?.id ?? 'init')

  return (
    <>
      <style>{`
        @keyframes bubbleIn {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .avatar-bubble-anim {
          animation: bubbleIn 0.35s cubic-bezier(0.22,1,0.36,1) forwards;
        }
      `}</style>

      <div
        className="fixed inset-0 z-50 flex flex-col items-center"
        style={{ background: '#0d0d1a', fontFamily: 'system-ui, sans-serif' }}
      >
        <div className="w-full max-w-[390px] h-full flex flex-col relative">

          {/* ── Header ────────────────────────────────────────────────── */}
          <header
            className="flex items-center flex-shrink-0"
            style={{ height: '52px', padding: '0 16px' }}
          >
            <button
              onClick={onClose}
              className="flex items-center gap-1 transition-opacity active:opacity-60"
              style={{ color: '#a78bfa', fontSize: '15px', fontWeight: 500 }}
            >
              ← 戻る
            </button>
          </header>

          {/* ── Avatar + Main bubble ───────────────────────────────────── */}
          <div
            className="flex flex-col items-center flex-shrink-0"
            style={{ padding: '8px 24px 0' }}
          >
            {/* Avatar circle */}
            <div
              style={{
                width: '96px',
                height: '96px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #c4b5fd, #6d28d9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '46px',
                lineHeight: 1,
                boxShadow: '0 0 40px rgba(139,92,246,0.45), 0 0 80px rgba(139,92,246,0.18)',
                border: '2px solid rgba(167,139,250,0.35)',
              }}
            >
              {avatarEmoji}
            </div>

            {/* Avatar name */}
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', marginTop: '8px', letterSpacing: '1.5px' }}>
              {avatarName}
            </p>

            {/* Speech bubble */}
            <div style={{ width: '100%', marginTop: '18px', position: 'relative' }}>
              {/* Triangle notch pointing up toward avatar */}
              <div
                style={{
                  position: 'absolute',
                  top: '-9px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 0,
                  height: 0,
                  borderLeft: '10px solid transparent',
                  borderRight: '10px solid transparent',
                  borderBottom: '10px solid rgba(255,255,255,0.14)',
                }}
              />

              <div
                key={bubbleKey}
                className="avatar-bubble-anim"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255,255,255,0.16)',
                  borderRadius: '20px',
                  padding: '18px 20px',
                  minHeight: '64px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: thinking ? 'center' : 'flex-start',
                }}
              >
                {thinking ? (
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '22px', letterSpacing: '6px' }}>
                    ···
                  </span>
                ) : (
                  <p style={{ color: '#fff', fontSize: '15px', lineHeight: '1.7', margin: 0 }}>
                    {latestAiMsg?.text}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── History (past messages) ────────────────────────────────── */}
          <div
            ref={historyRef}
            className="flex-1 overflow-y-auto no-scrollbar"
            style={{
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              marginTop: '8px',
            }}
          >
            {historyMsgs.map((msg) =>
              msg.role === 'user' ? (
                <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <div
                    style={{
                      maxWidth: '78%',
                      padding: '9px 14px',
                      borderRadius: '14px 14px 4px 14px',
                      background: '#534ab7',
                      color: '#fff',
                      fontSize: '13px',
                      lineHeight: '1.55',
                      wordBreak: 'break-word',
                    }}
                  >
                    {msg.text}
                  </div>
                </div>
              ) : (
                <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div
                    style={{
                      maxWidth: '78%',
                      padding: '9px 14px',
                      borderRadius: '14px 14px 14px 4px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.5)',
                      fontSize: '13px',
                      lineHeight: '1.55',
                    }}
                  >
                    {msg.text}
                  </div>
                </div>
              )
            )}
          </div>

          {/* ── Input bar ─────────────────────────────────────────────── */}
          <div
            className="flex items-center gap-2 flex-shrink-0 mt-auto"
            style={{
              padding: '12px 16px 32px',
              background: 'rgba(0,0,0,0.35)',
              borderTop: '1px solid rgba(255,255,255,0.07)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }}
              placeholder="返事を入力..."
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '24px',
                padding: '11px 18px',
                fontSize: '14px',
                color: '#fff',
                outline: 'none',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(139,92,246,0.65)')}
              onBlur={(e)  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || thinking}
              className="flex items-center justify-center flex-shrink-0 transition-opacity disabled:opacity-30 active:scale-95"
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #7c5cbf, #534ab7)',
                color: '#fff',
                fontSize: '18px',
                boxShadow: '0 2px 12px rgba(83,74,183,0.45)',
              }}
            >
              ↑
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
