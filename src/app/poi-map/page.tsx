/**
 * @file page.tsx
 * @description Point of Interest map page.
 */

'use client';

import React from 'react';
import { usePOIStore } from '../../store/usePOIStore';
import { useMarketStore } from '../../store/useMarketStore';
import { Map, MapPin, Trash2, Crosshair, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { formatPrice } from '../../lib/market/marketDataService';

export default function POIMapPage() {
  const { pois, removePOI, setActivePOI, activePOI } = usePOIStore();
  const { selectedPair } = useMarketStore();

  const groupedPOIs = pois.reduce((acc, poi) => {
    if (!acc[poi.status]) acc[poi.status] = [];
    acc[poi.status].push(poi);
    return acc;
  }, {} as Record<string, typeof pois>);

  return (
    <div className="p-6 h-full overflow-y-auto bg-[#0A0D14] text-gray-200">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2A2E39] pb-4">
          <div>
            <h1 className="text-2xl font-bold font-display uppercase tracking-wide text-white flex items-center gap-3">
              <Map className="text-[#CAAA98]" size={24} />
              Points of Interest Grid
            </h1>
            <p className="text-sm text-gray-400 mt-1">Manage and monitor automatic and manually identified price zones.</p>
          </div>
          <button className="flex items-center gap-2 bg-[#CAAA98] hover:bg-[#DBC1B3] text-black px-4 py-2 rounded-lg font-bold text-sm tracking-wide transition-colors">
            <Plus size={16} /> ADD POI
          </button>
        </div>

        {/* Categories */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           {['Active', 'Mitigated'].map((status) => (
              <div key={status} className="bg-[#131722] border border-[#2A2E39] rounded-xl overflow-hidden flex flex-col">
                 <div className="p-4 border-b border-[#2A2E39] bg-[#0A0D14]/50">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                       {status === 'Active' ? <div className="w-2 h-2 rounded-full bg-[#26A69A]"></div> : <div className="w-2 h-2 rounded-full bg-gray-500"></div>}
                       {status} POIs
                    </h2>
                 </div>
                 
                 <div className="p-4 flex-1">
                    {(groupedPOIs[status] || []).length === 0 ? (
                       <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                          <MapPin size={32} className="mb-2 opacity-50" />
                          <p className="text-sm">No {status.toLowerCase()} POIs</p>
                       </div>
                    ) : (
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {(groupedPOIs[status] || []).map((poi) => (
                             <motion.div 
                               initial={{ opacity: 0, y: 10 }}
                               animate={{ opacity: 1, y: 0 }}
                               key={poi.id} 
                               className={`bg-[#0A0D14] border rounded-lg p-4 relative group transition-colors ${activePOI?.id === poi.id ? 'border-[#CAAA98]' : 'border-[#2A2E39] hover:border-gray-500'}`}
                             >
                                <div className="flex justify-between items-start mb-2">
                                   <div>
                                      <span className={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${
                                        poi.type === 'OB' ? 'bg-[#26A69A]/20 text-[#26A69A]' : 
                                        poi.type === 'BB' ? 'bg-[#1565C0]/20 text-[#42A5F5]' : 
                                        'bg-gray-800 text-gray-300'
                                      }`}>
                                         {poi.type}
                                      </span>
                                      <span className="text-xs text-gray-400 ml-2 font-mono">{poi.timeframe || '1D'}</span>
                                   </div>
                                   <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      {status === 'Active' && (
                                         <button 
                                           onClick={() => setActivePOI(poi)}
                                           className="p-1 text-gray-400 hover:text-white bg-[#131722] rounded"
                                           title="Locate on Chart"
                                         >
                                            <Crosshair size={14} />
                                         </button>
                                      )}
                                      <button 
                                        onClick={() => removePOI(poi.id)}
                                        className="p-1 text-gray-400 hover:text-red-400 bg-[#131722] rounded"
                                        title="Delete POI"
                                      >
                                         <Trash2 size={14} />
                                      </button>
                                   </div>
                                </div>
                                <h3 className="font-bold text-sm text-gray-200 mb-1">{poi.name}</h3>
                                <div className="text-xs text-gray-400 font-mono flex items-center justify-between">
                                   <span>{poi.priceRange || `${formatPrice(poi.priceMin || 0, selectedPair)} - ${formatPrice(poi.priceMax || 0, selectedPair)}`}</span>
                                </div>
                             </motion.div>
                          ))}
                       </div>
                    )}
                 </div>
              </div>
           ))}
        </div>
      </div>
    </div>
  );
}
