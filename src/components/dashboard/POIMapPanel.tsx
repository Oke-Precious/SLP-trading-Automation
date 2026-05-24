/**
 * @file POIMapPanel.tsx
 * @description List of HTF POIs for the selected pair and timeframe.
 */

import React from 'react';
import { usePOIStore } from '../../store/usePOIStore';
import { useMarketStore } from '../../store/useMarketStore';
import { Layers, CheckCircle, AlertTriangle } from 'lucide-react';

export const POIMapPanel: React.FC = () => {
  const { selectedPair } = useMarketStore();
  const pois = usePOIStore((state) => state.pois);

  return (
    <div className="bg-card border border-border-custom rounded-xl p-5 hover:border-[#3A455E] transition-all duration-300">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <Layers className="text-light shrink-0" size={18} />
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">HTF POI Matrix</h3>
        </div>
        <span className="text-[10px] font-mono text-gray-500 uppercase font-bold tracking-wider">
          {selectedPair}
        </span>
      </div>

      <div className="space-y-2.5 max-h-[290px] overflow-y-auto pr-1">
        {pois.map((poi) => (
          <div 
            key={poi.id}
            className="flex items-center justify-between p-3 rounded-lg bg-surface border border-[#2D313E]/30"
          >
            <div>
              <div className="flex items-center space-x-2">
                <span className={`px-1.5 py-0.2 rounded font-mono text-[9px] font-extrabold ${
                  poi.type === 'OB' ? 'bg-bullish/10 text-bullish border border-bullish/20' : 'bg-[#EF5350]/10 text-bearish border border-[#EF5350]/20'
                }`}>
                  {poi.type}
                </span>
                <span className="text-[#E0E3EB] font-bold text-xs font-display">{poi.name}</span>
              </div>
              <p className="text-[10px] italic font-mono text-gray-500 mt-1">{poi.priceRange} &bull; Timeframe: {poi.timeframe}</p>
            </div>

            <div className="flex items-center">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                poi.status === 'Active' 
                  ? 'bg-[#26A69A]/10 text-[#26A69A] border-[#26A69A]/20 poi-pulse-green' 
                  : poi.status === 'Tested' 
                  ? 'bg-neutral/10 text-neutral border-neutral/20' 
                  : 'bg-zinc-800 text-gray-500 border-zinc-700'
              }`}>
                {poi.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default POIMapPanel;
