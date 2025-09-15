import React from 'react';
import Icon from './Icon';
import type { icons } from 'lucide-react';
import './IconTile.css';

interface IconTileProps {
  variant: 'brand' | 'success';
  iconName: keyof typeof icons;
  size?: number;
}

const IconTile: React.FC<IconTileProps> = ({
  variant,
  iconName,
  size = 48,
}) => {
  const variantClasses = {
    brand: 'variant-brand',
    success: 'variant-success',
  };

  const iconColorTokens = {
    brand: 'var(--accent-brand)',
    success: 'var(--accent-success)',
  };

  return (
    <div
      className={`icon-tile ${variantClasses[variant]}`}
      style={{ width: size, height: size }}
    >
      <Icon name={iconName} size={24} colorToken={iconColorTokens[variant]} />
    </div>
  );
};

export default IconTile;
