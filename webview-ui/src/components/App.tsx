import { SidePanelView } from '../views/SidePanelView'
import { GraphDashboard } from './GraphDashboard'
import { Playground } from '../views/Playground'

export function App() {
  const root = document.getElementById('root') as HTMLElement | null
  const view = root?.dataset.view ?? 'sidepanel'

  if (view === 'graph') {
    return <GraphDashboard />
  }
  if (view === 'playground') {
    return <Playground />
  }
  return <SidePanelView />
}

