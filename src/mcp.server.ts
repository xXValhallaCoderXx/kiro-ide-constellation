import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { DEFAULT_SERVER_ID, getServerIdFromEnv } from "./shared/constants.js";
import * as fs from 'fs';
import * as path from 'path';

const SERVER_ID = getServerIdFromEnv() ?? DEFAULT_SERVER_ID;

const server = new McpServer({
  name: SERVER_ID,
  version: "0.0.1",
});

// Graph Context Service
// Requirements: 3.1, 3.2, 4.1, 7.3

import type { GraphNode, GraphEdge, GraphData } from "./shared/graph.types.js";

interface GraphContext {
  seedId: string | null;
  relatedFiles: string[];
  depth: number;
  limit: number;
}

// Dependency cruiser input format (mirror of src/services/graph-data.service.ts expectations)
interface DepCruiseResult {
  version: 1;
  generatedAt: string;
  workspaceRoot: string;
  depcruise: {
    modules: Array<{
      source: string;
      dependencies: Array<{
        resolved: string;
        dependencyTypes: string[];
      }>;
    }>;
  };
}

/**
 * Graph Context Service - handles graph file reading and processing within MCP server
 * Requirements: 3.1, 3.2, 4.1, 7.3
 */
class GraphContextService {
  private workspaceRoot: string | null = null;
  private graphData: GraphData | null = null;
  private forwardAdjacencyMap: Map<string, string[]> | null = null;
  private reverseAdjacencyMap: Map<string, string[]> | null = null;

  constructor() {
    // Get workspace root from environment variable injected by MCP config service
    // Requirement: 3.1
    this.workspaceRoot = process.env.CONSTELLATION_WORKSPACE_ROOT || null;
  }

  /**
   * Validates file size and provides warnings for large files (>5MB)
   * Requirement: 7.3
   */
  private validateFileSize(filePath: string): { isValid: boolean; sizeInMB: number; warning?: string } {
    try {
      const stats = fs.statSync(filePath);
      const sizeInMB = stats.size / (1024 * 1024);
      
      if (sizeInMB > 5) {
        return {
          isValid: true,
          sizeInMB,
          warning: `Large graph file detected (${sizeInMB.toFixed(1)}MB). Processing may take longer.`
        };
      }
      
      return { isValid: true, sizeInMB };
    } catch (error) {
      return { isValid: false, sizeInMB: 0 };
    }
  }

