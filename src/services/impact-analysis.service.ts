import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { loadGraphData, GraphData } from './graph-data.service.js';

/**
 * Result of impact analysis computation
 * Requirements: 1.1, 1.2
 */
export interface ImpactResult {
  affectedFiles: string[];
  sourceFile: string;
  traversalStats?: {
    nodesVisited: number;
    edgesTraversed: number;
    maxDepth: number;
  };
}

/**
 * Normalizes file path to workspace-relative format matching GraphData node IDs
 * Requirements: 5.3, 6.3
 */
function normalizeFilePath(filePath: string, workspaceRoot: string): string {
  try {
    // Handle absolute paths by making them relative to workspace
    if (path.isAbsolute(filePath)) {
      const relativePath = path.relative(workspaceRoot, filePath);
      // Ensure the path is within the workspace (security check)
      if (relativePath.startsWith('..')) {
        throw new Error(`File path '${filePath}' is outside the workspace`);
      }
      return relativePath;
    }
    
    // Handle relative paths by normalizing them
    const normalizedPath = path.normalize(filePath);
    
    // Additional security check for relative paths
    if (normalizedPath.startsWith('..')) {
      throw new Error(`File path '${filePath}' attempts to access parent directories`);
    }
    
    return normalizedPath;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Invalid file path: ${filePath}`);
  }
}

/**
 * Validates workspace exists and returns workspace root path
 * Requirements: 6.2, 6.4
 */
function validateWorkspace(): string {
  try {
    if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
      throw new Error('No workspace folder open. Please open a project folder in VS Code to analyze impact.');
    }
    
    const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
    
    // Validate that workspace root exists and is accessible
    if (!fs.existsSync(workspaceRoot)) {
      throw new Error(`Workspace folder '${workspaceRoot}' does not exist or is not accessible.`);
    }
    
    return workspaceRoot;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to validate workspace. Please ensure a valid project folder is open.');
  }
}

/**
 * Builds adjacency map from GraphData edges for efficient traversal
 * Requirements: 5.1, 5.2
 */
function buildAdjacencyMap(graphData: GraphData): Map<string, string[]> {
  const adjacencyMap = new Map<string, string[]>();
  
  // Initialize map with all nodes to ensure isolated nodes are included
  for (const node of graphData.nodes) {
    adjacencyMap.set(node.id, []);
  }
  
  // Build adjacency relationships from edges
  // Following "children" direction (importer → imported)
  for (const edge of graphData.edges) {
    const sourceId = edge.source;
    const targetId = edge.target;
    
    if (!adjacencyMap.has(sourceId)) {
      adjacencyMap.set(sourceId, []);
    }
    
    adjacencyMap.get(sourceId)!.push(targetId);
  }
  
  return adjacencyMap;
}

/**
 * Performs BFS traversal to find all files affected by changes to the source file
 * Requirements: 5.1, 5.2, 5.4, 5.5, 5.6
 */
function performBFSTraversal(
  sourceFileId: string,
  adjacencyMap: Map<string, string[]>
): { affectedFiles: string[]; traversalStats: ImpactResult['traversalStats'] } {
  const visited = new Set<string>();
  const queue: Array<{ nodeId: string; depth: number }> = [];
  const affectedFiles: string[] = [];
  
  let edgesTraversed = 0;
  let maxDepth = 0;
  
  // Start BFS from source file
  queue.push({ nodeId: sourceFileId, depth: 0 });
  visited.add(sourceFileId);
  affectedFiles.push(sourceFileId); // Include source file in results
  
  while (queue.length > 0) {
    const { nodeId, depth } = queue.shift()!;
    maxDepth = Math.max(maxDepth, depth);
    
    // Get adjacent nodes (dependencies)
    const adjacentNodes = adjacencyMap.get(nodeId) || [];
    
    for (const adjacentNodeId of adjacentNodes) {
      edgesTraversed++;
      
      // Prevent infinite loops by tracking visited nodes
      if (!visited.has(adjacentNodeId)) {
        visited.add(adjacentNodeId);
        affectedFiles.push(adjacentNodeId);
        queue.push({ nodeId: adjacentNodeId, depth: depth + 1 });
      }
    }
  }
  
  return {
    affectedFiles,
    traversalStats: {
      nodesVisited: visited.size,
      edgesTraversed,
      maxDepth
    }
  };
}

/**
 * Checks if file exists on disk within workspace
 * Requirements: 6.1
 */
function checkFileExistsOnDisk(filePath: string, workspaceRoot: string): boolean {
  try {
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(workspaceRoot, filePath);
    
    // Security check: ensure the resolved path is within workspace
    const relativePath = path.relative(workspaceRoot, absolutePath);
    if (relativePath.startsWith('..')) {
      return false; // File is outside workspace
    }
    
    return fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile();
  } catch (error) {
    // Log error for debugging but return false gracefully
    console.warn(`Error checking file existence for '${filePath}':`, error);
    return false;
  }
}

/**
 * Resolve the best matching node id in the graph for a given (possibly imprecise) workspace-relative path.
 * Heuristics:
 *  - exact id match
 *  - case-insensitive id match
 *  - extension swaps (.js<->.ts, .jsx<->.tsx)
 *  - basename-only (case-insensitive) with best directory match when unique
 */
function resolveSourceIdInGraph(graphData: GraphData, normalizedFilePath: string): string | null {
  const ids = graphData.nodes.map(n => n.id);
  const idSet = new Set(ids);
  if (idSet.has(normalizedFilePath)) {
    return normalizedFilePath;
  }

  const lowerToOriginal = new Map<string, string>();
  for (const id of ids) {
    const lower = id.toLowerCase();
    if (!lowerToOriginal.has(lower)) lowerToOriginal.set(lower, id);
  }

  const lowerNorm = normalizedFilePath.toLowerCase();
  if (lowerToOriginal.has(lowerNorm)) {
    return lowerToOriginal.get(lowerNorm)!;
  }

  // Try extension swaps
  const ext = path.extname(normalizedFilePath).toLowerCase();
  const dir = path.posix.dirname(normalizedFilePath);
  const base = path.basename(normalizedFilePath, ext);
  const swapPairs: Record<string, string> = { '.js': '.ts', '.ts': '.js', '.jsx': '.tsx', '.tsx': '.jsx' };
  if (swapPairs[ext]) {
    const swapped = path.posix.join(dir, `${base}${swapPairs[ext]}`);
    if (idSet.has(swapped)) return swapped;
    const swappedLower = swapped.toLowerCase();
    if (lowerToOriginal.has(swappedLower)) return lowerToOriginal.get(swappedLower)!;
  }

  // Basename-only (case-insensitive) heuristic
  const targetBaseLower = base.toLowerCase();
  const byBasename = new Map<string, string[]>();
  for (const id of ids) {
    const idExt = path.extname(id);
    const idBaseLower = path.basename(id, idExt).toLowerCase();
    const arr = byBasename.get(idBaseLower) ?? [];
    arr.push(id);
    byBasename.set(idBaseLower, arr);
  }
  const candidates = byBasename.get(targetBaseLower) ?? [];
  if (candidates.length === 1) {
    return candidates[0];
  }
  if (candidates.length > 1) {
    const dirLower = dir.toLowerCase();
    // Prefer candidate with the closest directory match
    const scored = candidates.map(id => {
      const idDirLower = path.posix.dirname(id).toLowerCase();
      // simple scoring: length of common suffix match
      let score = 0;
      const minLen = Math.min(idDirLower.length, dirLower.length);
      for (let i = 0; i < minLen; i++) {
        const a = idDirLower[idDirLower.length - 1 - i];
        const b = dirLower[dirLower.length - 1 - i];
        if (a === b) score++; else break;
      }
      return { id, score };
    });
    scored.sort((a, b) => b.score - a.score);
    if (scored[0].score > 0) return scored[0].id;
    return scored[0].id; // fallback to first candidate
  }

  return null;
}

/**
 * Main function to compute dependency impact for a given file
 * Requirements: 1.1, 1.2, 1.4, 1.5, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.1, 6.2, 6.4, 6.5
 */
export async function computeImpact(
  context: vscode.ExtensionContext,
  filePath: string
): Promise<ImpactResult> {
  try {
    // Validate workspace exists
    const workspaceRoot = validateWorkspace();
    
    // Normalize file path to workspace-relative format
    const normalizedFilePath = normalizeFilePath(filePath, workspaceRoot);
    
    // Load graph data with automatic scanning if needed
    let graphData: GraphData;
    try {
      graphData = await loadGraphData(context);
    } catch (error) {
      if (error instanceof Error) {
        // Provide specific error messages for different failure scenarios
        // Requirements: 1.5, 6.2
        if (error.message.includes('No workspace folder open')) {
          throw new Error('No workspace folder open. Please open a project folder in VS Code to analyze impact.');
        }
        if (error.message.includes('Dependency data not found') || 
            error.message.includes('No dependency data available')) {
          throw new Error('No dependency data available. Please run "Constellation: Scan Dependencies" from the Command Palette to analyze your project structure first.');
        }
        if (error.message.includes('timeout') || error.message.includes('timed out')) {
          throw new Error('Dependency scan timed out. For large projects, try running "Constellation: Scan Dependencies" manually from the Command Palette with a longer timeout.');
        }
        if (error.message.includes('permission') || error.message.includes('EACCES')) {
          throw new Error('Permission denied accessing project files. Please check file permissions and try again.');
        }
        if (error.message.includes('ENOENT') || error.message.includes('not found')) {
          throw new Error('Project files not found. Please ensure the workspace contains valid source code files.');
        }
        // Pass through the original error message with additional context
        throw new Error(`Failed to load dependency data: ${error.message}. Try running "Constellation: Scan Dependencies" from the Command Palette.`);
      }
      throw new Error('Failed to load dependency data due to an unknown error. Please ensure your project has been scanned using "Constellation: Scan Dependencies".');
    }
    
    // Build adjacency map for efficient traversal
    const adjacencyMap = buildAdjacencyMap(graphData);

    // Try to resolve to an existing node id if the provided path isn't present as-is
    const resolvedSourceId = resolveSourceIdInGraph(graphData, normalizedFilePath);
    
    // Check if file exists in dependency graph (after heuristic resolution)
    if (!resolvedSourceId || !adjacencyMap.has(resolvedSourceId)) {
      // Check if file exists on disk but not in graph
      // Requirements: 1.4, 6.1
      const fileExistsOnDisk = checkFileExistsOnDisk(normalizedFilePath, workspaceRoot);
      
      if (fileExistsOnDisk) {
        // File exists on disk but not in dependency graph
        // This can happen for files that aren't part of the dependency analysis
        // (e.g., config files, documentation, etc.)
        // Return the file with appropriate message (requirement 6.1)
        console.log(`File '${normalizedFilePath}' exists on disk but not in dependency graph. It may not have dependencies or be excluded from analysis.`);
        return {
          affectedFiles: [normalizedFilePath],
          sourceFile: normalizedFilePath,
          traversalStats: {
            nodesVisited: 1,
            edgesTraversed: 0,
            maxDepth: 0
          }
        };
      } else {
        // File not found in graph and doesn't exist on disk
        // Return empty list with appropriate message (requirement 1.4)
        console.log(`File '${normalizedFilePath}' not found in dependency graph or on disk.`);
        return {
          affectedFiles: [],
          sourceFile: normalizedFilePath,
          traversalStats: {
            nodesVisited: 0,
            edgesTraversed: 0,
            maxDepth: 0
          }
        };
      }
    }
    
    // Perform BFS traversal to find affected files
    const { affectedFiles, traversalStats } = performBFSTraversal(resolvedSourceId, adjacencyMap);
    
    // Performance consideration for large graphs (requirement 6.4)
    // The actual performance optimization happens in the UI layer,
    // but we ensure our service doesn't cause additional overhead
    return {
      affectedFiles,
      sourceFile: resolvedSourceId,
      traversalStats
    };
    
  } catch (error) {
    // Handle workspace and scan failures with proper error propagation
    // Requirements: 6.2, 6.4, 6.5
    if (error instanceof Error) {
      // Log the error for debugging while preserving the user-friendly message
      console.error('Impact analysis error:', error);
      throw error;
    }
    
    // Handle unexpected error types
    console.error('Unexpected error during impact analysis:', error);
    throw new Error('An unexpected error occurred during impact analysis. Please try again or check the VS Code output panel for details.');
  }
}