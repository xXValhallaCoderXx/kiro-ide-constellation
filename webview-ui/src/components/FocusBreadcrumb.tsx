import { Button } from './Button';
import { ButtonIcon } from './atoms/ButtonIcon';
import { ButtonLink } from './atoms/ButtonLink';
import { BreadcrumbItem } from './molecules/BreadcrumbItem';
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
            <BreadcrumbItem
              label={crumb.label}
              onClick={() => onJump(index)}
              title={crumb.root}
              type="button"
            />
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
            <ButtonIcon class="btn-sm" iconName="minus" ariaLabel="Decrease depth" onClick={() => onDepthChange(-1)} />
            <ButtonIcon class="btn-sm" iconName="plus" ariaLabel="Increase depth" onClick={() => onDepthChange(1)} />
          </div>
        )}
        <ButtonLink 
          class="focus-reset" 
          onClick={onReset}
          type="button"
        >
          Reset
        </ButtonLink>
      </div>
    </div>
  );
}
