interface MetricBulletProps {
  variant: 'purple' | 'green' | 'neutral'
  text: string
}

export function MetricBullet({ variant, text }: MetricBulletProps) {
  const colorMap = {
    purple: 'var(--text-link)',
    green: 'var(--accent-success)',
    neutral: 'var(--text-secondary)'
  }
  return (
    <span class="metric-bullet">
      <span
        class="metric-bullet-dot"
        style={{ background: colorMap[variant] }}
      />
      <span class="metric-bullet-text">{text}</span>
    </span>
  )
}
