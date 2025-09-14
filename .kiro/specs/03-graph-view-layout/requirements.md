# Requirements Document

## Introduction

This feature enhances the existing Cytoscape.js graph visualization with a modern, layout-focused UI shell that includes a top toolbar with search input and action controls, plus file-type-based node colorization. The goal is to create a professional, VS Code-integrated interface that prepares the foundation for future graph features while maintaining all current functionality.

## Requirements

### Requirement 1

**User Story:** As a developer using the graph view, I want a clean toolbar interface above the graph canvas, so that I can access graph controls in an organized, discoverable way.

#### Acceptance Criteria

1. WHEN the graph view loads THEN the system SHALL display a toolbar at the top of the graph container
2. WHEN viewing the toolbar THEN the system SHALL show a search input field (visual placeholder, read-only)
3. WHEN viewing the toolbar THEN the system SHALL display placeholder action buttons (Fit, Reset, Layout dropdown, Filter chips)
4. WHEN viewing placeholder controls THEN the system SHALL mark them as disabled with data-placeholder="true" attributes
5. WHEN the toolbar is displayed THEN the system SHALL maintain sticky positioning at the top of the view
6. WHEN the viewport is resized THEN the system SHALL allow toolbar controls to wrap to a second row for widths below 1024px

### Requirement 2

**User Story:** As a developer, I want the existing Re-scan functionality to be integrated into the new toolbar, so that I can trigger dependency rescans from the organized control interface.

#### Acceptance Criteria

1. WHEN the toolbar renders THEN the system SHALL include the Re-scan button as an enabled control
2. WHEN I click the Re-scan button THEN the system SHALL trigger the existing dependency scan behavior with no functional changes
3. WHEN the Re-scan operation runs THEN the system SHALL maintain all current progress reporting and error handling

### Requirement 3

**User Story:** As a developer analyzing code dependencies, I want graph nodes to be colored by file type, so that I can quickly identify different types of files in the dependency structure.

#### Acceptance Criteria

1. WHEN nodes are rendered THEN the system SHALL apply colors based on file extension mapping
2. WHEN a node represents a TypeScript file (.ts) THEN the system SHALL color it using var(--kiro-node-ts, #569CD6)
3. WHEN a node represents a TSX file (.tsx) THEN the system SHALL color it using var(--kiro-node-tsx, #4FC1FF)
4. WHEN a node represents a JavaScript file (.js) THEN the system SHALL color it using var(--kiro-node-js, #E3D300)
5. WHEN a node represents a JSX file (.jsx) THEN the system SHALL color it using var(--kiro-node-jsx, #FFBD45)
6. WHEN a node represents a JSON file (.json) THEN the system SHALL color it using var(--kiro-node-json, #8DC891)
7. WHEN a node represents any other file type THEN the system SHALL color it using var(--kiro-node-other, #B180D7)
8. WHEN file type colors are applied THEN the system SHALL use CSS variables that can be overridden by themes

### Requirement 4

**User Story:** As a developer, I want the graph canvas to efficiently use the available space below the toolbar, so that I can view the maximum amount of dependency information.

#### Acceptance Criteria

1. WHEN the toolbar is present THEN the system SHALL render the graph canvas in the remaining vertical space
2. WHEN the graph view loads THEN the system SHALL maintain all existing Cytoscape interactions (select, double-click to open)
3. WHEN the component unmounts THEN the system SHALL properly clean up Cytoscape instances to prevent memory leaks
4. WHEN rendering performance is measured THEN the system SHALL show no regression compared to the current implementation

### Requirement 5

**User Story:** As a developer using VS Code themes, I want the toolbar and graph interface to respect my theme settings, so that the interface feels integrated with my development environment.

#### Acceptance Criteria

1. WHEN the toolbar renders THEN the system SHALL use VS Code theme tokens for all colors and styling
2. WHEN using the toolbar background THEN the system SHALL apply var(--vscode-editorWidget-background)
3. WHEN styling input fields THEN the system SHALL use var(--vscode-input-background) and var(--vscode-input-foreground)
4. WHEN styling buttons THEN the system SHALL use var(--vscode-button-background) and var(--vscode-button-foreground)
5. WHEN applying borders THEN the system SHALL use var(--vscode-widget-border)
6. WHEN the theme changes THEN the system SHALL automatically update all interface colors

### Requirement 6

**User Story:** As a developer using assistive technology, I want the toolbar interface to be accessible, so that I can navigate and understand the graph controls effectively.

#### Acceptance Criteria

1. WHEN toolbar elements are rendered THEN the system SHALL provide appropriate aria-label attributes for all actionable elements
2. WHEN placeholder controls are disabled THEN the system SHALL set aria-disabled="true"
3. WHEN using keyboard navigation THEN the system SHALL maintain proper focus order through toolbar controls
4. WHEN color contrast is measured THEN the system SHALL meet VS Code's default accessibility requirements
