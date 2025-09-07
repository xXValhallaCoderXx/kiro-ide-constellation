import { h, render } from 'preact';
import { HealthDashboard } from './views/HealthDashboard/HealthDashboard';

console.log('[KIRO-CONSTELLATION] Dashboard main script loaded');

const root = document.getElementById('root');
if (root) {
  console.log('[KIRO-CONSTELLATION] Rendering HealthDashboard component');
  render(<HealthDashboard />, root);
  console.log('[KIRO-CONSTELLATION] HealthDashboard component rendered');
} else {
  console.error('[KIRO-CONSTELLATION] Root element not found for dashboard');
}
