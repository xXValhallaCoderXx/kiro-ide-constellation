import { h, render } from 'preact';
import { HealthDashboard } from './HealthDashboard';

// Mount the HealthDashboard component to the root element
const root = document.getElementById('root');
if (root) {
  render(<HealthDashboard />, root);
}