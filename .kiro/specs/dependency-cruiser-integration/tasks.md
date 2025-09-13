# Implementation Plan

- [x] 1. Add dependency-cruiser runtime dependency
  - Add `dependency-cruiser` to the `dependencies` section of `package.json` with version `^16.x` or latest
  - Install the dependency to ensure it's available at runtime within the extension
  - _Requirements: 1.1, 2.1, 4.1_

- [x] 2. Create dependency cruiser service implementation
  - [x] 2.1 Create service file structure and basic exports
    - Create `src/services/dependency-cruiser.service.ts` following kebab-case naming convention
    - Implement the main `runScan(context: vscode.ExtensionContext): Promise<void>` export function
    - Add necessary imports for vscode, fs, path, and child_process modules
    - _Requirements: 1.1, 1.4_

  - [x] 2.2 Implement workspace detection and validation
    - Add logic to detect the first workspace folder from `vscode.workspace.workspaceFolders`
    - Implement no-op behavior when no workspace is open
    - Add TypeScript config detection by checking for `tsconfig.json` in workspace root
    - _Requirements: 1.2, 1.3, 2.2_

  - [x] 2.3 Implement CLI path resolution and argument construction
    - Resolve dependency-cruiser CLI path using extension context URI
    - Build CLI arguments array with output type, exclusion patterns, and optional tsconfig
    - Implement proper path handling for cross-platform compatibility
    - _Requirements: 2.1, 2.2_

  - [x] 2.4 Implement child process spawning and management
    - Create child process using `spawn()` with proper stdio configuration
    - Implement stdout data collection and buffering
    - Add process lifecycle management with proper cleanup
    - _Requirements: 1.1, 2.3_

  - [x] 2.5 Add timeout and error handling mechanisms
    - Implement 60-second timeout with graceful process termination
    - Add comprehensive error handling for spawn failures, exit codes, and JSON parsing
    - Ensure all errors are logged but don't disrupt extension functionality
    - _Requirements: 2.3, 4.1, 4.2, 4.3_

  - [x] 2.6 Implement output processing and file writing
    - Parse dependency-cruiser JSON output from stdout
    - Create versioned envelope structure with metadata (version, timestamp, workspace root)
    - Ensure `.constellation/data` directory exists using recursive mkdir
    - Write formatted JSON output to `codebase-dependencies.json`
    - _Requirements: 3.1, 3.2, 3.3, 4.4_

- [x] 3. Integrate service into extension activation
  - [x] 3.1 Wire dependency scanning into extension activation
    - Import the `runScan` function in `src/extension.ts`
    - Add non-blocking call to `runScan(context)` in the existing background activation pattern
    - Wrap the call in try-catch to prevent activation disruption
    - _Requirements: 1.1, 1.4, 4.2_

  - [x] 3.2 Add manual scan command registration
    - Register a new command `constellation.scanDependencies` in the extension activation
    - Implement command handler that calls `runScan(context)` with proper error handling
    - Add command contribution to `package.json` for VS Code command palette access
    - _Requirements: 5.1, 5.2, 5.3_

- [ ] 4. Create comprehensive unit tests for the service
  - [ ] 4.1 Test workspace detection and validation logic
    - Mock `vscode.workspace.workspaceFolders` for various scenarios (no workspace, single workspace, multiple workspaces)
    - Test TypeScript config detection with and without `tsconfig.json`
    - Verify no-op behavior when no workspace is available
    - _Requirements: 1.2, 1.3, 2.2_

  - [ ] 4.2 Test CLI argument construction and path resolution
    - Test CLI path resolution using mock extension context
    - Verify argument array construction with and without TypeScript config
    - Test exclusion pattern formatting and workspace root handling
    - _Requirements: 2.1, 2.2_

  - [ ] 4.3 Test process management and timeout behavior
    - Mock child process spawning and test timeout scenarios
    - Verify graceful process termination on timeout
    - Test stdout data collection and buffering
    - _Requirements: 2.3, 4.3_

  - [ ] 4.4 Test output processing and error handling
    - Test JSON parsing with valid and invalid dependency-cruiser output
    - Verify envelope structure creation with proper metadata
    - Test file system operations and directory creation
    - Test comprehensive error scenarios (CLI not found, process failures, file I/O errors)
    - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 4.4_

- [ ] 5. Integration testing and validation
  - [ ] 5.1 Test extension activation with dependency scanning
    - Create test workspace with TypeScript files and dependencies
    - Verify extension activates without blocking and scan runs in background
    - Confirm output file is created with expected structure and content
    - _Requirements: 1.1, 1.4, 3.1, 3.2, 3.3_

  - [ ] 5.2 Test manual command execution
    - Verify command appears in VS Code command palette
    - Test manual scan execution and file overwriting behavior
    - Confirm error handling works the same as automatic scans
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ] 5.3 Validate cross-platform compatibility and performance
    - Test on different operating systems (Windows, macOS, Linux)
    - Verify timeout behavior with large repositories
    - Confirm non-blocking behavior doesn't impact extension responsiveness
    - _Requirements: 1.4, 2.3, 4.3_