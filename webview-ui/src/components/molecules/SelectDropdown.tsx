import { Icon } from '../atoms/Icon'
import type { ComponentChildren } from 'preact'
import { useState } from 'preact/hooks'
import { Tooltip } from '../atoms/Tooltip'

interface Option { label: string; value: string }

interface SelectDropdownProps {
  label?: string
  options: Option[]
  value: string
  onChange: (value: string) => void
  helpTooltip?: ComponentChildren
}

export function SelectDropdown({ label, options, value, onChange, helpTooltip }: SelectDropdownProps) {
  const [open, setOpen] = useState(false)
  const selected = options.find(o => o.value === value)
  return (
    <div class="select-dropdown" style={{ position: 'relative' }}>
      {label && <label class="select-dropdown-label">{label}</label>}
      <button
        class="select-trigger"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{selected?.label}</span>
        <Icon name="chevron-down" size={16} colorToken="--text-secondary" />
      </button>
      {helpTooltip && (
        <Tooltip content={helpTooltip}>
          <span class="select-help">
            <Icon name="help" size={16} colorToken="--text-secondary" />
          </span>
        </Tooltip>
      )}
      {open && (
        <ul class="select-menu" role="listbox">
          {options.map(opt => (
            <li
              key={opt.value}
              class="select-option"
              role="option"
              aria-selected={opt.value === value}
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
            >
              {opt.label}
              {opt.value === value && (
                <Icon name="check" size={16} colorToken="--accent-success" />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
