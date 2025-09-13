# Requirements Document

## Introduction

This feature implements interactive dependency graph visualization using Cytoscape.js within the VS Code extension's GraphView tab. The system will automatically scan project dependencies using dependency-cruiser and render them as an interactive graph where users can explore file relationships, navigate to specific files, and understand project architecture at a glance.

## Requirements

### Requirement 1

**User Story:** As a developer, I want to visualize my project's dependency graph in an interactive format, so that I can understand the architecture and relationships between files.

#### Acceptance Criteria

1. WHEN I open the GraphView tab THEN the system SHALL display a Cytoscape.js graph representing files and their dependencies
2. WHEN the dependency data file exists and is less than 5 MB THEN the system SHALL start rendering within 3 seconds on typical hardware, otherwise SHALL show "Loading graph..." until layout completes
3. WHEN I interact with the graph THEN the system SHALL support pan and zoom operations
4. WHEN the graph renders THEN each node SHALL represent a file with its basename as the label
5. WHEN the graph renders THEN each edge SHALL represent a dependency relationship between files

### Requirement 2

**User Story:** As a developer, I want the system to automatically scan my project when dependency data is missing, so that I don't have to manually trigger scans before viewing the graph.

#### Acceptance Criteria

1. WHEN I open the GraphView and no dependency data exists THEN the system SHALL automatically trigger a dependency scan
2. WHEN a scan is triggered THEN the system SHALL display "Scanning project..." status text without a progress bar
3. WHEN the scan completes THEN the system SHALL automatically load and render the resulting graph
4. WHEN a scan takes longer than 30 seconds THEN the system SHALL timeout and display an error message with suggestion to run "Constellation: Scan Dependencies"
5. WHEN a scan fails THEN the system SHALL display an error message that is non-fatal to the tab

### Requirement 3

**User Story:** As a developer, I want to interact with graph nodes to navigate to files, so that I can efficiently explore my codebase.

#### Acceptance Criteria

1. WHEN I double-click on a graph node THEN the system SHALL open the corresponding file in VS Code using the absolute file path
2. WHEN I single-click on a graph node THEN the system SHALL briefly highlight the node (no details sidebar in M1)

### Requirement 4

**User Story:** As a developer, I want the graph to use appropriate data from dependency-cruiser output, so that the visualization accurately represents my project structure.

#### Acceptance Criteria

1. WHEN transforming dependency data THEN the system SHALL read from `./.constellation/data/codebase-dependencies.json`
2. WHEN creating nodes THEN the system SHALL use workspace-relative paths as unique identifiers
3. WHEN creating edges THEN the system SHALL map dependency types to import/require/dynamic/unknown categories
4. WHEN generating the graph THEN the system SHALL include metadata about node and edge counts
5. WHEN processing dependencies THEN the system SHALL handle circular dependencies without errors

### Requirement 5

**User Story:** As a developer, I want the graph to have a clean, readable layout and styling, so that I can easily understand the dependency relationships.

#### Acceptance Criteria

1. WHEN the graph renders THEN the system SHALL use the 'cose' layout algorithm and fit the graph to the viewport on initial render
2. WHEN styling nodes THEN the system SHALL use VS Code theme-derived colors with a static color scheme in M1
3. WHEN styling edges THEN the system SHALL use subtle colors with no arrows in M1
4. WHEN the layout completes THEN the system SHALL fit the entire graph within the viewport
5. WHEN a node is selected or active THEN the system SHALL provide basic visual highlighting

### Requirement 6

**User Story:** As a developer, I want to manually trigger dependency rescans when needed, so that I can update the graph after making significant code changes.

#### Acceptance Criteria

1. WHEN I click a "Re-scan" button THEN the system SHALL trigger a new dependency scan using runScan
2. WHEN a manual scan is triggered THEN the system SHALL show "Scanning project..." status and reload the graph after completion
3. WHEN a manual scan fails THEN the system SHALL display an error message and leave the current graph as-is
4. WHEN rescanning THEN the system SHALL defer view preservation guarantee and refresh the graph after scan completion

### Requirement 7

**User Story:** As a developer, I want the graph functionality to integrate seamlessly with the existing extension messaging system, so that it works reliably within the VS Code environment.

#### Acceptance Criteria

1. WHEN the webview requests graph data via 'graph/load' THEN the extension SHALL respond with 'graph/data' or 'graph/error'
2. WHEN file opening is requested THEN the system SHALL use VS Code APIs for file operations
3. WHEN errors occur THEN the system SHALL communicate them via the messaging channel
4. WHEN the extension activates THEN the graph functionality SHALL run in background without blocking activation
5. WHEN messages are exchanged THEN the system SHALL maintain type safety by defining shared types for messages