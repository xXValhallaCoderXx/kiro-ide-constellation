import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { runScan } from './dependency-cruiser.service.js';

// Error message constants for different failure scenarios
// Requirements: R2.5, R7.3
export const ERROR_MESSAGES = {
  NO_WORKSPACE: 'No workspace folder open. Open a project to view dependencies.',
  SCAN_TIMEOUT: 'Dependency scan timed out after 30 seconds. Try running "Constellation: Scan Dependencies" manually.',
  SCAN_FAILED: 'Dependency scan failed. Check the output console for details.',
  PARSE_ERROR: 'Could not parse dependency data. Try re-scanning the project.',
  FILE_TOO_LARGE: 'Dependency file is very large. Graph rendering may take a moment.',
  FILE_NOT_FOUND: 'Dependency data not found. Scanning project...',
  READ_ERROR: 'Could not read dependency data file. Check file permissions.',
  LARGE_GRAPH_WARNING: 'Large graph detected. Rendering may take a moment.',
  VERY_LARGE_GRAPH_WARNING: 'Very large graph detected. Using simplified layout for better performance.',
} as const;

// Type definitions based on design document
export interface Node {
  id: string;           // workspace-relative path
  label: string;        // file basename
  path: string;         // absolute path for file operations
  language?: 'ts' | 'js' | 'tsx' | 'jsx' | 'json' | 'other';
}

export interface Edge {
  id: string;           // `${sourceId}->${targetId}` + optional index
  source: string;       // node id
  target: string;       // node id
  kind?: 'import' | 'require' | 'dynamic' | 'unknown';
}

export interface Meta {
  generatedAt?: string;
  count: {
    nodes: number;
    edges: number;
  };
  performanceOptimized?: boolean;
}

export interface GraphData {
  nodes: Node[];
  edges: Edge[];
  meta: Meta;
}

// Dependency cruiser input format
interface DepCruiseResult {
  version: 1;
  generatedAt: string;
  workspaceRoot: string;
  depcruise: {
    modules: Array<{
      source: string;           // file path
      dependencies: Array<{
        resolved: string;       // target file path
        dependencyTypes: string[]; // ['esm', 'cjs', 'dynamic', etc.]
      }>;
    }>;
  };
}

/**
 * Maps dependency-cruiser dependency types to simplified categories
 */
function mapDependencyKind(types: string[]): Edge['kind'] {
  if (types.includes('esm') || types.includes('es6')) {
    return 'import';
  }
  if (types.includes('cjs') || types.includes('commonjs')) {
    return 'require';
  }
  if (types.includes('dynamic')) {
    return 'dynamic';
  }
  return 'unknown';
}

/**
 * Determines file language based on extension
 */
function getFileLanguage(filePath: string): Node['language'] {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.ts': return 'ts';
    case '.js': return 'js';
    case '.tsx': return 'tsx';
    case '.jsx': return 'jsx';
    case '.json': return 'json';
    default: return 'other';
  }
}

/**
 * Checks if graph should use performance optimizations based on size
 */
function shouldOptimizeForPerformance(nodeCount: number, edgeCount: number): boolean {
  return nodeCount > 500 || edgeCount > 1000;
}

/**
 * Transforms dependency-cruiser output to graph format
 * Requirements: R4.2, R4.3, R4.4, R4.5
 */
export function transformDepCruise(depResult: DepCruiseResult, workspaceRoot: string): GraphData {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const nodeSet = new Set<string>();
  const edgeMap = new Map<string, number>(); // Track edge counts for collision handling

  // Process modules to create nodes and edges
  for (const module of depResult.depcruise.modules) {
    const sourcePath = module.source;
    
    // Create workspace-relative path for node ID
    const sourceId = path.relative(workspaceRoot, sourcePath);
    
    // Add source node if not already added
    if (!nodeSet.has(sourceId)) {
      nodeSet.add(sourceId);
      nodes.push({
        id: sourceId,
        label: path.basename(sourcePath),
        path: path.resolve(workspaceRoot, sourceId), // absolute path for file operations
        language: getFileLanguage(sourcePath)
      });
    }

    // Process dependencies to create edges and target nodes
    for (const dep of module.dependencies) {
      const targetPath = dep.resolved;
      const targetId = path.relative(workspaceRoot, targetPath);
      
      // Add target node if not already added
      if (!nodeSet.has(targetId)) {
        nodeSet.add(targetId);
        nodes.push({
          id: targetId,
          label: path.basename(targetPath),
          path: path.resolve(workspaceRoot, targetId), // absolute path for file operations
          language: getFileLanguage(targetPath)
        });
      }

      // Generate unique edge ID with collision handling
      const baseEdgeId = `${sourceId}->${targetId}`;
      let edgeId = baseEdgeId;
      
      if (edgeMap.has(baseEdgeId)) {
        const count = edgeMap.get(baseEdgeId)! + 1;
        edgeMap.set(baseEdgeId, count);
        edgeId = `${baseEdgeId}-${count}`;
      } else {
        edgeMap.set(baseEdgeId, 0);
      }

      // Create edge
      edges.push({
        id: edgeId,
        source: sourceId,
        target: targetId,
        kind: mapDependencyKind(dep.dependencyTypes)
      });
    }
  }

  const result = {
    nodes,
    edges,
    meta: {
      generatedAt: depResult.generatedAt,
      count: {
        nodes: nodes.length,
        edges: edges.length
      },
      performanceOptimized: shouldOptimizeForPerformance(nodes.length, edges.length)
    }
  };

  return result;
}

