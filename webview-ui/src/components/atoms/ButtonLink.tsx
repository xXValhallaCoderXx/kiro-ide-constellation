import React from 'react';
import './ButtonLink.css';

interface ButtonLinkProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

const ButtonLink: React.FC<ButtonLinkProps> = ({
  children,
  ...rest
}) => {
  return (
    <button className="button-link" {...rest}>
      {children}
    </button>
  );
};

export default ButtonLink;
