'use client'

// Star/nebula data — deterministic (Math.sin only, no Math.random)
const MICRO  = Array.from({ length: 90 }, (_, i) => ({ id: i,      left: (Math.sin(i*7.391)*0.5+0.5)*100, top: (Math.sin(i*3.714+1.2)*0.5+0.5)*90, size: 0.5+(i%3)*0.18,  op: 0.10+(i%8)*0.05,  dur: 4+(i%7)*0.7,   delay: (i%17)*0.31 }))
const NORMAL = Array.from({ length: 50 }, (_, i) => ({ id: 100+i,  left: (Math.sin(i*5.123+0.5)*0.5+0.5)*100, top: (Math.sin(i*2.841+2.8)*0.5+0.5)*88, size: 1+(i%4)*0.32,   op: 0.32+(i%6)*0.09, dur: 2.8+(i%9)*0.42, delay: (i%11)*0.42 }))
const BRIGHT = Array.from({ length: 18 }, (_, i) => ({ id: 155+i, left: (Math.sin(i*9.432+1.8)*0.5+0.5)*100, top: (Math.sin(i*4.567+0.3)*0.5+0.5)*80, size: 1.9+(i%4)*0.38, op: 0.6+(i%4)*0.08,  dur: 2.2+(i%8)*0.35, delay: (i%13)*0.52 }))
const NEBULA = Array.from({ length: 6  }, (_, i) => ({
  id: i,
  left:  (Math.sin(i*4.123+0.7)*0.5+0.5)*100,
  top:   (Math.sin(i*2.987+1.4)*0.5+0.5)*85,
  size:  90+(i%4)*62,
  color: (['rgba(70,30,160,0.055)','rgba(30,18,110,0.045)','rgba(90,50,190,0.06)','rgba(18,25,100,0.05)','rgba(50,18,130,0.045)','rgba(70,50,190,0.065)'] as const)[i],
}))
const CLOUDS = Array.from({ length: 7  }, (_, i) => ({ id: i, left: (Math.sin(i*6.28+0.4)*0.5+0.5)*100, top: 20+(Math.sin(i*3.14+1.1)*0.5+0.5)*55, w: 100+(i%4)*55, h: 26+(i%3)*12 }))

export function NightSky() {
  return (
    <>
      <style>{`
        @keyframes starTwinkle {
          0%, 100% { opacity: var(--star-op, 0.8); transform: scale(1); }
          40%      { opacity: 0.04; transform: scale(0.4); }
          70%      { opacity: var(--star-op, 0.8); transform: scale(1.1); }
        }
      `}</style>

      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(190deg,#010108 0%,#030318 28%,#070540 58%,#040320 80%,#010108 100%)',
      }}>
        {/* Nebula blobs */}
        {NEBULA.map(nb => (
          <div key={nb.id} style={{ position: 'absolute', left: `${nb.left}%`, top: `${nb.top}%`, width: nb.size, height: nb.size, borderRadius: '50%', background: nb.color, filter: 'blur(38px)', transform: 'translate(-50%,-50%)' }} />
        ))}

        {/* Bottom fade */}
        <div style={{ position: 'absolute', inset: '60% 0 0 0', background: 'linear-gradient(transparent,rgba(1,1,8,0.55))' }} />

        {/* Dark atmospheric clouds */}
        {CLOUDS.map(c => (
          <div key={c.id} style={{ position: 'absolute', left: `${c.left}%`, top: `${c.top}%`, width: c.w, height: c.h, borderRadius: '50%', background: 'rgba(20,10,60,0.18)', filter: 'blur(28px)' }} />
        ))}

        {/* Micro stars — tiny, no glow */}
        {MICRO.map(s => (
          <div key={s.id} style={{ position: 'absolute', left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, borderRadius: '50%', background: '#fff', ['--star-op' as string]: s.op, animation: `starTwinkle ${s.dur}s ${s.delay}s ease-in-out infinite` }} />
        ))}

        {/* Normal stars — soft glow */}
        {NORMAL.map(s => (
          <div key={s.id} style={{ position: 'absolute', left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, borderRadius: '50%', background: '#fff', boxShadow: `0 0 ${s.size*1.5}px rgba(255,255,255,${(s.op*0.6).toFixed(2)})`, ['--star-op' as string]: s.op, animation: `starTwinkle ${s.dur}s ${s.delay}s ease-in-out infinite` }} />
        ))}

        {/* Bright stars — strong glow */}
        {BRIGHT.map(s => (
          <div key={s.id} style={{ position: 'absolute', left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, borderRadius: '50%', background: '#fff', boxShadow: `0 0 ${s.size*2.5}px rgba(255,255,255,${(s.op*0.8).toFixed(2)}),0 0 ${s.size*5}px rgba(200,220,255,${(s.op*0.3).toFixed(2)})`, ['--star-op' as string]: s.op, animation: `starTwinkle ${s.dur}s ${s.delay}s ease-in-out infinite` }} />
        ))}
      </div>
    </>
  )
}