/**
 * Polls for file existence with timeout and progress reporting
 * Requirements: R2.4 (30-second timeout)
 */
async function pollForFile(
  filePath: string, 
  timeoutMs: number = 30000,
  onProgress?: (elapsed: number, remaining: number) => void
): Promise<boolean> {
  const startTime = Date.now();
  const pollInterval = 500;
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      if (fs.existsSync(filePath)) {
        return true;
      }
    } catch (error) {
      // Ignore file system errors during polling
    }
    
    // Report progress if callback provided
    if (onProgress) {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, timeoutMs - elapsed);
      onProgress(elapsed, remaining);
    }
    
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
  return false;
}

/**
 * Checks file size and returns appropriate status
 * Requirements: R2.5 (file size checking for large files >5MB)
 */
function checkFileSize(filePath: string): { isLarge: boolean; sizeInMB: number } {
  try {
    const stats = fs.statSync(filePath);
    const sizeInMB = stats.size / (1024 * 1024);
    return {
      isLarge: sizeInMB > 5,
      sizeInMB
    };
  } catch (error) {
    return { isLarge: false, sizeInMB: 0 };
  }
}

/**
 * Detects workspace and validates it exists
 * Requirements: R2.5 (graceful handling for missing workspace)
 */
function detectWorkspace(): string | null {
  if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
    return null;
  }
  return vscode.workspace.workspaceFolders[0].uri.fsPath;
}

/**
 * Main function to load graph data with automatic scanning and error handling
 * Requirements: R2.1, R2.4, R4.1, R7.4
 */
export async function loadGraphData(
  context: vscode.ExtensionContext,
  onStatus?: (message: string) => void
): Promise<GraphData> {
  // Detect workspace
  const workspaceRoot = detectWorkspace();
  if (!workspaceRoot) {
    throw new Error(ERROR_MESSAGES.NO_WORKSPACE);
  }

  // Resolve dependency data file path
  const dataFilePath = path.join(workspaceRoot, '.constellation', 'data', 'codebase-dependencies.json');

  // Check if dependency data exists
  if (!fs.existsSync(dataFilePath)) {
    // Trigger automatic scan
    onStatus?.(ERROR_MESSAGES.FILE_NOT_FOUND);
    
    try {
      await runScan(context);
      
      // Poll for scan completion with 30-second timeout and progress reporting
      const scanCompleted = await pollForFile(dataFilePath, 30000, (elapsed, remaining) => {
        const remainingSeconds = Math.ceil(remaining / 1000);
        onStatus?.(`Scanning project... (${remainingSeconds}s remaining)`);
      });
      
      if (!scanCompleted) {
        throw new Error(ERROR_MESSAGES.SCAN_TIMEOUT);
      }
    } catch (error) {
      if (error instanceof Error && error.message === ERROR_MESSAGES.SCAN_TIMEOUT) {
        throw error;
      }
      throw new Error(ERROR_MESSAGES.SCAN_FAILED);
    }
  }

  // Check file size and provide status for large files
  const { isLarge, sizeInMB } = checkFileSize(dataFilePath);
  if (isLarge) {
    onStatus?.(`${ERROR_MESSAGES.FILE_TOO_LARGE} (${sizeInMB.toFixed(1)}MB)`);
  }

  // Read and parse dependency data with progress indication for large files
  let rawData: string;
  try {
    if (isLarge) {
      onStatus?.('Reading large dependency file...');
    }
    rawData = fs.readFileSync(dataFilePath, 'utf8');
  } catch (error) {
    throw new Error(ERROR_MESSAGES.READ_ERROR);
  }

  let depResult: DepCruiseResult;
  try {
    if (isLarge) {
      onStatus?.('Parsing dependency data...');
    }
    depResult = JSON.parse(rawData);
  } catch (error) {
    throw new Error(ERROR_MESSAGES.PARSE_ERROR);
  }

  // Validate the parsed data structure
  if (!depResult.depcruise || !Array.isArray(depResult.depcruise.modules)) {
    throw new Error(ERROR_MESSAGES.PARSE_ERROR);
  }

  // Transform to graph format with progress indication for large datasets
  try {
    const moduleCount = depResult.depcruise.modules.length;
    if (moduleCount > 200) {
      onStatus?.(`Processing ${moduleCount} modules...`);
    }
    
    const result = transformDepCruise(depResult, workspaceRoot);
    
    // Provide final status for large graphs
    if (result.nodes.length > 200) {
      onStatus?.(`Rendering graph with ${result.nodes.length} nodes...`);
    }
    
    return result;
  } catch (error) {
    throw new Error(ERROR_MESSAGES.PARSE_ERROR);
  }
}