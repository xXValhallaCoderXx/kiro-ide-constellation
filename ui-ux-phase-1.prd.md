# UI/UX Phase 1 PRD — Constellation (VS Code Webview)

Status: Draft
Owner: You + Agent Mode
Date: 2025-09-14
Scope: Visual design, layout, and interaction polish only (no new features)

1) Objective and success criteria
- Make the graph dashboard and side panel feel intentional and cohesive with VS Code themes.
- Improve legibility, spacing rhythm, and state feedback without introducing new features.
- Keep Preact + a shared Button component and global CSS, aligned with your preferences.
- Success signals
  - Toolbar is compact, scannable, and communicates state clearly.
  - Graph labels are more legible on dark and light themes.
  - Impact Analysis mode is visibly distinct and easily resettable.
  - Side panel onboarding states feel integrated (progress, success, error, cleanup).

Non‑goals
- Implementing search, filters, layout switching, or new graph interactions.
- Changing data contracts or backend services.
- Replacing Cytoscape or changing algorithms.

2) Context summary (current state)
- Functional baseline is in place: Impact Analysis payloads, onboarding mode/status, graph rendering.
- Visuals are minimal: default inputs, plain buttons, limited hierarchy, sparse feedback.
- Dark themes can reduce label/edge contrast; selections are not strongly distinguished.

3) Principles
- Native-first: use VS Code theme tokens wherever possible.
- Tokenized: define a small semantic token set so changes are centralized.
- Compact clarity: dense but readable; avoid unnecessary chrome.
- Progressive states: consistent loading/rendering/error/empty treatments.
- Accessible: visible focus, keyboard-friendly, 3:1 contrast for UI chrome (4.5:1 for text where feasible).

4) Design tokens (CSS custom properties)
Add to webview global stylesheet and reference in components. Provide fallbacks for robustness.

Suggested variables (namespaced):
- Spacing
  - --kiro-space-1: 4px
  - --kiro-space-2: 8px
  - --kiro-space-3: 12px
  - --kiro-space-4: 16px
  - --kiro-space-6: 24px
  - --kiro-space-8: 32px
- Radii
  - --kiro-radius-1: 4px
  - --kiro-radius-2: 8px
  - --kiro-radius-pill: 9999px
- Shadows (align to VS Code widget shadow but ensure fallbacks)
  - --kiro-shadow-1: 0 1px 2px var(--vscode-widget-shadow, rgba(0,0,0,0.25))
  - --kiro-shadow-soft: 0 6px 16px rgba(0,0,0,0.2)
- Surfaces and borders
  - --kiro-surface-0: var(--vscode-editor-background)
  - --kiro-surface-1: var(--vscode-editorWidget-background)
  - --kiro-surface-2: var(--vscode-sideBar-background)
  - --kiro-border: var(--vscode-widget-border, rgba(255,255,255,0.08))
- Text
  - --kiro-text: var(--vscode-foreground)
  - --kiro-text-muted: var(--vscode-descriptionForeground)
