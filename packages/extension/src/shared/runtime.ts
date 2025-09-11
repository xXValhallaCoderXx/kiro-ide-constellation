// Graph element contracts used by the extension runtime
export type GraphNode = { id: string; label?: string; group?: string };
export type GraphEdge = { id: string; source: string; target: string };

export const Events = {
  OpenDashboard: 'openDashboard',
  UiEmitToast: 'ui:emitToast',
  DashboardOpened: 'dashboard:opened',
  DashboardClosed: 'dashboard:closed',
  DepsRequestGraph: 'deps:requestGraph',
  DepsGraphData: 'deps:graphData',
} as const;

export type EventType = typeof Events[keyof typeof Events];

export type EventPayloads = {
  [Events.OpenDashboard]: { } | undefined;
  [Events.UiEmitToast]: { text: string };
  [Events.DashboardOpened]: { via: 'commandPalette' | 'other' };
  [Events.DashboardClosed]: { } | undefined;
  [Events.DepsRequestGraph]: { } | undefined;
  [Events.DepsGraphData]: { nodes: GraphNode[]; edges: GraphEdge[] };
};

export type BusEvent<K extends EventType = EventType> = {
  type: K;
  payload: EventPayloads[K];
};

export const OPEN_DASHBOARD_COMMAND = 'kiro-ide-constellation.openDashboard';

// Constellation workspace data locations
export const CONSTELLATION_DIR = '.constellation';
export const CONSTELLATION_DATA_DIR = 'data';

export function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

