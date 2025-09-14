import { useEffect, useState } from 'preact/hooks'
import { messenger } from '../services/messenger'
import { GraphToolbar } from './GraphToolbar'
import { GraphCanvas } from './GraphCanvas'

interface Node {
  id: string
  label: string
  path: string
  language?: 'ts' | 'js' | 'tsx' | 'jsx' | 'json' | 'other'
}

interface Edge {
  id: string
  source: string
  target: string
  kind?: 'import' | 'require' | 'dynamic' | 'unknown'
}

interface Meta {
  generatedAt?: string
  count: {
    nodes: number
    edges: number
  }
  performanceOptimized?: boolean
}

interface GraphData {
  nodes: Node[]
  edges: Edge[]
  meta: Meta
}

type ComponentState = 
  | { type: 'loading' }
  | { type: 'error'; message: string }
  | { type: 'data'; data: GraphData }
  | { type: 'scanning'; message: string }
  | { type: 'rendering'; message: string }

export function GraphDashboard() {
  const [state, setState] = useState<ComponentState>({ type: 'loading' })
  const [isRendering, setIsRendering] = useState(false)

  // Initialize component and request graph data
  useEffect(() => {
    // Request graph data on mount
    messenger.post('graph/load')

    // Listen for messages from extension
    const handleMessage = (msg: any) => {
      switch (msg.type) {
        case 'graph/data':
          // Check if this is a large graph that needs rendering indication
          const nodeCount = msg.payload.nodes.length
          if (nodeCount > 200) {
            setState({ type: 'rendering', message: `Rendering ${nodeCount} nodes...` })
            // Use setTimeout to allow UI to update before heavy rendering
            setTimeout(() => {
              setState({ type: 'data', data: msg.payload })
            }, 100)
          } else {
            setState({ type: 'data', data: msg.payload })
          }
          break
        case 'graph/error':
          setState({ type: 'error', message: msg.message })
          break
        case 'graph/status':
          setState({ type: 'scanning', message: msg.message })
          break
      }
    }

    messenger.on(handleMessage)
  }, [])

  const handleRescan = () => {
    // Reset rendering state when starting a new scan
    setIsRendering(false)
    messenger.post('graph/scan')
  }

  const handleRenderingChange = (rendering: boolean) => {
    setIsRendering(rendering)
  }

  return (
    <div className="graph-dashboard">
      {/* Toolbar */}
      <GraphToolbar
        onRescan={handleRescan}
        nodeCount={state.type === 'data' ? state.data.meta.count.nodes : undefined}
        edgeCount={state.type === 'data' ? state.data.meta.count.edges : undefined}
        isOptimized={state.type === 'data' ? state.data.meta.performanceOptimized : undefined}
      />
      
      {/* Main Content Area */}
      <div className="graph-dashboard-content">
        {/* Loading State */}
        {state.type === 'loading' && (
          <div className="graph-dashboard-message">
            <p>Loading graph...</p>
          </div>
        )}
        
        {/* Scanning State */}
        {state.type === 'scanning' && (
          <div className="graph-dashboard-message">
            <p>{state.message}</p>
          </div>
        )}
        
        {/* Rendering State */}
        {state.type === 'rendering' && (
          <div className="graph-dashboard-message">
            <p>{state.message}</p>
          </div>
        )}
        
        {/* Error State */}
        {state.type === 'error' && (
          <div className="graph-dashboard-message graph-dashboard-error">
            <p>Error: {state.message}</p>
            <button 
              onClick={() => messenger.post('graph/load')}
              className="graph-dashboard-retry"
            >
              Retry
            </button>
          </div>
        )}
        
        {/* Graph Canvas */}
        {state.type === 'data' && (
          <GraphCanvas
            data={state.data}
            isRendering={isRendering}
            onRenderingChange={handleRenderingChange}
          />
        )}
      </div>
    </div>
  )
}