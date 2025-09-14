# Implementation Plan

- [x] 1. Create impact analysis service with dependency traversal logic
  - Implement core BFS traversal algorithm for dependency graph navigation
  - Add path normalization and workspace validation functions
  - Create adjacency map building from GraphData edges for efficient traversal
  - _Requirements: 1.1, 1.2, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 2. Extend HTTP bridge with impact analysis endpoint
  - Add POST /impact-analysis route handler in http-bridge.service.ts
  - Implement request body parsing and bearer token validation
  - Add side effects to open graph view and trigger impact display command
  - _Requirements: 1.3, 4.2, 4.3, 6.3_

- [ ] 3. Register new extension command for impact display coordination - SKIP TASK - OUT OF SCOPE
  - Add constellation.showImpact command registration in extension.ts - SKIP TASK - OUT OF SCOPE
  - Implement command handler to ensure graph panel exists and send webview message - SKIP TASK - OUT OF SCOPE
  - Maintain singleton panel pattern for consistent user experience - SKIP TASK - OUT OF SCOPE
  - _Requirements: 1.3, 4.4_

- [x] 4. Add MCP tool for Kiro integration
  - Register constellation_impactAnalysis tool in mcp.server.ts with zod schema
  - Implement HTTP forwarding to extension bridge endpoint
  - Add error handling for network failures and return structured JSON response
  - _Requirements: 1.1, 4.1, 4.5, 6.1, 6.2_

- [x] 5. Extend messaging protocol for impact communication
  - Add graph/impact message type to GraphOutboundMessage union in messenger.service.ts
  - Update webview messenger.ts types to include new impact message handling
  - Ensure type safety across extension and webview message boundaries
  - _Requirements: 4.4, 4.5_

- [x] 6. Implement graph filtering logic in webview dashboard
  - Add impact state management to GraphDashboard.tsx alongside existing graph state
  - Implement filtered graph computation to create subgraph from affected files list
  - Add message handler for graph/impact to process impact data and filter display
  - Preserve full graph data for reset functionality
  - _Requirements: 2.1, 2.2, 3.3, 3.4_

- [x] 7. Add epicenter highlighting to graph canvas
  - Extend GraphCanvas.tsx to accept impactSourceId prop for visual distinction
  - Add isSource data property to epicenter node for stylesheet targeting
  - Ensure double-click file opening continues to work in filtered mode
  - _Requirements: 2.3, 2.4, 2.5, 2.6_

- [x] 8. Create epicenter styling rules
  - Add epicenter node styles to graph-styles.service.ts with 30% size increase
  - Implement 3px #FF8C00 border with subtle box-shadow halo effect
  - Ensure styles only apply to nodes with isSource data property
  - _Requirements: 2.4, 2.5_

- [x] 9. Add Reset View functionality to graph toolbar
  - Replace placeholder Reset button in GraphToolbar.tsx with functional implementation
  - Show Reset View button only when impact filter is active
  - Implement reset handler to clear impact state and restore full graph display
  - Use existing Button component for consistent styling
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 10. Integrate impact analysis service with graph data loading
  - Import and use loadGraphData function in impact analysis service
  - Handle automatic scanning when dependency data is missing
  - Implement proper error propagation for workspace and scan failures
  - _Requirements: 1.4, 1.5, 6.1, 6.2, 6.4, 6.5_

- [x] 11. Add comprehensive error handling for edge cases
  - Handle file not found in graph scenario with appropriate user messaging
  - Implement graceful fallback for missing workspace or scan failures
  - Add path normalization to handle case sensitivity issues
  - Ensure HTTP bridge authentication failures return empty results gracefully
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 12. Wire together end-to-end impact analysis flow
  - Connect MCP tool → HTTP bridge → extension command → webview message chain
  - Verify impact computation integrates with graph filtering and epicenter highlighting
  - Ensure reset functionality properly restores original graph state
  - Test complete user journey from Kiro query to visual graph display
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 4.1, 4.2, 4.3, 4.4, 4.5_