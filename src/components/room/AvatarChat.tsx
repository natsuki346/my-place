'use client'
import { useState, useEffect, useRef } from 'react'

type Period = 'morning' | 'afternoon' | 'evening' | 'night'

type Message = {
  id: string
  sender: 'me' | 'them'
  text: string
  time: string
  imageUrl?: string
}

type Props = {
  partnerName: string
  partnerAvatarUrl?: string
  myAvatarUrl?: string
  initialMessages?: Message[]
  onSend?: (text: string, imageUrl?: string) => void
  period?: Period
}

const PERIOD_BG: Record<Period, { top: string; bottom: string }> = {
  morning:   { top: 'linear-gradient(180deg, #bae6fd 0%, #e0f2fe 100%)', bottom: 'linear-gradient(180deg, #e0f2fe 0%, #f0f9ff 100%)' },
  afternoon: { top: 'linear-gradient(180deg, #1e3a5f 0%, #2563eb 100%)', bottom: 'linear-gradient(180deg, #1e40af 0%, #1e3a5f 100%)' },
  evening:   { top: 'linear-gradient(180deg, #431407 0%, #9a3412 100%)', bottom: 'linear-gradient(180deg, #7c2d12 0%, #431407 100%)' },
  night:     { top: 'linear-gradient(180deg, #0f0a1e 0%, #1a1040 100%)', bottom: 'linear-gradient(180deg, #130a2e 0%, #0d0820 100%)' },
}

const BUBBLE_THEM: Record<Period, { bg: string; text: string; border: string }> = {
  morning:   { bg: 'rgba(255,255,255,0.95)', text: '#1e293b', border: 'rgba(0,0,0,0.08)' },
  afternoon: { bg: 'rgba(255,255,255,0.92)', text: '#1e293b', border: 'rgba(0,0,0,0.08)' },
  evening:   { bg: 'rgba(255,255,255,0.92)', text: '#1e293b', border: 'rgba(0,0,0,0.08)' },
  night:     { bg: 'rgba(255,255,255,0.12)', text: '#ffffff', border: 'rgba(255,255,255,0.2)' },
}

const BUBBLE_ME: Record<Period, { bg: string; text: string; border: string }> = {
  morning:   { bg: 'rgba(30,58,95,0.85)',    text: '#ffffff', border: 'rgba(30,58,95,0.3)' },
  afternoon: { bg: 'rgba(30,64,175,0.85)',   text: '#ffffff', border: 'rgba(30,64,175,0.3)' },
  evening:   { bg: 'rgba(124,45,18,0.85)',   text: '#ffffff', border: 'rgba(124,45,18,0.3)' },
  night:     { bg: 'rgba(109,40,217,0.55)',  text: '#ffffff', border: 'rgba(167,139,250,0.4)' },
}

