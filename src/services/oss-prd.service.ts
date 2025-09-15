import * as fs from 'fs'
import * as path from 'path'
import { type FetchedIssue } from './github-issue.service.js'
import { type ProjectAnalysis } from './codebase-analysis.service.js'

// Minimal type for dependency-cruiser output we store
interface DepCruiseResult {
  version: 1
  generatedAt: string
  workspaceRoot: string
  depcruise: {
    modules: Array<{
      source: string
      dependencies: Array<{ resolved: string; dependencyTypes: string[] }>
    }>
  }
}

export class OssPrdService {
  private async readJsonIfExists<T>(p: string): Promise<T | null> {
    try {
      const raw = await fs.promises.readFile(p, 'utf8')
      return JSON.parse(raw) as T
    } catch {
      return null
    }
  }

  private toRel(workspaceRoot: string, absOrRel: string): string {
    if (!absOrRel) return absOrRel
    if (path.isAbsolute(absOrRel)) return path.relative(workspaceRoot, absOrRel).split(path.sep).join('/')
    return absOrRel.split(path.sep).join('/')
  }

  private buildAdjacencyFromGraph(workspaceRoot: string, graph: DepCruiseResult) {
    const forward = new Map<string, string[]>()
    const reverse = new Map<string, string[]>()
    const nodes = new Set<string>()

    for (const m of graph.depcruise.modules) {
      const src = this.toRel(workspaceRoot, m.source)
      if (!forward.has(src)) forward.set(src, [])
      if (!reverse.has(src)) reverse.set(src, [])
      nodes.add(src)
      for (const d of m.dependencies) {
        const tgt = this.toRel(workspaceRoot, d.resolved)
        if (!forward.has(tgt)) forward.set(tgt, [])
        if (!reverse.has(tgt)) reverse.set(tgt, [])
        nodes.add(tgt)
        forward.get(src)!.push(tgt)
        reverse.get(tgt)!.push(src)
      }
    }
    return { forward, reverse, nodes: Array.from(nodes) }
  }

  private bfsUnion(seed: string, forward: Map<string, string[]>, reverse: Map<string, string[]>, depth = 1, limit = 30): string[] {
    const seen = new Set<string>([seed])
    const queue: Array<{ id: string; depth: number }> = [{ id: seed, depth: 0 }]
    const out: string[] = []

    while (queue.length) {
      const cur = queue.shift()!
      if (cur.depth >= depth) continue
      const neigh = new Set<string>([...(forward.get(cur.id) || []), ...(reverse.get(cur.id) || [])])
      for (const n of neigh) {
        if (seen.has(n)) continue
        seen.add(n)
        out.push(n)
        if (out.length >= limit) return out
        queue.push({ id: n, depth: cur.depth + 1 })
      }
    }
    return out
  }

