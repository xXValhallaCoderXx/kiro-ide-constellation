import { MetricBullet } from '../atoms/MetricBullet'

interface Item { variant: 'purple' | 'green' | 'neutral'; text: string }

interface MetricsInlineProps {
  items: Item[]
}

export function MetricsInline({ items }: MetricsInlineProps) {
  return (
    <div class="metrics-inline">
      {items.map((item, i) => (
        <span key={i} class="metrics-inline-item">
          <MetricBullet variant={item.variant} text={item.text} />
          {i < items.length - 1 && <span class="metrics-inline-sep">•</span>}
        </span>
      ))}
    </div>
  )
}
