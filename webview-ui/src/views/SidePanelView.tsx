import { Button } from '../components/Button'

// Simple event service for cross-view communication
const vscodeApi = acquireVsCodeApi?.() as any | undefined

export function SidePanelView() {
  const openGraph = () => {
    // Ask extension to open the graph view webview tab
    vscodeApi?.postMessage?.({ type: 'open-graph-view' })
  }
  return (
    <div>
      <h1>Constellation</h1>
      <p>Side Panel</p>
      <Button onClick={openGraph}>Ossspen Graph View</Button>
    </div>
  )
}

