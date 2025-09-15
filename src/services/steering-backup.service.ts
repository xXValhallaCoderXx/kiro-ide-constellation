import * as fs from 'fs'
import * as path from 'path'

export type BackupNamespace = 'default' | 'onboarding' | 'oss'

const STEERING_DIR = '.kiro/steering'
const BACKUP_BASE_DIR = '.constellation/steering/backup'
const DEFAULT_RETENTION = 3

interface BackupMetadata {
  timestamp: string
  originalPath: string
  backupPath: string
  fileCount: number
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.promises.access(p, fs.constants.F_OK)
    return true
  } catch {
    return false
  }
}

async function copyDirectoryRecursive(src: string, dest: string, exclude: Set<string> = new Set()): Promise<void> {
  await fs.promises.mkdir(dest, { recursive: true })
  const entries = await fs.promises.readdir(src, { withFileTypes: true })
  for (const entry of entries) {
    if (exclude.has(entry.name)) continue
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      await copyDirectoryRecursive(srcPath, destPath, exclude)
    } else {
      await fs.promises.copyFile(srcPath, destPath)
    }
  }
}

async function countFilesRecursive(dir: string): Promise<number> {
  let count = 0
  const entries = await fs.promises.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      count += await countFilesRecursive(entryPath)
    } else {
      count++
    }
  }
  return count
}

async function findMostRecentBackup(namespaceDir: string): Promise<string | null> {
  try {
    const entries = await fs.promises.readdir(namespaceDir, { withFileTypes: true })
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name).sort().reverse()
    return dirs.length > 0 ? path.join(namespaceDir, dirs[0]) : null
  } catch {
    return null
  }
}

async function safeRemoveDir(dir: string): Promise<void> {
  try { await fs.promises.rm(dir, { recursive: true, force: true }) } catch { /* ignore */ }
}

export async function ensureDefaultBaseline(workspaceRoot: string): Promise<void> {
  const defaultNsDir = path.join(workspaceRoot, BACKUP_BASE_DIR, 'default')
  const hasBaseline = await pathExists(defaultNsDir) && (await fs.promises.readdir(defaultNsDir)).length > 0
  if (!hasBaseline) {
    await backupSteering({ workspaceRoot, namespace: 'default' })
  }
}

export async function backupSteering(args: { workspaceRoot: string, namespace: BackupNamespace }): Promise<{ backupDir: string, fileCount: number, timestamp: string }> {
  const { workspaceRoot, namespace } = args
  const steeringDir = path.join(workspaceRoot, STEERING_DIR)
  const nsDir = path.join(workspaceRoot, BACKUP_BASE_DIR, namespace)
  await fs.promises.mkdir(nsDir, { recursive: true })

  const ts = timestamp()
  const destDir = path.join(nsDir, ts)

  // If steering dir does not exist, create empty backup directory
  if (!(await pathExists(steeringDir))) {
    await fs.promises.mkdir(destDir, { recursive: true })
    const metadata: BackupMetadata = { timestamp: ts, originalPath: steeringDir, backupPath: destDir, fileCount: 0 }
    await fs.promises.writeFile(path.join(destDir, '.backup-metadata.json'), JSON.stringify(metadata, null, 2))
    await pruneBackups({ workspaceRoot, namespace, retain: DEFAULT_RETENTION })
    return { backupDir: destDir, fileCount: 0, timestamp: ts }
  }

  // Try rename, fallback to copy+rm
  try {
    await fs.promises.rename(steeringDir, destDir)
  } catch {
    await fs.promises.mkdir(destDir, { recursive: true })
    await copyDirectoryRecursive(steeringDir, destDir)
    await safeRemoveDir(steeringDir)
  }

  let fileCount = 0
  try { fileCount = await countFilesRecursive(destDir) } catch { /* ignore */ }
  const metadata: BackupMetadata = { timestamp: ts, originalPath: steeringDir, backupPath: destDir, fileCount }
  try { await fs.promises.writeFile(path.join(destDir, '.backup-metadata.json'), JSON.stringify(metadata, null, 2)) } catch { /* ignore */ }

  await pruneBackups({ workspaceRoot, namespace, retain: DEFAULT_RETENTION })
  return { backupDir: destDir, fileCount, timestamp: ts }
}

async function hasRealFiles(dir: string, exclude: Set<string> = new Set(['.backup-metadata.json', '.backups'])): Promise<boolean> {
  try {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (exclude.has(entry.name)) continue
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        const childHas = await hasRealFiles(full, exclude)
        if (childHas) return true
      } else {
        return true
      }
    }
    return false
  } catch {
    return false
  }
}

export async function restoreSteering(args: { workspaceRoot: string, namespace: BackupNamespace }): Promise<boolean> {
  const { workspaceRoot, namespace } = args
  const steeringDir = path.join(workspaceRoot, STEERING_DIR)
  const nsDir = path.join(workspaceRoot, BACKUP_BASE_DIR, namespace)

  const mostRecent = await findMostRecentBackup(nsDir)
  if (!mostRecent) {
    await fs.promises.mkdir(steeringDir, { recursive: true })
    return false
  }

  // If backup is effectively empty (no real files), treat as no-restore
  const hasContent = await hasRealFiles(mostRecent)
  if (!hasContent) {
    await fs.promises.mkdir(steeringDir, { recursive: true })
    return false
  }

  await safeRemoveDir(steeringDir)
  await copyDirectoryRecursive(mostRecent, steeringDir, new Set(['.backup-metadata.json', '.backups']))
  return true
}

export async function pruneBackups(args: { workspaceRoot: string, namespace: BackupNamespace, retain?: number }): Promise<void> {
  const { workspaceRoot, namespace, retain = DEFAULT_RETENTION } = args
  const nsDir = path.join(workspaceRoot, BACKUP_BASE_DIR, namespace)
  try {
    const entries = await fs.promises.readdir(nsDir, { withFileTypes: true })
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name).sort().reverse()
    const toDelete = dirs.slice(retain)
    await Promise.all(toDelete.map(name => safeRemoveDir(path.join(nsDir, name))))
  } catch { /* ignore */ }
}

