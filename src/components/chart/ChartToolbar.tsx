/**
 * @file ChartToolbar.tsx
 * @description Toolbar providing interactive chart drawing helpers (fib, segments, range boundaries).
 */

import React from 'react';
import { MousePointer, Milestone, Eye, Compass, Layout } from 'lucide-react';

export const ChartToolbar: React.FC = () => {
  const tools = [
    { name: 'Cursor', icon: MousePointer, active: true },
    { name: 'Breaker', icon: Milestone, active: false },
    { name: 'SMC POI', icon: Layout, active: false },
    { name: 'Measure', icon: Compass, active: false },
    { name: 'Overlay', icon: Eye, active: false },
  ];

  return (
    <div className="flex flex-col space-y-2 p-2 bg-[#1A1F2C] border-r border-[#2A2E39] items-center h-full sm:w-12 shrink-0">
      {tools.map((t) => {
        const Icon = t.icon;
        return (
          <button
            key={t.name}
            title={t.name}
            className={`p-2 rounded transition-colors group cursor-pointer ${
              t.active ? 'bg-light text-[#131722]' : 'text-gray-400 hover:bg-[#252B3A] hover:text-white'
            }`}
          >
            <Icon size={16} />
          </button>
        );
      })}
    </div>
  );
};

export default ChartToolbar;
