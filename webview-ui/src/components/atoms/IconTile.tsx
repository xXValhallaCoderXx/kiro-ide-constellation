import type { JSX } from 'preact'
import { Icon } from './Icon'

interface IconTileProps {
  variant: 'brand' | 'success'
  iconName: string
  size?: number
}

export function IconTile({ variant, iconName, size = 48 }: IconTileProps) {
  const tileStyle: JSX.CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: 'var(--radius-tile)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    background: variant === 'brand' 
      ? 'var(--surface-tint-brand)' 
      : 'var(--surface-tint-success)',
  }

  const iconColor = variant === 'brand' 
    ? '--accent-brand' 
    : '--accent-success'

  return (
    <div style={tileStyle}>
      <Icon 
        name={iconName} 
        size={24} 
        colorToken={iconColor}
        aria-hidden="true"
      />
    </div>
  )
}