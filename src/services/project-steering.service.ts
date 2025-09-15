import * as fs from 'fs'
import * as path from 'path'
import { type ProjectAnalysis } from './codebase-analysis.service.js'

export class ProjectSteeringService {
  async generateSteeringDocs(workspaceRoot: string, analysisPath?: string): Promise<string[]> {
    let analysisFile = analysisPath || path.join(workspaceRoot, '.constellation', 'oss', 'analysis', 'project-analysis.json')
    if (analysisPath && !path.isAbsolute(analysisPath)) {
      analysisFile = path.join(workspaceRoot, analysisPath)
    }
    const raw = await fs.promises.readFile(analysisFile, 'utf8')
    const analysis = JSON.parse(raw) as ProjectAnalysis

    const steeringDir = path.join(workspaceRoot, '.kiro', 'steering')
    await fs.promises.mkdir(steeringDir, { recursive: true })

    const files: Array<{ name: string; content: string }> = []

files.push({
      name: 'project-structure.md',
      content: [
        '** IMPORTANT: ALWAYS CALL THE MCP TOOL FIRST **',
        '# Project Structure',
        '',
        'Key directories:',
        ...analysis.keyDirs.map(k => `- ${k.path}: ${k.role}`)
      ].join('\n')
    })

files.push({
      name: 'project-tech.md',
      content: [
        '** IMPORTANT: ALWAYS CALL THE MCP TOOL FIRST **',
        '# Project Tech',
        '',
        `Detected patterns: ${analysis.detectedPatterns.join(', ') || 'n/a'}`,
        analysis.codingConventions?.tsconfig?.strict ? '- TypeScript strict mode: enabled' : '- TypeScript strict mode: unknown'
      ].join('\n')
    })

files.push({
      name: 'project-product.md',
      content: [
        '** IMPORTANT: ALWAYS CALL THE MCP TOOL FIRST **',
        '# Project Product',
        '',
        'Inferred feature domains (heuristic):',
        '- Graph visualization and developer UX',
        '- VS Code extension-side services'
      ].join('\n')
    })

files.push({
      name: 'project-standings.md',
      content: [
        '** IMPORTANT: ALWAYS CALL THE MCP TOOL FIRST **',
        '# Project Standards',
        '',
        '- File naming: kebab-case for .ts/.tsx files',
        '- UI components: Preact + shared Button.tsx + global.css',
        '- Commit messages: Conventional commits preferred',
        '- Testing: Add or update unit tests as appropriate'
      ].join('\n')
    })

    const written: string[] = []
    for (const f of files) {
      const outPath = path.join(steeringDir, f.name)
      await fs.promises.writeFile(outPath, f.content, 'utf8')
      written.push(outPath)
    }
    return written
  }
}

