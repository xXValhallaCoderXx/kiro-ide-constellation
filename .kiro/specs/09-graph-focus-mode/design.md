# Design Document

## Overview

The Graph Focus Mode feature implements a client-side drill-down navigation system for the existing Cytoscape.js dependency graph visualization. The design leverages breadth-first search (BFS) algorithms to compute visible node sets and uses imperative Cytoscape operations to efficiently update the view without full re-rendering. The system maintains stable layouts, provides breadcrumb navigation, and integrates seamlessly with existing impact analysis functionality.

## Architecture

### High-Level Architecture

The focus mode system operates entirely within the webview client and consists of four main components:

1. **Focus Mode Service** - Core algorithms for adjacency computation and visibility calculation
2. **Focus Breadcrumb Component** - Navigation UI for breadcrumb display and interaction
3. **Enhanced GraphCanvas** - Imperative API for view manipulation and event handling
4. **GraphDashboard State Management** - Focus state coordination and keyboard handling

### Data Flow

```
GraphData (from extension) 
    ↓
buildAdjacency() → { forwardAdj, reverseAdj }
    ↓
User Double-Click → drillTo(nodeId)
    ↓
computeVisible() → { visibleNodes, visibleEdges }
    ↓
applyFocusView() → Cytoscape style updates
    ↓
centerOn(rootId) → Viewport centering
```

### State Management

The focus mode maintains two primary state categories:

**Immutable Graph State:**
- `fullGraphData`: Complete GraphData from extension
- `forwardAdj`: Map<string, string[]> for outgoing dependencies
- `reverseAdj`: Map<string, string[]> for incoming dependencies (P1)

**Mutable View State:**
- `root`: string | null (currently focused node ID)
- `depth`: number (fixed at 1 for P0)
- `lens`: 'children' (P0 only)
- `visibleNodes`: Set<string>
- `visibleEdges`: Set<string>
- `crumbs`: Array<Crumb>

## Components and Interfaces

### Focus Mode Service (`focus-mode.service.ts`)

```typescript
export type FocusLens = 'children' | 'parents';

export interface Crumb {
  root: string;
  depth: number;
  lens: FocusLens;
  label: string;
}

export interface VisibilityResult {
  visibleNodes: Set<string>;
  visibleEdges: Set<string>;
}

export interface ComputeVisibleArgs {
  forwardAdj: Map<string, string[]>;
  reverseAdj: Map<string, string[]>;
  root: string;
  depth: number;
  lens: FocusLens;
  maxChildren?: number;
}

// Core functions
export function buildAdjacency(graph: GraphData): {
  forwardAdj: Map<string, string[]>;
  reverseAdj: Map<string, string[]>;
}

export function computeVisible(args: ComputeVisibleArgs): VisibilityResult

export function formatCrumb(
  graph: GraphData, 
  root: string, 
  depth: number, 
  lens: FocusLens
): Crumb
```

### Focus Breadcrumb Component (`focus-breadcrumb.tsx`)

```typescript
export interface FocusBreadcrumbProps {
  crumbs: Crumb[];
  onJump: (index: number) => void;
  onReset: () => void;
}

export function FocusBreadcrumb({ crumbs, onJump, onReset }: FocusBreadcrumbProps)
```

**Rendering Logic:**
- Horizontal layout with chevron separators (▶)
- Clickable breadcrumb items with hover states
- Reset button using shared Button component
- Responsive text truncation for long file names

### Enhanced GraphCanvas (`GraphCanvas.tsx`)

**New Imperative API:**
```typescript
export interface GraphCanvasRef {
  applyFocusView: (params: {
    visibleNodes: Set<string>;
    visibleEdges: Set<string>;
    rootId: string;
  }) => void;
  centerOn: (rootId: string, options?: { animate?: boolean }) => void;
  getPositions: () => Record<string, { x: number; y: number }>;
  setPositions: (positions: Record<string, { x: number; y: number }>) => void;
}

export interface GraphCanvasProps {
  // ... existing props
  onNodeDrill?: (nodeId: string) => void;
}
```

