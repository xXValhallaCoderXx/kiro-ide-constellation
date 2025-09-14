interface DividerLineProps {
  orientation?: 'horizontal' | 'vertical'
}

export function DividerLine({ orientation = 'horizontal' }: DividerLineProps) {
  if (orientation === 'vertical') {
    return <div style={{ width: '1px', background: 'var(--surface-overlay-08)', alignSelf: 'stretch' }} />
  }
  return <hr style={{ border: 'none', borderTop: '1px solid var(--surface-overlay-08)' }} />
}
