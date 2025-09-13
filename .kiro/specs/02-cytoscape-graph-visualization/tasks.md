# Implementation Plan

- [x] 1. Add Cytoscape dependency and update package configuration
  - Add "cytoscape": "^3.27.0" to Dependencies in root package.json
  - Ensure Vite will bundle Cytoscape into webview UI build
  - _Requirements: R1.1, R5.1_

- [x] 2. Create graph data service for dependency transformation
  - Create src/services/graph-data.service.ts with loadGraphData function
  - Implement workspace detection and file path resolution logic
  - Add polling mechanism for scan completion with 30-second timeout
  - _Requirements: R2.1, R2.4, R4.1, R7.4_

- [x] 2.1 Implement dependency-cruiser data transformation
  - Write transformDepCruise function to convert modules array to nodes/edges
  - Map workspace-relative paths to node IDs and absolute paths for file operations
  - Map dependency types (esm, cjs, dynamic) to simplified edge kinds
  - Generate unique edge IDs with collision handling
  - _Requirements: R4.2, R4.3, R4.4, R4.5_

- [x] 2.2 Add error handling and status reporting
  - Implement graceful handling for missing workspace, scan failures, parse errors
  - Create specific error messages for different failure scenarios
  - Add file size checking and loading indicators for large files (>5MB)
  - _Requirements: R2.5, R7.3_

- [x] 3. Extend messaging system for graph communication
  - Add GraphInboundMessage types to src/services/messenger.service.ts InboundMessage union
  - Implement message handlers for 'graph/load', 'graph/open-file', and 'graph/scan'
  - Add GraphOutboundMessage types for webview communication
  - _Requirements: R7.1, R7.2, R7.5_

- [x] 3.1 Wire graph message handling in extension
  - Extend handleWebviewMessage function to route graph messages to graph data service
  - Implement file opening using vscode.workspace.openTextDocument and showTextDocument
  - Add webview message posting for graph/data, graph/error, and graph/status responses
  - _Requirements: R3.1, R7.2_

- [x] 3.2 Connect graph panel to messaging system
  - Modify constellation.openGraphView command in src/extension.ts to attach message handlers
  - Route webview messages through centralized messenger service
  - Ensure proper cleanup of message handlers on panel disposal
  - _Requirements: R7.1, R7.4_

- [x] 4. Implement Cytoscape GraphView component
  - Replace placeholder GraphView.tsx with Cytoscape integration
  - Add cytoscape import and container div setup
  - Implement component state for loading, error, and graph data
  - _Requirements: R1.1, R1.4, R1.5_

- [x] 4.1 Add graph data loading and rendering
  - Send 'graph/load' message on component mount
  - Listen for 'graph/data', 'graph/error', and 'graph/status' messages
  - Create Cytoscape instance with nodes and edges from message payload
  - Apply 'cose' layout with fit: true configuration
  - _Requirements: R1.2, R2.2, R2.3, R5.1, R5.4_

- [x] 4.2 Implement graph styling and interactions
  - Apply VS Code theme-derived colors for nodes and subtle edge colors
  - Add pan and zoom capabilities (enabled by default in Cytoscape)
  - Implement single-click node highlighting with visual feedback
  - Add double-click handler to send 'graph/open-file' message with node path
  - _Requirements: R1.3, R3.1, R3.2, R5.2, R5.3, R5.5_

- [x] 4.3 Add re-scan functionality and status display
  - Create "Re-scan" button that sends 'graph/scan' message
  - Display loading states during scanning with "Scanning project..." text
  - Handle scan completion by automatically refreshing graph data
  - Show error messages for scan failures without breaking current graph
  - _Requirements: R6.1, R6.2, R6.3, R6.4_

- [x] 5. Update webview messenger service for graph messages
  - Add graph message types to webview-ui/src/services/messenger.ts Message union
  - Ensure type safety for graph/load, graph/open-file, and graph/scan message posting
  - Add message listener support for graph/data, graph/error, and graph/status
  - _Requirements: R7.5_

- [x] 6. Handle edge cases and performance optimization
  - Implement timeout handling for dependency scans longer than 30 seconds
  - Add loading indicators for large graphs and file processing
  - Ensure proper Cytoscape instance cleanup on component unmount
  - Handle missing workspace scenario with appropriate user messaging
  - _Requirements: R1.2, R2.4, R2.5_