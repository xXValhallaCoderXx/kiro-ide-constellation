import { Button } from '../components/Button'
import { messenger } from '../services/messenger'

export function SidePanelView() {
  const openGraph = () => {
    messenger.post('open-graph-view')
  }
  return (
    <div>
      <h1>Constellation</h1>
      <p>Side Panel</p>
      <Button onClick={openGraph}>Open Graph View</Button>
    </div>
  )
}

