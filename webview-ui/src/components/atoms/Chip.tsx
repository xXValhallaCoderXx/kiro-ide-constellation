import type { JSX } from 'preact'

interface ChipProps {
  label: string
  variant: 'brand' | 'success'
  onClick?: () => void
  selected?: boolean
  ariaPressed?: boolean
}

export function Chip({ label, variant, onClick, selected, ariaPressed }: ChipProps) {
  const bg = variant === 'brand' ? 'var(--surface-tint-brand)' : 'var(--surface-tint-success)'
  const color = variant === 'brand' ? 'var(--accent-purple-soft-text)' : 'var(--accent-green-soft-text)'
  return (
    <button
      class="chip"
      style={{
        background: bg,
        color,
        padding: '0 12px',
        height: '28px',
        borderRadius: 'var(--radius-chip)',
        border: 'none',
        cursor: onClick ? 'pointer' : 'default'
      }}
      onClick={onClick}
      aria-pressed={ariaPressed ?? selected}
    >
      {label}
    </button>
  )
}
