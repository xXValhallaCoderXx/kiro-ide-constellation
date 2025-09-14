import { IconTile } from '../atoms/IconTile'
import { Icon } from '../atoms/Icon'
import { MetricBullet } from '../atoms/MetricBullet'
import { StatusDot } from '../atoms/StatusDot'
import { ButtonLink } from '../atoms/ButtonLink'

interface DataStatusCardProps {
  title: string
  lastIndexedText: string
  filesCount: number
  depsCount: number
  status: 'healthy' | 'warning' | 'error'
  onReindex?: () => void
}

export function DataStatusCard({ title, lastIndexedText, filesCount, depsCount, status, onReindex }: DataStatusCardProps) {
  return (
    <div class="data-status-card">
      <IconTile variant="success" iconName="check" />
      <div class="data-status-body">
        <div class="data-status-title">{title}</div>
        <div class="data-status-subline">
          <Icon name="clock" size={16} colorToken="--text-secondary" />
          <span>{lastIndexedText}</span>
        </div>
        <div class="data-status-stats">
          <MetricBullet variant="purple" text={`${filesCount} files`} />
          <span class="stat-sep">→</span>
          <MetricBullet variant="green" text={`${depsCount} deps`} />
          <StatusDot status={status} size={8} />
        </div>
        {onReindex && (
          <ButtonLink onClick={onReindex}>Re-index Now</ButtonLink>
        )}
      </div>
    </div>
  )
}
