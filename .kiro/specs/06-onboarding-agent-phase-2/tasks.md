# Implementation Plan

- [x] 1. Enhance OnboardingWalkthroughService with summary and cleanup methods
  - Add `getSummary()` method that extracts topic, stepCount, files, highlights, and bulletSummary from current in-memory state
  - Add `cleanup()` method that removes tracked plan file and clears in-memory walkthrough state
  - Implement file extraction logic to get unique file paths from plan steps
  - Implement highlight extraction to create array of filePath/lineStart/lineEnd objects
  - Implement bullet summary generation with max 10 items, single-line formatting, and 100-character limit
  - Add error handling for missing state (return empty defaults with stepCount=0)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.2_

- [x] 2. Enhance OnboardingModeService with comprehensive cleanup
  - Modify `switchToDefault()` method to remove all backup directories from `.constellation/steering/.backups/`
  - Add graceful error handling that creates empty `.kiro/steering` directory if restoration fails
  - Implement parallel cleanup operations where safe (backup removal + steering restoration)
  - Add logging for cleanup operations without exposing sensitive data
  - Ensure idempotent behavior when already in Default mode
  - _Requirements: 3.3, 3.4, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 3. Add HTTP bridge endpoint for finalize functionality
  - Add `POST /onboarding/finalize` endpoint to `src/services/http-bridge.service.ts`
  - Implement request parsing and validation for chosenAction parameter
  - Call OnboardingWalkthroughService.getSummary() to generate summary data
  - Call OnboardingWalkthroughService.cleanup() to remove plan file and clear state
  - Call OnboardingModeService.switchToDefault() to restore Default mode
  - Return structured response with status, chosenAction, summary, and cleanup information
  - Add comprehensive error handling with structured 4xx/5xx responses
  - Ensure workspace-relative paths in all responses
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 6.1, 6.2, 6.3_

- [x] 4. Register constellation_onboarding.finalize MCP tool
  - Add new tool registration in `src/mcp.server.ts` following existing pattern
  - Implement input schema validation for chosenAction parameter (document/test-plan/null)
  - Forward requests to HTTP bridge `/onboarding/finalize` endpoint with bearer token
  - Handle HTTP responses and return structured MCP tool output
  - Add error handling for network failures and invalid responses
  - Ensure proper JSON parsing and response formatting
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 5. Update onboarding persona template with Finish protocol
  - Modify `src/personas/onboarding.md` to add strict "Finish" protocol section
  - Add instructions to present exactly two offers after final step completion
  - Add template for calling finalize tool with appropriate chosenAction parameter
  - Add instructions to display summary content and explain MVP limitation
  - Add confirmation message for cleanup completion and Default mode restoration
  - Ensure persona follows the protocol automatically without additional prompting
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 6. Add optional UI feedback for cleanup completion
  - Extend `src/services/messenger.service.ts` to handle finalize completion messages
  - Add optional webview message type for "Tour cleaned up" notification
  - Update OnboardingStatus component to handle cleanup completion state
  - Ensure Side Panel shows Default mode and no active walkthrough after cleanup
  - Add non-blocking toast notification for cleanup confirmation (optional)
  - _Requirements: 6.4, 6.5, 3.5_

- [x] 7. Implement comprehensive error handling and security validation
  - Add path validation to prevent directory traversal in all file operations
  - Implement workspace boundary enforcement for plan file and backup operations
  - Add input sanitization for chosenAction parameter and JSON size limits
  - Implement graceful error handling that completes partial operations when possible
  - Add security logging for failed authentication or path validation attempts
  - Ensure all file operations remain within `.constellation/` subdirectories
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 8. Add unit tests for summary generation and cleanup operations - SKIP WRITING TESTS
  - Write tests for OnboardingWalkthroughService.getSummary() with various plan structures - SKIP WRITING TESTS
  - Write tests for cleanup operations with different error scenarios (file not found, permission errors) - SKIP WRITING TESTS
  - Write tests for bullet summary generation with edge cases (empty explanations, long text) - SKIP WRITING TESTS
  - Write tests for file and highlight extraction with duplicate and invalid paths - SKIP WRITING TESTS
  - Write tests for error handling when no active walkthrough state exists - SKIP WRITING TESTS
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 5.1, 5.2_

- [ ] 9. Add integration tests for finalize tool and HTTP bridge - SKIP WRITING TESTS
  - Write end-to-end tests for finalize tool with different chosenAction values - SKIP WRITING TESTS
  - Write tests for HTTP bridge endpoint with valid and invalid requests - SKIP WRITING TESTS
  - Write tests for authentication and authorization of finalize endpoint - SKIP WRITING TESTS
  - Write tests for error responses and status codes from HTTP bridge - SKIP WRITING TESTS
  - Write tests for workspace boundary validation and security checks - SKIP WRITING TESTS
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 10. Perform end-to-end testing and validation
  - Test complete walkthrough flow from start to finalize with both offer options
  - Verify persona behavior follows Finish protocol correctly
  - Test cleanup operations restore workspace to consistent Default state
  - Verify Side Panel UI updates correctly after finalize completion
  - Test error scenarios and edge cases (no active tour, permission errors, invalid input)
  - Validate security measures prevent directory traversal and unauthorized access
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5_