import React from 'react';
import './DividerLine.css';

interface DividerLineProps {
  orientation?: 'horizontal' | 'vertical';
}

const DividerLine: React.FC<DividerLineProps> = ({
  orientation = 'horizontal',
}) => {
  return (
    <hr
      className={`divider-line ${
        orientation === 'vertical' ? 'vertical' : 'horizontal'
      }`}
    />
  );
};

export default DividerLine;