  /**
   * Reads and parses graph file with comprehensive error handling
   * Requirements: 3.1, 3.2
   */
  private async readGraphFile(): Promise<GraphData> {
    if (!this.workspaceRoot) {
      throw new Error('No workspace root available. Ensure CONSTELLATION_WORKSPACE_ROOT environment variable is set.');
    }

    const graphFilePath = path.join(this.workspaceRoot, '.constellation', 'data', 'codebase-dependencies.json');
    
    // Check if file exists
    if (!fs.existsSync(graphFilePath)) {
      throw new Error('Graph file not found. Dependency scan may be required.');
    }

    // Validate file size
    const sizeValidation = this.validateFileSize(graphFilePath);
    if (!sizeValidation.isValid) {
      throw new Error('Cannot read graph file. File may be corrupted or inaccessible.');
    }

    if (sizeValidation.warning) {
      console.warn('Graph Context Service:', sizeValidation.warning);
    }

    // Read file with error handling
    let rawData: string;
    try {
      rawData = fs.readFileSync(graphFilePath, 'utf8');
    } catch (error) {
      throw new Error(`Failed to read graph file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Parse JSON with error handling for malformed data
    // Requirement: 3.2
    let depResult: DepCruiseResult;
    try {
      depResult = JSON.parse(rawData);
    } catch (error) {
      throw new Error('Failed to parse graph file. The file may be corrupted or contain invalid JSON.');
    }

    // Validate structure
    if (!depResult.depcruise || !Array.isArray(depResult.depcruise.modules)) {
      throw new Error('Invalid graph file format. Expected dependency-cruiser output format.');
    }

    // Transform to internal graph format
    return this.transformDepCruiseToGraph(depResult);
  }

  /**
   * Transforms dependency-cruiser output to internal graph format
   * Requirement: 4.1
   */
  private transformDepCruiseToGraph(depResult: DepCruiseResult): GraphData {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const nodeSet = new Set<string>();

    // Process modules to create nodes and edges
    for (const module of depResult.depcruise.modules) {
      const sourcePath = module.source;
      const sourceId = this.workspaceRoot ? path.relative(this.workspaceRoot, sourcePath) : sourcePath;
      
      // Add source node if not already added
      if (!nodeSet.has(sourceId)) {
        nodeSet.add(sourceId);
        nodes.push({
          id: sourceId,
          label: path.basename(sourcePath),
          type: this.getFileType(sourcePath)
        });
      }

      // Process dependencies
      for (const dep of module.dependencies) {
        const targetPath = dep.resolved;
        const targetId = this.workspaceRoot ? path.relative(this.workspaceRoot, targetPath) : targetPath;
        
        // Add target node if not already added
        if (!nodeSet.has(targetId)) {
          nodeSet.add(targetId);
          nodes.push({
            id: targetId,
            label: path.basename(targetPath),
            type: this.getFileType(targetPath)
          });
        }

        // Create edge
        edges.push({
          source: sourceId,
          target: targetId,
          type: this.mapDependencyType(dep.dependencyTypes)
        });
      }
    }

    return {
      nodes,
      edges,
      metadata: {
        scanTime: depResult.generatedAt,
        fileCount: nodes.length,
        dependencyCount: edges.length
      }
    };
  }

  /**
   * Maps dependency types to simplified categories
   */
  private mapDependencyType(types: string[]): string {
    if (types.includes('esm') || types.includes('es6')) { return 'import'; }
    if (types.includes('cjs') || types.includes('commonjs')) { return 'require'; }
    if (types.includes('dynamic')) { return 'dynamic'; }
    return 'unknown';
  }

  /**
   * Determines file type based on extension
   */
  private getFileType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.ts': return 'typescript';
      case '.js': return 'javascript';
      case '.tsx': return 'tsx';
      case '.jsx': return 'jsx';
      case '.json': return 'json';
      case '.md': return 'markdown';
      default: return 'other';
    }
  }

  /**
   * Builds adjacency maps for forward and reverse dependency relationships
   * Requirement: 4.1
   */
  private buildAdjacencyMaps(graphData: GraphData): {
    forward: Map<string, string[]>;
    reverse: Map<string, string[]>;
  } {
    const forward = new Map<string, string[]>();
    const reverse = new Map<string, string[]>();

    // Initialize maps with all nodes
    for (const node of graphData.nodes) {
      forward.set(node.id, []);
      reverse.set(node.id, []);
    }

    // Build adjacency relationships from edges
    for (const edge of graphData.edges) {
      const sourceId = edge.source;
      const targetId = edge.target;
      
      // Forward: source -> target (what this file imports)
      if (!forward.has(sourceId)) {
        forward.set(sourceId, []);
      }
      forward.get(sourceId)!.push(targetId);
      
      // Reverse: target -> source (what imports this file)
      if (!reverse.has(targetId)) {
        reverse.set(targetId, []);
      }
      reverse.get(targetId)!.push(sourceId);
    }

    return { forward, reverse };
  }

  /**
   * Loads graph data and builds adjacency maps
   * Requirements: 3.1, 3.2, 4.1
   */
  async loadGraph(): Promise<void> {
    try {
      this.graphData = await this.readGraphFile();
      const adjacencyMaps = this.buildAdjacencyMaps(this.graphData);
      this.forwardAdjacencyMap = adjacencyMaps.forward;
      this.reverseAdjacencyMap = adjacencyMaps.reverse;
    } catch (error) {
      // Reset state on error
      this.graphData = null;
      this.forwardAdjacencyMap = null;
      this.reverseAdjacencyMap = null;
      throw error;
    }
  }

  /**
   * Gets the loaded graph data
   */
  getGraphData(): GraphData | null {
    return this.graphData;
  }

  /**
   * Gets forward adjacency map (what this file imports)
   */
  getForwardAdjacencyMap(): Map<string, string[]> | null {
    return this.forwardAdjacencyMap;
  }

  /**
   * Gets reverse adjacency map (what imports this file)
   */
  getReverseAdjacencyMap(): Map<string, string[]> | null {
    return this.reverseAdjacencyMap;
  }

  /**
   * Checks if graph data is loaded
   */
  isLoaded(): boolean {
    return this.graphData !== null && this.forwardAdjacencyMap !== null && this.reverseAdjacencyMap !== null;
  }

  /**
   * Gets workspace root path
   */
  getWorkspaceRoot(): string | null {
    return this.workspaceRoot;
  }
}

// Seed Resolution Engine
// Requirements: 1.1, 1.2, 1.4

/**
 * Seed resolution heuristics interface
 */
interface SeedResolutionHeuristics {
  exactMatch(seedPath: string, nodeIds: string[]): string | null;
  caseInsensitiveMatch(seedPath: string, nodeIds: string[]): string | null;
  extensionSwaps(seedPath: string, nodeIds: string[]): string | null;
  basenameScoring(seedPath: string, nodeIds: string[]): string | null;
  topicMatching(topic: string, nodeIds: string[]): string | null;
}

/**
 * Seed Resolution Engine - implements heuristic matching for file and topic resolution
 * Reuses resolution logic patterns from impact-analysis.service.ts for consistency
 * Requirements: 1.1, 1.2, 1.4
 */
class SeedResolutionEngine implements SeedResolutionHeuristics {
  
  /**
   * Exact match resolver for direct node ID lookup
   * Requirement: 1.1
   */
  exactMatch(seedPath: string, nodeIds: string[]): string | null {
    const nodeSet = new Set(nodeIds);
    return nodeSet.has(seedPath) ? seedPath : null;
  }

  /**
   * Case-insensitive matching with lowercase comparison
   * Requirement: 1.1
   */
  caseInsensitiveMatch(seedPath: string, nodeIds: string[]): string | null {
    const lowerToOriginal = new Map<string, string>();
    for (const id of nodeIds) {
      const lower = id.toLowerCase();
      if (!lowerToOriginal.has(lower)) {
        lowerToOriginal.set(lower, id);
      }
    }

    const lowerSeed = seedPath.toLowerCase();
    return lowerToOriginal.get(lowerSeed) || null;
  }

  /**
   * Extension swap logic (.js↔.ts, .jsx↔.tsx) for TypeScript/JavaScript projects
   * Requirement: 1.1
   */
  extensionSwaps(seedPath: string, nodeIds: string[]): string | null {
    const nodeSet = new Set(nodeIds);
    const lowerToOriginal = new Map<string, string>();
    for (const id of nodeIds) {
      const lower = id.toLowerCase();
      if (!lowerToOriginal.has(lower)) {
        lowerToOriginal.set(lower, id);
      }
    }

    const ext = path.extname(seedPath).toLowerCase();
    const dir = path.posix.dirname(seedPath);
    const base = path.basename(seedPath, ext);
    
    // Extension swap pairs for TypeScript/JavaScript projects
    const swapPairs: Record<string, string> = { 
      '.js': '.ts', 
      '.ts': '.js', 
      '.jsx': '.tsx', 
      '.tsx': '.jsx' 
    };
    
    if (swapPairs[ext]) {
      const swapped = path.posix.join(dir, `${base}${swapPairs[ext]}`);
      
      // Try exact match first
      if (nodeSet.has(swapped)) {
        return swapped;
      }
      
      // Try case-insensitive match
      const swappedLower = swapped.toLowerCase();
      if (lowerToOriginal.has(swappedLower)) {
        return lowerToOriginal.get(swappedLower)!;
      }
    }
    
    return null;
  }

  /**
   * Basename scoring algorithm with directory path similarity
   * Requirement: 1.2
   */
  basenameScoring(seedPath: string, nodeIds: string[]): string | null {
    const ext = path.extname(seedPath);
    const base = path.basename(seedPath, ext);
    const dir = path.posix.dirname(seedPath);
    
    const targetBaseLower = base.toLowerCase();
    const dirLower = dir.toLowerCase();
    
    // Group candidates by basename (case-insensitive)
    const byBasename = new Map<string, string[]>();
    for (const id of nodeIds) {
      const idExt = path.extname(id);
      const idBaseLower = path.basename(id, idExt).toLowerCase();
      const arr = byBasename.get(idBaseLower) ?? [];
      arr.push(id);
      byBasename.set(idBaseLower, arr);
    }
    
    const candidates = byBasename.get(targetBaseLower) ?? [];
    
    // If only one candidate, return it
    if (candidates.length === 1) {
      return candidates[0];
    }
    
    // If multiple candidates, score by directory path similarity
    if (candidates.length > 1) {
      const scored = candidates.map(id => {
        const idDirLower = path.posix.dirname(id).toLowerCase();
        
        // Simple scoring: length of common suffix match
        let score = 0;
        const minLen = Math.min(idDirLower.length, dirLower.length);
        for (let i = 0; i < minLen; i++) {
          const a = idDirLower[idDirLower.length - 1 - i];
          const b = dirLower[dirLower.length - 1 - i];
          if (a === b) {
            score++;
          } else {
            break;
          }
        }
        return { id, score };
      });
      
      // Sort by score (highest first)
      scored.sort((a, b) => b.score - a.score);
      
      // Return best match (or first if no good score)
      if (scored[0].score > 0) {
        return scored[0].id;
      }
      return scored[0].id; // fallback to first candidate
    }
    
    return null;
  }

  /**
   * Topic-to-file matching using substring and path scoring
   * Requirement: 1.4
   */
  topicMatching(topic: string, nodeIds: string[]): string | null {
    const topicLower = topic.toLowerCase();
    const candidates: Array<{ id: string; score: number }> = [];
    
    for (const id of nodeIds) {
      const idLower = id.toLowerCase();
      let score = 0;
      
      // Substring matching in path
      if (idLower.includes(topicLower)) {
        score += 10; // High score for exact substring match
      }
      
      // Substring matching in basename
      const basename = path.basename(id).toLowerCase();
      if (basename.includes(topicLower)) {
        score += 15; // Higher score for basename match
      }
      
      // Word boundary matching (topic as separate word)
      const words = topicLower.split(/\s+/);
      for (const word of words) {
        if (word.length > 2) { // Skip very short words
          const wordRegex = new RegExp(`\\b${word}\\b`, 'i');
          if (wordRegex.test(id)) {
            score += 5; // Bonus for word boundary match
          }
        }
      }
      
      // Path segment matching
      const pathSegments = id.split('/').map(s => s.toLowerCase());
      for (const segment of pathSegments) {
        if (segment.includes(topicLower)) {
          score += 3; // Bonus for path segment match
        }
      }
      
      if (score > 0) {
        candidates.push({ id, score });
      }
    }
    
    if (candidates.length === 0) {
      return null;
    }
    
    // Sort by score (highest first) and return best match
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0].id;
  }

  /**
   * Main resolution method that tries all heuristics in order
   * Reuses resolution logic patterns from impact-analysis.service.ts
   * Requirements: 1.1, 1.2, 1.4
   */
  resolveSeed(seed: string, nodeIds: string[], isTopic: boolean = false): string | null {
    // If it's explicitly a topic, use topic matching
    if (isTopic) {
      return this.topicMatching(seed, nodeIds);
    }
    
    // For file paths, try heuristics in order of precision
    
    // 1. Exact match (highest precision)
    let result = this.exactMatch(seed, nodeIds);
    if (result) return result;
    
    // 2. Case-insensitive match
    result = this.caseInsensitiveMatch(seed, nodeIds);
    if (result) return result;
    
    // 3. Extension swaps for TypeScript/JavaScript projects
    result = this.extensionSwaps(seed, nodeIds);
    if (result) return result;
    
    // 4. Basename scoring with directory similarity
    result = this.basenameScoring(seed, nodeIds);
    if (result) return result;
    
    // 5. Fallback to topic matching for file paths that might be partial
    result = this.topicMatching(seed, nodeIds);
    if (result) return result;
    
    return null;
  }
}

// BFS Traversal Engine
// Requirements: 4.1, 4.2, 4.3, 4.4

/**
 * Configuration for BFS traversal
 */
interface TraversalConfig {
  depth: number; // Default: 1
  limit: number; // Default: 30
  direction: 'forward' | 'reverse' | 'union'; // Default: 'union'
}

/**
 * Statistics from BFS traversal
 */
interface TraversalStats {
  nodesVisited: number;
  edgesTraversed: number;
  maxDepth: number;
}

/**
 * Result from BFS traversal
 */
interface TraversalResult {
  relatedFiles: string[];
  stats: TraversalStats;
}

/**
 * BFS Traversal Engine - performs breadth-first search over dependency graphs
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */
class BfsTraversalEngine {
  
  /**
   * Performs breadth-first search over union graph (forward ∪ reverse edges)
   * Requirements: 4.1, 4.2, 4.3, 4.4
   */
  traverse(
    seedId: string,
    forwardMap: Map<string, string[]>,
    reverseMap: Map<string, string[]>,
    config: TraversalConfig = { depth: 1, limit: 30, direction: 'union' }
  ): TraversalResult {
    // Initialize traversal state
    const visited = new Set<string>();
    const queue: Array<{ nodeId: string; depth: number; degree: number }> = [];
    const results: Array<{ nodeId: string; depth: number; degree: number }> = [];
    
    // Statistics tracking
    let nodesVisited = 0;
    let edgesTraversed = 0;
    let maxDepthReached = 0;
    
    // Add seed node to queue (depth 0)
    const seedDegree = this.calculateNodeDegree(seedId, forwardMap, reverseMap);
    queue.push({ nodeId: seedId, depth: 0, degree: seedDegree });
    visited.add(seedId);
    
    // BFS traversal with depth limiting
    // Requirement: 4.2
    while (queue.length > 0) {
      const current = queue.shift()!;
      nodesVisited++;
      maxDepthReached = Math.max(maxDepthReached, current.depth);
      
      // Skip if we've reached the depth limit
      if (current.depth >= config.depth) {
        continue;
      }
      
      // Get neighbors based on direction configuration
      const neighbors = this.getNeighbors(current.nodeId, forwardMap, reverseMap, config.direction);
      
      // Process each neighbor
      for (const neighborId of neighbors) {
        edgesTraversed++;
        
        // Cycle detection to prevent infinite loops
        // Requirement: 4.3
        if (visited.has(neighborId)) {
          continue;
        }
        
        visited.add(neighborId);
        const neighborDepth = current.depth + 1;
        const neighborDegree = this.calculateNodeDegree(neighborId, forwardMap, reverseMap);
        
        // Add to queue for further exploration (if within depth limit)
        if (neighborDepth < config.depth) {
          queue.push({ nodeId: neighborId, depth: neighborDepth, degree: neighborDegree });
        }
        
        // Add to results (excluding the seed node itself)
        if (neighborId !== seedId) {
          results.push({ nodeId: neighborId, depth: neighborDepth, degree: neighborDegree });
        }
      }
    }
    
    // Ranking by distance (depth) first, then by node degree
    // Requirement: 4.4
    results.sort((a, b) => {
      // Primary sort: by depth (distance from seed)
      if (a.depth !== b.depth) {
        return a.depth - b.depth;
      }
      // Secondary sort: by degree (higher degree = more connected = more important)
      return b.degree - a.degree;
    });
    
    // Result limiting with configurable maximum results
    // Requirement: 4.4
    const limitedResults = results.slice(0, config.limit);
    
    return {
      relatedFiles: limitedResults.map(r => r.nodeId),
      stats: {
        nodesVisited,
        edgesTraversed,
        maxDepth: maxDepthReached
      }
    };
  }
  
  /**
   * Gets neighbors for a node based on direction configuration
   * Requirement: 4.1
   */
  private getNeighbors(
    nodeId: string,
    forwardMap: Map<string, string[]>,
    reverseMap: Map<string, string[]>,
    direction: 'forward' | 'reverse' | 'union'
  ): string[] {
    const neighbors = new Set<string>();
    
    switch (direction) {
      case 'forward':
        // Only what this file imports
        const forwardNeighbors = forwardMap.get(nodeId) || [];
        forwardNeighbors.forEach(n => neighbors.add(n));
        break;
        
      case 'reverse':
        // Only what imports this file
        const reverseNeighbors = reverseMap.get(nodeId) || [];
        reverseNeighbors.forEach(n => neighbors.add(n));
        break;
        
      case 'union':
      default:
        // Union graph (forward ∪ reverse edges)
        // Requirement: 4.1
        const forwardUnion = forwardMap.get(nodeId) || [];
        const reverseUnion = reverseMap.get(nodeId) || [];
        forwardUnion.forEach(n => neighbors.add(n));
        reverseUnion.forEach(n => neighbors.add(n));
        break;
    }
    
    return Array.from(neighbors);
  }
  
  /**
   * Calculates node degree (total connections) for ranking
   * Requirement: 4.4
   */
  private calculateNodeDegree(
    nodeId: string,
    forwardMap: Map<string, string[]>,
    reverseMap: Map<string, string[]>
  ): number {
    const forwardDegree = (forwardMap.get(nodeId) || []).length;
    const reverseDegree = (reverseMap.get(nodeId) || []).length;
    return forwardDegree + reverseDegree;
  }
}

// Initialize services
const graphContextService = new GraphContextService();
const seedResolutionEngine = new SeedResolutionEngine();
const bfsTraversalEngine = new BfsTraversalEngine();

// HTTP Bridge Client functionality for MCP server
// Requirements: 2.1, 2.2, 5.5, 8.3

/**
 * HTTP client for calling POST /scan endpoint when graph file is missing
 * Requirements: 2.1, 2.2, 5.5, 8.3
 */
async function triggerScanViaHttpBridge(): Promise<boolean> {
  try {
    const port = process.env.CONSTELLATION_BRIDGE_PORT;
    const token = process.env.CONSTELLATION_BRIDGE_TOKEN;
    
    if (!port || !token) {
      console.warn('MCP server: HTTP bridge environment variables not available for scan trigger');
      return false;
    }

    // Call POST /scan endpoint with proper authentication
    // Requirement: 5.5
    const response = await fetch(`http://127.0.0.1:${port}/scan`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    if (response.ok) {
      const result = await response.json() as { status?: string };
      return result.status === 'ok';
    } else if (response.status === 504) {
      // Timeout - scan was attempted but timed out
      console.warn('MCP server: Dependency scan timed out');
      return false;
    } else {
      console.warn(`MCP server: Scan request failed with status ${response.status}`);
      return false;
    }

  } catch (error) {
    // Handle network errors and timeouts gracefully
    // Requirement: 8.3
    console.warn('MCP server: Failed to trigger scan via HTTP bridge:', error);
    return false;
  }
}

/**
 * Loads graph data with automatic scan triggering when file is missing
 * Requirements: 2.1, 2.2
 */
async function loadGraphWithScanFallback(): Promise<void> {
  try {
    // First attempt to load existing graph data
    await graphContextService.loadGraph();
    return; // Success - graph loaded
  } catch (error) {
    // Check if error is due to missing graph file
    if (error instanceof Error && error.message.includes('Graph file not found')) {
      console.log('MCP server: Graph file missing, triggering dependency scan...');
      
      // Trigger scan once via HTTP bridge
      // Requirement: 2.1
      const scanSuccess = await triggerScanViaHttpBridge();
      
      if (scanSuccess) {
        // Retry graph file reading after successful scan
        // Requirement: 2.2
        try {
          await graphContextService.loadGraph();
          console.log('MCP server: Graph loaded successfully after scan');
          return;
        } catch (retryError) {
          console.warn('MCP server: Failed to load graph after scan:', retryError);
          throw retryError;
        }
      } else {
        console.warn('MCP server: Scan failed or timed out, proceeding without graph context');
        throw new Error('Graph file missing and scan failed');
      }
    } else {
      // Re-throw other errors (parsing errors, permission issues, etc.)
      throw error;
    }
  }
}

/**
 * Computes graph context for a given request and optional seed file
 * Requirements: 1.1, 1.3, 4.1, 4.2
 */
async function computeGraphContext(request: string, seedFile?: string): Promise<GraphContext> {
  const graphData = graphContextService.getGraphData();
  const forwardMap = graphContextService.getForwardAdjacencyMap();
  const reverseMap = graphContextService.getReverseAdjacencyMap();
  
  if (!graphData || !forwardMap || !reverseMap) {
    throw new Error('Graph data not loaded');
  }

  const nodeIds = graphData.nodes.map(n => n.id);
  
  // Integrate seed resolution for both file-based and topic-based requests
  // Requirements: 1.1, 1.3
  let seedId: string | null = null;
  
  if (seedFile) {
    // File-based seed resolution
    // Requirement: 1.1
    seedId = seedResolutionEngine.resolveSeed(seedFile, nodeIds, false);
  } else {
    // Topic-based seed resolution from request
    // Requirement: 1.3
    seedId = seedResolutionEngine.resolveSeed(request, nodeIds, true);
  }

  let relatedFiles: string[] = [];
  
  if (seedId) {
    // Call BFS traversal engine to compute related files
    // Requirements: 4.1, 4.2
    const traversalResult = bfsTraversalEngine.traverse(
      seedId,
      forwardMap,
      reverseMap,
      { depth: 1, limit: 30, direction: 'union' }
    );
    
    relatedFiles = traversalResult.relatedFiles;
    
    console.log(`MCP server: Found ${relatedFiles.length} related files for seed "${seedId}"`);
  } else {
    console.log('MCP server: No seed resolved, returning empty related files');
  }

  return {
    seedId,
    relatedFiles,
    depth: 1,
    limit: 30
  };
}

/**
 * Generates enhanced plan structure based on request and graph context
 * Requirements: 6.1, 6.2
 */
function generateEnhancedPlan(request: string, context: GraphContext): any {
  const steps: any[] = [];
  
  // Always start with basic project overview
  steps.push({
    filePath: "README.md",
    lineStart: 1,
    lineEnd: 10,
    explanation: `Starting with the project overview to understand ${request}`
  });

  // If we have a seed file, include it as a key step
  if (context.seedId) {
    steps.push({
      filePath: context.seedId,
      lineStart: 1,
      lineEnd: 50,
      explanation: `Examining the main file related to ${request}`
    });
  }

  // Include related files from graph context (up to 5 most relevant)
  const maxRelatedFiles = Math.min(5, context.relatedFiles.length);
  for (let i = 0; i < maxRelatedFiles; i++) {
    const relatedFile = context.relatedFiles[i];
    steps.push({
      filePath: relatedFile,
      lineStart: 1,
      lineEnd: 30,
      explanation: `Exploring ${relatedFile} which is connected to your topic of interest`
    });
  }

  // Always include package.json for project context
  if (!steps.some(step => step.filePath === "package.json")) {
    steps.push({
      filePath: "package.json",
      lineStart: 1,
      lineEnd: 20,
      explanation: "Examining project dependencies and configuration"
    });
  }

  return {
    version: 1,
    topic: request.substring(0, 100), // Truncate topic to reasonable length
    createdAt: new Date().toISOString(),
    steps
  };
}

/**
 * Generates user-friendly summary for the plan
 * Requirements: 6.1, 6.2
 */
function generatePlanSummary(request: string, plan: any, context: GraphContext): string {
  let summary = `I've created a walkthrough plan for "${request}". This plan includes ${plan.steps.length} steps that will guide you through relevant files in your codebase.`;
  
  if (context.seedId) {
    summary += ` I found a key file (${context.seedId}) related to your topic`;
    if (context.relatedFiles.length > 0) {
      summary += ` and ${context.relatedFiles.length} related files that are connected through dependencies.`;
    } else {
      summary += `.`;
    }
  } else if (context.relatedFiles.length > 0) {
    summary += ` I found ${context.relatedFiles.length} files that might be relevant to your topic.`;
  } else {
    summary += ` The walkthrough will start with the project overview and examine key configuration files.`;
  }
  
  return summary;
}

// ping -> pong
server.registerTool(
  "ping",
  {
    title: "Ping",
    description: "Responds with 'pong'.",
    inputSchema: {},
  },
  async () => {
    // Attempt to notify the extension to open the Graph view via HTTP bridge
    try {
      const port = process.env.CONSTELLATION_BRIDGE_PORT;
      const token = process.env.CONSTELLATION_BRIDGE_TOKEN;
      if (port && token) {
        await fetch(`http://127.0.0.1:${port}/open-graph`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
    } catch {}
    return { content: [{ type: "text", text: "pong" }] };
  }
);


// constellation_onboarding.plan -> generates structured onboarding plans with graph context integration
// constellation_opensource.analyze
server.registerTool(
  "constellation_opensource.analyze",
  {
    title: "OSS Analyze",
    description: "Analyze codebase and write project-analysis.json",
    inputSchema: {},
  },
  async () => {
    try {
      const port = process.env.CONSTELLATION_BRIDGE_PORT;
      const token = process.env.CONSTELLATION_BRIDGE_TOKEN;
      if (!port || !token) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "Extension bridge not available" }) }] };
      }
      const resp = await fetch(`http://127.0.0.1:${port}/oss/analyze`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const text = await resp.text();
      return { content: [{ type: "text", text }] };
    } catch (error) {
      return { content: [{ type: "text", text: JSON.stringify({ error: (error as Error).message || 'analyze failed' }) }] };
    }
  }
);

