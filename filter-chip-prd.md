# Graph Filter Chips — PRD (Phase 1)

Owner: Constellation UI
Status: Draft
Scope: Enable file-type filter chips in the Graph view (webview UI) with correct interaction across normal, focus, and impact modes.

## Background
The graph currently renders file nodes colored by file type (ts, tsx, js, jsx, json, other). The toolbar UI shows non-functional “Filters” chips (disabled). This PRD defines how to implement working filter chips that let users quickly filter nodes by file type without re-running the scan. The feature must integrate with Focus Mode, Impact View, Search, and remain performant.

## Goals
- Allow toggling file-type chips (TS/TSX/JS/JSX/JSON/Other) to filter visible nodes.
- Intersect filter visibility with Focus Mode visibility (if active) and Impact subgraph (if active).
- Hide edges whose endpoints are not both visible after filtering.
- Update counts next to chips based on the active graph (Focus/Impact aware) to provide immediate feedback.
- Persist chip selection during the session; optional workspace persistence.

## Non-Goals
- Persisting filter selections across VS Code reloads (optional stretch).
- Arbitrary custom filters (by directory, degree, authors, etc.).
- Server-side filtering or changes to dependency-cruiser output.

## User Stories
1) As a user, I can toggle a TS chip to only see TypeScript files in the graph.
2) As a user in Focus Mode, chip filters reduce visible nodes to only those matching both the focus visibility and enabled chips.
3) As a user in Impact View, chip filters apply within the impact subgraph.
4) As a user, Search respects current filters (centers on the first matching visible node); if no matches due to filters, I’m informed.
5) As a user, I can clear filters quickly to return to the full graph (within the current mode).

## UX
- Location: Graph toolbar row 2, left of the stats.
- Chips: TS, TSX, JS, JSX, JSON, Other.
- States: selected (default), unselected, disabled (0 available in current active graph).
- Counts: optional small number on/next to chip label (e.g., TS (24)). Counts reflect the current active graph (impact subgraph if active; otherwise full graph). In Focus Mode, counts reflect nodes in the currently focused visible set.
- Clear: “Clear filters” link appears when not all types are selected.
- Accessibility: chips are buttons with aria-pressed; keyboard navigable.

## Functional Requirements
- R1: Toggling chips immediately updates visibility.
- R2: Visibility set = intersection of:
  - Full graph nodes (or impact filtered nodes),
  - Focus Mode visible set (if active),
  - Enabled chip file types set.
- R3: Edges are visible only if both endpoints remain visible.
- R4: Search: scopes to the current active visibility; if no results, show a brief toast or banner.
- R5: Reset behaviors:
  - Graph “Reset View” (impact banner equivalent or the menu) leaves chips unchanged, but recalculates counts.
  - “Clear filters” returns all chips to selected.
- R6: Session persistence: store filter selection in memory; optional: workspace storage key.

## Data Model
- File type derivation:
  - Already computed in GraphCanvas (data.ext) via getFileExt(path), and in styles via graph-styles.service.
  - For accuracy inside GraphDashboard, derive ext from node.path or add ext to GraphData nodes once during transformation.
- New UI state in GraphDashboard:
  - filterState: {
    enabledExts: Set<'ts'|'tsx'|'js'|'jsx'|'json'|'other'>,
    counts: Record<FileType, number>
  }
- Default: enabledExts = all present types.

## Interaction Model (Modes)
- Normal: visible = nodes whose ext in enabledExts.
- Impact: visible = nodes in impact subgraph with ext in enabledExts.
- Focus + (Normal|Impact):
  - baseVisible = Focus visible set
  - filteredVisible = baseVisible ∩ enabledExts
  - recompute edges by endpoints in filteredVisible

## Performance
- Updates occur in the webview; sets are typically O(N) over nodes (N ~ 100–2000). OK.
- Use batch operations on Cytoscape in GraphCanvas.applyFocusView to avoid flicker.

## Accessibility
- Chips must be buttons with aria-pressed and focus outlines.
- Labels use human-readable names (TypeScript, JavaScript, etc.).

## Telemetry (optional)
- Number of toggles per session and common combinations (e.g., TS only).

## Failure Handling
- If the user selects no chips, show an inline hint “No types selected — click Clear filters” and hide everything.

## QA Matrix
- Graph only: toggle TS/JS quickly; edges hide/show correctly.
- Impact + chips: apply chips and verify nodes limited to intersection.
- Focus + chips: drill into a node, then toggle JS off; verify intersection.
- Search + chips: search for a node that only matches when a chip is enabled.
- Large graphs (1000+ nodes): observe responsiveness.
- Reset/clear flows: Reset View and Clear filters behave as expected.

## Implementation Plan (file-by-file)

### 1) webview-ui/src/components/GraphToolbar.tsx
- Props:
  - onToggleFilter(ext: FileType): void
  - onClearFilters(): void
  - filterState: { enabledExts: Set<FileType>; counts: Record<FileType, number> }
- Render chips for file types in getSupportedFileTypes().
- Determine disabled = counts[ext] === 0.
- Visual state = selected if enabledExts.has(ext).
- Implement Clear filters ButtonLink only when not all enabled.

### 2) webview-ui/src/components/GraphDashboard.tsx
- State:
  - filterState: as defined above.
- Helpers:
  - deriveExt(node: { path: string }): FileType (use file-type.service or path ext mapping)
  - computeAvailableCounts(activeGraph: GraphData, focusVisible?: Set<string>): counts
  - getActiveGraph(): GraphData => (impactState.filteredGraph || fullGraphData)
