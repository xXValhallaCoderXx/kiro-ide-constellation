import { Button } from './Button'
import { getPlaceholderAttributes, isToolbarFeatureEnabled } from '../services/extension-config.service'
import { getSupportedFileTypes, getFileTypeLabel } from '../services/graph-styles.service'

interface ImpactState {
  isActive: boolean
  data?: {
    sourceFile: string
    affectedFiles: string[]
  }
}

interface GraphToolbarProps {
  onRescan: () => void
  nodeCount?: number
  edgeCount?: number
  isOptimized?: boolean
  impactState?: ImpactState
  onResetImpactView?: () => void
}

export function GraphToolbar({ onRescan, nodeCount, edgeCount, isOptimized, impactState, onResetImpactView }: GraphToolbarProps) {
  const fileTypes = getSupportedFileTypes()

  return (
    <div className="toolbar">
      {/* Row 1: search + actions */}
      <div className="toolbar-row">
        {/* Search Input - Placeholder only */}
        <input
          type="text"
          className="toolbar-input"
          placeholder="Search files by name or path..."
          readOnly
          aria-label="Search graph nodes (coming soon)"
          {...getPlaceholderAttributes(isToolbarFeatureEnabled('searchEnabled'))}
          data-testid="graph-search-input"
        />

        {/* Action Buttons */}
        <div className="toolbar-actions">
          <button
            className="toolbar-button"
            title="Fit graph to view (coming soon)"
            aria-label="Fit graph to view"
            {...getPlaceholderAttributes(isToolbarFeatureEnabled('fitEnabled'))}
            data-testid="graph-fit-button"
          >
            {/* simple inline icon */}
            <span aria-hidden>⤢</span> Fit
          </button>

          {/* Reset View Button - Only show when impact filter is active */}
          {impactState?.isActive && onResetImpactView && (
            <Button 
              onClick={onResetImpactView}
              data-testid="graph-reset-view-button"
              class="btn-secondary btn-sm"
            >
              ↺ Reset
            </Button>
          )}

          <div className="toolbar-dropdown">
            <button
              className="toolbar-button toolbar-dropdown-button"
              title="Change graph layout (coming soon)"
              aria-label="Change graph layout"
              {...getPlaceholderAttributes(isToolbarFeatureEnabled('layoutEnabled'))}
              data-testid="graph-layout-button"
            >
              ⚙ Layout ▼
            </button>
          </div>

          {/* Re-scan Button - Functional */}
          <Button onClick={onRescan} data-testid="graph-rescan-button" class="btn-primary btn-sm">
            ⟳ Re-scan
          </Button>
        </div>
      </div>
      
      {/* Row 2: filters + stats */}
      <div className="toolbar-row">
        {/* Filter Chips - Placeholders */}
        <div className="toolbar-filters">
          <span className="toolbar-label">Filters:</span>
          {fileTypes.map((fileType) => (
            <button
              key={fileType}
              className="toolbar-chip"
              title={`Filter ${getFileTypeLabel(fileType)} files (coming soon)`}
              aria-label={`Filter ${getFileTypeLabel(fileType)} files`}
              {...getPlaceholderAttributes(isToolbarFeatureEnabled('filtersEnabled'))}
              data-testid={`graph-filter-${fileType}`}
            >
              {fileType}
            </button>
          ))}
        </div>
        
        {/* Graph Stats */}
        {(nodeCount !== undefined && edgeCount !== undefined) && (
          <div className="toolbar-stats">
            <span className="toolbar-stat">
              {nodeCount} nodes • {edgeCount} edges
            </span>
            {isOptimized && (
              <span className="toolbar-stat toolbar-stat-optimized">
                (optimized)
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
