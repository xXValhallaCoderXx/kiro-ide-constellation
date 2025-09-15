import React from 'react';
import ButtonIcon from '../atoms/ButtonIcon';
import './ZoomControlStack.css';

interface ZoomControlStackProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  disabled?: boolean;
}

const ZoomControlStack: React.FC<ZoomControlStackProps> = ({
  onZoomIn,
  onZoomOut,
  onFit,
  disabled,
}) => {
  return (
    <div className="zoom-control-stack">
      <ButtonIcon
        iconName="plus"
        onClick={onZoomIn}
        disabled={disabled}
        ariaLabel="Zoom in"
      />
      <ButtonIcon
        iconName="minus"
        onClick={onZoomOut}
        disabled={disabled}
        ariaLabel="Zoom out"
      />
      <ButtonIcon
        iconName="fullscreen"
        onClick={onFit}
        disabled={disabled}
        ariaLabel="Fit to screen"
      />
    </div>
  );
};

export default ZoomControlStack;
