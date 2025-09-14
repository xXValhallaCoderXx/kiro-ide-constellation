# Requirements Document

## Introduction

The Onboarding Agent Phase 2 feature adds a comprehensive end-of-tour experience to the existing onboarding system. When users complete a walkthrough, they are presented with a concise summary and two actionable offers: "Summarize and document this feature" and "Suggest unit testing plan". Regardless of the user's choice, the system acknowledges their intent, explains that the feature is not yet in the MVP, and performs thorough cleanup by switching back to Default mode, removing temporary artifacts, and resetting the UI state.

## Requirements

### Requirement 1

**User Story:** As a developer, I want to receive a comprehensive summary when I complete an onboarding walkthrough, so that I can understand what I learned and have a record of the tour.

#### Acceptance Criteria

1. WHEN the final step of a walkthrough completes THEN the system SHALL present a structured summary including topic, step count, files covered, and key highlights
2. WHEN generating the summary THEN the system SHALL include bullet points derived from step explanations (maximum 10 items)
3. WHEN displaying the summary THEN the system SHALL show file paths that were visited and line ranges that were highlighted
4. WHEN no active walkthrough exists THEN the system SHALL return a safe empty summary with stepCount=0
5. WHEN the summary is generated THEN it SHALL be derived from the persisted plan data without requiring additional file scanning

### Requirement 2

**User Story:** As a developer, I want to choose between documentation and testing options after completing a walkthrough, so that I can decide how to follow up on what I learned.

#### Acceptance Criteria

1. WHEN a walkthrough completes THEN Kiro SHALL present exactly two offers: "Summarize and document this feature" and "Suggest unit testing plan"
2. WHEN the user selects either option THEN the system SHALL acknowledge the choice and call the finalize tool with the selected action
3. WHEN the finalize tool is called THEN it SHALL accept chosenAction values of "document", "test-plan", or null
4. WHEN an invalid choice is provided THEN the system SHALL default to null and proceed with cleanup
5. WHEN the user makes a selection THEN Kiro SHALL explain that the feature is not yet in the MVP while still providing the summary

### Requirement 3

**User Story:** As a developer, I want the system to automatically clean up after a walkthrough completes, so that my workspace returns to its normal state without manual intervention.

#### Acceptance Criteria

1. WHEN the finalize tool is executed THEN the system SHALL remove the active plan file from `.constellation/onboarding/`
2. WHEN cleanup occurs THEN the system SHALL clear all in-memory walkthrough state
3. WHEN cleanup occurs THEN the system SHALL switch the mode back to Default and restore steering documents
4. WHEN cleanup occurs THEN the system SHALL remove all backup files from `.constellation/steering/.backups/`
5. WHEN cleanup completes THEN the Side Panel SHALL show Default mode and no active walkthrough status

### Requirement 4

**User Story:** As a developer, I want the finalize functionality to be accessible through MCP tools, so that Kiro can orchestrate the end-of-tour experience programmatically.

#### Acceptance Criteria

1. WHEN the `constellation_onboarding.finalize` tool is called THEN it SHALL return a structured response with status, summary, and cleanup information
2. WHEN the tool processes a request THEN it SHALL use the existing HTTP bridge with bearer token authentication
3. WHEN the tool encounters errors THEN it SHALL return structured error responses without throwing fatal exceptions
4. WHEN the tool is called without an active tour THEN it SHALL still perform Default mode switch and return appropriate status
5. WHEN the tool completes THEN it SHALL return workspace-relative paths in responses to avoid leaking absolute paths

### Requirement 5

**User Story:** As a developer, I want the cleanup process to be robust and handle edge cases gracefully, so that my workspace remains in a consistent state even if errors occur.

#### Acceptance Criteria

1. WHEN backup restoration fails THEN the system SHALL create an empty `.kiro/steering` directory and continue with cleanup
2. WHEN plan file deletion fails THEN the system SHALL proceed with mode switching and report removedPlan as null
3. WHEN multiple cleanup operations fail THEN the system SHALL complete as many operations as possible and report status accurately
4. WHEN cleanup encounters permission errors THEN the system SHALL log warnings but not prevent mode switching
5. WHEN the system is already in Default mode THEN finalize SHALL be idempotent and not cause errors

### Requirement 6

**User Story:** As a developer, I want clear feedback during the finalize process, so that I understand what cleanup actions were performed.

#### Acceptance Criteria

1. WHEN finalize completes THEN the response SHALL include the final mode state ("Default")
2. WHEN a plan file is removed THEN the response SHALL include the workspace-relative path of the removed file
3. WHEN no plan file exists THEN the response SHALL indicate removedPlan as null
4. WHEN cleanup actions complete THEN the Side Panel SHALL optionally show a brief "Tour cleaned up" notification
5. WHEN finalize is called THEN the system SHALL emit appropriate status updates to the webview if needed

### Requirement 7

**User Story:** As a developer, I want the onboarding persona to handle the end-of-tour flow consistently, so that I receive appropriate guidance and closure.

#### Acceptance Criteria

1. WHEN the final step completes THEN the persona SHALL automatically present the two offers without additional prompting
2. WHEN the user selects an option THEN the persona SHALL call the finalize tool with the appropriate chosenAction parameter
3. WHEN the finalize tool returns THEN the persona SHALL display the summary content and explain the MVP limitation
4. WHEN cleanup is confirmed THEN the persona SHALL acknowledge that the mode has been switched back to Default
5. WHEN the persona handles finalize THEN it SHALL follow the strict "Finish" protocol defined in the persona template

### Requirement 8

**User Story:** As a developer, I want all file operations to remain secure and within workspace boundaries, so that the cleanup process cannot affect files outside my project.

#### Acceptance Criteria

1. WHEN processing file paths THEN the system SHALL ensure all operations remain within the workspace root
2. WHEN deleting plan files THEN the system SHALL only remove files from the `.constellation/onboarding/` directory
3. WHEN removing backups THEN the system SHALL only delete files from `.constellation/steering/.backups/`
4. WHEN validating paths THEN the system SHALL prevent directory traversal attacks using ".." or absolute paths
5. WHEN file operations fail due to security restrictions THEN the system SHALL log the attempt and continue with other cleanup tasks