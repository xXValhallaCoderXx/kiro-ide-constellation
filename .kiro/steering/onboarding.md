# Onboarding System

## Overview
Kiro Constellation provides a comprehensive onboarding system that enables guided walkthrough experiences for codebase exploration. The system combines persona switching, graph-based plan generation, and interactive step execution to help users understand complex codebases through structured tours.

## Core Components

### 1. Onboarding Mode System
The onboarding system operates through two distinct modes:

**Default Mode:**
- Standard development environment with full steering documentation
- All original steering files available for general development assistance
- Standard MCP tools available for development workflows

**Onboarding Mode:**
- Specialized persona template for guided walkthrough experiences
- Embedded onboarding guide with strict conversation protocols
- Original steering documents automatically backed up and restored
- Focused on step-by-step codebase exploration

### 2. MCP Tool Suite
The onboarding system provides 4 specialized MCP tools for comprehensive walkthrough management:

#### constellation_onboarding.plan
**Purpose:** Generates structured walkthrough plans using dependency graph context
**Input Schema:**
```typescript
{
  request: string,      // User's topic or learning request
  seedFile?: string     // Optional specific file to focus on
}
```
**Output:**
```typescript
{
  plan: OnboardingPlan,
  summary: string,
  context: {
    seedId: string | null,
    relatedFiles: string[],
    graphStats: TraversalStats
  }
}
```

#### constellation_onboarding.commitPlan
**Purpose:** Commits a plan to persistent storage and begins execution
**Input Schema:**
```typescript
{
  plan: OnboardingPlan
}
```
**Output:**
```typescript
{
  status: "started",
  stepCount: number,
  planPath: string
}
```

#### constellation_onboarding.nextStep
**Purpose:** Advances to the next step in the active walkthrough
**Input Schema:** `{}` (no parameters required)
**Output:**
```typescript
{
  status: "ok" | "complete",
  currentStepIndex?: number
}
```

#### constellation_onboarding.finalize
**Purpose:** Finalizes walkthrough with summary generation and cleanup
**Input Schema:**
```typescript
{
  chosenAction: "document" | "test-plan" | null
}
```
**Output:**
```typescript
{
  status: "done",
  chosenAction: string,
  summary: SummaryData,
  cleanup: CleanupData
}
```

### 3. Data Models

#### OnboardingPlan Structure
```typescript
interface OnboardingPlan {
  version: number;        // Schema version (use 1)
  topic: string;          // Short topic description
  createdAt: string;      // ISO timestamp
  steps: OnboardingStep[];
}

interface OnboardingStep {
  filePath: string;       // Workspace-relative path
  lineStart: number;      // 1-based inclusive start line
  lineEnd: number;        // 1-based inclusive end line
  explanation: string;    // 1-4 sentence explanation
}
```

#### Walkthrough State
```typescript
interface WalkthroughState {
  plan: OnboardingPlan;
  currentStepIndex: number;
  planPath: string;
  startedAt: Date;
}
```

## Plan Generation Process

### 1. Graph Context Integration
The plan generation process leverages the dependency graph data to create intelligent walkthroughs:

**Seed Resolution Engine:**
- **Exact Match:** Direct file path matching in dependency graph
- **Case-Insensitive:** Lowercase comparison for case variations
- **Extension Swaps:** TypeScript/JavaScript file extension conversion (.js↔.ts, .jsx↔.tsx)
- **Basename Scoring:** Filename matching with directory path similarity scoring
- **Topic Matching:** Substring and path scoring for topic-to-file resolution

**BFS Traversal Engine:**
- **Union Graph Traversal:** Combines forward and reverse dependency edges
- **Depth-Limited Search:** Configurable depth limiting (default: 1 level)
- **Cycle Detection:** Prevents infinite loops in dependency cycles
- **Result Ranking:** Distance-first, then node degree (connectivity) ranking
- **Result Limiting:** Configurable maximum results (default: 30 files)

### 2. Plan Enhancement Algorithm
```typescript
function generateEnhancedPlan(request: string, context: GraphContext): OnboardingPlan {
  const steps = [];
  
  // 1. Always start with project overview
  steps.push({
    filePath: "README.md",
    lineStart: 1,
    lineEnd: 10,
    explanation: `Starting with project overview to understand ${request}`
  });

  // 2. Include seed file if resolved
  if (context.seedId) {
    steps.push({
      filePath: context.seedId,
      lineStart: 1,
      lineEnd: 50,
      explanation: `Examining the main file related to ${request}`
    });
  }

  // 3. Include related files from graph traversal (up to 5 most relevant)
  const maxRelatedFiles = Math.min(5, context.relatedFiles.length);
  for (let i = 0; i < maxRelatedFiles; i++) {
    const relatedFile = context.relatedFiles[i];
    steps.push({
      filePath: relatedFile,
      lineStart: 1,
      lineEnd: 30,
      explanation: `Exploring ${relatedFile} which is connected to your topic`
    });
  }

  // 4. Always include project configuration
  if (!steps.some(step => step.filePath === "package.json")) {
    steps.push({
      filePath: "package.json",
      lineStart: 1,
      lineEnd: 20,
      explanation: "Examining project dependencies and configuration"
    });
  }

  return {
    version: 1,
    topic: request.substring(0, 100),
    createdAt: new Date().toISOString(),
    steps
  };
}
```

## Persona Management and Mode Switching

### 1. Backup and Restore Process

#### Switching to Onboarding Mode Lifecycle
```typescript
async function switchToOnboarding(): Promise<void> {
  // 1. Validate workspace availability
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    throw new Error('No workspace folder open');
  }

  // 2. Create timestamped backup of steering directory
  const backupPath = await this.backupSteeringDocs();
  
  // 3. Write embedded onboarding persona template
  await this.writeOnboardingPersona();
  
  // 4. Update internal mode state
  this.currentMode = 'Onboarding';
  
  // 5. Show user confirmation
  vscode.window.showInformationMessage(
    `Switched to Onboarding mode. Steering documents backed up.`
  );
}
```

**Detailed Backup Process:**
1. **Workspace Validation:** Ensure valid workspace before proceeding
2. **Backup Directory Creation:** Create `.constellation/steering/backup/` if needed
3. **Steering Directory Check:** Handle case where steering directory doesn't exist
4. **Atomic Move Operation:** Rename entire steering directory to timestamped backup
5. **Fallback Copy Strategy:** Use copy+delete if rename fails (cross-device scenarios)
6. **Metadata Generation:** Write backup metadata with file counts and timestamps
7. **Template Writing:** Write embedded persona template to new steering directory
8. **Error Handling:** Comprehensive error handling with detailed user messages

**Backup Metadata Structure:**
```typescript
interface BackupMetadata {
  timestamp: string;        // ISO timestamp for backup creation
  originalPath: string;     // Original steering directory path
  backupPath: string;       // Backup directory path
  fileCount: number;        // Number of files backed up
  checksum?: string;        // Optional checksum for integrity
}
```

#### Switching to Default Mode Lifecycle
```typescript
async function switchToDefault(): Promise<void> {
  // 1. Validate workspace availability
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    throw new Error('No workspace folder open');
  }

  // 2. Restore steering documents from most recent backup
  await this.restoreSteeringDocs();
  
  // 3. Clean up all backup directories (best-effort)
  const backupBaseDir = path.join(workspaceRoot, this.BACKUP_BASE_DIR);
  try {
    await fs.promises.rm(backupBaseDir, { recursive: true, force: true });
  } catch {
    // Non-fatal cleanup failure
  }
  
  // 4. Update internal mode state
  this.currentMode = 'Default';
  
  // 5. Show user confirmation
  vscode.window.showInformationMessage(
    'Switched to Default mode. Steering documents restored.'
  );
}
```