**Implementation Details:**
- Double-click event handler calls `onNodeDrill` prop
- `applyFocusView` uses `cy.batch()` for efficient style updates
- Two visibility strategies: `display: none` (default) or `dimmed` class
- Position caching for smooth breadcrumb navigation
- Centering with optional animation (150-200ms duration)

### GraphDashboard State Management

**Focus State Interface:**
```typescript
interface FocusState {
  isActive: boolean;
  root: string | null;
  depth: number;
  lens: FocusLens;
  visibleNodes: Set<string>;
  visibleEdges: Set<string>;
  crumbs: Crumb[];
  positionCache: Record<string, { x: number; y: number }>;
}
```

**Key Methods:**
- `handleNodeDrill(nodeId: string)` - Processes double-click events
- `handleBreadcrumbJump(index: number)` - Handles breadcrumb navigation
- `handleReset()` - Returns to full graph view
- `handleEscapeKey()` - Keyboard navigation support

## Data Models

### Adjacency Map Construction

The `buildAdjacency` function transforms GraphData into efficient lookup maps:

```typescript
function buildAdjacency(graph: GraphData) {
  const forwardAdj = new Map<string, string[]>();
  const reverseAdj = new Map<string, string[]>();
  
  // Initialize empty arrays for all nodes
  graph.nodes.forEach(node => {
    forwardAdj.set(node.id, []);
    reverseAdj.set(node.id, []);
  });
  
  // Populate adjacency maps from edges
  graph.edges.forEach(edge => {
    const sourceChildren = forwardAdj.get(edge.source) || [];
    sourceChildren.push(edge.target);
    forwardAdj.set(edge.source, sourceChildren);
    
    const targetParents = reverseAdj.get(edge.target) || [];
    targetParents.push(edge.source);
    reverseAdj.set(edge.target, targetParents);
  });
  
  return { forwardAdj, reverseAdj };
}
```

### BFS Visibility Computation

The core algorithm uses breadth-first search with depth limiting:

```typescript
function computeVisible({
  forwardAdj,
  reverseAdj,
  root,
  depth,
  lens,
  maxChildren = 100
}: ComputeVisibleArgs): VisibilityResult {
  const visibleNodes = new Set<string>();
  const visibleEdges = new Set<string>();
  const visited = new Set<string>();
  const queue: Array<{ id: string; d: number }> = [{ id: root, d: 0 }];
  
  visited.add(root);
  visibleNodes.add(root);
  
  while (queue.length > 0) {
    const { id, d } = queue.shift()!;
    
    if (d === depth) continue;
    
    const adjacencyMap = lens === 'children' ? forwardAdj : reverseAdj;
    const neighbors = adjacencyMap.get(id) || [];
    
    let count = 0;
    for (const neighborId of neighbors) {
      if (count++ >= maxChildren) break;
      
      // Add edge to visible set
      const edgeId = lens === 'children' 
        ? `${id}->${neighborId}` 
        : `${neighborId}->${id}`;
      visibleEdges.add(edgeId);
      
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        visibleNodes.add(neighborId);
        queue.push({ id: neighborId, d: d + 1 });
      }
    }
  }
  
  return { visibleNodes, visibleEdges };
}
```

## Error Handling

### Edge Case Management

**Root Node Not Found:**
- Detect stale breadcrumbs during navigation
- Display toast notification with clear message
- Automatically reset to full graph view
- Log error details for debugging

**Empty Children Set:**
- Display inline empty state: "No children at depth 1"
- Maintain breadcrumb navigation and Reset button
- Provide visual feedback that the node is valid but has no dependencies

**Extreme Fan-out (>100 children):**
- Cap visible children at configurable limit (default: 100)
- Display "+N more" badge with count of hidden children
- Provide optional "Show All" button for P1
- Log performance warnings for very large fan-outs

**Cycle Detection:**
- Use visited set during BFS traversal
- Prevent infinite loops in circular dependencies
- Maintain correct depth calculations despite cycles

### Performance Error Handling

**Timeout Protection:**
- Monitor computation time for `computeVisible` operations
- Log warnings when operations exceed 50ms threshold
- Provide fallback to simpler visualization for extreme cases

**Memory Management:**
- Clean up large Set objects after view updates
- Cache position data efficiently
- Monitor memory usage during large graph operations

