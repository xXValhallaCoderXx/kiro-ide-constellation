import { JSX } from 'preact'
import { ButtonIcon } from '../atoms/ButtonIcon'

interface ZoomControlStackProps extends JSX.HTMLAttributes<HTMLDivElement> {
  onZoomIn: () => void
  onZoomOut: () => void
  onFit: () => void
  disabled?: boolean
}

export function ZoomControlStack({ onZoomIn, onZoomOut, onFit, disabled, ...rest }: ZoomControlStackProps) {
  const className = ['zoom-stack', (rest as any).class ?? ''].filter(Boolean).join(' ')
  const props = { ...rest } as any
  delete props.class
  return (
    <div class={className} role="group" aria-label="Zoom controls" {...props}>
      <ButtonIcon iconName="plus" ariaLabel="Zoom in" onClick={onZoomIn} disabled={disabled} />
      <ButtonIcon iconName="minus" ariaLabel="Zoom out" onClick={onZoomOut} disabled={disabled} />
      <ButtonIcon iconName="fullscreen" ariaLabel="Fit to screen" onClick={onFit} disabled={disabled} />
    </div>
  )
}
