# Implementation Plan

- [x] 1. Enhance MCP configuration service to inject workspace root environment variable
  - Modify `upsertUserMcpConfig` and `maybeWriteWorkspaceConfig` functions to include `CONSTELLATION_WORKSPACE_ROOT` in the env object
  - Extract workspace root path from `vscode.workspace.workspaceFolders[0].uri.fsPath`
  - Ensure backward compatibility with existing environment variables
  - _Requirements: 3.1, 3.2_

- [x] 2. Add HTTP bridge scan endpoint for dependency scanning
  - Implement `POST /scan` endpoint in `http-bridge.service.ts`
  - Integrate with existing `runScan(context)` service from dependency-cruiser integration
  - Add polling mechanism for graph file existence with 500ms intervals and 30-second timeout
  - Return structured JSON responses: `{ status: 'ok' }` on success, `{ error: 'timeout' }` on failure
  - Maintain loopback-only security with bearer authentication
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 5.5_

- [x] 3. Create graph context service within MCP server
  - Add graph file reading functionality using `CONSTELLATION_WORKSPACE_ROOT` environment variable
  - Implement JSON parsing with error handling for malformed data
  - Create adjacency map builder for forward and reverse dependency relationships
  - Add file size validation and warnings for large graph files (>5MB)
  - _Requirements: 3.1, 3.2, 4.1, 7.3_

- [x] 4. Implement seed resolution engine with heuristic matching
  - Create exact match resolver for direct node ID lookup
  - Implement case-insensitive matching with lowercase comparison
  - Add extension swap logic (.js↔.ts, .jsx↔.tsx) for TypeScript/JavaScript projects
  - Build basename scoring algorithm with directory path similarity
  - Add topic-to-file matching using substring and path scoring
  - Reuse resolution logic patterns from `impact-analysis.service.ts` for consistency
  - _Requirements: 1.1, 1.2, 1.4_

- [x] 5. Build BFS traversal engine for related file discovery
  - Implement breadth-first search over union graph (forward ∪ reverse edges)
  - Add depth limiting with configurable maximum depth (default: 1)
  - Create cycle detection to prevent infinite loops
  - Implement ranking by distance (depth) first, then by node degree
  - Add result limiting with configurable maximum results (default: 30)
  - Include traversal statistics (nodes visited, edges traversed, max depth)
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 6. Enhance constellation_onboarding.plan tool with graph context integration
  - Modify plan tool handler in `mcp.server.ts` to read workspace root from environment
  - Add graph file loading with automatic scan triggering when file is missing
  - Integrate seed resolution for both file-based and topic-based requests
  - Call BFS traversal engine to compute related files
  - Enrich response format to include both plan and context fields
  - Handle all error scenarios gracefully with empty relatedFiles fallback
  - _Requirements: 1.1, 1.3, 2.1, 2.2, 6.1, 6.2, 7.1, 7.2_

- [x] 7. Add HTTP bridge client functionality to MCP server
  - Implement HTTP client for calling `POST /scan` endpoint when graph file is missing
  - Add retry logic: attempt scan once, then retry graph file reading
  - Handle network errors and timeouts gracefully
  - Use existing environment variables for bridge port and token
  - Maintain security with proper authentication headers
  - _Requirements: 2.1, 2.2, 5.5, 8.3_

- [x] 8. Implement comprehensive error handling and security validation
  - Add workspace boundary validation to prevent directory traversal
  - Implement path normalization and security checks for all file operations
  - Add input validation for JSON parsing with size limits
  - Create structured error responses with appropriate HTTP status codes
  - Add security logging for authentication failures and path violations
  - Ensure all file paths returned are workspace-relative, never absolute
  - _Requirements: 7.1, 7.2, 7.3, 8.1, 8.2, 8.3, 8.4_

- [x] 9. Add performance optimizations and resource management
  - Implement configurable limits for graph processing (nodes, edges, file size)
  - Add memory-efficient adjacency map construction
  - Create early termination for oversized graphs
  - Add timeout handling for all network operations
  - Implement lazy loading of graph data to reduce startup time
  - _Requirements: 4.3, 7.3_

- [x] 10. Create comprehensive test coverage for graph context functionality
  - Write unit tests for seed resolution heuristics with various file path formats
  - Create BFS traversal tests with cycle detection and depth limiting
  - Add integration tests for complete plan tool workflow with graph context
  - Test error scenarios: missing files, malformed data, network failures
  - Create performance tests with large synthetic graphs (500+ nodes)
  - Add security tests for path traversal prevention and authentication
  - _Requirements: 1.1, 1.2, 1.4, 4.1, 4.2, 4.3, 7.1, 7.2, 8.1, 8.2_