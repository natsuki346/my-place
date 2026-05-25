'use client'

import { useState, useEffect } from 'react'
import { Home, Map, Compass } from 'lucide-react'
import type { AppView } from '@/store/useWorldStore'

type Period = 'morning' | 'afternoon' | 'evening' | 'night'

function getPeriod(h: number): Period {
  return h >= 5 && h < 11 ? 'morning' : h >= 11 && h < 17 ? 'afternoon' : h >= 17 && h < 22 ? 'evening' : 'night'
}

const TABS: { key: AppView; Icon: React.FC<{ size?: number; strokeWidth?: number }>; label: string }[] = [
  { key: 'room',    Icon: Home,    label: 'MyRoom' },
  { key: 'world',   Icon: Map,     label: 'World'  },
  { key: 'explore', Icon: Compass, label: 'Explore' },
]

type Props = {
  current: AppView
  onChange: (v: AppView) => void
}

export function BottomNav({ current, onChange }: Props) {
  const [period, setPeriod] = useState<Period>('night')

  useEffect(() => {
    setPeriod(getPeriod(new Date().getHours()))
    const id = setInterval(() => setPeriod(getPeriod(new Date().getHours())), 60_000)
    return () => clearInterval(id)
  }, [])

  const activeColor = {
    morning:   'text-sky-500',
    afternoon: 'text-blue-500',
    evening:   'text-orange-500',
    night:     'text-purple-500',
  }[period]

  const activeIndicator = {
    morning:   'bg-sky-400',
    afternoon: 'bg-blue-400',
    evening:   'bg-orange-400',
    night:     'bg-purple-500',
  }[period]

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] flex z-50 bg-white border-t border-gray-200"
      style={{ height: '56px' }}
    >
      {TABS.map(({ key, Icon, label }) => {
        const active = current === key
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`flex-1 flex flex-col items-center justify-center gap-[2px] pt-2 relative transition-colors ${
              active ? activeColor : 'text-gray-400'
            }`}
          >
            {active && (
              <div
                className={`absolute top-0 rounded-b-sm ${activeIndicator}`}
                style={{ left: '20%', right: '20%', height: '2px' }}
              />
            )}
            <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
            <span className="text-[10px]" style={{ fontWeight: active ? 600 : 400 }}>
              {label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
