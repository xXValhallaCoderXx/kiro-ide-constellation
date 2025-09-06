import { h, render } from 'preact';
import { Sidebar } from './components/Sidebar';

const root = document.getElementById('root');
if (root) {
  render(<Sidebar />, root);
}
