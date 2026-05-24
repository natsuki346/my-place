'use client'

import { useState } from 'react'
import { useWorldStore } from '@/store/useWorldStore'
import { RoomCanvas } from '@/components/room/RoomCanvas'
// import { WorldMap } from '@/components/room/WorldMap'
import { DoorHall } from '@/components/world/DoorHall'
import { ChatRoom } from '@/components/room/ChatRoom'
import { ProfileView } from '@/components/profile/ProfileView'
import { BottomNav } from '@/components/nav/BottomNav'

export default function RoomPage() {
  const { currentView, setView } = useWorldStore()
  const [activeRoom, setActiveRoom] = useState<string | null>(null)

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
        className="overflow-hidden"
        style={{ height: showingChatRoom ? '100dvh' : 'calc(100dvh - 56px)' }}
      >
        {currentView === 'room' && (
          <RoomCanvas onSoulmateClick={() => setView('profile')} />
        )}

        {currentView === 'world' && (
          <DoorHall onEnterRoom={(key) => setActiveRoom(key)} />
        )}

        {currentView === 'profile' && <ProfileView />}
      </div>

      {/* ── Bottom navigation ──────────────────────────────────────── */}
      {!showingChatRoom && (
        <BottomNav current={currentView} onChange={handleViewChange} />
      )}

      {/* ── ChatRoom full-screen overlay ───────────────────────────── */}
      {showingChatRoom && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 50,
          }}
        >
          <ChatRoom roomKey={activeRoom} onBack={() => setActiveRoom(null)} />
        </div>
      )}
    </div>
  )
}
