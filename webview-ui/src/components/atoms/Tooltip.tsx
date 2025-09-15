import { useState } from 'preact/hooks'
import { JSX } from 'preact'

interface TooltipProps {
  content: JSX.Element | string
  children: JSX.Element
  placement?: 'top' | 'bottom' | 'left' | 'right'
}

export function Tooltip({ content, children, placement = 'top' }: TooltipProps) {
  const [open, setOpen] = useState(false)
  const id = `tooltip-${Math.random().toString(36).slice(2, 9)}`

  return (
    <span
      class="tooltip-trigger"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      aria-describedby={open ? id : undefined}
    >
      {children}
      {open && (
        <span role="tooltip" id={id} class={`tooltip-content tooltip-${placement}`}> 
          {content}
        </span>
      )}
    </span>
  )
}
