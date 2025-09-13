# Kiro Constellation

A bare-bones Kiro/VS Code extension that installs a tiny local MCP (Model Context Protocol) server and auto-registers it in Kiro. It includes two tools and a side panel UI (Preact webview):

- ping → responds with "pong"
- echo → responds with the same text you send

On activation the extension:
1. Verifies Node.js 18+.
2. Upserts ~/.kiro/settings/mcp.json with an entry named `constellation-mcp` (or a namespaced dev ID).
3. Smoke-tests the server (fast `--selftest`).
4. Runs a background dependency scan with dependency-cruiser and writes results to ./.constellation/data/codebase-dependencies.json.
5. Shows a toast with quick actions to reload or open the MCP config.

Quick start (with side panel UI)

```bash
npm install
npm run build
# Press F5 → choose "Run Extension (Dev MCP)" for namespaced dev ID
```

Verify in Kiro and open the side panel
- Open MCP panel → `constellation-mcp` (or `constellation-mcp-dev`) should be running
- Try: `#[constellation-mcp] ping` → pong
- Try: `#[constellation-mcp] echo Hello` → Hello
- Click the Constellation icon in the Activity Bar to open the side panel (webview). It should display "Hello world".
- Dependency scan output: ./.constellation/data/codebase-dependencies.json (re-run via "Constellation: Scan Dependencies").

Docs
- docs/README.md — overview and layout (including UI layer)
- docs/usage.md — build/run/verify and open the side panel UI
- docs/configuration.md — user vs workspace config, settings
- docs/development.md — dev loop, watchers (tsc + Vite), debug profiles
- docs/events.md — event/messaging patterns (webview messaging + HTTP bridge)
- docs/troubleshooting.md — common issues (including blank side panel)

License
- MIT (or your preferred license)
