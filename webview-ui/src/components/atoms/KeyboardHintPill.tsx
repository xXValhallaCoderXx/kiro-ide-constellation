import React from 'react';
import './KeyboardHintPill.css';

interface KeyboardHintPillProps {
  label: string;
}

const KeyboardHintPill: React.FC<KeyboardHintPillProps> = ({ label }) => {
  return <div className="keyboard-hint-pill">{label}</div>;
};

export default KeyboardHintPill;
