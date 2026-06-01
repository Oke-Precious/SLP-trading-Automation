/**
 * @file MarketSummaryCard.tsx
 * @description Summary panel detailing phase state, bias alignment, and trend levels.
 */

import React from 'react';
import { useMarketStore } from '../../store/useMarketStore';
import { Compass, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { BiasResult } from '../../lib/analysis/biasEngine';

interface MarketSummaryCardProps {
  biasResult: BiasResult | null;
  isLoading: boolean;
}

export const MarketSummaryCard: React.FC<MarketSummaryCardProps> = ({ biasResult, isLoading }) => {
  const { selectedPair } = useMarketStore();

  if (isLoading) {
    return (
      <div className="bg-card border border-border-custom rounded-xl p-5 space-y-4 animate-pulse h-full" data-testid="summary-skeleton">
        <div className="h-4 bg-slate-700 rounded w-1/3"></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-16 bg-slate-800 rounded"></div>
          <div className="h-16 bg-slate-800 rounded"></div>
        </div>
        <div className="h-12 bg-slate-850 rounded"></div>
      </div>
    );
  }

  if (!biasResult) {
    return (
      <div className="bg-card border border-border-custom rounded-xl p-5 flex flex-col items-center justify-center space-y-2 h-full text-gray-400 font-mono text-xs">
        <RefreshCw className="animate-spin text-light" size={16} />
        <span>Analysing {selectedPair} structure...</span>
      </div>
    );
  }

  const { bias, strength, structure, phase, nextMove } = biasResult;
  const isBullish = bias === 'BULLISH';
  const isBearish = bias === 'BEARISH';

  return (
    <div className="bg-card border border-border-custom rounded-xl p-5 hover:border-[#3A455E] transition-all duration-300 h-full flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <Compass className="text-light shrink-0" size={18} />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">SMC Market Phase</h3>
          </div>
          <div className="flex items-center space-x-1.5">
            <span 
              data-testid="trend-strength-dot"
              className={`w-2 h-2 rounded-full ${
                isBullish 
                  ? 'bg-bullish shadow-[0_0_8px_rgb(38,166,154)]' 
                  : isBearish 
                    ? 'bg-bearish shadow-[0_0_8px_rgb(239,83,80)]'
                    : 'bg-yellow-500 shadow-[0_0_8px_rgb(234,179,8)]'
              }`} 
            />
            <span className="text-[10px] font-mono font-bold tracking-wider text-gray-400 uppercase">
              Strength: {strength}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface p-3 rounded-lg border border-[#2D313E]/40">
            <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider block">Phase: {phase}</span>
            <div className="flex items-center space-x-2 mt-1">
              {isBullish ? (
                <TrendingUp className="text-bullish" size={16} />
              ) : isBearish ? (
                <TrendingDown className="text-bearish" size={16} />
              ) : (
                <TrendingUp className="text-gray-400 rotate-90" size={16} />
              )}
              <span className={`text-sm font-extrabold tracking-wide uppercase ${
                isBullish ? 'text-bullish' : isBearish ? 'text-bearish' : 'text-gray-400'
              }`} data-testid="operational-bias-text">
                {bias}
              </span>
            </div>
          </div>

          <div className="bg-surface p-3 rounded-lg border border-[#2D313E]/40">
            <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider block">Sequence</span>
            <p className="text-xs font-bold text-white mt-1 uppercase font-display tracking-tight leading-tight">
              {structure}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 text-[11px] bg-[#141822]/60 rounded-lg p-3 border border-[#2D313E]/45 font-sans">
        <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider block mb-1">Recommended Execution Plan</span>
        <p className="text-gray-200 font-medium leading-relaxed font-mono">
          {nextMove}
        </p>
      </div>
    </div>
  );
};

export default MarketSummaryCard;
