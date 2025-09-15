import { JSX } from 'preact'
import { IconTile } from '../atoms/IconTile'
import { StatusDot } from '../atoms/StatusDot'
import { ButtonLink } from '../atoms/ButtonLink'
import { MetricBullet } from '../atoms/MetricBullet'

interface DataStatusCardProps extends JSX.HTMLAttributes<HTMLDivElement> {
  title: string
  lastIndexedText: string
  filesCount: number
  depsCount: number
  status: 'healthy' | 'warning' | 'error'
  onReindex?: () => void
}

export function DataStatusCard({ title, lastIndexedText, filesCount, depsCount, status, onReindex, ...rest }: DataStatusCardProps) {
  const className = ['data-status-card', (rest as any).class ?? ''].filter(Boolean).join(' ')
  const props = { ...rest } as any
  delete props.class

  return (
    <div class={className} {...props}>
      <IconTile variant="success" iconName="check" />
      <div class="data-status-body">
        <div class="data-status-head">
          <div class="data-title">{title}</div>
          <StatusDot status={status} size={10} />
        </div>
        <div class="data-subline">
          <span class="data-clock" aria-hidden>🕒</span>
          <span class="data-text">{lastIndexedText}</span>
        </div>
        <div class="data-metrics">
          <MetricBullet variant="purple" text={`${filesCount} files`} />
          <span class="metrics-arrow" aria-hidden>→</span>
          <MetricBullet variant="green" text={`${depsCount} deps`} />
        </div>
      </div>
      <div class="data-status-actions">
        <ButtonLink onClick={onReindex}>Re-index Now</ButtonLink>
      </div>
    </div>
  )}
