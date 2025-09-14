import type { ComponentChildren } from 'preact'

interface SectionHeaderProps {
  label: string
  children?: ComponentChildren
}

export function SectionHeader({ label, children }: SectionHeaderProps) {
  return (
    <div class="constellation-section-header">
      <div class="constellation-section-label">
        {label}
        {children}
      </div>
      <div class="constellation-section-divider" />
    </div>
  )
}