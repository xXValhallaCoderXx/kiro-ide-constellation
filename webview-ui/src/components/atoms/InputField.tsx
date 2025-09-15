import React from 'react';
import Icon from './Icon';
import './InputField.css';

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leadingIcon?: string;
  trailingSlot?: React.ReactNode;
  ariaLabel: string;
}

const InputField: React.FC<InputFieldProps> = ({
  leadingIcon,
  trailingSlot,
  ariaLabel,
  ...rest
}) => {
  return (
    <div className="input-field-wrapper">
      {leadingIcon && (
        <div className="input-field-icon leading">
          <Icon name={leadingIcon} size={20} />
        </div>
      )}
      <input className="input-field" aria-label={ariaLabel} {...rest} />
      {trailingSlot && (
        <div className="input-field-trailing">{trailingSlot}</div>
      )}
    </div>
  );
};

export default InputField;
