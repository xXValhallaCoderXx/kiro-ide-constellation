# Usage

Quick start (development)

1) Install deps & compile

```bash
npm install
npm run build
```

2) Launch the Extension Development Host
- Press F5 (Run Extension) in Kiro/VS Code.
- On activation you should see a toast: "Kiro Constellation is set up. Reload Kiro to start the MCP server."

3) Reload the window
- Kiro reads MCP config on startup. Reload to have Kiro discover constellation-mcp.

4) Verify the server
- Open Kiro’s MCP panel and confirm constellation-mcp is running.
- Try the tools:
  - #[constellation-mcp] ping → pong
  - #[constellation-mcp] echo Hello → Hello

Helpful commands
- Constellation: Self-test
  - Spawns the MCP server with --selftest and reports OK/FAILED.
- Constellation: Open user MCP config
  - Opens ~/.kiro/settings/mcp.json in the editor.

Where the config is
- User-level: ~/.kiro/settings/mcp.json (always updated by the extension)
- Workspace-level (optional): ./.kiro/settings/mcp.json (only written if you enable the setting and ./.kiro exists)

Notes
- You do not need to delete mcp.json during development. The extension upserts the constellation-mcp entry on activation.
- For code-only MCP server changes, you can restart just the server from the MCP panel—no full window reload needed.

