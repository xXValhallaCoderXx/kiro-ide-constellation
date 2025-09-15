import React from 'react';
import IconTile from '../atoms/IconTile';
import './ActionCard.css';

interface ActionCardProps {
  title: string;
  subtitle: string;
  variant: 'brand' | 'success';
  iconName: string;
  onClick?: () => void;
  disabled?: boolean;
}

const ActionCard: React.FC<ActionCardProps> = ({
  title,
  subtitle,
  variant,
  iconName,
  onClick,
  disabled,
}) => {
  const isClickable = !!onClick && !disabled;

  const commonProps = {
    className: `action-card ${isClickable ? 'clickable' : ''}`,
    onClick: isClickable ? onClick : undefined,
    tabIndex: isClickable ? 0 : -1,
    'aria-disabled': disabled,
  };

  return (
    <div {...commonProps}>
      <IconTile variant={variant} iconName={iconName} />
      <div className="action-card-text">
        <div className="action-card-title">{title}</div>
        <div className="action-card-subtitle">{subtitle}</div>
      </div>
    </div>
  );
};

export default ActionCard;
