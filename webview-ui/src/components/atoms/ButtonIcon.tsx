import type { JSX } from 'preact'
import { Icon } from './Icon'

interface ButtonIconProps {
  iconName: string
  onClick: () => void
  disabled?: boolean
  ariaLabel: string
}

export function ButtonIcon({ 
  iconName, 
  onClick, 
  disabled = false, 
  ariaLabel,
  ...rest 
}: ButtonIconProps & Omit<JSX.HTMLAttributes<HTMLButtonElement>, 'onClick' | 'disabled' | 'aria-label'>) {
  const buttonStyle: JSX.CSSProperties = {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255,255,255,0.06)',
    boxShadow: 'var(--shadow-float)',
    transition: `all var(--duration-fast) var(--ease-ui)`,
    opacity: disabled ? 0.6 : 1,
  }

  const handleMouseEnter = (e: MouseEvent) => {
    if (!disabled) {
      const target = e.target as HTMLElement
      target.style.background = 'color-mix(in srgb, rgba(255,255,255,0.06) 90%, var(--surface-overlay-04))'
    }
  }

  const handleMouseLeave = (e: MouseEvent) => {
    if (!disabled) {
      const target = e.target as HTMLElement
      target.style.background = 'rgba(255,255,255,0.06)'
    }
  }

  const handleMouseDown = (e: MouseEvent) => {
    if (!disabled) {
      const target = e.target as HTMLElement
      target.style.background = 'color-mix(in srgb, rgba(255,255,255,0.06) 85%, var(--surface-overlay-08))'
    }
  }

  const handleMouseUp = (e: MouseEvent) => {
    if (!disabled) {
      const target = e.target as HTMLElement
      target.style.background = 'color-mix(in srgb, rgba(255,255,255,0.06) 90%, var(--surface-overlay-04))'
    }
  }

  const handleFocus = (e: FocusEvent) => {
    const target = e.target as HTMLElement
    target.style.outline = '2px solid var(--border-focus)'
    target.style.outlineOffset = '2px'
  }

  const handleBlur = (e: FocusEvent) => {
    const target = e.target as HTMLElement
    target.style.outline = 'none'
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!disabled && (e.key === ' ' || e.key === 'Enter')) {
      e.preventDefault()
      onClick()
    }
  }

  return (
    <button
      style={buttonStyle}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      aria-label={ariaLabel}
      {...rest}
    >
      <Icon 
        name={iconName} 
        size={20} 
        colorToken="--text-primary"
        aria-hidden="true"
      />
    </button>
  )
}