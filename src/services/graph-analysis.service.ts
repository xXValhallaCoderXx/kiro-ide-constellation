import * as vscode from 'vscode';
import { spawn } from 'node:child_process';
import * as path from 'node:path';
import * as fs from 'node:fs';

export class AnalysisService {
  private readonly output: vscode.OutputChannel;
  private readonly extensionPath?: string;
  private cachedGraphData: Array<{ group: 'nodes' | 'edges'; data: any }> | undefined;
  private cachedSymbolIndex: Record<string, { definedIn?: string; importedBy: string[] }> | undefined;

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
    const cachedDir = path.join(cwd, '.constellation', 'data');
    const cachedPath = path.join(cachedDir, 'graph-data.json');

    if (fs.existsSync(cachedPath)) {
      try {
        const raw = fs.readFileSync(cachedPath, 'utf-8');
        this.output.appendLine(`[Analysis] Using cached dependency-cruiser JSON at: ${cachedPath}`);
        this._processRawJson(raw, true);
        return raw;
      } catch (readErr) {
        this.output.appendLine(`[Analysis] Failed to read cached JSON at ${cachedPath}: ${String(readErr)}. Falling back to fresh scan...`);
      }
    }
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
      this.output.appendLine('[Analysis] Error: dependency-cruiser binary not found in extension package.');
      return '';
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
            this._processRawJson(stdout, false);
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

  getSymbolIndex(): Record<string, { definedIn?: string; importedBy: string[] }> | undefined {
    return this.cachedSymbolIndex;
  }

  private _processRawJson(rawJson: string, fromCache: boolean): void {
    try {
      const transformed = this.transformToCytoscapeFormat(rawJson);
      this.cachedGraphData = transformed;
      const suffix = fromCache ? ' (from cache)' : '';
      this.output.appendLine(`[Analysis] Transformed graph cached with ${transformed.length} elements${suffix}.`);
    } catch (e) {
      this.output.appendLine(`[Analysis] Failed to transform JSON: ${String(e)}`);
    }
    try {
      this.cachedSymbolIndex = this.buildSymbolIndex(rawJson);
      const symbolCount = Object.keys(this.cachedSymbolIndex ?? {}).length;
      const suffix = fromCache ? ' (from cache)' : '';
      this.output.appendLine(`[Analysis] Symbol index built with ${symbolCount} symbols${suffix}.`);
    } catch (e) {
      this.output.appendLine(`[Analysis] Failed to build symbol index: ${String(e)}`);
    }
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

  private buildSymbolIndex(raw: string): Record<string, { definedIn?: string; importedBy: string[] }> {
    let json: any;
    try {
      json = JSON.parse(raw);
    } catch (e) {
      throw new Error('Invalid JSON provided to symbol indexer');
    }

    const modules: Array<any> = Array.isArray(json?.modules) ? json.modules : [];
    const index: Record<string, { definedIn?: string; importedBy: string[] }> = {};

    const ensureEntry = (name: string) => {
      if (!index[name]) {
        index[name] = { importedBy: [] };
      }
      return index[name];
    };

    // Use symbol arrays present in the dependency-cruiser JSON
    for (const mod of modules) {
      const source: string | undefined = mod?.source;
      if (!source) {
        continue;
      }

      const exportedList: Array<any> = Array.isArray(mod?.exports)
        ? mod.exports
        : Array.isArray(mod?.exportedSymbols)
          ? mod.exportedSymbols
          : [];
      for (const ex of exportedList) {
        const name: string | undefined = typeof ex === 'string' ? ex : ex?.name ?? ex?.symbol;
        if (!name) {
          continue;
        }
        const entry = ensureEntry(name);
        if (!entry.definedIn) {
          entry.definedIn = source;
        }
      }

      const deps: Array<any> = Array.isArray(mod?.dependencies) ? mod.dependencies : [];
      for (const dep of deps) {
        const target: string | undefined = dep?.resolved;
        if (!target) {
          continue;
        }
        if (/(^|\/)node_modules(\/|$)/.test(target)) {
          continue;
        }

        const imported: Array<any> = Array.isArray((dep as any).importedSymbols)
          ? (dep as any).importedSymbols
          : Array.isArray((dep as any).imported)
            ? (dep as any).imported
            : Array.isArray((dep as any).symbols)
              ? (dep as any).symbols
              : [];

        for (const im of imported) {
          const name: string | undefined = typeof im === 'string' ? im : im?.name ?? im?.symbol;
          if (!name) {
            continue;
          }
          const entry = ensureEntry(name);
          if (!entry.importedBy.includes(source)) {
            entry.importedBy.push(source);
          }
        }
      }
    }
    // Fallback: if the JSON didn't contain symbol arrays, parse source files heuristically
    if (Object.keys(index).length === 0) {
      const wf = vscode.workspace.workspaceFolders;
      const cwd = wf && wf.length > 0 ? wf[0].uri.fsPath : process.cwd();

      const fileList: string[] = [];
      for (const mod of modules) {
        const src: string | undefined = mod?.source;
        if (src && !/(^|\/)node_modules(\/|$)/.test(src)) {
          const abs = path.isAbsolute(src) ? src : path.join(cwd, src);
          fileList.push(abs);
        }
      }

      const reExportNamed = /export\s*\{([^}]+)\}/g;
      const reExportDecl = /export\s+(?:async\s+)?(?:function|class)\s+([A-Za-z_$][\w$]*)/g;
      const reExportConst = /export\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g;
      const reExportDefaultNamed = /export\s+default\s+(?:async\s+)?(?:function|class)\s+([A-Za-z_$][\w$]*)/g;
      const reImportNamed = /import\s*\{([^}]+)\}\s*from\s+['"][^'\"]+['"]/g;
      const reImportDefault = /import\s+([A-Za-z_$][\w$]*)\s*(?:,\s*\{[^}]*\})?\s*from\s+['"][^'\"]+['"]/g;
      const reImportAll = /import\s+\*\s+as\s+([A-Za-z_$][\w$]*)\s+from\s+['"][^'\"]+['"]/g;

