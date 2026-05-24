/**
 * @file ActiveSignalCard.tsx
 * @description Card showing current active signal statistics.
 */

import React from 'react';
import { Target, ShieldAlert, ArrowUpRight } from 'lucide-react';
import { useMarketStore } from '../../store/useMarketStore';

export const ActiveSignalCard: React.FC = () => {
  const { selectedPair } = useMarketStore();
  
  const activeParams = selectedPair === 'BTCUSDT' ? {
    entry: '$61,420',
    stop: '$60,950',
    target: '$63,200',
    rr: '1:3.8',
  } : {
    entry: '$3,110',
    stop: '$3,075',
    target: '$3,250',
    rr: '1:4.0',
  };

  return (
    <div className="bg-card border border-border-custom rounded-xl p-5 hover:border-[#3A455E] transition-all duration-300">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <Target className="text-light shrink-0" size={18} />
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">Active SLP Executions</h3>
        </div>
        <span className="text-[10px] bg-bullish/10 text-bullish border border-bullish/25 px-2 py-0.5 rounded font-mono font-bold animate-pulse">
          ENTRY LIVE
        </span>
      </div>

      <div className="space-y-3.5 bg-surface p-4 rounded-xl border border-[#2D313E]/30 text-xs">
        <div className="flex justify-between items-center pb-2 border-b border-[#2D313E]/60">
          <span className="text-gray-400 font-medium">SMC Asset Setup</span>
          <span className="font-mono text-white font-bold">{selectedPair} (LONG LIMIT)</span>
        </div>

        <div className="grid grid-cols-3 gap-2 py-1">
          <div className="text-center bg-[#131722] p-2.5 rounded border border-gray-800">
            <span className="text-[9px] text-gray-500 font-bold block uppercase tracking-wider">ENTRY</span>
            <span className="font-mono text-zinc-100 font-extrabold text-xs mt-1 block">{activeParams.entry}</span>
          </div>

          <div className="text-center bg-[#131722] p-2.5 rounded border border-gray-800">
            <span className="text-[9px] text-gray-500 font-bold block uppercase tracking-wider">STOP</span>
            <span className="font-mono text-bearish font-extrabold text-xs mt-1 block">{activeParams.stop}</span>
          </div>

          <div className="text-center bg-[#131722] p-2.5 rounded border border-gray-800">
            <span className="text-[9px] text-gray-500 font-bold block uppercase tracking-wider">TARGET</span>
            <span className="font-mono text-bullish font-extrabold text-xs mt-1 block">{activeParams.target}</span>
          </div>
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-[#2D313E]/60 text-xs">
          <span className="text-gray-400">Risk Reward Ratio:</span>
          <span className="font-mono text-light font-bold">{activeParams.rr}</span>
        </div>
      </div>
    </div>
  );
};

export default ActiveSignalCard;
