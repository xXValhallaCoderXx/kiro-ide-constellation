import { useEffect, useRef, useState } from 'preact/hooks'
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

interface GraphCanvasProps {
  data: GraphData
  isRendering: boolean
  onRenderingChange: (rendering: boolean) => void
}

export function GraphCanvas({ data, isRendering, onRenderingChange }: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<Core | null>(null)

  // Create/update Cytoscape instance when data changes
  useEffect(() => {
    if (data && containerRef.current) {
      onRenderingChange(true)
      
      // Clean up previous instance to prevent memory leaks
      if (cyRef.current) {
        try {
          // Remove all event listeners before destroying
          cyRef.current.removeAllListeners()
          cyRef.current.destroy()
        } catch (error) {
          console.warn('Error destroying previous Cytoscape instance:', error)
        } finally {
          cyRef.current = null
        }
      }

      // Transform data for Cytoscape with file type detection
      const elements = [
        ...data.nodes.map(node => {
          const ext = getFileExt(node.path)
          return {
            data: {
              id: node.id,
              label: node.label,
              path: node.path,
              language: node.language,
              ext: ext // Add file extension for styling
            }
          }
        }),
        ...data.edges.map(edge => ({
          data: {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            kind: edge.kind
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
            onRenderingChange(false)
            console.log(`Graph layout completed for ${nodeCount} nodes`)
          })

        } catch (error) {
          console.error('Error creating Cytoscape instance:', error)
          onRenderingChange(false)
        }
      }, renderDelay)
    }
  }, [data, onRenderingChange])

  // Enhanced cleanup on unmount
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