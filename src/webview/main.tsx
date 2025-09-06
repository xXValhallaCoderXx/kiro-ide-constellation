import { render } from 'preact';
import { HelloWorld } from './components/HelloWorld';

const App = () => {
    return (
        <div>
            <HelloWorld />
        </div>
    );
};

render(<App />, document.getElementById('root')!);