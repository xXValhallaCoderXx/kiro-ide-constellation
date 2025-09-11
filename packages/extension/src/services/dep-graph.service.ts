import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { CONSTELLATION_DIR, CONSTELLATION_DATA_DIR, GraphNode, GraphEdge } from '../shared/runtime';
import { DependencyCruiserService } from './dependency-cruiser.service';

interface DepCruiserModule {
  source: string;
  dependencies?: Array<{
    resolved: string;
  }>;
}

interface DepCruiserOutput {
  modules?: DepCruiserModule[];
}

/**
 * Loads dependency graph data from existing file or triggers a scan.
 * Returns Cytoscape-compatible elements or null on failure.
 */
export async function loadDependencyGraphElements(
  context: vscode.ExtensionContext
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] } | null> {
  const baseDir = await resolveBaseDir(context);
  if (!baseDir) {
    console.warn('[DepGraph] No workspace open and not in dev mode. Cannot load graph data.');
    return null;
  }

  const dataPath = path.join(baseDir, CONSTELLATION_DIR, CONSTELLATION_DATA_DIR, 'dependency-analysis.json');
  console.log('[DepGraph] Using data path:', dataPath);

  let jsonData: DepCruiserOutput | null = null;

  try {
    // Try to read existing file
    const content = await fs.readFile(dataPath, 'utf-8');
    jsonData = JSON.parse(content) as DepCruiserOutput;
    console.log('[DepGraph] Loaded existing data.');
  } catch {
    // File doesn't exist or invalid; trigger a scan
    console.log('[DepGraph] No existing data, triggering scan...');
    const scanner = new DependencyCruiserService(context);
    await scanner.analyze();
    
    // Try reading again after scan
    try {
      const content = await fs.readFile(dataPath, 'utf-8');
      jsonData = JSON.parse(content) as DepCruiserOutput;
      console.log('[DepGraph] Loaded data after scan.');
    } catch (e) {
      console.error('[DepGraph] Failed to read data after scan:', e);
      return null;
    }
  }

  if (!jsonData || !jsonData.modules) {
    console.warn('[DepGraph] No modules present in data.');
    return { nodes: [], edges: [] };
  }

  return transformToGraphElements(jsonData.modules);
}

/**
 * Transforms dependency-cruiser modules into Cytoscape elements.
 * Uses intelligent aggregation based on common patterns.
 */
function transformToGraphElements(modules: DepCruiserModule[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodeMap = new Map<string, GraphNode>();
  const edgeMap = new Map<string, GraphEdge>();
  const NODE_CAP = 300;

  // First, determine aggregation level based on module count
  const aggregationLevel = determineAggregationLevel(modules);

  for (const module of modules) {
    const fromId = aggregateModulePath(module.source, aggregationLevel);
    
    // Add node if not exists
    if (!nodeMap.has(fromId)) {
      nodeMap.set(fromId, {
        id: fromId,
        label: fromId,
        group: getModuleGroup(fromId)
      });
    }

    if (module.dependencies) {
      for (const dep of module.dependencies) {
        const toId = aggregateModulePath(dep.resolved, aggregationLevel);
        
        // Skip self-references
        if (fromId === toId) continue;
        
        // Add target node if not exists
        if (!nodeMap.has(toId)) {
          nodeMap.set(toId, {
            id: toId,
            label: toId,
            group: getModuleGroup(toId)
          });
        }

        // Add edge (dedupe by key)
        const edgeId = `${fromId}->${toId}`;
        if (!edgeMap.has(edgeId)) {
          edgeMap.set(edgeId, {
            id: edgeId,
            source: fromId,
            target: toId
          });
        }
      }
    }

    // Apply node cap for performance
    if (nodeMap.size >= NODE_CAP) {
      console.warn(`[DepGraph] Node cap of ${NODE_CAP} reached, stopping processing`);
      break;
    }
  }

  const nodes = Array.from(nodeMap.values());
  const edges = Array.from(edgeMap.values());
  console.log(`[DepGraph] Built elements: nodes=${nodes.length}, edges=${edges.length}`);
  return { nodes, edges };
}

/**
 * Determines the appropriate aggregation level based on module count and patterns.
 */
function determineAggregationLevel(modules: DepCruiserModule[]): 'file' | 'directory' | 'package' {
  const moduleCount = modules.length;
  // POC policy: avoid package-level aggregation to support varied repo shapes (src, lib, etc.)
  if (moduleCount > 500) {
    return 'directory';
  }
  return 'file';
}

/**
 * Aggregates a module path based on the specified level.
 */
function aggregateModulePath(modulePath: string, level: 'file' | 'directory' | 'package'): string {
  // Clean up the path
  let clean = modulePath
    .replace(/^\.\//, '')
    .replace(/\\/g, '/')
    .replace(/\.(ts|tsx|js|jsx|mjs|cjs|vue|svelte)$/, '');

  if (level === 'file') {
    return clean;
  }

  const parts = clean.split('/');
  
  if (level === 'package') {
    // For monorepo packages
    if (parts[0] === 'packages' && parts.length >= 2) {
      return `packages/${parts[1]}`;
    }
    // For standard projects, aggregate to top-level directory
    if (parts.length > 1) {
      return parts[0];
    }
    return clean;
  }

  if (level === 'directory') {
    // Aggregate to parent directory
    if (parts.length > 1) {
      return parts.slice(0, -1).join('/');
    }
    return clean;
  }

  return clean;
}

async function resolveBaseDir(context: vscode.ExtensionContext): Promise<string | null> {
  const wf = vscode.workspace.workspaceFolders;
  if (wf && wf.length > 0) {
    return wf[0].uri.fsPath;
  }
  if (context.extensionMode === vscode.ExtensionMode.Development) {
    const repoRoot = path.resolve(context.extensionPath, '..', '..');
    return repoRoot;
  }
  return null;
}

/**
 * Determines the group/category for a module (for potential styling).
 */
function getModuleGroup(modulePath: string): string {
  if (modulePath.includes('test') || modulePath.includes('spec')) {
    return 'test';
  }
  if (modulePath.includes('node_modules')) {
    return 'external';
  }
  if (modulePath.startsWith('packages/')) {
    const parts = modulePath.split('/');
    if (parts.length >= 2) {
      return parts[1]; // package name
    }
  }
  if (modulePath.startsWith('src/')) {
    return 'source';
  }
  return 'other';
}
