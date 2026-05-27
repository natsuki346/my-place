'use client'

import { MuseumView } from '@/components/museum/MuseumView'

export default function MuseumPage() {
  return (
    <div
      style={{
        width:      '100vw',
        height:     '100dvh',
        maxWidth:   '390px',
        margin:     '0 auto',
        position:   'relative',
        overflow:   'hidden',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <MuseumView />
    </div>
  )
}
