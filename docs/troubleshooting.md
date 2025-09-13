# Troubleshooting

No tools appear in the MCP panel
- Did you reload the window after activation? Kiro re-reads MCP config on startup.
- Open ~/.kiro/settings/mcp.json and confirm the constellation-mcp entry exists with the correct absolute path.

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

