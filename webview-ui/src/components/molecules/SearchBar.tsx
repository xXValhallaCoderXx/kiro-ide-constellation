import type { JSX } from 'preact'
import { InputField } from '../atoms/InputField'
import { Icon } from '../atoms/Icon'
import { KeyboardHintPill } from '../atoms/KeyboardHintPill'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  trailingHint?: string
}

export function SearchBar({ 
  value, 
  onChange, 
  placeholder = 'Search...',
  trailingHint 
}: SearchBarProps) {
  return (
    <InputField
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      leadingIcon="search"
      trailingSlot={trailingHint ? (
        <>
          <Icon name="settings" size={16} colorToken="--text-secondary" />
          <KeyboardHintPill label={trailingHint} />
        </>
      ) : (
        <Icon name="settings" size={16} colorToken="--text-secondary" />
      )}
      ariaLabel="Search input"
    />
  )
}