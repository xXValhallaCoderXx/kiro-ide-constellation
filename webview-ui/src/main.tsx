import { render } from 'preact'
import { App } from './components/App.tsx'
import './styles/global.css'

render(<App />, document.getElementById('root') as HTMLElement)