      // Pass 1: record exports
      for (const abs of fileList) {
        let content = '';
        try {
          content = fs.readFileSync(abs, 'utf-8');
        } catch {
          continue;
        }
        const relSource = path.relative(cwd, abs);

        const addExport = (name: string) => {
          const clean = name.trim();
          if (!clean) {
            return;
          }
          const entry = ensureEntry(clean);
          if (!entry.definedIn) {
            entry.definedIn = relSource;
          }
        };

        let m: RegExpExecArray | null;
        while ((m = reExportDecl.exec(content))) {
          addExport(m[1]);
        }
        while ((m = reExportConst.exec(content))) {
          addExport(m[1]);
        }
        while ((m = reExportDefaultNamed.exec(content))) {
          addExport(m[1]);
        }
        while ((m = reExportNamed.exec(content))) {
          const body = m[1];
          body.split(',').map((s) => s.trim()).forEach((seg) => {
            if (!seg) {
              return;
            }
            const parts = seg.split(/\s+as\s+/i).map((p) => p.trim());
            const exportedName = parts.length === 2 ? parts[1] : parts[0];
            addExport(exportedName);
          });
        }
      }

      // Pass 2: record imports
      for (const mod of modules) {
        const src: string | undefined = mod?.source;
        if (!src) {
          continue;
        }
        if (/(^|\/)node_modules(\/|$)/.test(src)) {
          continue;
        }
        const abs = path.isAbsolute(src) ? src : path.join(cwd, src);
        let content = '';
        try {
          content = fs.readFileSync(abs, 'utf-8');
        } catch {
          continue;
        }
        const sourceRel = src;

        const addImportedBy = (name: string) => {
          const clean = name.trim();
          if (!clean) {
            return;
          }
          const entry = ensureEntry(clean);
          if (!entry.importedBy.includes(sourceRel)) {
            entry.importedBy.push(sourceRel);
          }
        };

        let m: RegExpExecArray | null;
        while ((m = reImportNamed.exec(content))) {
          const list = m[1].split(',').map((s) => s.trim()).filter(Boolean);
          for (const seg of list) {
            const parts = seg.split(/\s+as\s+/i).map((p) => p.trim());
            const original = parts[0];
            const alias = parts.length === 2 ? parts[1] : parts[0];
            addImportedBy(original);
            addImportedBy(alias);
          }
        }
        while ((m = reImportDefault.exec(content))) {
          const local = m[1];
          addImportedBy('default');
          addImportedBy(local);
        }
        while ((m = reImportAll.exec(content))) {
        // Namespace imports ignored for symbol-level mapping
        }
      }
    }
    return index;
  }
}
