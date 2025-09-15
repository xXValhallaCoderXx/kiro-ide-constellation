# Kiro Constellation

A Kiro/VS Code extension that provides a comprehensive MCP (Model Context Protocol) server with interactive dependency graph visualization, impact analysis, and guided onboarding capabilities. It ships multiple tools:

**Core Tools:**
- `ping` → responds with "pong" and opens interactive graph view
- `constellation_impactAnalysis` → analyzes dependency impact of file changes
- `constellation_onboarding.finalize` → finalizes onboarding walkthrough with cleanup

**Graph Visualization Tools:**
- Graph Focus Mode → drill-down navigation with breadcrumb trails and depth controls
- Interactive dependency visualization → click to explore, double-click to focus
- Zoom and viewport controls → programmatic zoom with mini-map navigation
- Git metrics integration → file activity and collaboration insights

**Onboarding Tools:**
- `constellation_onboarding.plan` → generates structured walkthrough plans
- `constellation_onboarding.commitPlan` → commits and executes walkthrough plans  
- `constellation_onboarding.nextStep` → advances to next step in active walkthroughs

On activation the extension:
1) Ensures Node.js 18+ is available.
2) Upserts a user-level Kiro MCP config entry (~/.kiro/settings/mcp.json) named constellation-mcp.
3) Smoke-tests the server by launching it with --selftest.
4) Shows a toast: "Kiro Constellation is set up. Reload Kiro to start the MCP server." and offers quick actions to reload or open the config.

Why this is useful
- It gives Kiro a local, known-good MCP server you can iterate on quickly.
- It demonstrates the minimal glue code required to register CLI MCP servers.

Requirements
- Node.js 18 or newer
- Kiro or VS Code as the IDE host (Extension Development Host supported)

Project layout

```
kiro-constellation/
├─ package.json
├─ tsconfig.json
├─ src/
│  ├─ extension.ts                # activation, MCP config upsert, self-test, toasts, commands, registers webview provider
│  ├─ side-panel-view-provider.ts # WebviewViewProvider for the Activity Bar side panel
│  └─ mcp.server.ts               # minimal MCP server (stdio) with ping/echo + --selftest
├─ src/services/
│  └─ dependency-cruiser.service.ts # runScan() integrates dependency-cruiser (background scan)
├─ webview-ui/                    # UI source (Preact + Vite)
│  ├─ index.html
│  ├─ vite.config.ts              # outputs to ../out/ui
│  ├─ tsconfig.json
│  └─ src/
│     ├─ components/
│     │  ├─ App.tsx
│     │  ├─ GraphDashboard.tsx
│     │  └─ Button.tsx
│     └─ styles/global.css
└─ out/
   ├─ extension.js, mcp.server.js # compiled by tsc
   └─ ui/                         # built webview assets (main.js, style.css)
```

Side panel UI
- The extension contributes a Constellation icon to the Activity Bar which opens a side panel.
- The side panel is a webview backed by a Preact app (bundled via Vite) that renders into #root.
- The UI assets are built into out/ui and loaded via webview.asWebviewUri.
- **Graph Focus Mode**: Interactive drill-down navigation with breadcrumb trails
  - Double-click nodes to focus on dependencies
  - Breadcrumb navigation for exploration history
  - Depth controls (1-3 levels) for relationship visualization
  - Performance optimizations for large graphs (1000+ nodes)
- **Enhanced Graph Controls**: Comprehensive graph interaction capabilities
  - Zoom controls with programmatic zoom in/out/fit functionality
  - Mini-map panel with viewport indicator for large graph navigation
  - File info panel displaying Git metrics and dependency information
  - Delayed click handling to prevent conflicts between single and double-click actions
- **Git Metrics Integration**: Real-time file activity and collaboration insights
  - 90-day commit activity tracking and churn analysis
  - Author collaboration patterns and primary contributor identification
  - Last modified timestamps with relative time formatting
  - Visual indicators for high-activity and stable files
- **Onboarding Mode Toggle**: Switch between Default and Onboarding modes with safe persona backup/restore
- **Walkthrough Status**: Display current step progress and walkthrough information when active

Dependency scan (background)
- On activation the extension runs a background dependency scan of the first workspace folder using dependency-cruiser.
- It auto-detects a dependency-cruiser config if present (.dependency-cruiser.{js,cjs,mjs} or dependency-cruiser.config.{js,cjs}); otherwise it runs with --no-config.
- It also auto-detects tsconfig.json and passes it as --ts-config when present.
- Output is written to ./.constellation/data/codebase-dependencies.json.
- You can re-run the scan any time via the command palette: "Constellation: Scan Dependencies".

