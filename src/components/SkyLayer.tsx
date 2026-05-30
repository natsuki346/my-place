'use client'

import { useMemo } from 'react'
import { useEffect, useState } from 'react'

type ToD = 'morning' | 'day' | 'evening' | 'night'

const getToD = (h: number): ToD =>
  h >= 5 && h < 10 ? 'morning' : h >= 10 && h < 17 ? 'day' : h >= 17 && h < 20 ? 'evening' : 'night'

const TIME_BG: Record<ToD, string> = {
  morning: 'linear-gradient(185deg,#3A8CC0 0%,#70B8DA 16%,#F8CE70 42%,#FFC090 62%,#FFE4CC 82%,#FFF8F0 100%)',
  day:     'linear-gradient(180deg,#0C5A9C 0%,#2880BC 22%,#4CAAD8 48%,#94CDE8 72%,#D4ECFA 90%,#EEF8FF 100%)',
  evening: 'linear-gradient(185deg,#040114 0%,#180448 12%,#560878 28%,#B0165A 50%,#E43018 68%,#F87028 84%,#FFAE40 100%)',
  night:   'linear-gradient(190deg,#010108 0%,#030318 28%,#070540 58%,#040320 80%,#010108 100%)',
}

export default function SkyLayer() {
  const [tod, setTod] = useState<ToD>('night')

  useEffect(() => {
    setTod(getToD(new Date().getHours()))
    const id = setInterval(() => setTod(getToD(new Date().getHours())), 60_000)
    return () => clearInterval(id)
  }, [])

  const MICRO  = useMemo(() => Array.from({ length: 90 }, (_, i) => ({ id: i,     left: (Math.sin(i*7.391)*0.5+0.5)*100, top: (Math.sin(i*3.714+1.2)*0.5+0.5)*90, size: 0.5+(i%3)*0.18,  op: 0.10+(i%8)*0.05,  dur: 4+(i%7)*0.7,   delay: (i%17)*0.31 })), [])
  const NORMAL = useMemo(() => Array.from({ length: 50 }, (_, i) => ({ id: 100+i, left: (Math.sin(i*5.123+0.5)*0.5+0.5)*100, top: (Math.sin(i*2.841+2.8)*0.5+0.5)*88, size: 1+(i%4)*0.32,   op: 0.32+(i%6)*0.09, dur: 2.8+(i%9)*0.42, delay: (i%11)*0.42 })), [])
  const BRIGHT = useMemo(() => Array.from({ length: 18 }, (_, i) => ({ id: 155+i, left: (Math.sin(i*9.432+1.8)*0.5+0.5)*100, top: (Math.sin(i*4.567+0.3)*0.5+0.5)*80, size: 1.9+(i%4)*0.38, op: 0.6+(i%4)*0.08,  dur: 2.2+(i%8)*0.35, delay: (i%13)*0.52 })), [])
  const NEBULA = useMemo(() => Array.from({ length: 6  }, (_, i) => ({ id: i, left: (Math.sin(i*4.123+0.7)*0.5+0.5)*100, top: (Math.sin(i*2.987+1.4)*0.5+0.5)*85, size: 90+(i%4)*62, color: ['rgba(70,30,160,0.055)','rgba(30,18,110,0.045)','rgba(90,50,190,0.06)','rgba(18,25,100,0.05)','rgba(50,18,130,0.045)','rgba(70,50,190,0.065)'][i] })), [])
  const CLOUDS = useMemo(() => Array.from({ length: 7  }, (_, i) => ({ id: i, left: (Math.sin(i*6.28+0.4)*0.5+0.5)*100, top: 20+(Math.sin(i*3.14+1.1)*0.5+0.5)*55, w: 100+(i%4)*55, h: 26+(i%3)*12 })), [])

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: -10, background: '#000' }}>
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 390, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: TIME_BG[tod], transition: 'background 1s ease' }} />

          {tod === 'morning' && <>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 55% at 50% 90%,rgba(255,200,100,0.30) 0%,transparent 70%)' }} />
            {CLOUDS.map(c => <div key={c.id} style={{ position: 'absolute', left: `${c.left}%`, top: `${c.top}%`, width: c.w, height: c.h, borderRadius: '50%', background: 'rgba(255,250,240,0.26)', filter: 'blur(18px)' }} />)}
          </>}

          {tod === 'day' && <>
            <div style={{ position: 'absolute', inset: '0 0 60% 0', background: 'linear-gradient(180deg,rgba(20,80,160,0.32) 0%,transparent 100%)' }} />
            {CLOUDS.map(c => <div key={c.id} style={{ position: 'absolute', left: `${c.left}%`, top: `${c.top}%`, width: c.w, height: c.h, borderRadius: '50%', background: 'rgba(255,255,255,0.20)', filter: 'blur(22px)' }} />)}
          </>}

          {tod === 'evening' && <>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 90% 60% at 50% 85%,rgba(240,90,30,0.36) 0%,transparent 65%)' }} />
            <div style={{ position: 'absolute', inset: '0 0 75% 0', background: 'linear-gradient(180deg,rgba(60,10,120,0.32) 0%,transparent 100%)' }} />
          </>}

          {tod === 'night' && <>
            {NEBULA.map(nb => <div key={nb.id} style={{ position: 'absolute', left: `${nb.left}%`, top: `${nb.top}%`, width: nb.size, height: nb.size, borderRadius: '50%', background: nb.color, filter: 'blur(38px)', transform: 'translate(-50%,-50%)' }} />)}
            <div style={{ position: 'absolute', inset: '60% 0 0 0', background: 'linear-gradient(transparent,rgba(1,1,8,0.55))' }} />
            {CLOUDS.map(c => <div key={c.id} style={{ position: 'absolute', left: `${c.left}%`, top: `${c.top}%`, width: c.w, height: c.h, borderRadius: '50%', background: 'rgba(20,10,60,0.18)', filter: 'blur(28px)' }} />)}
            {MICRO.map(s  => <div key={s.id}  style={{ position: 'absolute', left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, borderRadius: '50%', background: '#fff', ['--star-op' as string]: s.op, animation: `starTwinkle ${s.dur}s ${s.delay}s ease-in-out infinite` }} />)}
            {NORMAL.map(s => <div key={s.id}  style={{ position: 'absolute', left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, borderRadius: '50%', background: '#fff', boxShadow: `0 0 ${s.size*1.5}px rgba(255,255,255,${(s.op*0.6).toFixed(2)})`, ['--star-op' as string]: s.op, animation: `starTwinkle ${s.dur}s ${s.delay}s ease-in-out infinite` }} />)}
            {BRIGHT.map(s => <div key={s.id}  style={{ position: 'absolute', left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, borderRadius: '50%', background: '#fff', boxShadow: `0 0 ${s.size*2.5}px rgba(255,255,255,${(s.op*0.8).toFixed(2)}),0 0 ${s.size*5}px rgba(200,220,255,${(s.op*0.3).toFixed(2)})`, ['--star-op' as string]: s.op, animation: `starTwinkle ${s.dur}s ${s.delay}s ease-in-out infinite` }} />)}
          </>}
        </div>
      </div>
      <style>{`
        @keyframes starTwinkle {
          0%, 100% { opacity: var(--star-op, 0.8); transform: scale(1); }
          40%      { opacity: 0.04; transform: scale(0.4); }
          70%      { opacity: var(--star-op, 0.8); transform: scale(1.1); }
        }
      `}</style>
    </>
  )
}
