import type { ComponentChildren, JSX } from 'preact'
import { useState } from 'preact/hooks'

interface TooltipProps {
  content: string
  children: ComponentChildren
  placement?: 'top' | 'bottom' | 'left' | 'right'
}

export function Tooltip({ content, children, placement = 'top' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)

  const tooltipStyle: JSX.CSSProperties = {
    position: 'absolute',
    background: 'var(--surface-card)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '10px',
    padding: '8px 12px',
    color: '#EDEAF8',
    fontSize: '12px',
    lineHeight: 1.4,
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    whiteSpace: 'nowrap',
    zIndex: 1000,
    pointerEvents: 'none',
    opacity: isVisible ? 1 : 0,
    visibility: isVisible ? 'visible' : 'hidden',
    transition: `opacity var(--duration-fast) var(--ease-ui), visibility var(--duration-fast) var(--ease-ui)`,
    // Position based on placement
    ...(() => {
      switch (placement) {
        case 'top':
          return {
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%) translateY(-8px)',
          }
        case 'bottom':
          return {
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%) translateY(8px)',
          }
        case 'left':
          return {
            right: '100%',
            top: '50%',
            transform: 'translateY(-50%) translateX(-8px)',
          }
        case 'right':
          return {
            left: '100%',
            top: '50%',
            transform: 'translateY(-50%) translateX(8px)',
          }
        default:
          return {}
      }
    })(),
  }

  const containerStyle: JSX.CSSProperties = {
    position: 'relative',
    display: 'inline-block',
  }

  const handleMouseEnter = () => {
    setIsVisible(true)
  }

  const handleMouseLeave = () => {
    setIsVisible(false)
  }

  const handleFocus = () => {
    setIsVisible(true)
  }

  const handleBlur = () => {
    setIsVisible(false)
  }

  return (
    <div 
      style={containerStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {children}
      <div 
        style={tooltipStyle}
        role="tooltip"
        aria-hidden={!isVisible}
      >
        {content}
      </div>
    </div>
  )
}