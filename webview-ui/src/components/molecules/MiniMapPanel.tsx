interface MiniMapPanelProps {
  title?: string
  hasViewport?: boolean
}

export function MiniMapPanel({ title = 'Mini-map', hasViewport }: MiniMapPanelProps) {
  return (
    <div class="minimap-panel">
      <div class="minimap-title">{title}</div>
      {hasViewport && <div class="minimap-viewport" />}
    </div>
  )
}
