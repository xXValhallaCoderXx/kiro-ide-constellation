import { JSX } from 'preact'
import { Icon, IconName } from './Icon'

interface ButtonIconProps extends JSX.HTMLAttributes<HTMLButtonElement> {
  iconName: IconName
  ariaLabel: string
  disabled?: boolean
}

export function ButtonIcon({ iconName, ariaLabel, disabled, ...rest }: ButtonIconProps) {
  const className = ['button-icon', (rest as any).class ?? ''].filter(Boolean).join(' ')
  const props = { ...rest } as any
  delete props.class
  return (
    <button class={className} aria-label={ariaLabel} disabled={disabled} {...props}>
      <Icon name={iconName} size={20} colorToken={'--text-primary'} />
    </button>
  )
}
