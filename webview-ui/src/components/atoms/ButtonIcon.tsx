import React from 'react';
import Icon from './Icon';
import type { icons } from 'lucide-react';
import './ButtonIcon.css';

interface ButtonIconProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  iconName: keyof typeof icons;
  ariaLabel: string;
}

const ButtonIcon: React.FC<ButtonIconProps> = ({
  iconName,
  onClick,
  disabled,
  ariaLabel,
  ...rest
}) => {
  return (
    <button
      className="button-icon"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      {...rest}
    >
      <Icon name={iconName} size={20} colorToken="var(--text-primary)" />
    </button>
  );
};

export default ButtonIcon;
