import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { getWorkspaceRootOrThrow } from './workspace.service.js';

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

export class OnboardingWalkthroughService {
  private currentState: WalkthroughState | null = null;

  /**
   * Commits a plan by validating it, persisting to filesystem, and executing the first step
   */
  async commitPlan(plan: OnboardingPlan): Promise<CommitResult> {
    try {
      // Validate the plan
      this.validatePlan(plan);

      // Get workspace root
      const workspaceRoot = getWorkspaceRootOrThrow();

      // Validate all file paths in the plan
      for (const step of plan.steps) {
        this.validateFilePath(step.filePath, workspaceRoot);
      }

      // Create onboarding directory if it doesn't exist
      const onboardingDir = path.join(workspaceRoot, '.constellation', 'onboarding');
      if (!fs.existsSync(onboardingDir)) {
        fs.mkdirSync(onboardingDir, { recursive: true });
      }

      // Generate plan filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const planFilename = `plan-${timestamp}.json`;
      const planPath = path.join(onboardingDir, planFilename);

      // Persist plan to filesystem
      fs.writeFileSync(planPath, JSON.stringify(plan, null, 2), 'utf8');

      // Initialize walkthrough state
      this.currentState = {
        plan,
        currentStepIndex: 0,
        planPath,
        startedAt: new Date()
      };

      // Execute first step
      await this.executeStep(0);

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
    const workspaceRoot = getWorkspaceRootOrThrow();

    try {
      // Resolve absolute file path
      const absoluteFilePath = path.resolve(workspaceRoot, step.filePath);

      // Validate file exists
      if (!fs.existsSync(absoluteFilePath)) {
        throw new Error(`File not found: ${step.filePath}`);
      }

      // Open the file in VS Code
      const document = await vscode.workspace.openTextDocument(absoluteFilePath);
      const editor = await vscode.window.showTextDocument(document);

      // Clamp line ranges to valid bounds (1-based to 0-based conversion)
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
   */
  private validateFilePath(filePath: string, workspaceRoot: string): void {
    // Normalize the path to handle different separators
    const normalizedPath = path.normalize(filePath);

    // Check for directory traversal attempts
    if (normalizedPath.includes('..') || path.isAbsolute(normalizedPath)) {
      throw new Error(`Invalid file path: ${filePath}. Path must be workspace-relative and cannot contain directory traversal sequences.`);
    }

    // Resolve to absolute path for validation
    const absolutePath = path.resolve(workspaceRoot, normalizedPath);

    // Ensure the resolved path is within the workspace
    if (!absolutePath.startsWith(workspaceRoot)) {
      throw new Error(`File path ${filePath} is outside workspace boundaries`);
    }
  }
}