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

  // Calculate viewport rectangle relative to a world rect that covers both graph bounds and current viewport
  let rectStyle: JSX.CSSProperties | undefined
  if (bounds && viewport) {
    // Build a world rectangle that is the union of bounds and viewport extents
    const worldX1 = Math.min(bounds.x1, viewport.x1)
    const worldY1 = Math.min(bounds.y1, viewport.y1)
    const worldX2 = Math.max(bounds.x2, viewport.x2)
    const worldY2 = Math.max(bounds.y2, viewport.y2)
    const worldW = Math.max(1, worldX2 - worldX1)
    const worldH = Math.max(1, worldY2 - worldY1)

    const pad = 8 // inner padding of container if any (approx)
    const containerWidth = 220 - pad * 2
    const containerHeight = 120 - pad * 2
    const scaleX = containerWidth / worldW
    const scaleY = containerHeight / worldH

    const left = (viewport.x1 - worldX1) * scaleX
    const top = (viewport.y1 - worldY1) * scaleY
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
