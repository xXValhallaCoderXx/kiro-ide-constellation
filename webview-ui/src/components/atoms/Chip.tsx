import type { JSX } from 'preact'

interface ChipProps {
  label: string
  variant: 'brand' | 'success'
  onClick?: () => void
  selected?: boolean
  'aria-pressed'?: boolean
}

export function Chip({ 
  label, 
  variant, 
  onClick, 
  selected = false,
  'aria-pressed': ariaPressed,
  ...rest 
}: ChipProps & Omit<JSX.HTMLAttributes<HTMLButtonElement>, 'onClick'>) {
  const chipStyle: JSX.CSSProperties = {
    height: '28px',
    padding: '0 12px',
    borderRadius: 'var(--radius-chip)',
    border: 'none',
    cursor: onClick ? 'pointer' : 'default',
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: '12px',
    fontWeight: '500',
    transition: `background-color var(--duration-fast) var(--ease-ui)`,
    background: (() => {
      const baseColor = variant === 'brand' 
        ? 'var(--surface-tint-brand)' 
        : 'var(--surface-tint-success)'
      
      if (selected) {
        return `color-mix(in srgb, ${baseColor} 80%, var(--surface-overlay-04))`
      }
      return baseColor
    })(),
    color: variant === 'brand' 
      ? 'var(--accent-purple-soft-text)' 
      : 'var(--accent-green-soft-text)',
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (onClick && (e.key === ' ' || e.key === 'Enter')) {
      e.preventDefault()
      onClick()
    }
  }

  const handleMouseEnter = (e: MouseEvent) => {
    if (onClick) {
      const target = e.target as HTMLElement
      target.style.background = `color-mix(in srgb, ${chipStyle.background} 90%, var(--surface-overlay-04))`
    }
  }

  const handleMouseLeave = (e: MouseEvent) => {
    if (onClick) {
      const target = e.target as HTMLElement
      target.style.background = chipStyle.background as string
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

  if (onClick) {
    return (
      <button
        style={chipStyle}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        aria-pressed={ariaPressed ?? selected}
        {...rest}
      >
        {label}
      </button>
    )
  }

  return (
    <span style={chipStyle} {...rest}>
      {label}
    </span>
  )
}