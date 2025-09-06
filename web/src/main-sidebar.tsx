import { h, render } from 'preact';
import { Sidebar } from './views/Sidebar/Sidebar';

const root = document.getElementById('root');
if (root) {
  render(<Sidebar />, root);
}
