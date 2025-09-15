import React, { useState, useEffect } from 'react';
import InputField from '../atoms/InputField';
import KeyboardHintPill from '../atoms/KeyboardHintPill';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  trailingHint?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder,
  trailingHint,
}) => {
  const [internalValue, setInternalValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      onChange(internalValue);
    }, 300); // 300ms debounce delay

    return () => {
      clearTimeout(handler);
    };
  }, [internalValue, onChange]);

  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  return (
    <InputField
      leadingIcon="search"
      value={internalValue}
      onChange={(e) => setInternalValue(e.target.value)}
      placeholder={placeholder}
      ariaLabel="Search"
      trailingSlot={
        trailingHint ? <KeyboardHintPill label={trailingHint} /> : undefined
      }
    />
  );
};

export default SearchBar;
