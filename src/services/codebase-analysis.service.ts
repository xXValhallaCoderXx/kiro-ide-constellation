import * as fs from 'fs'
import * as path from 'path'
import { loadGraphData } from './graph-data.service.js'
import type * as vscode from 'vscode'

export interface ProjectAnalysis {
  version: number
  scannedAt: string
  detectedPatterns: string[]
  keyDirs: Array<{ path: string; role: string; count?: number }>
  codingConventions: {
    naming: { files?: string; components?: string }
    tsconfig?: { strict?: boolean }
  }
  testStrategy?: { framework?: string }
  graphStats: { files: number; edges: number }
}

export class CodebaseAnalysisService {
  constructor(private readonly context: vscode.ExtensionContext) {}

  private detectFromPackageJson(workspaceRoot: string, detectedPatterns: string[], testStrategy: NonNullable<ProjectAnalysis['testStrategy']>) {
    try {
      const pkgPath = path.join(workspaceRoot, 'package.json')
      if (!fs.existsSync(pkgPath)) return
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
      const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) }
      const has = (name: string) => !!deps[name]

      if (has('typescript')) detectedPatterns.push('typescript')
      if (has('react')) detectedPatterns.push('react')
      if (has('preact')) detectedPatterns.push('preact')
      if (has('vue')) detectedPatterns.push('vue')
      if (has('svelte')) detectedPatterns.push('svelte')
      if (has('vite')) detectedPatterns.push('vite')
      if (has('webpack')) detectedPatterns.push('webpack')
      if (has('rollup')) detectedPatterns.push('rollup')
      if (has('next')) detectedPatterns.push('nextjs')
      if (has('express')) detectedPatterns.push('express')
      if (has('@nestjs/core')) detectedPatterns.push('nestjs')

      if (has('vitest')) testStrategy.framework = 'vitest'
      else if (has('jest')) testStrategy.framework = 'jest'
      else if (has('mocha')) testStrategy.framework = 'mocha'
    } catch {}
  }

  private summarizeKeyDirsFromGraph(workspaceRoot: string, nodeIds: string[]): Array<{ path: string; role: string; count: number }> {
    const tally = new Map<string, number>()
    for (const id of nodeIds) {
      const segs = id.split('/')
      if (segs.length === 0) continue
      // use top-2 segments when possible for better specificity
      const dir = segs.length > 1 ? `${segs[0]}/${segs[1]}` : segs[0]
      tally.set(dir, (tally.get(dir) || 0) + 1)
    }
    // rank by count desc
    const ranked = Array.from(tally.entries()).sort((a,b)=>b[1]-a[1]).slice(0,8)

    const roleFor = (p: string): string => {
      const lower = p.toLowerCase()
      if (lower.includes('component')) return 'ui components'
      if (lower.includes('service')) return 'services'
      if (lower.includes('provider')) return 'providers'
      if (lower.includes('lib')) return 'library'
      if (lower.includes('test') || lower.includes('spec')) return 'tests'
      if (lower.includes('api') || lower.includes('server')) return 'api/server'
      if (lower.startsWith('src')) return 'source'
      return 'module group'
    }

    return ranked.map(([p,count])=>({ path: p, role: roleFor(p), count }))
  }

  async analyze(workspaceRoot: string): Promise<ProjectAnalysis> {
    const graph = await loadGraphData(this.context)

    // Infer patterns
    const detectedPatterns: string[] = []
    if (fs.existsSync(path.join(workspaceRoot, 'package.json'))) detectedPatterns.push('node')

    const testStrategy: ProjectAnalysis['testStrategy'] = {}
    this.detectFromPackageJson(workspaceRoot, detectedPatterns, testStrategy)

    // Summarize key dirs from graph nodes
    const nodeIds = graph.nodes.map(n => n.id)
    const keyDirs = this.summarizeKeyDirsFromGraph(workspaceRoot, nodeIds)

    // Coding conventions (heuristics)
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

    const analysis: ProjectAnalysis = {
      version: 1,
      scannedAt: new Date().toISOString(),
      detectedPatterns: Array.from(new Set(detectedPatterns)),
      keyDirs,
      codingConventions,
      testStrategy,
      graphStats: { files: graph.nodes.length, edges: graph.edges.length },
    }

    const outDir = path.join(workspaceRoot, '.constellation', 'oss', 'analysis')
    await fs.promises.mkdir(outDir, { recursive: true })
    const outPath = path.join(outDir, 'project-analysis.json')
    await fs.promises.writeFile(outPath, JSON.stringify(analysis, null, 2), 'utf8')

    return analysis
  }
}

