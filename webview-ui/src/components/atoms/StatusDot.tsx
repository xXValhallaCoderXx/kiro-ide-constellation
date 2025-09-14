import type { JSX } from 'preact'

interface StatusDotProps {
  status: 'healthy' | 'warning' | 'error'
  size?: 8 | 10
  'aria-label'?: string
}

export function StatusDot({ 
  status, 
  size = 8, 
  'aria-label': ariaLabel = `status: ${status}` 
}: StatusDotProps) {
  const dotStyle: JSX.CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '50%',
    flexShrink: 0,
    background: (() => {
      switch (status) {
        case 'healthy':
          return 'var(--accent-success)'
        case 'warning':
          return 'var(--kiro-warning)'
        case 'error':
          return 'var(--kiro-danger)'
        default:
          return 'var(--accent-success)'
      }
    })(),
    boxShadow: status === 'healthy' 
      ? '0 0 8px rgba(34,197,94,0.35)' 
      : undefined,
  }

  return (
    <div 
      style={dotStyle}
      role="img"
      aria-label={ariaLabel}
    />
  )
}