**Detailed Restoration Process:**
1. **Backup Discovery:** Find most recent backup by timestamp sorting
2. **Current Directory Removal:** Remove existing steering directory if present
3. **Selective Restoration:** Copy backup contents excluding metadata and nested backups
4. **Fallback Handling:** Create empty steering directory if no backup exists
5. **Cleanup Operations:** Remove all backup directories after successful restoration
6. **Error Recovery:** Graceful handling with fallback to empty directory creation
7. **State Management:** Clear walkthrough state and update mode tracking

#### Backup Directory Structure
```
.constellation/steering/backup/
├── 2025-01-15T10-30-45/           # Timestamped backup directory
│   ├── product.md                 # Original steering files
│   ├── tech.md
│   ├── structure.md
│   ├── messaging.md
│   ├── impact-analysis.md
│   ├── graph-visualization.md
│   ├── dependency-scanning.md
│   └── .backup-metadata.json      # Backup metadata
├── 2025-01-16T14-22-10/           # Another backup (if multiple switches)
│   └── [backup files...]
└── [additional backups...]
```

#### Error Handling and Recovery Procedures

**Backup Creation Failures:**
- **Permission Errors:** Clear messages about file system permissions with suggested fixes
- **Disk Space Issues:** Detection and reporting of insufficient disk space
- **Cross-Device Failures:** Automatic fallback from rename to copy+delete operations
- **Partial Failures:** Cleanup of incomplete backups with error reporting

**Restoration Failures:**
- **Missing Backups:** Graceful fallback to empty steering directory creation
- **Corrupted Backups:** Detection and handling of corrupted backup files
- **Permission Issues:** Clear guidance on resolving file access problems
- **Partial Restoration:** Best-effort restoration with detailed error reporting

**Mode Switching UI Error States:**
- **Workspace Validation Errors:** Clear messaging when no workspace is open
- **File System Errors:** Detailed error messages with actionable suggestions
- **State Inconsistency:** Recovery procedures for inconsistent mode states
- **Network/Timeout Errors:** Handling of file system operation timeouts

#### Idempotence and Safety Features

**Backup Idempotence:**
```typescript
private async shouldCreateBackup(steeringDir: string, backupBaseDir: string): Promise<boolean> {
  // Check if content has changed since last backup
  const mostRecentBackup = await this.findMostRecentBackup(backupBaseDir);
  if (!mostRecentBackup) {
    return true; // No previous backup exists
  }
  
  // Compare directory contents for changes
  const hasChanges = await this.hasDirectoryChanged(steeringDir, mostRecentBackup);
  return hasChanges;
}
```

**Content Change Detection:**
- **File Count Comparison:** Quick check for different number of files
- **File List Comparison:** Verify all files exist in both directories
- **Content Comparison:** Byte-by-byte comparison of file contents
- **Timestamp Validation:** Consider modification times for change detection

**Safety Mechanisms:**
- **Atomic Operations:** Use rename operations for atomic directory moves
- **Rollback Capability:** Maintain backup integrity for rollback scenarios
- **Validation Checks:** Verify backup completeness before proceeding
- **Error Isolation:** Prevent partial state changes that could corrupt the system

### 2. Embedded Persona Template System
The onboarding persona template is embedded in the extension bundle (`src/services/onboarding-mode.service.ts`) to ensure it ships with the extension and is always available.

**Template Structure:**
```markdown
# Onboarding Guide (Strict Persona)

Purpose
- Provide concise, step-by-step onboarding walkthrough for repository topics
- Operate strictly via chat, coordinating with extension through onboarding tools
- Execute plans through file opening and line range highlighting

Operating Assumptions
- Onboarding mode enabled in extension's Side Panel
- Files identified by workspace-relative paths
- Line ranges are 1-based and inclusive (extension clamps if needed)
- IDE actions performed by extension after tool calls

Available Tools (constellation_onboarding.*)
1) plan - Propose walkthrough plan (no side effects)
2) commitPlan - Persist plan and execute Step 1
3) nextStep - Advance to next step and execute in IDE

Conversation Protocol (STRICT)
1) Clarify topic in one line
2) Draft plan using tool, present succinctly, ask for confirmation
3) On explicit "yes", commit plan and execute Step 1
4) Advance only on explicit user request ("next", "continue", etc.)
5) Stop or revise on user request

Response Style
- Concise and action-oriented
- Show file paths as workspace-relative monospace
- Display "Step K of N" at each step
- Ground explanations in visible architecture

Safety & Correctness
- Never reveal secrets/tokens
- Never claim to edit files
- If file/range fails, propose corrected step
```

**Core Directives:**
- **Strict Conversation Protocol:** Enforces step-by-step execution with explicit user confirmation
- **Tool Usage Patterns:** Detailed specifications for all 4 onboarding MCP tools
- **File Path Handling:** Workspace-relative path requirements and validation
- **Error Recovery:** Procedures for handling file access and execution failures
- **Response Formatting:** Consistent messaging and progress display patterns

**Conversation Protocol Details:**
1. **Topic Clarification:** Single-line confirmation of user's learning objective
2. **Plan Drafting:** Tool-generated plan presentation with step-by-step breakdown
3. **Plan Commitment:** Explicit user confirmation required before execution begins
4. **Step Progression:** Advance only on specific user intents ("next", "continue", "proceed")
5. **Completion Handling:** Offer documentation or testing options via finalize tool

**Template Embedding Benefits:**
- **Bundle Shipping:** Template included in extension package, no external dependencies
- **Version Control:** Template versioned with extension code for consistency
- **Immediate Availability:** No network requests or file downloads required
- **Customization Safety:** Prevents accidental template corruption or loss

### 3. Mode Switching UI Components

#### OnboardingModeToggle Component
**Location:** `webview-ui/src/components/OnboardingModeToggle.tsx`

**Core Functionality:**
```typescript
interface OnboardingModeToggleProps {
  currentMode: 'Default' | 'Onboarding';
  onModeChange: (mode: 'Default' | 'Onboarding') => void;
  isLoading?: boolean;
}

function OnboardingModeToggle({ currentMode, onModeChange, isLoading }: OnboardingModeToggleProps) {
  const handleModeSwitch = async (targetMode: 'Default' | 'Onboarding') => {
    // Show confirmation dialog before switching
    const confirmed = await showConfirmationDialog(targetMode);
    if (!confirmed) return;
    
    // Send mode change request to extension
    messenger.post('onboarding/change-mode', { mode: targetMode });
  };
}
```

**Confirmation Dialog Patterns:**
- **Switch to Onboarding:** "This will backup your current steering documents and switch to onboarding mode. Continue?"
- **Switch to Default:** "This will restore your original steering documents and end any active walkthrough. Continue?"
- **Active Walkthrough Warning:** "You have an active walkthrough. Switching modes will end the current session. Continue?"

**Status Messaging Integration:**
```typescript
// Success messages
onModeChanged: (mode) => {
  showStatusMessage(`Successfully switched to ${mode} mode`, 'success');
}

// Error messages  
onModeError: (error) => {
  showStatusMessage(`Mode switch failed: ${error.message}`, 'error');
  // Provide retry option or troubleshooting guidance
}

// Loading states
onModeChangeStart: () => {
  setIsLoading(true);
  showStatusMessage('Switching modes...', 'info');
}
```

**HTTP Bridge Integration:**
- **Message Routing:** Integrates with webview messenger service for extension communication
- **Error Handling:** Displays HTTP bridge errors with user-friendly messages
- **Timeout Handling:** Shows progress indicators for long-running operations
- **Retry Logic:** Provides retry options for failed mode switches

#### OnboardingStatus Component
**Location:** `webview-ui/src/components/OnboardingStatus.tsx`

