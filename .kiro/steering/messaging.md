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

#### Onboarding Message Types (Webview ↔ Extension)

**Webview → Extension (Inbound):**
- `onboarding/change-mode`: Request mode switch with `{ mode: 'Default' | 'Onboarding' }`
- `onboarding/get-mode`: Request current persona mode
- `onboarding/get-status`: Request current walkthrough status

**Extension → Webview (Outbound):**
- `onboarding/mode-changed`: Confirms successful mode switch with `{ mode: 'Default' | 'Onboarding' }`
- `onboarding/mode-error`: Reports mode switching error with `{ message: string }`
- `onboarding/current-mode`: Returns current mode with `{ mode: 'Default' | 'Onboarding' }`
- `onboarding/status-update`: Provides walkthrough status with detailed payload
- `onboarding/walkthrough-complete`: Signals walkthrough completion
- `onboarding/walkthrough-error`: Reports walkthrough error with `{ message: string }`
- `onboarding/finalize-complete`: Confirms finalization with summary and cleanup details

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
- `POST /persona`: Mode switching between Default and Onboarding personas
- `POST /onboarding/commitPlan`: Plan execution with file highlighting and walkthrough initialization
- `POST /onboarding/nextStep`: Step progression through active walkthrough
- `POST /onboarding/finalize`: Walkthrough completion and cleanup with optional documentation generation
- `POST /scan`: Dependency scanning trigger with timeout handling and progress reporting

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

#### Onboarding Message Payload Types

**OnboardingStatusPayload:**
```typescript
{
  isActive: boolean              // Whether a walkthrough is currently active
  currentStep?: number           // Current step number (1-based)
  totalSteps?: number           // Total number of steps in walkthrough
  currentFile?: string          // File path for current step
  explanation?: string          // Explanation text for current step
}
```

**FinalizeCompletePayload:**
```typescript
{
  chosenAction: 'document' | 'test-plan' | null  // User's chosen post-walkthrough action
  summary: {
    topic: string                                 // Walkthrough topic
    stepCount: number                            // Total steps completed
    files: string[]                              // All files visited
    highlights: Array<{                          // All highlighted code sections
      filePath: string
      lineStart: number
      lineEnd: number
    }>
    bulletSummary: string[]                      // Summary bullet points
  }
  cleanup: {
    mode: 'Default'                              // Confirms switch to Default mode
    removedPlan: string | null                   // Path of removed plan file
  }
}
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

// src/mcp.server.ts (persona switching)
await fetch(`http://127.0.0.1:${port}/persona`, {
  method: "POST",
  headers: { 
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ action: "enable" | "disable" })
})

// src/mcp.server.ts (onboarding plan commitment)
await fetch(`http://127.0.0.1:${port}/onboarding/commitPlan`, {
  method: "POST",
  headers: { 
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ plan: OnboardingPlan })
})

// src/mcp.server.ts (walkthrough step progression)
await fetch(`http://127.0.0.1:${port}/onboarding/nextStep`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` }
})

// src/mcp.server.ts (walkthrough finalization)
await fetch(`http://127.0.0.1:${port}/onboarding/finalize`, {
  method: "POST",
  headers: { 
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ chosenAction: "document" | "test-plan" | null })
})

