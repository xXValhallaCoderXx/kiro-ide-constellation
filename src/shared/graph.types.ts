// Shared graph data types for lightweight dependency context
// These are intentionally minimal for planning and context use cases.

export interface GraphNode {
  id: string;          // workspace-relative path
  label?: string;      // optional display label (e.g., basename)
  type?: string;       // optional file type (e.g., 'typescript', 'json')
}

export interface GraphEdge {
  source: string;      // importer (source file id)
  target: string;      // imported (target file id)
  type?: string;       // optional dependency kind ('import' | 'require' | 'dynamic' | 'unknown')
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata?: {
    scanTime: string;
    fileCount: number;
    dependencyCount: number;
  };
}

