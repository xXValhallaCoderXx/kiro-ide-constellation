# Requirements Document

## Introduction

The Kiro Constellation project has evolved significantly to include comprehensive onboarding capabilities and guided walkthrough features that are not fully documented in the current steering files. The steering documentation needs to be updated to reflect the complete feature set, including the onboarding agent tools, walkthrough management, and persona switching capabilities that are now core parts of the system.

## Requirements

### Requirement 1

**User Story:** As a Kiro agent working with the Constellation codebase, I want comprehensive steering documentation that covers all onboarding features, so that I can provide accurate guidance and implementation support.

#### Acceptance Criteria

1. WHEN the agent references steering docs THEN it SHALL have access to complete onboarding feature documentation
2. WHEN implementing onboarding-related features THEN the agent SHALL understand the full walkthrough lifecycle
3. WHEN troubleshooting onboarding issues THEN the agent SHALL have access to comprehensive error handling patterns

### Requirement 2

**User Story:** As a developer extending the Constellation project, I want steering docs that accurately reflect the current MCP tool set, so that I can understand all available capabilities.

#### Acceptance Criteria

1. WHEN reviewing MCP tools THEN the steering docs SHALL list all 6 current tools (ping, impactAnalysis, and 4 onboarding tools)
2. WHEN implementing new MCP tools THEN the steering docs SHALL provide patterns for tool registration and HTTP bridge integration
3. WHEN working with onboarding tools THEN the steering docs SHALL explain the plan generation, commit, and step execution workflow

### Requirement 3

**User Story:** As a Kiro agent, I want steering docs that explain the onboarding mode switching system, so that I can help users manage persona backups and mode transitions.

#### Acceptance Criteria

1. WHEN users switch to onboarding mode THEN the agent SHALL understand the backup/restore process for steering files
2. WHEN onboarding mode is enabled THEN the agent SHALL know about the embedded persona template system
3. WHEN users switch back to default mode THEN the agent SHALL understand the restoration and cleanup procedures

### Requirement 4

**User Story:** As a developer, I want steering docs that document the complete HTTP bridge endpoint set, so that I understand all available MCP-to-extension communication channels.

#### Acceptance Criteria

1. WHEN reviewing HTTP bridge capabilities THEN the steering docs SHALL document all 6 current endpoints
2. WHEN implementing new bridge endpoints THEN the steering docs SHALL provide security and authentication patterns
3. WHEN debugging bridge communication THEN the steering docs SHALL explain token management and loopback restrictions

### Requirement 5

**User Story:** As a Kiro agent, I want steering docs that explain the walkthrough execution system, so that I can help users navigate guided codebase exploration.

#### Acceptance Criteria

1. WHEN users request onboarding plans THEN the agent SHALL understand the graph-based plan generation process
2. WHEN executing walkthrough steps THEN the agent SHALL know about file highlighting and step progression
3. WHEN walkthroughs complete THEN the agent SHALL understand the finalization and cleanup options