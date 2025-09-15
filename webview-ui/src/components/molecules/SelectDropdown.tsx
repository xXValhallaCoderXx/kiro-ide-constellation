import { JSX } from 'preact'
import { Icon } from '../atoms/Icon'
import { Tooltip } from '../atoms/Tooltip'

export interface SelectOption { label: string; value: string; disabled?: boolean }

interface SelectDropdownProps extends JSX.HTMLAttributes<HTMLDivElement> {
  label?: string
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  helpTooltip?: string | JSX.Element
  disabled?: boolean
}

export function SelectDropdown({ label, options, value, onChange, helpTooltip, disabled, ...rest }: SelectDropdownProps) {
  const className = ['select-dropdown', (rest as any).class ?? ''].filter(Boolean).join(' ')
  const props = { ...rest } as any
  delete props.class

  return (
    <div class={className} {...props}>
      {label && (
        <div class="select-label">
          <span>{label}</span>
          {helpTooltip && (
            <Tooltip content={helpTooltip}>
              <span class="select-help" aria-hidden>
                <Icon name="help" size={16} colorToken="--text-secondary" />
              </span>
            </Tooltip>
          )}
        </div>
      )}
      <div class="select-shell">
        <select
          class="select-element"
          value={value}
          onChange={(e) => onChange((e.target as HTMLSelectElement).value)}
          disabled={disabled}
          aria-label={label}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>{opt.label}</option>
          ))}
        </select>
        <span class="select-chevron" aria-hidden>
          <Icon name="chevron-down" size={16} colorToken="--text-secondary" />
        </span>
      </div>
    </div>
  )
}
