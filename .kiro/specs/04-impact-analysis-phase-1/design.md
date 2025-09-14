# Design Document

## Overview

The Impact Analysis feature extends Constellation's existing dependency visualization capabilities to provide targeted impact analysis for code changes. The design leverages the current dependency-cruiser integration, graph data transformation, and webview messaging architecture while adding new components for dependency traversal, MCP tool integration, and graph filtering.

The feature follows a request-response pattern where Kiro AI assistant triggers analysis through an MCP tool, the extension computes the impact using dependency graph traversal, and the webview displays a filtered subgraph with visual highlighting of the epicenter file.

## Architecture

### High-Level Flow
1. **User Query**: Developer asks Kiro "What is the impact of changing <file>?"
2. **MCP Tool Invocation**: Kiro calls `constellation_impactAnalysis` with file path
3. **HTTP Bridge**: MCP server forwards request to extension via HTTP endpoint
4. **Impact Computation**: Extension performs dependency traversal and returns affected files
5. **UI Update**: Extension opens graph view and sends filtered data to webview
6. **Visual Display**: Webview renders filtered subgraph with epicenter highlighting

### Component Integration
- **Existing**: dependency-cruiser scanning, graph data transformation, webview messaging
- **New**: impact analysis service, MCP tool, HTTP bridge endpoint, graph filtering UI
- **Enhanced**: messaging protocol, graph visualization with filtering capabilities

## Components and Interfaces

### 1. Impact Analysis Service (`src/services/impact-analysis.service.ts`)

**Purpose**: Core business logic for computing dependency impact through graph traversal.

**Key Functions**:
```typescript
export interface ImpactResult {
  affectedFiles: string[];
  sourceFile: string;
  traversalStats?: {
    nodesVisited: number;
    edgesTraversed: number;
    maxDepth: number;
  };
}

export async function computeImpact(
  context: vscode.ExtensionContext, 
  filePath: string
): Promise<ImpactResult>
```

**Algorithm Design**:
- **Input Normalization**: Convert file path to workspace-relative format matching GraphData node IDs
- **Graph Loading**: Reuse `loadGraphData()` with automatic scanning if needed
- **Adjacency Building**: Create `Map<string, string[]>` from GraphData edges for efficient traversal
- **BFS Traversal**: Breadth-first search following "children" direction (importer → imported)
- **Cycle Prevention**: Use `Set<string>` to track visited nodes and prevent infinite loops
- **Result Assembly**: Return affected files list including source file in discovery order

**Error Handling**:
- File not in graph: Return source file only with appropriate message
- Missing dependency data: Trigger scan and retry with timeout
- Workspace validation: Check for open workspace before processing
- Path normalization: Handle case sensitivity and relative path conversion

### 2. MCP Tool Integration (`src/mcp.server.ts`)

**Purpose**: Expose impact analysis capability to Kiro AI assistant through MCP protocol.

**Tool Registration**:
```typescript
server.registerTool("constellation_impactAnalysis", {
  title: "Impact Analysis",
  description: "Analyzes dependency impact of changing a source file",
  inputSchema: { filePath: z.string() }
}, async ({ filePath }) => {
  // Forward to HTTP bridge endpoint
  // Return JSON response with affected files
})
```

**Implementation Strategy**:
- **HTTP Forwarding**: Use existing bridge pattern with `/impact-analysis` endpoint
- **Environment Variables**: Leverage `CONSTELLATION_BRIDGE_PORT` and `CONSTELLATION_BRIDGE_TOKEN`
- **Error Resilience**: Graceful fallback to empty results on network/auth failures
- **Response Format**: Return JSON content type for structured data when supported

### 3. HTTP Bridge Extension (`src/services/http-bridge.service.ts`)

**Purpose**: Extend existing HTTP bridge with new endpoint for impact analysis requests.

**New Endpoint**:
```typescript
POST /impact-analysis
Content-Type: application/json
Authorization: Bearer <token>

Request: { filePath: string }
Response: { affectedFiles: string[] }
```

**Side Effects**:
- Execute `constellation.openGraphView` command to ensure graph panel is visible
- Execute `constellation.showImpact` command to trigger UI filtering
- Maintain existing security model (loopback-only, bearer token authentication)

### 4. Extension Command Integration (`src/extension.ts`)

**Purpose**: Add new command for coordinating impact display in webview.

**New Command**:
```typescript
constellation.showImpact: (payload: { sourceFile: string; affectedFiles: string[] }) => void
```

**Responsibilities**:
- Ensure graph panel exists and is visible
- Post `graph/impact` message to webview with impact data
- Maintain singleton panel pattern for consistent user experience

### 5. Messaging Protocol Extensions

**New Message Types**:
```typescript
// Extension → Webview
type GraphOutboundMessage = 
  | { type: 'graph/impact'; payload: { sourceFile: string; affectedFiles: string[] } }
  | { type: 'graph/resetImpact' } // Optional, can reuse graph/load
  | /* existing types */

// Webview → Extension (no changes needed for Phase 1)
```

**Message Flow**:
1. HTTP bridge → Extension command → Webview message
2. Webview processes impact data and filters graph
3. Reset functionality reloads full graph data

### 6. Graph Filtering UI (`webview-ui/src/components/`)

**GraphDashboard.tsx Enhancements**:
- **State Management**: Add impact state alongside existing graph data state
- **Full Graph Preservation**: Maintain original graph data for reset functionality
- **Filtered Graph Computation**: Create subgraph containing only affected nodes/edges
- **Reset Control**: Add Reset View button when impact filter is active

