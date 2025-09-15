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
  impactLabel?: string;
  onImpactReset?: () => void;
}

export function FocusBreadcrumb({ crumbs, onJump, onReset, onDepthChange, currentDepth, impactLabel, onImpactReset }: FocusBreadcrumbProps) {
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
           
            />
            {index < crumbs.length - 1 && (
              <span class="focus-crumb-sep" aria-hidden="true">▶</span>
            )}
          </div>
        ))}
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        {impactLabel && (
          <div class="chip chip--brand" title={`Impact source: ${impactLabel}`}>Impact: {impactLabel}</div>
        )}
        {onDepthChange && (
          <div class="focus-depth-controls" style="display:flex;align-items:center;gap:6px;">
            <span class="toolbar-label">Depth: {currentDepth === 0 || currentDepth === undefined ? 'All' : String(currentDepth)}</span>
            <ButtonIcon class="btn-sm" iconName="minus" ariaLabel="Decrease depth" onClick={() => onDepthChange(-1)} />
            <ButtonIcon class="btn-sm" iconName="plus" ariaLabel="Increase depth" onClick={() => onDepthChange(1)} />
          </div>
        )}
        {onImpactReset && (
          <ButtonLink 
            class="focus-reset" 
            onClick={onImpactReset}
         
            title="Reset Impact View"
          >
            Reset Impact
          </ButtonLink>
        )}
        <ButtonLink 
          class="focus-reset" 
          onClick={onReset}
         
          title="Reset Focus"
        >
          Reset
        </ButtonLink>
      </div>
    </div>
  );
}
