'use client'
import { useState, useEffect, useRef } from 'react'

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
const PhoneIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <path d="M6 4h5l2 5-2.5 2.5c1.5 3 4 5.5 7 7L20 16l5 2v5c0 1.1-.9 2-2 2C9 25 3 19 3 6c0-1.1.9-2 2-2z" stroke="#7c3aed" strokeWidth="1.8" strokeLinejoin="round"/>
  </svg>
)
const VideoIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <rect x="2" y="7" width="17" height="14" rx="2.5" stroke="#7c3aed" strokeWidth="1.8"/>
    <path d="M19 11l7-4v14l-7-4V11z" stroke="#7c3aed" strokeWidth="1.8" strokeLinejoin="round"/>
  </svg>
)

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
  chatBg?: string
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
  chatBg,
}: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'general' | 'custom'>('general')
  const [showActionSheet, setShowActionSheet] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [showCallUI, setShowCallUI] = useState(false)
  const [callType, setCallType] = useState<'audio' | 'video'>('audio')
  const [callStatus, setCallStatus] = useState<'calling' | 'connected' | 'ended'>('calling')
  const [callSeconds, setCallSeconds] = useState(0)
  const [lastSender, setLastSender] = useState<'me' | 'them' | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── ルーム専用カスタマイズ ─────────────────────────────────────
  const ROOM_STORAGE_KEY = `roomCustomize_${partnerName}`
  const [roomCustomize, setRoomCustomize] = useState(() => {
    try {
      const roomSaved = localStorage.getItem(ROOM_STORAGE_KEY)
      if (roomSaved) return JSON.parse(roomSaved)
      const globalSaved = localStorage.getItem('chatCustomize')
      if (globalSaved) return JSON.parse(globalSaved)
    } catch {}
    return { bgColor: '#0f0f1a', myBubbleColor: '#7c3aed', otherBubbleColor: '#1e1e3a', myTextColor: '#ffffff', otherTextColor: '#ffffff' }
  })
  const [useGlobalSetting, setUseGlobalSetting] = useState(() => {
    try { return !localStorage.getItem(ROOM_STORAGE_KEY) } catch { return true }
  })
  const [roomHue, setRoomHue] = useState({ bg: 240, myBubble: 270, otherBubble: 220, myText: 0, otherText: 0 })
  const [roomLightness, setRoomLightness] = useState({ bg: 10, myBubble: 50, otherBubble: 15, myText: 100, otherText: 100 })
  const [roomPaletteOpen, setRoomPaletteOpen] = useState<string | null>(null)
  const [roomOpenSub, setRoomOpenSub] = useState<'bg' | 'bubble' | 'text' | null>(null)
  const [roomSavedFeedback, setRoomSavedFeedback] = useState<string | null>(null)

  const handleRoomSave = (section: string) => {
    try {
      localStorage.setItem(ROOM_STORAGE_KEY, JSON.stringify(roomCustomize))
      setUseGlobalSetting(false)
      setRoomSavedFeedback(section)
      setTimeout(() => setRoomSavedFeedback(null), 1500)
    } catch (e) { console.error(e) }
  }

  const ROOM_THEME_COLORS = [
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
  const ROOM_STD_COLORS = ['#c00000','#ff0000','#ffc000','#ffff00','#92d050','#00b050','#00b0f0','#0070c0','#002060','#7030a0']

  type RoomColorKey = 'bg' | 'myBubble' | 'otherBubble' | 'myText' | 'otherText'
  const roomColorPropMap: Record<RoomColorKey, keyof typeof roomCustomize> = {
    bg: 'bgColor', myBubble: 'myBubbleColor', otherBubble: 'otherBubbleColor', myText: 'myTextColor', otherText: 'otherTextColor',
  }
  const applyRoomColor = (key: RoomColorKey, color: string) => {
    setRoomCustomize((p: typeof roomCustomize) => ({ ...p, [roomColorPropMap[key]]: color }))
  }
  const handleRoomHue = (key: RoomColorKey, val: number) => {
    setRoomHue(p => ({ ...p, [key]: val }))
    applyRoomColor(key, `hsl(${val}, 70%, ${roomLightness[key]}%)`)
  }
  const handleRoomLightness = (key: RoomColorKey, val: number) => {
    setRoomLightness(p => ({ ...p, [key]: val }))
    applyRoomColor(key, `hsl(${roomHue[key]}, 70%, ${val}%)`)
  }

  const renderRoomSlider = (colorKey: RoomColorKey, currentColor: string, paletteId: string) => {
    const h = roomHue[colorKey]; const l = roomLightness[colorKey]
    return (
      <div style={{ marginBottom: 10 }} key={paletteId}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: currentColor, flexShrink: 0, border: '2px solid rgba(255,255,255,0.6)', boxShadow: '0 0 0 1px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.1)' }} />
          <input className="hue-slider" type="range" min={0} max={360} value={h}
            onChange={e => handleRoomHue(colorKey, Number(e.target.value))}
            onInput={e => handleRoomHue(colorKey, Number((e.target as HTMLInputElement).value))}
            style={{ flex: 1, pointerEvents: 'auto' }} />
          <button onClick={() => setRoomPaletteOpen(p => p === paletteId ? null : paletteId)} style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: roomPaletteOpen === paletteId ? '#7c3aed' : 'rgba(255,255,255,0.1)', cursor: 'pointer', fontSize: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🎨</button>
        </div>
        <input type="range" min={10} max={90} value={l} className="hue-slider"
          style={{ width: '100%', marginBottom: 8, pointerEvents: 'auto', background: `linear-gradient(to right, hsl(${h},70%,10%), hsl(${h},70%,50%), hsl(${h},70%,90%))` }}
          onChange={e => handleRoomLightness(colorKey, Number(e.target.value))}
          onInput={e => handleRoomLightness(colorKey, Number((e.target as HTMLInputElement).value))}
        />
        {roomPaletteOpen === paletteId && (
          <>
            <div onClick={() => setRoomPaletteOpen(null)} style={{ position: 'fixed', inset: 0, zIndex: 0 }} />
            <div style={{ background: 'rgba(20,20,40,0.97)', borderRadius: 12, padding: 10, marginBottom: 8, position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginBottom: 8 }}>
                {ROOM_THEME_COLORS.flat().map((c, i) => (
                  <button key={i} onClick={() => applyRoomColor(colorKey, c)} style={{ width: 22, height: 16, borderRadius: 2, background: c, border: currentColor === c ? '2px solid white' : '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', padding: 0 }} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {ROOM_STD_COLORS.map((c, i) => <button key={i} onClick={() => applyRoomColor(colorKey, c)} style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: currentColor === c ? '2px solid white' : '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', padding: 0 }} />)}
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInput(val)
    setIsTyping(val.length > 0)
  }

  const handleMicPressStart = () => {
    setIsRecording(true)
    setRecordingSeconds(0)
    recordingTimerRef.current = setInterval(() => setRecordingSeconds(p => p + 1), 1000)
  }

  const handleMicPressEnd = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
    setIsRecording(false)
    if (recordingSeconds > 0) {
      const msg: Message = {
        id: Date.now().toString(), sender: 'me',
        text: `🎤 ボイスメッセージ (${recordingSeconds}秒)`,
        time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages(prev => [...prev, msg])
      setLastSender('me')
      onSend?.(msg.text)
    }
    setRecordingSeconds(0)
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
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

  const bThem = BUBBLE_THEM[period]
  const bMe   = BUBBLE_ME[period]

  useEffect(() => {
    const lastMsg = messages[messages.length - 1]
    if (lastMsg?.sender === 'them') {
      setLastSender('them')
    }
  }, [messages])

  useEffect(() => {
    if (showCallUI && callStatus === 'calling') {
      const t = setTimeout(() => {
        setCallStatus('connected')
        callTimerRef.current = setInterval(() => setCallSeconds(p => p + 1), 1000)
      }, 3000)
      return () => clearTimeout(t)
    }
  }, [showCallUI, callStatus])

  useEffect(() => {
    return () => { if (callTimerRef.current) clearInterval(callTimerRef.current) }
  }, [])

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
    setIsTyping(false)
  }

  const latestThem = [...messages].filter(m => m.sender === 'them').slice(-1)[0]
  const latestMe   = [...messages].filter(m => m.sender === 'me').slice(-1)[0]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <style>{`
        .hue-slider { -webkit-appearance:none; appearance:none; width:100%; height:12px; border-radius:6px; outline:none; cursor:pointer; background:linear-gradient(to right,hsl(0,80%,55%),hsl(45,80%,55%),hsl(90,80%,55%),hsl(135,80%,55%),hsl(180,80%,55%),hsl(225,80%,55%),hsl(270,80%,55%),hsl(315,80%,55%),hsl(360,80%,55%)); }
        .hue-slider::-webkit-slider-thumb { -webkit-appearance:none; width:22px; height:22px; border-radius:50%; background:white; border:3px solid rgba(0,0,0,0.4); box-shadow:0 2px 6px rgba(0,0,0,0.4); cursor:pointer; }
        .hue-slider::-moz-range-thumb { width:22px; height:22px; border-radius:50%; background:white; border:3px solid rgba(0,0,0,0.4); box-shadow:0 2px 6px rgba(0,0,0,0.4); cursor:pointer; }
      `}</style>

      {/* ── 上半分: 相手 ── */}
      <div style={{
        flex: 1, position: 'relative',
        background: chatBg ?? '#0f0a1e',
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
        background: chatBg ?? '#130a2e',
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'white', borderTop: '1px solid rgba(0,0,0,0.08)', flexShrink: 0, paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageSelect} />
        {isRecording ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: '#fef2f2', borderRadius: 20 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626' }} />
            <span style={{ color: '#dc2626', fontSize: 14 }}>録音中... {recordingSeconds}秒</span>
          </div>
        ) : (
          <>
            {!isTyping && (
              <button onClick={() => setShowActionSheet(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0, display: 'flex' }}>
                <PlusIcon />
              </button>
            )}
            <input ref={inputRef} type="text" value={input} onChange={handleInputChange}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              onFocus={e => { const el = e.target; setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300) }}
              placeholder="メッセージを送る..."
              style={{ flex: 1, border: '1px solid rgba(0,0,0,0.12)', borderRadius: 20, padding: '8px 14px', fontSize: 14, outline: 'none', background: '#f5f5f5', color: '#111', minWidth: 0 }}
            />
            {!isTyping ? (
              <button onMouseDown={handleMicPressStart} onMouseUp={handleMicPressEnd} onTouchStart={handleMicPressStart} onTouchEnd={handleMicPressEnd} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0, display: 'flex' }}>
                <MicIcon recording={isRecording} />
              </button>
            ) : (
              <button onClick={sendMessage} style={{ backgroundColor: '#7c3aed', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                <SendIcon />
              </button>
            )}
          </>
        )}
      </div>

      {/* アクションシート */}
      {showActionSheet && (
        <>
          <div onClick={() => setShowActionSheet(false)} style={{ position: 'fixed', inset: 0, zIndex: 10, background: 'rgba(0,0,0,0.4)' }} />
          <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 390, background: 'white', borderRadius: '20px 20px 0 0', paddingBottom: 32, zIndex: 11 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.15)', margin: '12px auto 8px' }} />
            {[
              { icon: <PhotoIcon />,    label: '写真・動画', sub: 'アルバムから選択',   action: () => { fileInputRef.current?.click(); setShowActionSheet(false) } },
              { icon: <CameraIcon />,   label: 'カメラ',     sub: '撮影して送信',       action: () => setShowActionSheet(false) },
              { icon: <LocationIcon />, label: '位置情報',   sub: '現在地を共有',       action: () => setShowActionSheet(false) },
              { icon: <FileIcon />,     label: 'ファイル',   sub: 'ドキュメントを送信', action: () => setShowActionSheet(false) },
              { icon: <PhoneIcon />,    label: '音声通話',   sub: '通話を開始する',     action: () => { setCallType('audio'); setShowCallUI(true); setCallStatus('calling'); setCallSeconds(0); setShowActionSheet(false) } },
              { icon: <VideoIcon />,    label: 'ビデオ通話', sub: 'ビデオ通話を開始する', action: () => { setCallType('video'); setShowCallUI(true); setCallStatus('calling'); setCallSeconds(0); setShowActionSheet(false) } },
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
            <button onClick={() => setShowActionSheet(false)} style={{ margin: '8px 16px 0', width: 'calc(100% - 32px)', padding: '14px', borderRadius: 14, background: 'rgba(0,0,0,0.06)', border: 'none', fontSize: 15, color: '#111', cursor: 'pointer', fontWeight: 'bold', display: 'block' }}>
              キャンセル
            </button>
          </div>
        </>
      )}

      {/* 設定全画面 */}
      {showSettings && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: '#0d0d1a', display: 'flex', flexDirection: 'column', maxWidth: 390, left: '50%', transform: 'translateX(-50%)' }}>
          {/* ヘッダー */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
            <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: 20, display: 'flex', alignItems: 'center', padding: 4 }}>←</button>
            <p style={{ color: 'white', fontWeight: 700, fontSize: 16, margin: 0 }}>設定</p>
          </div>
          {/* プロフィール */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #2d1f5e, #1a1040)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, marginBottom: 10, border: '2px solid rgba(167,139,250,0.3)' }}>👤</div>
            <p style={{ color: 'white', fontWeight: 700, fontSize: 18, margin: '0 0 4px' }}>{partnerName}</p>
          </div>
          {/* タブ */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
            {(['general', 'custom'] as const).map(tb => {
              const on = settingsTab === tb
              return (
                <button key={tb} onClick={() => setSettingsTab(tb)} style={{ flex: 1, padding: '10px', fontSize: 13, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', color: on ? 'white' : 'rgba(255,255,255,0.4)', borderBottom: on ? '2px solid #a78bfa' : '2px solid transparent' }}>
                  {tb === 'general' ? '一般' : 'カスタマイズ'}
                </button>
              )
            })}
          </div>
          {/* 一般タブ */}
          {settingsTab === 'general' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0', scrollbarWidth: 'none' }}>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 600, padding: '16px 20px 8px', margin: 0, letterSpacing: '0.8px' }}>通知</p>
              <div style={{ margin: '0 16px', borderRadius: 14, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 18 }}>🔔</span>
                    <p style={{ color: 'white', fontSize: 14, margin: 0 }}>メッセージ通知</p>
                  </div>
                  <div style={{ width: 44, height: 26, borderRadius: 13, background: '#a78bfa', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 3, left: 21, width: 20, height: 20, borderRadius: '50%', background: 'white' }} />
                  </div>
                </div>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 600, padding: '20px 20px 8px', margin: 0, letterSpacing: '0.8px' }}>ユーザー</p>
              <div style={{ margin: '0 16px', borderRadius: 14, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                <div onClick={() => { if (window.confirm('このユーザーをブロックしますか？')) setShowSettings(false) }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: 18 }}>🚫</span>
                  <div>
                    <p style={{ color: '#f87171', fontSize: 14, margin: 0 }}>ブロック</p>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: '2px 0 0' }}>このユーザーのメッセージを受け取らない</p>
                  </div>
                </div>
                <div onClick={() => { if (window.confirm('このユーザーを通報しますか？')) setShowSettings(false) }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer' }}>
                  <span style={{ fontSize: 18 }}>⚠️</span>
                  <div>
                    <p style={{ color: '#f87171', fontSize: 14, margin: 0 }}>通報</p>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: '2px 0 0' }}>不適切なコンテンツを報告する</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* カスタマイズタブ */}
          {settingsTab === 'custom' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: 40, scrollbarWidth: 'none' }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600, margin: '0 0 12px 0', letterSpacing: '0.8px' }}>チャットのカスタマイズ</p>
              {/* デフォルト設定トグル */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 12 }}>
                <div style={{ flex: 1, marginRight: 12 }}>
                  <div style={{ color: 'white', fontSize: 14, fontWeight: 500 }}>デフォルト設定を使用</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 }}>Decorationの設定を使用します</div>
                </div>
                <div onClick={() => {
                  if (!useGlobalSetting) {
                    localStorage.removeItem(ROOM_STORAGE_KEY)
                    const g = localStorage.getItem('chatCustomize')
                    if (g) setRoomCustomize(JSON.parse(g))
                  }
                  setUseGlobalSetting(p => !p)
                }} style={{ width: 44, height: 24, borderRadius: 12, cursor: 'pointer', backgroundColor: useGlobalSetting ? '#7c3aed' : 'rgba(255,255,255,0.2)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', top: 2, left: useGlobalSetting ? 22 : 2, width: 20, height: 20, borderRadius: '50%', backgroundColor: 'white', transition: 'left 0.2s' }} />
                </div>
              </div>
              {/* 色設定折りたたみ */}
              <div style={{ opacity: useGlobalSetting ? 0.4 : 1, pointerEvents: useGlobalSetting ? 'none' : 'auto' }}>
                {(['bg', 'bubble', 'text'] as const).map(section => (
                  <div key={section} style={{ marginBottom: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 10 }}>
                    <div onClick={() => setRoomOpenSub(roomOpenSub === section ? null : section)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                      <span style={{ color: 'white', fontSize: 14 }}>
                        {section === 'bg' ? '🖼 背景' : section === 'bubble' ? '💬 吹き出し' : '🔤 文字色'}
                      </span>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{roomOpenSub === section ? '▼' : '▶'}</span>
                    </div>
                    {roomOpenSub === section && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ background: roomCustomize.bgColor, borderRadius: 10, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                          <div style={{ background: roomCustomize.otherBubbleColor, borderRadius: 12, padding: '5px 10px' }}><span style={{ color: roomCustomize.otherTextColor, fontSize: 12 }}>こんにちは</span></div>
                          <div style={{ background: roomCustomize.myBubbleColor, borderRadius: 12, padding: '5px 10px' }}><span style={{ color: roomCustomize.myTextColor, fontSize: 12 }}>よろしく！</span></div>
                        </div>
                        {section === 'bg' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <div style={{ width: 20, height: 20, borderRadius: '50%', background: roomCustomize.bgColor, flexShrink: 0, border: '1px solid rgba(255,255,255,0.2)' }} />
                            <input type="range" min={0} max={360} value={roomHue.bg} className="hue-slider"
                              onChange={e => { const v = Number(e.target.value); setRoomHue((p: typeof roomHue) => ({ ...p, bg: v })); setRoomCustomize((p: typeof roomCustomize) => ({ ...p, bgColor: `hsl(${v},70%,${roomLightness.bg}%)` })) }}
                              onInput={e => { const v = Number((e.target as HTMLInputElement).value); setRoomHue((p: typeof roomHue) => ({ ...p, bg: v })); setRoomCustomize((p: typeof roomCustomize) => ({ ...p, bgColor: `hsl(${v},70%,${roomLightness.bg}%)` })) }}
                              style={{ flex: 1 }} />
                          </div>
                        )}
                        {section === 'bubble' && (
                          <>
                            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 4 }}>自分の吹き出し</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                              <div style={{ width: 20, height: 20, borderRadius: '50%', background: roomCustomize.myBubbleColor, flexShrink: 0, border: '1px solid rgba(255,255,255,0.2)' }} />
                              <input type="range" min={0} max={360} value={roomHue.myBubble} className="hue-slider"
                                onChange={e => { const v = Number(e.target.value); setRoomHue((p: typeof roomHue) => ({ ...p, myBubble: v })); setRoomCustomize((p: typeof roomCustomize) => ({ ...p, myBubbleColor: `hsl(${v},70%,${roomLightness.myBubble}%)` })) }}
                                onInput={e => { const v = Number((e.target as HTMLInputElement).value); setRoomHue((p: typeof roomHue) => ({ ...p, myBubble: v })); setRoomCustomize((p: typeof roomCustomize) => ({ ...p, myBubbleColor: `hsl(${v},70%,${roomLightness.myBubble}%)` })) }}
                                style={{ flex: 1 }} />
                            </div>
                            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 4 }}>相手の吹き出し</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 20, height: 20, borderRadius: '50%', background: roomCustomize.otherBubbleColor, flexShrink: 0, border: '1px solid rgba(255,255,255,0.2)' }} />
                              <input type="range" min={0} max={360} value={roomHue.otherBubble} className="hue-slider"
                                onChange={e => { const v = Number(e.target.value); setRoomHue((p: typeof roomHue) => ({ ...p, otherBubble: v })); setRoomCustomize((p: typeof roomCustomize) => ({ ...p, otherBubbleColor: `hsl(${v},70%,${roomLightness.otherBubble}%)` })) }}
                                onInput={e => { const v = Number((e.target as HTMLInputElement).value); setRoomHue((p: typeof roomHue) => ({ ...p, otherBubble: v })); setRoomCustomize((p: typeof roomCustomize) => ({ ...p, otherBubbleColor: `hsl(${v},70%,${roomLightness.otherBubble}%)` })) }}
                                style={{ flex: 1 }} />
                            </div>
                          </>
                        )}
                        {section === 'text' && (
                          <>
                            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 4 }}>自分の文字色</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                              <div style={{ width: 20, height: 20, borderRadius: '50%', background: roomCustomize.myTextColor, flexShrink: 0, border: '1px solid rgba(255,255,255,0.2)' }} />
                              <input type="range" min={0} max={360} value={roomHue.myText} className="hue-slider"
                                onChange={e => { const v = Number(e.target.value); setRoomHue((p: typeof roomHue) => ({ ...p, myText: v })); setRoomCustomize((p: typeof roomCustomize) => ({ ...p, myTextColor: `hsl(${v},70%,${roomLightness.myText}%)` })) }}
                                onInput={e => { const v = Number((e.target as HTMLInputElement).value); setRoomHue((p: typeof roomHue) => ({ ...p, myText: v })); setRoomCustomize((p: typeof roomCustomize) => ({ ...p, myTextColor: `hsl(${v},70%,${roomLightness.myText}%)` })) }}
                                style={{ flex: 1 }} />
                            </div>
                            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 4 }}>相手の文字色</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 20, height: 20, borderRadius: '50%', background: roomCustomize.otherTextColor, flexShrink: 0, border: '1px solid rgba(255,255,255,0.2)' }} />
                              <input type="range" min={0} max={360} value={roomHue.otherText} className="hue-slider"
                                onChange={e => { const v = Number(e.target.value); setRoomHue((p: typeof roomHue) => ({ ...p, otherText: v })); setRoomCustomize((p: typeof roomCustomize) => ({ ...p, otherTextColor: `hsl(${v},70%,${roomLightness.otherText}%)` })) }}
                                onInput={e => { const v = Number((e.target as HTMLInputElement).value); setRoomHue((p: typeof roomHue) => ({ ...p, otherText: v })); setRoomCustomize((p: typeof roomCustomize) => ({ ...p, otherTextColor: `hsl(${v},70%,${roomLightness.otherText}%)` })) }}
                                style={{ flex: 1 }} />
                            </div>
                          </>
                        )}
                        <button onClick={() => handleRoomSave(section)} style={{ width: '100%', padding: '10px 0', borderRadius: 8, marginTop: 10, background: roomSavedFeedback === section ? '#059669' : '#7c3aed', border: 'none', color: 'white', fontSize: 14, cursor: 'pointer' }}>
                          {roomSavedFeedback === section ? '保存しました ✓' : '保存する'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                <button onClick={() => {
                  localStorage.removeItem(ROOM_STORAGE_KEY)
                  const g = localStorage.getItem('chatCustomize')
                  if (g) setRoomCustomize(JSON.parse(g))
                  setUseGlobalSetting(true)
                }} style={{ width: '100%', padding: '12px 0', borderRadius: 10, marginTop: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', fontSize: 14, cursor: 'pointer' }}>
                  ⟳ グローバル設定に戻す
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 電話UI */}
      {showCallUI && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: callType === 'video' ? '#000' : 'linear-gradient(180deg, #1a0a2e 0%, #2d1b4e 100%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          maxWidth: 390, left: '50%', transform: 'translateX(-50%)',
        }}>
          <div style={{ marginTop: 60, color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
            {callType === 'video' ? '📹 ビデオ通話' : '📞 音声通話'}
          </div>
          <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>
            👤
          </div>
          <div style={{ color: 'white', fontSize: 24, fontWeight: 'bold', marginTop: 16 }}>
            {partnerName}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, marginTop: 8 }}>
            {callStatus === 'calling' ? '呼び出し中...' :
             callStatus === 'connected' ? `通話中 ${Math.floor(callSeconds / 60).toString().padStart(2, '0')}:${(callSeconds % 60).toString().padStart(2, '0')}` :
             '通話終了'}
          </div>
          {callType === 'video' && (
            <div style={{ width: 90, height: 120, borderRadius: 12, background: 'rgba(255,255,255,0.1)', marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.2)', alignSelf: 'flex-end', marginRight: 20 }}>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>カメラ</span>
            </div>
          )}
          <div style={{ position: 'absolute', bottom: 60, display: 'flex', gap: 32, alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <button style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="9" y="2" width="6" height="11" rx="3" fill="white"/>
                  <path d="M5 10a7 7 0 0014 0" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                  <path d="M12 17v4M9 21h6" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </button>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>ミュート</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => {
                  if (callTimerRef.current) clearInterval(callTimerRef.current)
                  setCallStatus('ended')
                  setTimeout(() => { setShowCallUI(false); setCallStatus('calling'); setCallSeconds(0) }, 1500)
                }}
                style={{ width: 68, height: 68, borderRadius: '50%', background: '#dc2626', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <path d="M4 18l3-3 4 1 1.5-2.5c-1-2-1-4 0-6L10 6l3-3c5 2 9 6 11 11l-3 3-2.5-1.5L17 18l1 4-3 3C10 24 6 22 4 18z" fill="white"/>
                </svg>
              </button>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>切る</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <button style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M11 5L6 9H2v6h4l5 4V5z" fill="white"/>
                  <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </button>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>スピーカー</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
