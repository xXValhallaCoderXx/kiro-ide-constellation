# Proposed Updates to docs/README.md

## Current Issues
- Missing documentation for Graph Focus Mode feature
- Outdated feature list missing breadcrumb navigation and depth controls
- No mention of recent UI enhancements

## Proposed Changes

### Add to "Core Tools" section:
```markdown
**Graph Visualization Tools:**
- `ping` → responds with "pong" and opens interactive graph view
- Graph Focus Mode → drill-down navigation with breadcrumb trails and depth controls
- Interactive dependency visualization → click to explore, double-click to focus
```

### Update "Side panel UI" section:
```markdown
Side panel UI
- The extension contributes a Constellation icon to the Activity Bar which opens a side panel.
- The side panel is a webview backed by a Preact app (bundled via Vite) that renders into #root.
- The UI assets are built into out/ui and loaded via webview.asWebviewUri.
- **Graph Focus Mode**: Interactive drill-down navigation with breadcrumb trails
  - Double-click nodes to focus on dependencies
  - Breadcrumb navigation for exploration history
  - Depth controls (1-3 levels) for relationship visualization
  - Performance optimizations for large graphs (1000+ nodes)
- **Onboarding Mode Toggle**: Switch between Default and Onboarding modes with safe persona backup/restore
- **Walkthrough Status**: Display current step progress and walkthrough information when active
```

### Add new "Graph Focus Mode" section:
```markdown
Graph Focus Mode (interactive navigation)
- **Double-click navigation**: Click any node to focus on it and its immediate dependencies
- **Breadcrumb trails**: Visual navigation history with clickable breadcrumbs (e.g., "UserService.ts ▶ AuthController.ts")
- **Depth controls**: Adjust relationship depth (1-3 levels) with +/- buttons
- **Performance optimization**: Fan-out capping (100 children max), cycle detection, position caching
- **Integration**: Seamlessly works with impact analysis for focused exploration
- **Reset functionality**: Return to full graph view at any time
- **Keyboard navigation**: Esc to step back, clickable breadcrumbs for jumping
```

### Update "Read next" section:
```markdown
Read next
- docs/usage.md — build, run, verify, and use graph focus mode
- docs/graph-focus-mode.md — comprehensive focus mode documentation
- docs/ui-components.md — webview UI architecture and components
- docs/configuration.md — user/workspace config details and JSON examples
- docs/development.md — recommended dev loop, when to reload/restart
- docs/events.md — end-to-end messaging and bridge overview
- docs/troubleshooting.md — common problems and quick fixes
```

## Rationale
- **Feature visibility**: Graph Focus Mode is a major feature that should be prominently documented
- **User guidance**: Users need to understand the interactive capabilities available
- **Architecture clarity**: The UI enhancements represent significant architectural improvements
- **Navigation**: Updated cross-references help users find relevant documentation