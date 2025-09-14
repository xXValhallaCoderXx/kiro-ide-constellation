import type { ComponentChildren, JSX } from 'preact'
import { IconTile } from '../atoms/IconTile'

interface ActionCardProps {
  title: string
  subtitle: string
  variant: 'brand' | 'success'
  iconName: string
  onClick?: () => void
  disabled?: boolean
  rightSlot?: ComponentChildren
}

export function ActionCard({ 
  title, 
  subtitle, 
  variant, 
  iconName, 
  onClick, 
  disabled = false,
  rightSlot 
}: ActionCardProps) {
  const cardStyle: JSX.CSSProperties = {
    background: 'var(--surface-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-card)',
    boxShadow: 'var(--shadow-card)',
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    cursor: onClick && !disabled ? 'pointer' : 'default',
    transition: `all var(--duration-fast) var(--ease-ui)`,
    opacity: disabled ? 0.6 : 1,
    position: 'relative',
  }

  const contentStyle: JSX.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    minWidth: 0, // Allow text truncation
  }

  const titleStyle: JSX.CSSProperties = {
    color: 'var(--text-primary)',
    fontSize: '14px',
    fontWeight: '500',
    lineHeight: 1.4,
    margin: 0,
  }

  const subtitleStyle: JSX.CSSProperties = {
    color: 'var(--text-secondary)',
    fontSize: '12px',
    lineHeight: 1.4,
    margin: 0,
  }

  const rightSlotStyle: JSX.CSSProperties = {
    flexShrink: 0,
  }

  const handleMouseEnter = (e: MouseEvent) => {
    if (onClick && !disabled) {
      const target = e.currentTarget as HTMLElement
      target.style.background = 'color-mix(in srgb, var(--surface-card) 95%, var(--surface-overlay-04))'
    }
  }

  const handleMouseLeave = (e: MouseEvent) => {
    if (onClick && !disabled) {
      const target = e.currentTarget as HTMLElement
      target.style.background = 'var(--surface-card)'
    }
  }

  const handleMouseDown = (e: MouseEvent) => {
    if (onClick && !disabled) {
      const target = e.currentTarget as HTMLElement
      target.style.background = 'color-mix(in srgb, var(--surface-card) 90%, var(--surface-overlay-08))'
    }
  }

  const handleMouseUp = (e: MouseEvent) => {
    if (onClick && !disabled) {
      const target = e.currentTarget as HTMLElement
      target.style.background = 'color-mix(in srgb, var(--surface-card) 95%, var(--surface-overlay-04))'
    }
  }

  const handleFocus = (e: FocusEvent) => {
    if (onClick && !disabled) {
      const target = e.target as HTMLElement
      target.style.outline = '2px solid var(--border-focus)'
      target.style.outlineOffset = '2px'
    }
  }

  const handleBlur = (e: FocusEvent) => {
    if (onClick && !disabled) {
      const target = e.target as HTMLElement
      target.style.outline = 'none'
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (onClick && !disabled && (e.key === ' ' || e.key === 'Enter')) {
      e.preventDefault()
      onClick()
    }
  }

  const commonProps = {
    style: cardStyle,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onMouseDown: handleMouseDown,
    onMouseUp: handleMouseUp,
    onFocus: handleFocus,
    onBlur: handleBlur,
    onKeyDown: handleKeyDown,
  }

  const content = (
    <>
      <IconTile variant={variant} iconName={iconName} />
      <div style={contentStyle}>
        <h3 style={titleStyle}>{title}</h3>
        <p style={subtitleStyle}>{subtitle}</p>
      </div>
      {rightSlot && <div style={rightSlotStyle}>{rightSlot}</div>}
    </>
  )

  if (onClick && !disabled) {
    return (
      <button
        {...commonProps}
        onClick={onClick}
        disabled={disabled}
      >
        {content}
      </button>
    )
  }

  return (
    <div {...commonProps}>
      {content}
    </div>
  )
}