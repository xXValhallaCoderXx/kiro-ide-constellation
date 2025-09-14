import type { ComponentChildren } from 'preact'
import type { JSX } from 'preact'

interface ButtonProps extends Omit<JSX.HTMLAttributes<HTMLButtonElement>, 'type'> {
  children?: ComponentChildren
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
}

export function Button({ children, onClick, type = 'button', ...rest }: ButtonProps) {
  return (
    <button class="button" type={type} onClick={onClick} {...rest}>
      {children}
    </button>
  )
}

