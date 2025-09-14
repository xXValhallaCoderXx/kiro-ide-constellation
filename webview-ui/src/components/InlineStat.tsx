interface InlineStatProps {
  icon: string
  value: string | number
}

export function InlineStat({ icon, value }: InlineStatProps) {
  return (
    <div class="constellation-inline-stat">
      <span class="constellation-inline-stat-icon">{icon}</span>
      <span>{value}</span>
    </div>
  )
}