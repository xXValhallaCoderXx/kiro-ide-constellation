import { JSX } from 'preact'
import { MetricBullet } from '../atoms/MetricBullet'

export type MetricItem = { variant: 'purple' | 'green' | 'neutral'; text: string }

interface MetricsInlineProps extends JSX.HTMLAttributes<HTMLDivElement> {
  items: MetricItem[]
}

export function MetricsInline({ items, ...rest }: MetricsInlineProps) {
  return (
    <div class="metrics-inline" {...rest}>
      {items.map((it, i) => (
        <span class="metrics-inline-item" key={`${it.variant}-${i}`}>
          <MetricBullet variant={it.variant} text={it.text} />
          {i < items.length - 1 && <span class="metrics-sep" aria-hidden>•</span>}
        </span>
      ))}
    </div>
  )
}
