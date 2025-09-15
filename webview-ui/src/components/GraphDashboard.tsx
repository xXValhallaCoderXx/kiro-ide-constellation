import { useCallback, useEffect, useState, useRef } from 'preact/hooks'
import { messenger } from '../services/messenger'
import { GraphToolbar } from './GraphToolbar'
import { GraphCanvas, GraphCanvasRef } from './GraphCanvas'
import { Button } from './Button'
import { FileInfoPanel } from './FileInfoPanel'
import { FocusBreadcrumb } from './FocusBreadcrumb'
import { ZoomControlStack } from './molecules/ZoomControlStack'
import { MiniMapPanel } from './molecules/MiniMapPanel'
import { OPTIONAL_UI_FLAGS } from '../services/extension-config.service'
import { 
  buildAdjacency, 
  computeVisible, 
  formatCrumb,
  validateRootNode,
  countChildren,
  validateGraphData,
  cleanupPositionCache,
  type FocusLens, 
  type Crumb,
  type FocusError,
  type ChildrenInfo
} from '../services/focus-mode.service'

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

interface FocusState {
  isActive: boolean
  root: string | null
  depth: number
  lens: FocusLens
  visibleNodes: Set<string>
  visibleEdges: Set<string>
  crumbs: Crumb[]
  positionCache: Record<string, { x: number; y: number }>
  error: FocusError | null
  childrenInfo: ChildrenInfo | null
}

type ComponentState = 
  | { type: 'loading' }
  | { type: 'error'; message: string }
  | { type: 'data'; data: GraphData }
  | { type: 'scanning'; message: string }
  | { type: 'rendering'; message: string }

// Git metrics payload type for UI
interface FileGitMetrics90d {
  commitCount: number
  churn: number
  lastModifiedAt: number | null
  authorCount: number
  primaryAuthor?: string
}

