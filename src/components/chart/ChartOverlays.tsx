/**
 * @file ChartOverlays.tsx
 * @description Structure overlays labeling HH/HL/LH/LL levels.
 */

import React from 'react';
import { useMarketStore } from '../../store/useMarketStore';

export const ChartOverlays: React.FC = () => {
  const { selectedPair } = useMarketStore();
  
  const annotations = selectedPair === 'BTCUSDT' ? [
    { label: 'HH', price: '$64,250', type: 'high' },
    { label: 'HL', price: '$61,100', type: 'low' },
    { label: 'LH', price: '$63,400', type: 'high' },
    { label: 'LL', price: '$59,800', type: 'low' },
  ] : [
    { label: 'HH', price: '$3,420', type: 'high' },
    { label: 'HL', price: '$3,050', type: 'low' },
  ];

  return (
    <div className="absolute top-2 right-2 bg-zinc-950/80 backdrop-blur-sm border border-[#2D313E] p-2.5 rounded shadow-lg font-sans text-xs flex flex-col space-y-1.5 max-w-[200px] z-20">
      <span className="font-mono text-[9px] uppercase tracking-wider text-gray-500 font-bold">Detected Milestones</span>
      {annotations.map((a, idx) => (
        <div key={idx} className="flex justify-between items-center space-x-4">
          <span className={`px-1.5 py-0.2 rounded font-mono text-[9px] font-bold ${
            a.type === 'high' ? 'bg-[#26A69A]/10 text-bullish' : 'bg-[#EF5350]/10 text-bearish'
          }`}>{a.label}</span>
          <span className="text-gray-300 font-mono text-[10px] font-semibold">{a.price}</span>
        </div>
      ))}
    </div>
  );
};

export default ChartOverlays;
