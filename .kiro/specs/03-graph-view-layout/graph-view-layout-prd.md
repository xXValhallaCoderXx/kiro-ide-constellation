# Graph View Layout (Layout-first, UI-only) — PRD

Owner: Constellation
Status: Draft (ready for implementation)
Target: Webview UI (Preact) in VS Code webview


1) Summary
- Goal: Ship a layout-focused shell for the Graph view that matches the provided inspiration. Add a top toolbar above the canvas with a non-functional search input and placeholders for upcoming actions. Implement node colors by file type. Do not add new graph features or behaviors beyond colorization.
- Non-Goals: No minimap, no search/filtering logic, no new layouts, no new analytics. Keep all behavior the same as today, except the existing Re-scan button may be visually relocated into the new toolbar with no functional change.
- Tech & conventions: Preact UI with a GraphDashboard.tsx orchestrator and a side panel layout container (collapsed/placeholder). Shared Button.tsx with styles via global.css using VS Code theme variables. New services/utilities in kebab-case .ts files, consolidating simple config into extension-config.service.ts where appropriate.


2) Current state (baseline)
- Cytoscape renders the dependency graph with existing interactions (select, open on double-click). A single Re-scan button exists. No toolbar/search. Styling uses VS Code theme tokens.


3) Scope of this iteration
- Add a top toolbar above the graph canvas.
- Include a search input in the toolbar (visual only; no logic, disabled or readOnly).
- Include placeholder controls for: Fit, Reset, Layout switch, Filters (chips), etc. Placeholders are disabled and tagged for future enablement.
- Move the existing Re-scan action into the toolbar (no behavior change) or keep both temporarily if needed; final UI shows it inside the toolbar.
- Implement node color mapping by file type in the graph styles.
- Do not render a minimap.


4) Layout overview (ASCII)
```txt path=null start=null
+---------------------------------------------------------------------------------+
| GraphDashboard (full height, vertical stack)                                    |
|---------------------------------------------------------------------------------|
| Toolbar                                                                          |
|  ├─ [Search input (placeholder, readOnly)] [Fit] [Reset] [Re-scan]               |
|  └─ [Layout ▼] [Filter chips: ts tsx js jsx json other] (all disabled for now)   |
|---------------------------------------------------------------------------------|
| Graph Area                                                                       |
|  ├─ Cytoscape Canvas (fills remaining space)                                     |
|  └─ (No minimap)                                                                 |
|---------------------------------------------------------------------------------|
| Side Panel (collapsed placeholder container; hidden by default)                  |
+---------------------------------------------------------------------------------+
```
Notes
- Toolbar is always visible and sticky at the top of the graph view container.
- The search input displays focus/hover states but cannot submit or filter.
- All placeholder controls are disabled and marked with data-placeholder attributes for later wiring.


5) Visual design and styling
- Source of truth: global.css extended with toolbar rules. Respect VS Code theme tokens.
- Key VS Code tokens used (examples):
  - Foreground: var(--vscode-foreground)
  - Background: var(--vscode-editor-background)
  - Toolbar bg: var(--vscode-editorWidget-background)
  - Button bg/fg: var(--vscode-button-background), var(--vscode-button-foreground)
  - Input bg/fg: var(--vscode-input-background), var(--vscode-input-foreground)
  - Border: var(--vscode-widget-border)
- Spacing: Use 8px base grid (4/8/12 multiples). Toolbar height ~40px.
- Typography: Inherit VS Code font; size 12–13px for controls.
- Buttons: Use shared Button.tsx with global.css classes for size/variant.
- Accessibility: All actionable elements have aria-label; disabled placeholders use aria-disabled="true".


