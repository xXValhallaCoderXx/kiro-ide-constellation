# Dependency Cruiser Implementation Plan

## Overview
This document outlines the implementation plan for integrating `dependency-cruiser` into the Kiro IDE Constellation VS Code extension. Dependency-cruiser will analyze and validate dependencies across our monorepo structure, ensuring clean architecture boundaries between packages. The implementation focuses on JSON output for programmatic analysis and proper workspace path handling for both debug and published scenarios.

## Project Architecture Context

The Kiro IDE Constellation is a monorepo with the following structure:
- **packages/extension**: VS Code extension host code (TypeScript, compiled with TSC)
- **packages/webview**: Preact/Vite-based webviews (Sidebar & Dashboard)
- **packages/shared**: Shared types and contracts between extension and webviews
- **packages/mcp-server**: MCP (Model Context Protocol) stdio server

The build system uses:
- **Turbo**: For orchestrating monorepo builds
- **pnpm**: Package manager with workspace support
- **Vite**: For webview bundling
- **esbuild**: For MCP server bundling
- **TSC**: For extension compilation

## Why Dependency-Cruiser?

Dependency-cruiser provides:
1. **Validation**: Enforce architectural rules (e.g., no circular dependencies)
2. **Analysis**: Detect unused dependencies and potential issues
3. **JSON Output**: Machine-readable dependency data for programmatic processing
4. **CI Integration**: Automated dependency validation in build pipelines

## Critical Path Handling Requirements

### Debug Mode Considerations
When running in debug mode:
- The extension runs from the source directory (`packages/extension/out`)
- The debug VS Code instance opens a **different workspace** (test project)
- Dependency analysis should target the **opened workspace**, not the extension source

### Published Extension Considerations
When running as a published VSIX:
- Extension files are in the VS Code extensions directory
- No access to original source structure
- Must analyze the **user's workspace** dependencies
- Embedded analysis data for the extension itself only

## Implementation Strategy

### Phase 1: Basic Integration (Development Mode)

#### 1.1 Install Dependencies
```bash
pnpm add -D dependency-cruiser
```

#### 1.2 Create Configuration File
Create `.dependency-cruiser.js` at the repository root:

```javascript
/** @type import('dependency-cruiser').IConfiguration */
module.exports = {
  extends: "dependency-cruiser/configs/recommended-strict",
  options: {
    doNotFollow: {
      path: "node_modules"
    },
    tsConfig: {
      fileName: [
        "tsconfig.json",
        "packages/*/tsconfig.json"
      ]
    },
    tsPreCompilationDeps: true,
    combinedDependencies: true,
    preserveSymlinks: false,
    includeOnly: "^packages/",
    exclude: {
      path: [
        "node_modules",
        "\\.turbo",
        "out",
        "dist",
        "\\.vite",
        "bundle-stats\\.html"
      ]
    },
    reporterOptions: {
      dot: {
        collapsePattern: "node_modules/[^/]+",
        filters: {
          includeOnly: {
            path: "^packages/"
          }
        }
      },
      archi: {
        collapsePattern: "^packages/([^/]+)/.*",
        filters: {
          includeOnly: {
            path: "^packages/"
          }
        }
      }
    },
    progress: {
      type: "performance-log"
    }
  },
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "Circular dependencies lead to maintenance issues and potential runtime errors",
      from: {},
      to: {
        circular: true
      }
    },
    {
      name: "no-orphans",
      severity: "warn",
      comment: "Orphan files indicate dead code or missing imports",
      from: {
        orphan: true,
        pathNot: [
          "\\.d\\.ts$",
          "(^|/)tsconfig\\.json$",
          "(^|/)\\.[^/]+\\.(js|cjs|mjs|ts|json)$"
        ]
      },
      to: {}
    },
    {
      name: "no-deprecated-npm",
      severity: "warn",
      comment: "Deprecated packages should be replaced",
      from: {},
      to: {
        dependencyTypes: ["deprecated"]
      }
    },
    {
      name: "webview-no-direct-extension-imports",
      severity: "error",
      comment: "Webview package should not directly import from extension package",
      from: {
        path: "^packages/webview/"
      },
      to: {
        path: "^packages/extension/",
        pathNot: "^packages/extension/out/"
      }
    },
    {
      name: "shared-is-leaf-package",
      severity: "warn",
      comment: "Shared package should not import from other workspace packages",
      from: {
        path: "^packages/shared/"
      },
      to: {
        path: "^packages/(extension|webview|mcp-server)/",
        pathNot: "node_modules"
      }
    },
    {
      name: "mcp-server-isolation",
      severity: "error",
      comment: "MCP server should be self-contained for bundling",
      from: {
        path: "^packages/mcp-server/"
      },
      to: {
        path: "^packages/(extension|webview)/",
        pathNot: "^packages/shared/"
      }
    }
  ],
  allowed: [
    {
      from: {
        path: "^packages/extension/"
      },
      to: {
        path: "^packages/shared/"
      }
    },
    {
      from: {
        path: "^packages/webview/"
      },
      to: {
        path: "^packages/shared/"
      }
    },
    {
      from: {
        path: "^packages/mcp-server/"
      },
      to: {
        path: "^packages/shared/"
      }
    }
  ]
};
```

