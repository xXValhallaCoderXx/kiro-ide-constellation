import { JSX } from 'preact'

interface ChipProps extends JSX.HTMLAttributes<HTMLButtonElement> {
  label: string
  variant?: 'brand' | 'success'
  selected?: boolean
  ariaPressed?: boolean
}

export function Chip({ label, variant = 'brand', selected, ariaPressed, ...rest }: ChipProps) {
  const className = [
    'chip',
    `chip--${variant}`,
    selected ? 'chip--selected' : '',
    (rest as any).class ?? ''
  ].filter(Boolean).join(' ')
  const props = { ...rest } as any
  delete props.class
  return (
    <button class={className} aria-pressed={ariaPressed ?? selected} {...props}>
      {label}
    </button>
  )
}
