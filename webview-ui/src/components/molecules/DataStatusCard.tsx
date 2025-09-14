import type { JSX } from 'preact'
import { IconTile } from '../atoms/IconTile'
import { Icon } from '../atoms/Icon'
import { StatusDot } from '../atoms/StatusDot'
import { ButtonLink } from '../atoms/ButtonLink'
import { MetricBullet } from '../atoms/MetricBullet'

interface DataStatusCardProps {
  title: string
  lastIndexedText: string
  filesCount: number
  depsCount: number
  status: 'healthy' | 'warning' | 'error'
  onReindex?: () => void
}

export function DataStatusCard({ 
  title, 
  lastIndexedText, 
  filesCount, 
  depsCount, 
  status, 
  onReindex 
}: DataStatusCardProps) {
  const cardStyle: JSX.CSSProperties = {
    background: 'var(--surface-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-card)',
    boxShadow: 'var(--shadow-card)',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    transition: `all var(--duration-fast) var(--ease-ui)`,
  }

  const headerStyle: JSX.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  }

  const contentStyle: JSX.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    minWidth: 0,
  }

  const titleStyle: JSX.CSSProperties = {
    color: 'var(--text-primary)',
    fontSize: '14px',
    fontWeight: '500',
    lineHeight: 1.4,
    margin: 0,
  }

  const sublineStyle: JSX.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: 'var(--text-secondary)',
    fontSize: '12px',
    lineHeight: 1.4,
  }

  const statsRowStyle: JSX.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  }

  const separatorStyle: JSX.CSSProperties = {
    color: '#6E6A86',
    fontSize: '12px',
    lineHeight: 1,
  }

  const bottomRowStyle: JSX.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  }

  const statusRowStyle: JSX.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  }

  const handleMouseEnter = (e: MouseEvent) => {
    const target = e.currentTarget as HTMLElement
    target.style.background = 'color-mix(in srgb, var(--surface-card) 95%, var(--surface-overlay-04))'
  }

  const handleMouseLeave = (e: MouseEvent) => {
    const target = e.currentTarget as HTMLElement
    target.style.background = 'var(--surface-card)'
  }

  return (
    <div 
      style={cardStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div style={headerStyle}>
        <IconTile variant="success" iconName="check" />
        <div style={contentStyle}>
          <h3 style={titleStyle}>{title}</h3>
          <div style={sublineStyle}>
            <Icon 
              name="clock" 
              size={16} 
              colorToken="--text-secondary"
              aria-hidden="true"
            />
            <span>{lastIndexedText}</span>
          </div>
        </div>
      </div>

      <div style={statsRowStyle}>
        <MetricBullet variant="purple" text={`${filesCount} files`} />
        <span style={separatorStyle}>→</span>
        <MetricBullet variant="green" text={`${depsCount} Real-time`} />
      </div>

      <div style={bottomRowStyle}>
        <div style={statusRowStyle}>
          <StatusDot status={status} size={8} />
          <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        </div>
        
        {onReindex && (
          <ButtonLink onClick={onReindex}>
            Re-index Now
          </ButtonLink>
        )}
      </div>
    </div>
  )
}