import React from 'react';
import './Tooltip.css';

interface TooltipProps {
  content: string;
  children: React.ReactElement;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

// TODO: This is a simple CSS-based tooltip. For more complex scenarios,
// a library like Radix UI or Tippy.js with proper portal and positioning
// logic would be a better choice.

const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  placement = 'top',
}) => {
  const tooltipId = React.useId();

  return (
    <div className="tooltip-wrapper">
      {React.cloneElement(children, {
        'aria-describedby': tooltipId,
      })}
      <div
        id={tooltipId}
        role="tooltip"
        className={`tooltip-content placement-${placement}`}
      >
        {content}
      </div>
    </div>
  );
};

export default Tooltip;
