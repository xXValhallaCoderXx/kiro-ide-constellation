# Events & Messaging

This doc summarizes how messages and events travel between the webview UI, the extension host, and the MCP server.

Legend
- UI: webview bundle (Preact), built from webview-ui/src/**/*
- Ext: extension host (Node.js), src/**/*
- MCP: MCP server process, out/mcp.server.js (built from src/mcp.server.ts)

Current message types

UI → Ext (webview messaging)
- open-graph-view
  - Sender: UI (SidePanelView) via webview-ui/src/services/messenger.ts
  - Receiver: src/side-panel-view-provider.ts → src/services/messenger.service.ts
  - Action: runs command constellation.openGraphView

Planned graph messages (PRD)
- graph/load
  - UI asks Ext for data; Ext replies with graph/data or graph/error
- graph/data { nodes, edges, meta }
  - Ext → UI reply with transformed graph elements
- graph/open-file { path }
  - UI double‑click node → Ext opens file in the editor
- graph/scan
  - UI asks Ext to re-run the dependency scan, then send graph/data

MCP → Ext (HTTP bridge)
- POST /open-graph
  - Sender: MCP server (ping tool handler) — src/mcp.server.ts
  - Receiver: Ext HTTP handler — src/services/http-bridge.service.ts
  - Auth: Authorization: Bearer <CONSTELLATION_BRIDGE_TOKEN>
  - Env: CONSTELLATION_BRIDGE_PORT, CONSTELLATION_BRIDGE_TOKEN (in mcp.json)
  - Action: opens/reveals the singleton Graph tab (command: constellation.openGraphView)

Files and responsibilities
- UI
  - webview-ui/src/services/messenger.ts: post/subscribe wrappers for window.postMessage
  - webview-ui/src/views/SidePanelView.tsx: sends open-graph-view
  - webview-ui/src/views/GraphView.tsx: will send graph/load, graph/open-file, graph/scan and render data

- Extension
  - src/extension.ts: registers providers; singleton Graph tab command; wires startup
  - src/side-panel-view-provider.ts: receives messages and delegates to the messenger service
  - src/services/messenger.service.ts: centralized inbound message handling (currently open-graph-view; will add graph/*)
  - src/services/http-bridge.service.ts: loopback HTTP server; verifies token; opens Graph tab on POST /open-graph
  - src/services/mcp-config.service.ts: injects bridge env (PORT/TOKEN) into mcp.json, writes/upserts configuration

- MCP
  - src/mcp.server.ts: tool handlers; ping posts to /open-graph when env present

Sequence examples
1) UI button → Graph tab
   UI(SidePanelView) → Ext(onDidReceiveMessage) → messenger.service → command: constellation.openGraphView → opens/reveals singleton tab.

2) MCP ping → Graph tab
   MCP(ping) → HTTP POST 127.0.0.1:<PORT>/open-graph (Authorization: Bearer <TOKEN>) → Ext(http-bridge) → command: constellation.openGraphView.

Security
- HTTP bridge listens on 127.0.0.1 only and requires a random bearer token generated per session.
- UI messaging is internal to the VS Code webview host.

Future
- Add graph/load/data/open-file/scan as per cytoscape-graph-initial-prd.md.
- Optional: add more endpoints to the HTTP bridge if tools need to drive UI (e.g., focus node, load subset).

