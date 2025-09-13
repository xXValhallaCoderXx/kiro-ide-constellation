# Kiro Constellation

A bare-bones Kiro/VS Code extension that installs and runs a tiny local Model Context Protocol (MCP) server and auto-registers it in Kiro. It ships two tools:

- ping → responds with "pong"
- echo → responds with the same text you send

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
- docs/troubleshooting.md — common problems and quick fixes