// src/mcp.server.ts (dependency scanning)
await fetch(`http://127.0.0.1:${port}/scan`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` }
})
```

#### Detailed Endpoint Documentation

##### POST /open-graph
- **Purpose**: Opens/reveals the Graph visualization tab in VS Code
- **Authentication**: Bearer token required
- **Request Body**: None
- **Response**: 204 No Content on success
- **Triggered By**: `ping` MCP tool
- **Security**: Loopback-only, token authentication

##### POST /impact-analysis
- **Purpose**: Processes dependency impact analysis requests
- **Authentication**: Bearer token required
- **Request Body**: `{ filePath: string }` (workspace-relative path)
- **Response**: `{ affectedFiles: string[] }` with normalized workspace-relative paths
- **Error Codes**: 
  - 400: Invalid file path or missing workspace
  - 412: No dependency data available (needs scan)
  - 500: Analysis error
- **Security**: Request body size limit (1MB), path validation, workspace boundary checks
- **Side Effects**: Triggers `constellation.showImpact` command for UI highlighting

##### POST /persona
- **Purpose**: Switches between Default and Onboarding persona modes
- **Authentication**: Bearer token required
- **Request Body**: `{ action: "enable" | "disable" }`
- **Response**: `{ success: boolean, mode: "Default" | "Onboarding", message: string }`
- **Error Codes**:
  - 400: Invalid action or missing workspace
  - 403: Permission denied for file operations
  - 500: Mode switching error
- **Security**: Request body size limit (1MB), JSON validation
- **Side Effects**: Backup/restore steering documents, write onboarding persona template

##### POST /onboarding/commitPlan
- **Purpose**: Commits an onboarding plan and begins walkthrough execution
- **Authentication**: Bearer token required
- **Request Body**: `{ plan: OnboardingPlan }` with version, topic, createdAt, and steps array
- **Response**: Walkthrough initialization result with current step information
- **Error Codes**:
  - 400: Invalid plan structure or missing workspace
  - 403: Permission denied for file operations
  - 404: Referenced files not found
  - 500: Plan commitment error
- **Security**: Request body size limit (1MB), plan validation, file path security checks
- **Side Effects**: Creates plan file in `.constellation/onboarding/`, initializes walkthrough state

##### POST /onboarding/nextStep
- **Purpose**: Advances to the next step in the active walkthrough
- **Authentication**: Bearer token required
- **Request Body**: None
- **Response**: Next step information with file path, line ranges, and explanation
- **Error Codes**:
  - 412: No active walkthrough
  - 400: Missing workspace
  - 404: Step file not found
  - 500: Step progression error
- **Security**: Workspace validation, file existence checks
- **Side Effects**: Opens files in VS Code editor, highlights line ranges, updates walkthrough state

##### POST /onboarding/finalize
- **Purpose**: Completes walkthrough and performs cleanup operations
- **Authentication**: Bearer token required
- **Request Body**: `{ chosenAction: "document" | "test-plan" | null }`
- **Response**: `{ status: "done", chosenAction: string, summary: object, cleanup: object }`
- **Error Codes**:
  - 400: Invalid chosenAction or missing workspace
  - 403: Permission denied for cleanup operations
  - 500: Finalization error
- **Security**: Request body size limit (1MB), action validation, path security checks
- **Side Effects**: Switches to Default mode, removes plan files, sends webview completion message

##### POST /scan
- **Purpose**: Triggers dependency scanning with timeout handling
- **Authentication**: Bearer token required
- **Request Body**: None
- **Response**: `{ status: "ok" }` on success, `{ error: "timeout" }` on timeout
- **Error Codes**:
  - 400: No workspace folder open
  - 403: Permission denied for file operations
  - 504: Scan timeout (30 seconds)
  - 500: Scan execution error
- **Security**: Workspace validation, file polling with timeout limits
- **Side Effects**: Creates `.constellation/data/codebase-dependencies.json`, triggers dependency-cruiser

## Security Model
- **Webview messaging**: Contained within VS Code's webview sandbox
- **HTTP bridge**: Loopback-only (127.0.0.1) with random bearer tokens
- **Token rotation**: New token generated per extension activation
- **No external access**: Bridge rejects non-loopback connections

### Enhanced Security Patterns
- **Request Size Limits**: 1MB maximum request body size with security logging
- **JSON Validation**: Comprehensive input validation with `SecurityService.validateJsonInput()`
- **Path Validation**: Workspace boundary checks and directory traversal prevention
- **Security Logging**: Detailed logging of authentication failures and security violations
- **Error Sanitization**: Structured error responses without sensitive information leakage
- **Input Sanitization**: Parameter validation and sanitization for all user inputs
- **File System Security**: Workspace-relative path enforcement and permission validation
- **Token Security**: Bearer token validation with detailed violation logging
- **Resource Protection**: Timeout limits and resource usage monitoring

## Development Patterns

### Adding New UI Messages
1. Update type definitions in both `webview-ui/src/services/messenger.ts` and `src/services/messenger.service.ts`
2. Add handler logic in `handleWebviewMessage()`
3. Implement UI sender in appropriate view component

### Adding New HTTP Endpoints
1. Add route handler in `src/services/http-bridge.service.ts`
2. Update MCP server tools to use new endpoint
3. Ensure proper authentication and loopback validation

### Onboarding Message Flow Patterns

#### Mode Switching Flow
1. **UI Request**: `onboarding/change-mode` with target mode
2. **Processing**: Extension calls onboarding mode service
3. **Success Response**: `onboarding/mode-changed` with new mode
4. **Error Response**: `onboarding/mode-error` with error message
5. **Side Effects**: Steering document backup/restore, persona template writing

#### Walkthrough Status Flow
1. **UI Request**: `onboarding/get-status` (typically on component mount)
2. **Processing**: Extension queries walkthrough service state
3. **Response**: `onboarding/status-update` with current walkthrough information
4. **Updates**: Automatic status updates sent during step progression

#### Walkthrough Completion Flow
1. **MCP Tool**: Calls `/onboarding/finalize` HTTP endpoint
2. **Processing**: Extension performs cleanup and generates summary
3. **UI Notification**: `onboarding/finalize-complete` with summary and cleanup details
4. **Side Effects**: Mode switch to Default, plan file removal, webview updates

### Message Flow Testing
- **UI messages**: Use webview developer tools and console logging
- **HTTP bridge**: Manual curl testing with dynamic port/token from MCP config
- **Integration**: Use MCP tool execution to verify end-to-end flow
- **Onboarding flows**: Test mode switching and walkthrough progression through UI components

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
- **Onboarding System**: [onboarding.md](onboarding.md) (comprehensive onboarding workflows and MCP tools)
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