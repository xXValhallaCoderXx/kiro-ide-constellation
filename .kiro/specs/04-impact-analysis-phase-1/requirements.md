# Requirements Document

## Introduction

The Impact Analysis feature enables developers to quickly understand the blast radius of proposed code changes by providing both machine-readable affected file lists and visual graph filtering. This feature leverages Constellation's existing dependency scanning and graph visualization capabilities to help developers make informed decisions before modifying code.

The feature integrates with Kiro AI assistant through an MCP tool, allowing natural language queries like "What is the impact of changing src/services/user-service.ts?" to instantly return affected files and visually highlight the impact subgraph.

## Requirements

### Requirement 1

**User Story:** As a developer, I want to ask Kiro for the impact of changing a specific file, so that I can understand which parts of the codebase will be affected before making modifications.

#### Acceptance Criteria

1. WHEN I ask Kiro "What is the impact of changing <file>?" THEN the system SHALL return a machine-readable list of affected files within 1 second for small projects (<200 nodes)
2. WHEN I request impact analysis for medium projects (<=1k nodes) THEN the system SHALL return results within 3 seconds
3. WHEN the impact analysis completes THEN the system SHALL automatically open the Graph view if not already open
4. WHEN impact analysis is requested for a file not found in the dependency graph THEN the system SHALL return an empty affected files list with an appropriate message
5. WHEN no dependency data is available THEN the system SHALL instruct the user to run a scan first

### Requirement 2

**User Story:** As a developer, I want to see only the impacted subgraph with the source file visually highlighted, so that I can quickly identify the scope and epicenter of my proposed changes.

#### Acceptance Criteria

1. WHEN impact analysis completes THEN the graph view SHALL filter to show only nodes in the affected files list
2. WHEN the filtered graph is displayed THEN all edges SHALL be shown only where both endpoints are in the affected files list
3. WHEN the source file is displayed in the filtered graph THEN it SHALL be visually distinct with larger size and bright border/halo
4. WHEN the filtered graph is rendered THEN the epicenter node SHALL be 30% larger than normal nodes
5. WHEN the filtered graph is rendered THEN the epicenter node SHALL have a 3px #FF8C00 border with subtle box-shadow halo
6. WHEN displaying the filtered graph THEN existing double-click to open file functionality SHALL continue to work

### Requirement 3

**User Story:** As a developer, I want to reset the view to the full graph quickly, so that I can return to the complete project visualization without reloading.

#### Acceptance Criteria

1. WHEN the impact filtered view is active THEN a "Reset View" button SHALL be visible in the graph toolbar
2. WHEN I click the "Reset View" button THEN the system SHALL restore the full project graph without page reload
3. WHEN the view is reset THEN all nodes and edges SHALL be displayed as in the original full graph
4. WHEN the view is reset THEN the epicenter highlighting SHALL be removed
5. WHEN the view is reset THEN the graph layout SHALL be restored to the full graph layout

### Requirement 4

**User Story:** As a developer using Kiro, I want the impact analysis to integrate seamlessly with the AI assistant, so that I can get both textual summaries and visual representations of code impact.

#### Acceptance Criteria

1. WHEN Kiro receives an impact analysis request THEN it SHALL call the constellation_impactAnalysis MCP tool with the specified file path
2. WHEN the MCP tool executes THEN it SHALL forward the request to the extension HTTP bridge endpoint
3. WHEN the analysis completes THEN Kiro SHALL receive a JSON response with the affected files list
4. WHEN Kiro processes the results THEN it SHALL provide a natural language summary of the impact
5. WHEN the visual graph is displayed THEN Kiro SHALL inform the user that a visual representation is available

### Requirement 5

**User Story:** As a developer, I want the impact analysis to use dependency traversal logic, so that I can understand which files depend on my changes (children/dependencies direction).

#### Acceptance Criteria

1. WHEN performing impact analysis THEN the system SHALL traverse dependencies in the "children" direction (importer → imported)
2. WHEN starting traversal from a source file THEN the system SHALL follow outgoing edges transitively
3. WHEN building the affected files list THEN the system SHALL include the original source file
4. WHEN traversing dependencies THEN the system SHALL prevent infinite loops by tracking visited nodes
5. WHEN multiple paths exist to the same file THEN the system SHALL include that file only once in the results
6. WHEN the traversal completes THEN the results SHALL maintain stable order based on BFS discovery sequence

### Requirement 6

**User Story:** As a developer, I want the impact analysis to handle edge cases gracefully, so that the feature works reliably across different project states and configurations.

#### Acceptance Criteria

1. WHEN the requested file exists on disk but not in the dependency graph THEN the system SHALL return the file in affected files with an appropriate message
2. WHEN the workspace has no dependency data THEN the system SHALL provide clear instructions to run a dependency scan
3. WHEN file paths have different case sensitivity THEN the system SHALL normalize paths to workspace-relative format
4. WHEN very large graphs are filtered THEN the performance SHALL remain acceptable due to reduced display size
5. WHEN HTTP bridge authentication fails THEN the system SHALL return an empty affected files list gracefully
6. WHEN the extension context is unavailable THEN the MCP tool SHALL handle the error without crashing