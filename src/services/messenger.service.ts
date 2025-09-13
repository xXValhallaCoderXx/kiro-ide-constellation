// Centralized message broker for webview <-> extension communication
// Define allowed message shapes in one place.

// Graph-specific message types for webview -> extension communication
export type GraphInboundMessage = 
  | { type: 'graph/load' }
  | { type: 'graph/open-file'; path: string }
  | { type: 'graph/scan' }

// Graph-specific message types for extension -> webview communication
export type GraphOutboundMessage =
  | { type: 'graph/data'; payload: import('./graph-data.service.js').GraphData }
  | { type: 'graph/error'; message: string }
  | { type: 'graph/status'; message: string }

export type InboundMessage =
  | { type: 'open-graph-view' }
  | { type: 'ping' }
  | GraphInboundMessage

export function handleWebviewMessage(
  msg: unknown, 
  ctx: { 
    revealGraphView: () => void; 
    log: (s: string) => void;
    postMessage?: (message: GraphOutboundMessage) => void;
    extensionContext?: import('vscode').ExtensionContext;
    openFile?: (path: string) => Promise<void>;
    triggerScan?: () => Promise<void>;
  }
) {
  if (!msg || typeof (msg as any).type !== 'string') return;
  const m = msg as InboundMessage;
  switch (m.type) {
    case 'open-graph-view':
      ctx.revealGraphView();
      break;
    case 'ping':
      ctx.log('webview ping');
      break;
    case 'graph/load':
      void handleGraphLoad(ctx);
      break;
    case 'graph/open-file':
      if ('path' in m && typeof m.path === 'string' && ctx.openFile) {
        void ctx.openFile(m.path);
      }
      break;
    case 'graph/scan':
      void handleGraphScan(ctx);
      break;
    default:
      break;
  }
}

async function handleGraphLoad(ctx: { 
  postMessage?: (message: GraphOutboundMessage) => void;
  extensionContext?: import('vscode').ExtensionContext;
  log: (s: string) => void;
}) {
  if (!ctx.postMessage || !ctx.extensionContext) {
    ctx.log('Graph load failed: missing context');
    return;
  }

  try {
    const { loadGraphData } = await import('./graph-data.service.js');
    
    const graphData = await loadGraphData(
      ctx.extensionContext,
      (status) => ctx.postMessage?.({ type: 'graph/status', message: status })
    );
    
    ctx.postMessage({ type: 'graph/data', payload: graphData });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    ctx.postMessage({ type: 'graph/error', message });
  }
}

async function handleGraphScan(ctx: {
  postMessage?: (message: GraphOutboundMessage) => void;
  extensionContext?: import('vscode').ExtensionContext;
  triggerScan?: () => Promise<void>;
  log: (s: string) => void;
}) {
  if (!ctx.postMessage || !ctx.extensionContext) {
    ctx.log('Graph scan failed: missing context');
    return;
  }

  try {
    // Check for workspace before starting scan
    const vscode = await import('vscode');
    if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
      ctx.postMessage({ 
        type: 'graph/error', 
        message: 'No workspace folder open. Open a project to scan dependencies.' 
      });
      return;
    }

    ctx.postMessage({ type: 'graph/status', message: 'Scanning project...' });
    
    if (ctx.triggerScan) {
      await ctx.triggerScan();
    } else {
      const { runScan } = await import('./dependency-cruiser.service.js');
      await runScan(ctx.extensionContext);
    }
    
    // After scan completes, automatically load the new data
    await handleGraphLoad(ctx);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Scan failed';
    ctx.postMessage({ type: 'graph/error', message });
  }
}

