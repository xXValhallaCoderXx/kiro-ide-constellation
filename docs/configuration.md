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
    "args": ["/absolute/path/to/kiro-ide-constellation/out/mcp.server.js"],
      "env": {},
      "disabled": false,
      "autoApprove": ["ping", "constellation_impactAnalysis", "constellation_onboarding.finalize", "constellation_onboarding.plan", "constellation_onboarding.commitPlan", "constellation_onboarding.nextStep"]
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

## Onboarding Mode

The extension includes an onboarding mode that provides guided walkthroughs of your codebase through Kiro AI assistant integration.

### Onboarding Configuration Paths
- **Persona file (when enabled)**: `./.kiro/steering/onboarding-guide.md`
- **Backup location**: `./.constellation/steering/backup/<timestamp>/`
- **Plan storage**: `./.constellation/onboarding/plan-<yyyyMMdd-HHmmss>.json`

### Mode Switching Lifecycle
- **Enable flow**: 
  1. Backup existing `./.kiro/steering/` directory to `./.constellation/steering/backup/<timestamp>/`
  2. Write onboarding persona file to `./.kiro/steering/onboarding-guide.md`
- **Disable flow**: 
  1. Restore most recent backup from `./.constellation/steering/backup/` to `./.kiro/steering/`.
  2. If no backup exists or restore fails, create an empty `./.kiro/steering/` and proceed with a warning.
  3. On successful restore, backups are cleaned up; otherwise they are left in place.

### MCP Tools Integration
The onboarding feature adds three new MCP tools:
- `constellation_onboarding.plan`: Generate structured walkthrough plans
- `constellation_onboarding.commitPlan`: Commit and execute walkthrough plans
- `constellation_onboarding.nextStep`: Advance to the next step in active walkthroughs

### HTTP Bridge Endpoints
Additional endpoints for onboarding and graph functionality:
- `POST /persona`: Switch between Default and Onboarding modes
- `POST /onboarding/commitPlan`: Commit walkthrough plans and execute first step
- `POST /onboarding/nextStep`: Progress to next step in active walkthrough
- `POST /scan`: Trigger a dependency graph scan; used by MCP to populate `.constellation/data/codebase-dependencies.json` when missing

All endpoints require bearer token authentication via `CONSTELLATION_BRIDGE_TOKEN`.

