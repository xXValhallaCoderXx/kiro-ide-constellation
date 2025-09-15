import { useState, useEffect } from 'preact/hooks'
import { Icon } from './atoms/Icon'
import { getIndexStatus, formatRelativeTime, type IndexStatusData } from '../services/index-status.service'

export function IndexStatusSection() {
  const [status, setStatus] = useState<IndexStatusData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const data = await getIndexStatus()
        setStatus(data)
      } catch (error) {
        console.error('Failed to load index status:', error)
        setStatus(null)
      } finally {
        setLoading(false)
      }
    }

    loadStatus()
    
    // Refresh status every 30 seconds
    const interval = setInterval(loadStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="index-status-section">
        <div className="index-status-header">
          <h3 className="index-status-title">Workspace Index</h3>
          <div className="index-status-spinner">
            <Icon name="refresh" size={16} colorToken="--text-secondary" />
          </div>
        </div>
        <div className="index-status-loading">
          <span className="spinner">⟳</span>
          <span>Loading index status...</span>
        </div>
      </div>
    )
  }

  if (!status) {
    return (
      <div className="index-status-section">
        <div className="index-status-header">
          <h3 className="index-status-title">Workspace Index</h3>
          <Icon name="refresh" size={16} colorToken="--kiro-danger" />
        </div>
        <div className="index-status-error">
          <span>Failed to load index status</span>
        </div>
      </div>
    )
  }

  return (
    <div className="index-status-section">
      <div className="index-status-header">
        <h3 className="index-status-title">Workspace Index</h3>
        <div 
          className={`index-status-indicator ${status.indexed ? 'indexed' : 'not-indexed'}`}
          title={status.indexed ? 'Workspace is indexed' : 'Workspace not indexed'}
        >
          <Icon 
            name={status.indexed ? 'check' : 'clock'} 
            size={16} 
            colorToken={status.indexed ? '--kiro-success' : '--kiro-warning'} 
          />
        </div>
      </div>

      <div className="index-status-grid">
        <div className="index-stat">
          <span className="index-stat-label">Files</span>
          <span className="index-stat-value">{status.files.toLocaleString()}</span>
        </div>
        
        <div className="index-stat">
          <span className="index-stat-label">Dependencies</span>
          <span className="index-stat-value">{status.dependencies.toLocaleString()}</span>
        </div>
        
        <div className="index-stat">
          <span className="index-stat-label">Commits</span>
          <span className="index-stat-value">{status.gitMetrics.commits.toLocaleString()}</span>
        </div>
        
        <div className="index-stat">
          <span className="index-stat-label">Last Updated</span>
          <span 
            className="index-stat-value" 
            title={status.lastIndexed?.toLocaleString() || 'Never'}
          >
            {status.lastIndexed ? formatRelativeTime(status.lastIndexed) : 'Never'}
          </span>
        </div>
      </div>

      {!status.indexed && (
        <div className="index-status-message">
          <Icon name="info" size={16} colorToken="--kiro-info" />
          <span>Run a scan to index your workspace</span>
        </div>
      )}
    </div>
  )
}