// constellation_opensource.generateSteering
server.registerTool(
  "constellation_opensource.generateSteering",
  {
    title: "OSS Generate Steering",
    description: "Generate project steering docs in .kiro/steering",
    inputSchema: { analysisPath: z.string().optional() },
  },
  async ({ analysisPath }) => {
    try {
      const port = process.env.CONSTELLATION_BRIDGE_PORT;
      const token = process.env.CONSTELLATION_BRIDGE_TOKEN;
      if (!port || !token) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "Extension bridge not available" }) }] };
      }
      const resp = await fetch(`http://127.0.0.1:${port}/oss/generate-steering`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisPath })
      });
      const text = await resp.text();
      return { content: [{ type: "text", text }] };
    } catch (error) {
      return { content: [{ type: "text", text: JSON.stringify({ error: (error as Error).message || 'generate-steering failed' }) }] };
    }
  }
);

// constellation_opensource.fetchIssue
server.registerTool(
  "constellation_opensource.fetchIssue",
  {
    title: "OSS Fetch Issue",
    description: "Fetch GitHub issue and comments",
    inputSchema: { url: z.string() },
  },
  async ({ url }) => {
    try {
      const port = process.env.CONSTELLATION_BRIDGE_PORT;
      const token = process.env.CONSTELLATION_BRIDGE_TOKEN;
      if (!port || !token) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "Extension bridge not available" }) }] };
      }
      const resp = await fetch(`http://127.0.0.1:${port}/oss/fetch-issue`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const text = await resp.text();
      return { content: [{ type: "text", text }] };
    } catch (error) {
      return { content: [{ type: "text", text: JSON.stringify({ error: (error as Error).message || 'fetch-issue failed' }) }] };
    }
  }
);

