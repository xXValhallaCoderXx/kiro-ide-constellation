interface StatusDotProps {
  status: 'healthy' | 'warning' | 'error'
  size: 8 | 10
}

export function StatusDot({ status, size }: StatusDotProps) {
  const colorMap = {
    healthy: 'var(--accent-success)',
    warning: 'var(--kiro-warning, #ffcc00)',
    error: 'var(--kiro-danger, #f48771)'
  }
  const shadow =
    status === 'healthy' ? '0 0 8px rgba(34, 197, 94, 0.35)' : undefined
  return (
    <span
      role="status"
      aria-label={`status: ${status}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        background: colorMap[status],
        boxShadow: shadow,
        display: 'inline-block'
      }}
    />
  )
}