**Core Functionality:**
```typescript
interface OnboardingStatusProps {
  walkthroughState: WalkthroughStatus | null;
  onStepAdvance: () => void;
  onWalkthroughEnd: () => void;
}

interface WalkthroughStatus {
  isActive: boolean;
  currentStep?: number;
  totalSteps?: number;
  currentFile?: string;
  explanation?: string;
}
```

**Progress Display Patterns:**
```typescript
function renderProgressIndicator(status: WalkthroughStatus) {
  if (!status.isActive) {
    return <div className="status-inactive">No active walkthrough</div>;
  }
  
  return (
    <div className="walkthrough-progress">
      <div className="step-counter">
        Step {status.currentStep} of {status.totalSteps}
      </div>
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${(status.currentStep / status.totalSteps) * 100}%` }}
        />
      </div>
      <div className="current-file">
        Current: <code>{status.currentFile}</code>
      </div>
      <div className="explanation">
        {status.explanation}
      </div>
    </div>
  );
}
```

**Step Navigation Controls:**
```typescript
function renderNavigationControls(status: WalkthroughStatus) {
  return (
    <div className="navigation-controls">
      <button 
        onClick={onStepAdvance}
        disabled={!status.isActive}
        className="btn-primary"
      >
        Next Step
      </button>
      <button 
        onClick={onWalkthroughEnd}
        disabled={!status.isActive}
        className="btn-secondary"
      >
        End Walkthrough
      </button>
    </div>
  );
}
```

**Real-time Status Updates:**
- **Step Progression:** Live updates as user advances through walkthrough steps
- **File Highlighting:** Status indicators for successful file opening and highlighting
- **Completion Notifications:** Clear messaging when walkthrough completes
- **Error States:** User-friendly error messages with recovery suggestions

#### Message Flow Integration

**Webview → Extension Messages:**
```typescript
// Mode switching requests
messenger.post('onboarding/change-mode', { mode: 'Onboarding' });
messenger.post('onboarding/get-mode');
messenger.post('onboarding/get-status');
```

**Extension → Webview Messages:**
```typescript
// Mode change confirmations
messenger.on('onboarding/mode-changed', (data) => {
  updateModeDisplay(data.mode);
  showSuccessMessage(`Switched to ${data.mode} mode`);
});

// Error handling
messenger.on('onboarding/mode-error', (data) => {
  showErrorMessage(data.message);
  enableRetryOption();
});

// Status updates
messenger.on('onboarding/status-update', (data) => {
  updateWalkthroughDisplay(data);
});

