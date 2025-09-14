import type { ComponentChildren } from 'preact'
import type { JSX } from 'preact'

interface ButtonProps extends Omit<JSX.HTMLAttributes<HTMLButtonElement>, 'type'> {
  children?: ComponentChildren
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
}

export function Button({ children, onClick, type = 'button', ...rest }: ButtonProps) {
  // Allow callers to provide `class` (Preact) or `className` (JSX typing) variants.
  // We merge with the base .button to preserve existing styling.
  const cls = ((rest as any).class ?? (rest as any).className ?? '').toString().trim()
  const merged = ['button', 'btn', cls].filter(Boolean).join(' ')
  const props = { ...rest } as any
  delete props.className
  return (
    <button class={merged} type={type} onClick={onClick} {...props}>
      {children}
    </button>
  )
}

