import { h, render } from 'preact';
import { HealthDashboard } from './views/HealthDashboard/HealthDashboard';

const root = document.getElementById('root');
if (root) {
  render(<HealthDashboard />, root);
}