// constellation_opensource.generatePRD
server.registerTool(
  "constellation_opensource.generatePRD",
  {
    title: "OSS Generate PRD",
    description: "Generate implementation PRD at repo root and mirror",
    inputSchema: { owner: z.string(), repo: z.string(), issueNumber: z.number() },
  },
  async ({ owner, repo, issueNumber }) => {
    try {
      const port = process.env.CONSTELLATION_BRIDGE_PORT;
      const token = process.env.CONSTELLATION_BRIDGE_TOKEN;
      if (!port || !token) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "Extension bridge not available" }) }] };
      }
      const resp = await fetch(`http://127.0.0.1:${port}/oss/generate-prd`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner, repo, issueNumber })
      });
      const text = await resp.text();
      return { content: [{ type: "text", text }] };
    } catch (error) {
      return { content: [{ type: "text", text: JSON.stringify({ error: (error as Error).message || 'generate-prd failed' }) }] };
    }
  }
);

server.registerTool(
  "constellation_onboarding.plan",
  {
    title: "Generate Onboarding Plan",
    description: "Generates a structured walkthrough plan for onboarding users to specific codebase topics",
    inputSchema: {
      request: z.string().describe("The user's request describing what they want to learn about the codebase"),
      seedFile: z.string().optional().describe("Optional specific file to focus on")
    },
  },
  async ({ request, seedFile }) => {
    // Initialize empty context as fallback
    // Requirements: 7.1, 7.2
    let context: GraphContext = {
      seedId: null,
      relatedFiles: [],
      depth: 1,
      limit: 30
    };

    try {
      // Read workspace root from environment variable injected by MCP config service
      // Requirement: 3.1
      const workspaceRoot = graphContextService.getWorkspaceRoot();
      
      if (!workspaceRoot) {
        console.warn('MCP server: No workspace root available for graph context');
        // Continue with empty context - Requirement: 7.1
      } else {
        // Attempt to load graph data with automatic scan triggering
        // Requirements: 2.1, 2.2
        try {
          await loadGraphWithScanFallback();
          
          // If graph is loaded, compute context
          if (graphContextService.isLoaded()) {
            context = await computeGraphContext(request, seedFile);
          }
        } catch (error) {
          console.warn('MCP server: Graph context computation failed:', error);
          // Continue with empty context - graceful fallback per Requirements: 7.1, 7.2
        }
      }

      // Generate plan structure based on the request and context
      const plan = generateEnhancedPlan(request, context);

      // Generate user-friendly summary
      const userSummary = generatePlanSummary(request, plan, context);

      // Enrich response format to include both plan and context fields
      // Requirement: 6.1, 6.2
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            plan,
            context,
            userSummary
          })
        }]
      };

    } catch (error) {
      console.error('MCP server: Plan generation failed:', error);
      
      let errorMessage = "Failed to generate onboarding plan";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      // Handle all error scenarios gracefully with empty relatedFiles fallback
      // Requirements: 7.1, 7.2
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            error: errorMessage,
            plan: null,
            context: {
              seedId: null,
              relatedFiles: [],
              depth: 1,
              limit: 30
            },
            userSummary: "Sorry, I couldn't generate a plan for your request. Please try again with a different topic."
          })
        }]
      };
    }
  }
);

