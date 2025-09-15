import { JSX } from 'preact'
import { Icon, IconName } from './Icon'

interface InputFieldProps extends Omit<JSX.HTMLAttributes<HTMLInputElement>, 'size'> {
  value: string
  placeholder?: string
  onChange: (value: string) => void
  ariaLabel: string
  leadingIcon?: IconName
  trailingSlot?: JSX.Element | null
  inputProps?: JSX.HTMLAttributes<HTMLInputElement>
}

export function InputField({ value, placeholder, onChange, ariaLabel, leadingIcon, trailingSlot, inputProps, ...rest }: InputFieldProps) {
  const hasLeading = Boolean(leadingIcon)
  const className = ['input-field', (rest as any).class ?? ''].filter(Boolean).join(' ')
  const props = { ...rest } as any
  delete props.class
  return (
    <div class={className} {...props}>
      {hasLeading && (
        <span class="input-leading" aria-hidden="true">
          <Icon name={leadingIcon!} size={20} colorToken="--text-secondary" />
        </span>
      )}
      <input
        class="input-element"
        type="text"
        value={value}
        onInput={(e) => onChange((e.target as HTMLInputElement).value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        {...(inputProps || {})}
      />
      {trailingSlot && <span class="input-trailing">{trailingSlot}</span>}
    </div>
  )
}
