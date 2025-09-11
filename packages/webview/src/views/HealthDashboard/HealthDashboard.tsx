import { h } from 'preact';
import styles from './HealthDashboard.module.css';

export function HealthDashboard() {
  return (
    <div>
      <h2>Health Dashboard</h2>
      <div className={styles.card}>
        <p>This is a starter dashboard webview. You can render status, metrics, or logs here.</p>
      </div>
    </div>
  );
}
