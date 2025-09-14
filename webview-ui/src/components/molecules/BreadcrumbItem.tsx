import { Icon } from '../atoms/Icon'

interface BreadcrumbItemProps {
  label: string
  active?: boolean
  onClick: () => void
}

export function BreadcrumbItem({ label, active, onClick }: BreadcrumbItemProps) {
  return (
    <button
      class="breadcrumb-item"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
    >
      {label}
      {!active && <Icon name="chevron-right" size={16} colorToken="--text-secondary" />}
    </button>
  )
}
