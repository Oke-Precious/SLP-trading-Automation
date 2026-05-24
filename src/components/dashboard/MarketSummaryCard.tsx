/**
 * @file MarketSummaryCard.tsx
 * @description Summary panel detailing phase state, bias alignment, and trend levels.
 */

import React from 'react';
import { useMarketStore } from '../../store/useMarketStore';
import { useBiasStore } from '../../store/useBiasStore';
import { Compass, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

export const MarketSummaryCard: React.FC = () => {
  const { selectedPair, selectedTimeframe } = useMarketStore();
  const biasMap = useBiasStore((state) => state.biasMap);
  const bias = biasMap[selectedPair]?.[selectedTimeframe] || 'BULLISH';

  return (
    <div className="bg-card border border-border-custom rounded-xl p-5 hover:border-[#3A455E] transition-all duration-300">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <Compass className="text-light shrink-0" size={18} />
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">SMC Market Phase</h3>
        </div>
        <span className="text-[10px] font-mono font-bold tracking-wider text-gray-500 flex items-center space-x-1">
          <RefreshCw size={10} className="animate-spin text-light mr-1" />
          CALCULATING...
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface p-3.5 rounded-lg border border-[#2D313E]/40">
          <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider block">Operational Bias</span>
          <div className="flex items-center space-x-2 mt-1">
            {bias === 'BULLISH' ? (
              <TrendingUp className="text-bullish" size={16} />
            ) : (
              <TrendingDown className="text-bearish" size={16} />
            )}
            <span className={`text-sm font-extrabold tracking-wide uppercase ${
              bias === 'BULLISH' ? 'text-bullish' : 'text-bearish'
            }`}>
              {bias}
            </span>
          </div>
        </div>

        <div className="bg-surface p-3.5 rounded-lg border border-[#2D313E]/40">
          <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider block">Current Trend Sequence</span>
          <p className="text-sm font-bold text-white mt-1 uppercase font-display tracking-tight">
            {bias === 'BULLISH' ? 'Structure Break' : 'Mitigated Downtrend'}
          </p>
        </div>
      </div>

      <div className="mt-4 text-[11px] text-text-secondary leading-relaxed bg-[#141822]/40 rounded-lg p-2.5 border border-[#2D313E]/20">
        Our HTF structure analysis shows {selectedPair} holding standard {bias === 'BULLISH' ? 'support demand ranges' : 'supply targets'}. Standard trading recommendations: look for reversals only at {bias === 'BULLISH' ? 'unmitigated daily premium/discount blocks' : 'premium cells'}.
      </div>
    </div>
  );
};

export default MarketSummaryCard;
