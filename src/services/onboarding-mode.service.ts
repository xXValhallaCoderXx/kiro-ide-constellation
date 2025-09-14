import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { getWorkspaceRoot } from "./workspace.service.js";

export type OnboardingMode = 'Default' | 'Onboarding';

interface BackupMetadata {
  timestamp: string;
  originalPath: string;
  backupPath: string;
  fileCount: number;
  checksum?: string;
}

// Embedded onboarding persona template so it ships with the extension bundle
const ONBOARDING_PERSONA_TEMPLATE = [
  '# Onboarding Guide (Strict Persona)',
  '',
  'Purpose',
  '- Provide a concise, step-by-step onboarding walkthrough for this repository when the user requests a topic (e.g., authentication, data flow, UI rendering).',
  '- Operate strictly via chat, coordinating with the extension through onboarding tools to execute the plan (open files and highlight ranges).',
  '',
  'Operating assumptions',
  '- Onboarding mode is enabled in the extension’s Side Panel. If not, politely ask the user to enable it from the Constellation Side Panel (Mode: Onboarding).',
  '- Files are identified by workspace-relative paths. Line ranges are 1-based and inclusive; the extension will clamp if needed.',
  '- The IDE actions (open/highlight) are performed by the extension after tool calls; you never edit files.',
  '',
  'Available tools (constellation_onboarding.*)',
  '1) plan',
  '   - Purpose: Propose a walkthrough plan for the user’s request (no side effects).',
  '   - Input: { request: string }',
  '   - Output: { plan: OnboardingPlan }',
  '2) commitPlan',
  '   - Purpose: Persist a vetted plan and immediately execute Step 1 in the IDE.',
  '   - Input: { plan: OnboardingPlan }',
  '   - Output: { status: "started", stepCount: number, planPath: string }',
  '3) nextStep',
  '   - Purpose: Advance to the next step and execute it in the IDE (open + highlight).',
  '   - Input: {}',
  '   - Output: { status: "ok" | "complete", currentStepIndex?: number }',
  '',
  'OnboardingPlan schema (you must produce/validate this when proposing a plan)',
  '- version: number (use 1)',
  '- topic: string (short, e.g., "authentication")',
  '- createdAt: ISO timestamp',
  '- steps: Array<{ filePath: string; lineStart: number; lineEnd: number; explanation: string }>',
  '  - filePath: workspace-relative path (e.g., src/services/http-bridge.service.ts)',
  '  - lineStart/lineEnd: 1-based inclusive indices',
  '  - explanation: 1–4 short sentences, factual and grounded',
  '',
  'Conversation protocol (STRICT)',
  '1) Clarify topic',
  '   - Confirm the user’s topic in one line.',
  '   - Example: “Topic: authentication — I’ll draft a short walkthrough plan.”',
  '2) Draft plan (no side effects)',
  '   - Call plan with the user’s request text.',
  '   - Present the proposed plan succinctly:',
  '     - Show step count and list each step as: `filePath` (lineStart–lineEnd): brief rationale.',
  '   - Ask for explicit confirmation to proceed.',
  '3) Commit & execute Step 1',
  '   - On an explicit “yes/confirm/proceed”, call commitPlan with the exact plan you presented.',
  '   - Announce: “Executing Step 1 of N: `filePath` (lineStart–lineEnd)” and include a 1–3 sentence explanation.',
  '   - Instruct the user to look at the opened file section.',
  '   - Prompt: “Continue to Step 2?”',
  '4) Only advance on explicit user request',
  '   - Acceptable advance intents: “next”, “continue”, “proceed”, “go on”, “advance”.',
  '   - On advance, call nextStep and announce: “Executing Step K of N: `filePath` (lineStart–lineEnd)” with a short explanation.',
  '   - After the final step, announce completion and summarize in 2–4 bullets.',
  '5) Stop or revise on request',
  '   - If the user says “stop/cancel/end”, stop immediately, summarize progress, and offer to draft a new plan if needed.',
  '   - If the user changes scope, offer to draft a new plan (call plan again). Do not silently mutate the current plan.',
  '',
  'Response style',
  '- Be concise and action-oriented. Prefer bullets and short sentences.',
  '- Show all file paths as workspace-relative monospace: `path/to/file.ts`.',
  '- At each step, display “Step K of N”.',
  '- Do not speculate; ground explanations in file names, visible architecture, and plan intent.',
  '',
  'Safety & correctness',
  '- Never reveal or request secrets/tokens.',
  '- Never claim to edit files. You only coordinate plan execution via tools.',
  '- If a file/range fails to open, apologize, propose a corrected step, and offer to draft a revised plan.',
  '',
  'Examples (illustrative)',
  '- User: “Please explain how authentication works in this repo.”',
  '  - You: “Topic: authentication — proposing a short walkthrough.”',
  '  - You → tool: plan { request: "Please explain how authentication works in this repo." }',
  '  - You: “Proposed plan (2 steps):',
  '    1) `src/services/http-bridge.service.ts` (25–45): Loopback + bearer token auth.',
  '    2) `src/mcp.server.ts` (66–92): Authorization forwarding from MCP to bridge.',
  '    Proceed?”',
  '  - User: “Yes.”',
  '  - You → tool: commitPlan { plan: <the JSON you proposed> }',
  '  - You: “Executing Step 1 of 2: `src/services/http-bridge.service.ts` (25–45). This section restricts access to loopback and validates a bearer token. Continue to Step 2?”',
  '  - User: “next”',
  '  - You → tool: nextStep {}',
  '  - You: “Executing Step 2 of 2: `src/mcp.server.ts` (66–92). The MCP server forwards requests with Authorization and handles HTTP errors. Walkthrough complete.”',
  '',
  'End state',
  '- After completion or stop, summarize what was covered in 2–4 bullets and offer to draft a new plan for a follow-up topic.',
].join('\n');

