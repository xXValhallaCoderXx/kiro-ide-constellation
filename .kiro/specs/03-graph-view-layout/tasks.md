# Implementation Plan

- [x] 1. Create file type detection and styling services
  - Create file-type.service.ts to extract file extensions from node paths
  - Create graph-styles.service.ts to generate Cytoscape stylesheets with file type color mappings
  - Create extension-config.service.ts for UI configuration management
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [x] 2. Implement GraphToolbar component with VS Code theming
  - Create GraphToolbar.tsx component with search input (read-only placeholder)
  - Add action buttons (Fit, Reset, Layout dropdown) as disabled placeholders with data-placeholder="true"
  - Add filter chips for file types as disabled placeholders
  - Include functional Re-scan button using existing Button.tsx component
  - Apply VS Code theme tokens for all styling and ensure responsive layout
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 3. Create GraphCanvas wrapper component
  - Create GraphCanvas.tsx component to wrap existing Cytoscape functionality
  - Integrate file type color mapping using graph-styles.service
  - Enhance Cytoscape cleanup procedures to prevent memory leaks
  - Maintain all existing interactions (select, double-click to open files)
  - Ensure performance optimizations for large graphs remain intact
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 4.1, 4.2, 4.3, 4.4_

- [x] 4. Implement GraphDashboard orchestrator component
  - Create GraphDashboard.tsx as the main container component
  - Implement vertical flex layout with toolbar at top and canvas below
  - Migrate existing GraphView state management and messaging logic
  - Integrate GraphToolbar and GraphCanvas components
  - Ensure proper data flow and event handling between components
  - _Requirements: 1.1, 1.5, 4.1, 4.2_

- [x] 5. Update global CSS with toolbar styles and color variables
  - Add toolbar-specific CSS classes using VS Code theme tokens
  - Define CSS variables for file type node colors with fallback values
  - Implement responsive layout styles for toolbar control wrapping
  - Ensure proper spacing using 8px base grid system
  - _Requirements: 1.6, 3.8, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 6. Add accessibility attributes and keyboard navigation
  - Add aria-label attributes to all toolbar actionable elements
  - Set aria-disabled="true" on placeholder controls
  - Ensure proper focus order through toolbar controls
  - Add data-testid attributes for future testing
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 7. Replace GraphView with GraphDashboard in App component
  - Update App.tsx to use GraphDashboard instead of GraphView for graph route
  - Ensure all existing functionality is preserved during the transition
  - Remove the old GraphView component file
  - Verify no breaking changes to existing messaging contracts
  - _Requirements: 4.2, 4.4_

- [x] 8. Test and validate the complete implementation
  - Verify Re-scan functionality works identically to previous implementation
  - Test file type colorization across different node types
  - Validate responsive toolbar layout at various viewport sizes
  - Confirm VS Code theme integration in light/dark modes
  - Test accessibility features with keyboard navigation
  - Verify performance with large graphs shows no regression
  - _Requirements: 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 1.6, 5.6, 6.3, 4.4_