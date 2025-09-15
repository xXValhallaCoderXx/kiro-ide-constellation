import React from 'react';
import MetricBullet from '../atoms/MetricBullet';
import './MetricsInline.css';

interface MetricItem {
  variant: 'purple' | 'green' | 'neutral';
  text: string;
}

interface MetricsInlineProps {
  items: MetricItem[];
}

const MetricsInline: React.FC<MetricsInlineProps> = ({ items }) => {
  return (
    <div className="metrics-inline">
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <MetricBullet variant={item.variant} text={item.text} />
          {index < items.length - 1 && (
            <span className="metrics-inline-separator">•</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default MetricsInline;
