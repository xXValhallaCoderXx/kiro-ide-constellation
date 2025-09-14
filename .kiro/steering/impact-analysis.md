# Impact Analysis

## Overview
Kiro Constellation provides real-time dependency impact analysis through the `constellation_impactAnalysis` MCP tool. This feature helps developers understand which files will be affected by changes to a specific source file, enabling better decision-making before code modifications.

## Core Functionality
- **BFS Traversal**: Uses breadth-first search to find all dependent files
- **Workspace Integration**: Validates workspace and normalizes file paths
- **Graph Integration**: Leverages dependency-cruiser data for analysis
- **Real-time Results**: Provides immediate feedback through Kiro AI assistant
- **UI Visualization**: Highlights affected files in the dependency graph

## MCP Tool: constellation_impactAnalysis

### Input Schema
```typescript
{
  filePath: string  // Workspace-relative path to analyze (e.g., "src/index.ts")
}
```

### Output Format
```json
{
  "affectedFiles": ["src/index.ts", "src/utils.ts", "src/components/App.tsx"],
  "sourceFile": "src/index.ts",
  "traversalStats": {
    "nodesVisited": 15,
    "edgesTraversed": 23,
    "maxDepth": 4
  }
}
```

### Usage Examples
```bash
# In Kiro AI assistant
#[constellation-mcp] constellation_impactAnalysis { "filePath": "src/index.ts" }
#[constellation-mcp] constellation_impactAnalysis { "filePath": "components/Button.tsx" }
#[constellation-mcp] constellation_impactAnalysis { "filePath": "utils/helpers.js" }
```

## Architecture Components

### Impact Analysis Service (`src/services/impact-analysis.service.ts`)
- **Path Normalization**: Converts absolute/relative paths to workspace-relative format
- **Workspace Validation**: Ensures valid workspace and file accessibility
- **Graph Loading**: Loads and validates dependency data with automatic scanning
- **BFS Algorithm**: Performs breadth-first traversal to find all affected files
- **Heuristic Resolution**: Smart file path matching with extension swaps and case-insensitive matching
- **Error Handling**: Comprehensive error messages for different failure scenarios

### HTTP Bridge Integration (`src/services/http-bridge.service.ts`)
- **Secure Communication**: Bearer token authentication for MCP requests
- **Request Validation**: JSON parsing and input validation
- **Error Responses**: Structured error responses with appropriate HTTP status codes
- **UI Integration**: Triggers graph highlighting via `constellation.showImpact` command

### Graph Data Service (`src/services/graph-data.service.ts`)
- **Data Transformation**: Converts dependency-cruiser output to graph format
- **Performance Optimization**: Handles large graphs with smart loading
- **File Size Detection**: Warns about large dependency files (>5MB)
- **Automatic Scanning**: Triggers dependency scan if data is missing

## Algorithm Details

### BFS Traversal Process
1. **Initialize**: Start with source file as root node
2. **Queue Processing**: Process each node's dependencies
3. **Cycle Detection**: Track visited nodes to prevent infinite loops
4. **Depth Tracking**: Monitor traversal depth for statistics
5. **Result Collection**: Gather all affected files with metadata

### Path Resolution Heuristics
1. **Exact Match**: Direct ID match in dependency graph
2. **Case-Insensitive**: Lowercase comparison for case variations
3. **Extension Swaps**: Try .js↔.ts and .jsx↔.tsx conversions
4. **Basename Matching**: Match by filename with directory scoring

### Error Handling Scenarios
- **No Workspace**: Clear message when no workspace folder is open
- **Missing Data**: Automatic dependency scan trigger with timeout
- **File Not Found**: Graceful handling for files not in graph or on disk
- **Parse Errors**: Robust error handling for malformed dependency data
- **Permission Issues**: Clear messages for file access problems

## Performance Considerations
- **30-Second Timeout**: Dependency scanning limited to prevent blocking
- **Large Graph Handling**: Optimized for codebases with 500+ files
- **Memory Management**: Efficient adjacency map construction
- **Progress Reporting**: Real-time status updates during long operations

## Security Features
- **Path Validation**: Prevents directory traversal attacks
- **Workspace Boundaries**: Ensures files are within workspace scope
- **Loopback Only**: HTTP bridge restricted to 127.0.0.1
- **Token Authentication**: Random bearer tokens for each session

## Integration Points
- **MCP Server**: `src/mcp.server.ts` - Tool registration and HTTP communication
- **Extension Commands**: `constellation.showImpact` - UI integration
- **Graph Visualization**: Highlights affected nodes in dependency graph
- **Error Logging**: Comprehensive logging for debugging and monitoring

## Usage Patterns
- **Pre-Refactoring**: Analyze impact before making changes
- **Code Review**: Understand change scope during reviews
- **Architecture Analysis**: Identify highly coupled components
- **Testing Strategy**: Determine test coverage needs based on impact

## Error Messages
- Standardized error constants for consistent user experience
- Context-aware messages based on failure type
- Actionable suggestions for resolution (retry, manual scan, etc.)
- Graceful fallbacks with empty results when appropriate

## Development Guidelines
- Always validate workspace before processing
- Use workspace-relative paths for consistency
- Provide progress feedback for operations >1 second
- Handle all edge cases gracefully with user-friendly messages
- Log errors for debugging while preserving user experience
- Test with both small and large codebases to ensure performance