import { JSX } from 'preact'

interface BreadcrumbItemProps extends JSX.HTMLAttributes<HTMLButtonElement> {
  label: string
  active?: boolean
}

export function BreadcrumbItem({ label, active, ...rest }: BreadcrumbItemProps) {
  const className = ['breadcrumb-item', active ? 'is-active' : '', (rest as any).class ?? '']
    .filter(Boolean)
    .join(' ')
  const props = { ...rest } as any
  delete props.class
  return (
    <button class={className} aria-current={active ? 'page' : undefined} {...props}>
      {label}
    </button>
  )
}
