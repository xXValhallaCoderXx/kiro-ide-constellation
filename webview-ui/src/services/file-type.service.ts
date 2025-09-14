/**
 * Service for detecting file types from file paths and extensions
 */

export type FileType = 'ts' | 'tsx' | 'js' | 'jsx' | 'json' | 'other'

/**
 * Extract file extension from a file path
 * @param path - File path (e.g., "src/components/App.tsx")
 * @returns File extension without the dot (e.g., "tsx")
 */
export function getFileExt(path: string): FileType {
  if (!path || typeof path !== 'string') {
    return 'other'
  }

  // Extract extension from path
  const lastDotIndex = path.lastIndexOf('.')
  if (lastDotIndex === -1 || lastDotIndex === path.length - 1) {
    return 'other'
  }

  const ext = path.substring(lastDotIndex + 1).toLowerCase()

  // Map extensions to our supported file types
  switch (ext) {
    case 'ts':
      return 'ts'
    case 'tsx':
      return 'tsx'
    case 'js':
      return 'js'
    case 'jsx':
      return 'jsx'
    case 'json':
      return 'json'
    default:
      return 'other'
  }
}

/**
 * Get a human-readable label for a file type
 * @param fileType - The file type
 * @returns Display label for the file type
 */
export function getFileTypeLabel(fileType: FileType): string {
  switch (fileType) {
    case 'ts':
      return 'TypeScript'
    case 'tsx':
      return 'TSX'
    case 'js':
      return 'JavaScript'
    case 'jsx':
      return 'JSX'
    case 'json':
      return 'JSON'
    case 'other':
      return 'Other'
    default:
      return 'Unknown'
  }
}