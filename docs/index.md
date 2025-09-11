# Kiro IDE Constellation

Short, developer-focused docs for the extension architecture, messaging, webviews, and MCP.

## Overview

Two webviews (Sidebar, Dashboard) built with Preact + Vite. Extension ↔ Webviews communicate via a small, typed message bus. External processes (like the MCP server) can inject events via a local HTTP bridge.

- Events live in `packages/shared/src/shared/events.ts` (no magic strings)
- Extension bus: `packages/extension/src/services/message-bus.service.ts`
- Webview bus: `packages/webview/src/services/message-bus.service.ts`
- HTTP bridge: `packages/extension/src/services/http-bridge.service.ts`

## Contents

- [Events and message contracts](./events.md)
- [Messaging (extension, webview, HTTP bridge)](./messaging.md)
- [Webview provider lifecycle](./lifecycle.md)
- [Build & bundling](./build-and-bundling.md)
- [MCP Overview](./mcp/overview.md)
- [MCP Architecture](./mcp/architecture.md)
- [MCP Tools](./mcp/tools.md)
- [Recipes](./recipes.md)
