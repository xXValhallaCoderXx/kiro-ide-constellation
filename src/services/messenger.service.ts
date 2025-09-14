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
  | { type: 'graph/impact'; payload: { sourceFile: string; affectedFiles: string[] } }

// Onboarding-specific message types for webview -> extension communication
export type OnboardingInboundMessage =
  | { type: 'onboarding/change-mode'; mode: 'Default' | 'Onboarding' }
  | { type: 'onboarding/get-mode' }
  | { type: 'onboarding/get-status' }

// Onboarding-specific message types for extension -> webview communication
export type OnboardingOutboundMessage =
  | { type: 'onboarding/mode-changed'; mode: 'Default' | 'Onboarding' }
  | { type: 'onboarding/mode-error'; message: string }
  | { type: 'onboarding/current-mode'; mode: 'Default' | 'Onboarding' }
  | { type: 'onboarding/status-update'; payload: OnboardingStatusPayload }
  | { type: 'onboarding/walkthrough-complete' }
  | { type: 'onboarding/walkthrough-error'; message: string }

// Onboarding status payload type
export type OnboardingStatusPayload = {
  isActive: boolean
  currentStep?: number
  totalSteps?: number
  currentFile?: string
  explanation?: string
}

export type InboundMessage =
  | { type: 'open-graph-view' }
  | { type: 'ping' }
  | GraphInboundMessage
  | OnboardingInboundMessage

export type OutboundMessage = GraphOutboundMessage | OnboardingOutboundMessage

export function handleWebviewMessage(
  msg: unknown, 
  ctx: { 
    revealGraphView: () => void; 
    log: (s: string) => void;
    postMessage?: (message: OutboundMessage) => void;
    extensionContext?: import('vscode').ExtensionContext;
    openFile?: (path: string) => Promise<void>;
    triggerScan?: () => Promise<void>;
    onboardingModeService?: any;
    onboardingWalkthroughService?: any;
  }
) {
  if (!msg || typeof (msg as any).type !== 'string') {return;}
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
    case 'onboarding/change-mode':
      if ('mode' in m && typeof m.mode === 'string') {
        void handleOnboardingModeChange(m.mode as 'Default' | 'Onboarding', ctx);
      }
      break;
    case 'onboarding/get-mode':
      void handleOnboardingGetMode(ctx);
      break;
    case 'onboarding/get-status':
      void handleOnboardingGetStatus(ctx);
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

async function handleOnboardingModeChange(
  mode: 'Default' | 'Onboarding',
  ctx: {
    postMessage?: (message: OnboardingOutboundMessage) => void;
    onboardingModeService?: any;
    log: (s: string) => void;
  }
) {
  if (!ctx.postMessage || !ctx.onboardingModeService) {
    ctx.log('Onboarding mode change failed: missing context');
    return;
  }

  try {
    if (mode === 'Onboarding') {
      await ctx.onboardingModeService.switchToOnboarding();
    } else {
      await ctx.onboardingModeService.switchToDefault();
    }
    
    ctx.postMessage({ type: 'onboarding/mode-changed', mode });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to change mode';
    ctx.log(`Onboarding mode change error: ${message}`);
    ctx.postMessage({ type: 'onboarding/mode-error', message });
  }
}

async function handleOnboardingGetMode(ctx: {
  postMessage?: (message: OnboardingOutboundMessage) => void;
  onboardingModeService?: any;
  log: (s: string) => void;
}) {
  if (!ctx.postMessage || !ctx.onboardingModeService) {
    ctx.log('Onboarding get mode failed: missing context');
    return;
  }

  try {
    const mode = await ctx.onboardingModeService.getCurrentMode();
    ctx.postMessage({ type: 'onboarding/current-mode', mode });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get current mode';
    ctx.log(`Onboarding get mode error: ${message}`);
    ctx.postMessage({ type: 'onboarding/mode-error', message });
  }
}

async function handleOnboardingGetStatus(ctx: {
  postMessage?: (message: OnboardingOutboundMessage) => void;
  onboardingWalkthroughService?: any;
  log: (s: string) => void;
}) {
  if (!ctx.postMessage || !ctx.onboardingWalkthroughService) {
    ctx.log('Onboarding get status failed: missing context');
    return;
  }

  try {
    const state = ctx.onboardingWalkthroughService.getCurrentState();
    
    if (state) {
      const currentStep = state.currentStepIndex + 1; // Convert to 1-based
      const totalSteps = state.plan.steps.length;
      const currentStepData = state.plan.steps[state.currentStepIndex];
      
      const payload: OnboardingStatusPayload = {
        isActive: true,
        currentStep,
        totalSteps,
        currentFile: currentStepData?.filePath,
        explanation: currentStepData?.explanation
      };
      
      ctx.postMessage({ type: 'onboarding/status-update', payload });
    } else {
      // No active walkthrough
      const payload: OnboardingStatusPayload = {
        isActive: false
      };
      
      ctx.postMessage({ type: 'onboarding/status-update', payload });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get walkthrough status';
    ctx.log(`Onboarding get status error: ${message}`);
    ctx.postMessage({ type: 'onboarding/walkthrough-error', message });
  }
}


// Helper functions for sending onboarding notifications
export function sendOnboardingStatusUpdate(
  postMessage: (message: OnboardingOutboundMessage) => void,
  payload: OnboardingStatusPayload
) {
  postMessage({ type: 'onboarding/status-update', payload });
}

export function sendOnboardingWalkthroughComplete(
  postMessage: (message: OnboardingOutboundMessage) => void
) {
  postMessage({ type: 'onboarding/walkthrough-complete' });
}

export function sendOnboardingWalkthroughError(
  postMessage: (message: OnboardingOutboundMessage) => void,
  message: string
) {
  postMessage({ type: 'onboarding/walkthrough-error', message });
}