Graph-context onboarding plans
- The plan generator uses the dependency graph written to ./.constellation/data/codebase-dependencies.json.
- If the graph file is missing, the MCP server triggers POST /scan via the local HTTP bridge, then retries loading the graph.
- Seed resolution: exact/case-insensitive path matching, TS/JS extension swaps, basename scoring, and topic matching.
- Traversal: breadth-first over the union of import and reverse edges (depth=1, limit≈30), ranked by distance then node degree.
- Output: plan steps include the seed (if resolved) and up to 5 related files for quick onboarding context.

Event architecture (overview)
- Webview ↔ Extension (UI messaging)
  - Webview UI posts messages via window.postMessage (wrapped by webview-ui/src/services/messenger.ts).
  - Providers and WebviewPanels receive messages and route them through src/services/messenger.service.ts.
  - Example: Side panel “Open Graph View” sends { type: 'open-graph-view' } → extension runs the command to open the Graph tab.
- MCP → Extension (HTTP bridge)
  - The extension starts a loopback HTTP server on 127.0.0.1 (src/services/http-bridge.service.ts) and publishes two env vars in the MCP config: CONSTELLATION_BRIDGE_PORT and CONSTELLATION_BRIDGE_TOKEN.
  - The MCP server (src/mcp.server.ts) sends POST /open-graph with Authorization: Bearer <token> on ping completion, which opens/reveals the Graph tab.
- Graph tab
  - Opened as a singleton WebviewPanel by the "Constellation: Open Graph View" command.
  - Future graph data messages will use the same webview messaging channel.

What the extension writes
- User-level MCP config: ~/.kiro/settings/mcp.json
  - The entry is keyed constellation-mcp and runs the compiled server via Node.
  - Paths are absolute. If you move this repo, re-activating the extension will upsert the updated path.
- Optional workspace config: ./.kiro/settings/mcp.json (only if you enable the setting and the ./.kiro folder exists). Kiro merges user + workspace.

Core settings (extension)
- Constellation: Node Path (constellation.nodePath)
  - Optional absolute path to the Node binary. Leave blank to use node from PATH.
- Constellation: Write Workspace MCP Config (constellation.writeWorkspaceMcpConfig)
  - If true and a ./.kiro folder exists, writes ./.kiro/settings/mcp.json in addition to the user config.

Read next
- docs/usage.md — build, run, verify, and use graph focus mode
- docs/graph-focus-mode.md — comprehensive focus mode documentation
- docs/ui-components.md — webview UI architecture and components
- docs/configuration.md — user/workspace config details and JSON examples
- docs/development.md — recommended dev loop, when to reload/restart
- docs/events.md — end-to-end messaging and bridge overview
- docs/troubleshooting.md — common problems and quick fixes

Graph Focus Mode (interactive navigation)
- **Double-click navigation**: Click any node to focus on it and its immediate dependencies
- **Breadcrumb trails**: Visual navigation history with clickable breadcrumbs (e.g., "UserService.ts ▶ AuthController.ts")
- **Depth controls**: Adjust relationship depth (1-3 levels) with +/- buttons
- **Performance optimization**: Fan-out capping (100 children max), cycle detection, position caching
- **Integration**: Seamlessly works with impact analysis for focused exploration
- **Reset functionality**: Return to full graph view at any time
- **Keyboard navigation**: Esc to step back, clickable breadcrumbs for jumping

Onboarding mode (new)
- Toggle in Side Panel: A Mode dropdown lets you switch between Default and Onboarding.
- Enable (Default → Onboarding):
  - Confirms with a dialog.
  - Moves the entire ./.kiro/steering directory to ./.constellation/steering/backup/<timestamp> (rename with copy+delete fallback).
  - Recreates ./.kiro/steering and writes onboarding-guide.md (strict persona) from an embedded template.
  - The Side Panel shows “Onboarding Mode”.
- Disable (Onboarding → Default):
  - Confirms with a dialog.
  - Attempts to restore the most recent backup back to ./.kiro/steering. If no backup exists or restore fails, it creates an empty ./.kiro/steering as a safe fallback and proceeds, showing a warning.
  - Cleans up backups on successful restore; otherwise leaves ./.constellation/steering/backup intact for manual review.

Implementation notes
- Embedded persona template lives in code and is written to ./.kiro/steering/onboarding-guide.md on enable.
- Backup/restore is implemented in src/services/onboarding-mode.service.ts and stores backups under ./.constellation/steering/backup to avoid recursion and path growth.
- UI components: webview-ui/src/components/OnboardingModeToggle.tsx and OnboardingStatus.tsx
- Status and errors are sent via onboarding/* webview messages (see docs/events.md)

