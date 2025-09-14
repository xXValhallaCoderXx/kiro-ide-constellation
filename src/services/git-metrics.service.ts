import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { spawn } from 'child_process'
import { getWorkspaceRoot } from './workspace.service.js'

export interface FileGitMetrics90d {
  commitCount: number
  churn: number // additions + deletions
  lastModifiedAt: number | null // unix seconds
  authorCount: number
  primaryAuthor?: string
}

export interface GitMetricsEnvelope {
  version: 1
  horizonDays: number
  head: string | null
  repoRoot: string | null
  workspaceRoot: string
  generatedAt: string
  available: boolean
  metrics: Record<string, FileGitMetrics90d>
}

const METRICS_FILENAME = 'git-metrics.json'
const HORIZON_DAYS = 90

function getOutputDir(workspaceRoot: string) {
  return path.join(workspaceRoot, '.constellation', 'data')
}

function getMetricsPath(workspaceRoot: string) {
  return path.join(getOutputDir(workspaceRoot), METRICS_FILENAME)
}

async function runGit(cwd: string, args: string[]): Promise<{ code: number, stdout: string, stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn('git', args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] })
    const out: string[] = []
    const err: string[] = []
    child.stdout.on('data', (b: Buffer) => out.push(b.toString()))
    child.stderr.on('data', (b: Buffer) => err.push(b.toString()))
    child.on('close', (code) => {
      resolve({ code: code ?? 0, stdout: out.join(''), stderr: err.join('') })
    })
    child.on('error', () => {
      resolve({ code: 127, stdout: '', stderr: 'failed to spawn git' })
    })
  })
}

async function detectRepoRoot(cwd: string): Promise<string | null> {
  const res = await runGit(cwd, ['rev-parse', '--show-toplevel'])
  if (res.code !== 0) return null
  return res.stdout.trim()
}

async function getHead(cwd: string): Promise<string | null> {
  const res = await runGit(cwd, ['rev-parse', 'HEAD'])
  if (res.code !== 0) return null
  return res.stdout.trim()
}

function readExisting(workspaceRoot: string): GitMetricsEnvelope | null {
  try {
    const p = getMetricsPath(workspaceRoot)
    if (!fs.existsSync(p)) return null
    const raw = fs.readFileSync(p, 'utf8')
    const json = JSON.parse(raw)
    // basic shape check
    if (!json || typeof json !== 'object' || typeof json.metrics !== 'object') return null
    return json as GitMetricsEnvelope
  } catch {
    return null
  }
}

function writeEnvelope(workspaceRoot: string, env: GitMetricsEnvelope) {
  const dir = getOutputDir(workspaceRoot)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(getMetricsPath(workspaceRoot), JSON.stringify(env, null, 2), 'utf8')
}

export async function readGitMetrics(context: vscode.ExtensionContext): Promise<GitMetricsEnvelope | null> {
  const workspaceRoot = getWorkspaceRoot()
  if (!workspaceRoot) return null
  return readExisting(workspaceRoot)
}

export async function ensureGitMetrics(context: vscode.ExtensionContext): Promise<GitMetricsEnvelope | null> {
  const workspaceRoot = getWorkspaceRoot()
  if (!workspaceRoot) return null

  // Detect repo
  const repoRoot = await detectRepoRoot(workspaceRoot)
  if (!repoRoot) {
    // Not a git repo — write sentinel envelope so UI can show "no git"
    const sentinel: GitMetricsEnvelope = {
      version: 1,
      horizonDays: HORIZON_DAYS,
      head: null,
      repoRoot: null,
      workspaceRoot,
      generatedAt: new Date().toISOString(),
      available: false,
      metrics: {}
    }
    writeEnvelope(workspaceRoot, sentinel)
    return sentinel
  }

  // Check cache
  const head = await getHead(repoRoot)
  const existing = readExisting(workspaceRoot)
  if (existing && existing.available && existing.head === head && existing.horizonDays === HORIZON_DAYS) {
    return existing
  }

  // Compute fresh metrics (90-day window)
  const args = [
    'log',
    `--since=${HORIZON_DAYS}.days`,
    '--no-merges',
    '--no-renames',
    '--numstat',
    '--format=%H%x09%at%x09%an'
  ]
  const { code, stdout } = await runGit(repoRoot, args)
  if (code !== 0) {
    const fallback: GitMetricsEnvelope = {
      version: 1,
      horizonDays: HORIZON_DAYS,
      head,
      repoRoot,
      workspaceRoot,
      generatedAt: new Date().toISOString(),
      available: false,
      metrics: {}
    }
    writeEnvelope(workspaceRoot, fallback)
    return fallback
  }

  type Acc = {
    commitCount: number
    churn: number
    lastModifiedAt: number | null
    authors: Map<string, number>
  }

  const byFile: Map<string, Acc> = new Map()

  let currentTs: number | null = null
  let currentAuthor: string | null = null

  const lines = stdout.split(/\r?\n/)
  const commitHeaderRe = /^([0-9a-fA-F]{7,40})\t(\d{1,})\t(.+)$/
  const numstatRe = /^(\d+|-)\t(\d+|-)\t(.+)$/

  for (const line of lines) {
    if (!line) continue
    const mHeader = commitHeaderRe.exec(line)
    if (mHeader) {
      currentTs = parseInt(mHeader[2], 10) || null
      currentAuthor = mHeader[3]
      continue
    }
    const mNum = numstatRe.exec(line)
    if (!mNum) continue

    // Require a current commit context
    if (currentTs == null || !currentAuthor) continue

    const adds = mNum[1] === '-' ? 0 : parseInt(mNum[1], 10)
    const dels = mNum[2] === '-' ? 0 : parseInt(mNum[2], 10)
    const relPathFromRepo = mNum[3]

    // Normalize to workspace-relative id (align with GraphData node ids)
    const abs = path.resolve(repoRoot, relPathFromRepo)
    let rel = path.relative(workspaceRoot, abs).split(path.sep).join(path.posix.sep)
    if (rel.startsWith('..')) {
      // File outside workspace root; ignore
      continue
    }

    const prev = byFile.get(rel) ?? { commitCount: 0, churn: 0, lastModifiedAt: null, authors: new Map<string, number>() }
    prev.commitCount += 1
    prev.churn += (adds + dels)
    prev.lastModifiedAt = Math.max(prev.lastModifiedAt ?? 0, currentTs)
    prev.authors.set(currentAuthor, (prev.authors.get(currentAuthor) ?? 0) + 1)
    byFile.set(rel, prev)
  }

  const metrics: Record<string, FileGitMetrics90d> = {}
  for (const [rel, acc] of byFile.entries()) {
    let primaryAuthor: string | undefined
    let maxCommits = -1
    for (const [author, count] of acc.authors.entries()) {
      if (count > maxCommits) { maxCommits = count; primaryAuthor = author }
    }
    metrics[rel] = {
      commitCount: acc.commitCount,
      churn: acc.churn,
      lastModifiedAt: acc.lastModifiedAt,
      authorCount: acc.authors.size,
      primaryAuthor
    }
  }

  const envelope: GitMetricsEnvelope = {
    version: 1,
    horizonDays: HORIZON_DAYS,
    head,
    repoRoot,
    workspaceRoot,
    generatedAt: new Date().toISOString(),
    available: true,
    metrics
  }

  writeEnvelope(workspaceRoot, envelope)
  return envelope
}
