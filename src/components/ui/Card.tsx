/**
 * @file Card.tsx
 * @description Standard Card component using --color-card tokens.
 */

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  hoverEffect = false,
  className,
  ...props
}) => {
  return (
    <div
      className={twMerge(
        clsx(
          'bg-card border border-border-custom rounded-xl p-5 overflow-hidden transition-all duration-300',
          hoverEffect && 'hover:border-[#3A455E] hover:-translate-y-[1px]',
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
