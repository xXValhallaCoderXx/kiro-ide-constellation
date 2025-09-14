import type { ComponentChildren, JSX } from 'preact'

interface ButtonLinkProps {
  children: ComponentChildren
  onClick?: () => void
  href?: string
  disabled?: boolean
}

export function ButtonLink({ 
  children, 
  onClick, 
  href, 
  disabled = false,
  ...rest 
}: ButtonLinkProps & Omit<JSX.HTMLAttributes<HTMLButtonElement | HTMLAnchorElement>, 'onClick' | 'disabled'>) {
  const linkStyle: JSX.CSSProperties = {
    color: 'var(--text-link)',
    textDecoration: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    background: 'transparent',
    border: 'none',
    padding: '0',
    font: 'inherit',
    opacity: disabled ? 0.6 : 1,
    transition: `all var(--duration-fast) var(--ease-ui)`,
  }

  const handleMouseEnter = (e: MouseEvent) => {
    if (!disabled) {
      const target = e.target as HTMLElement
      target.style.textDecoration = 'underline'
    }
  }

  const handleMouseLeave = (e: MouseEvent) => {
    if (!disabled) {
      const target = e.target as HTMLElement
      target.style.textDecoration = 'none'
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
      if (onClick) {
        onClick()
      }
    }
  }

  const commonProps = {
    style: linkStyle,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onFocus: handleFocus,
    onBlur: handleBlur,
    onKeyDown: handleKeyDown,
    ...rest,
  }

  if (href && !disabled) {
    return (
      <a
        href={href}
        {...commonProps}
      >
        {children}
      </a>
    )
  }

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      {...commonProps}
    >
      {children}
    </button>
  )
}