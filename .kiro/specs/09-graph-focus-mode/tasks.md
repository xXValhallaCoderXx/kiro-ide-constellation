# Implementation Plan

- [x] 1. Create focus mode service with core algorithms
  - Implement `buildAdjacency()` function to transform GraphData into forward and reverse adjacency maps
  - Implement `computeVisible()` function with BFS traversal algorithm for depth-limited visibility calculation
  - Implement `formatCrumb()` helper function for breadcrumb label generation with basename extraction
  - Create TypeScript interfaces for FocusLens, Crumb, VisibilityResult, and ComputeVisibleArgs
  - Add fan-out capping logic with configurable maxChildren parameter (default 100)
  - Include cycle detection using visited set during BFS traversal
  - _Requirements: 1.1, 1.3, 4.1, 4.5, 6.1, 8.3_

- [x] 2. Create focus breadcrumb component
  - Create FocusBreadcrumb component with props interface for crumbs, onJump, and onReset handlers
  - Implement horizontal breadcrumb layout with chevron separators (▶) between items
  - Add clickable breadcrumb items that trigger onJump callback with index parameter
  - Implement Reset button using shared Button component that calls onReset callback
  - Add responsive text truncation for long file names using CSS ellipsis in the middle
  - Style breadcrumb component with focus-crumbs, focus-crumb, focus-crumb-sep, and focus-reset CSS classes
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3. Enhance GraphCanvas with imperative API and event handling
  - Add GraphCanvasRef interface with applyFocusView, centerOn, getPositions, and setPositions methods
  - Implement applyFocusView method using cy.batch() for efficient style updates with display:none strategy
  - Add centerOn method with optional animation parameter for smooth viewport transitions (150-200ms duration)
  - Implement position caching methods (getPositions/setPositions) for breadcrumb navigation smoothness
  - Add double-click event handler that calls onNodeDrill prop with node ID
  - Create CSS classes for visibility control: cy-hidden (display: none) and cy-dimmed (opacity: 0.2)
  - Add visual emphasis classes for root node (halo ring + thicker border) and direct children (thicker border)
  - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.4, 7.1, 7.2, 7.3, 7.5_

- [x] 4. Implement GraphDashboard focus state management
  - Add FocusState interface with isActive, root, depth, lens, visibleNodes, visibleEdges, crumbs, and positionCache properties
  - Implement handleNodeDrill method that computes visibility, updates state, pushes breadcrumb, and applies view
  - Add handleBreadcrumbJump method that jumps to specific crumb index and truncates later crumbs
  - Implement handleReset method that clears focus state and returns to full graph view
  - Add keyboard event listener for Escape key that calls handleEscapeKey method when breadcrumbs exist
  - Build and cache adjacency maps when graph data arrives via 'graph/data' message
  - Render FocusBreadcrumb component above GraphCanvas when crumbs.length > 0
  - _Requirements: 2.1, 3.1, 3.2, 3.3, 4.2, 4.3, 4.4_

- [x] 5. Add CSS styles for focus mode visual elements
  - Create .focus-crumbs container styles with proper spacing and alignment above graph canvas
  - Style .focus-crumb items as clickable elements with hover states and proper typography
  - Add .focus-crumb-sep styles for chevron separators with appropriate spacing and color
  - Style .focus-reset button to match existing UI patterns using shared button styles
  - Implement .cy-hidden class with display: none for performance-optimized visibility control
  - Add .cy-dimmed class with opacity: 0.2 and pointer-events: none as alternative visibility strategy
  - Create root node emphasis styles reusing existing halo patterns with neutral color
  - Add direct children emphasis styles with slightly thicker borders
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 6. Implement error handling and edge cases
  - Add root node validation in handleNodeDrill with toast notification for stale breadcrumbs
  - Implement empty children state handling with "No children at depth 1" message display
  - Add extreme fan-out protection with "+N more" badge when children exceed maxChildren limit
  - Create graceful error handling for malformed graph data with fallback to full graph view
  - Add performance monitoring with console logging when operations exceed 50ms threshold
  - Implement position cache cleanup and memory management for long-running sessions
  - _Requirements: 6.3, 8.1, 8.2, 8.4, 8.5_

- [x] 7. Integrate focus mode with impact analysis
  - Modify GraphDashboard to determine activeGraph (impactState.filteredGraph ?? fullGraphData)
  - Update adjacency map building to use activeGraph instead of always using fullGraphData
  - Implement automatic focus mode activation when 'graph/impact' message is received
  - Seed breadcrumbs with sourceFile as first crumb when impact analysis is active
  - Ensure Reset button clears both impact state and focus crumbs, returning to full graph
  - Preserve impact-specific styling (isSource, fromSource) when focus mode is active during impact analysis
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 8. Add performance optimizations and monitoring
  - Implement timing instrumentation for computeVisible operations with console logging when >50ms
  - Add batch operation optimization for applyFocusView using single cy.batch() call
  - Create position caching system for smooth breadcrumb navigation with automatic cleanup
  - Add memory usage monitoring for large Set operations and adjacency map storage
  - Implement configurable fan-out limits with performance warnings for extreme cases
  - Add performance testing helpers for benchmarking different graph sizes
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 9. Write comprehensive unit tests for focus mode service
  - Test buildAdjacency function with various graph structures including empty graphs and single nodes
  - Test computeVisible function with different depth and lens configurations, including edge cases
  - Test formatCrumb function with various file paths and basename extraction scenarios
  - Add performance tests for adjacency map construction and BFS traversal with large graphs
  - Test cycle detection and fan-out capping with synthetic graph data
  - Create test utilities for generating test graph data with known dependency structures
  - _Requirements: 1.1, 4.1, 4.5, 6.1, 8.3_

- [ ] 10. Write integration tests for focus mode components
  - Test FocusBreadcrumb component rendering and interaction with various crumb configurations
  - Test GraphCanvas imperative API functionality including applyFocusView and centerOn methods
  - Test GraphDashboard state management with focus operations and keyboard navigation
  - Add end-to-end tests for complete focus workflows: drill → breadcrumb → reset
  - Test impact analysis integration scenarios with focus mode activation and navigation
  - Create performance integration tests with large graphs to verify timing requirements
  - _Requirements: 2.2, 2.3, 3.1, 4.2, 5.1, 6.4_