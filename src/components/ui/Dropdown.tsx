/**
 * @file Dropdown.tsx
 * @description Flexible custom dropdown menu container utilizing state toggles.
 */

import React, { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface DropdownItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  action: () => void;
}

export interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  items,
  align = 'left',
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <div className={twMerge('relative inline-block text-left', className)} ref={containerRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>

      {isOpen && (
        <div
          className={clsx(
            'absolute mt-2 w-56 rounded-lg bg-[#1A1F2C] border border-[#2D313E] shadow-2xl z-40 p-1 font-sans text-sm py-1.5 focus:outline-none divide-y divide-gray-800 animate-fadeIn',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {items.map((item) => (
            <button
              key={item.key}
              onClick={() => {
                item.action();
                setIsOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-zinc-300 hover:bg-[#252A3C] hover:text-white rounded-md transition-colors flex items-center space-x-2 cursor-pointer text-xs"
            >
              {item.icon && <span className="opacity-75">{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dropdown;
