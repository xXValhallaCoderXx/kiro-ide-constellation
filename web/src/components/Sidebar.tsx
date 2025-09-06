import { h } from 'preact';
import { Button } from './Button';
import styles from './Sidebar.module.css';

// This is a placeholder for the vscode api.
declare const vscode: {
  postMessage(message: any): void;
};

export function Sidebar() {
  const handleOpenDashboard = () => {
    vscode.postMessage({ type: 'openDashboard' });
  };

  return (
    <div>
      <h3 className={styles.hello}>Hello World</h3>
      <div className={styles.actions}>
        <Button id="open-dashboard" onClick={handleOpenDashboard}>
          Open Dashboard
        </Button>
      </div>
    </div>
  );
}
