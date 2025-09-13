# Development

Requirements
- Node.js 18+ (required by the MCP TypeScript SDK)
- ESM configuration: package.json has "type": "module" and tsconfig uses NodeNext.

Edit–build loop
- Keep a background compile running:

```bash
npm run watch
```

- For MCP server code changes (src/mcpServer.ts):
  - After the file recompiles to out/mcpServer.js, use the MCP panel to restart constellation-mcp.
  - No window reload needed for code-only changes.

- For config-related changes (e.g., Node path setting, enabling workspace writes):
  - Reload the window so Kiro re-reads MCP configs.

Debug profiles
- Run Extension (Dev MCP)
  - Uses a background watch task that sets CONSTELLATION_SERVER_ID=constellation-mcp-dev and launches the Extension Development Host with the same env var. The extension will write to the dev namespace in ~/.kiro/settings/mcp.json.
- Run Extension
  - Uses the default namespace from settings (constellation.serverId), no env override.

Useful commands (palette)
- Constellation: Self-test — Boots the server with --selftest and reports OK/FAILED.
- Constellation: Open user MCP config — Opens ~/.kiro/settings/mcp.json.

Testing locally
- Extension Development Host (F5) is the recommended way to iterate.
- The extension writes user-level config by default, which applies to all workspaces.
- If you need isolation, enable the workspace write setting and create a ./.kiro folder in your test workspace.

Packaging

```bash
npm run package
```

This produces a .vsix that you can install. Remember: the MCP config stores absolute paths to out/mcpServer.js — if the install location differs or you move folders, reactivate the extension to upsert the path.

Gotchas
- Using __dirname in ESM: prefer fileURLToPath(import.meta.url) + dirname().
- Tests are excluded from the TS build (tsconfig exclude: src/test/**) to avoid pulling test runner types.