- Accents and statuses
  - --kiro-accent: var(--vscode-charts-blue, #007ACC)
  - --kiro-accent-contrast: var(--vscode-button-foreground, #ffffff)
  - --kiro-success: var(--vscode-testing-iconPassed, #2ea043)
  - --kiro-warning: var(--vscode-list-warningForeground, #ffcc00)
  - --kiro-danger: var(--vscode-errorForeground, #f48771)
  - --kiro-info: var(--vscode-notificationsInfoIcon-foreground, #4FC1FF)
- Graph-specific
  - Keep existing file-type vars (e.g., --kiro-node-ts). Add
  - --kiro-grid-color: color-mix(in srgb, var(--vscode-foreground) 8%, transparent)

5) Component/system styles to introduce
- Buttons (shared)
  - Keep the shared Button.tsx. Add class pass-through and CSS variants in global.css
    - .btn (base), .btn-primary, .btn-secondary, .btn-ghost
    - Sizes: .btn-sm, .btn-md (md default)
    - States: :hover, :active, :disabled, :focus-visible with var(--vscode-focusBorder)
- Toolbar
  - Two compact rows
    - Row 1: search input (placeholder), primary actions (Fit, Layout ▼), functional Re-scan
    - Row 2: filter chips (placeholders), right-aligned stats pill
  - Icon + label buttons to reduce cognitive load
  - Chips use badge colors; disabled placeholders visibly muted
- Graph Canvas
  - Subtle grid background using --kiro-grid-color
  - “Rendering…” overlay uses a pill with accent color and soft shadow
- Impact banner (when impactState.isActive)
  - Fixed top stripe in the content area: “Impact View — source: <file>” and a small “Reset View” button
  - Background uses --kiro-accent at ~10–15% opacity; text uses --kiro-text for contrast
- Side Panel
  - Card-like sections for Mode Toggle and Status
  - Toast/banner styles for success, error, info
  - Modal styling for confirmation dialog (overlay, dialog, buttons) without changing logic
- State messages (loading/scanning/rendering/error)
  - Shared .state-message utility (centered column, icon, short copy)

6) Cytoscape stylesheet adjustments (legibility, no feature changes)
- Labels
  - Add text-outline-color: var(--vscode-editor-background) and small text-outline-width (1–2px) for better contrast on both themes
- Selection/hover
  - Keep node fill based on file type; for selected, increase border width and introduce halo via shadow (avoid changing fill)
- Source and affected edges
  - Keep strong color on edges from the impact source; slightly increase width
- Global edge contrast
  - Lighten default edge color slightly; maintain 0.6–0.7 opacity on normal graphs, lower on large graphs

7) Accessibility checklist
- Keyboard focus is visible and consistent across buttons, chips, dropdowns
- All interactive controls retain accessible name/label; placeholders remain aria-disabled
- Maintain ≥4.5:1 text contrast (≥3:1 for non-text UI elements)
- Respect reduced motion (prefers-reduced-motion) for any animations
- Tabbing order is logical in toolbar and dialogs

8) Implementation plan (files and tasks)
Note: These are UI polish changes only; no new features.

A. Design tokens and utilities
- File: webview-ui/src/styles/global.css
  - Add token variables under :root (see section 4)
  - Add utilities
    - .grid-bg: tiled grid using --kiro-grid-color
    - .card: padded container with border and shadow
    - .chip: small rounded badge button (used by toolbar filters)
    - .state-message: centered layout for loading/scanning/error
    - .banner-impact: stripe with subtle accent background and shadow
  - Keep existing node color variables and toolbar styles; refactor to use tokens where relevant

B. Button variants
- File: webview-ui/src/components/Button.tsx
  - Allow class pass-through and preserve default class
  - No behavior change; existing usages keep working
- File: webview-ui/src/styles/global.css
  - Add .btn, .btn-primary, .btn-secondary, .btn-ghost, .btn-sm, .btn-md

C. Graph toolbar polish
- File: webview-ui/src/components/GraphToolbar.tsx
  - Keep the current feature flags/placeholder behavior
  - Group controls into two rows; replace text-only with small icon+label (inline SVG)
  - Add right-aligned stats pill: “{nodes} nodes • {edges} edges” plus “(optimized)” when applicable

D. Impact banner
- File: webview-ui/src/components/GraphDashboard.tsx
  - When impactState.isActive, render a .banner-impact above the canvas with source file and a small Reset View button
  - Wire button to existing onResetImpactView()

E. Graph legibility
- File: webview-ui/src/services/graph-styles.service.ts
  - Add text outline styles to node labels: text-outline-color and text-outline-width
  - Adjust node:selected to use border/halo (keep background color)
  - Slightly lighten default edge color; keep thicker width for edge[fromSource=true]

F. Side panel styling
- File: webview-ui/src/components/OnboardingModeToggle.tsx and OnboardingStatus.tsx
  - No logic changes. Apply new classes from global.css for card sections, alerts, progress bar
- File: global.css
  - Modal overlay/dialog polish (sizes, spacing, shadow)

G. Unified state messages
- File: webview-ui/src/components/GraphDashboard.tsx
  - Use the .state-message utility for loading/scanning/rendering/error sections

9) Work breakdown (estimates)
- A. Tokens + utilities: 2–3h
- B. Button variants: 0.5h
- C. Toolbar markup + minor icons: 1.5–2h
- D. Impact banner: 0.5h
- E. Cytoscape stylesheet tweaks: 1h
- F. Side panel + modal style pass: 1–1.5h
- G. State messages unification: 0.5h
Total: ~7–9 hours

10) Validation and QA checklist
- Dark and light themes: labels remain legible; focus rings visible
- Tab through toolbar, side panel, and dialog successfully
- Impact banner appears only when impactState.isActive and Reset restores full graph
- Rendering overlay appears for large graphs and disappears after layoutstop
- No new layout shifts or scrollbars at common window sizes (≥768px width)

