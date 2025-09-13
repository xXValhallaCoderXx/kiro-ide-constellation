import { useEffect, useRef, useState } from 'preact/hooks'
import cytoscape, { Core } from 'cytoscape'
import { messenger } from '../services/messenger'

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

export function GraphView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<Core | null>(null)
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

  // Create/update Cytoscape instance when data changes
  useEffect(() => {
    if (state.type === 'data' && containerRef.current) {
      setIsRendering(true)
      
      // Clean up previous instance to prevent memory leaks
      if (cyRef.current) {
        try {
          cyRef.current.destroy()
        } catch (error) {
          console.warn('Error destroying previous Cytoscape instance:', error)
        }
        cyRef.current = null
      }

      // Transform data for Cytoscape
      const elements = [
        ...state.data.nodes.map(node => ({
          data: {
            id: node.id,
            label: node.label,
            path: node.path,
            language: node.language
          }
        })),
        ...state.data.edges.map(edge => ({
          data: {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            kind: edge.kind
          }
        }))
      ]

      // Use setTimeout for large graphs to prevent UI blocking
      const nodeCount = state.data.nodes.length
      const renderDelay = nodeCount > 200 ? 50 : 0
      
      setTimeout(() => {
        try {
          // Create Cytoscape instance with performance optimizations for large graphs
          const layoutConfig = nodeCount > 500 ? {
            // Simplified layout for very large graphs
            name: 'grid',
            fit: true,
            padding: 30
          } : {
            // Standard layout for smaller graphs
            name: 'cose',
            fit: true,
            padding: 30,
            nodeRepulsion: 400000,
            idealEdgeLength: 100,
            edgeElasticity: 100,
            nestingFactor: 5,
            gravity: 80,
            numIter: nodeCount > 200 ? 500 : 1000, // Reduce iterations for large graphs
            initialTemp: 200,
            coolingFactor: 0.95,
            minTemp: 1.0
          }

          cyRef.current = cytoscape({
            container: containerRef.current,
            elements,
            style: [
              {
                selector: 'node',
                style: {
                  'background-color': 'var(--vscode-charts-blue, #007ACC)',
                  'label': 'data(label)',
                  'color': 'var(--vscode-foreground, #CCCCCC)',
                  'font-size': nodeCount > 500 ? '10px' : '12px', // Smaller font for large graphs
                  'text-valign': 'center',
                  'text-halign': 'center',
                  'width': nodeCount > 500 ? '20px' : '30px', // Smaller nodes for large graphs
                  'height': nodeCount > 500 ? '20px' : '30px'
                }
              },
              {
                selector: 'edge',
                style: {
                  'line-color': 'var(--vscode-foreground, #666666)',
                  'width': nodeCount > 500 ? 1 : 2, // Thinner edges for large graphs
                  'opacity': nodeCount > 500 ? 0.4 : 0.6, // More transparent for large graphs
                  'curve-style': 'bezier'
                }
              },
              {
                selector: 'node:selected',
                style: {
                  'border-width': 3,
                  'border-color': 'var(--vscode-focusBorder, #007FD4)',
                  'background-color': 'var(--vscode-charts-orange, #FF8C00)'
                }
              }
            ],
            layout: layoutConfig
          })

          // Add event handlers for interactions
          cyRef.current.on('tap', 'node', (evt) => {
            // Single-click highlighting (node gets selected automatically by Cytoscape)
            const node = evt.target
            console.log('Node selected:', node.data('label'))
          })

          cyRef.current.on('dbltap', 'node', (evt) => {
            // Double-click to open file
            const node = evt.target
            const path = node.data('path')
            if (path) {
              messenger.post('graph/open-file', { path })
            }
          })

          // Handle layout completion for performance monitoring
          cyRef.current.on('layoutstop', () => {
            setIsRendering(false)
            console.log(`Graph layout completed for ${nodeCount} nodes`)
          })

        } catch (error) {
          console.error('Error creating Cytoscape instance:', error)
          setIsRendering(false)
        }
      }, renderDelay)
    }
  }, [state])

  // Cleanup on unmount - ensure proper Cytoscape instance cleanup
  useEffect(() => {
    return () => {
      if (cyRef.current) {
        try {
          // Remove all event listeners before destroying
          cyRef.current.removeAllListeners()
          cyRef.current.destroy()
        } catch (error) {
          console.warn('Error during Cytoscape cleanup:', error)
        } finally {
          cyRef.current = null
        }
      }
    }
  }, [])

  const handleRescan = () => {
    // Reset rendering state when starting a new scan
    setIsRendering(false)
    messenger.post('graph/scan')
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '10px', borderBottom: '1px solid var(--vscode-panel-border, #333)' }}>
        <h2 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>Dependency Graph</h2>
        <button 
          onClick={handleRescan}
          style={{
            padding: '4px 8px',
            fontSize: '12px',
            backgroundColor: 'var(--vscode-button-background, #0e639c)',
            color: 'var(--vscode-button-foreground, #ffffff)',
            border: 'none',
            borderRadius: '2px',
            cursor: 'pointer'
          }}
        >
          Re-scan
        </button>
        {state.type === 'data' && (
          <span style={{ marginLeft: '10px', fontSize: '12px', color: 'var(--vscode-descriptionForeground, #ccccccaa)' }}>
            {state.data.meta.count.nodes} nodes, {state.data.meta.count.edges} edges
            {state.data.meta.performanceOptimized && (
              <span style={{ color: 'var(--vscode-charts-orange, #FF8C00)', marginLeft: '5px' }}>
                (optimized)
              </span>
            )}
          </span>
        )}
      </div>
      
      <div style={{ flex: 1, position: 'relative' }}>
        {state.type === 'loading' && (
          <div style={{ 
            position: 'absolute', 
            top: '50%', 
            left: '50%', 
            transform: 'translate(-50%, -50%)',
            textAlign: 'center'
          }}>
            <p>Loading graph...</p>
          </div>
        )}
        
        {state.type === 'scanning' && (
          <div style={{ 
            position: 'absolute', 
            top: '50%', 
            left: '50%', 
            transform: 'translate(-50%, -50%)',
            textAlign: 'center'
          }}>
            <p>{state.message}</p>
          </div>
        )}
        
        {state.type === 'rendering' && (
          <div style={{ 
            position: 'absolute', 
            top: '50%', 
            left: '50%', 
            transform: 'translate(-50%, -50%)',
            textAlign: 'center'
          }}>
            <p>{state.message}</p>
          </div>
        )}
        
        {(isRendering && state.type === 'data') && (
          <div style={{ 
            position: 'absolute', 
            top: '10px', 
            right: '10px',
            backgroundColor: 'var(--vscode-badge-background, #4d4d4d)',
            color: 'var(--vscode-badge-foreground, #ffffff)',
            padding: '4px 8px',
            borderRadius: '3px',
            fontSize: '11px',
            zIndex: 1000
          }}>
            Rendering...
          </div>
        )}
        
        {state.type === 'error' && (
          <div style={{ 
            position: 'absolute', 
            top: '50%', 
            left: '50%', 
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: 'var(--vscode-errorForeground, #f48771)'
          }}>
            <p>Error: {state.message}</p>
            <button 
              onClick={() => messenger.post('graph/load')}
              style={{
                marginTop: '10px',
                padding: '4px 8px',
                fontSize: '12px',
                backgroundColor: 'var(--vscode-button-background, #0e639c)',
                color: 'var(--vscode-button-foreground, #ffffff)',
                border: 'none',
                borderRadius: '2px',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </div>
        )}
        
        <div 
          ref={containerRef} 
          style={{ 
            width: '100%', 
            height: '100%',
            display: state.type === 'data' ? 'block' : 'none'
          }} 
        />
      </div>
    </div>
  )
}

