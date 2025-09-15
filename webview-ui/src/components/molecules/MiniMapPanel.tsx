import React from 'react';
import './MiniMapPanel.css';

interface MiniMapPanelProps {
  title?: string;
  hasViewport?: boolean;
}

const MiniMapPanel: React.FC<MiniMapPanelProps> = ({
  title = 'Mini-map',
  hasViewport = false,
}) => {
  return (
    <div className="minimap-panel">
      <div className="minimap-title">{title}</div>
      <div className="minimap-body">
        {hasViewport && <div className="minimap-viewport" />}
      </div>
    </div>
  );
};

export default MiniMapPanel;
