import { h } from 'preact';
import { Button } from './Button';

// Get VS Code API for communication with extension
declare const acquireVsCodeApi: () => {
  postMessage: (message: any) => void;
};

export function Sidebar() {
  const handleOpenDashboard = () => {
    const vscode = acquireVsCodeApi();
    vscode.postMessage({ type: 'openDashboard' });
  };

  return (
    <div>
      <h3 class="hello">Hello World</h3>
      <div class="actions">
        <Button id="open-dashboard" onClick={handleOpenDashboard}>
          Open Dashboard
        </Button>
      </div>
    </div>
  );
}