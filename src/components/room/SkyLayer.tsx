'use client'

import { useState, useEffect } from 'react'

type Period = 'night' | 'morning' | 'afternoon' | 'evening'

type Star = { x: number; y: number; size: number; dur: number; del: number }

function getPeriod(hour: number): Period {
  if (hour >= 22 || hour < 5)  return 'night'
  if (hour < 11)                return 'morning'
  if (hour < 17)                return 'afternoon'
  return 'evening'
}

function pr(seed: number): number {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

function generateStars(): Star[] {
  return Array.from({ length: 26 }, (_, i) => ({
    x:    pr(i * 3)     * 94 + 3,
    y:    pr(i * 3 + 1) * 52 + 2,
    size: pr(i * 3 + 2) * 1.8 + 0.7,
    dur:  pr(i * 7)     * 2.5 + 1.5,
    del:  pr(i * 11)    * 4.5,
  }))
}

const AF_CLOUDS = [
  { left: 8,  top: 9,  scale: 0.95, dur: 22, del: 0   },
  { left: 44, top: 5,  scale: 1.15, dur: 30, del: -8  },
  { left: 72, top: 13, scale: 0.75, dur: 18, del: -14 },
]

const EV_CLOUDS = [
  { left: 5,  top: 15 },
  { left: 38, top: 8  },
  { left: 65, top: 18 },
  { left: 82, top: 11 },
]

const GRADIENTS: Record<Period, string> = {
  night:     'linear-gradient(to bottom, #06000f 0%, #0d0a2e 55%, #1a0e3a 100%)',
  morning:   'linear-gradient(to bottom, #e0f4ff 0%, #b8e0f7 50%, #87ceeb 100%)',
  afternoon: 'linear-gradient(to bottom, #5ab8f0 0%, #87ceeb 55%, #b0ddf5 100%)',
  evening:   'linear-gradient(to bottom, #c82800 0%, #ff6a00 30%, #9d2e1e 65%, #2d1b69 100%)',
}

function Cloud({ dark = false }: { dark?: boolean }) {
  const base = dark ? 'rgba(20,10,5,0.85)' : 'white'
  return (
    <div style={{ position: 'relative', width: '90px', height: '40px' }}>
      <div style={{ position: 'absolute', bottom: 0, left: '8%', width: '84%', height: '22px', borderRadius: '11px', background: base }} />
      <div style={{ position: 'absolute', bottom: '13px', left: '18%', width: '38px', height: '34px', borderRadius: '50%', background: base }} />
      <div style={{ position: 'absolute', bottom: '15px', left: '40%', width: '46px', height: '40px', borderRadius: '50%', background: base }} />
    </div>
  )
}

export function SkyLayer({ hour }: { hour: number }) {
  const period = getPeriod(hour)
  const [stars, setStars] = useState<Star[]>([])

  useEffect(() => {
    setStars(generateStars())
  }, [])

  return (
    <>
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.25; transform: scale(1); }
          50%       { opacity: 1;    transform: scale(1.4); }
        }
        @keyframes cloud-drift {
          0%, 100% { transform: translateX(-18px); }
          50%      { transform: translateX(18px);  }
        }
      `}</style>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          overflow: 'hidden',
          background: GRADIENTS[period],
        }}
      >
        {/* ── Night ──────────────────────────────────────────────────── */}
        {period === 'night' && (
          <>
            {stars.map((s, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: `${s.x}%`,
                  top:  `${s.y}%`,
                  width:  `${s.size}px`,
                  height: `${s.size}px`,
                  borderRadius: '50%',
                  background: 'white',
                  animation: `twinkle ${s.dur}s ${s.del}s infinite ease-in-out`,
                }}
              />
            ))}

            {/* Crescent moon */}
            <div style={{ position: 'absolute', right: '13%', top: '9%' }}>
              <div
                style={{
                  width: '42px', height: '42px',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at 38% 38%, #fdf6e0, #e8d8b8)',
                  boxShadow: '0 0 22px 4px rgba(240,220,160,0.4)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '-4px', right: '-10px',
                    width: '40px', height: '50px',
                    borderRadius: '50%',
                    background: '#0d0a2e',
                  }}
                />
              </div>
            </div>

            {/* Blue-purple night overlay */}
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(25,15,55,0.28)' }} />
          </>
        )}

        {/* ── Morning ────────────────────────────────────────────────── */}
        {period === 'morning' && (
          <>
            {/* Pale yellow sun — small, upper left */}
            <div
              style={{
                position: 'absolute',
                left: '12%', top: '14%',
                width: '38px', height: '38px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, #ffffff, #ffe566, #ffd633)',
                boxShadow: '0 0 18px 6px rgba(255,230,100,0.45), 0 0 50px 18px rgba(200,230,255,0.20)',
              }}
            />
            {/* Soft light-blue morning haze */}
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(180,220,255,0.10)' }} />
          </>
        )}

        {/* ── Afternoon ──────────────────────────────────────────────── */}
        {period === 'afternoon' && (
          <>
            <div
              style={{
                position: 'absolute',
                left: '50%', top: '6%',
                transform: 'translateX(-50%)',
                width: '58px', height: '58px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, #fffcaa, #ffe83a, #ffc000)',
                boxShadow: '0 0 40px 14px rgba(255,230,40,0.65), 0 0 100px 36px rgba(255,200,0,0.22)',
              }}
            />
            {AF_CLOUDS.map((c, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: `${c.left}%`,
                  top:  `${c.top}%`,
                  transform: `scale(${c.scale})`,
                  transformOrigin: 'left top',
                  opacity: 0.88,
                  animation: `cloud-drift ${c.dur}s ${c.del}s ease-in-out infinite`,
                }}
              >
                <Cloud />
              </div>
            ))}
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(100,170,230,0.08)' }} />
          </>
        )}

        {/* ── Evening ────────────────────────────────────────────────── */}
        {period === 'evening' && (
          <>
            <div
              style={{
                position: 'absolute',
                right: '14%', bottom: '26%',
                width: '50px', height: '50px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, #ffbb66, #ff5500, #cc2000)',
                boxShadow: '0 0 32px 12px rgba(255,90,0,0.5), 0 0 80px 30px rgba(200,50,0,0.2)',
              }}
            />
            {EV_CLOUDS.map((c, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: `${c.left}%`,
                  top:  `${c.top}%`,
                  opacity: 0.6,
                  transform: 'scale(1.3)',
                  transformOrigin: 'left top',
                }}
              >
                <Cloud dark />
              </div>
            ))}
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(100,30,0,0.18)' }} />
          </>
        )}
      </div>
    </>
  )
}
