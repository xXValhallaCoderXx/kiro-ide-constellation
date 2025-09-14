import { GraphData } from '../../../src/shared/graph.types';

// Core interfaces for focus mode functionality
export type FocusLens = 'children' | 'parents';

export interface Crumb {
  root: string;
  depth: number;
  lens: FocusLens;
  label: string;
}

export interface VisibilityResult {
  visibleNodes: Set<string>;
  visibleEdges: Set<string>;
}

export interface ComputeVisibleArgs {
  forwardAdj: Map<string, string[]>;
  reverseAdj: Map<string, string[]>;
  root: string;
  depth: number;
  lens: FocusLens;
  maxChildren?: number;
}

export interface FocusError {
  type: 'stale-breadcrumb' | 'empty-children' | 'malformed-data' | 'performance' | 'unknown';
  message: string;
  nodeId?: string;
  details?: any;
}

export interface ChildrenInfo {
  count: number;
  hasMore: boolean;
  displayCount: number;
}

/**
 * Transforms GraphData into efficient adjacency maps for BFS traversal
 * Requirements: 1.1, 4.1
 */
export function buildAdjacency(graph: GraphData): {
  forwardAdj: Map<string, string[]>;
  reverseAdj: Map<string, string[]>;
} {
  const forwardAdj = new Map<string, string[]>();
  const reverseAdj = new Map<string, string[]>();
  
  // Initialize empty arrays for all nodes
  graph.nodes.forEach(node => {
    forwardAdj.set(node.id, []);
    reverseAdj.set(node.id, []);
  });
  
  // Populate adjacency maps from edges
  graph.edges.forEach(edge => {
    const sourceChildren = forwardAdj.get(edge.source) || [];
    sourceChildren.push(edge.target);
    forwardAdj.set(edge.source, sourceChildren);
    
    const targetParents = reverseAdj.get(edge.target) || [];
    targetParents.push(edge.source);
    reverseAdj.set(edge.target, targetParents);
  });
  
  return { forwardAdj, reverseAdj };
}

/**
 * Computes visible nodes and edges using BFS traversal with depth limiting
 * Requirements: 1.3, 4.1, 4.5, 6.1, 8.3
 */
export function computeVisible({
  forwardAdj,
  reverseAdj,
  root,
  depth,
  lens,
  maxChildren = 100
}: ComputeVisibleArgs): VisibilityResult {
  const startTime = performance.now();
  
  const visibleNodes = new Set<string>();
  const visibleEdges = new Set<string>();
  const visited = new Set<string>(); // Cycle detection
  const queue: Array<{ id: string; d: number }> = [{ id: root, d: 0 }];
  
  visited.add(root);
  visibleNodes.add(root);
  
  while (queue.length > 0) {
    const { id, d } = queue.shift()!;
    
    // Stop if we've reached the depth limit
    if (d === depth) {
      continue;
    }
    
    const adjacencyMap = lens === 'children' ? forwardAdj : reverseAdj;
    const neighbors = adjacencyMap.get(id) || [];
    
    // Fan-out capping with configurable maxChildren parameter
    let count = 0;
    for (const neighborId of neighbors) {
      if (count++ >= maxChildren) {
        break;
      }
      
      // Add edge to visible set (handle direction based on lens)
      const edgeId = lens === 'children' 
        ? `${id}->${neighborId}` 
        : `${neighborId}->${id}`;
      visibleEdges.add(edgeId);
      
      // Cycle detection using visited set
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        visibleNodes.add(neighborId);
        queue.push({ id: neighborId, d: d + 1 });
      }
    }
  }
  
  // Performance monitoring - log when operations exceed 50ms threshold
  const duration = performance.now() - startTime;
  if (duration > 50) {
    console.warn(`Focus mode computeVisible took ${duration.toFixed(2)}ms (threshold: 50ms) for root "${root}" with ${visibleNodes.size} nodes`);
  }
  
  return { visibleNodes, visibleEdges };
}

/**
 * Formats breadcrumb labels with basename extraction
 * Requirements: 1.1
 */
export function formatCrumb(
  graph: GraphData, 
  root: string, 
  depth: number, 
  lens: FocusLens
): Crumb {
  // Extract basename from file path
  const pathParts = root.split('/');
  const basename = pathParts[pathParts.length - 1];
  
  // Remove file extension for cleaner display
  const label = basename.replace(/\.[^/.]+$/, '');
  
  return {
    root,
    depth,
    lens,
    label
  };
}

/**
 * Validates that a root node exists in the graph data
 * Requirements: 8.1
 */
export function validateRootNode(graph: GraphData, rootId: string): boolean {
  return graph.nodes.some(node => node.id === rootId);
}

/**
 * Counts the number of children for a given node
 * Requirements: 4.5, 8.2
 */
export function countChildren(
  forwardAdj: Map<string, string[]>, 
  reverseAdj: Map<string, string[]>, 
  nodeId: string, 
  lens: FocusLens
): number {
  const adjacencyMap = lens === 'children' ? forwardAdj : reverseAdj;
  const neighbors = adjacencyMap.get(nodeId) || [];
  return neighbors.length;
}

/**
 * Validates graph data structure for malformed data
 * Requirements: 8.4
 */
export function validateGraphData(graph: GraphData): { isValid: boolean; error?: string } {
  try {
    // Check basic structure
    if (!graph || typeof graph !== 'object') {
      return { isValid: false, error: 'Graph data is not an object' };
    }
    
    if (!Array.isArray(graph.nodes)) {
      return { isValid: false, error: 'Graph nodes is not an array' };
    }
    
    if (!Array.isArray(graph.edges)) {
      return { isValid: false, error: 'Graph edges is not an array' };
    }
    
    // Validate nodes have required properties
    for (const node of graph.nodes) {
      if (!node.id || typeof node.id !== 'string') {
        return { isValid: false, error: 'Node missing valid id property' };
      }
    }
    
    // Validate edges have required properties
    for (const edge of graph.edges) {
      if (!edge.source || !edge.target || typeof edge.source !== 'string' || typeof edge.target !== 'string') {
        return { isValid: false, error: 'Edge missing valid source/target properties' };
      }
    }
    
    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: `Graph validation error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

/**
 * Cleans up position cache to prevent memory leaks in long-running sessions
 * Requirements: 8.5
 */
export function cleanupPositionCache(
  positionCache: Record<string, { x: number; y: number }>, 
  validNodeIds: Set<string>
): Record<string, { x: number; y: number }> {
  const cleanedCache: Record<string, { x: number; y: number }> = {};
  
  // Only keep positions for nodes that still exist in the graph
  for (const [nodeId, position] of Object.entries(positionCache)) {
    if (validNodeIds.has(nodeId)) {
      cleanedCache[nodeId] = position;
    }
  }
  
  const removedCount = Object.keys(positionCache).length - Object.keys(cleanedCache).length;
  if (removedCount > 0) {
    console.log(`Focus mode: Cleaned up ${removedCount} stale position cache entries`);
  }
  
  return cleanedCache;
}