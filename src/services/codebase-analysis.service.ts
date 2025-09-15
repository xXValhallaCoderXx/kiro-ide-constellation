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
  monorepo?: {
    workspacesGlobs?: string[]
    topLevelDirs?: string[]
    apps?: string[]
    packages?: string[]
    packageManager?: string
    buildOrchestration?: { tool?: string }
    styling?: { tailwind?: boolean }
    frameworks?: string[]
  }
  graphStats: { files: number; edges: number }
}

export class CodebaseAnalysisService {
  constructor(private readonly context: vscode.ExtensionContext) {}

  private detectFromPackageJson(workspaceRoot: string, detectedPatterns: string[], testStrategy: NonNullable<ProjectAnalysis['testStrategy']>, monorepo: NonNullable<ProjectAnalysis['monorepo']>) {
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
      if (has('tailwindcss')) detectedPatterns.push('tailwindcss')
      if (has('turbo')) detectedPatterns.push('turbo')

      if (has('vitest')) testStrategy.framework = 'vitest'
      else if (has('jest')) testStrategy.framework = 'jest'
      else if (has('mocha')) testStrategy.framework = 'mocha'

      // monorepo metadata
      if (Array.isArray(pkg.workspaces)) monorepo.workspacesGlobs = pkg.workspaces
      if (typeof pkg.packageManager === 'string') monorepo.packageManager = pkg.packageManager
      if (has('turbo')) monorepo.buildOrchestration = { tool: 'turbo' }
      monorepo.styling = { tailwind: !!deps['tailwindcss'] }
      const frameworks: string[] = []
      if (has('next')) frameworks.push('next')
      if (has('react')) frameworks.push('react')
      if (has('preact')) frameworks.push('preact')
      monorepo.frameworks = frameworks
    } catch {}
  }

  private summarizeKeyDirsFromGraph(workspaceRoot: string, nodeIds: string[]): Array<{ path: string; role: string; count: number }> {
    const normalize = (p: string) => {
      // Drop leading ../ or ./ segments for grouping
      const parts = p.split('/').filter(Boolean).filter(seg => seg !== '.' && seg !== '..')
      return parts
    }

    const chooseGroup = (parts: string[]): string => {
      if (parts.length === 0) return ''
      if (parts[0] === 'apps' && parts.length >= 2) return `apps/${parts[1]}`
      if (parts[0] === 'packages' && parts.length >= 2) return `packages/${parts[1]}`
      if (parts[0] === 'src' && parts.length >= 2) return `src/${parts[1]}`
      if (parts[0] === 'components') return 'components'
      if (parts[0] === 'lib') return 'lib'
      return parts[0]
    }

    const tally = new Map<string, number>()
    for (const id of nodeIds) {
      const parts = normalize(id)
      if (parts.length === 0) continue
      const group = chooseGroup(parts)
      if (!group) continue
      tally.set(group, (tally.get(group) || 0) + 1)
    }

    const ranked = Array.from(tally.entries()).sort((a,b)=>b[1]-a[1]).slice(0,12)

    const roleFor = (p: string): string => {
      const lower = p.toLowerCase()
      if (lower.startsWith('apps/')) return 'application'
      if (lower.startsWith('packages/')) return 'package'
      if (lower.includes('component')) return 'ui components'
      if (lower.includes('service')) return 'services'
      if (lower.includes('provider')) return 'providers'
      if (lower.includes('lib') || lower.startsWith('lib')) return 'library'
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
    const monorepo: NonNullable<ProjectAnalysis['monorepo']> = {}
    this.detectFromPackageJson(workspaceRoot, detectedPatterns, testStrategy as any, monorepo as any)

    // Summarize key dirs from graph nodes
    const nodeIds = graph.nodes.map(n => n.id)
    const keyDirs = this.summarizeKeyDirsFromGraph(workspaceRoot, nodeIds)

    // Infer monorepo apps/packages from node IDs
    try {
      const apps = new Set<string>()
      const packagesSet = new Set<string>()
      for (const id of nodeIds) {
        const parts = id.split('/').filter(Boolean).filter(seg => seg !== '.' && seg !== '..')
        if (parts[0] === 'apps' && parts[1]) apps.add(parts[1])
        if (parts[0] === 'packages' && parts[1]) packagesSet.add(parts[1])
      }
      if (apps.size > 0) monorepo.apps = Array.from(apps).sort()
      if (packagesSet.size > 0) monorepo.packages = Array.from(packagesSet).sort()
      const topLevel = new Set<string>()
      for (const id of nodeIds) {
        const parts = id.split('/').filter(Boolean).filter(seg => seg !== '.' && seg !== '..')
        if (parts[0]) topLevel.add(parts[0])
      }
      if (topLevel.size > 0) monorepo.topLevelDirs = Array.from(topLevel).sort()
    } catch {}

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
      monorepo,
      graphStats: { files: graph.nodes.length, edges: graph.edges.length },
    }

    const outDir = path.join(workspaceRoot, '.constellation', 'oss', 'analysis')
    await fs.promises.mkdir(outDir, { recursive: true })
    const outPath = path.join(outDir, 'project-analysis.json')
    await fs.promises.writeFile(outPath, JSON.stringify(analysis, null, 2), 'utf8')

    return analysis
  }
}