## Testing Strategy

- Write no tests

### Error Scenario Testing

**Robustness Testing:**
- Malformed graph data handling
- Missing node references in breadcrumbs
- Network interruptions during graph loading
- Concurrent user interactions during focus operations

## Impact Analysis Integration

### Seamless Integration Design

The focus mode integrates with existing impact analysis through the concept of "active graph":

```typescript
// Determine which graph to use for focus operations
const activeGraph = impactState.isActive 
  ? impactState.filteredGraph 
  : fullGraphData;

// Build adjacency maps for the active graph
const { forwardAdj, reverseAdj } = buildAdjacency(activeGraph);
```

### Integration Workflow

1. **Impact Analysis Activation:**
   - Extension sends `graph/impact` message with source file and affected files
   - GraphDashboard creates filtered subgraph from impact results
   - Focus mode automatically activates with `root = sourceFile`
   - Breadcrumbs seed with source file as first crumb

2. **Focus Within Impact:**
   - All focus operations work on the filtered impact subgraph
   - Double-click drilling limited to nodes within impact results
   - Breadcrumb navigation maintains impact context
   - Visual styling preserves impact-specific markers (isSource, fromSource)

3. **Reset Behavior:**
   - Reset button clears both impact state and focus crumbs
   - Returns to full graph view with all nodes visible
   - Maintains consistent state between impact and focus modes

### Visual Integration

**Impact-Specific Styling Preservation:**
- Source node: Maintains impact source styling + focus root halo
- Direct children: Combines impact child styling + focus child borders
- Affected nodes: Preserves impact highlighting within focus view

**Banner Integration:**
- Existing impact analysis banner remains visible during focus
- Optional "Impact" badge in breadcrumb area
- Consistent Reset behavior across both systems

## Performance Optimizations

### Computational Efficiency

**Adjacency Map Caching:**
- Build adjacency maps once per graph data load
- Reuse maps across multiple focus operations
- Efficient Map-based lookups for BFS traversal

**Batch Operations:**
- Single `cy.batch()` call for all style updates
- Minimize DOM manipulation and reflow operations
- Efficient Set operations for visibility calculations

**Memory Management:**
- Position caching with automatic cleanup
- Efficient breadcrumb storage and manipulation
- Garbage collection friendly data structures

### Visual Performance

**Layout Stability:**
- No global re-layout during focus operations
- Preserve existing node positions
- Smooth centering animations with configurable duration

**Rendering Strategy:**
- Default: `display: none` for hidden elements (best performance)
- Alternative: `dimmed` class with opacity reduction (better context)
- Configurable strategy via constants

**Large Graph Handling:**
- Fan-out capping at 100 children (configurable)
- Performance warnings for extreme cases
- Graceful degradation for very large graphs

## Security Considerations

### Client-Side Security

**Input Validation:**
- Validate node IDs before focus operations
- Sanitize breadcrumb labels for display
- Prevent injection through graph data manipulation

**Memory Safety:**
- Bounded Set sizes for visibility calculations
- Cleanup of event listeners and cached data
- Protection against memory leaks in long-running sessions

**Error Boundary Protection:**
- Graceful handling of malformed graph data
- Fallback to safe states on computation errors
- User-friendly error messages without sensitive information

## Future Extensibility

### P1 Features (Planned)

**Depth Controls:**
- Slider or +/- buttons for depth 1-3
- Dynamic recomputation on depth changes
- Breadcrumb integration with depth information

**Parents Lens:**
- Toggle between children and parents view
- Reverse adjacency map utilization
- Bidirectional navigation capabilities

**Enhanced Visualization:**
- Local layout settling for visible nodes
- Advanced styling for different relationship types
- Minimap or overview for large focused areas

### P2 Features (Future)

**Advanced Navigation:**
- Shortest path highlighting between nodes
- Multi-root focus capabilities
- Saved focus states and bookmarks

**Performance Enhancements:**
- WebWorker-based computation for large graphs
- Progressive loading for extreme fan-out scenarios
- Advanced caching strategies

**Integration Expansions:**
- Command palette integration for direct focus
- URL-based focus state sharing
- Export capabilities for focused views