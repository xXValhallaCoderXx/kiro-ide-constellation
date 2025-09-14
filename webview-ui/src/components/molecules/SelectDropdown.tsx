import type { JSX } from 'preact'
import { useState, useRef, useEffect } from 'preact/hooks'
import { Icon } from '../atoms/Icon'
import { Tooltip } from '../atoms/Tooltip'

interface SelectOption {
  label: string
  value: string
}

interface SelectDropdownProps {
  label?: string
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  helpTooltip?: string
  disabled?: boolean
}

export function SelectDropdown({ 
  label, 
  options, 
  value, 
  onChange, 
  helpTooltip,
  disabled = false 
}: SelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const selectRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find(opt => opt.value === value)

  const containerStyle: JSX.CSSProperties = {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: label ? '4px' : '0',
  }

  const labelStyle: JSX.CSSProperties = {
    color: 'var(--text-primary)',
    fontSize: '12px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  }

  const selectStyle: JSX.CSSProperties = {
    height: '40px',
    borderRadius: 'var(--radius-input)',
    background: 'var(--surface-card)',
    border: '1px solid var(--border-subtle)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 12px',
    color: 'var(--text-primary)',
    fontSize: '14px',
    transition: `all var(--duration-fast) var(--ease-ui)`,
    opacity: disabled ? 0.56 : 1,
  }

  const menuStyle: JSX.CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: '4px',
    background: 'var(--surface-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-input)',
    boxShadow: 'var(--shadow-card)',
    zIndex: 1000,
    maxHeight: '200px',
    overflowY: 'auto',
    visibility: isOpen ? 'visible' : 'hidden',
    opacity: isOpen ? 1 : 0,
    transform: isOpen ? 'translateY(0)' : 'translateY(-8px)',
    transition: `all var(--duration-fast) var(--ease-ui)`,
  }

  const optionStyle: JSX.CSSProperties = {
    height: '36px',
    padding: '0 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    color: 'var(--text-primary)',
    fontSize: '14px',
    transition: `background var(--duration-fast) var(--ease-ui)`,
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setFocusedIndex(-1)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSelectClick = () => {
    if (!disabled) {
      setIsOpen(!isOpen)
      setFocusedIndex(-1)
    }
  }

  const handleOptionClick = (option: SelectOption) => {
    onChange(option.value)
    setIsOpen(false)
    setFocusedIndex(-1)
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (disabled) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
          setFocusedIndex(0)
        } else {
          setFocusedIndex(prev => Math.min(prev + 1, options.length - 1))
        }
        break
      case 'ArrowUp':
        e.preventDefault()
        if (isOpen) {
          setFocusedIndex(prev => Math.max(prev - 1, 0))
        }
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
          setFocusedIndex(0)
        } else if (focusedIndex >= 0) {
          handleOptionClick(options[focusedIndex])
        }
        break
      case 'Escape':
        if (isOpen) {
          e.preventDefault()
          setIsOpen(false)
          setFocusedIndex(-1)
        }
        break
    }
  }

  const handleSelectMouseEnter = (e: MouseEvent) => {
    if (!disabled && !isOpen) {
      const target = e.currentTarget as HTMLElement
      target.style.background = 'color-mix(in srgb, var(--surface-card) 95%, var(--surface-overlay-04))'
    }
  }

  const handleSelectMouseLeave = (e: MouseEvent) => {
    if (!disabled) {
      const target = e.currentTarget as HTMLElement
      target.style.background = 'var(--surface-card)'
    }
  }

  const handleFocus = (e: FocusEvent) => {
    if (!disabled) {
      const target = e.target as HTMLElement
      target.style.outline = '2px solid var(--border-focus)'
      target.style.outlineOffset = '2px'
    }
  }

  const handleBlur = (e: FocusEvent) => {
    if (!disabled) {
      const target = e.target as HTMLElement
      target.style.outline = 'none'
    }
  }

  const labelContent = label && (
    <div style={labelStyle}>
      <span>{label}</span>
      {helpTooltip && (
        <Tooltip content={helpTooltip}>
          <Icon name="settings" size={16} colorToken="--text-secondary" />
        </Tooltip>
      )}
    </div>
  )

  return (
    <div style={containerStyle} ref={selectRef}>
      {labelContent}
      <div
        style={selectStyle}
        onClick={handleSelectClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={handleSelectMouseEnter}
        onMouseLeave={handleSelectMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={label || 'Select option'}
      >
        <span>{selectedOption?.label || 'Select...'}</span>
        <Icon 
          name="chevron-down" 
          size={16} 
          colorToken="--text-secondary"
          style={{ 
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: `transform var(--duration-fast) var(--ease-ui)`
          }}
        />
      </div>
      
      <div style={menuStyle} ref={listRef} role="listbox">
        {options.map((option, index) => (
          <div
            key={option.value}
            style={{
              ...optionStyle,
              background: focusedIndex === index ? 'var(--surface-overlay-04)' : 'transparent',
            }}
            onClick={() => handleOptionClick(option)}
            onMouseEnter={() => setFocusedIndex(index)}
            role="option"
            aria-selected={option.value === value}
          >
            <span>{option.label}</span>
            {option.value === value && (
              <Icon name="check" size={16} colorToken="--accent-brand" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}