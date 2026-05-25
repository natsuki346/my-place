declare module 'react-simple-maps' {
  import { ComponentType, ReactNode, SVGProps, CSSProperties } from 'react'

  export const ComposableMap: ComponentType<{
    projectionConfig?: Record<string, unknown>
    width?: number
    height?: number
    style?: CSSProperties
    [k: string]: unknown
  }>
  export const ZoomableGroup: ComponentType<{
    center?: [number, number]
    zoom?: number
    onMoveEnd?: (pos: { coordinates: [number, number]; zoom: number }) => void
    [k: string]: unknown
  }>
  export const Geographies: ComponentType<{
    geography: string
    children: (props: { geographies: unknown[] }) => ReactNode
    [k: string]: unknown
  }>
  export const Geography: ComponentType<{
    geography: unknown
    fill?: string
    stroke?: string
    strokeWidth?: number
    style?: Record<string, unknown>
    [k: string]: unknown
  }>
  export const Marker: ComponentType<
    { coordinates: [number, number]; onClick?: () => void; [k: string]: unknown } &
    SVGProps<SVGGElement>
  >
}
