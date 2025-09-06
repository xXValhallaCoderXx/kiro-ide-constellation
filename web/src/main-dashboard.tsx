import { h, render } from 'preact';
import { HealthDashboard } from './components/HealthDashboard';

const root = document.getElementById('root');
if (root) {
  render(<HealthDashboard />, root);
}
