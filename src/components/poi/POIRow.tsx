/**
 * @file POIRow.tsx
 * @description Single POI row widget.
 */

import React from 'react';
import { POI } from '../../types';
import POIBadge from './POIBadge';

export interface POIRowProps {
  poi: POI;
  onSelect?: (poi: POI) => void;
}

export const POIRow: React.FC<POIRowProps> = ({ poi, onSelect }) => {
  return (
    <div 
      onClick={() => onSelect?.(poi)}
      className="flex items-center justify-between p-3.5 hover:bg-[#252B3A] rounded-xl transition-all border border-[#2D313E]/30 bg-card cursor-pointer group"
    >
      <div>
        <div className="flex items-center space-x-2">
          <span className={`px-1.5 py-0.2 rounded font-mono text-[9px] font-extrabold ${
            poi.type === 'OB' ? 'bg-bullish/10 text-bullish' : 'bg-bearish/10 text-bearish'
          }`}>
            {poi.type}
          </span>
          <span className="text-gray-200 group-hover:text-light transition-colors font-bold font-display text-sm">
            {poi.name}
          </span>
        </div>
        <p className="text-[11px] text-gray-500 font-mono mt-1 pr-2">
          Price Range: {poi.priceRange} &bull; Timeframe: {poi.timeframe}
        </p>
      </div>

      <POIBadge status={poi.status} />
    </div>
  );
};

export default POIRow;
