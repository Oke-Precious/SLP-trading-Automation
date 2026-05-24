/**
 * @file PageWrapper.tsx
 * @description Page Wrapper component framing sub-pages within standard boundaries.
 */

import React from 'react';

export interface PageWrapperProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export const PageWrapper: React.FC<PageWrapperProps> = ({
  title,
  subtitle,
  children,
}) => {
  return (
    <div className="p-6 max-w-7xl mx-auto w-full animate-fadeIn font-sans">
      <div className="mb-6 flex flex-col justify-between items-start sm:flex-row sm:items-center border-b border-[#2A2E39]/40 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display uppercase tracking-wider text-white">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-text-secondary mt-1 font-mono tracking-wide uppercase">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <div className="w-full">
        {children}
      </div>
    </div>
  );
};

export default PageWrapper;
