# Kiro Constellation

A bare-bones Kiro/VS Code extension that installs a tiny local MCP (Model Context Protocol) server and auto-registers it in Kiro. It includes two tools:

- ping → responds with "pong"
- echo → responds with the same text you send

On activation the extension:
1. Verifies Node.js 18+.
2. Upserts ~/.kiro/settings/mcp.json with an entry named `constellation-mcp` (or a namespaced dev ID).
3. Smoke-tests the server (fast `--selftest`).
4. Shows a toast with quick actions to reload or open the MCP config.

Quick start

```bash
npm install
npm run build
# Press F5 → choose "Run Extension (Dev MCP)" for namespaced dev ID
```

Verify in Kiro
- Open MCP panel → `constellation-mcp` (or `constellation-mcp-dev`) should be running
- Try: `#[constellation-mcp] ping` → pong
- Try: `#[constellation-mcp] echo Hello` → Hello

Docs
- docs/README.md — overview
- docs/usage.md — build/run/verify
- docs/configuration.md — user vs workspace config, settings
- docs/development.md — dev loop, watch tasks, debug profiles
- docs/troubleshooting.md — common issues

License
- MIT (or your preferred license)
