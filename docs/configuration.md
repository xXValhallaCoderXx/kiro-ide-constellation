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
      "autoApprove": ["ping", "constellation_impactAnalysis"]
    }
  }
}
```

Workspace config (optional)
- Enable the setting Constellation: Write Workspace MCP Config (constellation.writeWorkspaceMcpConfig).
- Ensure a ./.kiro folder exists in the workspace. If present, the extension will write ./.kiro/settings/mcp.json as well.

Output files
- Dependency scan: ./.constellation/data/codebase-dependencies.json (workspace relative)

Bridge environment (in MCP config)
- The extension injects these env vars into your MCP server entry to enable UI actions from tools:
  - CONSTELLATION_BRIDGE_PORT: loopback port of the local HTTP bridge
  - CONSTELLATION_BRIDGE_TOKEN: bearer token used to authenticate calls
- Example (snippet inside mcp.json):
```json
{
  "mcpServers": {
    "constellation-mcp": {
      "command": "node",
      "args": ["/abs/path/to/out/mcp.server.js"],
      "env": {
        "CONSTELLATION_SERVER_ID": "constellation-mcp",
        "CONSTELLATION_BRIDGE_PORT": "54023",
        "CONSTELLATION_BRIDGE_TOKEN": "<random>"
      }
    }
  }
}
```

Extension settings
- constellation.nodePath (string)
  - Optional absolute path to the Node.js binary. Leave blank to use node from PATH.
- constellation.writeWorkspaceMcpConfig (boolean)
  - If true and ./.kiro exists, write workspace-level MCP config in addition to the user-level config.

Tips
- Finder hides ~/.kiro by default; press Cmd+Shift+. to toggle hidden files.
- If you move/rename this repo, re-run the extension to upsert the new absolute path in the config.
- To disable or uninstall, remove the constellation-mcp block from ~/.kiro/settings/mcp.json (and workspace file, if present).

