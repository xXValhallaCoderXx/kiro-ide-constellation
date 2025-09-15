import { useEffect, useRef, useState } from 'preact/hooks'
import { JSX } from 'preact'
import { InputField } from '../atoms/InputField'
import { KeyboardHintPill } from '../atoms/KeyboardHintPill'

interface SearchBarProps extends JSX.HTMLAttributes<HTMLDivElement> {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  trailingHint?: string | JSX.Element
  debounceMs?: number
  ariaLabel?: string
  disabled?: boolean
  inputTestId?: string
}

export function SearchBar({ value, onChange, placeholder, trailingHint, debounceMs = 250, ariaLabel = 'Search', disabled, inputTestId, ...rest }: SearchBarProps) {
  const [internal, setInternal] = useState(value)
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => setInternal(value), [value])

  useEffect(() => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    timeoutRef.current = window.setTimeout(() => onChange(internal), debounceMs)
    return () => { if (timeoutRef.current) window.clearTimeout(timeoutRef.current) }
  }, [internal])

  const className = ['search-bar', (rest as any).class ?? ''].filter(Boolean).join(' ')
  const props = { ...rest } as any
  delete props.class

  const trailing = typeof trailingHint === 'string'
    ? <KeyboardHintPill label={trailingHint} />
    : trailingHint ?? null

  return (
    <div class={className} {...props}>
      <InputField
        value={internal}
        onChange={setInternal}
        placeholder={placeholder}
        ariaLabel={ariaLabel}
        leadingIcon="search"
        trailingSlot={trailing}
        data-placeholder={disabled ? 'true' : undefined}
        inputProps={inputTestId ? { 'data-testid': inputTestId } as any : undefined}
      />
    </div>
  )
}
