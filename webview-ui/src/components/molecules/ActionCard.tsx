import { JSX } from 'preact'
import { IconTile } from '../atoms/IconTile'
import { IconName } from '../atoms/Icon'

interface ActionCardProps extends JSX.HTMLAttributes<HTMLButtonElement> {
  title: string
  subtitle?: string
  variant?: 'brand' | 'success'
  iconName: IconName
  rightSlot?: JSX.Element | null
  disabled?: boolean
}

export function ActionCard({ title, subtitle, variant = 'brand', iconName, rightSlot, disabled, ...rest }: ActionCardProps) {
  const className = ['action-card', (rest as any).class ?? ''].filter(Boolean).join(' ')
  const props = { ...rest } as any
  delete props.class
  return (
    <button class={className} disabled={disabled} {...props}>
      <IconTile variant={variant} iconName={iconName} />
      <div class="action-text">
        <div class="action-title">{title}</div>
        {subtitle && <div class="action-subtitle">{subtitle}</div>}
      </div>
      {rightSlot && <div class="action-right">{rightSlot}</div>}
    </button>
  )
}
