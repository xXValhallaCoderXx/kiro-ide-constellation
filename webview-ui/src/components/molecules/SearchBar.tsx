import { useEffect, useState } from 'preact/hooks'
import { InputField } from '../atoms/InputField'
import { KeyboardHintPill } from '../atoms/KeyboardHintPill'
import { Icon } from '../atoms/Icon'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  trailingHint?: string
  ariaLabel?: string
}

export function SearchBar({ value, onChange, placeholder, trailingHint, ariaLabel = 'search' }: SearchBarProps) {
  const [internal, setInternal] = useState(value)

  useEffect(() => {
    const t = setTimeout(() => onChange(internal), 300)
    return () => clearTimeout(t)
  }, [internal])

  return (
    <InputField
      value={internal}
      placeholder={placeholder}
      onChange={setInternal}
      leadingIcon="search"
      trailingSlot={
        trailingHint ? (
          <KeyboardHintPill label={trailingHint} />
        ) : (
          <Icon name="settings" size={20} colorToken="--text-secondary" />
        )
      }
      ariaLabel={ariaLabel}
    />
  )
}
