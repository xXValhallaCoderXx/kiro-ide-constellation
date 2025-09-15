import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { getWorkspaceRoot } from "./workspace.service.js";
import { OPENSOURCE_AGENT_PERSONA } from "../personas/open-source.template.js";

export type AgentMode = 'Default' | 'Onboarding' | 'OpenSource';

interface BackupMetadata {
  timestamp: string;
  originalPath: string;
  backupPath: string;
  fileCount: number;
  checksum?: string;
}

// Embedded onboarding persona template to preserve current onboarding behavior
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
].join('\n');

export class AgentModeService {
  private static instance: AgentModeService;
  private currentMode: AgentMode = 'Default';
  private readonly STEERING_DIR = '.kiro/steering';
  private readonly BACKUP_BASE_DIR = '.constellation/steering/backup';
  private readonly ONBOARDING_PERSONA_FILE = 'onboarding-guide.md';
  private readonly OPEN_SOURCE_PERSONA_FILE = 'open-source-contributor.md';

  private constructor() {}

  public static getInstance(): AgentModeService {
    if (!AgentModeService.instance) {
      AgentModeService.instance = new AgentModeService();
    }
    return AgentModeService.instance;
  }

  /** Get current agent mode by inspecting steering docs */
  public async getCurrentMode(): Promise<AgentMode> {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
      return this.currentMode;
    }

    const steeringDir = path.join(workspaceRoot, this.STEERING_DIR);
    const ossPath = path.join(steeringDir, this.OPEN_SOURCE_PERSONA_FILE);
    const onboardingPath = path.join(steeringDir, this.ONBOARDING_PERSONA_FILE);

    try {
      await fs.promises.access(ossPath, fs.constants.F_OK);
      this.currentMode = 'OpenSource';
      return this.currentMode;
    } catch {}

    try {
      await fs.promises.access(onboardingPath, fs.constants.F_OK);
      this.currentMode = 'Onboarding';
      return this.currentMode;
    } catch {}

