import { IconTile } from '../atoms/IconTile'
import type { IconName } from '../atoms/Icon'
import type { ComponentChildren } from 'preact'

interface ActionCardProps {
  title: string
  subtitle: string
  variant: 'brand' | 'success'
  iconName: IconName
  onClick?: () => void
  disabled?: boolean
  rightSlot?: ComponentChildren
}

export function ActionCard({ title, subtitle, variant, iconName, onClick, disabled, rightSlot }: ActionCardProps) {
  return (
    <button class="action-card" onClick={onClick} disabled={disabled}>
      <IconTile variant={variant} iconName={iconName} />
      <div class="action-card-text">
        <div class="action-card-title">{title}</div>
        <div class="action-card-subtitle">{subtitle}</div>
      </div>
      {rightSlot && <div class="action-card-right">{rightSlot}</div>}
    </button>
  )
}
