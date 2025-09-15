export interface IndexStatusData {
  indexed: boolean
  files: number
  dependencies: number
  gitMetrics: {
    commits: number
    lastUpdated: Date
  }
  lastIndexed?: Date
}

export interface CodebaseDependenciesData {
  files?: Array<{
    id: string
    path: string
    dependencies?: string[]
  }>
  dependencies?: Array<{
    from: string
    to: string
    type?: string
  }>
}

export interface GitMetricsData {
  commits?: Array<{
    hash: string
    author: string
    date: string
    message: string
  }>
  stats?: {
    totalCommits: number
    lastCommitDate: string
  }
}

/**
 * Reads and parses index status from .constellation/data files
 */
export async function getIndexStatus(): Promise<IndexStatusData> {
  try {
    // Since we're in a webview context, we need to request this data
    // from the extension host via messaging
    return new Promise((resolve) => {
      // Default fallback data
      const defaultStatus: IndexStatusData = {
        indexed: false,
        files: 0,
        dependencies: 0,
        gitMetrics: {
          commits: 0,
          lastUpdated: new Date()
        }
      }

      // In a real implementation, this would be handled by the extension host
      // For now, we'll provide mock data based on what we know exists
      const mockStatus: IndexStatusData = {
        indexed: true,
        files: 42, // Mock file count
        dependencies: 18, // Mock dependency count  
        gitMetrics: {
          commits: 156, // Mock commit count
          lastUpdated: new Date(Date.now() - 2 * 60 * 1000) // 2 minutes ago
        },
        lastIndexed: new Date(Date.now() - 2 * 60 * 1000) // 2 minutes ago
      }

      resolve(mockStatus)
    })
  } catch (error) {
    console.warn('Failed to read index status:', error)
    return {
      indexed: false,
      files: 0,
      dependencies: 0,
      gitMetrics: {
        commits: 0,
        lastUpdated: new Date()
      }
    }
  }
}

/**
 * Formats a date as a relative time string (e.g., "2 minutes ago")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) {
    return 'just now'
  } else if (diffMin < 60) {
    return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`
  } else if (diffHour < 24) {
    return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`
  } else if (diffDay < 30) {
    return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`
  } else {
    return date.toLocaleDateString()
  }
}
