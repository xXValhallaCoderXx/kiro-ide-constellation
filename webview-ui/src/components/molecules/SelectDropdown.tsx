import React, { useState, useRef, useEffect } from 'react';
import Icon from '../atoms/Icon';
import Tooltip from '../atoms/Tooltip';
import './SelectDropdown.css';

interface Option {
  label: string;
  value: string;
}

interface SelectDropdownProps {
  label?: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  helpTooltip?: string;
}

const SelectDropdown: React.FC<SelectDropdownProps> = ({
  label,
  options,
  value,
  onChange,
  helpTooltip,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((option) => option.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [wrapperRef]);

  const handleSelect = (newValue: string) => {
    onChange(newValue);
    setIsOpen(false);
  };

  return (
    <div className="select-dropdown-wrapper" ref={wrapperRef}>
      {label && <label className="select-dropdown-label">{label}</label>}
      <div className={`select-dropdown-control ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(!isOpen)}>
        <span className="select-dropdown-value">{selectedOption?.label}</span>
        <Icon name="chevron-down" size={20} />
      </div>
      {isOpen && (
        <div className="select-dropdown-menu">
          {options.map((option) => (
            <div
              key={option.value}
              className={`select-dropdown-option ${option.value === value ? 'selected' : ''}`}
              onClick={() => handleSelect(option.value)}
            >
              {option.label}
              {option.value === value && <Icon name="check" size={16} />}
            </div>
          ))}
        </div>
      )}
      {helpTooltip && (
        <Tooltip content={helpTooltip}>
          <div className="select-dropdown-help">
            <Icon name="help-circle" size={16} />
          </div>
        </Tooltip>
      )}
    </div>
  );
};

export default SelectDropdown;
