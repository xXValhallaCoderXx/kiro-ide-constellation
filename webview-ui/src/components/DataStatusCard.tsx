import { IconTile } from './IconTile'
import { InlineStat } from './InlineStat'
import { LinkAction } from './LinkAction'

interface DataStatusCardProps {
  title: string
  subline: string
  filesCount: number
  depsCount: number
  onReindex?: () => void
}

export function DataStatusCard({ 
  title, 
  subline, 
  filesCount, 
  depsCount, 
  onReindex 
}: DataStatusCardProps) {
  return (
    <div class="constellation-data-card">
      <div class="constellation-data-header">
        <IconTile accent="success">🗃️</IconTile>
        <h3 class="constellation-data-title">{title}</h3>
      </div>
      
      <div class="constellation-data-subline">
        <span class="constellation-data-subline-icon">🕐</span>
        <span>{subline}</span>
      </div>
      
      <div class="constellation-data-stats">
        <InlineStat icon="📄" value={`${filesCount} Files`} />
        <span class="constellation-stat-separator">→</span>
        <InlineStat icon="📦" value={`${depsCount} Deps`} />
        <div class="constellation-status-dot" />
      </div>
      
      {onReindex && (
        <LinkAction onClick={onReindex}>
          Re-index Now
        </LinkAction>
      )}
    </div>
  )
}