/**
 * Service for generating Cytoscape stylesheets with file type color mappings
 */

import type { FileType } from './file-type.service';

/**
 * Default hex colors for file types (used if CSS vars are absent)
 */
const DEFAULT_FILE_TYPE_COLORS: Record<FileType, string> = {
  ts: '#569CD6',
  tsx: '#4FC1FF',
  js: '#E3D300',
  jsx: '#FFBD45',
  json: '#8DC891',
  other: '#B180D7'
};

/**
 * CSS variable names for file types, resolved at runtime from global.css
 */
const FILE_TYPE_VAR_NAMES: Record<FileType, string> = {
  ts: '--kiro-node-ts',
  tsx: '--kiro-node-tsx',
  js: '--kiro-node-js',
  jsx: '--kiro-node-jsx',
  json: '--kiro-node-json',
  other: '--kiro-node-other'
};

/**
 * Resolve a CSS variable from :root with a fallback. If execution environment
 * cannot access document (e.g., SSR), returns the fallback.
 */
function resolveCssVar(varName: string, fallback: string): string {
  try {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const styles = getComputedStyle(document.documentElement);
      const value = styles.getPropertyValue(varName).trim();
      return value || fallback;
    }
  } catch {
    /* ignore */
  }
  return fallback;
}

/**
 * Get the concrete color for a specific file type (hex string).
 */
export function getFileTypeColor(fileType: FileType): string {
  const varName = FILE_TYPE_VAR_NAMES[fileType] ?? FILE_TYPE_VAR_NAMES.other;
  const fallback = DEFAULT_FILE_TYPE_COLORS[fileType] ?? DEFAULT_FILE_TYPE_COLORS.other;
  return resolveCssVar(varName, fallback);
}

/**
 * Generate Cytoscape stylesheet with file type color mappings
 * @param nodeCount - Number of nodes for performance optimizations
 * @returns Cytoscape stylesheet array
 */
export function generateGraphStylesheet(nodeCount: number = 0) {
  const isLargeGraph = nodeCount > 500;

  // Resolve concrete colors once per stylesheet build
  const colors: Record<FileType, string> = {
    ts: getFileTypeColor('ts'),
    tsx: getFileTypeColor('tsx'),
    js: getFileTypeColor('js'),
    jsx: getFileTypeColor('jsx'),
    json: getFileTypeColor('json'),
    other: getFileTypeColor('other')
  };

  // Base styles
  const baseStyles = [
    // Default node style
    {
      selector: 'node',
      style: {
        'label': 'data(label)',
        'color': '#CCCCCC',
        'font-size': isLargeGraph ? '10px' : '12px',
        'text-valign': 'center',
        'text-halign': 'center',
        'width': isLargeGraph ? '20px' : '30px',
        'height': isLargeGraph ? '20px' : '30px',
        'background-color': colors.other // Default fallback
      }
    },
    // Edge styles
    {
      selector: 'edge',
      style: {
        'line-color': '#666666',
        'width': isLargeGraph ? 1 : 2,
        'opacity': isLargeGraph ? 0.4 : 0.6,
        'curve-style': 'bezier',
        'target-arrow-shape': 'triangle',
        'target-arrow-color': '#666666',
        'arrow-scale': 1.0
      }
    },
    // Edges directly from the source node
    {
      selector: 'edge[fromSource = true]',
      style: {
        'line-color': '#FF8C00',
        'target-arrow-color': '#FF8C00',
        'width': isLargeGraph ? 2 : 3,
        'opacity': 0.9
      }
    },
    // Selected node style
    {
      selector: 'node:selected',
      style: {
        'border-width': 3,
        'border-color': '#007FD4',
        'background-color': '#FF8C00'
      }
    },
    // Epicenter node style (impact source)
    {
      selector: 'node[isSource = true]',
      style: {
        'width': isLargeGraph ? '26px' : '39px', // 30% larger than base size
        'height': isLargeGraph ? '26px' : '39px', // 30% larger than base size
        'border-width': '3px',
        'border-color': '#FF8C00',
        // Cytoscape shadow styles for halo effect
        'shadow-blur': 20,
        'shadow-color': '#FF8C00',
        'shadow-opacity': 0.6,
        'shadow-offset-x': 0,
        'shadow-offset-y': 0,
      }
    },
    // Direct children of the source node
    {
      selector: 'node[role = "direct-child"]',
      style: {
        'border-width': 2,
        'border-color': '#FFD700',
      }
    },
    // Indirect children (descendants) of the source node
    {
      selector: 'node[role = "indirect-child"]',
      style: {
        'opacity': isLargeGraph ? 0.9 : 1
      }
    }
  ];

  // File type specific styles
  const fileTypeStyles = (Object.keys(colors) as FileType[]).map((fileType) => ({
    selector: `node[ext = "${fileType}"]`,
    style: {
      'background-color': colors[fileType]
    }
  }));

  return [...baseStyles, ...fileTypeStyles];
}

/**
 * Get all supported file types for filter UI
 * @returns Array of file types
 */
export function getSupportedFileTypes(): FileType[] {
  return ['ts', 'tsx', 'js', 'jsx', 'json', 'other'];
}

/**
 * Get a human-readable label for a file type
 * @param fileType - The file type
 * @returns Display label for the file type
 */
export function getFileTypeLabel(fileType: FileType): string {
  switch (fileType) {
    case 'ts':
      return 'TypeScript';
    case 'tsx':
      return 'TSX';
    case 'js':
      return 'JavaScript';
    case 'jsx':
      return 'JSX';
    case 'json':
      return 'JSON';
    case 'other':
      return 'Other';
    default:
      return 'Unknown';
  }
}
