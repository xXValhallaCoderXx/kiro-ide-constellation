import { ButtonIcon } from '../atoms/ButtonIcon'

interface ZoomControlStackProps {
  onZoomIn: () => void
  onZoomOut: () => void
  onFit: () => void
  disabled?: boolean
}

export function ZoomControlStack({ onZoomIn, onZoomOut, onFit, disabled }: ZoomControlStackProps) {
  return (
    <div class="zoom-control-stack">
      <ButtonIcon iconName="plus" onClick={onZoomIn} ariaLabel="Zoom in" disabled={disabled} />
      <ButtonIcon iconName="minus" onClick={onZoomOut} ariaLabel="Zoom out" disabled={disabled} />
      <ButtonIcon iconName="fullscreen" onClick={onFit} ariaLabel="Fit" disabled={disabled} />
    </div>
  )
}
