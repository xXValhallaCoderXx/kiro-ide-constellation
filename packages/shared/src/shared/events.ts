// Centralized, typed message/event contracts shared by extension and webviews.

// Minimal graph element contracts used by Cytoscape in the webview
export type GraphNode = { id: string; label?: string; group?: string };
export type GraphEdge = { id: string; source: string; target: string };

// Event name constants (no hard-coded strings scattered around)
export const Events = {
  OpenDashboard: 'openDashboard',
  UiEmitToast: 'ui:emitToast',
  DashboardOpened: 'dashboard:opened',
  DashboardClosed: 'dashboard:closed',
  DepsRequestGraph: 'deps:requestGraph',
  DepsGraphData: 'deps:graphData',
} as const;

export type EventType = typeof Events[keyof typeof Events];

// Payload types for each event
export type EventPayloads = {
  [Events.OpenDashboard]: { /* no payload */ } | undefined;
  [Events.UiEmitToast]: { text: string };
  [Events.DashboardOpened]: { via: 'commandPalette' | 'other' };
  [Events.DashboardClosed]: { /* no payload */ } | undefined;
  [Events.DepsRequestGraph]: { /* no payload */ } | undefined;
  [Events.DepsGraphData]: { nodes: GraphNode[]; edges: GraphEdge[] };
};

// Generic bus event type
export type BusEvent<K extends EventType = EventType> = {
  type: K;
  payload: EventPayloads[K];
};

// Utility type to extract a concrete event by name
export type BusEventOf<K extends EventType> = Extract<BusEvent, { type: K }>;
