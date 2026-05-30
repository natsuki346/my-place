'use client'

import { useState, useEffect } from 'react'
import { Frame, Compass, DoorOpen } from 'lucide-react'
import type { AppView } from '@/store/useWorldStore'

type Period = 'morning' | 'afternoon' | 'evening' | 'night'

function getPeriod(h: number): Period {
  return h >= 5 && h < 11 ? 'morning' : h >= 11 && h < 15 ? 'afternoon' : h >= 15 && h < 18 ? 'evening' : 'night'
}

const NAV_BG: Record<Period, string> = {
  morning:   'bg-sky-100/80',
  afternoon: 'bg-blue-100/80',
  evening:   'bg-orange-100/80',
  night:     'bg-slate-900/80',
}

const ICON_ACTIVE: Record<Period, string> = {
  morning:   '#111827',
  afternoon: '#111827',
  evening:   '#111827',
  night:     '#ffffff',
}

const ICON_INACTIVE: Record<Period, string> = {
  morning:   '#9ca3af',
  afternoon: '#9ca3af',
  evening:   '#9ca3af',
  night:     'rgba(255,255,255,0.40)',
}

const LABEL_CLASS: Record<Period, string> = {
  morning:   'text-[11px] font-medium text-gray-900 mt-0.5',
  afternoon: 'text-[11px] font-medium text-gray-900 mt-0.5',
  evening:   'text-[11px] font-medium text-gray-900 mt-0.5',
  night:     'text-[11px] font-medium text-white mt-0.5',
}

const PILL_BG: Record<Period, string> = {
  morning:   'bg-black/10',
  afternoon: 'bg-black/10',
  evening:   'bg-black/10',
  night:     'bg-white/15',
}

const TABS: { key: AppView; Icon: React.FC<{ size?: number; strokeWidth?: number; color?: string }>; label: string }[] = [
  { key: 'museum',  Icon: Frame,   label: 'Museum'  },
  { key: 'world',   Icon: DoorOpen, label: 'Room'    },
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

  return (
    <nav className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-32px)] max-w-[358px] flex justify-around items-center ${NAV_BG[period]} backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 px-2 py-2`}>
      {TABS.map(({ key, Icon, label }) => {
        const active = current === key
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`flex flex-col items-center px-4 py-2 rounded-xl transition-colors ${active ? PILL_BG[period] : ''}`}
          >
            <Icon
              size={22}
              strokeWidth={active ? 2 : 1.5}
              color={active ? ICON_ACTIVE[period] : ICON_INACTIVE[period]}
            />
            {active && (
              <span className={LABEL_CLASS[period]}>{label}</span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
