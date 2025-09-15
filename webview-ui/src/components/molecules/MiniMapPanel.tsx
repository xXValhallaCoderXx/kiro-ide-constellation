import { JSX } from 'preact'

interface Bounds { x1: number; y1: number; x2: number; y2: number; w: number; h: number }

interface MiniMapPanelProps extends JSX.HTMLAttributes<HTMLDivElement> {
  title?: string
  bounds?: Bounds | null
  viewport?: Bounds | null
}

export function MiniMapPanel({ title = 'Mini-map', bounds, viewport, ...rest }: MiniMapPanelProps) {
  const className = ['mini-map', (rest as any).class ?? ''].filter(Boolean).join(' ')
  const props = { ...rest } as any
  delete props.class

  // Calculate viewport rectangle relative to bounds and viewport container size (CSS fixed height)
  let rectStyle: JSX.CSSProperties | undefined
  if (bounds && viewport && bounds.w > 0 && bounds.h > 0) {
    const pad = 8 // inner padding of container if any (approx)
    const containerWidth = 220 - pad * 2
    const containerHeight = 120 - pad * 2
    const scaleX = containerWidth / bounds.w
    const scaleY = containerHeight / bounds.h
    const left = Math.max(0, (viewport.x1 - bounds.x1) * scaleX)
    const top = Math.max(0, (viewport.y1 - bounds.y1) * scaleY)
    const width = Math.max(6, viewport.w * scaleX)
    const height = Math.max(6, viewport.h * scaleY)
    rectStyle = { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` }
  }

  return (
    <div class={className} {...props}>
      <div class="mini-map-title">{title}</div>
      <div class="mini-map-viewport">
        {rectStyle && <div class="mini-map-rect" style={rectStyle} />}
      </div>
    </div>
  )
}
