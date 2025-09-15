import React from 'react';
import './MetricBullet.css';

interface MetricBulletProps {
  variant: 'purple' | 'green' | 'neutral';
  text: string;
}

const MetricBullet: React.FC<MetricBulletProps> = ({ variant, text }) => {
  return (
    <div className="metric-bullet">
      <div className={`metric-bullet-dot variant-${variant}`} />
      <span className="metric-bullet-text">{text}</span>
    </div>
  );
};

export default MetricBullet;
