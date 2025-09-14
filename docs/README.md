# Kiro Constellation

A Kiro/VS Code extension that provides a comprehensive MCP (Model Context Protocol) server with interactive dependency graph visualization, impact analysis, and guided onboarding capabilities. It ships multiple tools:

**Core Tools:**
- `ping` → responds with "pong" and opens graph view
- `constellation_impactAnalysis` → analyzes dependency impact of file changes

**Onboarding Tools:**
- `constellation_onboardingplan` → generates structured walkthrough plans
- `constellation_onboardingcommitPlan` → commits and executes walkthrough plans  
- `constellation_onboardingnextStep` → advances to next step in active walkthroughs

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
- **Onboarding Mode Toggle**: Switch between Default and Onboarding modes with safe persona backup/restore
- **Walkthrough Status**: Display current step progress and walkthrough information when active

Dependency scan (background)
- On activation the extension runs a background dependency scan of the first workspace folder using dependency-cruiser.
- It auto-detects a dependency-cruiser config if present (.dependency-cruiser.{js,cjs,mjs} or dependency-cruiser.config.{js,cjs}); otherwise it runs with --no-config.
- It also auto-detects tsconfig.json and passes it as --ts-config when present.
- Output is written to ./.constellation/data/codebase-dependencies.json.
- You can re-run the scan any time via the command palette: "Constellation: Scan Dependencies".

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
- docs/usage.md — build, run, verify
- docs/configuration.md — user/workspace config details and JSON examples
- docs/development.md — recommended dev loop, when to reload/restart
- docs/events.md — end-to-end messaging and bridge overview
- docs/troubleshooting.md — common problems and quick fixes

Onboarding mode (new)
- Toggle in Side Panel: A Mode dropdown lets you switch between Default and Onboarding.
- Enable (Default → Onboarding):
  - Confirms with a dialog.
  - Moves the entire ./.kiro/steering directory to ./.constellation/steering/backup/<timestamp> (rename with copy+delete fallback).
  - Recreates ./.kiro/steering and writes onboarding-guide.md (strict persona) from an embedded template.
  - The Side Panel shows “Onboarding Mode”.
- Disable (Onboarding → Default):
  - Confirms with a dialog.
  - Restores the most recent backup back to ./.kiro/steering.
  - Cleans up all backups by removing ./.constellation/steering/backup.

Implementation notes
- Embedded persona template lives in code and is written to ./.kiro/steering/onboarding-guide.md on enable.
- Backup/restore is implemented in src/services/onboarding-mode.service.ts
- UI components: webview-ui/src/components/OnboardingModeToggle.tsx and OnboardingStatus.tsx
- Status and errors are sent via onboarding/* webview messages (see docs/events.md)

