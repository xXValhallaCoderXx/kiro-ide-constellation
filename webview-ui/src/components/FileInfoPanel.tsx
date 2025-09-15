import { useMemo } from 'preact/hooks'
import { ButtonIcon } from './atoms/ButtonIcon'

interface FileGitMetrics90d {
  commitCount: number
  churn: number
  lastModifiedAt: number | null
  authorCount: number
  primaryAuthor?: string
}

interface NodeInfoPanelProps {
  nodeId: string
  node: { id: string; label: string; path: string } | null
  inDegree: number
  outDegree: number
  metrics?: FileGitMetrics90d
  metricsReady?: boolean
  onOpenFile: () => void
  onClose: () => void
}

function formatRelative(ts: number | null): string {
  if (!ts) return '—'
  const now = Date.now()
  const d = new Date(ts * 1000)
  const diff = Math.floor((now - d.getTime()) / (1000 * 60)) // minutes
  if (diff < 60) return `${diff}m ago`
  const hours = Math.floor(diff / 60)
  if (hours < 48) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 60) return `${days}d ago`
  return d.toLocaleDateString()
}

export function FileInfoPanel({ nodeId, node, inDegree, outDegree, metrics, metricsReady, onOpenFile, onClose }: NodeInfoPanelProps) {
  const title = node?.label || nodeId.split('/').slice(-1)[0]
  const rawId = node?.id || nodeId
  const isAbsolute = rawId.startsWith('/') || /^[A-Za-z]:[\\\/]/.test(rawId)
  const looksOutside = rawId.startsWith('..')
  const displayPath = (!isAbsolute && !looksOutside)
    ? rawId
    : (node?.label || rawId.split(/[\\\/]/).slice(-1)[0] || rawId)
  const tooltipPath = node?.path || rawId

  const metricItems = useMemo(() => {
    if (!metricsReady) return 'loading'
    if (!metrics) return 'none'
    return 'ok'
  }, [metricsReady, metrics])

  return (
    <div className="file-info-panel" role="dialog" aria-label="File details">
      <div className="file-info-header">
        <div className="file-info-titles">
          <div className="file-info-title">{title}</div>
          <div className="file-info-path" title={tooltipPath}>{displayPath}{(isAbsolute || looksOutside) && '  (outside workspace)'}</div>
        </div>
        <span className="file-info-close">
<ButtonIcon iconName="close" ariaLabel="Close" onClick={onClose} size={28} />
        </span>
      </div>

      <div className="file-info-section">
        <div className="file-info-stat"><span className="label">Imports</span><span className="value">{outDegree}</span></div>
        <div className="file-info-stat"><span className="label">Imported by</span><span className="value">{inDegree}</span></div>
      </div>

      <div className="file-info-section">
        <div className="file-info-section-title">Git (90 days)</div>
        {metricItems === 'loading' && (
          <div className="file-info-empty">Loading metrics…</div>
        )}
        {metricItems === 'none' && (
          <div className="file-info-empty">No Git data available</div>
        )}
        {metricItems === 'ok' && metrics && (
          <div className="file-info-grid">
            <div className="file-info-stat"><span className="label">Commits</span><span className="value">{metrics.commitCount}</span></div>
            <div className="file-info-stat"><span className="label">Churn</span><span className="value">{metrics.churn}</span></div>
            <div className="file-info-stat"><span className="label">Authors</span><span className="value">{metrics.authorCount}</span></div>
            <div className="file-info-stat"><span className="label">Last change</span><span className="value">{formatRelative(metrics.lastModifiedAt)}</span></div>
            {metrics.primaryAuthor && (
              <div className="file-info-stat"><span className="label">Primary</span><span className="value">{metrics.primaryAuthor}</span></div>
            )}
          </div>
        )}
      </div>

      <div className="file-info-actions">
        <button className="btn btn-primary btn-sm" onClick={onOpenFile}>Open file</button>
      </div>
    </div>
  )
}
