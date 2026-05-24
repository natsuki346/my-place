'use client'

import type { AppView } from '@/store/useWorldStore'

const TABS: { key: AppView; icon: string; label: string }[] = [
  { key: 'room',    icon: '🏠', label: 'MyRoom'  },
  { key: 'world',   icon: '🗺', label: 'World'   },
  { key: 'profile', icon: '👤', label: 'Profile' },
]

type Props = {
  current: AppView
  onChange: (v: AppView) => void
}

export function BottomNav({ current, onChange }: Props) {
  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] flex z-50"
      style={{ height: '56px', background: '#07060f', borderTop: '1px solid #1a1530' }}
    >
      {TABS.map((tab) => {
        const active = current === tab.key
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className="flex-1 flex flex-col items-center justify-center gap-[2px] pt-2 relative transition-colors"
            style={{ color: active ? '#a78bfa' : '#444' }}
          >
            {/* Active indicator */}
            {active && (
              <div
                className="absolute top-0 rounded-b-sm"
                style={{
                  left: '20%', right: '20%',
                  height: '2px',
                  background: '#7f77dd',
                }}
              />
            )}
            <span className="text-[18px] leading-none">{tab.icon}</span>
            <span
              className="text-[10px]"
              style={{ fontWeight: active ? 600 : 400 }}
            >
              {tab.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
