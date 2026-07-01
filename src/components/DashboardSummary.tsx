import React from 'react';

interface DashboardSummaryProps {
  currentPair: string;
  bias: string;
  fullWidth?: boolean;
  className?: string;
}

export default function DashboardSummary({
  currentPair,
  bias,
  fullWidth = false,
  className = ''
}: DashboardSummaryProps) {
  return (
    <section 
      id="quad-3-market-summary"
      className={`${className || (fullWidth ? 'col-span-12' : 'md:col-span-12 lg:col-span-5')} bg-[#1A1F2C] border border-[#2A2E39] rounded-xl p-5 flex flex-col justify-between h-[360px]`}
    >
      <div>
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#2A2E39]">
          <span className="text-xs uppercase tracking-wider font-bold text-gray-300">
            Market Summary Metrics
          </span>
          <span className="text-[10px] text-gray-500 font-mono">ID: {currentPair}</span>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400 font-sans">Multi-TF Directional Bias:</span>
            <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
              bias === 'BULLISH' 
                ? 'bg-[#26A69A]/10 text-[#26A69A] border border-[#26A69A]/20' 
                : 'bg-[#EF5350]/10 text-[#EF5350] border border-[#EF5350]/20'
            }`}>
              {bias}
            </span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400">Order Flow Trend Strength:</span>
            <div className="flex items-center space-x-1.5 text-gray-200">
              <span className="w-2 h-2 rounded-full bg-[#26A69A] animate-ping" />
              <span className="font-semibold text-emerald-400">Strong Momentum</span>
            </div>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400">Market Structure State:</span>
            <span className="text-[#CAAA98] font-mono font-bold">Higher Highs / Higher Lows</span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400">Current Swing Cycle Phase:</span>
            <span className="text-gray-200 bg-slate-800 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider">
              Impulse Leg expansion
            </span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400">Next Expected Structure Shift:</span>
            <span className="text-[#26A69A] font-semibold text-right">Expansion Continuation High (HH)</span>
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-[#2A2E39]/40">
        <div className="p-3 bg-[#111622] rounded border border-[#2A2E39] text-[10px]">
          <span className="text-gray-500 uppercase tracking-wider block mb-1 font-mono">SLP Legend Map</span>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#26A69A]" />
              <span className="text-gray-300 font-semibold">OB (Order Block)</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1565C0]" />
              <span className="text-gray-300 font-semibold">BB (Breaker Block)</span>
            </div>
          </div>
        </div>

        <p className="text-[10px] italic text-[#9AA3B2] leading-relaxed">
          "Trade only in alignment with the high timeframe bias. Avoid highly speculative counter-trend setups under premium zones."
        </p>
      </div>
    </section>
  );
}
