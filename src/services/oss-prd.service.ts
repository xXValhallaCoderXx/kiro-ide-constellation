import * as fs from 'fs'
import * as path from 'path'
import { type FetchedIssue } from './github-issue.service.js'
import { type ProjectAnalysis } from './codebase-analysis.service.js'

export class OssPrdService {
  async generatePrd(workspaceRoot: string, params: { owner: string; repo: string; issueNumber: number }): Promise<{ rootPath: string; internalPath: string }> {
    const issuePath = path.join(workspaceRoot, '.constellation', 'oss', 'issues', `${params.owner}-${params.repo}-#${params.issueNumber}.json`)
    const analysisPath = path.join(workspaceRoot, '.constellation', 'oss', 'analysis', 'project-analysis.json')

    const issue = JSON.parse(await fs.promises.readFile(issuePath, 'utf8')) as FetchedIssue
    const analysis = JSON.parse(await fs.promises.readFile(analysisPath, 'utf8')) as ProjectAnalysis

    const prd = [
      `# OSS Implementation Plan — #${issue.number}: ${issue.title}`,
      '',
      '## Context',
      `- Issue: https://github.com/${issue.owner}/${issue.repo}/issues/${issue.number}`,
      `- Detected patterns: ${analysis.detectedPatterns.join(', ') || 'n/a'}`,
      '',
      '## Scope',
      '- In scope: Address the issue as described, align with project standards.',
      '- Out of scope: Unrelated refactors or feature additions.',
      '',
      '## Proposed Changes',
      '- Identify entry points and files to modify (based on analysis and issue discussion).',
      '- Update or add tests as applicable.',
      '',
      '## Standards Checklist (from project-standings.md)',
      '- File naming: kebab-case for TS/TSX',
      '- UI: Preact + shared Button + global.css',
      '- Commits: Conventional commits',
      '',
      '## Test Plan',
      '- Unit tests for changed modules',
      '- Integration smoke where relevant',
      '',
      '## Risks',
      '- Potential regressions in affected modules',
      '',
      '## Acceptance Criteria',
      '- Reproduction steps in issue pass after change',
      '- CI passes, tests updated/added where appropriate'
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

