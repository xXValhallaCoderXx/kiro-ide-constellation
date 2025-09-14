import type { JSX } from 'preact'
import { ButtonIcon } from '../atoms/ButtonIcon'

interface ZoomControlStackProps {
  onZoomIn: () => void
  onZoomOut: () => void
  onFit: () => void
  disabled?: boolean
}

export function ZoomControlStack({ 
  onZoomIn, 
  onZoomOut, 
  onFit, 
  disabled = false 
}: ZoomControlStackProps) {
  const stackStyle: JSX.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  }

  return (
    <div style={stackStyle}>
      <ButtonIcon
        iconName="plus"
        onClick={onZoomIn}
        disabled={disabled}
        ariaLabel="Zoom in"
      />
      <ButtonIcon
        iconName="minus"
        onClick={onZoomOut}
        disabled={disabled}
        ariaLabel="Zoom out"
      />
      <ButtonIcon
        iconName="fullscreen"
        onClick={onFit}
        disabled={disabled}
        ariaLabel="Fit to view"
      />
    </div>
  )
}