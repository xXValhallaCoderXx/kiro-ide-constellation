import * as fs from 'fs'
import * as path from 'path'
import type * as vscode from 'vscode'
import { SecurityService } from './security.service.js'

export interface FetchedIssue {
  owner: string
  repo: string
  number: number
  title: string
  labels: string[]
  body: string
  comments: Array<{ author: string; body: string; createdAt?: string }>
  piiScrubbed: boolean
}

export class GitHubIssueService {
  constructor(private readonly context: vscode.ExtensionContext) {}

  parseIssueUrl(url: string): { owner: string; repo: string; number: number } {
    const m = url.match(/^https?:\/\/github.com\/([^\/]+)\/([^\/]+)\/issues\/(\d+)/i)
    if (!m) throw new Error('Invalid GitHub issue URL. Expected https://github.com/{owner}/{repo}/issues/{number}')
    return { owner: m[1], repo: m[2], number: parseInt(m[3], 10) }
  }

  async fetchIssue(url: string, token?: string): Promise<FetchedIssue> {
    const { owner, repo, number } = this.parseIssueUrl(url)
    const headers: Record<string, string> = { 'Accept': 'application/vnd.github+json', 'User-Agent': 'kiro-constellation' }
    if (token) headers['Authorization'] = `Bearer ${token}`

    const base = `https://api.github.com/repos/${owner}/${repo}/issues/${number}`
    const [issueRes, commentsRes] = await Promise.all([
      fetch(base, { headers }),
      fetch(`${base}/comments`, { headers })
    ])

    if (!issueRes.ok) throw new Error(`GitHub issue fetch failed: HTTP ${issueRes.status}`)
    if (!commentsRes.ok) throw new Error(`GitHub comments fetch failed: HTTP ${commentsRes.status}`)

    const issue = await issueRes.json() as any
    const comments = await commentsRes.json() as any[]

    const pii = (s: string) => s.replace(/@[a-z0-9-_]+/gi, '@user').replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, 'user@example.com')

    const result: FetchedIssue = {
      owner,
      repo,
      number,
      title: String(issue.title || ''),
      labels: Array.isArray(issue.labels) ? issue.labels.map((l: any) => (typeof l === 'string' ? l : l?.name)).filter(Boolean) : [],
      body: pii(String(issue.body || '')),
      comments: comments.map(c => ({ author: String(c.user?.login || 'user'), body: pii(String(c.body || '')), createdAt: c.created_at })),
      piiScrubbed: true
    }

    // Write to .constellation/oss/issues/{owner}-{repo}-#{number}.json
    const wsRoot = SecurityService.validateWorkspace()
    const outDir = path.join(wsRoot, '.constellation', 'oss', 'issues')
    await fs.promises.mkdir(outDir, { recursive: true })
    const outPath = path.join(outDir, `${owner}-${repo}-#${number}.json`)
    await fs.promises.writeFile(outPath, JSON.stringify(result, null, 2), 'utf8')

    return result
  }
}