**GraphCanvas.tsx Enhancements**:
- **Epicenter Highlighting**: Accept `impactSourceId` prop for visual distinction
- **Node Data Extension**: Add `isSource: boolean` to node data for styling
- **Stylesheet Integration**: Apply epicenter styles through existing style service

**GraphToolbar.tsx Enhancements**:
- **Reset View Button**: Replace placeholder with functional reset control
- **Conditional Display**: Show reset button only when impact filter is active
- **Button Styling**: Reuse existing Button component for consistency

## Data Models

### Impact Analysis Data Flow

**Input**: Workspace-relative file path (e.g., "src/services/user-service.ts")
**Processing**: BFS traversal through dependency adjacency map
**Output**: Ordered list of affected files including source

**Graph Filtering Data**:
```typescript
interface FilteredGraphData {
  nodes: Node[];           // Subset of original nodes
  edges: Edge[];           // Subset of original edges  
  epicenterId: string;     // Source file for highlighting
  originalCount: {         // For user feedback
    nodes: number;
    edges: number;
  };
}
```

**Adjacency Map Structure**:
```typescript
// Built from GraphData.edges for efficient traversal
Map<string, string[]>  // sourceId → [targetId1, targetId2, ...]
```

### Message Payload Schemas

**Impact Request** (MCP → Extension):
```typescript
{ filePath: string }  // Workspace-relative path
```

**Impact Response** (Extension → Webview):
```typescript
{ 
  sourceFile: string;      // Original file path
  affectedFiles: string[]; // All affected files (including source)
}
```

## Error Handling

### Input Validation
- **File Path Normalization**: Convert to workspace-relative format using `path.relative()`
- **Workspace Validation**: Ensure workspace folder exists before processing
- **Graph Data Availability**: Trigger scan if dependency data missing

### Traversal Edge Cases
- **File Not in Graph**: Return source file only with informative message
- **Isolated Nodes**: Handle files with no dependencies gracefully
- **Circular Dependencies**: Prevent infinite loops with visited set tracking
- **Large Graphs**: Maintain performance with efficient adjacency map structure

### Network and Authentication
- **HTTP Bridge Failures**: Return empty results with error logging
- **Token Validation**: Reuse existing bearer token authentication
- **Timeout Handling**: Leverage existing 30-second scan timeout for data loading

### UI Error States
- **Missing Workspace**: Display clear message when no workspace open
- **Scan Failures**: Show retry options with scan error details
- **Rendering Errors**: Graceful fallback to full graph on filtering failures

## Testing Strategy

No Unit Test Or Integrations Tests

### Manual Testing Scenarios
1. **Basic Flow**: Request impact for file with dependencies
2. **Isolated File**: Analyze file with no outgoing dependencies  
3. **Missing File**: Request impact for non-existent file
4. **Large Graph**: Test performance with 500+ node projects
5. **Reset Functionality**: Verify full graph restoration
6. **Error Recovery**: Test behavior with scan failures and network issues

### Performance Testing
- **Traversal Speed**: Measure BFS performance on various graph sizes
- **Memory Usage**: Monitor adjacency map memory consumption
- **UI Responsiveness**: Ensure filtering doesn't block interface
- **Timeout Compliance**: Verify 1s/3s response time requirements

## Visual Design Specifications

### Epicenter Node Styling
```css
/* Applied to node with data.isSource = true */
node[isSource] {
  width: 130%;           /* 30% larger than normal */
  height: 130%;
  border-width: 3px;
  border-color: #FF8C00;  /* Orange border */
  box-shadow: 0 0 10px rgba(255, 140, 0, 0.5); /* Subtle halo */
}
```

### Reset View Button
- **Location**: Graph toolbar, right side
- **Style**: Consistent with existing Button component
- **Visibility**: Only shown when impact filter is active
- **Label**: "Reset View" with optional icon

### Filtered Graph Layout
- **Node Subset**: Display only nodes in affected files list
- **Edge Subset**: Show edges where both source and target are in affected files
- **Layout Preservation**: Maintain relative positioning when possible
- **Performance**: Apply existing optimizations for large filtered sets

## Implementation Dependencies

### Existing Services (Reused)
- `graph-data.service.ts`: Graph loading and transformation
- `dependency-cruiser.service.ts`: Background scanning capability
- `messenger.service.ts`: Webview communication patterns
- `http-bridge.service.ts`: Secure endpoint infrastructure

### New Services (Created)
- `impact-analysis.service.ts`: Core traversal and computation logic
- Enhanced MCP tool registration in `mcp.server.ts`
- New command registration in `extension.ts`

### UI Components (Enhanced)
- `GraphDashboard.tsx`: Impact state management and filtering
- `GraphCanvas.tsx`: Epicenter highlighting and filtered rendering
- `GraphToolbar.tsx`: Reset View button integration
- `graph-styles.service.ts`: Epicenter styling rules

## Security Considerations

### HTTP Bridge Security
- **Loopback Restriction**: Maintain existing 127.0.0.1-only binding
- **Token Authentication**: Reuse existing bearer token validation
- **Request Validation**: Sanitize file path inputs to prevent directory traversal

### File System Access
- **Workspace Boundaries**: Ensure file paths remain within workspace root
- **Path Sanitization**: Use `path.relative()` and `path.resolve()` for safe path handling
- **Permission Validation**: Leverage existing file system access patterns

### Data Exposure
- **Dependency Information**: Only expose file paths already available in dependency scan
- **Error Messages**: Avoid leaking sensitive file system information
- **Response Filtering**: Return only workspace-relative paths in results