import * as vscode from "vscode";

export type WebviewContext = {
  revealGraphView: () => void;
  log: (s: string) => void;
  postMessage?: (message: any) => void;
  extensionContext: vscode.ExtensionContext;
  openFile: (path: string) => Promise<void>;
  triggerScan: () => Promise<void>;
};

export function configureGraphMessaging(webview: vscode.Webview, ctx: WebviewContext) {
  return webview.onDidReceiveMessage((msg) => {
    import('./messenger.service.js').then(({ handleWebviewMessage }) =>
      handleWebviewMessage(msg, ctx)
    ).catch(() => { /* ignore */ });
  });
}