6) Node color mapping by file type (implemented)
- Map node style based on file extension in the Cytoscape stylesheet. The mapping is driven by a utility and exposed as classes/data attributes assigned per node.
- Default mapping (overridable via CSS variables in global.css):
  - ts → var(--kiro-node-ts, #569CD6)
  - tsx → var(--kiro-node-tsx, #4FC1FF)
  - js → var(--kiro-node-js, #E3D300)
  - jsx → var(--kiro-node-jsx, #FFBD45)
  - json → var(--kiro-node-json, #8DC891)
  - other → var(--kiro-node-other, #B180D7)
- Implementation notes:
  - During data ingestion, derive ext for each node id/path.
  - Set a data attribute data.ext on nodes (e.g., data: { ext: "ts" }).
  - Add Cytoscape style selectors like: node[ext = "ts"] { background-color: <token>; }.
  - Keep edges unchanged.


7) Components and files to add/update
Adhere to Preact + kebab-case .ts services and shared Button.tsx. Location suggestions use existing structure.

Components (tsx)
- webview-ui/src/components/GraphDashboard.tsx
  - Orchestrates toolbar + canvas + (placeholder) side panel; vertical flex layout.
- webview-ui/src/components/graph-toolbar.tsx
  - Renders search input (readOnly/disabled) and placeholder buttons (disabled). Contains the existing Re-scan as an enabled Button wired to current behavior.
- webview-ui/src/components/graph-canvas.tsx (update if already present)
  - Ensures Cytoscape container fills remaining space; injects style rules for node colors.
- webview-ui/src/components/graph-side-panel.tsx (optional placeholder)
  - Collapsed by default. Empty content for now. Presence ensures future growth without relayout.

Hooks (ts)
- webview-ui/src/hooks/use-graph-state.ts (minimal)
  - Hold UI flags for toolbar placeholders (booleans only), persisted in webview state but unused in behavior.

Services/Utilities (ts)
- webview-ui/src/services/extension-config.service.ts
  - Simple, consolidated place for UI flags and defaults (per user preference to simplify config).
- webview-ui/src/services/graph-styles.service.ts
  - Builds Cytoscape stylesheet fragments for node color by file type. Exports getFileTypeColor(ext).
- webview-ui/src/services/file-type.service.ts
  - Utility that extracts extension from node ids/paths: getFileExt(path): "ts" | "tsx" | ... | "other".

Types (ts)
- webview-ui/src/types/graph-types.ts (reuse existing shapes, add optional ext on node data if needed)

CSS
- webview-ui/src/styles/global.css (extend)
  - .toolbar, .toolbar-row, .toolbar-input, .toolbar-chip, .toolbar-spacer
  - Theme-aware backgrounds/borders using VS Code tokens
  - Data attributes for placeholders: [data-placeholder="true"]


8) Behaviors in this iteration
- Toolbar appears; search input is visually functional (focus/clear) but does not filter, submit, or trigger canvas actions. It is readOnly/disabled by default.
- Re-scan button retains its current behavior.
- Fit/Reset/Layout/Filter chips are present but disabled (no handlers). They may render with tooltip “Coming soon”.
- Node colors vary by file type. This is the only functional change to the graph visuals.
- No minimap is rendered.


9) Acceptance criteria
Toolbar
- Toolbar renders above the graph in all themes. Search input is visible and not interactive (readOnly or disabled). Placeholder controls are disabled and marked with data-placeholder="true".
- Existing Re-scan action remains available and functional inside the toolbar.
Graph & styles
- Nodes are colorized per file extension mapping; unknown types fall back to “other”.
- No minimap is present anywhere in the UI.
Layout & responsiveness
- Toolbar remains sticky; graph canvas flexes to fill available space. Works ≥ 1024px width and down to ~800px with controls wrapping to a second row.
Theming & a11y
- All colors derive from VS Code tokens or CSS variables. Contrast meets VS Code default requirements for text and icons. Disabled placeholders have proper aria-disabled.
Performance
- No regression versus current render time. Colorization is computed once per load and applied via selectors.


10) Out of scope (explicit)
- Search implementation, filtering, neighborhood/focus, new layouts, legend, context menus, hotkeys, pinning, details panel content, exporting, persistence beyond simple UI flags. No changes to extension messaging.


11) Implementation plan
Phase 1 — Layout shell and toolbar
- Create GraphDashboard.tsx and place it as the top-level for the graph view. Flex column layout.
- Add graph-toolbar.tsx with: Search input (disabled), Fit, Reset, Layout dropdown, Filter chips, Re-scan (enabled). Use Button.tsx for buttons. Add data-placeholder to non-functional controls.
- Move/slot the current graph view into graph-canvas.tsx. Ensure canvas sizing and cleanup are intact.
- Extend global.css with toolbar styles using VS Code tokens.

Phase 2 — File-type colorization
- Add file-type.service.ts to derive ext from node id/path during data load.
- Add graph-styles.service.ts to produce stylesheet rules by ext and merge into Cytoscape style.
- Verify colors theme correctly via CSS variables.

Phase 3 — Polish
- Ensure responsive wrapping for toolbar rows; add tooltips “Coming soon”.
- Add a collapsed side panel placeholder component (hidden by default) to stabilize future layout.


12) Risks & mitigations
- Visual regressions in dark/light themes → Use tokens and test across themes.
- Toolbar crowding on small widths → Allow control wrapping and use icon-only buttons as needed.
- Color accessibility → Keep sufficient contrast; allow user overrides via CSS variables.


13) Work breakdown (files)
- webview-ui/src/components/GraphDashboard.tsx (new)
- webview-ui/src/components/graph-toolbar.tsx (new)
- webview-ui/src/components/graph-canvas.tsx (update/new wrapper)
- webview-ui/src/components/graph-side-panel.tsx (new, placeholder)
- webview-ui/src/components/Button.tsx (reuse)
- webview-ui/src/services/extension-config.service.ts (new)
- webview-ui/src/services/graph-styles.service.ts (new)
- webview-ui/src/services/file-type.service.ts (new)
- webview-ui/src/types/graph-types.ts (update for optional ext)
- webview-ui/src/styles/global.css (update)


14) Developer notes & conventions
- Follow user preferences: Preact UI, GraphDashboard.tsx wrapper, shared Button.tsx styled by global CSS; services/utilities use kebab-case .ts file names and consolidate simple config into extension-config.service.ts.
- Keep current extension messaging and data contracts intact.
- Add data-testid attributes to toolbar elements for future tests.

