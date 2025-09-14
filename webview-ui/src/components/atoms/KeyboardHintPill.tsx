import type { JSX } from 'preact'

interface KeyboardHintPillProps {
  label: string
}

export function KeyboardHintPill({ label }: KeyboardHintPillProps) {
  const pillStyle: JSX.CSSProperties = {
    height: '26px',
    padding: '0 8px',
    borderRadius: 'var(--radius-chip)',
    background: 'rgba(255,255,255,0.06)',
    color: '#CFCDE1',
    fontSize: '11px',
    fontWeight: '500',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    fontFamily: 'monospace',
  }

  return (
    <span style={pillStyle}>
      {label}
    </span>
  )
}