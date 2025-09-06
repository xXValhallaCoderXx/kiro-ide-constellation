import { h } from 'preact';
import { Button } from './Button';
import styles from './Sidebar.module.css';
import { messageBus, events } from '../services/messageBus';
import { useEffect, useState } from 'preact/hooks';

export function Sidebar() {
  const [dashboardOpenedViaCommand, setDashboardOpenedViaCommand] = useState(false);

  useEffect(() => {
    const offOpen = messageBus.on(events.DashboardOpened, (e) => {
      if (e.payload?.via === 'commandPalette') {
        setDashboardOpenedViaCommand(true);
      } else {
        // Opened by other means (e.g., sidebar button) → clear the hint
        setDashboardOpenedViaCommand(false);
      }
    });
    const offClose = messageBus.on(events.DashboardClosed, () => {
      setDashboardOpenedViaCommand(false);
    });
    return () => {
      offOpen();
      offClose();
    };
  }, []);

  const handleOpenDashboard = () => {
    messageBus.emit(events.OpenDashboard, undefined);
  };

  const handleEmitToast = () => {
    messageBus.emit(events.UiEmitToast, { text: 'Sidebar requested a toast from VS Code' });
  };

  return (
    <div>
      <h3 className={styles.hello}>Hello World</h3>
      <div className={styles.actions}>
        <Button id="open-dashboard" onClick={handleOpenDashboard}>
          Open Graph
        </Button>
        <Button id="emit-vscode-event" onClick={handleEmitToast}>
          Emit VS Code Event
        </Button>
      </div>
      {dashboardOpenedViaCommand && (
        <p style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>Dashboard open via command</p>
      )}
    </div>
  );
}
