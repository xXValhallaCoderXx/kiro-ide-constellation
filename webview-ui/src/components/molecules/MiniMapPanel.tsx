import { JSX } from 'preact'

interface MiniMapPanelProps extends JSX.HTMLAttributes<HTMLDivElement> {
  title?: string
  hasViewport?: boolean
}

export function MiniMapPanel({ title = 'Mini-map', hasViewport = false, ...rest }: MiniMapPanelProps) {
  const className = ['mini-map', (rest as any).class ?? ''].filter(Boolean).join(' ')
  const props = { ...rest } as any
  delete props.class
  return (
    <div class={className} {...props}>
      <div class="mini-map-title">{title}</div>
      <div class="mini-map-viewport" aria-hidden={!hasViewport} />
    </div>
  )
}
