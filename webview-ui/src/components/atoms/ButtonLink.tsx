import type { ComponentChildren } from 'preact'

interface ButtonLinkProps {
  children: ComponentChildren
  onClick?: () => void
  href?: string
  disabled?: boolean
}

export function ButtonLink({ children, onClick, href, disabled }: ButtonLinkProps) {
  if (href) {
    return (
      <a
        class="button-link"
        href={href}
        onClick={onClick}
        aria-disabled={disabled}
      >
        {children}
      </a>
    )
  }
  return (
    <button class="button-link" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}
