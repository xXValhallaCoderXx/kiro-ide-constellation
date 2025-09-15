import { Icon, IconName } from './Icon'
import { JSX } from 'preact'

interface IconTileProps extends JSX.HTMLAttributes<HTMLDivElement> {
  variant?: 'brand' | 'success'
  iconName: IconName
  size?: number // tile size (defaults 48)
}

export function IconTile({ variant = 'brand', iconName, size = 48, ...rest }: IconTileProps) {
  const style: JSX.CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: 'var(--radius-tile)'
  }
  const className = `icon-tile icon-tile--${variant} ${(rest as any).class ?? ''}`.trim()
  const props = { ...rest } as any
  delete props.class
  return (
    <div class={className} style={style} {...props}>
      <Icon name={iconName} size={24} colorToken={variant === 'brand' ? '--accent-brand' : '--accent-success'} />
    </div>
  )
}