export default function AvatarChat({
  partnerName,
  partnerAvatarUrl,
  myAvatarUrl,
  initialMessages = [],
  onSend,
  period = 'night',
}: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [lastSender, setLastSender] = useState<'me' | 'them' | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const bThem = BUBBLE_THEM[period]
  const bMe   = BUBBLE_ME[period]

  useEffect(() => {
    const lastMsg = messages[messages.length - 1]
    if (lastMsg?.sender === 'them') {
      setLastSender('them')
    }
  }, [messages])

  const sendMessage = () => {
    if (!input.trim()) return
    const msg: Message = {
      id: Date.now().toString(),
      sender: 'me',
      text: input.trim(),
      time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
    }
    setMessages(prev => [...prev, msg])
    setLastSender('me')
    onSend?.(msg.text)
    setInput('')
  }

  const latestThem = [...messages].filter(m => m.sender === 'them').slice(-1)[0]
  const latestMe   = [...messages].filter(m => m.sender === 'me').slice(-1)[0]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── 上半分: 相手 ── */}
      <div style={{
        flex: 1, position: 'relative',
        background: '#0f0a1e',
        overflow: 'hidden',
      }}>
        {/* アバター（下部中央に固定） */}
        <div style={{
          position: 'absolute', bottom: 0, left: '50%',
          transform: 'translateX(-50%)',
          width: '140px', height: '200px',
          zIndex: 1,
        }}>
          {partnerAvatarUrl
            ? <img src={partnerAvatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} alt={partnerName} />
            : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(180deg,#2d1f5e,#1a1040)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '64px' }}>👤</div>
          }
        </div>

        {/* 吹き出し（アバター頭上・中央） */}
        {lastSender === 'them' && latestThem && (
          <div style={{
            position: 'absolute',
            bottom: '195px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 2,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
            width: '85%',
          }}>
            <div style={{
              background: bThem.bg, border: `1px solid ${bThem.border}`,
              borderRadius: '14px', padding: latestThem.imageUrl ? '6px' : '9px 14px',
              backdropFilter: 'blur(12px)', maxWidth: '200px',
            }}>
              {latestThem.imageUrl
                ? <img src={latestThem.imageUrl} style={{ width: '120px', height: '90px', objectFit: 'cover', borderRadius: '10px', display: 'block' }} alt="送信画像" />
                : <p style={{ color: bThem.text, fontSize: '13px', margin: 0, lineHeight: 1.4 }}>{latestThem.text}</p>
              }
            </div>
            <div style={{
              width: 0, height: 0,
              borderLeft: '7px solid transparent',
              borderRight: '7px solid transparent',
              borderTop: `7px solid ${bThem.bg}`,
              marginTop: '-2px',
            }} />
          </div>
        )}

        {/* 名前（左下） */}
        <div style={{ position: 'absolute', bottom: '10px', left: '16px', zIndex: 2 }}>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', margin: 0, fontWeight: 600 }}>{partnerName}</p>
        </div>
      </div>

      {/* 区切りライン */}
      <div style={{ height: '2px', background: 'rgba(0,0,0,0.4)', flexShrink: 0 }} />

      {/* ── 下半分: 自分 ── */}
      <div style={{
        flex: 1, position: 'relative',
        background: '#130a2e',
        overflow: 'hidden',
      }}>
        {/* アバター（下部中央に固定） */}
        <div style={{
          position: 'absolute', bottom: 0, left: '50%',
          transform: 'translateX(-50%)',
          width: '140px', height: '200px',
          zIndex: 1,
        }}>
          {myAvatarUrl
            ? <img src={myAvatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} alt="あなた" />
            : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(180deg,#3b1f7e,#1a1040)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '64px' }}>👤</div>
          }
        </div>

        {/* 吹き出し（アバター頭上・中央） */}
        {lastSender === 'me' && latestMe && (
          <div style={{
            position: 'absolute',
            bottom: '195px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 2,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
            width: '85%',
          }}>
            <div style={{
              background: bMe.bg, border: `1px solid ${bMe.border}`,
              borderRadius: '14px', padding: latestMe.imageUrl ? '6px' : '9px 14px',
              backdropFilter: 'blur(12px)', maxWidth: '200px',
            }}>
              {latestMe.imageUrl
                ? <img src={latestMe.imageUrl} style={{ width: '120px', height: '90px', objectFit: 'cover', borderRadius: '10px', display: 'block' }} alt="送信画像" />
                : <p style={{ color: bMe.text, fontSize: '13px', margin: 0, lineHeight: 1.4 }}>{latestMe.text}</p>
              }
            </div>
            <div style={{
              width: 0, height: 0,
              borderLeft: '7px solid transparent',
              borderRight: '7px solid transparent',
              borderTop: `7px solid ${bMe.bg}`,
              marginTop: '-2px',
            }} />
          </div>
        )}

        {/* 名前（右下） */}
        <div style={{ position: 'absolute', bottom: '10px', right: '16px', zIndex: 2 }}>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', margin: 0, fontWeight: 600 }}>あなた</p>
        </div>
      </div>

      {/* ── 入力エリア ── */}
      <div style={{
        flexShrink: 0,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        padding: '10px 12px 16px',
        display: 'flex', alignItems: 'center', gap: '10px',
      }}>
        {/* 電話ボタン */}
        <button style={{
          width: '42px', height: '42px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
          color: 'white', fontSize: '18px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0,
        }}>📞</button>

        {/* 画像添付ボタン */}
        <button
          onClick={() => {
            const fileInput = document.createElement('input')
            fileInput.type = 'file'
            fileInput.accept = 'image/*'
            fileInput.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0]
              if (!file) return
              const reader = new FileReader()
              reader.onload = () => {
                const imageUrl = reader.result as string
                const msg: Message = {
                  id: Date.now().toString(),
                  sender: 'me',
                  text: '',
                  time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
                  imageUrl,
                }
                setMessages(prev => [...prev, msg])
                setLastSender('me')
                onSend?.('[画像]', imageUrl)
              }
              reader.readAsDataURL(file)
            }
            fileInput.click()
          }}
          style={{
            width: '42px', height: '42px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: 'white', fontSize: '18px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}
        >🖼️</button>

        {/* テキスト入力 */}
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
          placeholder="メッセージを入力..."
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '22px', padding: '11px 16px',
            color: 'white', fontSize: '14px', outline: 'none',
          }}
        />

        {/* マイクボタン */}
        <button style={{
          width: '42px', height: '42px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
          color: 'white', fontSize: '18px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0,
        }}>🎤</button>

        {/* 送信ボタン */}
        <button
          onClick={sendMessage}
          style={{
            width: '42px', height: '42px', borderRadius: '50%',
            background: input.trim() ? '#a78bfa' : 'rgba(255,255,255,0.08)',
            border: 'none', color: 'white', fontSize: '18px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0, transition: 'background 0.15s',
          }}
        >▶</button>
      </div>
    </div>
  )
}
