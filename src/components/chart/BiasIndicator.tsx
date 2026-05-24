/**
 * @file BiasIndicator.tsx
 * @description Bias overlay illustrating bullish/bearish conditions.
 */

import React from 'react';
import { useMarketStore } from '../../store/useMarketStore';
import { useBiasStore } from '../../store/useBiasStore';

export const BiasIndicator: React.FC = () => {
  const { selectedPair, selectedTimeframe } = useMarketStore();
  const biasMap = useBiasStore((state) => state.biasMap);
  const bias = biasMap[selectedPair]?.[selectedTimeframe] || 'BULLISH';

  return (
    <div className={`p-4 rounded-xl border flex flex-col justify-between ${
      bias === 'BULLISH' 
        ? 'bg-bullish/5 border-bullish/25 text-bullish' 
        : 'bg-bearish/5 border-bearish/25 text-bearish'
    }`}>
      <span className="text-[10px] font-mono uppercase font-bold tracking-wider opacity-60">Asset Outlook</span>
      <h3 className="text-lg font-bold uppercase mt-1 tracking-tight flex items-center space-x-1.5">
        <span>{selectedPair}</span>
        <span className="text-xs px-1.5 py-0.5 rounded bg-[#131722] border border-gray-800 text-gray-300 font-normal">{selectedTimeframe}</span>
        <span className="font-extrabold">{bias === 'BULLISH' ? '▲' : '▼'} {bias}</span>
      </h3>
      <p className="text-xs text-text-secondary mt-1.5">
        {bias === 'BULLISH' 
          ? 'Price is trending upward above historical Breakers. Focus strictly on discount order blocks for buying entries.' 
          : 'Downtrend confirms dominant selling pressure. Focus exclusively on premium order blocks for selling setups.'}
      </p>
    </div>
  );
};

export default BiasIndicator;
