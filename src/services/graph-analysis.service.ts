import * as vscode from 'vscode';
import { spawn } from 'node:child_process';
import * as path from 'node:path';
import * as fs from 'node:fs';

export class AnalysisService {
  private readonly output: vscode.OutputChannel;
  private readonly extensionPath?: string;
  private cachedGraphData: Array<{ group: 'nodes' | 'edges'; data: any }> | undefined;

  constructor(outputChannel?: vscode.OutputChannel, extensionPath?: string) {
    this.output = outputChannel ?? vscode.window.createOutputChannel('Kiro Constellation');
    this.extensionPath = extensionPath;
  }

  async runScan(): Promise<string> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      const msg = 'No workspace folder open. Skipping dependency scan.';
      this.output.appendLine(`[Analysis] ${msg}`);
      return '';
    }

    const cwd = workspaceFolders[0].uri.fsPath;
    const bin = process.platform === 'win32' ? 'depcruise.cmd' : 'depcruise';

    let command = '';
    let argsPrefix: string[] = [];

    if (this.extensionPath) {
      const extBin = path.join(this.extensionPath, 'node_modules', '.bin', bin);
      if (fs.existsSync(extBin)) {
        command = extBin;
        this.output.appendLine('[Analysis] Using depcruise from extension node_modules/.bin');
      }
    }

    if (!command) {
      const wsBin = path.join(cwd, 'node_modules', '.bin', bin);
      if (fs.existsSync(wsBin)) {
        command = wsBin;
        this.output.appendLine('[Analysis] Using depcruise from workspace node_modules/.bin');
      }
    }

    if (!command) {
      try {
        const script = require.resolve('dependency-cruiser/bin/depcruise.js');
        command = process.execPath;
        argsPrefix = [script];
        this.output.appendLine('[Analysis] Using Node to run resolved depcruise.js');
      } catch {
        command = bin;
        this.output.appendLine('[Analysis] Falling back to depcruise on PATH');
      }
    }

    const srcPath = path.join(cwd, 'src');
    const target = fs.existsSync(srcPath) ? 'src' : '.';

    const possibleConfigs = [
      '.dependency-cruiser.js',
      '.dependency-cruiser.cjs',
      '.dependency-cruiser.mjs',
      '.dependency-cruiser.json'
    ];
    const hasConfig = possibleConfigs.some((f) => fs.existsSync(path.join(cwd, f)));

    const excludePattern = '(^|/|\\\\)node_modules($|/|\\\\)';
    const args = [...argsPrefix, '--output-type', 'json', '--exclude', excludePattern];
    if (!hasConfig) {
      args.push('--no-config');
    }
    args.push(target);

  this.output.appendLine('[Analysis] Starting dependency-cruiser scan...');
    this.output.appendLine(`[Analysis] CLI: ${command} | cwd: ${cwd} | target: ${target} | exclude: ${excludePattern}`);
  this.output.show(true);

    return new Promise<string>((resolve) => {
      try {
        const child = spawn(command, args, { cwd });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        child.on('error', (err: NodeJS.ErrnoException) => {
          if (err && err.code === 'ENOENT') {
            this.output.appendLine('[Analysis] Failed to spawn depcruise (ENOENT). Ensure dependency-cruiser is installed as a production dependency and available.');
            this.output.appendLine('[Analysis] Try running `npm install` in the extension root.');
          }
          this.output.appendLine(`[Analysis] Failed to spawn: ${String(err)}`);
        });

        child.on('close', (code) => {
          if (stderr.trim().length > 0) {
            this.output.appendLine(`[Analysis] stderr:`);
            this.output.appendLine(stderr);
          }

          if (code === 0) {
            try {
              const outDir = path.join(cwd, '.constellation', 'data');
              fs.mkdirSync(outDir, { recursive: true });
              const outPath = path.join(outDir, 'graph-data.json');
              fs.writeFileSync(outPath, stdout, 'utf-8');
              this.output.appendLine(`[Analysis] Scan completed successfully. JSON saved to: ${outPath}`);
            } catch (writeErr) {
              this.output.appendLine(`[Analysis] Failed to write JSON to disk: ${String(writeErr)}`);
            }
            try {
              const transformed = this.transformToCytoscapeFormat(stdout);
              this.cachedGraphData = transformed;
              this.output.appendLine(`[Analysis] Transformed graph cached with ${transformed.length} elements.`);
              this.output.appendLine(JSON.stringify(transformed));
            } catch (transformErr) {
              this.output.appendLine(`[Analysis] Failed to transform JSON: ${String(transformErr)}`);
            }
            this.output.appendLine('[Analysis] Raw JSON completed:');
            // this.output.appendLine(stdout);
            resolve(stdout);
          } else {
            this.output.appendLine(`[Analysis] Scan exited with code ${code ?? 'unknown'}.`);
            resolve(stdout);
          }
        });
      } catch (e) {
        this.output.appendLine(`[Analysis] Unexpected error: ${String(e)}`);
        resolve('');
      }
    });
  }

  getGraphData(): Array<{ group: 'nodes' | 'edges'; data: any }> | undefined {
    return this.cachedGraphData;
  }

  private transformToCytoscapeFormat(raw: string): Array<{ group: 'nodes' | 'edges'; data: any }> {
    let json: any;
    try {
      json = JSON.parse(raw);
    } catch (e) {
      throw new Error('Invalid JSON provided to transformer');
    }

    const modules: Array<any> = Array.isArray(json?.modules) ? json.modules : [];

    const nodeSet = new Set<string>();
    const elements: Array<{ group: 'nodes' | 'edges'; data: any }> = [];

    for (const mod of modules) {
      const source: string | undefined = mod?.source;
      if (!source) {
        continue;
      }
      if (!nodeSet.has(source)) {
        nodeSet.add(source);
        elements.push({ group: 'nodes', data: { id: source } });
      }

      const deps: Array<any> = Array.isArray(mod?.dependencies) ? mod.dependencies : [];
      for (const dep of deps) {
        const target: string | undefined = dep?.resolved;
        if (!target) {
          continue;
        }
        if (!nodeSet.has(target)) {
          nodeSet.add(target);
          elements.push({ group: 'nodes', data: { id: target } });
        }
        const edgeId = `edge-${source}->${target}`;
        elements.push({ group: 'edges', data: { id: edgeId, source, target } });
      }
    }

    return elements;
  }
}
