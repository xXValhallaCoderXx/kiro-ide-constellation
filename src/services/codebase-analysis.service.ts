import * as fs from 'fs'
import * as path from 'path'
import { loadGraphData } from './graph-data.service.js'
import type * as vscode from 'vscode'

export interface ProjectAnalysis {
  version: number
  scannedAt: string
  detectedPatterns: string[]
  keyDirs: Array<{ path: string; role: string }>
  codingConventions: {
    naming: { files?: string; components?: string }
    tsconfig?: { strict?: boolean }
  }
  testStrategy?: { framework?: string }
  graphStats: { files: number; edges: number }
}

export class CodebaseAnalysisService {
  constructor(private readonly context: vscode.ExtensionContext) {}

  async analyze(workspaceRoot: string): Promise<ProjectAnalysis> {
    const graph = await loadGraphData(this.context)

    // Infer basic patterns
    const detectedPatterns: string[] = []
    if (fs.existsSync(path.join(workspaceRoot, 'package.json'))) detectedPatterns.push('node')
    if (fs.existsSync(path.join(workspaceRoot, 'webview-ui'))) detectedPatterns.push('vite+preact')
    if (fs.existsSync(path.join(workspaceRoot, 'src', 'providers'))) detectedPatterns.push('vscode-extension')

    // Key dirs heuristic
    const keyDirs: Array<{ path: string; role: string }> = []
    const addDir = (p: string, role: string) => { if (fs.existsSync(path.join(workspaceRoot, p))) keyDirs.push({ path: p, role }) }
    addDir('src/services', 'backend services')
    addDir('src/providers', 'webview/graph providers')
    addDir('webview-ui/src/components', 'preact components')

    // Coding conventions (very light heuristics)
    const codingConventions: ProjectAnalysis['codingConventions'] = { naming: {} }
    codingConventions.naming.files = 'kebab-case'
    codingConventions.naming.components = 'PascalCase'

    // tsconfig strict?
    try {
      const tsconfigPath = path.join(workspaceRoot, 'tsconfig.json')
      if (fs.existsSync(tsconfigPath)) {
        const cfg = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'))
        codingConventions.tsconfig = { strict: !!cfg?.compilerOptions?.strict }
      }
    } catch {}

    // Test framework guess
    const testStrategy: ProjectAnalysis['testStrategy'] = {}
    if (fs.existsSync(path.join(workspaceRoot, 'vitest.config.ts')) || fs.existsSync(path.join(workspaceRoot, 'vitest.config.js'))) {
      testStrategy.framework = 'vitest'
    }

    const analysis: ProjectAnalysis = {
      version: 1,
      scannedAt: new Date().toISOString(),
      detectedPatterns,
      keyDirs,
      codingConventions,
      testStrategy,
      graphStats: { files: graph.nodes.length, edges: graph.edges.length },
    }

    // Write to .constellation/oss/analysis/project-analysis.json
    const outDir = path.join(workspaceRoot, '.constellation', 'oss', 'analysis')
    await fs.promises.mkdir(outDir, { recursive: true })
    const outPath = path.join(outDir, 'project-analysis.json')
    await fs.promises.writeFile(outPath, JSON.stringify(analysis, null, 2), 'utf8')

    return analysis
  }
}

