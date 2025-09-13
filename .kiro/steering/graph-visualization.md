# Graph Visualization

## Overview
Kiro Constellation provides interactive dependency graph visualization using Cytoscape.js. The graph view transforms dependency-cruiser output into an interactive visual representation of your codebase structure.

## Core Features
- **Interactive Navigation**: Click to select nodes, double-click to open files
- **Real-time Updates**: Live progress indicators during scanning and rendering
- **Performance Optimization**: Adaptive rendering for graphs of all sizes
- **Error Resilience**: Graceful handling of edge cases and failures

## Performance Optimizations

### Large Graph Handling
- **Threshold Detection**: Automatically detects large graphs (200+ nodes, 500+ nodes)
- **Adaptive Layouts**: 
  - Standard COSE layout for small/medium graphs (<500 nodes)
  - Simplified grid layout for very large graphs (500+ nodes)
- **Visual Optimizations**:
  - Smaller nodes and fonts for large graphs
  - Thinner, more transparent edges
  - Reduced layout iterations to improve performance

### Memory Management
- **Proper Cleanup**: Comprehensive Cytoscape instance cleanup on component unmount
- **Event Listener Management**: Removes all listeners before destroying instances
- **Error Handling**: Try-catch blocks around all graph operations

### Loading States
- **Progressive Loading**: Separate states for scanning, rendering, and data processing
- **Smart Delays**: setTimeout delays for large graphs to prevent UI blocking
- **Progress Indicators**: Real-time feedback during long operations

## Timeout Handling
- **Scan Timeout**: 30-second limit for dependency scanning operations
- **Progress Reporting**: Countdown timer showing remaining scan time
- **Graceful Failures**: Clear error messages with retry options

## Edge Case Handling
- **Missing Workspace**: Clear messaging when no workspace folder is open
- **Large Files**: Automatic detection and warnings for files >5MB
- **Parse Errors**: Robust error handling for malformed dependency data
- **Network Issues**: Timeout handling with user-friendly error messages

## Data Flow
1. **Scan Trigger**: User action or automatic scan on extension activation
2. **Progress Updates**: Real-time status messages via webview messaging
3. **Data Transformation**: dependency-cruiser output → graph format
4. **Rendering**: Cytoscape.js visualization with performance optimizations
5. **Interaction**: User can navigate and interact with the graph

## Message Types
- `graph/load`: Request dependency graph data
- `graph/data`: Response with transformed graph data
- `graph/status`: Progress updates during operations
- `graph/error`: Error responses with user-friendly messages
- `graph/scan`: Trigger new dependency scan
- `graph/open-file`: Open file from graph node interaction

## File Structure
- **Data Service**: `src/services/graph-data.service.ts`
  - Dependency data transformation
  - File size checking and performance optimization flags
  - Error message constants and handling
- **UI Component**: `webview-ui/src/views/GraphView.tsx`
  - Cytoscape.js integration
  - Performance-aware rendering
  - User interaction handling
- **Messaging**: `src/services/messenger.service.ts`
  - Graph-specific message handling
  - Workspace validation
  - Error propagation

## Performance Metrics
- **Small Graphs** (<200 nodes): Full-featured COSE layout with animations
- **Medium Graphs** (200-500 nodes): Optimized COSE layout with reduced iterations
- **Large Graphs** (500+ nodes): Grid layout with visual simplifications
- **Timeout Limits**: 30-second scan timeout with progress reporting

## Error Messages
- Standardized error constants for consistent user experience
- Context-aware messages based on failure type
- Actionable suggestions for resolution (retry, manual scan, etc.)

## Development Guidelines
- Always clean up Cytoscape instances to prevent memory leaks
- Use performance flags to adapt rendering for different graph sizes
- Provide progress feedback for operations longer than 1 second
- Handle all edge cases gracefully with user-friendly error messages
- Test with both small and large codebases to ensure performance