  private parseFileRefsFromIssue(issue: FetchedIssue): string[] {
    const candidates = new Set<string>()
    const scan = (text?: string) => {
      if (!text) return
      // matches paths like apps/www/registry/new-york/v0/sidebar-16.tsx or packages/x/src/foo.ts
      const regex = /(?:^|[\s`'"(])([\w./-]+\.(?:tsx|ts|jsx|js|css|scss|mdx?))/g
      let m: RegExpExecArray | null
      while ((m = regex.exec(text)) !== null) {
        const p = m[1].replace(/^\.?\/?/, '') // strip leading ./
        candidates.add(p)
      }
    }
    scan(issue.body)
    for (const c of issue.comments) scan(c.body)
    return Array.from(candidates)
  }

  private findWorkspaceForPath(rel: string, analysis: ProjectAnalysis): string | null {
    const parts = rel.split('/')
    if (parts[0] === 'apps' && parts[1]) return parts[1]
    if (parts[0] === 'packages' && parts[1]) return parts[1]
    return null
  }

  private buildKeyDirsTable(analysis: ProjectAnalysis, maxRows = 8): string {
    const rows = (analysis.keyDirs || []).slice(0, maxRows).map(k => `| ${k.path} | ${k.role} | ${k.count ?? ''} |`).join('\n')
    return ['| Path | Role | Count |', '|---|---|---|', rows].join('\n')
  }

  async generatePrd(workspaceRoot: string, params: { owner: string; repo: string; issueNumber: number }): Promise<{ rootPath: string; internalPath: string }> {
    const issuePath = path.join(workspaceRoot, '.constellation', 'oss', 'issues', `${params.owner}-${params.repo}-#${params.issueNumber}.json`)
    const analysisPath = path.join(workspaceRoot, '.constellation', 'oss', 'analysis', 'project-analysis.json')
    const graphPath = path.join(workspaceRoot, '.constellation', 'data', 'codebase-dependencies.json')
    const standingsPath = path.join(workspaceRoot, '.kiro', 'steering', 'project-standings.md')

    const issue = JSON.parse(await fs.promises.readFile(issuePath, 'utf8')) as FetchedIssue
    const analysis = JSON.parse(await fs.promises.readFile(analysisPath, 'utf8')) as ProjectAnalysis
    const graph = await this.readJsonIfExists<DepCruiseResult>(graphPath)
    const standings = await this.readJsonIfExists<string>(standingsPath) // may be null if not JSON; ignore

    let forward = new Map<string, string[]>(), reverse = new Map<string, string[]>(), nodes: string[] = []
    if (graph) {
      const adj = this.buildAdjacencyFromGraph(workspaceRoot, graph)
      forward = adj.forward; reverse = adj.reverse; nodes = adj.nodes
    }

    // Extract file refs from issue body/comments and verify existence in repo
    const mentioned = this.parseFileRefsFromIssue(issue)
    const existing: string[] = []
    for (const rel of mentioned) {
      const abs = path.join(workspaceRoot, rel)
      try { const st = await fs.promises.stat(abs); if (st.isFile()) existing.push(rel) } catch {}
    }

    // For each targeted file, compute immediate neighbors (depth=1) to surface impacted modules
    const impacted: Record<string, string[]> = {}
    if (existing.length && nodes.length) {
      for (const rel of existing) {
        const relPosix = rel.split(path.sep).join('/')
        const candidates = nodes.includes(relPosix) ? [relPosix] : nodes.filter(n => n.endsWith(relPosix))
        const seed = candidates[0]
        if (seed) {
          impacted[relPosix] = this.bfsUnion(seed, forward, reverse, 1, 20)
        }
      }
    }

    const workspaces = Array.from(new Set(existing.map(p => this.findWorkspaceForPath(p, analysis)).filter(Boolean) as string[]))

    const keyDirsTable = this.buildKeyDirsTable(analysis, 10)
    const patterns = analysis.detectedPatterns.join(', ') || 'n/a'
    const pm = analysis.monorepo?.packageManager || 'unknown'
    const orchestration = analysis.monorepo?.buildOrchestration?.tool || 'n/a'

    const commands: string[] = []
    for (const ws of workspaces) {
      commands.push(`pnpm --filter=${ws} lint:fix`)
      commands.push(`pnpm --filter=${ws} test`)
      commands.push(`pnpm --filter=${ws} dev`)
    }
    if (!commands.length) {
      commands.push('pnpm lint:fix', 'pnpm test', 'pnpm dev')
    }

    const impactedSection = Object.keys(impacted).length
      ? Object.entries(impacted).map(([seed, list]) => {
          const items = list.slice(0, 10).map(f => `  - ${f}`).join('\n')
          return `- ${seed}\n${items}`
        }).join('\n')
      : 'No specific impacted modules inferred (graph unavailable or issue did not reference files).'

    // Build a detailed PRD
    const prd = [
      `# OSS Implementation Plan — #${issue.number}: ${issue.title}`,
      '',
      '## Context',
      `- Issue: https://github.com/${issue.owner}/${issue.repo}/issues/${issue.number}`,
      `- Detected patterns: ${patterns}`,
      `- Package manager: ${pm} | Orchestration: ${orchestration}`,
      '',
      '### Issue Summary',
      issue.body ? issue.body.slice(0, 1200) : '(no body)',
      '',
      '## Target Files Mentioned',
      existing.length ? existing.map(p => `- ${p}`).join('\n') : '- None explicitly validated from issue text',
      '',
      '## Dependency Impact (Depth 1, union graph)',
      impactedSection,
      '',
      '## Proposed Changes',
      existing.length
        ? existing.map(p => `- Reorder Tailwind classnames in ${p} to satisfy eslint(tailwindcss/classnames-order); ensure no visual regressions.`).join('\n')
        : '- Reorder Tailwind classnames in affected components to satisfy eslint(tailwindcss/classnames-order); ensure no visual regressions.',
      '',
      '## Standards Alignment',
      '- Follow project-standings.md (coding style, accessibility, commit conventions).',
      '- Ensure TypeScript strictness (no any), pass ESLint and Prettier.',
      '',
      '## Test Plan',
      '- Run ESLint with auto-fix; ensure no tailwindcss/classnames-order violations remain.',
      '- Run unit/integration tests (Vitest) in affected workspaces.',
      '- Manual visual check of changed components in dev server.',
      '',
      '## Commands',
      commands.map(c => `- ${c}`).join('\n'),
      '',
      '## Acceptance Criteria',
      '- Reproduction steps from the issue no longer surface lint errors.',
      '- CI passes including lint, typecheck, and tests.',
      '- No regressions observed in impacted imports/consumers.',
      '',
      '## Risks and Mitigations',
      '- Risk: Unintended style changes after class reordering. Mitigation: Visual diff check under dark/light themes and all states.',
      '- Risk: Missed classnames in similar registry entries. Mitigation: Search repo for similar patterns and apply consistent fixes.',
      '',
      '## Repository Structure Snapshot',
      keyDirsTable
    ].join('\n')

    const rootPath = path.join(workspaceRoot, `oss-implementation-#${issue.number}.md`)
    const internalDir = path.join(workspaceRoot, '.constellation', 'oss', 'prds')
    await fs.promises.mkdir(internalDir, { recursive: true })
    const internalPath = path.join(internalDir, `oss-implementation-#${issue.number}.md`)

    await fs.promises.writeFile(rootPath, prd, 'utf8')
    await fs.promises.writeFile(internalPath, prd, 'utf8')
    return { rootPath, internalPath }
  }
}

