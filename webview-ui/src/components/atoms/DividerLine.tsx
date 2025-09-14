import type { JSX } from 'preact'

interface DividerLineProps {
  orientation?: 'horizontal' | 'vertical'
}

export function DividerLine({ orientation = 'horizontal' }: DividerLineProps) {
  const dividerStyle: JSX.CSSProperties = {
    background: 'rgba(255,255,255,0.08)',
    border: 'none',
    flexShrink: 0,
    ...(orientation === 'horizontal' 
      ? {
          width: '100%',
          height: '1px',
        }
      : {
          width: '1px',
          height: '100%',
        }
    ),
  }

  return <div style={dividerStyle} />
}