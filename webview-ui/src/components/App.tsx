import { SidePanelView } from '../views/SidePanelView'
import { GraphView } from '../views/GraphView'

export function App() {
  const root = document.getElementById('root') as HTMLElement | null
  const view = root?.dataset.view ?? 'sidepanel'

  if (view === 'graph') {
    return <GraphView />
  }
  return <SidePanelView />
}