// constellation_onboarding.commitPlan -> commits a plan and starts execution
server.registerTool(
  "constellation_onboarding.commitPlan",
  {
    title: "Commit Onboarding Plan",
    description: "Commits an onboarding plan to persistent storage and begins execution",
    inputSchema: {
      plan: z.object({
        version: z.number(),
        topic: z.string(),
        createdAt: z.string(),
        steps: z.array(z.object({
          filePath: z.string(),
          lineStart: z.number(),
          lineEnd: z.number(),
          explanation: z.string()
        }))
      }).describe("The onboarding plan to commit and execute")
    },
  },
  async ({ plan }) => {
    try {
      const port = process.env.CONSTELLATION_BRIDGE_PORT;
      const token = process.env.CONSTELLATION_BRIDGE_TOKEN;
      
      if (!port || !token) {
        console.warn('MCP server: Extension bridge environment variables not available');
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: "Extension bridge not available. Please ensure the Constellation extension is running and properly configured."
            })
          }]
        };
      }

      // Forward request to extension HTTP bridge
      const response = await fetch(`http://127.0.0.1:${port}/onboarding/commitPlan`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ plan })
      });

      if (!response.ok) {
        // Handle HTTP errors gracefully
        let errorText = "Network error";
        try {
          const responseText = await response.text();
          try {
            const errorData = JSON.parse(responseText);
            errorText = errorData.error || responseText;
          } catch {
            errorText = responseText || `HTTP ${response.status}`;
          }
        } catch {
          errorText = `HTTP ${response.status}`;
        }
        
        console.warn(`MCP server: HTTP bridge request failed with status ${response.status}:`, errorText);
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: `Request failed: ${errorText}`
            })
          }]
        };
      }

      // Parse and return the commit result
      const result = await response.json();
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result)
        }]
      };

    } catch (error) {
      console.error('MCP server: Plan commit request failed:', error);
      
      let errorMessage = "Unknown error occurred during plan commitment";
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Provide more specific error messages for common failure scenarios
        if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
          errorMessage = "Cannot connect to extension. Please ensure the Constellation extension is running.";
        } else if (error.message.includes('timeout')) {
          errorMessage = "Request timed out. The extension may be busy processing the plan.";
        } else if (error.message.includes('ENOTFOUND')) {
          errorMessage = "Network error: Cannot resolve extension bridge address.";
        }
      }
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            error: errorMessage
          })
        }]
      };
    }
  }
);

