import type { JSX, ComponentChildren } from 'preact'
import { Icon } from './Icon'

interface InputFieldProps {
  value: string
  placeholder?: string
  onChange: (value: string) => void
  leadingIcon?: string
  trailingSlot?: ComponentChildren
  ariaLabel?: string
  disabled?: boolean
}

export function InputField({ 
  value, 
  placeholder, 
  onChange, 
  leadingIcon, 
  trailingSlot, 
  ariaLabel,
  disabled = false,
  ...rest 
}: InputFieldProps & Omit<JSX.HTMLAttributes<HTMLInputElement>, 'value' | 'placeholder' | 'onChange' | 'disabled'>) {
  const containerStyle: JSX.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    height: '42px',
    borderRadius: 'var(--radius-input)',
    background: 'var(--surface-input)',
    border: '1px solid var(--border-subtle)',
    transition: `all var(--duration-fast) var(--ease-ui)`,
    position: 'relative',
  }

  const inputStyle: JSX.CSSProperties = {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--text-primary)',
    fontSize: '14px',
    padding: leadingIcon ? '0 12px 0 8px' : '0 12px',
    height: '100%',
  }

  const placeholderStyle = `
    ::placeholder {
      color: #9B97AC;
    }
  `

  const handleFocus = (e: FocusEvent) => {
    const container = (e.target as HTMLElement).parentElement
    if (container) {
      container.style.border = '2px solid var(--border-focus)'
      container.style.outline = 'none'
    }
  }

  const handleBlur = (e: FocusEvent) => {
    const container = (e.target as HTMLElement).parentElement
    if (container) {
      container.style.border = '1px solid var(--border-subtle)'
    }
  }

  const handleMouseEnter = (e: MouseEvent) => {
    if (!disabled) {
      const container = e.currentTarget as HTMLElement
      if (!container.querySelector('input:focus')) {
        container.style.background = 'color-mix(in srgb, var(--surface-input) 95%, var(--surface-overlay-04))'
      }
    }
  }

  const handleMouseLeave = (e: MouseEvent) => {
    if (!disabled) {
      const container = e.currentTarget as HTMLElement
      container.style.background = 'var(--surface-input)'
    }
  }

  return (
    <>
      <style>{placeholderStyle}</style>
      <div 
        style={{
          ...containerStyle,
          opacity: disabled ? 0.6 : 1,
          cursor: disabled ? 'not-allowed' : 'text',
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {leadingIcon && (
          <div style={{ padding: '0 8px', display: 'flex', alignItems: 'center' }}>
            <Icon 
              name={leadingIcon} 
              size={16} 
              colorToken="--text-secondary"
              aria-hidden="true"
            />
          </div>
        )}
        <input
          style={inputStyle}
          value={value}
          placeholder={placeholder}
          onChange={(e) => !disabled && onChange((e.target as HTMLInputElement).value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          aria-label={ariaLabel}
          {...rest}
        />
        {trailingSlot && (
          <div style={{ padding: '0 8px', display: 'flex', alignItems: 'center' }}>
            {trailingSlot}
          </div>
        )}
      </div>
    </>
  )
}