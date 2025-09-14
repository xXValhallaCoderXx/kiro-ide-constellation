import { useCallback, useEffect, useState, useRef } from 'preact/hooks'
import { messenger } from '../services/messenger'
import { GraphToolbar } from './GraphToolbar'
import { GraphCanvas } from './GraphCanvas'
import { Button } from './Button'

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

interface ImpactData {
  sourceFile: string
  affectedFiles: string[]
}

interface ImpactState {
  isActive: boolean
  data?: ImpactData
  filteredGraph?: GraphData
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
  const [fullGraphData, setFullGraphData] = useState<GraphData | null>(null)
  const [impactState, setImpactState] = useState<ImpactState>({ isActive: false })
  // Keep latest impact state in a ref to avoid stale closure inside message handler
  const impactRef = useRef<ImpactState>({ isActive: false })
  useEffect(() => { impactRef.current = impactState }, [impactState])

  // Function to compute filtered graph from affected files list
  const computeFilteredGraph = useCallback((graphData: GraphData, affectedFiles: string[]): GraphData => {
    // Create a set for efficient lookup
    const affectedFilesSet = new Set(affectedFiles)
    
    // Filter nodes to only include affected files
    const filteredNodes = graphData.nodes.filter(node => affectedFilesSet.has(node.id))
    
    // Filter edges to only include edges where both source and target are in affected files
    const filteredNodeIds = new Set(filteredNodes.map(node => node.id))
    const filteredEdges = graphData.edges.filter(edge => 
      filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target)
    )
    
    // Create filtered graph with updated metadata
    return {
      nodes: filteredNodes,
      edges: filteredEdges,
      meta: {
        ...graphData.meta,
        count: {
          nodes: filteredNodes.length,
          edges: filteredEdges.length
        }
      }
    }
  }, [])

  // Function to reset impact view and restore full graph
  const handleResetImpactView = useCallback(() => {
    if (fullGraphData) {
      setImpactState({ isActive: false })
      setState({ type: 'data', data: fullGraphData })
    }
  }, [fullGraphData])

  // Initialize component and request graph data
  useEffect(() => {
    // Signal readiness so the extension can safely send impact payloads
    messenger.post('graph/ready')

    // Request graph data on mount
    messenger.post('graph/load')

    // Listen for messages from extension
    const handleMessage = (msg: any) => {
      switch (msg.type) {
        case 'graph/data': {
          const graphPayload = msg.payload as GraphData
          // Store full graph data for reset functionality
          setFullGraphData(graphPayload)

          // If an impact arrived before data, apply it now (using ref to avoid stale closure)
          if (impactRef.current.isActive && impactRef.current.data) {
            const filteredGraph = computeFilteredGraph(graphPayload, impactRef.current.data.affectedFiles)
            setImpactState((prev) => ({ ...prev, filteredGraph }))
            setState({ type: 'data', data: filteredGraph })
            break
          }

          // Check if this is a large graph that needs rendering indication
          const nodeCount = graphPayload.nodes.length
          if (nodeCount > 200) {
            setState({ type: 'rendering', message: `Rendering ${nodeCount} nodes...` })
            // Use setTimeout to allow UI to update before heavy rendering
            setTimeout(() => {
              setState({ type: 'data', data: graphPayload })
            }, 100)
          } else {
            setState({ type: 'data', data: graphPayload })
          }
          break
        }
        case 'graph/impact': {
          // Handle impact analysis data
          const impactData = msg.payload as ImpactData
          if (fullGraphData) {
            const filteredGraph = computeFilteredGraph(fullGraphData, impactData.affectedFiles)
            
            // Update impact state
            setImpactState({
              isActive: true,
              data: impactData,
              filteredGraph
            })
            
            // Update display to show filtered graph
            setState({ type: 'data', data: filteredGraph })
          } else {
            // Defer until we receive graph/data
            setImpactState({ isActive: true, data: impactData })
          }
          break
        }
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

  const handleRescan = useCallback(() => {
    // Reset rendering state when starting a new scan
    setIsRendering(false)
    messenger.post('graph/scan')
  }, [])

  const handleRenderingChange = useCallback((rendering: boolean) => {
    setIsRendering(rendering)
  }, [])

  return (
    <div className="graph-dashboard">
      {/* Toolbar */}
      <GraphToolbar
        onRescan={handleRescan}
        nodeCount={state.type === 'data' ? state.data.meta.count.nodes : undefined}
        edgeCount={state.type === 'data' ? state.data.meta.count.edges : undefined}
        isOptimized={state.type === 'data' ? state.data.meta.performanceOptimized : undefined}
        impactState={impactState}
        onResetImpactView={handleResetImpactView}
      />
      
      {/* Main Content Area */}
      <div className="graph-dashboard-content">
        {/* Impact banner */}
        {impactState.isActive && (
          <div className="banner-impact" role="status" aria-live="polite">
            <span className="banner-text">Impact View — source: {impactState.data?.sourceFile}</span>
            <Button class="btn-secondary btn-sm" onClick={handleResetImpactView} data-testid="graph-reset-banner-button">↺ Reset View</Button>
          </div>
        )}

        {/* Loading State */}
        {state.type === 'loading' && (
          <div className="state-message">
            <div>⌛</div>
            <p>Loading graph...</p>
          </div>
        )}
        
        {/* Scanning State */}
        {state.type === 'scanning' && (
          <div className="state-message">
            <div>🔎</div>
            <p>{state.message}</p>
          </div>
        )}
        
        {/* Rendering State */}
        {state.type === 'rendering' && (
          <div className="state-message">
            <div>🧩</div>
            <p>{state.message}</p>
          </div>
        )}
        
        {/* Error State */}
        {state.type === 'error' && (
          <div className="state-message graph-dashboard-error">
            <div>⚠</div>
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
            impactSourceId={impactState.isActive ? impactState.data?.sourceFile : undefined}
          />
        )}
      </div>
    </div>
  )
}