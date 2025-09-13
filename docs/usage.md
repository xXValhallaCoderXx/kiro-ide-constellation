# Usage

Quick start (development)

1) Install deps & compile
```bash
npm install
npm run build
```

2) Launch the Extension Development Host
- Press F5 (Run Extension or Run Extension (Dev MCP)).
- This starts TypeScript watch and a Vite watch build for the webview UI.
- On activation you should see a toast: "Kiro Constellation is set up. Reload Kiro to start the MCP server."

3) Reload the window
- Kiro reads MCP config on startup. Reload to have Kiro discover constellation-mcp.

4) Verify the server
- Open Kiro’s MCP panel and confirm constellation-mcp is running.
- Try the tools:
  - #[constellation-mcp] ping → pong
  - #[constellation-mcp] echo Hello → Hello

5) Open the side panel UI
- Click the Constellation icon in the Activity Bar to open the webview side panel.
- It should display "Hello world" via the Preact app.

6) Dependency scan results
- On activation a background scan runs (non-blocking). Results are written to:
  - ./.constellation/data/codebase-dependencies.json
- To re-run manually: open the command palette and run "Constellation: Scan Dependencies".

7) Open the Graph tab
- From the side panel, click "Open Graph View".
- Or run the command "Constellation: Open Graph View".
- When you call the MCP tool #[constellation-mcp] ping, the Graph tab will also auto-open via the local HTTP bridge.

Helpful commands
- Constellation: Self-test — Spawns the MCP server with --selftest and reports OK/FAILED.
- Constellation: Open user MCP config — Opens ~/.kiro/settings/mcp.json in the editor.
- Constellation: Scan Dependencies — Re-run dependency-cruiser on the workspace and overwrite the output file.

Where the config is
- User-level: ~/.kiro/settings/mcp.json (always updated by the extension)
- Workspace-level (optional): ./.kiro/settings/mcp.json (only written if you enable the setting and ./.kiro exists)

Notes
- The webview UI assets are built into out/ui. If the panel appears blank, run `npm run build:ui` and reload the window.
- You do not need to delete mcp.json during development. The extension upserts the constellation-mcp entry on activation.
- For code-only MCP server changes, you can restart just the server from the MCP panel—no full window reload needed.

