/**
 * @file ActiveSignalCard.tsx
 * @description Card showing current active signal statistics.
 */

import React from 'react';
import { Target } from 'lucide-react';
import { useMarketStore } from '../../store/useMarketStore';
import { usePOIStore } from '../../store/usePOIStore';
import { formatPrice } from '../../lib/market/marketDataService';
import { EmptyState } from '../ui/EmptyState';

export const ActiveSignalCard: React.FC = () => {
  const { selectedPair } = useMarketStore();
  const { pois } = usePOIStore();

  const firstActivePOI = pois.find(p => p.status === 'Active');

  if (!firstActivePOI) {
    return (
      <div className="bg-card border border-border-custom rounded-xl p-5 hover:border-[#3A455E] transition-all duration-300">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <Target className="text-light shrink-0" size={18} />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">Active SLP Execution</h3>
          </div>
        </div>
        <EmptyState 
          icon="⚡" 
          title="No Active POI Setup" 
          message="Define and activate an HTF Point of Interest (OB/BB) to compute real-time risk-to-reward execution parameters." 
        />
      </div>
    );
  }

  // Smart calculation based on the active POI
  const isOb = firstActivePOI.type === 'OB';
  
  // OB is typically demand (Long setup), BB / other types can be supply (Short setup)
  const direction: 'LONG' | 'SHORT' = isOb ? 'LONG' : 'SHORT';
  
  const entry = isOb ? firstActivePOI.priceMax : firstActivePOI.priceMin;
  const stop = isOb ? firstActivePOI.priceMin : firstActivePOI.priceMax;
  const risk = Math.abs(entry - stop) || (entry * 0.01); // fallback risk of 1% if zero
  const target = isOb ? entry + risk * 3 : entry - risk * 3;
  const rr = '1:3.0';

  return (
    <div className="bg-card border border-border-custom rounded-xl p-5 hover:border-[#3A455E] transition-all duration-300">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <Target className="text-light shrink-0" size={18} />
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">Active SLP Execution</h3>
        </div>
        <span className="text-[10px] bg-bullish/10 text-bullish border border-bullish/25 px-2 py-0.5 rounded font-mono font-bold animate-pulse">
          ENTRY LIVE
        </span>
      </div>

      <div className="space-y-3.5 bg-surface p-4 rounded-xl border border-[#2D313E]/30 text-xs">
        <div className="flex justify-between items-center pb-2 border-b border-[#2D313E]/60">
          <span className="text-gray-400 font-medium">SLP Asset Setup</span>
          <span className="font-mono text-white font-bold">{selectedPair} ({direction} LIMIT)</span>
        </div>

        <div className="grid grid-cols-3 gap-2 py-1">
          <div className="text-center bg-[#131722] p-2.5 rounded border border-gray-800">
            <span className="text-[9px] text-gray-500 font-bold block uppercase tracking-wider">ENTRY</span>
            <span className="font-mono text-zinc-100 font-extrabold text-xs mt-1 block">
              {formatPrice(entry, selectedPair)}
            </span>
          </div>

          <div className="text-center bg-[#131722] p-2.5 rounded border border-gray-800">
            <span className="text-[9px] text-gray-500 font-bold block uppercase tracking-wider">STOP</span>
            <span className="font-mono text-bearish font-extrabold text-xs mt-1 block">
              {formatPrice(stop, selectedPair)}
            </span>
          </div>

          <div className="text-center bg-[#131722] p-2.5 rounded border border-gray-800">
            <span className="text-[9px] text-gray-500 font-bold block uppercase tracking-wider">TARGET</span>
            <span className="font-mono text-bullish font-extrabold text-xs mt-1 block">
              {formatPrice(target, selectedPair)}
            </span>
          </div>
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-[#2D313E]/60 text-xs font-mono">
          <span className="text-gray-400">Execution Block:</span>
          <span className="text-light font-bold text-[11px] max-w-[150px] truncate">{firstActivePOI.name}</span>
        </div>

        <div className="flex justify-between items-center text-xs font-mono">
          <span className="text-gray-400">Risk Reward Ratio:</span>
          <span className="text-light font-bold">{rr}</span>
        </div>
      </div>
    </div>
  );
};

export default ActiveSignalCard;
