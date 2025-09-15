import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { getWorkspaceRootOrThrow } from './workspace.service.js';
import { onboardingModeService } from './onboarding-mode.service.js';
import { agentModeService } from './agent-mode.service.js';
import { SecurityService, GracefulErrorHandler } from './security.service.js';

// Data Models
export interface OnboardingPlan {
  version: number;
  topic: string;
  createdAt: string;
  steps: OnboardingStep[];
}

export interface OnboardingStep {
  filePath: string;
  lineStart: number;
  lineEnd: number;
  explanation: string;
}

export interface WalkthroughState {
  plan: OnboardingPlan;
  currentStepIndex: number;
  planPath: string;
  startedAt: Date;
}

export interface CommitResult {
  status: 'started';
  stepCount: number;
  planPath: string;
}

export interface StepResult {
  status: 'ok' | 'complete';
  currentStepIndex?: number;
}

export interface SummaryData {
  topic: string;
  stepCount: number;
  files: string[];
  highlights: HighlightData[];
  bulletSummary: string[];
}

export interface HighlightData {
  filePath: string;
  lineStart: number;
  lineEnd: number;
}

export class OnboardingWalkthroughService {
  private currentState: WalkthroughState | null = null;

  /**
   * Commits a plan by validating it, persisting to filesystem, and executing the first step
   */
  async commitPlan(plan: OnboardingPlan): Promise<CommitResult> {
    try {
      // Validate the plan structure
      this.validatePlan(plan);

      // Validate workspace and get root
      const workspaceRoot = SecurityService.validateWorkspace();

      // Validate all file paths in the plan with security checks
      for (const step of plan.steps) {
        SecurityService.validateAndNormalizePath(step.filePath, workspaceRoot, false);
      }

      // Validate and create onboarding directory path with security checks
      const onboardingDirRelative = '.constellation/onboarding';
      const onboardingDirValidated = SecurityService.validateAndNormalizePath(
        onboardingDirRelative, 
        workspaceRoot, 
        true
      );
      const onboardingDir = path.join(workspaceRoot, onboardingDirValidated);

      // Create onboarding directory if it doesn't exist
      if (!fs.existsSync(onboardingDir)) {
        fs.mkdirSync(onboardingDir, { recursive: true });
      }

      // Generate secure plan filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const planFilename = `plan-${timestamp}.json`;
      
      // Validate plan filename for security
      const planFileRelative = path.join(onboardingDirRelative, planFilename);
      const planFileValidated = SecurityService.validateAndNormalizePath(
        planFileRelative, 
        workspaceRoot, 
        true
      );
      const planPath = path.join(workspaceRoot, planFileValidated);

      // Persist plan to filesystem with error handling
      try {
        fs.writeFileSync(planPath, JSON.stringify(plan, null, 2), 'utf8');
      } catch (error) {
        throw new Error(`Failed to write plan file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Initialize walkthrough state
      this.currentState = {
        plan,
        currentStepIndex: 0,
        planPath,
        startedAt: new Date()
      };

      // Execute first step with graceful error handling
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

  /**
   * Advances to the next step in the walkthrough
   */
  async nextStep(): Promise<StepResult> {
    if (!this.currentState) {
      throw new Error('No active walkthrough. Please commit a plan first.');
    }

    const nextIndex = this.currentState.currentStepIndex + 1;

    // Check if we've reached the end
    if (nextIndex >= this.currentState.plan.steps.length) {
      // Clear state and return complete status
      this.clearState();
      return { status: 'complete' };
    }

    // Update current step index
    this.currentState.currentStepIndex = nextIndex;

    // Execute the next step
    await this.executeStep(nextIndex);

    return {
      status: 'ok',
      currentStepIndex: nextIndex
    };
  }

  /**
   * Executes a specific step by opening the file and highlighting the range
   */
  async executeStep(stepIndex: number): Promise<void> {
    if (!this.currentState) {
      throw new Error('No active walkthrough state');
    }

    if (stepIndex < 0 || stepIndex >= this.currentState.plan.steps.length) {
      throw new Error(`Invalid step index: ${stepIndex}`);
    }

    const step = this.currentState.plan.steps[stepIndex];
    const workspaceRoot = SecurityService.validateWorkspace();

    try {
      // Validate and normalize file path with security checks
      const validatedPath = SecurityService.validateAndNormalizePath(step.filePath, workspaceRoot, false);
      const absoluteFilePath = path.resolve(workspaceRoot, validatedPath);

      // Validate file exists
      if (!fs.existsSync(absoluteFilePath)) {
        throw new Error(`File not found: ${step.filePath}`);
      }

      // Open the file in VS Code with timeout
      const document = await GracefulErrorHandler.withTimeout(
        () => Promise.resolve(vscode.workspace.openTextDocument(absoluteFilePath)),
        10000, // 10 second timeout
        `open document ${step.filePath}`
      );

      if (!document) {
        throw new Error(`Failed to open document: ${step.filePath} (timeout or error)`);
      }

      const editor = await GracefulErrorHandler.withTimeout(
        () => Promise.resolve(vscode.window.showTextDocument(document)),
        5000, // 5 second timeout
        `show document ${step.filePath}`
      );

      if (!editor) {
        throw new Error(`Failed to show document in editor: ${step.filePath} (timeout or error)`);
      }

      // Validate and clamp line ranges to valid bounds (1-based to 0-based conversion)
      const totalLines = document.lineCount;
      const startLine = Math.max(0, Math.min(step.lineStart - 1, totalLines - 1));
      const endLine = Math.max(startLine, Math.min(step.lineEnd - 1, totalLines - 1));

      // Create selection range
      const startPos = new vscode.Position(startLine, 0);
      const endPos = new vscode.Position(endLine, document.lineAt(endLine).text.length);
      const range = new vscode.Range(startPos, endPos);

      // Set selection and reveal range
      editor.selection = new vscode.Selection(range.start, range.end);
      editor.revealRange(range, vscode.TextEditorRevealType.InCenter);

    } catch (error) {
      throw new Error(`Failed to execute step ${stepIndex + 1}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Gets the current walkthrough state
   */
  getCurrentState(): WalkthroughState | null {
    return this.currentState;
  }

  /**
   * Clears the current walkthrough state
   */
  clearState(): void {
    this.currentState = null;
  }

  /**
   * Gets a comprehensive summary of the current walkthrough
   * Returns empty defaults if no active walkthrough exists
   */
  getSummary(): SummaryData {
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

  /**
   * Performs comprehensive cleanup of walkthrough state and files
   * Removes plan file, clears state, and switches back to Default mode
   */
  async cleanup(options: { removePlan: boolean } = { removePlan: true }): Promise<void> {
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
        // Prefer generic agent mode service if available
        try {
          await agentModeService.switchToDefault();
        } catch {
          await onboardingModeService.switchToDefault();
        }
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

  /**
   * Validates the plan structure and content
   */
  private validatePlan(plan: OnboardingPlan): void {
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

  /**
   * Validates an individual step
   */
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

  /**
   * Validates and normalizes a file path to ensure it's workspace-relative and secure
   * @deprecated Use SecurityService.validateAndNormalizePath instead
   */
  private validateFilePath(filePath: string, workspaceRoot: string): void {
    // Delegate to SecurityService for consistent validation
    SecurityService.validateAndNormalizePath(filePath, workspaceRoot, false);
  }

  /**
   * Extracts unique file paths from plan steps
   */
  private extractFiles(plan: OnboardingPlan): string[] {
    const uniqueFiles = new Set<string>();
    plan.steps.forEach(step => {
      uniqueFiles.add(step.filePath);
    });
    return Array.from(uniqueFiles).sort();
  }

  /**
   * Extracts highlight data from plan steps
   */
  private extractHighlights(plan: OnboardingPlan): HighlightData[] {
    return plan.steps.map(step => ({
      filePath: step.filePath,
      lineStart: step.lineStart,
      lineEnd: step.lineEnd
    }));
  }

  /**
   * Generates bullet summary from step explanations
   * Maximum 10 items, single-line formatting, 100-character limit
   */
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
}