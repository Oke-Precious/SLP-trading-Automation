/**
 * @file SignalRow.tsx
 * @description Row layout showcasing algorithmic signal coordinates.
 */

import React from 'react';
import { Signal } from '../../types';
import SignalBadge from './SignalBadge';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export interface SignalRowProps {
  signal: Signal;
}

export const SignalRow: React.FC<SignalRowProps> = ({ signal }) => {
  return (
    <div className="flex items-center justify-between p-3.5 hover:bg-[#202738] rounded-xl transition-all border border-[#2D313E]/30 bg-card">
      <div className="flex items-center space-x-3.5">
        <div className={`p-2 rounded-full ${
          signal.direction === 'Long' ? 'bg-[#26A69A]/10 text-bullish' : 'bg-[#EF5350]/10 text-bearish'
        }`}>
          {signal.direction === 'Long' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-white font-bold font-display text-sm uppercase">{signal.pair}</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
              signal.direction === 'Long' ? 'bg-bullish/10 text-bullish' : 'bg-bearish/10 text-bearish'
            }`}>{signal.direction}</span>
          </div>
          <p className="text-[10px] text-gray-500 font-mono mt-0.5">{signal.date} &bull; Entry Zone Focus</p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="text-right">
          <span className={`font-mono text-sm font-extrabold ${signal.isWin ? 'text-bullish' : 'text-bearish'}`}>
            {signal.result}
          </span>
          <p className="text-[9px] text-gray-500 font-mono italic">{signal.pnl}</p>
        </div>
        <SignalBadge isWin={signal.isWin ?? false} />
      </div>
    </div>
  );
};

export default SignalRow;
