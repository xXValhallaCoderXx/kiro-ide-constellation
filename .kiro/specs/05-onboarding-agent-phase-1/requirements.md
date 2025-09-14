# Requirements Document

## Introduction

The Onboarding Agent Phase 1 feature enables a chat-driven onboarding guide that helps users understand their codebase through interactive walkthroughs. The feature provides a mode toggle in the Side Panel that switches between Default and Onboarding modes, with safe persona swapping and structured walkthrough execution. When in Onboarding mode, Kiro can generate step-by-step plans that open files and highlight specific code ranges to guide users through understanding different aspects of their repository.

## Requirements

### Requirement 1

**User Story:** As a developer, I want to switch between Default and Onboarding modes in the Side Panel, so that I can control when the onboarding functionality is active.

#### Acceptance Criteria

1. WHEN the Side Panel is displayed THEN the system SHALL show a Mode dropdown with "Default" and "Onboarding" options
2. WHEN switching from Default to Onboarding mode THEN the system SHALL display a confirmation dialog before proceeding
3. WHEN the user confirms the switch to Onboarding mode THEN the system SHALL backup existing steering documents to `./.constellation/steering/.backups/<timestamp>/` and write the onboarding persona file
4. WHEN switching from Onboarding to Default mode THEN the system SHALL display a confirmation dialog and restore the most recent backup
5. WHEN the mode is changed THEN the Side Panel SHALL clearly display the current mode indicator

### Requirement 2

**User Story:** As a developer, I want my steering documents to be safely backed up and restored when switching modes, so that I don't lose my existing configuration.

#### Acceptance Criteria

1. WHEN switching to Onboarding mode THEN the system SHALL create a timestamped backup of the entire `./.kiro/steering/` directory
2. WHEN switching back to Default mode THEN the system SHALL restore the most recent backup from `./.constellation/steering/.backups/`
3. WHEN backup or restore operations fail THEN the system SHALL display non-blocking error notifications without corrupting existing steering documents
4. WHEN multiple mode switches occur THEN the system SHALL avoid creating redundant backups if content hasn't changed since the last backup

### Requirement 3

**User Story:** As a developer using Kiro, I want to request onboarding walkthroughs for specific topics, so that I can understand how different parts of my codebase work.

#### Acceptance Criteria

1. WHEN in Onboarding mode and I ask about a topic THEN Kiro SHALL use the `constellation_onboarding.plan` tool to generate a structured walkthrough plan
2. WHEN a plan is generated THEN Kiro SHALL present both a user-friendly summary and ask for confirmation before proceeding
3. WHEN I confirm the plan THEN Kiro SHALL use the `constellation_onboarding.commitPlan` tool to persist the plan and execute the first step
4. WHEN a step is executed THEN the system SHALL open the specified file and highlight the designated code range
5. WHEN I want to proceed to the next step THEN Kiro SHALL use the `constellation_onboarding.nextStep` tool to advance the walkthrough

### Requirement 4

**User Story:** As a developer, I want walkthrough plans to be structured and persistent, so that I can understand the scope and track progress of my onboarding session.

#### Acceptance Criteria

1. WHEN a plan is committed THEN the system SHALL save it as JSON to `./.constellation/onboarding/plan-<yyyyMMdd-HHmmss>.json`
2. WHEN a plan is created THEN it SHALL include version, topic, createdAt timestamp, and an array of steps
3. WHEN each step is defined THEN it SHALL contain filePath (workspace-relative), lineStart, lineEnd (1-based inclusive), and explanation text
4. WHEN file paths are processed THEN the system SHALL validate they are workspace-relative and reject directory traversal attempts
5. WHEN line ranges are invalid THEN the system SHALL clamp them to valid file bounds without failing

### Requirement 5

**User Story:** As a developer, I want secure communication between MCP tools and the extension, so that the onboarding functionality operates safely within my development environment.

#### Acceptance Criteria

1. WHEN MCP tools communicate with the extension THEN they SHALL use the existing HTTP bridge with bearer token authentication
2. WHEN HTTP endpoints are accessed THEN the system SHALL enforce loopback-only access and validate authorization headers
3. WHEN invalid requests are made THEN the system SHALL return structured 4xx error responses with appropriate JSON
4. WHEN processing user input THEN the system SHALL validate JSON size limits and input schema
5. WHEN file operations are performed THEN the system SHALL ensure all paths remain within workspace boundaries

### Requirement 6

**User Story:** As a developer, I want clear feedback during walkthrough execution, so that I understand my current progress and can navigate the onboarding experience effectively.

#### Acceptance Criteria

1. WHEN a walkthrough is active THEN the Side Panel SHALL display the current step index and total count
2. WHEN a step is executed THEN the system SHALL provide visual feedback including the current file path and explanation
3. WHEN a walkthrough completes THEN the system SHALL display a "Walkthrough complete" notification
4. WHEN errors occur during execution THEN the system SHALL show clear, non-blocking error messages
5. WHEN the walkthrough reaches the final step THEN the system SHALL return status "complete" and clear in-memory state

### Requirement 7

**User Story:** As a developer, I want the onboarding persona to provide consistent and helpful guidance, so that I receive structured assistance when learning about my codebase.

#### Acceptance Criteria

1. WHEN Onboarding mode is enabled THEN the system SHALL write an onboarding-guide.md persona file to `./.kiro/steering/`
2. WHEN the persona is active THEN Kiro SHALL follow strict behavioral rules for plan creation and execution
3. WHEN presenting plans THEN Kiro SHALL keep explanations concise and action-oriented
4. WHEN interacting with users THEN Kiro SHALL be transparent about limitations and provide clear next-step guidance
5. WHEN walkthroughs end early THEN Kiro SHALL gracefully summarize progress and provide appropriate closure