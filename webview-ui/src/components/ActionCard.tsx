import { IconTile } from './IconTile'

interface ActionCardProps {
  icon: string
  title: string
  subtitle: string
  accent: 'brand' | 'success'
  onClick?: () => void
  disabled?: boolean
}

export function ActionCard({ icon, title, subtitle, accent, onClick, disabled = false }: ActionCardProps) {
  const handleClick = () => {
    if (!disabled && onClick) {
      onClick()
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      if (onClick) {
        onClick()
      }
    }
  }

  return (
    <div
      class="constellation-action-card"
      role={onClick ? "button" : "presentation"}
      tabIndex={onClick && !disabled ? 0 : -1}
      data-disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown as any}
      aria-disabled={disabled}
    >
      <IconTile accent={accent}>{icon}</IconTile>
      <div class="constellation-action-content">
        <h3 class="constellation-action-title">{title}</h3>
        <p class="constellation-action-subtitle">{subtitle}</p>
      </div>
    </div>
  )
}