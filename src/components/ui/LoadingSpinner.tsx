/**
 * @file LoadingSpinner.tsx
 * @description Standardized circular loading spinner.
 */

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className,
  ...props
}) => {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className="flex items-center justify-center">
      <div
        className={twMerge(
          clsx(
            'animate-spin rounded-full border-[#2A3245] border-t-light',
            sizes[size],
            className
          )
        )}
        {...props}
      />
    </div>
  );
};

export default LoadingSpinner;
