# Messaging & Event Architecture

## Overview
Kiro Constellation implements a multi-layer messaging system that enables communication between the webview UI, VS Code extension host, and MCP server processes. This architecture supports both user-initiated actions and programmatic tool-driven UI updates.

## Message Flow Layers

### 1. Webview ↔ Extension (UI Messaging)
- **Protocol**: VS Code webview messaging API (`window.postMessage`)
- **Direction**: Bidirectional
- **Security**: Sandboxed within VS Code webview context
- **Implementation**: 
  - UI side: `webview-ui/src/services/messenger.ts`
  - Extension side: `src/services/messenger.service.ts`
  - Provider integration: `src/side-panel-view-provider.ts`

#### Current Message Types
- `open-graph-view`: Opens/reveals the Graph visualization tab
- `ping`: Simple connectivity test

#### Graph Integration Message Types (Implemented)
- `graph/load`: Request dependency graph data
- `graph/data`: Response with graph nodes/edges/metadata
- `graph/open-file`: Open specific file in editor from graph node
- `graph/scan`: Trigger dependency rescan
- `graph/error`: Error response for graph operations
- `graph/status`: Progress updates during scanning and processing

#### Impact Analysis Message Types (New)
- `impact/show`: Display impact analysis results in graph view
- `impact/highlight`: Highlight affected nodes in dependency graph
- `impact/clear`: Clear impact analysis highlighting

### 2. MCP Server → Extension (HTTP Bridge)
- **Protocol**: HTTP REST API over loopback (127.0.0.1)
- **Direction**: MCP → Extension (one-way)
- **Security**: Bearer token authentication + loopback-only binding
- **Implementation**: `src/services/http-bridge.service.ts`

#### Environment Variables (Injected into MCP Config)
- `CONSTELLATION_BRIDGE_PORT`: Dynamic port number
- `CONSTELLATION_BRIDGE_TOKEN`: Random session token

#### Current Endpoints
- `POST /open-graph`: Opens/reveals Graph tab (triggered by ping tool)
- `POST /impact-analysis`: Processes impact analysis requests from constellation_impactAnalysis tool

## Implementation Details

### Webview Messenger Service
```typescript
// webview-ui/src/services/messenger.ts
messenger.post('open-graph-view')  // Send to extension
messenger.on((msg) => { ... })     // Listen for extension messages
```

### Extension Message Handler
```typescript
// src/services/messenger.service.ts
handleWebviewMessage(msg, {
  revealGraphView: () => vscode.commands.executeCommand('constellation.openGraphView'),
  log: (s) => console.log(s)
})
```

### HTTP Bridge Usage (MCP Server)
```typescript
// src/mcp.server.ts (ping tool)
await fetch(`http://127.0.0.1:${port}/open-graph`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` }
})

// src/mcp.server.ts (impact analysis tool)
await fetch(`http://127.0.0.1:${port}/impact-analysis`, {
  method: "POST",
  headers: { 
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ filePath })
})
```

## Security Model
- **Webview messaging**: Contained within VS Code's webview sandbox
- **HTTP bridge**: Loopback-only (127.0.0.1) with random bearer tokens
- **Token rotation**: New token generated per extension activation
- **No external access**: Bridge rejects non-loopback connections

## Development Patterns

### Adding New UI Messages
1. Update type definitions in both `webview-ui/src/services/messenger.ts` and `src/services/messenger.service.ts`
2. Add handler logic in `handleWebviewMessage()`
3. Implement UI sender in appropriate view component

### Adding New HTTP Endpoints
1. Add route handler in `src/services/http-bridge.service.ts`
2. Update MCP server tools to use new endpoint
3. Ensure proper authentication and loopback validation

### Message Flow Testing
- **UI messages**: Use webview developer tools and console logging
- **HTTP bridge**: Manual curl testing with dynamic port/token from MCP config
- **Integration**: Use MCP tool execution to verify end-to-end flow

## Architecture Benefits
- **Separation of concerns**: Clear boundaries between UI, extension, and MCP layers
- **Type safety**: Centralized message type definitions
- **Security**: Multiple isolation layers (webview sandbox + loopback + tokens)
- **Extensibility**: Easy to add new message types and endpoints
- **Debugging**: Centralized message handling for easier troubleshooting

## Graph Visualization Integration
- **Data Service**: `src/services/graph-data.service.ts` handles dependency data transformation
- **UI Components**: 
  - `webview-ui/src/components/GraphCanvas.tsx` renders interactive Cytoscape graphs
  - `webview-ui/src/components/GraphToolbar.tsx` provides graph controls
  - `webview-ui/src/components/GraphDashboard.tsx` displays graph metadata
- **Performance Handling**: Automatic optimizations for large graphs (500+ nodes)
- **Error Resilience**: Comprehensive error handling with user-friendly messages
- **Progress Feedback**: Real-time status updates during scanning and rendering

## Impact Analysis Integration
- **Analysis Service**: `src/services/impact-analysis.service.ts` performs BFS traversal
- **HTTP Bridge**: `src/services/http-bridge.service.ts` handles MCP tool requests
- **UI Integration**: Impact results displayed via graph highlighting and commands
- **Error Handling**: Graceful fallbacks for missing data and workspace issues

## Related Files
- **Documentation**: `docs/events.md` (detailed message specifications)
- **UI messaging**: `webview-ui/src/services/messenger.ts`
- **Extension messaging**: `src/services/messenger.service.ts`
- **HTTP bridge**: `src/services/http-bridge.service.ts`
- **MCP integration**: `src/mcp.server.ts`
- **Webview providers**: `src/side-panel-view-provider.ts`
- **Graph data**: `src/services/graph-data.service.ts`
- **Impact analysis**: `src/services/impact-analysis.service.ts`
- **Graph UI**: 
  - `webview-ui/src/components/GraphCanvas.tsx`
  - `webview-ui/src/components/GraphToolbar.tsx`
  - `webview-ui/src/components/GraphDashboard.tsx`
- **Side panel**: `webview-ui/src/views/SidePanelView.tsx`