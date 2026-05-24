/**
 * @file AlertRow.tsx
 * @description Standardized row showing specific price-action alerts thresholds.
 */

import React from 'react';
import { Alert } from '../../types';
import { Bell, BellOff, Check } from 'lucide-react';

export interface AlertRowProps {
  alert: Alert;
  onToggleStatus?: (id: string) => void;
}

export const AlertRow: React.FC<AlertRowProps> = ({ alert, onToggleStatus }) => {
  return (
    <div className="flex items-center justify-between p-3.5 rounded-xl border border-[#2D313E]/30 bg-card">
      <div className="flex items-center space-x-3.5">
        <div className={`p-2 rounded-full ${
          alert.status === 'Active' ? 'bg-light/10 text-light' : 'bg-zinc-800 text-gray-500'
        }`}>
          <Bell size={15} className={alert.status === 'Active' ? 'animate-bounce' : ''} />
        </div>
        <div>
          <span className="text-white font-bold font-display text-xs tracking-wide uppercase">{alert.pair}</span>
          <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">{alert.condition}</p>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <span className={`text-[9px] font-mono font-extrabold px-2 py-0.5 rounded border uppercase ${
          alert.status === 'Active' ? 'bg-bullish/10 text-bullish border-bullish/30' : 'bg-zinc-850 text-gray-500 border-zinc-800'
        }`}>
          {alert.status}
        </span>
        {onToggleStatus && (
          <button 
            onClick={() => onToggleStatus(alert.id)}
            className="p-1 px-2.5 bg-[#252B3A] text-gray-300 hover:text-white rounded border border-[#2D313E] text-[10px] uppercase font-mono tracking-wider transition-colors cursor-pointer"
          >
            MUTE
          </button>
        )}
      </div>
    </div>
  );
};

export default AlertRow;
