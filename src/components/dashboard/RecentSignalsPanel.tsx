/**
 * @file RecentSignalsPanel.tsx
 * @description List of recently executed algorithmic setups.
 */

import React from 'react';
import { useSignalStore } from '../../store/useSignalStore';
import { useMarketStore } from '../../store/useMarketStore';
import { Bell, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export const RecentSignalsPanel: React.FC = () => {
  const recentSignals = useSignalStore((state) => state.recentSignals);
  const { selectedPair } = useMarketStore();

  return (
    <div className="bg-card border border-border-custom rounded-xl p-5 hover:border-[#3A455E] transition-all duration-300">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <Bell className="text-light shrink-0" size={18} />
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">Algorithmic Signals</h3>
        </div>
        <span className="text-[10px] font-mono font-bold text-gray-500 uppercase">
          LIVE FEEDS
        </span>
      </div>

      <div className="space-y-2.5 max-h-[290px] overflow-y-auto pr-1">
        {recentSignals.map((sig) => (
          <div 
            key={sig.id}
            className="flex items-center justify-between p-3 rounded-lg bg-surface border border-[#2D313E]/30 text-xs"
          >
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-full ${
                sig.direction === 'Long' ? 'bg-[#26A69A]/10 text-bullish' : 'bg-[#EF5350]/10 text-bearish'
              }`}>
                {sig.direction === 'Long' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-white">{sig.pair}</span>
                  <span className="text-[9px] bg-[#2A3245] text-zinc-300 px-1 rounded font-semibold uppercase">{sig.direction}</span>
                </div>
                <p className="text-[10px] text-gray-500 font-mono mt-0.5">{sig.date}</p>
              </div>
            </div>

            <div>
              <span className={`font-mono font-bold text-xs ${
                sig.isWin ? 'text-bullish' : 'text-bearish'
              }`}>
                {sig.result}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentSignalsPanel;
