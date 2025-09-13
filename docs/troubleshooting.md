# Troubleshooting

No tools appear in the MCP panel or side panel is blank
- Did you reload the window after activation? Kiro re-reads MCP config on startup.
- Open ~/.kiro/settings/mcp.json and confirm the constellation-mcp entry exists with the correct absolute path.
- For the side panel, ensure out/ui/main.js and out/ui/style.css exist (run `npm run build:ui`). Reload the window.

Dependency scan issues
- Check the debug console for "Dependency scan stderr:" output for precise error messages.
- If your project does not have a dependency-cruiser config, the extension runs with --no-config by default. If you prefer a custom setup, add one (e.g., `.dependency-cruiser.cjs`).
- Ensure tsconfig.json is valid if present; the extension passes it to the CLI.
- Very large repos might hit the scan timeout (60s). Re-run on a narrower subfolder or adjust excludes.

Graph tab doesn’t open on ping
- Ensure the bridge env exists in ~/.kiro/settings/mcp.json under your server:
  - CONSTELLATION_BRIDGE_PORT, CONSTELLATION_BRIDGE_TOKEN
- The bridge listens on 127.0.0.1 only; this should work in local/WSL environments. If you’re in a remote with port sandboxing, open the Graph manually via the command.
- Test manually:
  - curl -s -X POST -H "Authorization: Bearer <TOKEN>" http://127.0.0.1:<PORT>/open-graph -o /dev/null -w "%{http_code}\n"  # expect 204
- If the HTTP call fails, the ping tool still returns pong; check the Extension Host debug console for bridge logs/errors.

Self-test fails or setup toast shows an error
- Ensure Node 18+ is installed. The extension will refuse to proceed if Node is older.
- If node isn’t on PATH, set Constellation: Node Path to an absolute Node binary path.

Server starts but fails at runtime
- Open the MCP server logs (if available) or run the self-test command.
- Restart constellation-mcp from the MCP panel after building (npm run watch is handy).

I moved or renamed the repository, and now it can’t start
- The MCP config stores an absolute path to out/mcpServer.js. Re-run the extension (or run the self-test) to upsert the path.

I want to disable or remove the server
- Remove the constellation-mcp block from ~/.kiro/settings/mcp.json (and from ./.kiro/settings/mcp.json if you created one).
- Reload the window.

I want workspace-only configuration
- Create a ./.kiro directory in the workspace and enable Constellation: Write Workspace MCP Config.
- Optionally delete the user-level entry to isolate to this workspace only.

