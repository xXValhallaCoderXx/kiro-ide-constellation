import React from 'react';

// TODO: Replace this with a proper SVG icon implementation.
// This is a temporary placeholder to unblock component development.

interface IconProps {
  name: string; // In a real implementation, this would be a keyof a specific icon set.
  size?: 16 | 20 | 24;
  colorToken?: string;
  title?: string;
}

const Icon: React.FC<IconProps> = ({
  name,
  size = 16,
  colorToken = 'var(--text-secondary)',
  title,
}) => {
  // A very simple placeholder that displays the first letter of the icon name.
  const style: React.CSSProperties = {
    width: size,
    height: size,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: colorToken,
    borderRadius: '4px',
    fontSize: size ? size * 0.6 : '10px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  };

  return (
    <div style={style} aria-hidden={!title} aria-label={title}>
      {name.charAt(0)}
    </div>
  );
};

export default Icon;
