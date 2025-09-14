import { Button } from './Button';
import type { Crumb } from '../services/focus-mode.service';

export interface FocusBreadcrumbProps {
  crumbs: Crumb[];
  onJump: (index: number) => void;
  onReset: () => void;
  onDepthChange?: (delta: 1 | -1) => void;
  currentDepth?: number; // 0 = All
}

export function FocusBreadcrumb({ crumbs, onJump, onReset, onDepthChange, currentDepth }: FocusBreadcrumbProps) {
  if (crumbs.length === 0) {
    return null;
  }

  return (
    <div class="focus-crumbs">
      <div class="focus-crumbs-nav">
        {crumbs.map((crumb, index) => (
          <div key={`${crumb.root}-${index}`} class="focus-crumb-item">
            <button
              class="focus-crumb"
              onClick={() => onJump(index)}
              title={crumb.root}
              type="button"
            >
              <span class="focus-crumb-text">{crumb.label}</span>
            </button>
            {index < crumbs.length - 1 && (
              <span class="focus-crumb-sep" aria-hidden="true">▶</span>
            )}
          </div>
        ))}
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        {onDepthChange && (
          <div class="focus-depth-controls" style="display:flex;align-items:center;gap:6px;">
            <span class="toolbar-label">Depth: {currentDepth === 0 || currentDepth === undefined ? 'All' : String(currentDepth)}</span>
            <Button class="btn-secondary btn-sm" onClick={() => onDepthChange(-1)} type="button" title="Decrease depth">−</Button>
            <Button class="btn-secondary btn-sm" onClick={() => onDepthChange(1)} type="button" title="Increase depth">+</Button>
          </div>
        )}
        <Button 
          class="focus-reset" 
          onClick={onReset}
          type="button"
        >
          Reset
        </Button>
      </div>
    </div>
  );
}