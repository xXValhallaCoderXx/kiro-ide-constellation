import React from 'react';
import IconTile from '../atoms/IconTile';
import StatusDot from '../atoms/StatusDot';
import ButtonLink from '../atoms/ButtonLink';
import MetricBullet from '../atoms/MetricBullet';
import Icon from '../atoms/Icon';
import './DataStatusCard.css';

interface DataStatusCardProps {
  title: string;
  lastIndexedText: string;
  filesCount: number;
  depsCount: number;
  status: 'healthy' | 'warning' | 'error';
  onReindex?: () => void;
}

const DataStatusCard: React.FC<DataStatusCardProps> = ({
  title,
  lastIndexedText,
  filesCount,
  depsCount,
  status,
  onReindex,
}) => {
  return (
    <div className="data-status-card">
      <div className="card-header">
        <IconTile variant="success" iconName="database" />
        <div className="card-title-group">
          <div className="card-title">{title}</div>
          <div className="card-subtitle">
            <Icon name="clock" size={16} />
            <span>{lastIndexedText}</span>
          </div>
        </div>
      </div>
      <div className="stats-row">
        <MetricBullet variant="neutral" text={`${filesCount} Files`} />
        <span className="stats-separator">→</span>
        <MetricBullet variant="neutral" text={`${depsCount} Deps`} />
        <div className="status-dot-container">
          <StatusDot status={status} glow={status === 'healthy'} />
        </div>
      </div>
      {onReindex && (
        <div className="card-footer">
          <ButtonLink onClick={onReindex}>Re-index Now</ButtonLink>
        </div>
      )}
    </div>
  );
};

export default DataStatusCard;
