import { Icon, type IconName } from './Icon'

interface ButtonIconProps {
  iconName: IconName
  onClick: () => void
  disabled?: boolean
  ariaLabel: string
}

export function ButtonIcon({ iconName, onClick, disabled, ariaLabel }: ButtonIconProps) {
  return (
    <button
      class="button-icon"
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon name={iconName} size={20} colorToken="--text-primary" />
    </button>
  )
}
