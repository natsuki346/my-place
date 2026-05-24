'use client'

import { useRef } from 'react'
import { useMapCanvas } from '@/hooks/useMapCanvas'

export function MapCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useMapCanvas(canvasRef)

  return (
    <canvas
      ref={canvasRef}
      className="block w-full h-full cursor-pointer"
      title="タイルをクリックして探索する"
    />
  )
}
