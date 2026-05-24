/**
 * @file Skeleton.tsx
 * @description Skeletal shimmer hydration indicators.
 */

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      className={twMerge(clsx('custom-shimmer rounded bg-[#1C2230]', className))}
      {...props}
    />
  );
};

export default Skeleton;
