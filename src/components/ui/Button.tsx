/**
 * @file Button.tsx
 * @description Highly styled reusable primitive button component aligned with our design tokens.
 */

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Reusable Button component
 */
export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className,
  ...props
}) => {
  const baseStyle = 'inline-flex items-center justify-center font-medium rounded transition-all focus:outline-none disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] cursor-pointer';
  
  const variants = {
    primary: 'bg-light text-[#131722] hover:bg-[#BCA08F] active:bg-[#9A8678]',
    secondary: 'bg-[#2A3245] text-text-primary hover:bg-[#343D54] border border-[#3A455E]',
    danger: 'bg-bearish text-white hover:bg-[#D32F2F]',
    success: 'bg-bullish text-[#131722] hover:bg-[#1E8A7F]',
    ghost: 'text-text-primary hover:bg-[#1E2433] hover:text-white',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 h-8',
    md: 'text-sm px-4.5 py-2 h-10',
    lg: 'text-base px-6 py-3 h-12',
  };

  return (
    <button
      className={twMerge(clsx(baseStyle, variants[variant], sizes[size], className))}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