#### 1.3 Add NPM Scripts
Add to root `package.json`:

```json
{
  "scripts": {
    "dep:validate": "dependency-cruiser packages --config .dependency-cruiser.js",
    "dep:graph": "dependency-cruiser packages --config .dependency-cruiser.js --output-type dot | dot -T svg > dependency-graph.svg",
    "dep:report": "dependency-cruiser packages --config .dependency-cruiser.js --output-type html > dependency-report.html",
    "dep:metrics": "dependency-cruiser packages --config .dependency-cruiser.js --output-type json | jq '.summary'"
  }
}
```

### Phase 2: Extension Integration with Workspace Path Handling

#### 2.1 Create Dependency Analyzer Service
Create `packages/extension/src/services/dependency-analyzer.service.ts`:

```typescript
import * as vscode from 'vscode';
import * as path from 'path';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';

interface DependencyCruiserResult {
  summary: {
    violations: Array<{
      type: string;
      rule: string;
      severity: 'error' | 'warn' | 'info';
      from: string;
      to: string;
      comment?: string;
    }>;
    error: number;
    warn: number;
    info: number;
    totalCruised: number;
    totalDependenciesCruised: number;
  };
  modules: Array<{
    source: string;
    dependencies: Array<{
      resolved: string;
      module: string;
      moduleSystem: string;
      dynamic: boolean;
      exoticallyRequired: boolean;
    }>;
  }>;
}

export class DependencyAnalyzerService {
  private outputChannel: vscode.OutputChannel;
  private context: vscode.ExtensionContext;
  private lastAnalysisResult: DependencyCruiserResult | null = null;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.outputChannel = vscode.window.createOutputChannel('Kiro: Dependency Analysis');
  }

  /**
   * Intelligently determines the workspace path to analyze
   * - If a workspace is open: analyze it
   * - If no workspace but in dev mode: analyze the extension source
   * - If no workspace in production: show appropriate message
   */
  private async getWorkspacePath(): Promise<{ path: string; isExtensionSource: boolean } | null> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    
    // Case 1: Workspace is open - always prioritize analyzing it
    if (workspaceFolders && workspaceFolders.length > 0) {
      return {
        path: workspaceFolders[0].uri.fsPath,
        isExtensionSource: false
      };
    }

    // Case 2: No workspace open, but in development mode
    // Analyze the extension source itself
    if (this.context.extensionMode === vscode.ExtensionMode.Development) {
      // Navigate from out directory to project root
      const extensionPath = this.context.extensionPath;
      const projectRoot = path.resolve(extensionPath, '..', '..');
      
      // Verify it's actually our extension project
      const packageJsonPath = path.join(projectRoot, 'package.json');
      try {
        await fs.access(packageJsonPath);
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
        if (packageJson.name === 'kiro-ide-constellation-workspace') {
          return {
            path: projectRoot,
            isExtensionSource: true
          };
        }
      } catch {
        // Not our extension project
      }
    }

    // Case 3: No workspace and not in dev mode, or couldn't find extension source
    return null;
  }

  /**
   * Check if dependency-cruiser config exists in workspace
   */
  private async hasWorkspaceConfig(workspacePath: string): Promise<boolean> {
    const configPaths = [
      '.dependency-cruiser.js',
      '.dependency-cruiser.json',
      '.dependency-cruiser.cjs',
      '.dependency-cruiser.mjs'
    ];

    for (const configFile of configPaths) {
      try {
        await fs.access(path.join(workspacePath, configFile));
        return true;
      } catch {
        continue;
      }
    }
    return false;
  }

  /**
   * Run dependency analysis and return JSON result
   */
  async analyzeDependencies(): Promise<DependencyCruiserResult | null> {
    const workspaceInfo = await this.getWorkspacePath();
    
    if (!workspaceInfo) {
      vscode.window.showWarningMessage(
        'No workspace folder open. Open a project to analyze its dependencies.'
      );
      return null;
    }

    const { path: workspacePath, isExtensionSource } = workspaceInfo;

    // Check for config, but be more lenient for extension source
    const hasConfig = await this.hasWorkspaceConfig(workspacePath);
    if (!hasConfig && !isExtensionSource) {
      vscode.window.showWarningMessage(
        'No dependency-cruiser configuration found. Create a .dependency-cruiser.js file in your project root.'
      );
      return null;
    }

    this.outputChannel.clear();
    this.outputChannel.appendLine(`🔍 Analyzing dependencies`);
    this.outputChannel.appendLine(`📁 Path: ${workspacePath}`);
    this.outputChannel.appendLine(`🎯 Target: ${isExtensionSource ? 'Extension Source (Dev)' : 'Workspace Project'}`);
    this.outputChannel.appendLine(`⚙️  Mode: ${this.context.extensionMode === vscode.ExtensionMode.Development ? 'Development' : 'Production'}`);
    this.outputChannel.appendLine('');

    return new Promise((resolve) => {
      // Determine the entry point - look for common patterns
      const possibleEntryPoints = isExtensionSource 
        ? ['packages', 'src', '.'] // For extension, prioritize packages
        : ['src', 'packages', 'lib', '.']; // For user projects, prioritize src
      let entryPoint = '.';
      
      for (const ep of possibleEntryPoints) {
        const fullPath = path.join(workspacePath, ep);
        if (fs.access(fullPath).then(() => true).catch(() => false)) {
          entryPoint = ep;
          break;
        }
      }

      const cruiser = spawn('npx', [
        'dependency-cruiser',
        entryPoint,
        '--output-type', 'json'
      ], {
        cwd: workspacePath,
        shell: true
      });

      let output = '';
      let errorOutput = '';

      cruiser.stdout.on('data', (data) => {
        output += data.toString();
      });

      cruiser.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      cruiser.on('close', (code) => {
        if (code === 0 || output) {
          try {
            const result: DependencyCruiserResult = JSON.parse(output);
            this.lastAnalysisResult = result;
            this.displayResults(result);
            resolve(result);
          } catch (err) {
            this.outputChannel.appendLine(`❌ Error parsing dependency-cruiser output: ${err}`);
            this.outputChannel.appendLine('Raw output:');
            this.outputChannel.appendLine(output);
            resolve(null);
          }
        } else {
          this.outputChannel.appendLine(`❌ Dependency analysis failed: ${errorOutput}`);
          resolve(null);
        }
      });

      cruiser.on('error', (err) => {
        this.outputChannel.appendLine(`❌ Error running dependency-cruiser: ${err.message}`);
        this.outputChannel.appendLine('Make sure dependency-cruiser is installed: pnpm add -D dependency-cruiser');
        resolve(null);
      });
    });
  }

  /**
   * Display analysis results in output channel
   */
  private displayResults(result: DependencyCruiserResult): void {
    this.outputChannel.show();
    
    this.outputChannel.appendLine('📊 Analysis Complete\n');
    this.outputChannel.appendLine(`Total modules analyzed: ${result.summary.totalCruised}`);
    this.outputChannel.appendLine(`Total dependencies: ${result.summary.totalDependenciesCruised}`);
    this.outputChannel.appendLine('');

    if (result.summary.violations.length > 0) {
      this.outputChannel.appendLine(`⚠️ Found ${result.summary.violations.length} violation(s):\n`);
      
      for (const violation of result.summary.violations) {
        const icon = violation.severity === 'error' ? '❌' : violation.severity === 'warn' ? '⚠️' : 'ℹ️';
        this.outputChannel.appendLine(`${icon} [${violation.severity.toUpperCase()}] ${violation.rule}`);
        this.outputChannel.appendLine(`   From: ${violation.from}`);
        this.outputChannel.appendLine(`   To: ${violation.to}`);
        if (violation.comment) {
          this.outputChannel.appendLine(`   ${violation.comment}`);
        }
        this.outputChannel.appendLine('');
      }
    } else {
      this.outputChannel.appendLine('✅ No dependency violations found!');
    }

    this.outputChannel.appendLine('\n💾 Full JSON result stored in memory (access via command)');
  }

  /**
   * Export the last analysis result as JSON
   */
  async exportAnalysisJson(): Promise<void> {
    if (!this.lastAnalysisResult) {
      vscode.window.showWarningMessage('No analysis results available. Run analysis first.');
      return;
    }

    const workspaceInfo = await this.getWorkspacePath();
    if (!workspaceInfo) {
      // Try to save to user's home directory as fallback
      const homePath = process.env.HOME || process.env.USERPROFILE;
      if (homePath) {
        const outputPath = path.join(homePath, 'dependency-analysis.json');
        const jsonContent = JSON.stringify(this.lastAnalysisResult, null, 2);
        await fs.writeFile(outputPath, jsonContent);
        
        const doc = await vscode.workspace.openTextDocument(outputPath);
        await vscode.window.showTextDocument(doc);
        
        vscode.window.showInformationMessage(`Analysis exported to: ${outputPath}`);
      } else {
        vscode.window.showErrorMessage('No workspace folder open and cannot determine home directory');
      }
      return;
    }

    const outputPath = path.join(workspaceInfo.path, 'dependency-analysis.json');
    const jsonContent = JSON.stringify(this.lastAnalysisResult, null, 2);
    
    await fs.writeFile(outputPath, jsonContent);
    
    const doc = await vscode.workspace.openTextDocument(outputPath);
    await vscode.window.showTextDocument(doc);
    
    vscode.window.showInformationMessage(`Analysis exported to: ${outputPath}`);
  }

  dispose(): void {
    this.outputChannel.dispose();
  }
}

#### 2.2 Register Commands in Extension
Update `packages/extension/src/extension.ts`:

```typescript
import { DependencyAnalyzerService } from './services/dependency-analyzer.service';