11) Risks and rollbacks
- Over-styling could deviate from VS Code’s look; mitigate by relying on theme tokens
- Cytoscape label outline might interfere with very small nodes; keep widths minimal and test on large graphs
- Rollback plan: styles are additive and scoped; reverting the CSS changes restores prior visuals

12) Concrete snippets to guide implementation (illustrative)

CSS tokens (add near top of global.css)
```css
:root {
  /* spacing */
  --kiro-space-1: 4px;
  --kiro-space-2: 8px;
  --kiro-space-3: 12px;
  --kiro-space-4: 16px;
  --kiro-space-6: 24px;
  --kiro-space-8: 32px;
  /* radii */
  --kiro-radius-1: 4px;
  --kiro-radius-2: 8px;
  --kiro-radius-pill: 9999px;
  /* shadows */
  --kiro-shadow-1: 0 1px 2px var(--vscode-widget-shadow, rgba(0,0,0,0.25));
  --kiro-shadow-soft: 0 6px 16px rgba(0,0,0,0.2);
  /* surfaces and borders */
  --kiro-surface-0: var(--vscode-editor-background);
  --kiro-surface-1: var(--vscode-editorWidget-background);
  --kiro-surface-2: var(--vscode-sideBar-background);
  --kiro-border: var(--vscode-widget-border, rgba(255,255,255,0.08));
  /* text */
  --kiro-text: var(--vscode-foreground);
  --kiro-text-muted: var(--vscode-descriptionForeground);
  /* accents */
  --kiro-accent: var(--vscode-charts-blue, #007ACC);
  --kiro-accent-contrast: var(--vscode-button-foreground, #fff);
  /* statuses */
  --kiro-success: var(--vscode-testing-iconPassed, #2ea043);
  --kiro-warning: var(--vscode-list-warningForeground, #ffcc00);
  --kiro-danger: var(--vscode-errorForeground, #f48771);
  --kiro-info: var(--vscode-notificationsInfoIcon-foreground, #4FC1FF);
  /* graph */
  --kiro-grid-color: color-mix(in srgb, var(--vscode-foreground) 8%, transparent);
}
```

Button component (class pass-through)
```tsx
// webview-ui/src/components/Button.tsx (concept)
export function Button({ children, class: cls, ...rest }) {
  return (
    <button class={`button btn ${cls ?? ''}`} {...rest}>{children}</button>
  )
}
```

Cytoscape label outline (stylesheet excerpt)
```ts
// webview-ui/src/services/graph-styles.service.ts (concept)
{
  selector: 'node',
  style: {
    label: 'data(label)',
    color: '#CCC',
    'text-outline-color': 'var(--vscode-editor-background)',
    'text-outline-width': 1,
    // ...
  }
}
```

13) Naming and tech alignment
- UI built with Preact; keep GraphDashboard.tsx and a shared Button.tsx with global CSS styles.
- Use kebab-case for any new files; this PRD follows that convention.
- No changes to extension-config.service.ts organization; suggestions stay UI-only.

14) Next steps
- Approve this PRD
- Implement Phase 1 (about a day of work) behind a single commit to keep changes reviewable
- Optional Phase 2 (future): micro-interactions, animated edge highlighting, theme-specific fine-tuning

