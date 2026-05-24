/**
 * @file Badge.tsx
 * @description Standardized colored layout badges representing status levels.
 */

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'danger' | 'warning' | 'neutral' | 'inactive';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  className,
  ...props
}) => {
  const baseStyle = 'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border';
  
  const variants = {
    success: 'bg-bullish/10 text-bullish border-bullish/25',
    danger: 'bg-bearish/10 text-bearish border-bearish/25',
    warning: 'bg-neutral/10 text-neutral border-neutral/25',
    neutral: 'bg-light/10 text-light border-light/25',
    inactive: 'bg-[#2A3245]/20 text-gray-500 border-gray-800',
  };

  return (
    <span
      className={twMerge(clsx(baseStyle, variants[variant], className))}
      {...props}
    >
      {children}
    </span>
  );
};

export default Badge;
