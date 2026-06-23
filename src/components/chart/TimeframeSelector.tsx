/**
 * @file TimeframeSelector.tsx
 * @description Standardized horizontal timeframe control bar.
 */

import React from 'react';
import { Timeframe } from '../../types';
import { useMarketStore } from '../../store/useMarketStore';

export const TimeframeSelector: React.FC = () => {
  const { selectedTimeframe, setSelectedTimeframe } = useMarketStore();
  const options: Timeframe[] = [
    '1m', '3m', '5m', '15m', '30m', '45m',
    '1H', '2H', '4H', '8H', '12H',
    '1D', '1W', '1M'
  ];

  return (
    <div className="flex bg-[#141822] border border-[#2A2E39] rounded-lg p-1 space-x-1 w-full overflow-x-auto whitespace-nowrap scrollbar-none scroll-smooth">
      {options.map((option) => (
        <button
          key={option}
          onClick={() => setSelectedTimeframe(option)}
          className={`px-3 py-1 text-xs rounded transition-all cursor-pointer font-mono ${
            selectedTimeframe === option
              ? 'bg-[#2A3245] text-light font-bold'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
};

export default TimeframeSelector;
