import { GraphDashboard } from './GraphDashboard'
import { Button } from './Button'

export function App() {
  return (
    <div>
      <h1>Hello world</h1>
      <p>Welcome to Kiro Constellationsss.</p>
      <GraphDashboard />
      <div style={{ marginTop: 8 }}>
        <Button onClick={() => console.log('clicked')}>Sample Button</Button>
      </div>
    </div>
  )
}

