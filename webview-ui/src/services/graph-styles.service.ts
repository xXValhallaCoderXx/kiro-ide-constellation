/**
 * Service for generating Cytoscape stylesheets with file type color mappings
 */

import type { FileType } from './file-type.service';

/**
 * CSS variable mapping for file type colors
 */
export const FILE_TYPE_COLORS: Record<FileType, string> = {
  ts: 'var(--kiro-node-ts, #569CD6)',
  tsx: 'var(--kiro-node-tsx, #4FC1FF)',
  js: 'var(--kiro-node-js, #E3D300)',
  jsx: 'var(--kiro-node-jsx, #FFBD45)',
  json: 'var(--kiro-node-json, #8DC891)',
  other: 'var(--kiro-node-other, #B180D7)'
};

/**
 * Get the color for a specific file type
 * @param fileType - The file type
 * @returns CSS color value (CSS variable with fallback)
 */
export function getFileTypeColor(fileType: FileType): string {
  return FILE_TYPE_COLORS[fileType] || FILE_TYPE_COLORS.other;
}

/**
 * Generate Cytoscape stylesheet with file type color mappings
 * @param nodeCount - Number of nodes for performance optimizations
 * @returns Cytoscape stylesheet array
 */
export function generateGraphStylesheet(nodeCount: number = 0) {
  const isLargeGraph = nodeCount > 500;
  const isMediumGraph = nodeCount > 200;

  // Base styles
  const baseStyles = [
    // Default node style
    {
      selector: 'node',
      style: {
        'label': 'data(label)',
        'color': 'var(--vscode-foreground, #CCCCCC)',
        'font-size': isLargeGraph ? '10px' : '12px',
        'text-valign': 'center',
        'text-halign': 'center',
        'width': isLargeGraph ? '20px' : '30px',
        'height': isLargeGraph ? '20px' : '30px',
        'background-color': FILE_TYPE_COLORS.other // Default fallback
      }
    },
    // Edge styles
    {
      selector: 'edge',
      style: {
        'line-color': 'var(--vscode-foreground, #666666)',
        'width': isLargeGraph ? 1 : 2,
        'opacity': isLargeGraph ? 0.4 : 0.6,
        'curve-style': 'bezier'
      }
    },
    // Selected node style
    {
      selector: 'node:selected',
      style: {
        'border-width': 3,
        'border-color': 'var(--vscode-focusBorder, #007FD4)',
        'background-color': 'var(--vscode-charts-orange, #FF8C00)'
      }
    }
  ];

  // File type specific styles
  const fileTypeStyles = Object.entries(FILE_TYPE_COLORS).map(([fileType, color]) => ({
    selector: `node[ext = "${fileType}"]`,
    style: {
      'background-color': color
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