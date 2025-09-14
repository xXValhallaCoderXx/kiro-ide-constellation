# Requirements Document

## Introduction

This feature enhances the onboarding plan quality and speed by grounding planning in the dependency-cruiser graph. The MCP server will read the precomputed graph file directly and compute a small neighborhood of related files for a given seed (file or topic). This builds upon the existing onboarding agent phases 1-2 to provide more contextual and relevant onboarding plans by leveraging the codebase's dependency structure.

## Requirements

### Requirement 1

**User Story:** As a developer using the onboarding agent, I want the planning tool to automatically discover related files based on the dependency graph, so that the onboarding steps are more contextual and comprehensive.

#### Acceptance Criteria

1. WHEN the constellation_onboarding.plan tool is called with a seed file or topic THEN the system SHALL return context.relatedFiles populated based on the graph within 500ms on typical repos (excluding scan time)
2. WHEN a seed file is provided THEN the system SHALL normalize it to workspace-relative path and resolve to node id using exact match, case-insensitive match, extension swaps, and basename scoring
3. WHEN a topic is provided without a specific file THEN the system SHALL choose the best matching node id by path substring and basename scoring
4. WHEN no seed can be resolved THEN the system SHALL set relatedFiles to empty array and proceed with plan generation

### Requirement 2

**User Story:** As a developer, I want the system to automatically trigger dependency scanning when graph data is missing, so that I can get contextual onboarding plans even on first use.

#### Acceptance Criteria

1. WHEN the graph file (./.constellation/data/codebase-dependencies.json) is missing THEN the system SHALL trigger a scan once via POST /scan endpoint and retry reading
2. WHEN the scan is triggered THEN the system SHALL poll for file existence for up to 30 seconds with 500ms intervals
3. WHEN the scan completes successfully THEN the system SHALL return status 'ok' and proceed with graph analysis
4. WHEN the scan times out THEN the system SHALL return 504 status with structured JSON error and set relatedFiles to empty array

### Requirement 3

**User Story:** As a developer, I want the MCP server to have direct access to workspace information, so that it can efficiently read graph files without round trips to the extension.

#### Acceptance Criteria

1. WHEN the MCP server starts THEN the system SHALL inject CONSTELLATION_WORKSPACE_ROOT environment variable with the first workspace folder path
2. WHEN reading graph files THEN the system SHALL use the workspace root to construct absolute paths to ./.constellation/data/codebase-dependencies.json
3. WHEN no workspace is available THEN the system SHALL return relatedFiles as empty array with appropriate messaging

### Requirement 4

**User Story:** As a developer, I want related files to be intelligently ranked and limited, so that the onboarding plans focus on the most relevant code without overwhelming detail.

#### Acceptance Criteria

1. WHEN computing related files THEN the system SHALL use BFS over union graph (forward ∪ reverse) up to depth 1 by default
2. WHEN ranking related files THEN the system SHALL rank by distance first, then by degree
3. WHEN limiting results THEN the system SHALL clamp to a manageable limit of 30 files by default
4. WHEN returning results THEN the system SHALL return only workspace-relative paths, never absolute paths

### Requirement 5

**User Story:** As a developer, I want the HTTP bridge to support dependency scanning requests, so that the MCP server can trigger scans when needed.

#### Acceptance Criteria

1. WHEN POST /scan endpoint is called THEN the system SHALL trigger runScan(context) using existing service
2. WHEN scanning is in progress THEN the system SHALL poll for ./.constellation/data/codebase-dependencies.json existence for up to 30 seconds
3. WHEN scan completes THEN the system SHALL return 200 status with { status: 'ok' }
4. WHEN scan times out THEN the system SHALL return 504 status with { error: 'timeout' }
5. WHEN accessing the endpoint THEN the system SHALL enforce loopback-only access with bearer authentication

### Requirement 6

**User Story:** As a developer using the onboarding agent, I want the enriched plan output to include graph context, so that the agent can create more grounded and relevant onboarding steps.

#### Acceptance Criteria

1. WHEN the plan tool returns results THEN the system SHALL include both plan and context fields in the response
2. WHEN context is provided THEN it SHALL include seedId, relatedFiles, depth, and limit fields
3. WHEN the persona processes the plan THEN it SHALL use relatedFiles to draft grounded steps
4. WHEN no graph context is available THEN the system SHALL still return a valid plan with empty relatedFiles

### Requirement 7

**User Story:** As a developer, I want the system to handle edge cases gracefully, so that onboarding works reliably across different project configurations.

#### Acceptance Criteria

1. WHEN no workspace is open THEN the system SHALL return relatedFiles as empty array with advisory message
2. WHEN graph file is missing after scan retry THEN the system SHALL proceed with relatedFiles as empty array
3. WHEN seed cannot be resolved THEN the system SHALL set relatedFiles to empty array but continue with plan generation
4. WHEN processing large graphs THEN the system SHALL clamp results to configured limits and avoid expensive operations

### Requirement 8

**User Story:** As a developer, I want the system to maintain security boundaries, so that the MCP server cannot access files outside the workspace.

#### Acceptance Criteria

1. WHEN reading files THEN the system SHALL only read files under CONSTELLATION_WORKSPACE_ROOT
2. WHEN following paths THEN the system SHALL NOT follow symlinks outside the workspace
3. WHEN accessing HTTP endpoints THEN the system SHALL enforce loopback-only access with bearer authentication
4. WHEN returning file paths THEN the system SHALL return only workspace-relative paths, never absolute paths