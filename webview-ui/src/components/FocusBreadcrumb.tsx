import { Button } from './Button';
import type { Crumb } from '../services/focus-mode.service';

export interface FocusBreadcrumbProps {
  crumbs: Crumb[];
  onJump: (index: number) => void;
  onReset: () => void;
}

export function FocusBreadcrumb({ crumbs, onJump, onReset }: FocusBreadcrumbProps) {
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
      <Button 
        class="focus-reset" 
        onClick={onReset}
        type="button"
      >
        Reset
      </Button>
    </div>
  );
}