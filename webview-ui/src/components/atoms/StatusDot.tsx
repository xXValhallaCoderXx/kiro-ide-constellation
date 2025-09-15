import React from 'react';
import './StatusDot.css';

interface StatusDotProps {
  status: 'healthy' | 'warning' | 'error';
  size?: 8 | 10;
  glow?: boolean;
}

const StatusDot: React.FC<StatusDotProps> = ({
  status,
  size = 8,
  glow = false,
}) => {
  const ariaLabels = {
    healthy: 'Status: Healthy',
    warning: 'Status: Warning',
    error: 'Status: Error',
  };

  return (
    <div
      className={`status-dot status-${status} ${glow && status === 'healthy' ? 'glow' : ''}`}
      style={{ width: size, height: size }}
      role="status"
      aria-label={ariaLabels[status]}
    />
  );
};

export default StatusDot;
