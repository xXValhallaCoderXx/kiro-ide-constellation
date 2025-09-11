// Minimal typings for the VS Code webview API
interface VsCodeApi<TMessage = unknown, TState = unknown> {
  postMessage: (message: TMessage) => void;
  getState?: () => TState | undefined;
  setState?: (newState: TState) => void;
}

// acquireVsCodeApi is injected by VS Code webviews at runtime
declare function acquireVsCodeApi<TMessage = unknown, TState = unknown>(): VsCodeApi<TMessage, TState>;

// Helper for acquiring the VS Code webview API
export function getVsCodeApi<TMessage = unknown, TState = unknown>(): VsCodeApi<TMessage, TState> {
  return acquireVsCodeApi<TMessage, TState>();
}
