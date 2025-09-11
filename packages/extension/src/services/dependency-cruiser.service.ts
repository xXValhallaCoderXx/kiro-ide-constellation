import * as vscode from 'vscode';
import * as path from 'path';
import { spawn, type ChildProcess } from 'child_process';
import * as fs from 'fs/promises';
import { CONSTELLATION_DIR, CONSTELLATION_DATA_DIR } from '../shared/runtime';

// Minimal subset of dependency-cruiser JSON we'll read for the POC
interface DepCruiserSummaryViolation {
  rule: string;
  severity: 'error' | 'warn' | 'info' | string;
  from: string;
  to: string;
  comment?: string;
}

interface DepCruiserSummary {
  violations: DepCruiserSummaryViolation[];
  totalCruised?: number;
  totalDependenciesCruised?: number;
}

interface DepCruiserOutput {
  summary: DepCruiserSummary;
  modules?: Array<{
    source: string;
    dependencies?: Array<{
      resolved: string;
    }>;
  }>;
}

export class DependencyCruiserService {
  private readonly output: vscode.OutputChannel;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.output = vscode.window.createOutputChannel('Kiro: Dependency Analysis');
  }

  dispose() {
    this.output.dispose();
  }

  private async resolveTargetDir(): Promise<{ dir: string; label: string } | null> {
    const wf = vscode.workspace.workspaceFolders;
    if (wf && wf.length > 0) {
      return { dir: wf[0].uri.fsPath, label: 'Workspace' };
    }
    if (this.context.extensionMode === vscode.ExtensionMode.Development) {
      // In dev, allow scanning the repo root (two levels up from extension package)
      const repoRoot = path.resolve(this.context.extensionPath, '..', '..');
      try {
        await fs.access(path.join(repoRoot, 'package.json'));
        return { dir: repoRoot, label: 'Extension Repo (Dev)' };
      } catch {
        // ignore
      }
    }
    return null;
  }

  private async chooseEntryArg(targetDir: string, label: string): Promise<string> {
    // Prefer narrower scopes to keep the POC fast and predictable
    // 1) Dev repo or monorepo workspaces → "packages"
    try {
      const hasPackagesDir = await fs.access(path.join(targetDir, 'packages')).then(() => true).catch(() => false);
      const hasWorkspaceYml = await fs.access(path.join(targetDir, 'pnpm-workspace.yaml')).then(() => true).catch(() => false);
      if (label.includes('Extension Repo') || hasWorkspaceYml || hasPackagesDir) {
        if (hasPackagesDir) return 'packages';
      }
    } catch {}

    // 2) Standard app layout → prefer ./src
    try {
      await fs.access(path.join(targetDir, 'src'));
      return 'src';
    } catch {
      // 3) Otherwise scan from cwd
      return '.';
    }
  }

  private async findConfig(targetDir: string): Promise<string | null> {
    const candidates = [
      '.dependency-cruiser.js',
      '.dependency-cruiser.cjs',
      '.dependency-cruiser.mjs',
      '.dependency-cruiser.json'
    ];
    for (const name of candidates) {
      try {
        await fs.access(path.join(targetDir, name));
        return name; // return relative path (cwd will be targetDir)
      } catch {
        // continue
      }
    }
    return null;
  }

  async analyze(): Promise<void> {
    const target = await this.resolveTargetDir();
    if (!target) {
      void vscode.window.showWarningMessage('Open a workspace to analyze dependencies.');
      return;
    }

    const entry = await this.chooseEntryArg(target.dir, target.label);
    const config = await this.findConfig(target.dir);

    // Build args with sensible defaults for large workspaces
    const args = ['-y', 'dependency-cruiser@^16', entry, '--output-type', 'json'];
    if (config) {
      args.push('--config', config);
    } else {
      args.push('--no-config');
    }

    // Exclude heavy/irrelevant folders by default (regex)
    const excludeRe = 'node_modules|(^|/)out/|(^|/)dist/|\\.turbo|\\.git|\\.vite|\\.vscode|\\.tsbuildinfo$|\\.vsix|(^|/)coverage/|(^|/)\\.constellation/';
    args.push('--exclude', excludeRe);

    // Include-only when we can narrow scope further
    if (entry === 'packages') {
      args.push('--include-only', '^packages/');
    } else if (entry === 'src') {
      args.push('--include-only', '^src/');
    }

    this.output.clear();
    this.output.show(true);
    this.output.appendLine('Kiro: Dependency Cruiser (POC)');
    this.output.appendLine(`Target: ${target.label} — ${target.dir}`);
    this.output.appendLine(`Config: ${config ? config : '(none, using --no-config)'}`);
    this.output.appendLine(`Running: npx ${args.join(' ')}`);
    this.output.appendLine('');

    // Run with cancellation and timeout so the UI can't get stuck
    const result = await vscode.window.withProgress<DepCruiserOutput | null>({
      location: vscode.ProgressLocation.Notification,
      title: 'Kiro: Scanning dependencies',
      cancellable: true,
    }, async (_progress, token) => {
      return await this.runCruiser(target.dir, args, token, 60000);
    });

    if (!result) {
      return;
    }

    const summary = result.summary || { violations: [] };
    const totalModules = summary.totalCruised ?? result.modules?.length ?? 0;
    const totalDeps = summary.totalDependenciesCruised ?? 0;

    this.output.appendLine('Analysis complete');
    this.output.appendLine(`Modules: ${totalModules}`);
    this.output.appendLine(`Dependencies: ${totalDeps}`);
    this.output.appendLine(`Violations: ${summary.violations.length}`);

    // Write JSON into .constellation/data for the analyzed project
    const outDir = path.join(target.dir, CONSTELLATION_DIR, CONSTELLATION_DATA_DIR);
    const outPath = path.join(outDir, 'dependency-analysis.json');
    try {
      await fs.mkdir(outDir, { recursive: true });
      await fs.writeFile(outPath, JSON.stringify(result, null, 2), 'utf-8');
      this.output.appendLine('');
      this.output.appendLine(`Saved JSON → ${outPath}`);
      const doc = await vscode.workspace.openTextDocument(outPath);
      await vscode.window.showTextDocument(doc, { preview: false });
    } catch (e) {
      this.output.appendLine('');
      this.output.appendLine(`Failed to write JSON: ${String(e)}`);
    }
  }

  private runCruiser(cwd: string, npxArgs: string[], token: vscode.CancellationToken, timeoutMs = 60000): Promise<DepCruiserOutput | null> {
    return new Promise((resolve) => {
      const child = spawn('npx', npxArgs, {
        cwd,
        shell: false, // allow regex args with '|'
        env: process.env,
      });

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const timeout = setTimeout(() => {
        timedOut = true;
        this.output.appendLine(`Timed out after ${Math.round(timeoutMs / 1000)}s. Terminating process...`);
        try { child.kill('SIGTERM'); } catch {}
        setTimeout(() => { try { child.kill('SIGKILL'); } catch {} }, 3000);
      }, timeoutMs);

      token.onCancellationRequested(() => {
        this.output.appendLine('Scan cancelled by user. Terminating process...');
        try { child.kill('SIGTERM'); } catch {}
      });

      child.stdout.on('data', (d) => (stdout += d.toString()))
        .on('error', () => {});
      child.stderr.on('data', (d) => (stderr += d.toString()))
        .on('error', () => {});

      child.on('error', (err) => {
        clearTimeout(timeout);
        this.output.appendLine(`Error starting dependency-cruiser: ${err.message}`);
        this.output.appendLine('Ensure you have network access for npx, or preinstall dependency-cruiser in your project.');
        resolve(null);
      });

      child.on('close', (code) => {
        clearTimeout(timeout);
        if (!stdout && (code !== 0 || timedOut)) {
          if (timedOut) {
            this.output.appendLine('dependency-cruiser terminated due to timeout.');
          } else {
            this.output.appendLine('dependency-cruiser failed:');
            this.output.appendLine(stderr || `(exit code ${code})`);
          }
          resolve(null);
          return;
        }
        try {
          const json = JSON.parse(stdout) as DepCruiserOutput;
          resolve(json);
        } catch (e) {
          this.output.appendLine('Failed to parse dependency-cruiser JSON output. Raw output follows:');
          this.output.appendLine(stdout);
          resolve(null);
        }
      });
    });
  }
}

