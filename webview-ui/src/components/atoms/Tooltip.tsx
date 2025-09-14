import { useState } from 'preact/hooks'
import { cloneElement } from 'preact'
import type { ComponentChildren, VNode } from 'preact'

interface TooltipProps {
  content: ComponentChildren
  children: VNode
  placement?: 'top' | 'bottom'
}

export function Tooltip({ content, children, placement = 'top' }: TooltipProps) {
  const [visible, setVisible] = useState(false)

  const child = cloneElement(children, {
    onMouseEnter: () => {
      children.props?.onMouseEnter?.()
      setVisible(true)
    },
    onMouseLeave: () => {
      children.props?.onMouseLeave?.()
      setVisible(false)
    },
    onFocus: () => {
      children.props?.onFocus?.()
      setVisible(true)
    },
    onBlur: () => {
      children.props?.onBlur?.()
      setVisible(false)
    }
  }) as VNode

  return (
    <span class="tooltip-wrapper" style={{ position: 'relative', display: 'inline-flex' }}>
      {child}
      {visible && (
        <span
          role="tooltip"
          class={`tooltip tooltip-${placement}`}
        >
          {content}
        </span>
      )}
    </span>
  )
}
