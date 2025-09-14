// Simple message bus for the webview UI
// Centralized here so views/components can communicate and post to extension

// Graph-specific message types for webview -> extension
type GraphMessage = 
  | { type: 'graph/load' }
  | { type: 'graph/open-file'; path: string }
  | { type: 'graph/scan' }
  | { type: 'graph/ready' }

// Graph-specific message types for extension -> webview
type GraphResponseMessage =
  | { type: 'graph/data'; payload: any } // GraphData type from extension
  | { type: 'graph/error'; message: string }
  | { type: 'graph/status'; message: string }
  | { type: 'graph/impact'; payload: { sourceFile: string; affectedFiles: string[] } }

// Onboarding-specific message types for webview -> extension
type OnboardingMessage =
  | { type: 'onboarding/change-mode'; mode: 'Default' | 'Onboarding' }
  | { type: 'onboarding/get-mode' }
  | { type: 'onboarding/get-status' }

// Onboarding-specific message types for extension -> webview
type OnboardingResponseMessage =
  | { type: 'onboarding/mode-changed'; mode: 'Default' | 'Onboarding' }
  | { type: 'onboarding/mode-error'; message: string }
  | { type: 'onboarding/current-mode'; mode: 'Default' | 'Onboarding' }
  | { type: 'onboarding/status-update'; payload: OnboardingStatusPayload }
  | { type: 'onboarding/walkthrough-complete' }
  | { type: 'onboarding/walkthrough-error'; message: string }
  | { type: 'onboarding/finalize-complete'; payload: FinalizeCompletePayload }

// Onboarding status payload type
type OnboardingStatusPayload = {
  isActive: boolean
  currentStep?: number
  totalSteps?: number
  currentFile?: string
  explanation?: string
}

// Finalize completion payload type
type FinalizeCompletePayload = {
  chosenAction: 'document' | 'test-plan' | null
  summary: {
    topic: string
    stepCount: number
    files: string[]
    highlights: Array<{
      filePath: string
      lineStart: number
      lineEnd: number
    }>
    bulletSummary: string[]
  }
  cleanup: {
    mode: 'Default'
    removedPlan: string | null
  }
}

type Message =
  | { type: 'open-graph-view' }
  | { type: 'ping' }
  | GraphMessage
  | GraphResponseMessage
  | OnboardingMessage
  | OnboardingResponseMessage

function getApi() {
  return typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : undefined
}

class Messenger {
  private api = getApi()

  post<T extends Message['type']>(type: T, payload?: Extract<Message, { type: T }> extends { [K in keyof any]: never } ? never : Omit<Extract<Message, { type: T }>, 'type'>) {
    this.api?.postMessage?.({ type, ...(payload as any) })
  }

  on(handler: (msg: Message) => void) {
    window.addEventListener('message', (e) => {
      const msg = e.data as Message
      if (msg && typeof (msg as any).type === 'string') handler(msg)
    })
  }
}

export const messenger = new Messenger()

