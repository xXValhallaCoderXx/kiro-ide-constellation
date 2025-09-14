import type { JSX } from 'preact'
import { MetricBullet } from '../atoms/MetricBullet'

interface MetricsInlineProps {
  items: Array<{ variant: 'purple' | 'green' | 'neutral'; text: string }>
}

export function MetricsInline({ items }: MetricsInlineProps) {
  const containerStyle: JSX.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  }

  const separatorStyle: JSX.CSSProperties = {
    color: '#6E6A86',
    fontSize: '12px',
    lineHeight: 1,
  }

  return (
    <div style={containerStyle}>
      {items.map((item, index) => (
        <>
          <MetricBullet 
            key={`metric-${index}`}
            variant={item.variant} 
            text={item.text} 
          />
          {index < items.length - 1 && (
            <span key={`sep-${index}`} style={separatorStyle}>•</span>
          )}
        </>
      ))}
    </div>
  )
}