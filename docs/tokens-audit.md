# Constellation UI Tokens Audit (Phase 1)

This document maps existing kiro-* tokens to the new design tokens introduced in webview-ui/src/styles/global.css.

- Surfaces
  - --kiro-surface-0 → --surface-canvas
  - --kiro-surface-1 → --surface-card
  - --kiro-surface-2 → --surface-card
- Borders
  - --kiro-border → --border-subtle
- Text
  - --kiro-text → --text-primary
  - --kiro-text-muted → --text-secondary
- Accents / Status
  - --kiro-accent → --accent-brand
  - --kiro-success → --accent-success

Notes
- Components must not hardcode color values; they should reference tokens.
- Focus outlines should use the focus utility or --border-focus directly (2px width, 2px offset).
- The previous spacing/radius tokens remain in place alongside the new set.

