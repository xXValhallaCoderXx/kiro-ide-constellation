import { h } from 'preact';
import { Button } from './Button';
import styles from './Sidebar.module.css';
import { getVsCodeApi } from '../vscode';

export function Sidebar() {
  const vscode = getVsCodeApi<{ type: string }>();
  const handleOpenDashboard = () => {
    vscode.postMessage({ type: 'openDashboard' });
  };

  return (
    <div>
      <h3 className={styles.hello}>Hello World</h3>
      <div className={styles.actions}>
        <Button id="open-dashboard" onClick={handleOpenDashboard}>
          Open Graph
        </Button>
      </div>
    </div>
  );
}
