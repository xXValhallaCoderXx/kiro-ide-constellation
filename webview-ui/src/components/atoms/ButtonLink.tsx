import { ComponentChildren, JSX } from 'preact'

interface ButtonLinkProps extends JSX.HTMLAttributes<HTMLButtonElement> {
  children?: ComponentChildren
  disabled?: boolean
}

export function ButtonLink({ children, disabled, ...rest }: ButtonLinkProps) {
  const className = ['button-link', (rest as any).class ?? ''].filter(Boolean).join(' ')
  const props = { ...rest } as any
  delete props.class
  return (
    <button class={className} disabled={disabled} {...props}>
      {children}
    </button>
  )
}
