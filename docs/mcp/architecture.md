# MCP: Architecture

End-to-end flow from IDE to the MCP server and back, including how it triggers UI behaviour in the extension.

High-level
1) IDE discovers the MCP stdio server:
   - VS Code: via vscode.lm provider (kiro-constellation) → launches Node with args [packages/extension/out/mcp/mcpStdioServer.cjs]
   - Fallback: .kiro/settings/mcp.json written by the extension → external launcher can start the same command
2) Transport is stdio. The server is a single CJS file (no node_modules at runtime).
3) When tools want to affect the UI, the server posts to the local HTTP bridge exposed by the extension.

Components
- Registration: packages/extension/src/mcp/mcp.provider.ts
  - resolveServerScript → chooses the best available bundle path (prefers .cjs)
  - resolveNodeCommand → picks a Node binary (env override, nvm/system paths, fallback to `node` in PATH)
  - Writes .kiro/settings/mcp.json if vscode.lm is unavailable
- Server: packages/mcp-server/src/server.ts
  - Creates McpServer, registers tools, connects via StdioServerTransport
- HTTP bridge: packages/extension/src/services/http-bridge.service.ts
  - POST /events with { type, payload? } → validates type against Events → messageBus.receive('http-bridge', ...) → extension reacts and may broadcast to webviews

Events and UI
- Shared contracts in packages/shared/src/shared/events.ts
- Example flow (open Dashboard):
  - MCP tool posts { type: 'openDashboard' } to /events
  - Extension handles Events.OpenDashboard → opens dashboard panel → messageBus.broadcast(Events.DashboardOpened, { via: 'other' })
  - Sidebar receives sticky DashboardOpened state even if it loads later

Resilience & safety
- HTTP bridge binds to 127.0.0.1 by default; ~1 MB payload limit
- Port conflicts (EADDRINUSE) disable the bridge for the session without crashing activation
- Unknown event types return 400
- MCP server retries bridge POST a few times because the extension may start the bridge slightly later during activation

