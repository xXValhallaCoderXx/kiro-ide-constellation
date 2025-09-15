import { useEffect, useRef, useImperativeHandle } from 'preact/hooks'
import { forwardRef } from 'preact/compat'
import cytoscape, { Core } from 'cytoscape'
import { messenger } from '../services/messenger'
import { getFileExt } from '../services/file-type.service'
import { generateGraphStylesheet } from '../services/graph-styles.service'

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

export interface GraphCanvasRef {
  applyFocusView: (params: {
    visibleNodes?: Set<string>;
    visibleEdges?: Set<string>;
    rootId?: string | null;
  }) => void;
  clearFocusView: () => void;
  centerOn: (rootId: string, options?: { animate?: boolean }) => void;
  getPositions: () => Record<string, { x: number; y: number }>;
  setPositions: (positions: Record<string, { x: number; y: number }>) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fitView: () => void;
  getBoundsAndViewport: () => { bounds: { x1: number; y1: number; x2: number; y2: number; w: number; h: number }; viewport: { x1: number; y1: number; x2: number; y2: number; w: number; h: number } } | null;
}

interface GraphCanvasProps {
  data: GraphData
  isRendering: boolean
  onRenderingChange: (rendering: boolean) => void
  impactSourceId?: string
  onNodeDrill?: (nodeId: string) => void
  onNodeSelect?: (nodeId: string) => void
  onViewportChange?: (payload: { bounds: { x1: number; y1: number; x2: number; y2: number; w: number; h: number }; viewport: { x1: number; y1: number; x2: number; y2: number; w: number; h: number } }) => void
}

