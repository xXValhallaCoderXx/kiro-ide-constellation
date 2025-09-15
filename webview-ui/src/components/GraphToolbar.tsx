import { Button } from './Button'
import { getPlaceholderAttributes, isToolbarFeatureEnabled } from '../services/extension-config.service'
import { getSupportedFileTypes } from '../services/graph-styles.service'
import { SearchBar } from './molecules/SearchBar'
import { MetricsInline } from './molecules/MetricsInline'
import { ChipGroup } from './molecules/ChipGroup'
import { ButtonLink } from './atoms/ButtonLink'
import { useState } from 'preact/hooks'

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
  const [searchValue, setSearchValue] = useState('')
  const searchEnabled = isToolbarFeatureEnabled('searchEnabled')
  const filtersEnabled = isToolbarFeatureEnabled('filtersEnabled')

  return (
    <div className="toolbar">
      {/* Row 1: search + actions */}
      <div className="toolbar-row">
        {/* Search Input - Placeholder only (now atom/molecule-based) */}
        <div style={{ flex: 1 }}>
          <SearchBar
            value={searchValue}
            onChange={setSearchValue}
            placeholder="Search files by name or path..."
            ariaLabel="Search graph nodes (coming soon)"
            disabled={!searchEnabled}
            inputTestId="graph-search-input"
            {...(searchEnabled ? {} : { 'aria-disabled': true })}
          />
        </div>

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
            <ButtonLink 
              onClick={onResetImpactView}
              data-testid="graph-reset-view-button"
            >
              ↺ Reset
            </ButtonLink>
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
        {/* Filter Chips - Placeholder using ChipGroup */}
        <div className="toolbar-filters">
          <span className="toolbar-label">Filters:</span>
          <ChipGroup
            chips={fileTypes.map((fileType) => ({ label: fileType, variant: 'brand' as const }))}
            selectMode="none"
            disabled={!filtersEnabled}
            chipTestIdFactory={(chip) => `graph-filter-${chip.label}`}
          />
        </div>
        
        {/* Graph Stats */}
        {(nodeCount !== undefined && edgeCount !== undefined) && (
          <div className="toolbar-stats">
            <MetricsInline items={[
              { variant: 'neutral', text: `${nodeCount} nodes` },
              { variant: 'neutral', text: `${edgeCount} edges` }
            ]} />
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
