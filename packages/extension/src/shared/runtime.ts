export const Events = {
  OpenDashboard: 'openDashboard',
  UiEmitToast: 'ui:emitToast',
  DashboardOpened: 'dashboard:opened',
  DashboardClosed: 'dashboard:closed',
} as const;

export type EventType = typeof Events[keyof typeof Events];

export type EventPayloads = {
  [Events.OpenDashboard]: { } | undefined;
  [Events.UiEmitToast]: { text: string };
  [Events.DashboardOpened]: { via: 'commandPalette' | 'other' };
  [Events.DashboardClosed]: { } | undefined;
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