// Completion handling
messenger.on('onboarding/walkthrough-complete', (data) => {
  showCompletionDialog(data.summary);
  resetWalkthroughState();
});
```

#### Error Handling and User Feedback

**Mode Switch Error Categories:**
1. **Workspace Errors:** "No workspace folder open. Please open a workspace first."
2. **Permission Errors:** "Unable to backup steering files. Check file permissions."
3. **File System Errors:** "Backup operation failed. Ensure sufficient disk space."
4. **Network Errors:** "Communication with extension failed. Please try again."

**Recovery Procedures:**
```typescript
function handleModeError(error: ModeError) {
  switch (error.type) {
    case 'workspace':
      showWorkspaceGuidance();
      break;
    case 'permission':
      showPermissionTroubleshooting();
      break;
    case 'filesystem':
      showDiskSpaceGuidance();
      break;
    case 'network':
      showRetryOption();
      break;
    default:
      showGenericErrorGuidance();
  }
}
```

**User Guidance Patterns:**
- **Actionable Messages:** Clear instructions on how to resolve specific errors
- **Retry Options:** Easy retry buttons for transient failures
- **Troubleshooting Links:** Links to documentation for complex issues
- **Status Persistence:** Remember error states across UI refreshes

## Walkthrough Execution System

### 1. Graph-Based Plan Generation Using BFS Traversal

#### BFS Traversal Engine Architecture
```typescript
class BfsTraversalEngine {
  /**
   * Performs breadth-first search over union graph (forward ∪ reverse edges)
   * Requirements: 4.1, 4.2, 4.3, 4.4
   */
  traverse(
    seedId: string,
    forwardMap: Map<string, string[]>,
    reverseMap: Map<string, string[]>,
    config: TraversalConfig = { depth: 1, limit: 30, direction: 'union' }
  ): TraversalResult {
    // Initialize traversal state
    const visited = new Set<string>();
    const queue: Array<{ nodeId: string; depth: number; degree: number }> = [];
    const results: Array<{ nodeId: string; depth: number; degree: number }> = [];
    
    // Statistics tracking
    let nodesVisited = 0;
    let edgesTraversed = 0;
    let maxDepthReached = 0;
    
    // Add seed node to queue (depth 0)
    const seedDegree = this.calculateNodeDegree(seedId, forwardMap, reverseMap);
    queue.push({ nodeId: seedId, depth: 0, degree: seedDegree });
    visited.add(seedId);
    
    // BFS traversal with depth limiting
    while (queue.length > 0) {
      const current = queue.shift()!;
      nodesVisited++;
      maxDepthReached = Math.max(maxDepthReached, current.depth);
      
      // Skip if we've reached the depth limit
      if (current.depth >= config.depth) {
        continue;
      }
      
      // Get neighbors based on direction configuration
      const neighbors = this.getNeighbors(current.nodeId, forwardMap, reverseMap, config.direction);
      
      // Process each neighbor
      for (const neighborId of neighbors) {
        edgesTraversed++;
        
        // Cycle detection to prevent infinite loops
        if (visited.has(neighborId)) {
          continue;
        }
        
        visited.add(neighborId);
        const neighborDepth = current.depth + 1;
        const neighborDegree = this.calculateNodeDegree(neighborId, forwardMap, reverseMap);
        
        // Add to queue for further exploration (if within depth limit)
        if (neighborDepth < config.depth) {
          queue.push({ nodeId: neighborId, depth: neighborDepth, degree: neighborDegree });
        }
        
        // Add to results (excluding the seed node itself)
        if (neighborId !== seedId) {
          results.push({ nodeId: neighborId, depth: neighborDepth, degree: neighborDegree });
        }
      }
    }
    
    // Ranking by distance (depth) first, then by node degree
    results.sort((a, b) => {
      // Primary sort: by depth (distance from seed)
      if (a.depth !== b.depth) {
        return a.depth - b.depth;
      }
      // Secondary sort: by degree (higher degree = more connected = more important)
      return b.degree - a.degree;
    });
    
    // Result limiting with configurable maximum results
    const limitedResults = results.slice(0, config.limit);
    
    return {
      relatedFiles: limitedResults.map(r => r.nodeId),
      stats: {
        nodesVisited,
        edgesTraversed,
        maxDepth: maxDepthReached
      }
    };
  }
}
```

#### Graph Context Computation
```typescript
async function computeGraphContext(request: string, seedFile?: string): Promise<GraphContext> {
  const graphData = graphContextService.getGraphData();
  const forwardMap = graphContextService.getForwardAdjacencyMap();
  const reverseMap = graphContextService.getReverseAdjacencyMap();
  
  if (!graphData || !forwardMap || !reverseMap) {
    throw new Error('Graph data not loaded');
  }

  const nodeIds = graphData.nodes.map(n => n.id);
  
  // Integrate seed resolution for both file-based and topic-based requests
  let seedId: string | null = null;
  
  if (seedFile) {
    // File-based seed resolution
    seedId = seedResolutionEngine.resolveSeed(seedFile, nodeIds, false);
  } else {
    // Topic-based seed resolution from request
    seedId = seedResolutionEngine.resolveSeed(request, nodeIds, true);
  }

  let relatedFiles: string[] = [];
  
  if (seedId) {
    // Call BFS traversal engine to compute related files
    const traversalResult = bfsTraversalEngine.traverse(
      seedId,
      forwardMap,
      reverseMap,
      { depth: 1, limit: 30, direction: 'union' }
    );
    
    relatedFiles = traversalResult.relatedFiles;
    
    console.log(`MCP server: Found ${relatedFiles.length} related files for seed "${seedId}"`);
  } else {
    console.log('MCP server: No seed resolved, returning empty related files');
  }

  return {
    seedId,
    relatedFiles,
    depth: 1,
    limit: 30
  };
}
```

#### Enhanced Plan Generation Algorithm
```typescript
function generateEnhancedPlan(request: string, context: GraphContext): OnboardingPlan {
  const steps: OnboardingStep[] = [];
  
  // 1. Always start with project overview for context
  steps.push({
    filePath: "README.md",
    lineStart: 1,
    lineEnd: 10,
    explanation: `Starting with the project overview to understand ${request}`
  });

  // 2. Include seed file if resolved from graph context
  if (context.seedId) {
    steps.push({
      filePath: context.seedId,
      lineStart: 1,
      lineEnd: 50,
      explanation: `Examining the main file related to ${request}`
    });
  }

  // 3. Include related files from BFS traversal (up to 5 most relevant)
  const maxRelatedFiles = Math.min(5, context.relatedFiles.length);
  for (let i = 0; i < maxRelatedFiles; i++) {
    const relatedFile = context.relatedFiles[i];
    steps.push({
      filePath: relatedFile,
      lineStart: 1,
      lineEnd: 30,
      explanation: `Exploring ${relatedFile} which is connected to your topic of interest`
    });
  }

  // 4. Always include project configuration for dependency context
  if (!steps.some(step => step.filePath === "package.json")) {
    steps.push({
      filePath: "package.json",
      lineStart: 1,
      lineEnd: 20,
      explanation: "Examining project dependencies and configuration"
    });
  }

  return {
    version: 1,
    topic: request.substring(0, 100), // Truncate topic to reasonable length
    createdAt: new Date().toISOString(),
    steps
  };
}
```

### 2. Plan Commitment and Storage
```typescript
async function commitPlan(plan: OnboardingPlan): Promise<CommitResult> {
  try {
    // 1. Comprehensive plan validation
    this.validatePlan(plan);

    // 2. Workspace and security validation
    const workspaceRoot = SecurityService.validateWorkspace();

    // 3. Validate all file paths in the plan with security checks
    for (const step of plan.steps) {
      SecurityService.validateAndNormalizePath(step.filePath, workspaceRoot, false);
    }

    // 4. Create secure onboarding directory
    const onboardingDirRelative = '.constellation/onboarding';
    const onboardingDirValidated = SecurityService.validateAndNormalizePath(
      onboardingDirRelative, 
      workspaceRoot, 
      true
    );
    const onboardingDir = path.join(workspaceRoot, onboardingDirValidated);

    // 5. Ensure onboarding directory exists
    if (!fs.existsSync(onboardingDir)) {
      fs.mkdirSync(onboardingDir, { recursive: true });
    }

    // 6. Generate secure timestamped plan filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const planFilename = `plan-${timestamp}.json`;
    
    // 7. Validate plan filename for security
    const planFileRelative = path.join(onboardingDirRelative, planFilename);
    const planFileValidated = SecurityService.validateAndNormalizePath(
      planFileRelative, 
      workspaceRoot, 
      true
    );
    const planPath = path.join(workspaceRoot, planFileValidated);

    // 8. Persist plan to filesystem with error handling
    try {
      fs.writeFileSync(planPath, JSON.stringify(plan, null, 2), 'utf8');
    } catch (error) {
      throw new Error(`Failed to write plan file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // 9. Initialize walkthrough state
    this.currentState = {
      plan,
      currentStepIndex: 0,
      planPath,
      startedAt: new Date()
    };

    // 10. Execute first step with graceful error handling
    try {
      await this.executeStep(0);
    } catch (error) {
      // If first step fails, clean up the plan file and clear state
      try {
        if (fs.existsSync(planPath)) {
          fs.unlinkSync(planPath);
        }
      } catch {
        // Ignore cleanup errors
      }
      this.clearState();
      throw error;
    }

    return {
      status: 'started',
      stepCount: plan.steps.length,
      planPath: path.relative(workspaceRoot, planPath)
    };
  } catch (error) {
    throw new Error(`Failed to commit plan: ${error instanceof Error ? error.message : String(error)}`);
  }
}
```

#### Plan Validation Patterns
```typescript
private validatePlan(plan: OnboardingPlan): void {
  // Structure validation
  if (!plan) {
    throw new Error('Plan is required');
  }

  if (typeof plan.version !== 'number' || plan.version < 1) {
    throw new Error('Plan version must be a positive number');
  }

  if (!plan.topic || typeof plan.topic !== 'string' || plan.topic.trim().length === 0) {
    throw new Error('Plan topic is required and must be a non-empty string');
  }

  if (!plan.createdAt || typeof plan.createdAt !== 'string') {
    throw new Error('Plan createdAt is required and must be a string');
  }

  // Validate createdAt is a valid ISO date
  if (isNaN(Date.parse(plan.createdAt))) {
    throw new Error('Plan createdAt must be a valid ISO 8601 date string');
  }

  if (!Array.isArray(plan.steps) || plan.steps.length === 0) {
    throw new Error('Plan must contain at least one step');
  }

  // Validate each step
  plan.steps.forEach((step, index) => {
    this.validateStep(step, index);
  });
}

private validateStep(step: OnboardingStep, index: number): void {
  const stepPrefix = `Step ${index + 1}`;

  if (!step.filePath || typeof step.filePath !== 'string' || step.filePath.trim().length === 0) {
    throw new Error(`${stepPrefix}: filePath is required and must be a non-empty string`);
  }

  if (typeof step.lineStart !== 'number' || step.lineStart < 1) {
    throw new Error(`${stepPrefix}: lineStart must be a positive number (1-based)`);
  }

  if (typeof step.lineEnd !== 'number' || step.lineEnd < 1) {
    throw new Error(`${stepPrefix}: lineEnd must be a positive number (1-based)`);
  }

  if (step.lineEnd < step.lineStart) {
    throw new Error(`${stepPrefix}: lineEnd must be greater than or equal to lineStart`);
  }

  if (!step.explanation || typeof step.explanation !== 'string' || step.explanation.trim().length === 0) {
    throw new Error(`${stepPrefix}: explanation is required and must be a non-empty string`);
  }
}
```

### 3. Step Execution with File Highlighting and Navigation

#### Comprehensive Step Execution Engine
```typescript
async function executeStep(stepIndex: number): Promise<void> {
  if (!this.currentState) {
    throw new Error('No active walkthrough state');
  }

  if (stepIndex < 0 || stepIndex >= this.currentState.plan.steps.length) {
    throw new Error(`Invalid step index: ${stepIndex}`);
  }

  const step = this.currentState.plan.steps[stepIndex];
  const workspaceRoot = SecurityService.validateWorkspace();

  try {
    // 1. Validate and normalize file path with security checks
    const validatedPath = SecurityService.validateAndNormalizePath(step.filePath, workspaceRoot, false);
    const absoluteFilePath = path.resolve(workspaceRoot, validatedPath);

    // 2. Validate file exists before attempting to open
    if (!fs.existsSync(absoluteFilePath)) {
      throw new Error(`File not found: ${step.filePath}`);
    }

    // 3. Open the file in VS Code with timeout handling
    const document = await GracefulErrorHandler.withTimeout(
      () => Promise.resolve(vscode.workspace.openTextDocument(absoluteFilePath)),
      10000, // 10 second timeout
      `open document ${step.filePath}`
    );

    if (!document) {
      throw new Error(`Failed to open document: ${step.filePath} (timeout or error)`);
    }

    // 4. Show document in editor with timeout handling
    const editor = await GracefulErrorHandler.withTimeout(
      () => Promise.resolve(vscode.window.showTextDocument(document)),
      5000, // 5 second timeout
      `show document ${step.filePath}`
    );

    if (!editor) {
      throw new Error(`Failed to show document in editor: ${step.filePath} (timeout or error)`);
    }

    // 5. Validate and clamp line ranges to valid bounds (1-based to 0-based conversion)
    const totalLines = document.lineCount;
    const startLine = Math.max(0, Math.min(step.lineStart - 1, totalLines - 1));
    const endLine = Math.max(startLine, Math.min(step.lineEnd - 1, totalLines - 1));

    // 6. Create selection range with proper bounds checking
    const startPos = new vscode.Position(startLine, 0);
    const endPos = new vscode.Position(endLine, document.lineAt(endLine).text.length);
    const range = new vscode.Range(startPos, endPos);

    // 7. Set selection and reveal range with optimal positioning
    editor.selection = new vscode.Selection(range.start, range.end);
    editor.revealRange(range, vscode.TextEditorRevealType.InCenter);

    // 8. Log successful step execution for debugging
    console.log(`Walkthrough: Executed step ${stepIndex + 1} - ${step.filePath} (${step.lineStart}-${step.lineEnd})`);

  } catch (error) {
    throw new Error(`Failed to execute step ${stepIndex + 1}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
```

#### Line Range Validation and Clamping
```typescript
interface LineRangeValidation {
  originalStart: number;
  originalEnd: number;
  clampedStart: number;
  clampedEnd: number;
  wasModified: boolean;
  totalLines: number;
}

function validateAndClampLineRange(
  lineStart: number, 
  lineEnd: number, 
  document: vscode.TextDocument
): LineRangeValidation {
  const totalLines = document.lineCount;
  
  // Convert from 1-based to 0-based indexing
  const originalStart = lineStart - 1;
  const originalEnd = lineEnd - 1;
  
  // Clamp to valid bounds
  const clampedStart = Math.max(0, Math.min(originalStart, totalLines - 1));
  const clampedEnd = Math.max(clampedStart, Math.min(originalEnd, totalLines - 1));
  
  // Check if clamping was necessary
  const wasModified = (clampedStart !== originalStart) || (clampedEnd !== originalEnd);
  
  if (wasModified) {
    console.warn(`Line range clamped for ${document.fileName}: ${lineStart}-${lineEnd} → ${clampedStart + 1}-${clampedEnd + 1}`);
  }
  
  return {
    originalStart: originalStart,
    originalEnd: originalEnd,
    clampedStart,
    clampedEnd,
    wasModified,
    totalLines
  };
}
```

#### File Opening Patterns and Error Recovery
```typescript
async function openFileWithRetry(filePath: string, maxRetries: number = 3): Promise<vscode.TextDocument> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Attempt to open the document
      const document = await vscode.workspace.openTextDocument(filePath);
      
      // Verify document is valid
      if (!document || document.isClosed) {
        throw new Error('Document is closed or invalid');
      }
      
      return document;
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries) {
        // Wait before retry (exponential backoff)
        const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
        console.warn(`File open attempt ${attempt} failed, retrying in ${delay}ms: ${lastError.message}`);
      }
    }
  }
  
  throw new Error(`Failed to open file after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
}
```

#### Editor Positioning and Reveal Strategies
```typescript
enum RevealStrategy {
  InCenter = 'InCenter',           // Center the range in the viewport
  AtTop = 'AtTop',                 // Position range at top of viewport
  Default = 'Default',             // Use default positioning
  InCenterIfOutsideViewport = 'InCenterIfOutsideViewport'  // Only center if not visible
}

function revealRangeWithStrategy(
  editor: vscode.TextEditor, 
  range: vscode.Range, 
  strategy: RevealStrategy = RevealStrategy.InCenter
): void {
  let revealType: vscode.TextEditorRevealType;
  
  switch (strategy) {
    case RevealStrategy.InCenter:
      revealType = vscode.TextEditorRevealType.InCenter;
      break;
    case RevealStrategy.AtTop:
      revealType = vscode.TextEditorRevealType.AtTop;
      break;
    case RevealStrategy.InCenterIfOutsideViewport:
      revealType = vscode.TextEditorRevealType.InCenterIfOutsideViewport;
      break;
    default:
      revealType = vscode.TextEditorRevealType.Default;
  }
  
  // Set selection first, then reveal
  editor.selection = new vscode.Selection(range.start, range.end);
  editor.revealRange(range, revealType);
  
  // Optional: Add decoration for better visibility
  const decorationType = vscode.window.createTextEditorDecorationType({
    backgroundColor: 'rgba(255, 255, 0, 0.2)',
    border: '1px solid rgba(255, 255, 0, 0.5)'
  });
  
  editor.setDecorations(decorationType, [range]);
  
  // Remove decoration after a delay
  setTimeout(() => {
    decorationType.dispose();
  }, 3000);
}
```

### 3. Step Progression Patterns
```typescript
async function nextStep(): Promise<StepResult> {
  if (!this.currentState) {
    throw new Error('No active walkthrough');
  }

  const nextIndex = this.currentState.currentStepIndex + 1;

  // Check for completion
  if (nextIndex >= this.currentState.plan.steps.length) {
    this.clearState();
    return { status: 'complete' };
  }

  // Update state and execute next step
  this.currentState.currentStepIndex = nextIndex;
  await this.executeStep(nextIndex);

  return {
    status: 'ok',
    currentStepIndex: nextIndex
  };
}
```

### 4. Walkthrough Completion and Finalization Options

#### Comprehensive Finalization Process
```typescript
async function finalize(chosenAction: "document" | "test-plan" | null): Promise<FinalizeResult> {
  try {
    // 1. Validate current walkthrough state
    if (!this.currentState) {
      throw new Error('No active walkthrough to finalize');
    }

    // 2. Generate comprehensive summary before cleanup
    const summary = this.getSummary();
    
    // 3. Prepare cleanup operations with graceful error handling
    const cleanupOperations = [
      {
        name: 'removePlanFile',
        operation: async () => {
          if (this.currentState?.planPath) {
            const planPath = this.currentState.planPath;
            
            // Validate plan path is within allowed directories
            const workspaceRoot = SecurityService.validateWorkspace();
            const relativePath = path.relative(workspaceRoot, planPath);
            SecurityService.validateAndNormalizePath(relativePath, workspaceRoot, true);

            if (fs.existsSync(planPath)) {
              await fs.promises.unlink(planPath);
              return planPath;
            }
          }
          return null;
        },
        critical: false
      },
      {
        name: 'switchToDefaultMode',
        operation: async () => {
          await onboardingModeService.switchToDefault();
          return 'Default';
        },
        critical: false
      }
    ];

    // 4. Execute cleanup operations with graceful error handling
    const cleanupResults = await GracefulErrorHandler.executeWithGracefulHandling(cleanupOperations);

    // 5. Always clear walkthrough state regardless of cleanup results
    const removedPlanPath = this.currentState.planPath;
    this.clearState();

    // 6. Prepare finalization payload
    const finalizePayload = {
      chosenAction,
      summary,
      cleanup: {
        mode: 'Default' as const,
        removedPlan: removedPlanPath
      }
    };

    // 7. Send completion message to webview
    if (webviewProvider) {
      webviewProvider.postMessage({
        type: 'onboarding/finalize-complete',
        payload: finalizePayload
      });
    }

    // 8. Log completion for debugging
    console.log(`Walkthrough finalized: ${summary.topic} (${summary.stepCount} steps, ${summary.files.length} files)`);

    return {
      status: 'done',
      chosenAction,
      summary,
      cleanup: finalizePayload.cleanup
    };

  } catch (error) {
    // Ensure state is cleared even on error
    this.clearState();
    throw new Error(`Finalization failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
```

#### Summary Generation Patterns
```typescript
interface SummaryData {
  topic: string;
  stepCount: number;
  files: string[];
  highlights: HighlightData[];
  bulletSummary: string[];
}

interface HighlightData {
  filePath: string;
  lineStart: number;
  lineEnd: number;
}

function getSummary(): SummaryData {
  // Return empty defaults if no active state
  if (!this.currentState) {
    return {
      topic: '',
      stepCount: 0,
      files: [],
      highlights: [],
      bulletSummary: []
    };
  }

  const plan = this.currentState.plan;

  return {
    topic: plan.topic,
    stepCount: plan.steps.length,
    files: this.extractFiles(plan),
    highlights: this.extractHighlights(plan),
    bulletSummary: this.generateBulletSummary(plan)
  };
}

private extractFiles(plan: OnboardingPlan): string[] {
  const uniqueFiles = new Set<string>();
  plan.steps.forEach(step => {
    uniqueFiles.add(step.filePath);
  });
  return Array.from(uniqueFiles).sort();
}

private extractHighlights(plan: OnboardingPlan): HighlightData[] {
  return plan.steps.map(step => ({
    filePath: step.filePath,
    lineStart: step.lineStart,
    lineEnd: step.lineEnd
  }));
}

private generateBulletSummary(plan: OnboardingPlan): string[] {
  const bullets = plan.steps
    .map(step => step.explanation.trim())
    .filter(explanation => explanation.length > 0)
    .slice(0, 10) // Maximum 10 items
    .map(explanation => {
      // Trim to single line, max 100 characters
      const singleLine = explanation.replace(/\n/g, ' ').trim();
      return singleLine.length > 100 
        ? singleLine.substring(0, 97) + '...'
        : singleLine;
    });
  
  return bullets;
}
```

#### Cleanup Operations with Graceful Error Handling
```typescript
async function cleanup(options: { removePlan: boolean } = { removePlan: true }): Promise<void> {
  // Use graceful error handling to complete as many operations as possible
  const operations = [];

  // Add plan file removal operation if requested
  if (options.removePlan && this.currentState?.planPath) {
    operations.push({
      name: 'removePlanFile',
      operation: async () => {
        const planPath = this.currentState!.planPath;
        
        // Validate plan path is within allowed directories before deletion
        try {
          const workspaceRoot = SecurityService.validateWorkspace();
          const relativePath = path.relative(workspaceRoot, planPath);
          SecurityService.validateAndNormalizePath(relativePath, workspaceRoot, true);
        } catch (error) {
          throw new Error(`Plan file path validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        if (fs.existsSync(planPath)) {
          await fs.promises.unlink(planPath);
          return planPath;
        }
        return null;
      },
      critical: false
    });
  }

  // Add mode switch operation
  operations.push({
    name: 'switchToDefaultMode',
    operation: async () => {
      await onboardingModeService.switchToDefault();
      return 'Default';
    },
    critical: false
  });

  // Execute all operations with graceful error handling
  const results = await GracefulErrorHandler.executeWithGracefulHandling(operations);

  // Always clear state regardless of operation results
  this.clearState();

  // Log results for debugging
  const failedOperations = results.filter(r => !r.success);
  if (failedOperations.length > 0) {
    console.warn('Some cleanup operations failed:', failedOperations.map(op => `${op.name}: ${op.error}`));
  }

  const successfulOperations = results.filter(r => r.success);
  if (successfulOperations.length > 0) {
    console.log('Cleanup operations completed:', successfulOperations.map(op => op.name));
  }
}
```

#### Post-Walkthrough Action Handling
```typescript
enum PostWalkthroughAction {
  Document = 'document',
  TestPlan = 'test-plan',
  None = null
}

interface ActionHandler {
  action: PostWalkthroughAction;
  handler: (summary: SummaryData) => Promise<ActionResult>;
}

const actionHandlers: ActionHandler[] = [
  {
    action: PostWalkthroughAction.Document,
    handler: async (summary: SummaryData) => {
      // Generate documentation based on walkthrough
      const documentation = generateDocumentationFromSummary(summary);
      return {
        type: 'document',
        content: documentation,
        message: 'Documentation generated from walkthrough'
      };
    }
  },
  {
    action: PostWalkthroughAction.TestPlan,
    handler: async (summary: SummaryData) => {
      // Generate test plan based on walkthrough
      const testPlan = generateTestPlanFromSummary(summary);
      return {
        type: 'test-plan',
        content: testPlan,
        message: 'Test plan generated from walkthrough'
      };
    }
  }
];

async function handlePostWalkthroughAction(
  chosenAction: PostWalkthroughAction, 
  summary: SummaryData
): Promise<ActionResult | null> {
  if (chosenAction === PostWalkthroughAction.None) {
    return null;
  }

  const handler = actionHandlers.find(h => h.action === chosenAction);
  if (!handler) {
    throw new Error(`Unknown post-walkthrough action: ${chosenAction}`);
  }

  try {
    return await handler.handler(summary);
  } catch (error) {
    console.error(`Post-walkthrough action failed: ${error}`);
    return {
      type: 'error',
      content: null,
      message: `Failed to execute ${chosenAction}: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
```

## HTTP Bridge Integration

### 1. Secure Communication Patterns
All onboarding HTTP endpoints use the secure loopback communication pattern:

**Security Features:**
- **Loopback-Only Binding:** All endpoints restricted to 127.0.0.1
- **Bearer Token Authentication:** Random session tokens for each activation
- **Request Size Limits:** 1MB maximum request body size
- **JSON Validation:** Comprehensive input validation and sanitization
- **Path Security:** Workspace boundary checks and directory traversal prevention

### 2. Endpoint Specifications

#### POST /persona
**Purpose:** Mode switching between Default and Onboarding personas
**Authentication:** Bearer token required
**Request Body:**
```typescript
{
  action: "enable" | "disable"
}
```
**Response:**
```typescript
{
  success: boolean,
  mode: "Default" | "Onboarding",
  message: string
}
```
**Error Codes:**
- 400: Invalid action or missing workspace
- 403: Permission denied for file operations
- 500: Mode switching error

#### POST /onboarding/commitPlan
**Purpose:** Commits an onboarding plan and begins walkthrough execution
**Authentication:** Bearer token required
**Request Body:**
```typescript
{
  plan: OnboardingPlan
}
```
**Response:** Walkthrough initialization result with current step information
**Error Codes:**
- 400: Invalid plan structure or missing workspace
- 403: Permission denied for file operations
- 404: Referenced files not found
- 500: Plan commitment error

#### POST /onboarding/nextStep
**Purpose:** Advances to the next step in the active walkthrough
**Authentication:** Bearer token required
**Request Body:** None
**Response:** Next step information with file path, line ranges, and explanation
**Error Codes:**
- 412: No active walkthrough
- 400: Missing workspace
- 404: Step file not found
- 500: Step progression error

#### POST /onboarding/finalize
**Purpose:** Completes walkthrough and performs cleanup operations
**Authentication:** Bearer token required
**Request Body:**
```typescript
{
  chosenAction: "document" | "test-plan" | null
}
```
**Response:**
```typescript
{
  status: "done",
  chosenAction: string,
  summary: SummaryData,
  cleanup: CleanupData
}
```
**Error Codes:**
- 400: Invalid chosenAction or missing workspace
- 403: Permission denied for cleanup operations
- 500: Finalization error

## Error Handling for Missing Data and Execution Failures

### 1. Graph Data and Dependency Analysis Errors

#### Missing Graph Data Handling
```typescript
async function loadGraphWithScanFallback(): Promise<void> {
  try {
    // First attempt to load existing graph data
    await graphContextService.loadGraph();
    return; // Success - graph loaded
  } catch (error) {
    // Check if error is due to missing graph file
    if (error instanceof Error && error.message.includes('Graph file not found')) {
      console.log('MCP server: Graph file missing, triggering dependency scan...');
      
      // Trigger scan once via HTTP bridge
      const scanSuccess = await triggerScanViaHttpBridge();
      
      if (scanSuccess) {
        // Retry graph file reading after successful scan
        try {
          await graphContextService.loadGraph();
          console.log('MCP server: Graph loaded successfully after scan');
          return;
        } catch (retryError) {
          console.warn('MCP server: Failed to load graph after scan:', retryError);
          throw retryError;
        }
      } else {
        console.warn('MCP server: Scan failed or timed out, proceeding without graph context');
        throw new Error('Graph file missing and scan failed');
      }
    } else {
      // Re-throw other errors (parsing errors, permission issues, etc.)
      throw error;
    }
  }
}
```

#### Scan Timeout and Progress Handling
```typescript
async function triggerScanViaHttpBridge(): Promise<boolean> {
  try {
    const port = process.env.CONSTELLATION_BRIDGE_PORT;
    const token = process.env.CONSTELLATION_BRIDGE_TOKEN;
    
    if (!port || !token) {
      console.warn('MCP server: HTTP bridge environment variables not available for scan trigger');
      return false;
    }

    // Call POST /scan endpoint with proper authentication
    const response = await fetch(`http://127.0.0.1:${port}/scan`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    if (response.ok) {
      const result = await response.json() as { status?: string };
      return result.status === 'ok';
    } else if (response.status === 504) {
      // Timeout - scan was attempted but timed out
      console.warn('MCP server: Dependency scan timed out (30 seconds)');
      return false;
    } else {
      console.warn(`MCP server: Scan request failed with status ${response.status}`);
      return false;
    }

  } catch (error) {
    // Handle network errors and timeouts gracefully
    console.warn('MCP server: Failed to trigger scan via HTTP bridge:', error);
    return false;
  }
}
```

#### Graph File Validation and Recovery
```typescript
private validateFileSize(filePath: string): { isValid: boolean; sizeInMB: number; warning?: string } {
  try {
    const stats = fs.statSync(filePath);
    const sizeInMB = stats.size / (1024 * 1024);
    
    if (sizeInMB > 5) {
      return {
        isValid: true,
        sizeInMB,
        warning: `Large graph file detected (${sizeInMB.toFixed(1)}MB). Processing may take longer.`
      };
    }
    
    return { isValid: true, sizeInMB };
  } catch (error) {
    return { isValid: false, sizeInMB: 0 };
  }
}

private async readGraphFile(): Promise<GraphData> {
  if (!this.workspaceRoot) {
    throw new Error('No workspace root available. Ensure CONSTELLATION_WORKSPACE_ROOT environment variable is set.');
  }

  const graphFilePath = path.join(this.workspaceRoot, '.constellation', 'data', 'codebase-dependencies.json');
  
  // Check if file exists
  if (!fs.existsSync(graphFilePath)) {
    throw new Error('Graph file not found. Dependency scan may be required.');
  }

  // Validate file size
  const sizeValidation = this.validateFileSize(graphFilePath);
  if (!sizeValidation.isValid) {
    throw new Error('Cannot read graph file. File may be corrupted or inaccessible.');
  }

  if (sizeValidation.warning) {
    console.warn('Graph Context Service:', sizeValidation.warning);
  }

  // Read file with error handling
  let rawData: string;
  try {
    rawData = fs.readFileSync(graphFilePath, 'utf8');
  } catch (error) {
    throw new Error(`Failed to read graph file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Parse JSON with error handling for malformed data
  let depResult: DepCruiseResult;
  try {
    depResult = JSON.parse(rawData);
  } catch (error) {
    throw new Error('Failed to parse graph file. The file may be corrupted or contain invalid JSON.');
  }

  // Validate structure
  if (!depResult.depcruise || !Array.isArray(depResult.depcruise.modules)) {
    throw new Error('Invalid graph file format. Expected dependency-cruiser output format.');
  }

  return this.transformDepCruiseToGraph(depResult);
}
```

### 2. Seed Resolution and Plan Generation Errors

#### Seed Resolution Failure Handling
```typescript
function resolveSeedWithFallback(seed: string, nodeIds: string[], isTopic: boolean = false): string | null {
  try {
    // Primary resolution attempt
    const result = this.resolveSeed(seed, nodeIds, isTopic);
    if (result) {
      return result;
    }

    // Fallback strategies for failed resolution
    if (!isTopic) {
      // For file paths, try topic matching as fallback
      console.log(`Seed resolution: File path "${seed}" not found, trying topic matching`);
      const topicResult = this.topicMatching(seed, nodeIds);
      if (topicResult) {
        console.log(`Seed resolution: Found topic match "${topicResult}" for "${seed}"`);
        return topicResult;
      }
    }

    // Final fallback: try partial matching
    const partialResult = this.partialMatching(seed, nodeIds);
    if (partialResult) {
      console.log(`Seed resolution: Found partial match "${partialResult}" for "${seed}"`);
      return partialResult;
    }

    console.log(`Seed resolution: No matches found for "${seed}"`);
    return null;

  } catch (error) {
    console.error(`Seed resolution error for "${seed}":`, error);
    return null;
  }
}

private partialMatching(seed: string, nodeIds: string[]): string | null {
  const seedLower = seed.toLowerCase();
  
  // Find files that contain any part of the seed
  const candidates = nodeIds.filter(id => {
    const idLower = id.toLowerCase();
    return idLower.includes(seedLower) || seedLower.includes(idLower);
  });

  if (candidates.length === 0) {
    return null;
  }

  // Return the shortest match (most specific)
  candidates.sort((a, b) => a.length - b.length);
  return candidates[0];
}
```

#### Plan Generation Error Recovery
```typescript
function generatePlanWithFallback(request: string, context: GraphContext): OnboardingPlan {
  try {
    // Attempt enhanced plan generation
    return this.generateEnhancedPlan(request, context);
  } catch (error) {
    console.warn('Enhanced plan generation failed, using fallback:', error);
    
    // Fallback to basic plan generation
    return this.generateBasicPlan(request);
  }
}

private generateBasicPlan(request: string): OnboardingPlan {
  const steps: OnboardingStep[] = [];
  
  // Always include basic project files
  const basicFiles = ['README.md', 'package.json', 'src/index.ts', 'src/main.ts'];
  
  for (const filePath of basicFiles) {
    steps.push({
      filePath,
      lineStart: 1,
      lineEnd: 20,
      explanation: `Examining ${filePath} to understand the project structure`
    });
  }

  return {
    version: 1,
    topic: request.substring(0, 100),
    createdAt: new Date().toISOString(),
    steps
  };
}
```

### 3. Walkthrough Execution Error Handling

#### File Access and Opening Errors
```typescript
async function executeStepWithRecovery(stepIndex: number): Promise<void> {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await this.executeStep(stepIndex);
      return; // Success
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries) {
        console.warn(`Step execution attempt ${attempt} failed, retrying: ${lastError.message}`);
        
        // Wait before retry with exponential backoff
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // All retries failed, attempt recovery
  await this.attemptStepRecovery(stepIndex, lastError!);
}

private async attemptStepRecovery(stepIndex: number, error: Error): Promise<void> {
  const step = this.currentState!.plan.steps[stepIndex];
  
  // Try to find alternative file if original doesn't exist
  if (error.message.includes('File not found')) {
    const alternativeFile = await this.findAlternativeFile(step.filePath);
    if (alternativeFile) {
      console.log(`Step recovery: Using alternative file "${alternativeFile}" for "${step.filePath}"`);
      
      // Create modified step with alternative file
      const modifiedStep = { ...step, filePath: alternativeFile };
      this.currentState!.plan.steps[stepIndex] = modifiedStep;
      
      // Retry with modified step
      await this.executeStep(stepIndex);
      return;
    }
  }

  // Try to adjust line ranges if they're invalid
  if (error.message.includes('line range') || error.message.includes('bounds')) {
    console.log(`Step recovery: Adjusting line ranges for "${step.filePath}"`);
    
    // Create modified step with safe line ranges
    const modifiedStep = { 
      ...step, 
      lineStart: 1, 
      lineEnd: Math.min(50, step.lineEnd) 
    };
    this.currentState!.plan.steps[stepIndex] = modifiedStep;
    
    // Retry with modified step
    await this.executeStep(stepIndex);
    return;
  }

  // If all recovery attempts fail, skip this step
  console.error(`Step recovery failed for step ${stepIndex + 1}, skipping: ${error.message}`);
  throw new Error(`Step ${stepIndex + 1} could not be executed or recovered: ${error.message}`);
}

private async findAlternativeFile(originalPath: string): Promise<string | null> {
  const workspaceRoot = SecurityService.validateWorkspace();
  
  // Try common alternative paths
  const alternatives = [
    originalPath.replace('.ts', '.js'),
    originalPath.replace('.js', '.ts'),
    originalPath.replace('src/', ''),
    'src/' + originalPath,
    originalPath.replace('index.', 'main.'),
    originalPath.replace('main.', 'index.')
  ];

  for (const alternative of alternatives) {
    try {
      const fullPath = path.resolve(workspaceRoot, alternative);
      if (fs.existsSync(fullPath)) {
        return alternative;
      }
    } catch {
      // Ignore errors and try next alternative
    }
  }

  return null;
}
```

#### Step Progression and State Recovery
```typescript
async function nextStepWithRecovery(): Promise<StepResult> {
  try {
    return await this.nextStep();
  } catch (error) {
    console.error('Step progression failed:', error);
    
    // Attempt to recover walkthrough state
    if (this.currentState) {
      // Try to advance to next valid step
      const nextValidStep = await this.findNextValidStep();
      if (nextValidStep !== null) {
        this.currentState.currentStepIndex = nextValidStep;
        await this.executeStep(nextValidStep);
        
        return {
          status: 'ok',
          currentStepIndex: nextValidStep
        };
      }
    }

    // If recovery fails, end the walkthrough
    console.warn('Step progression recovery failed, ending walkthrough');
    this.clearState();
    return { status: 'complete' };
  }
}

private async findNextValidStep(): Promise<number | null> {
  if (!this.currentState) {
    return null;
  }

  const currentIndex = this.currentState.currentStepIndex;
  const steps = this.currentState.plan.steps;

  // Try each subsequent step to find one that can be executed
  for (let i = currentIndex + 1; i < steps.length; i++) {
    const step = steps[i];
    
    try {
      // Check if file exists
      const workspaceRoot = SecurityService.validateWorkspace();
      const fullPath = path.resolve(workspaceRoot, step.filePath);
      
      if (fs.existsSync(fullPath)) {
        return i;
      }
    } catch {
      // Continue to next step
    }
  }

  return null; // No valid steps found
}
```

### 4. HTTP Bridge and Communication Errors

#### Authentication and Security Error Handling
```typescript
function handleHttpBridgeError(error: any, operation: string): never {
  if (error.code === 'ECONNREFUSED') {
    throw new Error(`HTTP bridge connection refused during ${operation}. Extension may not be running.`);
  }

  if (error.code === 'ETIMEDOUT') {
    throw new Error(`HTTP bridge timeout during ${operation}. Operation took too long.`);
  }

  if (error.status === 401) {
    throw new Error(`Authentication failed during ${operation}. Invalid or expired token.`);
  }

  if (error.status === 403) {
    throw new Error(`Permission denied during ${operation}. Check file system permissions.`);
  }

  if (error.status === 404) {
    throw new Error(`Endpoint not found during ${operation}. Extension may be outdated.`);
  }

  if (error.status === 413) {
    throw new Error(`Request too large during ${operation}. Reduce request size.`);
  }

  if (error.status === 429) {
    throw new Error(`Rate limit exceeded during ${operation}. Please wait and try again.`);
  }

  if (error.status >= 500) {
    throw new Error(`Server error during ${operation}: ${error.message || 'Unknown server error'}`);
  }

  throw new Error(`HTTP bridge error during ${operation}: ${error.message || 'Unknown error'}`);
}
```

#### Request Retry and Circuit Breaker Patterns
```typescript
class HttpBridgeClient {
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly maxFailures = 5;
  private readonly resetTimeout = 60000; // 1 minute

  async makeRequest(endpoint: string, options: RequestOptions): Promise<any> {
    // Check circuit breaker
    if (this.isCircuitOpen()) {
      throw new Error('HTTP bridge circuit breaker is open. Too many recent failures.');
    }

    try {
      const response = await this.executeRequest(endpoint, options);
      
      // Reset failure count on success
      this.failureCount = 0;
      return response;
      
    } catch (error) {
      this.recordFailure();
      throw this.handleHttpBridgeError(error, `request to ${endpoint}`);
    }
  }

  private isCircuitOpen(): boolean {
    if (this.failureCount < this.maxFailures) {
      return false;
    }

    // Check if enough time has passed to reset
    const now = Date.now();
    if (now - this.lastFailureTime > this.resetTimeout) {
      this.failureCount = 0;
      return false;
    }

    return true;
  }

  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
  }
}
```

## Integration with Existing Features

### 1. Dependency Graph Integration
- **Graph Data Service:** Leverages existing dependency analysis infrastructure
- **Impact Analysis:** Reuses BFS traversal patterns for plan generation
- **Performance Optimizations:** Inherits large graph handling optimizations
- **Error Handling:** Consistent error patterns with existing graph features

### 2. Webview UI Integration
- **Message Routing:** Integrates with existing webview messaging architecture
- **Status Updates:** Real-time progress reporting through established patterns
- **Error Display:** Consistent error messaging and user feedback
- **Component Integration:** Seamless integration with existing UI components

### 3. Extension Command Integration
- **Command Registration:** Follows existing command registration patterns
- **Workspace Validation:** Reuses workspace service validation logic
- **Configuration Management:** Integrates with existing configuration services
- **Activation Lifecycle:** Follows established extension activation patterns

## Development Guidelines

### 1. Adding New Onboarding Features
- Always validate workspace before processing
- Use SecurityService for all path validation and sanitization
- Provide progress feedback for operations >1 second
- Handle all edge cases gracefully with user-friendly messages
- Log errors for debugging while preserving user experience

### 2. Testing Onboarding Workflows
- Test mode switching with various steering directory states
- Verify plan generation with different graph sizes and structures
- Test walkthrough execution with missing files and invalid ranges
- Validate error handling and recovery procedures
- Test HTTP bridge endpoints with various authentication scenarios

### 3. Performance Considerations
- Plan generation optimized for large codebases (500+ files)
- Step execution with timeout handling for file operations
- Memory management for walkthrough state and plan storage
- Efficient backup and restore operations for large steering directories

### 4. Security Best Practices
- All file operations within workspace boundaries
- Path validation and sanitization for all user inputs
- Secure HTTP communication with token authentication
- Request size limits and input validation
- Comprehensive security logging and violation detection