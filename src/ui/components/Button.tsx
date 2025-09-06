import { h } from 'preact';

interface ButtonProps {
  onClick?: () => void;
  children: string;
  id?: string;
}

export function Button({ onClick, children, id }: ButtonProps) {
  return (
    <button id={id} onClick={onClick}>
      {children}
    </button>
  );
}