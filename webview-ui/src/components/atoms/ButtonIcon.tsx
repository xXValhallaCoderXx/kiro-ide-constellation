import { JSX } from 'preact'
import { Icon, IconName } from './Icon'

interface ButtonIconProps extends JSX.HTMLAttributes<HTMLButtonElement> {
  iconName: IconName
  ariaLabel: string
  disabled?: boolean
  size?: number // button square size in px, default 40
}

export function ButtonIcon({ iconName, ariaLabel, disabled, size = 40, ...rest }: ButtonIconProps) {
  const className = ['button-icon', (rest as any).class ?? ''].filter(Boolean).join(' ')
  const props = { ...rest } as any
  delete props.class
  const style = { width: `${size}px`, height: `${size}px` } as any
  const iconSize = size >= 40 ? 20 : 16
  return (
    <button class={className} aria-label={ariaLabel} disabled={disabled} style={style} {...props}>
      <Icon name={iconName} size={iconSize as 16 | 20 | 24} colorToken={'--text-primary'} />
    </button>
  )
}
