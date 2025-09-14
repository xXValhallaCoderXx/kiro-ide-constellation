import type { JSX } from 'preact'

interface MiniMapPanelProps {
  title?: string
  hasViewport?: boolean
}

export function MiniMapPanel({ 
  title = 'Mini-map', 
  hasViewport = false 
}: MiniMapPanelProps) {
  const panelStyle: JSX.CSSProperties = {
    background: 'var(--surface-card)',
    border: '1px solid var(--border-strong)',
    borderRadius: 'var(--radius-card)',
    padding: '16px',
    minHeight: '120px',
    position: 'relative',
  }

  const titleStyle: JSX.CSSProperties = {
    color: 'var(--text-primary)',
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: hasViewport ? '12px' : '0',
  }

  const viewportStyle: JSX.CSSProperties = {
    position: 'absolute',
    top: '40px',
    left: '16px',
    right: '16px',
    bottom: '16px',
    border: '2px solid var(--border-strong)',
    background: 'var(--surface-overlay-04)',
    borderRadius: '4px',
    pointerEvents: 'none',
  }

  return (
    <div style={panelStyle}>
      <div style={titleStyle}>{title}</div>
      {hasViewport && <div style={viewportStyle} />}
    </div>
  )
}