export function GraphDashboard() {
  const [state, setState] = useState<ComponentState>({ type: 'loading' })
  const [isRendering, setIsRendering] = useState(false)
  const [fullGraphData, setFullGraphData] = useState<GraphData | null>(null)
  const [impactState, setImpactState] = useState<ImpactState>({ isActive: false })
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [gitMetrics, setGitMetrics] = useState<Record<string, FileGitMetrics90d>>({})
  const [gitMetricsReady, setGitMetricsReady] = useState(false)
  const [miniMapState, setMiniMapState] = useState<{ bounds: { x1: number; y1: number; x2: number; y2: number; w: number; h: number }; viewport: { x1: number; y1: number; x2: number; y2: number; w: number; h: number } } | null>(null)
  const [focusState, setFocusState] = useState<FocusState>({
    isActive: false,
    root: null,
    depth: 1,
    lens: 'children',
    visibleNodes: new Set(),
    visibleEdges: new Set(),
    crumbs: [],
    positionCache: {},
    error: null,
    childrenInfo: null
  })
  
  // Keep latest impact state in a ref to avoid stale closure inside message handler
  const impactRef = useRef<ImpactState>({ isActive: false })
  useEffect(() => { impactRef.current = impactState }, [impactState])
  
  // Refs for adjacency maps and GraphCanvas
  const forwardAdjRef = useRef<Map<string, string[]>>(new Map())
  const reverseAdjRef = useRef<Map<string, string[]>>(new Map())
  const graphCanvasRef = useRef<GraphCanvasRef>(null)
  // Flag to apply focus after rendering/layout completes
  const needsFocusApplyRef = useRef<boolean>(false)

  // Helper function to rebuild adjacency maps for the active graph
  const rebuildAdjacencyMaps = useCallback((activeGraph: GraphData) => {
    try {
      const { forwardAdj, reverseAdj } = buildAdjacency(activeGraph)
      forwardAdjRef.current = forwardAdj
      reverseAdjRef.current = reverseAdj
    } catch (error) {
      console.error('Failed to rebuild adjacency maps:', error)
      throw error
    }
  }, [])

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

  // Align visible edge IDs with actual graph edge IDs (handles '-1' suffix collisions)
  const getAlignedVisibleEdges = useCallback((activeGraph: GraphData, visibleNodes: Set<string>): Set<string> => {
    const aligned = new Set<string>()
    for (const e of activeGraph.edges) {
      if (visibleNodes.has(e.source) && visibleNodes.has(e.target)) {
        aligned.add(e.id)
      }
    }
    return aligned
  }, [])

  // Helper to apply the current focus to the canvas and center on root
  const applyFocus = useCallback((activeGraph: GraphData, visibleNodes: Set<string>, rootId: string) => {
    if (!graphCanvasRef.current) return
    const alignedEdges = getAlignedVisibleEdges(activeGraph, visibleNodes)
    graphCanvasRef.current.applyFocusView({
      visibleNodes,
      visibleEdges: alignedEdges,
      rootId
    })
    graphCanvasRef.current.centerOn(rootId, { animate: true })
  }, [getAlignedVisibleEdges])

  // Function to reset impact view and restore full graph
  const handleResetImpactView = useCallback(() => {
    if (fullGraphData) {
      setImpactState({ isActive: false })
      setState({ type: 'data', data: fullGraphData })
    }
  }, [fullGraphData])

  // Toast notification function for error messages
  const showToast = useCallback((message: string, type: 'error' | 'warning' | 'info' = 'error') => {
    // Simple console-based toast for now - could be enhanced with a proper toast system
    console.warn(`Focus Mode ${type.toUpperCase()}: ${message}`)
    
    // Update focus state with error
    setFocusState(prev => ({
      ...prev,
      error: {
        type: type === 'error' ? 'unknown' : 'performance',
        message
      }
    }))
    
    // Clear error after 5 seconds
    setTimeout(() => {
      setFocusState(prev => ({ ...prev, error: null }))
    }, 5000)
  }, [])

  // Reset function - defined first to avoid hoisting issues
  const handleReset = useCallback(() => {
    // Clear focus state including error and children info
    setFocusState({
      isActive: false,
      root: null,
      depth: 1,
      lens: 'children',
      visibleNodes: new Set(),
      visibleEdges: new Set(),
      crumbs: [],
      positionCache: {},
      error: null,
      childrenInfo: null
    })

    // Clear focus view on canvas so all nodes/edges are visible again
    if (graphCanvasRef.current) {
      graphCanvasRef.current.clearFocusView()
    }

    // Clear impact state and return to full graph
    if (impactState.isActive) {
      setImpactState({ isActive: false })
    }

    // Return to full graph view and rebuild adjacency maps for full graph
    if (fullGraphData) {
      try {
        rebuildAdjacencyMaps(fullGraphData)
        setState({ type: 'data', data: fullGraphData })
      } catch (error) {
        console.error('Failed to rebuild adjacency maps during reset:', error)
        setState({ type: 'error', message: 'Failed to reset to full graph view' })
      }
    }
  }, [impactState.isActive, fullGraphData, rebuildAdjacencyMaps])

  // Focus mode methods
  const handleNodeDrill = useCallback((nodeId: string) => {
    if (!fullGraphData) return

    // Determine active graph (impact subgraph or full graph)
    const activeGraph = impactState.isActive && impactState.filteredGraph 
      ? impactState.filteredGraph 
      : fullGraphData

    // Validate graph data structure
    const graphValidation = validateGraphData(activeGraph)
    if (!graphValidation.isValid) {
      showToast(`Malformed graph data: ${graphValidation.error}. Falling back to full graph view.`, 'error')
      // Fallback to full graph view
      if (fullGraphData) {
        setState({ type: 'data', data: fullGraphData })
        setImpactState({ isActive: false })
      }
      return
    }

    // Root node validation - check if node exists in current graph
    if (!validateRootNode(activeGraph, nodeId)) {
      showToast(`Node "${nodeId}" not found in current graph. This may be due to stale breadcrumbs.`, 'error')
      // Reset to full graph view
      handleReset()
      return
    }

    // Count children to check for empty state and extreme fan-out
    const childrenCount = countChildren(forwardAdjRef.current, reverseAdjRef.current, nodeId, 'children')
    const maxChildren = 100
    const hasMore = childrenCount > maxChildren
    const displayCount = Math.min(childrenCount, maxChildren)

    // Handle empty children state
    if (childrenCount === 0) {
      setFocusState(prev => ({
        ...prev,
        isActive: true,
        root: nodeId,
        depth: 1,
        lens: 'children',
        visibleNodes: new Set([nodeId]),
        visibleEdges: new Set(),
        crumbs: [...prev.crumbs, formatCrumb(activeGraph, nodeId, 1, 'children')],
        error: null,
        childrenInfo: {
          count: 0,
          hasMore: false,
          displayCount: 0
        }
      }))

      // Apply focus view showing only the root node
      if (graphCanvasRef.current) {
        applyFocus(activeGraph, new Set([nodeId]), nodeId)
      } else {
        needsFocusApplyRef.current = true
      }
      return
    }

    // Cache current positions before applying focus
    if (graphCanvasRef.current) {
      const positions = graphCanvasRef.current.getPositions()
      setFocusState(prev => ({ 
        ...prev, 
        positionCache: cleanupPositionCache(positions, new Set(activeGraph.nodes.map(n => n.id)))
      }))
    }

    try {
      // Compute visibility using BFS with performance monitoring
      const visibilityResult = computeVisible({
        forwardAdj: forwardAdjRef.current,
        reverseAdj: reverseAdjRef.current,
        root: nodeId,
        depth: Number.MAX_SAFE_INTEGER, // full depth
        lens: 'children',
        maxChildren
      })

      // Create new breadcrumb (store full depth)
      const newCrumb = formatCrumb(activeGraph, nodeId, Number.MAX_SAFE_INTEGER, 'children')

      // Update focus state
      setFocusState(prev => ({
        ...prev,
        isActive: true,
        root: nodeId,
        depth: 1,
        lens: 'children',
        visibleNodes: visibilityResult.visibleNodes,
        visibleEdges: visibilityResult.visibleEdges,
        crumbs: [...prev.crumbs, newCrumb],
        error: null,
        childrenInfo: {
          count: childrenCount,
          hasMore,
          displayCount
        }
      }))

      // Apply focus view to canvas
      if (graphCanvasRef.current && !isRendering) {
        applyFocus(activeGraph, visibilityResult.visibleNodes, nodeId)
      } else {
        needsFocusApplyRef.current = true
      }

      // Log extreme fan-out warning
      if (hasMore) {
        console.warn(`Focus mode: Node "${nodeId}" has ${childrenCount} children, showing only ${displayCount} (capped at ${maxChildren})`)
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during focus computation'
      showToast(`Failed to compute focus view: ${errorMessage}`, 'error')
      
      // Fallback to full graph view
      handleReset()
    }
  }, [fullGraphData, impactState, showToast, handleReset])

  const handleBreadcrumbJump = useCallback((index: number) => {
    if (!fullGraphData || index >= focusState.crumbs.length) return

    const targetCrumb = focusState.crumbs[index]
    
    // Determine active graph
    const activeGraph = impactState.isActive && impactState.filteredGraph 
      ? impactState.filteredGraph 
      : fullGraphData

    // Validate graph data structure
    const graphValidation = validateGraphData(activeGraph)
    if (!graphValidation.isValid) {
      showToast(`Malformed graph data: ${graphValidation.error}. Falling back to full graph view.`, 'error')
      handleReset()
      return
    }

    // Root node validation for stale breadcrumbs
    if (!validateRootNode(activeGraph, targetCrumb.root)) {
      showToast(`Breadcrumb target "${targetCrumb.root}" not found in current graph. Resetting to full view.`, 'error')
      handleReset()
      return
    }

    try {
      // Count children for the target crumb
      const childrenCount = countChildren(forwardAdjRef.current, reverseAdjRef.current, targetCrumb.root, targetCrumb.lens)
      const maxChildren = 100
      const hasMore = childrenCount > maxChildren
      const displayCount = Math.min(childrenCount, maxChildren)

      // Recompute visibility for the target crumb
      const visibilityResult = computeVisible({
        forwardAdj: forwardAdjRef.current,
        reverseAdj: reverseAdjRef.current,
        root: targetCrumb.root,
        depth: targetCrumb.depth,
        lens: targetCrumb.lens,
        maxChildren
      })

      // Update focus state and truncate later crumbs
      setFocusState(prev => ({
        ...prev,
        root: targetCrumb.root,
        depth: targetCrumb.depth,
        lens: targetCrumb.lens,
        visibleNodes: visibilityResult.visibleNodes,
        visibleEdges: visibilityResult.visibleEdges,
        crumbs: prev.crumbs.slice(0, index + 1),
        error: null,
        childrenInfo: {
          count: childrenCount,
          hasMore,
          displayCount
        }
      }))

      // Apply focus view to canvas
      if (graphCanvasRef.current && !isRendering) {
        applyFocus(activeGraph, visibilityResult.visibleNodes, targetCrumb.root)
      } else {
        needsFocusApplyRef.current = true
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during breadcrumb jump'
      showToast(`Failed to jump to breadcrumb: ${errorMessage}`, 'error')
      handleReset()
    }
  }, [fullGraphData, focusState.crumbs, impactState, showToast, handleReset])

  const handleEscapeKey = useCallback(() => {
    if (focusState.crumbs.length > 0) {
      if (focusState.crumbs.length === 1) {
        // If only one crumb, reset completely
        handleReset()
      } else {
        // Navigate back to previous breadcrumb level
        handleBreadcrumbJump(focusState.crumbs.length - 2)
      }
    }
  }, [focusState.crumbs, handleReset, handleBreadcrumbJump])

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
          
          // Validate graph data structure before processing
          const graphValidation = validateGraphData(graphPayload)
          if (!graphValidation.isValid) {
            setState({ type: 'error', message: `Invalid graph data: ${graphValidation.error}` })
            break
          }

          // Store full graph data for reset functionality
          setFullGraphData(graphPayload)

          // If an impact arrived before data, apply it now (using ref to avoid stale closure)
          if (impactRef.current.isActive && impactRef.current.data) {
            try {
              const filteredGraph = computeFilteredGraph(graphPayload, impactRef.current.data.affectedFiles)
              
              // Build adjacency maps for the filtered graph (active graph)
              rebuildAdjacencyMaps(filteredGraph)
              
              setImpactState((prev) => ({ ...prev, filteredGraph }))
              setState({ type: 'data', data: filteredGraph })

              // Compute and apply initial focus for deferred impact
              const sourceId = impactRef.current.data.sourceFile
              if (filteredGraph.nodes.some(n => n.id === sourceId)) {
                const visibilityResult = computeVisible({
                  forwardAdj: forwardAdjRef.current,
                  reverseAdj: reverseAdjRef.current,
                  root: sourceId,
                  depth: Number.MAX_SAFE_INTEGER,
                  lens: 'children',
                  maxChildren: 100
                })

                const childrenCount = countChildren(forwardAdjRef.current, reverseAdjRef.current, sourceId, 'children')
                const maxChildren = 100
                const hasMore = childrenCount > maxChildren
                const displayCount = Math.min(childrenCount, maxChildren)

                setFocusState({
                  isActive: true,
                  root: sourceId,
                  depth: Number.MAX_SAFE_INTEGER,
                  lens: 'children',
                  visibleNodes: visibilityResult.visibleNodes,
                  visibleEdges: visibilityResult.visibleEdges,
                  crumbs: [formatCrumb(filteredGraph, sourceId, Number.MAX_SAFE_INTEGER, 'children')],
                  positionCache: {},
                  error: null,
                  childrenInfo: { count: childrenCount, hasMore, displayCount }
                })

                // Try to apply immediately; otherwise defer until render completes
                if (graphCanvasRef.current && !isRendering) {
                  applyFocus(filteredGraph, visibilityResult.visibleNodes, sourceId)
                } else {
                  needsFocusApplyRef.current = true
                }
              }
            } catch (error) {
              console.error('Failed to compute filtered graph or build adjacency maps:', error)
              // Fallback to full graph
              try {
                rebuildAdjacencyMaps(graphPayload)
                setState({ type: 'data', data: graphPayload })
              } catch (fallbackError) {
                setState({ type: 'error', message: 'Failed to process graph data structure' })
              }
            }
            break
          }

          // Build adjacency maps for the full graph (active graph when no impact)
          try {
            rebuildAdjacencyMaps(graphPayload)
          } catch (error) {
            setState({ type: 'error', message: 'Failed to process graph data structure' })
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
            
            // Rebuild adjacency maps for the filtered graph (active graph)
            try {
              rebuildAdjacencyMaps(filteredGraph)
            } catch (error) {
              console.error('Failed to rebuild adjacency maps for impact graph:', error)
              setState({ type: 'error', message: 'Failed to process impact analysis data' })
              break
            }
            
            // Update impact state
            setImpactState({
              isActive: true,
              data: impactData,
              filteredGraph
            })
            
            // Automatically activate focus mode with sourceFile as root (Requirement 5.1, 5.2)
            if (filteredGraph.nodes.some(node => node.id === impactData.sourceFile)) {
              // Seed breadcrumbs with sourceFile as first crumb (Requirement 5.2)
              const sourceCrumb = formatCrumb(filteredGraph, impactData.sourceFile, 1, 'children')
              
              // Compute visibility for the source file
              try {
                const visibilityResult = computeVisible({
                  forwardAdj: forwardAdjRef.current,
                  reverseAdj: reverseAdjRef.current,
                  root: impactData.sourceFile,
                  depth: Number.MAX_SAFE_INTEGER, // full depth for initial impact focus
                  lens: 'children',
                  maxChildren: 100
                })

                // Count children for display info
                const childrenCount = countChildren(forwardAdjRef.current, reverseAdjRef.current, impactData.sourceFile, 'children')
                const maxChildren = 100
                const hasMore = childrenCount > maxChildren
                const displayCount = Math.min(childrenCount, maxChildren)

                // Activate focus mode with source file as root
                setFocusState({
                  isActive: true,
                  root: impactData.sourceFile,
                  depth: Number.MAX_SAFE_INTEGER,
                  lens: 'children',
                  visibleNodes: visibilityResult.visibleNodes,
                  visibleEdges: visibilityResult.visibleEdges,
                  crumbs: [formatCrumb(filteredGraph, impactData.sourceFile, Number.MAX_SAFE_INTEGER, 'children')],
                  positionCache: {},
                  error: null,
                  childrenInfo: {
                    count: childrenCount,
                    hasMore,
                    displayCount
                  }
                })

                // Try to apply immediately; otherwise defer until render completes
                if (graphCanvasRef.current && !isRendering) {
                  applyFocus(filteredGraph, visibilityResult.visibleNodes, impactData.sourceFile)
                } else {
                  needsFocusApplyRef.current = true
                }
              } catch (error) {
                console.error('Failed to compute focus view for impact source:', error)
                // Fall back to showing the filtered graph without focus
                setFocusState(prev => ({ ...prev, isActive: false, crumbs: [] }))
              }
            }
            
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
        case 'graph/metrics': {
          // Git metrics arrived (pre-scan or cached)
          const payload = msg.payload as { horizonDays: number; available: boolean; metrics: Record<string, FileGitMetrics90d> }
          if (payload && typeof payload === 'object') {
            setGitMetrics(payload.metrics || {})
            setGitMetricsReady(true)
          }
          break
        }
      }
    }

    messenger.on(handleMessage)
  }, [])

  // Keyboard event listener for Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && focusState.crumbs.length > 0) {
        event.preventDefault()
        handleEscapeKey()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [focusState.crumbs.length, handleEscapeKey])

  // Position cache cleanup for long-running sessions
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      if (fullGraphData && Object.keys(focusState.positionCache).length > 0) {
        const validNodeIds = new Set(fullGraphData.nodes.map(n => n.id))
        const cleanedCache = cleanupPositionCache(focusState.positionCache, validNodeIds)
        
        // Only update if cleanup actually removed entries
        if (Object.keys(cleanedCache).length !== Object.keys(focusState.positionCache).length) {
          setFocusState(prev => ({ ...prev, positionCache: cleanedCache }))
        }
      }
    }, 60000) // Cleanup every minute

    return () => clearInterval(cleanupInterval)
  }, [fullGraphData, focusState.positionCache])

  // Apply deferred focus once rendering/layout completes
  useEffect(() => {
    if (state.type !== 'data') return
    if (isRendering) return
    if (!focusState.isActive || !focusState.root) return
    if (!needsFocusApplyRef.current) return

    const activeGraph = impactState.isActive && impactState.filteredGraph
      ? impactState.filteredGraph
      : fullGraphData

    if (activeGraph) {
      applyFocus(activeGraph, focusState.visibleNodes, focusState.root)
      needsFocusApplyRef.current = false
    }
  }, [state.type, isRendering, focusState.isActive, focusState.root, impactState.isActive, fullGraphData, applyFocus])

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
        {/* Focus breadcrumb navigation */}
        {focusState.crumbs.length > 0 && (
          <FocusBreadcrumb
            crumbs={focusState.crumbs}
            onJump={handleBreadcrumbJump}
            onReset={handleReset}
            currentDepth={focusState.depth === Number.MAX_SAFE_INTEGER ? 0 : focusState.depth}
            onDepthChange={(delta) => {
              // Implement true +/- depth control with clamping
              const last = focusState.crumbs[focusState.crumbs.length - 1]
              if (!last) return

              const prevDepth = focusState.depth === Number.MAX_SAFE_INTEGER ? 3 : focusState.depth // treat 'All' as 3 for stepping
              let nextDepth = prevDepth + delta
              if (nextDepth < 1) nextDepth = 1
              if (nextDepth > 10) nextDepth = 10 // sanity cap; adjust later

              // Determine active graph
              const activeGraph = impactState.isActive && impactState.filteredGraph 
                ? impactState.filteredGraph 
                : fullGraphData
              if (!activeGraph) return

              const visibility = computeVisible({
                forwardAdj: forwardAdjRef.current,
                reverseAdj: reverseAdjRef.current,
                root: last.root,
                depth: nextDepth,
                lens: last.lens,
                maxChildren: 100
              })
              setFocusState(prev => ({
                ...prev,
                depth: nextDepth,
                visibleNodes: visibility.visibleNodes,
                visibleEdges: visibility.visibleEdges,
                crumbs: prev.crumbs.map((c, i) => i === prev.crumbs.length - 1 ? { ...c, depth: nextDepth } : c)
              }))
              graphCanvasRef.current?.applyFocusView({ visibleNodes: visibility.visibleNodes, visibleEdges: visibility.visibleEdges, rootId: last.root })
              graphCanvasRef.current?.centerOn(last.root, { animate: true })
            }}
          />
        )}

        {/* Focus mode error display */}
        {focusState.error && (
          <div className="focus-error-banner" role="alert" aria-live="polite">
            <span className="focus-error-icon">⚠</span>
            <span className="focus-error-message">{focusState.error.message}</span>
            <button 
              className="focus-error-dismiss"
              onClick={() => setFocusState(prev => ({ ...prev, error: null }))}
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {/* Empty children state display */}
        {focusState.isActive && focusState.childrenInfo?.count === 0 && (
          <div className="focus-empty-state" role="status" aria-live="polite">
            <span className="focus-empty-icon">📁</span>
            <span className="focus-empty-message">No children at depth 1</span>
            <span className="focus-empty-hint">This node has no dependencies to explore</span>
          </div>
        )}

        {/* Fan-out information display */}
        {focusState.isActive && focusState.childrenInfo && focusState.childrenInfo.hasMore && (
          <div className="focus-fanout-info" role="status" aria-live="polite">
            <span className="focus-fanout-icon">📊</span>
            <span className="focus-fanout-message">
              Showing {focusState.childrenInfo.displayCount} of {focusState.childrenInfo.count} children
            </span>
            <span className="focus-fanout-badge">
              +{focusState.childrenInfo.count - focusState.childrenInfo.displayCount} more
            </span>
          </div>
        )}

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
          <>
            <GraphCanvas
              ref={graphCanvasRef}
              data={state.data}
              isRendering={isRendering}
              onRenderingChange={handleRenderingChange}
              impactSourceId={impactState.isActive ? impactState.data?.sourceFile : undefined}
              onNodeDrill={handleNodeDrill}
              onNodeSelect={(id) => setSelectedNodeId(id)}
              onViewportChange={(payload) => setMiniMapState(payload)}
            />

            {/* Optional floating zoom controls */}
            {OPTIONAL_UI_FLAGS.zoomControlsEnabled && (
              <ZoomControlStack
                onZoomIn={() => graphCanvasRef.current?.zoomIn()}
                onZoomOut={() => graphCanvasRef.current?.zoomOut()}
                onFit={() => graphCanvasRef.current?.fitView()}
              />
            )}

            {/* Optional Mini-map panel */}
            {OPTIONAL_UI_FLAGS.miniMapEnabled && (
              <div className="graph-minimap-container">
                <MiniMapPanel
                  title="Mini-map"
                  bounds={miniMapState?.bounds || null}
                  viewport={miniMapState?.viewport || null}
                />
              </div>
            )}

            {/* File info panel in top-right */}
            {selectedNodeId && (
              <FileInfoPanel
                nodeId={selectedNodeId}
                node={state.data.nodes.find(n => n.id === selectedNodeId) || null}
                inDegree={reverseAdjRef.current.get(selectedNodeId)?.length || 0}
                outDegree={forwardAdjRef.current.get(selectedNodeId)?.length || 0}
                metrics={gitMetrics[selectedNodeId]}
                metricsReady={gitMetricsReady}
                onOpenFile={() => {
                  const node = state.data.nodes.find(n => n.id === selectedNodeId)
                  if (node?.path) messenger.post('graph/open-file', { path: node.path })
                }}
                onClose={() => setSelectedNodeId(null)}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}