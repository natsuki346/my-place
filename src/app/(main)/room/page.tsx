'use client'

import { useState, useEffect } from 'react'
import { useWorldStore } from '@/store/useWorldStore'
import { RoomCanvas, getCurrentThemeColors } from '@/components/room/RoomCanvas'
import type { ThemeColors } from '@/components/room/RoomCanvas'
import { DoorHall } from '@/components/world/DoorHall'
import { ChatRoom } from '@/components/room/ChatRoom'
import { AvatarChat } from '@/components/room/AvatarChat'
import { ProfileView } from '@/components/profile/ProfileView'
import { BottomNav } from '@/components/nav/BottomNav'

export default function RoomPage() {
  const { currentView, setView } = useWorldStore()
  const [activeRoom,     setActiveRoom]     = useState<string | null>(null)
  const [roomTab,        setRoomTab]        = useState<'room' | 'profile'>('room')
  const [theme,          setTheme]          = useState<ThemeColors>(getCurrentThemeColors)
  const [avatarChatOpen, setAvatarChatOpen] = useState(false)

  useEffect(() => {
    const id = setInterval(() => setTheme(getCurrentThemeColors()), 60_000)
    return () => clearInterval(id)
  }, [])

  const handleViewChange = (v: typeof currentView) => {
    if (v !== 'world') setActiveRoom(null)
    setView(v)
  }

  const showingChatRoom = currentView === 'world' && activeRoom !== null

  return (
    <div
      className="relative overflow-hidden select-none"
      style={{
        width: '100vw',
        height: '100dvh',
        maxWidth: '390px',
        margin: '0 auto',
        background: '#0a0812',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* ── Screen area ────────────────────────────────────────────── */}
      <div
        className="overflow-hidden flex flex-col"
        style={{ height: showingChatRoom ? '100dvh' : 'calc(100dvh - 56px)' }}
      >
        {currentView === 'room' && (
          <>
            {/* Room / Profile tab bar */}
            <div
              className="flex flex-shrink-0"
              style={{
                paddingTop: '14px',
                background: 'transparent',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {(['room', 'profile'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setRoomTab(tab)}
                  style={{
                    flex: 1,
                    padding: '8px 32px',
                    fontSize: '16px',
                    letterSpacing: '1px',
                    color: roomTab === tab ? '#ffffff' : 'rgba(255,255,255,0.5)',
                    borderBottom: roomTab === tab ? '3px solid #a78bfa' : '3px solid transparent',
                    background: 'transparent',
                    textTransform: 'capitalize',
                    fontWeight: roomTab === tab ? 600 : 400,
                  }}
                >
                  {tab === 'room' ? 'Room' : 'Profile'}
                </button>
              ))}
            </div>

            <div className="flex-1 min-h-0">
              {roomTab === 'room' ? (
                <RoomCanvas onAvatarClick={() => setAvatarChatOpen(true)} />
              ) : (
                <ProfileView theme={theme} />
              )}
            </div>
          </>
        )}

        {currentView === 'world' && (
          <DoorHall onEnterRoom={(key) => setActiveRoom(key)} />
        )}

        {currentView === 'profile' && <ProfileView theme={theme} />}
      </div>

      {/* ── Bottom navigation ──────────────────────────────────────── */}
      {!showingChatRoom && (
        <BottomNav current={currentView} onChange={handleViewChange} />
      )}

      {/* ── ChatRoom full-screen overlay ───────────────────────────── */}
      {showingChatRoom && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 50 }}>
          <ChatRoom roomKey={activeRoom} onBack={() => setActiveRoom(null)} />
        </div>
      )}

      {/* ── AvatarChat full-screen overlay ─────────────────────────── */}
      {avatarChatOpen && <AvatarChat onClose={() => setAvatarChatOpen(false)} />}
    </div>
  )
}
