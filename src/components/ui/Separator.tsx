/**
 * @file Separator.tsx
 * @description Card divider lines.
 */

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
}

export const Separator: React.FC<SeparatorProps> = ({
  orientation = 'horizontal',
  className,
  ...props
}) => {
  return (
    <div
      className={twMerge(
        clsx(
          'bg-[#2A2E39]/40',
          orientation === 'horizontal' ? 'h-[1px] w-full my-4' : 'w-[1px] h-full mx-4'
        ),
        className
      )}
      {...props}
    />
  );
};

export default Separator;
