import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { getWorkspaceRoot } from "./workspace.service.js";
import { OPENSOURCE_AGENT_PERSONA } from "../personas/open-source.template.js";
import { backupSteering, ensureDefaultBaseline, restoreSteering, pruneBackups } from "./steering-backup.service.js";

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
  private readonly OSS_BASE = '.constellation/oss';
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
      // Determine current mode from filesystem to decide baseline/backup behavior
      const current = await this.getCurrentMode();

      // If leaving Default for the first time, capture user's original steering as the default baseline
      if (current === 'Default') {
        await ensureDefaultBaseline(workspaceRoot);
      }

      // Backup outgoing mode's docs into their own namespace before overwriting
      if (current === 'Onboarding') {
        await backupSteering({ workspaceRoot, namespace: 'onboarding' });
      } else if (current === 'OpenSource') {
        await backupSteering({ workspaceRoot, namespace: 'oss' });
      }

      // Restore target namespace if available; otherwise write initial persona
      if (mode === 'Onboarding') {
        const restored = await restoreSteering({ workspaceRoot, namespace: 'onboarding' });
        // Ensure persona exists even if a (possibly empty) backup was restored
        const personaPath = path.join(workspaceRoot, this.STEERING_DIR, this.ONBOARDING_PERSONA_FILE);
        if (!restored || !(await this.pathExists(personaPath))) {
          await this.writeOnboardingPersona();
        }
      } else if (mode === 'OpenSource') {
        const restored = await restoreSteering({ workspaceRoot, namespace: 'oss' });
        const personaPath = path.join(workspaceRoot, this.STEERING_DIR, this.OPEN_SOURCE_PERSONA_FILE);
        if (!restored || !(await this.pathExists(personaPath))) {
          await this.writeOpenSourcePersona();
        }
        await this.ensureOssWorkingDirs();
      }

      this.currentMode = mode;
      vscode.window.showInformationMessage(`Switched to ${mode} mode.`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      vscode.window.showErrorMessage(`Failed to switch mode: ${errorMessage}`);
      throw error;
    }
  }

  /** Convenience wrappers */
  public async switchToOnboarding(): Promise<void> { return this.switchTo('Onboarding'); }
  public async switchToOpenSource(): Promise<void> { return this.switchTo('OpenSource'); }

  /** Switch to Default mode by restoring user's original docs (default namespace) */
  public async switchToDefault(): Promise<void> {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
      throw new Error('No workspace folder open. Cannot switch to Default mode.');
    }

    try {
      // Persist outgoing mode's docs into its namespace, then restore default baseline
      if (this.currentMode === 'Onboarding') {
        await backupSteering({ workspaceRoot, namespace: 'onboarding' });
      } else if (this.currentMode === 'OpenSource') {
        await backupSteering({ workspaceRoot, namespace: 'oss' });
        await this.cleanOssEphemeral(workspaceRoot);
      }

      const restored = await restoreSteering({ workspaceRoot, namespace: 'default' });
      if (!restored) {
        // No baseline; ensure steering dir exists
        await fs.promises.mkdir(path.join(workspaceRoot, this.STEERING_DIR), { recursive: true });
      }

      // Prune backups per namespace (retain last 3)
      await pruneBackups({ workspaceRoot, namespace: 'onboarding', retain: 3 });
      await pruneBackups({ workspaceRoot, namespace: 'oss', retain: 3 });

      this.currentMode = 'Default';
      vscode.window.showInformationMessage('Switched to Default mode. Restored your original steering documents.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      try { await fs.promises.mkdir(path.join(workspaceRoot, this.STEERING_DIR), { recursive: true }); } catch {/* ignore */}
      this.currentMode = 'Default';
      vscode.window.showWarningMessage(`Switched to Default mode with limited restore: ${errorMessage}`);
    }
  }

  // Deprecated: inline backup moved to steering-backup.service

  // Deprecated: inline restore moved to steering-backup.service

  // Deprecated: inline restore moved to steering-backup.service

  // Deprecated: helpers moved to steering-backup.service

  // Deprecated: helpers moved to steering-backup.service

  // Deprecated: helpers moved to steering-backup.service

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

  private async pathExists(p: string): Promise<boolean> {
    try { await fs.promises.access(p, fs.constants.F_OK); return true; } catch { return false; }
  }

  private async ensureOssWorkingDirs(): Promise<void> {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) { return; }
    const base = path.join(workspaceRoot, '.constellation', 'oss');
    const dirs = [
      base,
      path.join(base, 'analysis'),
      path.join(base, 'issues'),
      path.join(base, 'plans'),
      path.join(base, 'prds'),
      path.join(base, 'tmp'),
      path.join(base, 'cache'),
    ];
    for (const d of dirs) { try { await fs.promises.mkdir(d, { recursive: true }); } catch {/* ignore */} }
  }

  private async cleanOssEphemeral(workspaceRoot: string): Promise<void> {
    const base = path.join(workspaceRoot, this.OSS_BASE);
    const ephemeral = [path.join(base, 'issues'), path.join(base, 'prds'), path.join(base, 'tmp'), path.join(base, 'cache')];
    for (const d of ephemeral) { try { await fs.promises.rm(d, { recursive: true, force: true }); } catch {/* ignore */} }
  }
}

export const agentModeService = AgentModeService.getInstance();

export async function getCurrentMode(): Promise<AgentMode> { return agentModeService.getCurrentMode(); }
export async function switchTo(mode: AgentMode): Promise<void> { return agentModeService.switchTo(mode); }
export async function switchToOnboarding(): Promise<void> { return agentModeService.switchToOnboarding(); }
export async function switchToOpenSource(): Promise<void> { return agentModeService.switchToOpenSource(); }
export async function switchToDefault(): Promise<void> { return agentModeService.switchToDefault(); }

