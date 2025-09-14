import { Icon, type IconName } from './Icon'

interface IconTileProps {
  variant: 'brand' | 'success'
  iconName: IconName
  size?: number
}

export function IconTile({ variant, iconName, size = 48 }: IconTileProps) {
  const bg = variant === 'brand' ? 'var(--surface-tint-brand)' : 'var(--surface-tint-success)'
  const color = variant === 'brand' ? '--accent-brand' : '--accent-success'
  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: 'var(--radius-tile)',
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <Icon name={iconName} size={24} colorToken={color} />
    </div>
  )
}
