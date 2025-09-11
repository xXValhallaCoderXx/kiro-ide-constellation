# MCP: Overview

This section documents the MCP stdio server that ships with Kiro Constellation: how it’s registered, how it communicates, and how to extend it.

Key paths
- Server source: packages/mcp-server/src/server.ts
- Bundler: esbuild.mcp.config.js → outputs packages/extension/out/mcp/mcpStdioServer.cjs
- Extension registration: packages/extension/src/mcp/mcp.provider.ts (vscode.lm API) with fallback to workspace .kiro/settings/mcp.json
- HTTP bridge (for side-channel events from MCP → extension): packages/extension/src/services/http-bridge.service.ts

Registration and discovery
- If the VS Code LM API is available, the extension registers a stdio server definition with ID kiro-constellation using a resolved Node binary and the bundled single-file script.
- If the LM API is not available (e.g., alternative IDE), the extension writes .kiro/settings/mcp.json under the first workspace folder with an entry for kiro-constellation so other tools/IDEs can discover and start the server.

Transport
- The MCP server uses stdio to communicate with the IDE and may use an HTTP side-channel (HTTP bridge) to trigger UI actions in the extension (e.g., open dashboard).

Environment variables
- KIRO_MCP_NODE: Path to Node binary to use when launching the MCP server (overrides automatic resolution).
- KIRO_MCP_CONFIG_DIR: Override the workspace config directory (default .kiro/settings).
- KIRO_MCP_BRIDGE_HOST: Host/interface for the HTTP bridge (default 127.0.0.1).
- KIRO_MCP_BRIDGE_PORT: Port for the HTTP bridge (default 39237).

Build & run
- Build once: pnpm run bundle:mcp (root) → packages/extension/out/mcp/mcpStdioServer.cjs
- Watch during dev: pnpm run watch:mcp
- Included in pnpm build via Turbo graph.

Extending
- Add tools in packages/mcp-server/src/server.ts via mcp.registerTool(...).
- Prefer simple data contracts; handle validation in the tool handlers and on the extension side after the HTTP bridge.

