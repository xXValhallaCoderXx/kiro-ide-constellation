# Implementation Plan

- [x] 1. Create onboarding persona template file
  - Modify existing `src/personas/onboarding.md` with the strict persona content from the PRD
  - Include behavioral rules for plan creation, execution, and user interaction
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 2. Implement OnboardingModeService for persona management
  - Create `src/services/onboarding-mode.service.ts` with backup/restore functionality
  - Implement `getCurrentMode()`, `switchToOnboarding()`, and `switchToDefault()` methods
  - Add backup creation to `.constellation/steering/.backups/<timestamp>/` with recursive directory copy
  - Add restore logic that finds and restores the most recent backup
  - Include idempotence checks to avoid redundant backups
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 3. Implement OnboardingWalkthroughService for plan execution
  - Create `src/services/onboarding-walkthrough.service.ts` with in-memory state management
  - Implement `commitPlan()` method with plan validation and persistence to `.constellation/onboarding/`
  - Implement `executeStep()` method using VS Code editor API for file opening and range highlighting
  - Implement `nextStep()` method for walkthrough progression
  - Add path validation and workspace boundary enforcement
  - Add line range clamping for invalid ranges
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 6.1, 6.2, 6.5_

- [x] 4. Add HTTP bridge endpoints for onboarding functionality
  - Extend `src/services/http-bridge.service.ts` with new endpoints
  - Add `POST /persona` endpoint for mode switching with bearer token validation
  - Add `POST /onboarding/commitPlan` endpoint that calls OnboardingWalkthroughService
  - Add `POST /onboarding/nextStep` endpoint for step progression
  - Implement proper error handling with structured 4xx responses
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 5. Register MCP tools in the server
  - Extend `src/mcp.server.ts` with three new onboarding tools
  - Implement `constellation_onboarding.plan` tool that generates structured plans
  - Implement `constellation_onboarding.commitPlan` tool that calls HTTP bridge
  - Implement `constellation_onboarding.nextStep` tool that calls HTTP bridge
  - Add proper input/output schema validation for all tools
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 6. Create OnboardingModeToggle UI component
  - Create `webview-ui/src/components/OnboardingModeToggle.tsx` with mode dropdown
  - Implement confirmation dialogs for mode switching using existing Button component
  - Add loading states and error handling for mode transitions
  - Integrate with messenger service for extension communication
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 7. Create OnboardingStatus UI component
  - Create `webview-ui/src/components/OnboardingStatus.tsx` for walkthrough progress
  - Display current step index, total steps, and current file information
  - Show step explanations and walkthrough completion notifications
  - Handle error states with non-blocking error messages
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 8. Integrate onboarding components into Side Panel
  - Modify `webview-ui/src/views/SidePanelView.tsx` to include onboarding components
  - Add mode toggle dropdown and status display to the existing UI
  - Implement message handling for onboarding-related webview messages
  - Ensure consistent styling with existing global CSS
  - _Requirements: 1.1, 1.5, 6.1_

- [x] 9. Extend messenger service for onboarding messages
  - Update `src/services/messenger.service.ts` with onboarding message handlers
  - Add handlers for mode switching, plan status updates, and error notifications
  - Implement webview message types for onboarding functionality
  - Update `webview-ui/src/services/messenger.ts` with corresponding message types
  - _Requirements: 1.2, 1.3, 1.4, 6.3, 6.4_

- [x] 10. Add extension commands and integration
  - Update `src/extension.ts` to register onboarding services and initialize HTTP bridge endpoints
  - Ensure proper service lifecycle management and cleanup
  - Add any necessary VS Code commands for onboarding functionality
  - Update package.json if new commands or contributions are needed
  - _Requirements: 5.1, 6.5_