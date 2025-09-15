import { JSX } from 'preact'

interface StatusDotProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  status: 'healthy' | 'warning' | 'error'
  size?: 8 | 10
  glow?: boolean
  ariaLabel?: string
}

export function StatusDot({ status, size = 8, glow = false, ariaLabel, ...rest }: StatusDotProps) {
  const colorToken = status === 'healthy' ? '--accent-success' : status === 'warning' ? '--vscode-charts-orange' : '--vscode-errorForeground'
  const style: JSX.CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
    backgroundColor: `var(${colorToken}, var(--accent-success))`,
    boxShadow: glow && status === 'healthy' ? '0 0 8px rgba(34,197,94,0.35)' : undefined
  }
  const aria = ariaLabel || `status: ${status}`
  return <span class="status-dot" aria-label={aria} role="status" style={style} {...rest} />
}
