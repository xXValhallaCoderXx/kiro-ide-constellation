import type { JSX } from 'preact'

interface MetricBulletProps {
  variant: 'purple' | 'green' | 'neutral'
  text: string
}

export function MetricBullet({ variant, text }: MetricBulletProps) {
  const containerStyle: JSX.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  }

  const dotStyle: JSX.CSSProperties = {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
    background: (() => {
      switch (variant) {
        case 'purple':
          return '#A78BFA'
        case 'green':
          return '#22C55E'
        case 'neutral':
        default:
          return 'var(--text-secondary)'
      }
    })(),
  }

  const textStyle: JSX.CSSProperties = {
    color: 'var(--text-secondary)',
    fontSize: '12px',
    lineHeight: 1.4,
  }

  return (
    <div style={containerStyle}>
      <div style={dotStyle} />
      <span style={textStyle}>{text}</span>
    </div>
  )
}