// constellation_onboarding.nextStep -> advances to the next step in the walkthrough
server.registerTool(
  "constellation_onboarding.nextStep",
  {
    title: "Next Onboarding Step",
    description: "Advances to the next step in the active onboarding walkthrough",
    inputSchema: {},
  },
  async () => {
    try {
      const port = process.env.CONSTELLATION_BRIDGE_PORT;
      const token = process.env.CONSTELLATION_BRIDGE_TOKEN;
      
      if (!port || !token) {
        console.warn('MCP server: Extension bridge environment variables not available');
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: "Extension bridge not available. Please ensure the Constellation extension is running and properly configured."
            })
          }]
        };
      }

      // Forward request to extension HTTP bridge
      const response = await fetch(`http://127.0.0.1:${port}/onboarding/nextStep`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        // Handle HTTP errors gracefully
        let errorText = "Network error";
        try {
          const responseText = await response.text();
          try {
            const errorData = JSON.parse(responseText);
            errorText = errorData.error || responseText;
          } catch {
            errorText = responseText || `HTTP ${response.status}`;
          }
        } catch {
          errorText = `HTTP ${response.status}`;
        }
        
        console.warn(`MCP server: HTTP bridge request failed with status ${response.status}:`, errorText);
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: `Request failed: ${errorText}`
            })
          }]
        };
      }

      // Parse and return the step result
      const result = await response.json();
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result)
        }]
      };

    } catch (error) {
      console.error('MCP server: Next step request failed:', error);
      
      let errorMessage = "Unknown error occurred during step progression";
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Provide more specific error messages for common failure scenarios
        if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
          errorMessage = "Cannot connect to extension. Please ensure the Constellation extension is running.";
        } else if (error.message.includes('timeout')) {
          errorMessage = "Request timed out. The extension may be busy processing the step.";
        } else if (error.message.includes('ENOTFOUND')) {
          errorMessage = "Network error: Cannot resolve extension bridge address.";
        }
      }
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            error: errorMessage
          })
        }]
      };
    }
  }
);

