import { JSX } from 'preact'

interface Bounds { x1: number; y1: number; x2: number; y2: number; w: number; h: number }

import { getSupportedFileTypes, getFileTypeColor, getFileTypeLabel } from '../../services/graph-styles.service'

interface MiniMapPanelProps extends JSX.HTMLAttributes<HTMLDivElement> {
  title?: string
  bounds?: Bounds | null
  viewport?: Bounds | null
}

export function MiniMapPanel({ title = 'Legend', ...rest }: MiniMapPanelProps) {
  const className = ['mini-map', (rest as any).class ?? ''].filter(Boolean).join(' ')
  const props = { ...rest } as any
  delete props.class

  // Show all file types in the legend
  const fileTypes = getSupportedFileTypes()

  return (
    <div class={className} {...props}>
      <div class="mini-map-title">{title}</div>
      <ul class="legend-list legend-grid-2">
        {fileTypes.map((ft) => (
          <li class="legend-item legend-item-sm" key={ft}>
            <span class="legend-swatch legend-swatch-sm" style={{ backgroundColor: getFileTypeColor(ft) }} />
            <span class="legend-label legend-label-sm">{ft.toUpperCase()}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
