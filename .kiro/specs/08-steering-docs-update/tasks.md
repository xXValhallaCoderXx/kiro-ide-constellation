# Implementation Plan

- [x] 1. Update product overview with complete feature set
  - Add all 6 MCP tools to the product overview
  - Document onboarding mode capabilities and persona switching
  - Include walkthrough generation and execution features
  - Update target users section to include onboarding use cases
  - _Requirements: 1.1, 2.1, 3.1_

- [x] 2. Enhance project structure documentation
  - [x] 2.1 Add onboarding service files to structure documentation
    - Document `src/services/onboarding-mode.service.ts` and its responsibilities
    - Document `src/services/onboarding-walkthrough.service.ts` and its responsibilities
    - Update service layer description to include onboarding services
    - _Requirements: 2.2, 3.2_

  - [x] 2.2 Add onboarding UI components to structure documentation
    - Document `webview-ui/src/components/OnboardingModeToggle.tsx`
    - Document `webview-ui/src/components/OnboardingStatus.tsx`
    - Update UI component section with onboarding-specific components
    - _Requirements: 2.2, 3.2_

  - [x] 2.3 Document onboarding data directories and file structures
    - Add `.constellation/onboarding/` directory structure
    - Add `.constellation/steering/backup/` directory structure
    - Document persona template location and backup lifecycle
    - _Requirements: 3.2, 3.3_

- [x] 3. Expand messaging architecture documentation
  - [x] 3.1 Add complete HTTP bridge endpoint documentation
    - Document `POST /persona` endpoint for mode switching
    - Document `POST /onboarding/commitPlan` endpoint for plan execution
    - Document `POST /onboarding/nextStep` endpoint for step progression
    - Document `POST /scan` endpoint for dependency scanning
    - Update endpoint security and authentication patterns
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 3.2 Add onboarding message types to UI messaging section
    - Document `onboarding/change-mode` message type
    - Document `onboarding/get-mode` and `onboarding/current-mode` message types
    - Document `onboarding/get-status` and `onboarding/status-update` message types
    - Document `onboarding/mode-changed` and `onboarding/mode-error` message types
    - Document `onboarding/walkthrough-complete` and `onboarding/walkthrough-error` message types
    - _Requirements: 3.1, 5.3_

- [x] 4. Create comprehensive onboarding steering documentation
  - [x] 4.1 Create new onboarding.md steering file with complete workflow documentation
    - Document the complete onboarding agent workflow and capabilities
    - Include MCP tool specifications for all 4 onboarding tools
    - Document plan generation process using dependency graph data
    - Document walkthrough execution and step progression patterns
    - _Requirements: 2.1, 5.1, 5.2_

  - [x] 4.2 Document persona management and mode switching lifecycle
    - Document the backup and restore process for steering files
    - Include embedded persona template system documentation
    - Document mode switching UI and confirmation dialogs
    - Include error handling and recovery procedures for mode switching
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 4.3 Document walkthrough execution system and patterns
    - Document graph-based plan generation using BFS traversal
    - Include step execution with file highlighting and navigation
    - Document walkthrough completion and finalization options
    - Include error handling for missing data and execution failures
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 5. Update cross-references and validate consistency
  - [x] 5.1 Update cross-references between steering files
    - Add references to onboarding.md from product.md and structure.md
    - Update messaging.md to reference onboarding message types
    - Ensure all files reference the complete MCP tool set
    - _Requirements: 1.1, 2.1_

  - [x] 5.2 Validate all documented features against codebase
    - Verify all file paths and component names are accurate
    - Cross-check message type definitions with implementation
    - Validate HTTP endpoint documentation matches actual endpoints
    - Ensure MCP tool specifications match server implementation
    - _Requirements: 1.2, 2.2, 4.1_

  - [x] 5.3 Perform final consistency and completeness review
    - Review terminology consistency across all steering files
    - Ensure examples match actual implementation patterns
    - Validate that all requirements are addressed in documentation
    - Check that steering docs align with existing docs/ directory content
    - _Requirements: 1.1, 1.2, 1.3_