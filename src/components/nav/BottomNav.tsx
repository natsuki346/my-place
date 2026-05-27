'use client'

import { useState, useEffect } from 'react'
import { Frame, Map, Compass } from 'lucide-react'
import type { AppView } from '@/store/useWorldStore'

type Period = 'morning' | 'afternoon' | 'evening' | 'night'

function getPeriod(h: number): Period {
  return h >= 5 && h < 11 ? 'morning' : h >= 11 && h < 17 ? 'afternoon' : h >= 17 && h < 22 ? 'evening' : 'night'
}

const TABS: { key: AppView; Icon: React.FC<{ size?: number; strokeWidth?: number }>; label: string }[] = [
  { key: 'museum',  Icon: Frame,   label: 'Museum' },
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
    morning:   'text-sky-600',
    afternoon: 'text-blue-600',
    evening:   'text-orange-600',
    night:     'text-purple-600',
  }[period]

  const activeIndicator = {
    morning:   'bg-sky-500',
    afternoon: 'bg-blue-500',
    evening:   'bg-orange-500',
    night:     'bg-purple-500',
  }[period]

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] flex z-50 bg-white border-t border-gray-200"
      style={{ height: '56px' }}
    >
      {TABS.map(({ key, Icon, label }) => {
        const active: boolean = current === key
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`flex-1 flex flex-col items-center justify-center gap-[2px] pt-2 relative transition-colors ${
              active ? activeColor : 'text-gray-400'
            }`}
          >
            {active && (
              <div className={`absolute top-0 left-0 right-0 h-0.5 ${activeIndicator}`} />
            )}
            <Icon size={20} strokeWidth={(active ?? false) ? 2.2 : 1.8} />
            <span className="text-[10px]" style={{ fontWeight: active ? 600 : 400 }}>
              {label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
