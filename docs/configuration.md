# Configuration

Kiro MCP configuration locations
- User-level: ~/.kiro/settings/mcp.json
- Workspace-level: ./.kiro/settings/mcp.json

Kiro merges both on startup. A reload is required when files change.

What this extension writes (user-level by default)

Example ~/.kiro/settings/mcp.json after activation:

```json
{
  "mcpServers": {
    "constellation-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/kiro-ide-constellation/out/mcpServer.js"],
      "env": {},
      "disabled": false,
      "autoApprove": ["ping", "echo"]
    }
  }
}
```

Workspace config (optional)
- Enable the setting Constellation: Write Workspace MCP Config (constellation.writeWorkspaceMcpConfig).
- Ensure a ./.kiro folder exists in the workspace. If present, the extension will write ./.kiro/settings/mcp.json as well.

Extension settings
- constellation.nodePath (string)
  - Optional absolute path to the Node.js binary. Leave blank to use node from PATH.
- constellation.writeWorkspaceMcpConfig (boolean)
  - If true and ./.kiro exists, write workspace-level MCP config in addition to the user-level config.

Tips
- Finder hides ~/.kiro by default; press Cmd+Shift+. to toggle hidden files.
- If you move/rename this repo, re-run the extension to upsert the new absolute path in the config.
- To disable or uninstall, remove the constellation-mcp block from ~/.kiro/settings/mcp.json (and workspace file, if present).