// constellation_onboarding.finalize -> finalizes onboarding walkthrough with cleanup
server.registerTool(
  "constellation_onboarding.finalize",
  {
    title: "Finalize Onboarding",
    description: "Finalizes the onboarding walkthrough with summary generation and cleanup",
    inputSchema: {
      chosenAction: z.union([
        z.literal("document"),
        z.literal("test-plan"),
        z.null()
      ]).describe("The user's chosen action: 'document', 'test-plan', or null")
    },
  },
  async ({ chosenAction }) => {
    try {
      const port = process.env.CONSTELLATION_BRIDGE_PORT;
      const token = process.env.CONSTELLATION_BRIDGE_TOKEN;
      
      if (!port || !token) {
        console.warn('MCP server: Extension bridge environment variables not available');
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: "Extension bridge not available. Please ensure the Constellation extension is running and properly configured.",
              status: "error"
            })
          }]
        };
      }

      // Validate chosenAction parameter at MCP level for additional security
      const validActions = ['document', 'test-plan', null];
      if (!validActions.includes(chosenAction)) {
        console.warn('MCP server: Invalid chosenAction parameter:', chosenAction);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: "Invalid chosenAction parameter. Expected: 'document', 'test-plan', or null",
              status: "error"
            })
          }]
        };
      }

      // Forward request to extension HTTP bridge with validated input
      const response = await fetch(`http://127.0.0.1:${port}/onboarding/finalize`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ chosenAction })
      });

      if (!response.ok) {
        // Handle HTTP errors gracefully with enhanced logging
        let errorText = "Network error";
        try {
          const responseText = await response.text();
          try {
            const errorData = JSON.parse(responseText);
            errorText = errorData.error || responseText;
          } catch {
            errorText = responseText || `HTTP ${response.status}`;
          }
        } catch {
          errorText = `HTTP ${response.status}`;
        }
        
        console.warn(`MCP server: Finalize HTTP bridge request failed with status ${response.status}:`, errorText);
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: `Request failed: ${errorText}`,
              status: "error"
            })
          }]
        };
      }

      // Parse and return the finalize results
      const result = await response.json();
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result)
        }]
      };

    } catch (error) {
      // Handle network failures and other errors gracefully
      let errorMessage = "Unknown error occurred during finalization";
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Provide more specific error messages for common failure scenarios
        if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
          errorMessage = "Cannot connect to extension. Please ensure the Constellation extension is running.";
        } else if (error.message.includes('timeout')) {
          errorMessage = "Request timed out. The extension may be busy processing the finalization.";
        } else if (error.message.includes('ENOTFOUND')) {
          errorMessage = "Network error: Cannot resolve extension bridge address.";
        }
      }
      
      console.error('MCP server: Finalize request failed:', error);
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            error: errorMessage,
            status: "error"
          })
        }]
      };
    }
  }
);

