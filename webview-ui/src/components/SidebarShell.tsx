import type { ComponentChildren } from 'preact'

interface SidebarShellProps {
  children: ComponentChildren
}

export function SidebarShell({ children }: SidebarShellProps) {
  return (
    <div class="constellation-sidebar">
      {children}
    </div>
  )
}