export const GraphCanvas = forwardRef<GraphCanvasRef, GraphCanvasProps>(
  ({ data, isRendering, onRenderingChange, impactSourceId, onNodeDrill, onNodeSelect, onViewportChange }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const cyRef = useRef<Core | null>(null)
    const lastFitRef = useRef<number>(Date.now())
    const tapTimeoutRef = useRef<number | null>(null)
    // Keep a stable reference to the callback so the effect below doesn't re-run
    const onRenderingChangeRef = useRef(onRenderingChange)
    useEffect(() => { onRenderingChangeRef.current = onRenderingChange }, [onRenderingChange])

    // Expose imperative API through ref
    useImperativeHandle(ref, () => ({
      applyFocusView: ({ visibleNodes, visibleEdges, rootId }) => {
        if (!cyRef.current) return

        const startTime = performance.now()

        cyRef.current.batch(() => {
          // Default behavior: show everything, then optionally hide the non-visible set
          cyRef.current!.elements().removeClass('cy-hidden cy-dimmed cy-focus-root cy-focus-child')

          if (visibleNodes && visibleEdges) {
            // Hide nodes not in the visible set
            cyRef.current!.nodes().forEach(n => {
              if (!visibleNodes.has(n.id())) n.addClass('cy-hidden')
            })
            // Hide edges not in the visible set
            cyRef.current!.edges().forEach(e => {
              if (!visibleEdges.has(e.id())) e.addClass('cy-hidden')
            })

            // Emphasis
            if (rootId) {
              cyRef.current!.nodes().forEach(n => {
                if (n.id() === rootId) {
                  n.addClass('cy-focus-root')
                } else {
                  const isDirectChild = cyRef.current!.edges(`[source="${rootId}"][target="${n.id()}"]`).length > 0
                  if (isDirectChild) n.addClass('cy-focus-child')
                }
              })
            }
          }
        })

        // Keep dragging enabled on the visible set
        try {
          cyRef.current.autoungrabify(false)
          cyRef.current.nodes().grabify()
        } catch {/* ignore */}

        // Performance monitoring - log when operations exceed 50ms threshold
        const duration = performance.now() - startTime
        if (duration > 50) {
          console.warn(`Focus mode applyFocusView took ${duration.toFixed(2)}ms (threshold: 50ms)`) 
        }

        // Center if root provided
        if (rootId) {
          const node = cyRef.current.getElementById(rootId)
          if (node.length > 0) cyRef.current.center(node)
        }
      },

      clearFocusView: () => {
        if (!cyRef.current) return
        cyRef.current.batch(() => {
          cyRef.current!.elements().removeClass('cy-hidden cy-dimmed cy-focus-root cy-focus-child')
        })
        try {
          cyRef.current.autoungrabify(false)
          cyRef.current.nodes().grabify()
        } catch {/* ignore */}
      },

      centerOn: (rootId, options = { animate: true }) => {
        if (!cyRef.current) return

        const node = cyRef.current.getElementById(rootId)
        if (node.length > 0) {
          const animationDuration = options.animate ? 175 : 0
          cyRef.current.center(node)
          if (options.animate) {
            cyRef.current.animate({
              center: { eles: node },
              duration: animationDuration,
              easing: 'ease-out'
            })
          }
        }
      },

      getPositions: () => {
        if (!cyRef.current) return {}

        const positions: Record<string, { x: number; y: number }> = {}
        cyRef.current.nodes().forEach(node => {
          const pos = node.position()
          positions[node.id()] = { x: pos.x, y: pos.y }
        })
        return positions
      },

      setPositions: (positions) => {
        if (!cyRef.current) return

        cyRef.current.batch(() => {
          Object.entries(positions).forEach(([nodeId, pos]) => {
            const node = cyRef.current!.getElementById(nodeId)
            if (node.length > 0) {
              node.position(pos)
            }
          })
        })
      },

      zoomIn: () => {
        if (!cyRef.current) return
        const z = cyRef.current.zoom()
        cyRef.current.zoom({ level: z * 1.2, renderedPosition: { x: cyRef.current.width() / 2, y: cyRef.current.height() / 2 } })
      },

      zoomOut: () => {
        if (!cyRef.current) return
        const z = cyRef.current.zoom()
        cyRef.current.zoom({ level: z / 1.2, renderedPosition: { x: cyRef.current.width() / 2, y: cyRef.current.height() / 2 } })
      },

      fitView: () => {
        if (!cyRef.current) return
        try {
          cyRef.current.fit(undefined, 30)
        } catch {/* noop */}
      },

      getBoundsAndViewport: () => {
        if (!cyRef.current) return null
        const bb = cyRef.current.elements().boundingBox()
        const vp = cyRef.current.extent() // {x1,y1,x2,y2,w,h}
        return { bounds: { ...bb, w: bb.w, h: bb.h }, viewport: vp as any }
      }
    }), [])

  // Create/update Cytoscape instance only when data changes
  useEffect(() => {
    if (data && containerRef.current) {
      // Notify parent that (re)render is starting for new data only
      onRenderingChangeRef.current?.(true)

      // Clean up previous instance to prevent memory leaks
      if (cyRef.current) {
        try {
          // Cytoscape doesn't have removeAllListeners; defensively try off('*')
          // @ts-ignore - off('*') is accepted at runtime
          cyRef.current.off?.('*')
          cyRef.current.destroy()
        } catch (error) {
          console.warn('Error destroying previous Cytoscape instance:', error)
        } finally {
          cyRef.current = null
        }
      }

      // Compute direct children for role styling
      const directChildren = new Set<string>()
      if (impactSourceId) {
        for (const e of data.edges) {
          if (e.source === impactSourceId) {
            directChildren.add(e.target)
          }
        }
      }

      // Transform data for Cytoscape with file type detection
      const elements = [
        ...data.nodes.map(node => {
          const ext = getFileExt(node.path)
          const role = impactSourceId
            ? (node.id === impactSourceId
              ? 'source'
              : (directChildren.has(node.id) ? 'direct-child' : 'indirect-child'))
            : 'normal'
          return {
            data: {
              id: node.id,
              label: node.label,
              path: node.path,
              language: node.language,
              ext: ext, // Add file extension for styling
              isSource: impactSourceId === node.id, // Mark epicenter node for highlighting
              role
            }
          }
        }),
        ...data.edges.map(edge => ({
          data: {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            kind: edge.kind,
            fromSource: impactSourceId ? edge.source === impactSourceId : false
          }
        }))
      ]

      // Use setTimeout for large graphs to prevent UI blocking
      const nodeCount = data.nodes.length
      const renderDelay = nodeCount > 200 ? 50 : 0

      setTimeout(() => {
        try {
          // Create layout configuration with performance optimizations
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

          // Generate stylesheet with file type colors
          const stylesheet = generateGraphStylesheet(nodeCount)

          cyRef.current = cytoscape({
            container: containerRef.current,
            elements,
            style: stylesheet,
            layout: layoutConfig
          })

          // Emit viewport helper
          const emitViewport = () => {
            try {
              const bb = cyRef.current!.elements().boundingBox()
              const vp = cyRef.current!.extent()
              onViewportChange?.({ bounds: { ...bb, w: bb.w, h: bb.h }, viewport: vp as any })
            } catch {/* ignore */}
          }

          // Inject a synthetic data property on nodes so the label outline can reference the webview background
          // We re-use Cytoscape's data API to expose a runtime-derived color without re-creating the stylesheet
          const bg = getComputedStyle(document.documentElement).getPropertyValue('--vscode-editor-background').trim() || '#1e1e1e'
          cyRef.current.nodes().forEach(n => {
            n.data('textOutlineColor', bg)
          })

          // Add event handlers for interactions
          cyRef.current.on('tap', 'node', (evt) => {
            // Delay selection slightly to allow dbltap to cancel it
            const node = evt.target
            const nodeId = node.id()
            if (tapTimeoutRef.current) {
              window.clearTimeout(tapTimeoutRef.current)
              tapTimeoutRef.current = null
            }
            tapTimeoutRef.current = window.setTimeout(() => {
              if (onNodeSelect) onNodeSelect(nodeId)
              else console.log('Node selected:', node.data('label'))
              tapTimeoutRef.current = null
            }, 220)
          })

          cyRef.current.on('dbltap', 'node', (evt) => {
            // Cancel pending single-selection
            if (tapTimeoutRef.current) {
              window.clearTimeout(tapTimeoutRef.current)
              tapTimeoutRef.current = null
            }
            const node = evt.target
            const nodeId = node.id()
            const path = node.data('path')
            const alt = (evt.originalEvent as any)?.altKey

            if (alt && path) {
              messenger.post('graph/open-file', { path })
              return
            }
            if (onNodeDrill) {
              onNodeDrill(nodeId)
            } else if (path) {
              messenger.post('graph/open-file', { path })
            }
          })

          // Handle layout completion for performance monitoring
          cyRef.current.on('layoutstop', () => {
            onRenderingChangeRef.current?.(false)
            emitViewport()
            console.log(`Graph layout completed for ${nodeCount} nodes`)
          })

          // Track viewport changes for minimap
          cyRef.current.on('viewport resize', emitViewport)
          // Emit once after init
          emitViewport()

        } catch (error) {
          console.error('Error creating Cytoscape instance:', error)
          onRenderingChangeRef.current?.(false)
        }
      }, renderDelay)
    }
  }, [data, impactSourceId, onNodeDrill])

  // Enhanced cleanup on unmount
  useEffect(() => {
    return () => {
      if (tapTimeoutRef.current) {
        window.clearTimeout(tapTimeoutRef.current)
        tapTimeoutRef.current = null
      }
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

    return (
      <div className="graph-canvas">
        {/* Rendering indicator */}
        {isRendering && (
          <div className="graph-canvas-overlay">
            <div className="graph-canvas-indicator">
              Rendering...
            </div>
          </div>
        )}

        {/* Cytoscape container */}
        <div
          ref={containerRef}
          className="graph-canvas-container"
          data-testid="graph-canvas"
        />
      </div>
    )
  }
)