export function activate(context: vscode.ExtensionContext) {
  // ... existing code ...

  // Initialize dependency analyzer
  const depAnalyzer = new DependencyAnalyzerService(context);

  // Register commands - single smart command that works everywhere
  context.subscriptions.push(
    vscode.commands.registerCommand('kiro.analyzeDependencies', () => {
      depAnalyzer.analyzeDependencies();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('kiro.exportDependencyJson', () => {
      depAnalyzer.exportAnalysisJson();
    })
  );

  context.subscriptions.push(depAnalyzer);
}
```

#### 2.3 Add Commands to Package.json
Update `packages/extension/package.json`:

```json
{
  "contributes": {
    "commands": [
      {
        "command": "kiro.analyzeDependencies",
        "title": "Kiro: Analyze Dependencies",
        "category": "Kiro",
        "description": "Analyzes dependencies of the current workspace or extension source"
      },
      {
        "command": "kiro.exportDependencyJson",
        "title": "Kiro: Export Dependency Analysis (JSON)",
        "category": "Kiro",
        "description": "Exports the last dependency analysis as a JSON file"
      }
    ]
  }
}
```

### Phase 3: Packaging & Distribution

#### 3.1 Bundle Configuration
For the packaged extension to work properly, we need to ensure dependency-cruiser can run:

**Option A: Runtime Dependency (Recommended for Development Extensions)**
- Include dependency-cruiser as a runtime dependency
- Bundle the necessary files with the extension

**Option B: Embedded Analysis (Recommended for Production)**
- Pre-generate analysis reports during build
- Include static reports in the extension package
- Show cached results to users

#### 3.2 Embedded Analysis Implementation
Create `packages/extension/src/services/embedded-dependency-analyzer.service.ts`:

```typescript
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';

interface DependencyReport {
  timestamp: string;
  violations: Array<{
    rule: string;
    severity: 'error' | 'warn' | 'info';
    from: string;
    to: string;
    comment: string;
  }>;
  metrics: {
    totalModules: number;
    totalDependencies: number;
    violations: number;
  };
}

export class EmbeddedDependencyAnalyzerService {
  private outputChannel: vscode.OutputChannel;
  private context: vscode.ExtensionContext;
  private reportPath: string;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.outputChannel = vscode.window.createOutputChannel('Kiro: Dependency Analysis');
    this.reportPath = path.join(context.extensionPath, 'dependency-report.json');
  }

  /**
   * Show pre-generated dependency report
   */
  async showDependencyReport(): Promise<void> {
    try {
      const reportContent = await fs.readFile(this.reportPath, 'utf-8');
      const report: DependencyReport = JSON.parse(reportContent);

      this.outputChannel.clear();
      this.outputChannel.show();
      
      this.outputChannel.appendLine('📊 Dependency Analysis Report');
      this.outputChannel.appendLine(`Generated: ${report.timestamp}\n`);
      
      this.outputChannel.appendLine('📈 Metrics:');
      this.outputChannel.appendLine(`  Total Modules: ${report.metrics.totalModules}`);
      this.outputChannel.appendLine(`  Total Dependencies: ${report.metrics.totalDependencies}`);
      this.outputChannel.appendLine(`  Violations: ${report.metrics.violations}\n`);

      if (report.violations.length > 0) {
        this.outputChannel.appendLine('⚠️ Violations:');
        for (const violation of report.violations) {
          const icon = violation.severity === 'error' ? '❌' : '⚠️';
          this.outputChannel.appendLine(`\n${icon} ${violation.rule}`);
          this.outputChannel.appendLine(`  From: ${violation.from}`);
          this.outputChannel.appendLine(`  To: ${violation.to}`);
          this.outputChannel.appendLine(`  ${violation.comment}`);
        }
      } else {
        this.outputChannel.appendLine('✅ No violations found!');
      }
    } catch (error) {
      this.outputChannel.appendLine('❌ No dependency report available.');
      this.outputChannel.appendLine('Run "pnpm dep:validate" in development to generate a report.');
    }
  }

  /**
   * Open pre-generated dependency graph
   */
  async openDependencyGraph(): Promise<void> {
    const graphPath = path.join(this.context.extensionPath, 'dependency-graph.svg');
    
    try {
      await fs.access(graphPath);
      const graphUri = vscode.Uri.file(graphPath);
      await vscode.commands.executeCommand('vscode.open', graphUri);
    } catch {
      vscode.window.showWarningMessage(
        'Dependency graph not available. Run "pnpm dep:graph" in development to generate.'
      );
    }
  }

  dispose(): void {
    this.outputChannel.dispose();
  }
}
```

#### 3.3 Build Script Integration
Create `scripts/generate-dep-report.js`:

```javascript
const { cruise } = require('dependency-cruiser');
const fs = require('fs/promises');
const path = require('path');

async function generateReport() {
  const config = require('../.dependency-cruiser.js');
  
  console.log('Generating dependency report...');
  
  const cruiseResult = await cruise(
    ['packages'],
    config,
    { outputType: 'json' }
  );

  const result = JSON.parse(cruiseResult.output);
  
  const report = {
    timestamp: new Date().toISOString(),
    violations: result.summary.violations.map(v => ({
      rule: v.rule,
      severity: v.severity,
      from: v.from,
      to: v.to,
      comment: v.comment || ''
    })),
    metrics: {
      totalModules: result.summary.totalCruised,
      totalDependencies: result.summary.totalDependenciesCruised,
      violations: result.summary.violations.length
    }
  };

  const reportPath = path.join(__dirname, '../packages/extension/dependency-report.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`Report saved to ${reportPath}`);
  console.log(`Found ${report.metrics.violations} violations`);
}

generateReport().catch(console.error);
```

Update `scripts/prepare-vsix.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "Preparing VSIX package..."

# Build all packages
pnpm build

# Generate dependency report for embedding
node scripts/generate-dep-report.js

# Generate dependency graph if Graphviz is available
if command -v dot &> /dev/null; then
  npx dependency-cruiser packages --config .dependency-cruiser.js --output-type dot | \
    dot -T svg > packages/extension/dependency-graph.svg
  echo "Dependency graph generated"
else
  echo "Graphviz not found, skipping graph generation"
fi

echo "VSIX preparation complete"
```

### Phase 4: CI/CD Integration

#### 4.1 GitHub Actions Workflow
Add `.github/workflows/dependency-check.yml`:

```yaml
name: Dependency Analysis

on:
  pull_request:
    paths:
      - 'packages/**'
      - 'package.json'
      - 'pnpm-lock.yaml'
      - '.dependency-cruiser.js'
  push:
    branches: [main]

jobs:
  analyze:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Build packages
        run: pnpm build
      
      - name: Validate dependencies
        run: pnpm dep:validate
      
      - name: Generate dependency report
        if: always()
        run: |
          pnpm dep:report
          pnpm dep:metrics > metrics.json
      
      - name: Upload dependency report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: dependency-analysis
          path: |
            dependency-report.html
            dependency-graph.svg
            metrics.json
      
      - name: Comment PR with metrics
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const metrics = JSON.parse(fs.readFileSync('metrics.json', 'utf8'));
            
            const comment = `## 📊 Dependency Analysis
            
            - **Total Modules:** ${metrics.totalCruised}
            - **Total Dependencies:** ${metrics.totalDependenciesCruised}
            - **Violations:** ${metrics.violations.length}
            
            ${metrics.violations.length > 0 ? '⚠️ Please review and fix dependency violations.' : '✅ No dependency violations found!'}
            `;
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
```

### Phase 5: Advanced Features

#### 5.1 Real-time Dependency Tracking
For development mode, implement a file watcher that tracks dependency changes:

```typescript
export class DependencyWatcher {
  private watcher: vscode.FileSystemWatcher;
  private debounceTimer: NodeJS.Timeout | null = null;
  
  constructor(private analyzer: DependencyAnalyzerService) {
    this.watcher = vscode.workspace.createFileSystemWatcher(
      '**/packages/**/*.{ts,tsx,js,jsx}',
      false, // create
      false, // change
      false  // delete
    );
    
    this.watcher.onDidChange(this.handleFileChange.bind(this));
    this.watcher.onDidCreate(this.handleFileChange.bind(this));
    this.watcher.onDidDelete(this.handleFileChange.bind(this));
  }
  
  private handleFileChange(uri: vscode.Uri): void {
    // Debounce analysis to avoid excessive runs
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = setTimeout(() => {
      this.analyzer.validateDependencies();
    }, 5000);
  }
  
  dispose(): void {
    this.watcher.dispose();
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }
}
```

#### 5.2 JSON Data Processing
For processing and working with the JSON output programmatically:

```typescript
export interface DependencyMetrics {
  circularDependencies: number;
  orphanedModules: number;
  totalViolations: number;
  modulesPerPackage: Record<string, number>;
  crossPackageDependencies: number;
}

export class DependencyMetricsProcessor {
  static calculateMetrics(result: DependencyCruiserResult): DependencyMetrics {
    const metrics: DependencyMetrics = {
      circularDependencies: 0,
      orphanedModules: 0,
      totalViolations: result.summary.violations.length,
      modulesPerPackage: {},
      crossPackageDependencies: 0
    };

    // Count violations by type
    for (const violation of result.summary.violations) {
      if (violation.rule === 'no-circular') {
        metrics.circularDependencies++;
      } else if (violation.rule === 'no-orphans') {
        metrics.orphanedModules++;
      }
    }

    // Count modules per package
    for (const module of result.modules) {
      const packageMatch = module.source.match(/^packages\/([^/]+)/);
      if (packageMatch) {
        const packageName = packageMatch[1];
        metrics.modulesPerPackage[packageName] = 
          (metrics.modulesPerPackage[packageName] || 0) + 1;
      }

      // Count cross-package dependencies
      for (const dep of module.dependencies) {
        const fromPackage = module.source.match(/^packages\/([^/]+)/)?.[1];
        const toPackage = dep.resolved.match(/^packages\/([^/]+)/)?.[1];
        if (fromPackage && toPackage && fromPackage !== toPackage) {
          metrics.crossPackageDependencies++;
        }
      }
    }

    return metrics;
  }

  static exportToCSV(result: DependencyCruiserResult): string {
    const lines = ['From,To,Type,Severity'];
    
    for (const violation of result.summary.violations) {
      lines.push(
        `"${violation.from}","${violation.to}","${violation.rule}","${violation.severity}"`
      );
    }
    
    return lines.join('\n');
  }
}
```

## Configuration Customization

### Custom Rules for Kiro IDE
Add project-specific rules to `.dependency-cruiser.js`:

```javascript
{
  forbidden: [
    // Prevent test files from being imported in production code
    {
      name: "no-test-in-production",
      severity: "error",
      from: {
        pathNot: "\\.(test|spec)\\.(ts|tsx|js|jsx)$"
      },
      to: {
        path: "\\.(test|spec)\\.(ts|tsx|js|jsx)$"
      }
    },
    
    // Ensure UI providers don't directly access VS Code APIs
    {
      name: "ui-provider-abstraction",
      severity: "warn",
      from: {
        path: "^packages/extension/src/ui-providers/"
      },
      to: {
        path: "^vscode$"
      }
    }
  ]
}
```

## Development Workflow

### For Developers

1. **During Development:**
   ```bash
   # Run validation
   pnpm dep:validate
   
   # Generate visual graph
   pnpm dep:graph
   open dependency-graph.svg
   
   # Generate HTML report
   pnpm dep:report
   open dependency-report.html
   ```

2. **In VS Code:**
   - Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
   - Run "Kiro: Analyze Dependencies" - Intelligently analyzes:
     - If workspace is open: analyzes the workspace
     - If no workspace in dev mode: analyzes the extension source itself
   - Run "Kiro: Export Dependency Analysis (JSON)" - Exports last analysis as JSON file

3. **Automatic Validation:**
   - In development mode, dependencies are validated on extension activation
   - File saves trigger re-validation (with debouncing)

### For CI/CD

1. **Pull Requests:**
   - Automatic validation on PR
   - Comment with metrics
   - Fail if error-level violations exist

2. **Main Branch:**
   - Generate and store analysis artifacts
   - Track metrics over time

## Performance Considerations

### Optimization Strategies

1. **Incremental Analysis:**
   - Only analyze changed files
   - Cache analysis results
   - Use file watchers efficiently

2. **Bundling Considerations:**
   - Pre-generate reports for production
   - Minimize runtime overhead
   - Consider lazy-loading analysis features

3. **Large Codebases:**
   - Use `includeOnly` patterns
   - Exclude generated files
   - Implement progress reporting

## Troubleshooting

### Common Issues

1. **"dependency-cruiser: command not found"**
   - Run `pnpm install` at repository root
   - Ensure you're using pnpm, not npm

2. **"Graphviz not installed"**
   - Install Graphviz: `apt-get install graphviz` (Linux) or `brew install graphviz` (Mac)
   - Alternatively, use online DOT viewers

3. **Performance issues**
   - Adjust `includeOnly` patterns
   - Increase debounce timeout
   - Disable file watching in large projects

4. **TypeScript resolution errors**
   - Ensure `tsconfig.json` paths are correct
   - Build the project first: `pnpm build`

## Future Enhancements

### Roadmap

1. **Phase 1 (Current):** Basic integration with manual commands
2. **Phase 2:** Real-time validation and webview integration
3. **Phase 3:** CI/CD automation and metrics tracking
4. **Phase 4:** Advanced features
   - Dependency impact analysis
   - Refactoring suggestions
   - Architecture conformance checking
   - Integration with code review tools

### Potential Features

- **Dependency Health Score:** Calculate overall project health
- **Trend Analysis:** Track dependency metrics over time
- **Auto-fix Suggestions:** Propose fixes for common violations
- **Custom Visualizations:** D3.js-based interactive graphs
- **IDE Integration:** QuickFix actions for violations
- **Export Formats:** Generate reports in various formats (PDF, Markdown, etc.)

## Resources

- [Dependency Cruiser Documentation](https://github.com/sverweij/dependency-cruiser)
- [Dependency Cruiser Rules Reference](https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md)
- [VS Code Extension API](https://code.visualstudio.com/api)
- [Graphviz Documentation](https://graphviz.org/documentation/)

## License

This implementation follows the same license as the Kiro IDE Constellation project (MIT).
