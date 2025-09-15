import { JSX } from 'preact'

interface MetricBulletProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  variant?: 'purple' | 'green' | 'neutral'
  text: string
}

export function MetricBullet({ variant = 'neutral', text, ...rest }: MetricBulletProps) {
  const className = ['metric-bullet', `metric-bullet--${variant}`, (rest as any).class ?? '']
    .filter(Boolean)
    .join(' ')
  const props = { ...rest } as any
  delete props.class
  return (
    <span class={className} {...props}>
      <span class="metric-dot" aria-hidden="true" />
      <span class="metric-text">{text}</span>
    </span>
  )
}
