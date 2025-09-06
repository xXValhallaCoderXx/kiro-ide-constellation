import { h, render } from 'preact';
import { Sidebar } from './Sidebar';

// Mount the Sidebar component to the root element
const root = document.getElementById('root');
if (root) {
  render(<Sidebar />, root);
}