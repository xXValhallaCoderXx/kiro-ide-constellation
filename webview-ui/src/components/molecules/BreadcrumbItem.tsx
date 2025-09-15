import React from 'react';
import Icon from '../atoms/Icon';
import './BreadcrumbItem.css';

interface BreadcrumbItemProps {
  label: string;
  active?: boolean;
  onClick: () => void;
}

const BreadcrumbItem: React.FC<BreadcrumbItemProps> = ({
  label,
  active = false,
  onClick,
}) => {
  return (
    <div className="breadcrumb-item" aria-current={active ? 'page' : undefined}>
      <button className="breadcrumb-button" onClick={onClick} disabled={active}>
        {label}
      </button>
      {!active && (
        <div className="breadcrumb-separator">
          <Icon name="chevron-right" size={16} />
        </div>
      )}
    </div>
  );
};

export default BreadcrumbItem;
