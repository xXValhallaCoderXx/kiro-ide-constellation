import { Icon, type IconName } from './Icon'
import type { ComponentChildren } from 'preact'

interface InputFieldProps {
  value: string
  placeholder?: string
  onChange: (value: string) => void
  leadingIcon?: IconName
  trailingSlot?: ComponentChildren
  ariaLabel: string
}

export function InputField({ value, placeholder, onChange, leadingIcon, trailingSlot, ariaLabel }: InputFieldProps) {
  return (
    <div class="input-field">
      {leadingIcon && <Icon name={leadingIcon} size={20} colorToken="--text-secondary" />}
      <input
        class="input-field-input"
        value={value}
        placeholder={placeholder}
        onInput={e => onChange((e.target as HTMLInputElement).value)}
        aria-label={ariaLabel}
      />
      {trailingSlot}
    </div>
  )
}