export class OnboardingModeService {
  private static instance: OnboardingModeService;
  private currentMode: OnboardingMode = 'Default';
  private readonly STEERING_DIR = '.kiro/steering';
  private readonly BACKUP_BASE_DIR = '.constellation/steering/backup';
  private readonly ONBOARDING_PERSONA_FILE = 'onboarding-guide.md';

  private constructor() {}

  public static getInstance(): OnboardingModeService {
    if (!OnboardingModeService.instance) {
      OnboardingModeService.instance = new OnboardingModeService();
    }
    return OnboardingModeService.instance;
  }

  /**
   * Get the current onboarding mode
   */
  public async getCurrentMode(): Promise<OnboardingMode> {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
      return this.currentMode;
    }

    const steeringDir = path.join(workspaceRoot, this.STEERING_DIR);
    const onboardingPersonaPath = path.join(steeringDir, this.ONBOARDING_PERSONA_FILE);

    try {
      // Check if onboarding persona file exists to determine mode
      await fs.promises.access(onboardingPersonaPath, fs.constants.F_OK);
      this.currentMode = 'Onboarding';
    } catch {
      this.currentMode = 'Default';
    }

    return this.currentMode;
  }

  /**
   * Switch to Onboarding mode by backing up steering docs and writing persona file
   */
  public async switchToOnboarding(): Promise<void> {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
      throw new Error('No workspace folder open. Cannot switch to Onboarding mode.');
    }

    try {
      // Create backup of current steering documents
      const backupPath = await this.backupSteeringDocs();
      
      // Write the onboarding persona file
      await this.writeOnboardingPersona();
      
      this.currentMode = 'Onboarding';
      
      vscode.window.showInformationMessage(
        `Switched to Onboarding mode. Steering documents backed up to: ${path.relative(workspaceRoot, backupPath)}`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      vscode.window.showErrorMessage(`Failed to switch to Onboarding mode: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Switch to Default mode by restoring the most recent backup
   */
  public async switchToDefault(): Promise<void> {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
      throw new Error('No workspace folder open. Cannot switch to Default mode.');
    }

    try {
      // Restore the most recent backup
      await this.restoreSteeringDocs();
      
      this.currentMode = 'Default';
      
      vscode.window.showInformationMessage('Switched to Default mode. Steering documents restored from backup.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      vscode.window.showErrorMessage(`Failed to switch to Default mode: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Create a timestamped backup of the entire .kiro/steering directory
   * Returns the backup directory path
   */
  public async backupSteeringDocs(): Promise<string> {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
      throw new Error('No workspace folder open. Cannot create backup.');
    }

    const steeringDir = path.join(workspaceRoot, this.STEERING_DIR);
    const backupBaseDir = path.join(workspaceRoot, this.BACKUP_BASE_DIR);

    // Ensure backup base directory exists
    await fs.promises.mkdir(backupBaseDir, { recursive: true });

    // If steering directory doesn't exist, create an empty timestamped backup directory
    try {
      await fs.promises.access(steeringDir, fs.constants.F_OK);
    } catch {
      const emptyTs = new Date().toISOString().replace(/[:.]/g, '-');
      const emptyBackupDir = path.join(backupBaseDir, emptyTs);
      await fs.promises.mkdir(emptyBackupDir, { recursive: true });
      return emptyBackupDir;
    }

    // Move (rename) the entire steering directory to a timestamped backup directory
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(backupBaseDir, timestamp);

    // Make sure the parent of backupDir exists (already ensured for backupBaseDir)
    try {
      await fs.promises.rename(steeringDir, backupDir);
    } catch (err) {
      // Fallback to copy+delete if rename fails (e.g., cross-device)
      await fs.promises.mkdir(backupDir, { recursive: true });
      await this.copyDirectoryRecursive(steeringDir, backupDir, []);
      await fs.promises.rm(steeringDir, { recursive: true, force: true });
    }

    // Write backup metadata into the backup directory
    try {
      const fileCount = await this.countFilesRecursive(backupDir);
      const metadata: BackupMetadata = {
        timestamp,
        originalPath: steeringDir,
        backupPath: backupDir,
        fileCount
      };
      const metadataPath = path.join(backupDir, '.backup-metadata.json');
      await fs.promises.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    } catch {/* ignore metadata errors */}

    return backupDir;
  }

  /**
   * Restore steering documents from the most recent backup
   */
  public async restoreSteeringDocs(): Promise<void> {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
      throw new Error('No workspace folder open. Cannot restore backup.');
    }

    const backupBaseDir = path.join(workspaceRoot, this.BACKUP_BASE_DIR);
    const steeringDir = path.join(workspaceRoot, this.STEERING_DIR);
    
    // Find the most recent backup (backup directory is outside steeringDir to avoid self-deletion)
    const mostRecentBackup = await this.findMostRecentBackup(backupBaseDir);
    if (!mostRecentBackup) {
      throw new Error('No backup found to restore from.');
    }

    try {
      // Remove current steering directory if it exists
      try {
        await fs.promises.access(steeringDir, fs.constants.F_OK);
        await fs.promises.rm(steeringDir, { recursive: true, force: true });
      } catch {
        // Directory doesn't exist, which is fine
      }

      // Restore from backup (exclude metadata file and any nested backups)
      await this.copyDirectoryRecursive(mostRecentBackup, steeringDir, ['.backup-metadata.json', '.backups']);
      
    } catch (error) {
      throw new Error(`Failed to restore steering documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Write the onboarding persona file to the steering directory
   */
  private async writeOnboardingPersona(): Promise<void> {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
      throw new Error('No workspace folder open.');
    }

    const steeringDir = path.join(workspaceRoot, this.STEERING_DIR);
    const personaTargetPath = path.join(steeringDir, this.ONBOARDING_PERSONA_FILE);

    try {
      // Ensure steering directory exists
      await fs.promises.mkdir(steeringDir, { recursive: true });

      // Write embedded template to steering directory
      await fs.promises.writeFile(personaTargetPath, ONBOARDING_PERSONA_TEMPLATE, 'utf8');
    } catch (error) {
      throw new Error(`Failed to write onboarding persona: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if a backup should be created (idempotence check)
   */
  private async shouldCreateBackup(steeringDir: string, backupBaseDir: string): Promise<boolean> {
    try {
      const mostRecentBackup = await this.findMostRecentBackup(backupBaseDir);
      if (!mostRecentBackup) {
        return true; // No previous backup exists
      }

      // Compare content to see if anything has changed
      const hasChanges = await this.hasDirectoryChanged(steeringDir, mostRecentBackup);
      return hasChanges;
    } catch {
      return true; // If we can't determine, create a backup to be safe
    }
  }

  /**
   * Find the most recent backup directory
   */
  private async findMostRecentBackup(backupBaseDir: string): Promise<string | null> {
    try {
      const entries = await fs.promises.readdir(backupBaseDir, { withFileTypes: true });
      const backupDirs = entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name)
        .sort()
        .reverse(); // Most recent first (ISO timestamps sort correctly)

      return backupDirs.length > 0 ? path.join(backupBaseDir, backupDirs[0]) : null;
    } catch {
      return null;
    }
  }

  /**
   * Check if directory content has changed compared to backup
   */
  private async hasDirectoryChanged(currentDir: string, backupDir: string): Promise<boolean> {
    try {
      const currentFiles = await this.getDirectoryFileList(currentDir, []);
      const backupFiles = await this.getDirectoryFileList(backupDir, ['.backup-metadata.json']);
      
      // Quick check: different number of files
      if (currentFiles.length !== backupFiles.length) {
        return true;
      }

      // Check if file lists are different
      const currentSet = new Set(currentFiles);
      const backupSet = new Set(backupFiles);
      
      for (const file of currentFiles) {
        if (!backupSet.has(file)) {
          return true;
        }
      }

      // Check file contents for changes
      for (const relativePath of currentFiles) {
        const currentFilePath = path.join(currentDir, relativePath);
        const backupFilePath = path.join(backupDir, relativePath);
        
        try {
          const currentContent = await fs.promises.readFile(currentFilePath, 'utf8');
          const backupContent = await fs.promises.readFile(backupFilePath, 'utf8');
          
          if (currentContent !== backupContent) {
            return true;
          }
        } catch {
          return true; // If we can't read files, assume changed
        }
      }

      return false; // No changes detected
    } catch {
      return true; // If we can't determine, assume changed
    }
  }

  /**
   * Get a list of all files in a directory recursively
   */
  private async getDirectoryFileList(dir: string, excludeFiles: string[] = []): Promise<string[]> {
    const files: string[] = [];
    
    const processDirectory = async (currentDir: string, relativePath: string = '') => {
      const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const entryPath = path.join(relativePath, entry.name);
        
        if (excludeFiles.includes(entry.name)) {
          continue;
        }
        
        if (entry.isDirectory()) {
          await processDirectory(path.join(currentDir, entry.name), entryPath);
        } else {
          files.push(entryPath);
        }
      }
    };

    await processDirectory(dir);
    return files.sort();
  }

  /**
   * Recursively copy a directory
   */
  private async copyDirectoryRecursive(src: string, dest: string, excludeFiles: string[] = []): Promise<void> {
    await fs.promises.mkdir(dest, { recursive: true });
    
    const entries = await fs.promises.readdir(src, { withFileTypes: true });
    
    for (const entry of entries) {
      if (excludeFiles.includes(entry.name)) {
        continue;
      }
      
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        await this.copyDirectoryRecursive(srcPath, destPath, excludeFiles);
      } else {
        await fs.promises.copyFile(srcPath, destPath);
      }
    }
  }

  /**
   * Count files recursively in a directory
   */
  private async countFilesRecursive(dir: string): Promise<number> {
    let count = 0;
    
    const processDirectory = async (currentDir: string) => {
      const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          await processDirectory(path.join(currentDir, entry.name));
        } else {
          count++;
        }
      }
    };

    await processDirectory(dir);
    return count;
  }
}

// Export convenience functions for easier usage
export const onboardingModeService = OnboardingModeService.getInstance();

export async function getCurrentMode(): Promise<OnboardingMode> {
  return onboardingModeService.getCurrentMode();
}

export async function switchToOnboarding(): Promise<void> {
  return onboardingModeService.switchToOnboarding();
}

export async function switchToDefault(): Promise<void> {
  return onboardingModeService.switchToDefault();
}