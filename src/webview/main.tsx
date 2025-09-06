import { render } from 'preact';
import { HelloWorld } from './HelloWorld';

function App() {
    return <HelloWorld />;
}

render(<App />, document.getElementById('root')!);
