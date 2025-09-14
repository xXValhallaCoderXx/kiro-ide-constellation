import type { JSX } from 'preact'
import { Icon } from '../atoms/Icon'

interface BreadcrumbItemProps {
  label: string
  active?: boolean
  onClick: () => void
}

export function BreadcrumbItem({ 
  label, 
  active = false, 
  onClick 
}: BreadcrumbItemProps) {
  const itemStyle: JSX.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    fontSize: '12px',
    textDecoration: 'none',
    padding: '4px 8px',
    borderRadius: '4px',
    transition: `all var(--duration-fast) var(--ease-ui)`,
  }

  const handleMouseEnter = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    target.style.textDecoration = 'underline'
  }

  const handleMouseLeave = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    target.style.textDecoration = 'none'
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
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      onClick()
    }
  }

  return (
    <button
      style={itemStyle}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      aria-current={active ? 'page' : undefined}
    >
      <span>{label}</span>
      {!active && (
        <Icon 
          name="chevron-right" 
          size={16} 
          colorToken="--text-secondary"
          aria-hidden="true"
        />
      )}
    </button>
  )
}