- Event wiring:
  - On graph/data, impact changes, or focus changes: recompute counts.
  - onToggleFilter(ext): toggle in enabledExts; recompute visibility.
  - onClearFilters(): set enabledExts = all present; recompute.
- Visibility application pipeline (single place):
  - baseGraph = getActiveGraph()
  - baseVisibleNodes = (focusState.isActive ? focusState.visibleNodes : Set(all node ids))
  - filteredVisibleNodes = new Set([...baseVisibleNodes].filter(id => extOf(id) in enabledExts))
  - filteredVisibleEdges = recompute via endpoints ∈ filteredVisibleNodes
  - Call applyFocusView({ visibleNodes: filteredVisibleNodes, visibleEdges: filteredVisibleEdges, rootId: (focusState.root ?? null) })
  - If no focus active, rootId can be null; applyFocusView will only hide/show.
- Search integration:
  - Current onSearch already selects first matching node from the active graph. Adapt to prefer a node within the current filteredVisibleNodes. If none, show toast “No results in current filters”.

### 3) webview-ui/src/components/GraphCanvas.tsx
- No major changes; reuse applyFocusView.
- Optional: add a convenience method applyVisibilityMask({ visibleNodes: Set<string> }) which internally computes edge visibility by endpoints. Not required since Dashboard already aligns edges.

### 4) webview-ui/src/services/graph-styles.service.ts
- No functional changes; already provides getSupportedFileTypes and mapping. Consider exposing getFileTypeLabel for chip labels.

### 5) webview-ui/src/services/file-type.service.ts
- Ensure we can resolve ext for any file path; export type FileType = 'ts'|'tsx'|'js'|'jsx'|'json'|'other'.

### 6) Styling (webview-ui/src/styles/global.css)
- Chip styles: selected vs unselected (class name modifier or aria-pressed [true|false]).
- Counts appearance (small badge).
- “Clear filters” ButtonLink placement and spacing.

### 7) Persistence (optional)
- Use window.localStorage or VS Code’s webview state (acquireVsCodeApi().setState()) to persist enabledExts per session.
- Future: workspaceStorage key via webview <-> extension message (not required in Phase 1).

## Edge Cases & Interactions
- All chips off: hide everything; show a hint.
- Focus root filtered out: keep root visible regardless? Decision: respect filters strictly (root can disappear). Provide inline hint: “Focus root is hidden by filters”. (Alternative: always keep root visible; trade-off: inconsistent filtering.)
- Counts in Focus Mode: counts reflect baseVisibleNodes before filtering to help users understand what’s available.

## Risks
- Confusion if Focus root becomes hidden: mitigate by hinting. (Decision required; see above.)
- Performance: repeated set operations on large graphs; mitigation: memoize ext lookup per id.
- Interaction order: Apply filter after focus computation; ensure deferred-apply (needsFocusApplyRef) covers race conditions.

## Open Questions
1) Should Focus root be exempt from filters? (Proposed: no exemption.)
2) Persist filters across sessions? If yes, where? (Phase 2)
3) Show TS/JS by default in toolbar (compact) or all types? (Phase 1: all types as chips; legend remains TS/JS only.)

## Acceptance Criteria
- Toggling any chip hides/shows nodes immediately without re-scan.
- In Impact View, chips filter within the impact subgraph.
- In Focus Mode, chips filter the focused visible set (intersection logic verified).
- Search centers on a node that matches query within current filters; if none, shows toast.
- Clear filters returns to “all chips enabled”.
- No console errors; frame remains responsive on 1000+ node graphs.

## Rollout Plan
- Phase 1: TS/TSX/JS/JSX/JSON/Other chips; no persistence across sessions.
- Phase 2 (optional): persist filters; add keyboard shortcuts (e.g., Alt+1..6 to toggle chips).
- Phase 3 (optional): advanced filters (by directory, deg, git activity).

## Timeline (estimates)
- Wiring UI + state (Toolbar + Dashboard): 0.5–1 day
- Canvas intersection + QA (Normal/Impact/Focus/Search): 0.5–1 day
- Polish + a11y + docs: 0.5 day

## File Change Checklist
- [ ] webview-ui/src/components/GraphToolbar.tsx
  - [ ] Props: onToggleFilter, onClearFilters, filterState
  - [ ] Interactive chips with counts and ARIA
- [ ] webview-ui/src/components/GraphDashboard.tsx
  - [ ] filterState + helpers + counts
  - [ ] apply visibility intersection pipeline
  - [ ] search respects filters
- [ ] webview-ui/src/components/GraphCanvas.tsx
  - [ ] (Optional) helper for visibility mask
- [ ] webview-ui/src/services/file-type.service.ts
  - [ ] Ensure file type derivation and export FileType
- [ ] webview-ui/src/services/graph-styles.service.ts
  - [ ] getFileTypeLabel/export (already present)
- [ ] webview-ui/src/styles/global.css
  - [ ] Chip styles, counts, layout
- [ ] Docs: add a short section in docs/ui-components.md for filter chips

## Dev Notes
- Keep GraphDashboard as the single source of truth for visibility. Call GraphCanvas.applyFocusView once per change, passing the final visible nodes/edges sets.
- Maintain an id→ext map memo in GraphDashboard to avoid recomputing extensions.
- Keep the legend (TS/JS) minimal and independent from the filter chips.

