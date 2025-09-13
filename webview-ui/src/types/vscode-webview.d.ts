// Ambient types for VS Code webview API to satisfy TypeScript in the webview UI.
// This is only used in the webview-ui build; it has no effect in the extension host.
declare function acquireVsCodeApi(): {
  postMessage: (message: any) => void
  getState: () => any
  setState: (state: any) => void
}

