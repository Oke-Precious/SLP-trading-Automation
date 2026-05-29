import React from 'react';

export default function Link({ href, children, ...props }: any) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const page = href.replace(/^\//, '');
    window.dispatchEvent(new CustomEvent('autoslp_navigate', { detail: page || 'dashboard' }));
  };

  return (
    <a href={href} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}
