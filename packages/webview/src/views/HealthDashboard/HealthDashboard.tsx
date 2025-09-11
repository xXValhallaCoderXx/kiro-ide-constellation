import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import cytoscape from 'cytoscape';
import styles from './HealthDashboard.module.css';
import { messageBus, events } from '../../services/message-bus.service';

export function HealthDashboard() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty'>('loading');

  useEffect(() => {
    // Listen for graph data from the extension
    const off = messageBus.on(events.DepsGraphData, (e) => {
      const payload = e.payload as any;
      if (!payload || !Array.isArray(payload.nodes)) {
        setStatus('empty');
        return;
      }
      if ((payload.nodes?.length ?? 0) === 0 && (payload.edges?.length ?? 0) === 0) {
        setStatus('empty');
        return;
      }
      setStatus('ready');
      ensureCytoscapeInstance();
      const cy = cyRef.current!;
      cy.batch(() => {
        cy.elements().remove();
        const elements = [
          ...payload.nodes.map((n: any) => ({ data: { id: n.id, label: n.label || n.id, group: n.group } })),
          ...payload.edges.map((ed: any) => ({ data: { id: ed.id, source: ed.source, target: ed.target } }))
        ];
        cy.add(elements as any);
      });
      cy.layout({ name: 'cose', fit: true }).run();
      cy.resize();
    });

    // Request graph data if none was sent yet
    messageBus.emit(events.DepsRequestGraph, undefined as any);

    const onResize = () => {
      if (cyRef.current) cyRef.current.resize();
    };
    window.addEventListener('resize', onResize);

    return () => {
      off();
      window.removeEventListener('resize', onResize);
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, []);

  function ensureCytoscapeInstance() {
    if (cyRef.current || !containerRef.current) return;
    cyRef.current = cytoscape({
      container: containerRef.current,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#4ea1ff',
            'label': 'data(label)',
            'font-size': '10px',
            'text-wrap': 'wrap',
            'text-max-width': '160px',
            'color': 'var(--vscode-foreground)',
            'text-halign': 'center',
            'text-valign': 'center',
            'shape': 'round-rectangle',
            'width': 'label',
            'height': 'label',
            // 'padding': '6px'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 1,
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            'line-color': 'var(--vscode-editor-foreground)',
            'target-arrow-color': 'var(--vscode-editor-foreground)'
          }
        }
      ],
    });
  }

  return (
    <div className={styles.root}>
      {status !== 'ready' && (
        <div className={styles.banner}>
          {status === 'loading' ? 'Loading dependency graph…' : 'No dependency graph data available'}
        </div>
      )}
      <div ref={containerRef} className={styles.graph} />
    </div>
  );
}
