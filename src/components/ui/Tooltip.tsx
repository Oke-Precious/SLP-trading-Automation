/**
 * @file Tooltip.tsx
 * @description Clean hover tooltip overlay to guide user interaction.
 */

import React, { useState } from 'react';

export interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1.5 text-[10px] font-mono whitespace-nowrap bg-zinc-950 border border-[#2D313E] text-zinc-300 rounded shadow-lg opacity-100 transition-opacity">
          {content}
        </div>
      )}
    </div>
  );
};

export default Tooltip;