// constellation_impactAnalysis -> analyzes dependency impact of changing a source file
server.registerTool(
  "constellation_impactAnalysis",
  {
    title: "Impact Analysis",
    description: "Analyzes dependency impact of changing a source file",
    inputSchema: {
      filePath: z.string().describe("Path to the source file to analyze (workspace-relative)")
    },
  },
  async ({ filePath }) => {
    try {
      const port = process.env.CONSTELLATION_BRIDGE_PORT;
      const token = process.env.CONSTELLATION_BRIDGE_TOKEN;
      
      if (!port || !token) {
        console.warn('MCP server: Extension bridge environment variables not available');
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: "Extension bridge not available. Please ensure the Constellation extension is running and properly configured.",
              affectedFiles: []
            })
          }]
        };
      }

      // Forward request to extension HTTP bridge
      const response = await fetch(`http://127.0.0.1:${port}/impact-analysis`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ filePath })
      });

      if (!response.ok) {
        // Handle HTTP errors gracefully - Requirements 6.5, 6.6
        let errorText = "Network error";
        try {
          const responseText = await response.text();
          // Try to parse as JSON to get structured error
          try {
            const errorData = JSON.parse(responseText);
            errorText = errorData.error || responseText;
          } catch {
            errorText = responseText || `HTTP ${response.status}`;
          }
        } catch {
          errorText = `HTTP ${response.status}`;
        }
        
        console.warn(`MCP server: HTTP bridge request failed with status ${response.status}:`, errorText);
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: `Request failed: ${errorText}`,
              affectedFiles: []
            })
          }]
        };
      }

      // Parse and return the impact analysis results
      const result = await response.json();
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result)
        }]
      };

    } catch (error) {
      // Handle network failures and other errors gracefully - Requirements 6.5, 6.6
      let errorMessage = "Unknown error occurred during impact analysis";
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Provide more specific error messages for common failure scenarios
        if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
          errorMessage = "Cannot connect to extension. Please ensure the Constellation extension is running.";
        } else if (error.message.includes('timeout')) {
          errorMessage = "Request timed out. The extension may be busy processing a large project.";
        } else if (error.message.includes('ENOTFOUND')) {
          errorMessage = "Network error: Cannot resolve extension bridge address.";
        }
      }
      
      console.error('MCP server: Impact analysis request failed:', error);
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            error: errorMessage,
            affectedFiles: []
          })
        }]
      };
    }
  }
);

async function main() {
  // Lightweight smoke check mode used by the extension
  if (process.argv.includes("--selftest")) {
    console.log("SELFTEST_OK");
    return;
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  // From here the process stays alive, handling stdio requests.
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

