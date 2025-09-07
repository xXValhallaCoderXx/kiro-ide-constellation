import { h, render } from 'preact';
import { Sidebar } from './views/Sidebar/Sidebar';

console.log('[KIRO-CONSTELLATION] Sidebar main script loaded');

const root = document.getElementById('root');
if (root) {
  console.log('[KIRO-CONSTELLATION] Rendering Sidebar component');
  render(<Sidebar />, root);
  console.log('[KIRO-CONSTELLATION] Sidebar component rendered');
} else {
  console.error('[KIRO-CONSTELLATION] Root element not found for sidebar');
}
