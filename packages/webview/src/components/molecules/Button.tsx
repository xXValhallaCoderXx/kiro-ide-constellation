import { h } from 'preact';

interface ButtonProps extends h.JSX.HTMLAttributes<HTMLButtonElement> {
  children: h.JSX.Element | string;
}

export function Button({ children, ...props }: ButtonProps) {
  return (
    <button {...props}>
      {children}
    </button>
  );
}
