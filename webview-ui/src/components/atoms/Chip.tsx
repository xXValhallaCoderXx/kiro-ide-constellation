import React from 'react';
import './Chip.css';

interface ChipProps {
  label: string;
  variant: 'brand' | 'success';
  onClick?: () => void;
  selected?: boolean;
  aria-pressed?: boolean;
}

const Chip: React.FC<ChipProps> = ({
  label,
  variant,
  onClick,
  selected = false,
  ...rest
}) => {
  const isClickable = !!onClick;

  const commonProps = {
    className: `chip variant-${variant} ${isClickable ? 'clickable' : ''} ${selected ? 'selected' : ''}`,
    'aria-pressed': selected,
    ...rest,
  };

  if (isClickable) {
    return (
      <button {...commonProps} onClick={onClick}>
        {label}
      </button>
    );
  }

  return <div {...commonProps}>{label}</div>;
};

export default Chip;