    this.currentMode = 'Default';
    return this.currentMode;
  }

  /** Switch to a specific mode */
  public async switchTo(mode: AgentMode): Promise<void> {
    if (mode === 'Default') {
      await this.switchToDefault();
      return;
    }

    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
      throw new Error('No workspace folder open. Cannot switch mode.');
    }

    try {
      const backupPath = await this.backupSteeringDocs();

      const steeringDir = path.join(workspaceRoot, this.STEERING_DIR);
      await fs.promises.mkdir(steeringDir, { recursive: true });

      if (mode === 'Onboarding') {
        await this.writeOnboardingPersona();
      } else if (mode === 'OpenSource') {
        await this.writeOpenSourcePersona();
        await this.ensureOssWorkingDirs();
      }

      this.currentMode = mode;

      vscode.window.showInformationMessage(
        `Switched to ${mode} mode. Steering documents backed up to: ${path.relative(workspaceRoot, backupPath)}`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      vscode.window.showErrorMessage(`Failed to switch mode: ${errorMessage}`);
      throw error;
    }
  }

  /** Convenience wrappers */
  public async switchToOnboarding(): Promise<void> { return this.switchTo('Onboarding'); }
  public async switchToOpenSource(): Promise<void> { return this.switchTo('OpenSource'); }

  /** Switch to Default mode by restoring most recent backup */
  public async switchToDefault(): Promise<void> {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
      throw new Error('No workspace folder open. Cannot switch to Default mode.');
    }

    try {
      await this.restoreSteeringDocs();

      // Best-effort cleanup of all backups
      const backupBaseDir = path.join(workspaceRoot, this.BACKUP_BASE_DIR);
      try { await fs.promises.rm(backupBaseDir, { recursive: true, force: true }); } catch {/* ignore */}

      this.currentMode = 'Default';
      vscode.window.showInformationMessage('Switched to Default mode. Steering documents restored from backup.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      try { await fs.promises.mkdir(path.join(workspaceRoot, this.STEERING_DIR), { recursive: true }); } catch {/* ignore */}
      this.currentMode = 'Default';
      vscode.window.showWarningMessage(`Switched to Default mode with limited restore: ${errorMessage}`);
    }
  }

  /** Backup the entire .kiro/steering directory (timestamped) */
  public async backupSteeringDocs(): Promise<string> {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) { throw new Error('No workspace folder open. Cannot create backup.'); }

    const steeringDir = path.join(workspaceRoot, this.STEERING_DIR);
    const backupBaseDir = path.join(workspaceRoot, this.BACKUP_BASE_DIR);

    await fs.promises.mkdir(backupBaseDir, { recursive: true });

    try {
      await fs.promises.access(steeringDir, fs.constants.F_OK);
    } catch {
      const emptyTs = new Date().toISOString().replace(/[:.]/g, '-');
      const emptyBackupDir = path.join(backupBaseDir, emptyTs);
      await fs.promises.mkdir(emptyBackupDir, { recursive: true });
      return emptyBackupDir;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(backupBaseDir, timestamp);

    try {
      await fs.promises.rename(steeringDir, backupDir);
    } catch {
      await fs.promises.mkdir(backupDir, { recursive: true });
      await this.copyDirectoryRecursive(steeringDir, backupDir, []);
      await fs.promises.rm(steeringDir, { recursive: true, force: true });
    }

    try {
      const fileCount = await this.countFilesRecursive(backupDir);
      const metadata: BackupMetadata = { timestamp, originalPath: steeringDir, backupPath: backupDir, fileCount };
      const metadataPath = path.join(backupDir, '.backup-metadata.json');
      await fs.promises.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    } catch {/* ignore */}

    return backupDir;
  }

  /** Restore steering docs from most recent backup */
  public async restoreSteeringDocs(): Promise<void> {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) { throw new Error('No workspace folder open. Cannot restore backup.'); }

    const backupBaseDir = path.join(workspaceRoot, this.BACKUP_BASE_DIR);
    const steeringDir = path.join(workspaceRoot, this.STEERING_DIR);

    await this.restoreSteeringDocsWithFallback(steeringDir, backupBaseDir);
  }

  private async restoreSteeringDocsWithFallback(steeringDir: string, backupBaseDir: string): Promise<void> {
    const mostRecentBackup = await this.findMostRecentBackup(backupBaseDir);

    if (!mostRecentBackup) {
      try { await fs.promises.mkdir(steeringDir, { recursive: true }); } catch { /* ignore */ }
      return;
    }

    try {
      try {
        await fs.promises.access(steeringDir, fs.constants.F_OK);
      } catch {/* ignore */}
      await fs.promises.rm(steeringDir, { recursive: true, force: true });
      await this.copyDirectoryRecursive(mostRecentBackup, steeringDir, ['.backup-metadata.json', '.backups']);
    } catch {
      try { await fs.promises.mkdir(steeringDir, { recursive: true }); } catch { /* ignore */ }
    }
  }

  private async findMostRecentBackup(backupBaseDir: string): Promise<string | null> {
    try {
      const entries = await fs.promises.readdir(backupBaseDir, { withFileTypes: true });
      const backupDirs = entries.filter(e => e.isDirectory()).map(e => e.name).sort().reverse();
      return backupDirs.length > 0 ? path.join(backupBaseDir, backupDirs[0]) : null;
    } catch { return null; }
  }

  private async copyDirectoryRecursive(src: string, dest: string, excludeFiles: string[] = []): Promise<void> {
    await fs.promises.mkdir(dest, { recursive: true });
    const entries = await fs.promises.readdir(src, { withFileTypes: true });
    for (const entry of entries) {
      if (excludeFiles.includes(entry.name)) continue;
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        await this.copyDirectoryRecursive(srcPath, destPath, excludeFiles);
      } else {
        await fs.promises.copyFile(srcPath, destPath);
      }
    }
  }

  private async countFilesRecursive(dir: string): Promise<number> {
    let count = 0;
    const processDirectory = async (current: string) => {
      const entries = await fs.promises.readdir(current, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) { await processDirectory(path.join(current, entry.name)); }
        else { count++; }
      }
    };
    await processDirectory(dir);
    return count;
  }

  private async writeOnboardingPersona(): Promise<void> {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) { throw new Error('No workspace folder open.'); }

    const steeringDir = path.join(workspaceRoot, this.STEERING_DIR);
    const personaTargetPath = path.join(steeringDir, this.ONBOARDING_PERSONA_FILE);
    await fs.promises.mkdir(steeringDir, { recursive: true });
    await fs.promises.writeFile(personaTargetPath, ONBOARDING_PERSONA_TEMPLATE, 'utf8');
  }

  private async writeOpenSourcePersona(): Promise<void> {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) { throw new Error('No workspace folder open.'); }

    const steeringDir = path.join(workspaceRoot, this.STEERING_DIR);
    const personaTargetPath = path.join(steeringDir, this.OPEN_SOURCE_PERSONA_FILE);
    await fs.promises.mkdir(steeringDir, { recursive: true });
    await fs.promises.writeFile(personaTargetPath, OPENSOURCE_AGENT_PERSONA, 'utf8');
  }

  private async ensureOssWorkingDirs(): Promise<void> {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) { return; }
    const base = path.join(workspaceRoot, '.constellation', 'oss');
    const dirs = [base, path.join(base, 'analysis'), path.join(base, 'issues'), path.join(base, 'plans'), path.join(base, 'prds')];
    for (const d of dirs) { try { await fs.promises.mkdir(d, { recursive: true }); } catch {/* ignore */} }
  }
}

export const agentModeService = AgentModeService.getInstance();

export async function getCurrentMode(): Promise<AgentMode> { return agentModeService.getCurrentMode(); }
export async function switchTo(mode: AgentMode): Promise<void> { return agentModeService.switchTo(mode); }
export async function switchToOnboarding(): Promise<void> { return agentModeService.switchToOnboarding(); }
export async function switchToOpenSource(): Promise<void> { return agentModeService.switchToOpenSource(); }
export async function switchToDefault(): Promise<void> { return agentModeService.switchToDefault(); }

