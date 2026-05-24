import React, { useState } from 'react';
import { Plus, Trash2, Database, Bell } from 'lucide-react';
import { POI, Signal } from '../types';

interface DashboardDoublePanelsProps {
  poiList: POI[];
  setPoiList: React.Dispatch<React.SetStateAction<POI[]>>;
  filteredSignals: Signal[];
  setShowAddPoiModal: (show: boolean) => void;
  showToast: (msg: string) => void;
  appStateMode: string;
  setAppStateMode: (m: string) => void;
  poiFlashId: string | null;
  currencySymbol: string;
  isLayoutB?: boolean;
}

export default function DashboardDoublePanels({
  poiList,
  setPoiList,
  filteredSignals,
  setShowAddPoiModal,
  showToast,
  appStateMode,
  setAppStateMode,
  poiFlashId,
  currencySymbol,
  isLayoutB = false
}: DashboardDoublePanelsProps) {
  const [hoveredPoi, setHoveredPoi] = useState<string | null>(null);

  const handleDeletePoi = (id: string, name: string) => {
    setPoiList(prev => prev.filter(p => p.id !== id));
    showToast(`POI zone "${name}" deleted from active level charts.`);
  };

  return (
    <div 
      id="quad-4-double-panels" 
      className={`${isLayoutB ? 'col-span-1 border border-[#2A2E39] rounded-xl h-[520px]' : 'md:col-span-12 lg:col-span-7 border border-[#2A2E39] rounded-xl h-[360px]'} bg-[#1A1F2C] grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[#2A2E39] overflow-hidden`}
    >
      {/* LEFT SUB-PANEL: HIGHER TIMEFRAME POI MAP */}
      <div className="p-4 flex flex-col justify-between h-full">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-200">
              Higher Timeframe POI Map
            </h3>
            <button
              id="btn-add-poi-modal"
              onClick={() => setShowAddPoiModal(true)}
              className="flex items-center space-x-1 border border-[#CAAA98]/40 hover:bg-[#CAAA98]/15 text-[#CAAA98] px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer transition-colors"
            >
              <Plus size={10} />
              <span>Add POI</span>
            </button>
          </div>

          {appStateMode === 'empty' ? (
            <div className="flex flex-col items-center justify-center text-center py-12">
              <Database size={24} className="text-gray-500 mb-2" />
              <span className="text-[11px] text-gray-300 font-bold">No POIs Synced</span>
              <p className="text-[9px] text-gray-500 max-w-[150px] mt-1 leading-snug">No support/resistance lines mapped.</p>
              <button
                onClick={() => {
                  setPoiList([
                    { id: '1', name: 'POI - 1 (OB)', type: 'OB', priceRange: '64,200.0 – 65,100.0', priceMin: 64200, priceMax: 65100, status: 'Active', timeframe: '4H' },
                    { id: '2', name: 'POI - 2 (OB)', type: 'OB', priceRange: '61,800.0 – 62,500.0', priceMin: 61800, priceMax: 62500, status: 'Mitigated', timeframe: '1D' },
                    { id: '3', name: 'POI - 3 (BB)', type: 'BB', priceRange: '65,800.0 – 66,400.0', priceMin: 65800, priceMax: 66400, status: 'Tested', timeframe: '1H' },
                  ]);
                  setAppStateMode('healthy');
                  showToast("Primary level overlays restored!");
                }}
                className="mt-2 text-[8px] bg-[#CAAA98]/10 text-[#CAAA98] border border-[#CAAA98]/30 px-2 py-1 rounded cursor-pointer"
              >
                Load Default POIs
              </button>
            </div>
          ) : (
            <div className={`space-y-1 overflow-y-auto ${isLayoutB ? 'max-h-[380px]' : 'max-h-[220px]'} pr-1`}>
              {poiList.map((poi) => {
                const isFlashed = poiFlashId === poi.id;
                return (
                  <div
                    key={poi.id}
                    onMouseEnter={() => setHoveredPoi(poi.id)}
                    onMouseLeave={() => setHoveredPoi(null)}
                    className={`flex items-center justify-between p-2 rounded hover:bg-[#1C2230] transition-all duration-300 group border ${
                      isFlashed 
                        ? 'bg-emerald-500/15 border-emerald-500 animate-pulse' 
                        : 'border-transparent hover:border-[#2A2E39]'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className={`w-2 h-2 rounded-full ${
                        poi.type === 'OB' ? 'bg-[#26A69A]' : 'bg-[#1565C0]'
                      }`} />
                      <div>
                        <span className="text-[11px] font-bold text-gray-200 block leading-tight">
                          {poi.name}
                        </span>
                        <span className="text-[9px] text-[#CAAA98] font-mono leading-none">
                          {currencySymbol}{poi.priceRange}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        poi.status === 'Active' 
                          ? 'bg-[#26A69A]/15 text-[#26A69A]' 
                          : poi.status === 'Mitigated' 
                            ? 'bg-gray-800 text-gray-500' 
                            : 'bg-yellow-500/10 text-yellow-500'
                      }`}>
                        {poi.status}
                      </span>
                      
                      <button 
                        onClick={() => handleDeletePoi(poi.id, poi.name)}
                        className="text-gray-500 hover:text-[#EF5350] p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="Remove Zone"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="text-[10px] text-gray-500 font-mono pt-3 border-t border-[#2A2E39]">
          HTF Level: {appStateMode === 'empty' ? 0 : poiList.filter(p => p.status === 'Active').length} Active OB Blocks
        </div>
      </div>

      {/* RIGHT SUB-PANEL: RECENT SIGNALS */}
      <div className="p-4 flex flex-col justify-between h-full">
        <div>
          <div className="flex items-center justify-between mb-3 border-b border-transparent pb-1.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-200">
              Recent Closed Signals
            </h3>
            <span className="text-[10px] text-gray-400 hover:text-white cursor-pointer font-semibold underline">
              View All &rarr;
            </span>
          </div>

          {appStateMode === 'empty' ? (
            <div className="flex flex-col items-center justify-center text-center py-12">
              <Bell size={24} className="text-gray-500 mb-2 animate-pulse" />
              <span className="text-[11px] text-gray-300 font-bold font-sans">Signals Empty</span>
              <p className="text-[9px] text-gray-500 max-w-[150px] mt-1 leading-snug">No historical telemetry loaded.</p>
              <button
                onClick={() => {
                  setAppStateMode('healthy');
                  showToast("Historical closed signals database feed restored!");
                }}
                className="mt-2 text-[8px] bg-[#CAAA98]/10 text-[#CAAA98] border border-[#CAAA98]/30 px-2 py-1 rounded cursor-pointer"
              >
                Simulate Past Feeds
              </button>
            </div>
          ) : (
            <div className={`space-y-1 overflow-y-auto ${isLayoutB ? 'max-h-[380px]' : 'max-h-[220px]'}`}>
              {filteredSignals.map((sig, sIdx) => (
                <div
                  key={sig.id}
                  className={`flex items-center justify-between p-2 rounded hover:bg-[#1C2230] transition-colors cursor-pointer border border-transparent hover:border-[#2A2E39] ${
                    sIdx % 2 === 0 ? 'bg-[#111622]/50' : 'bg-transparent'
                  }`}
                >
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[11px] font-bold text-gray-200">{sig.pair}</span>
                      <span className={`text-[9px] font-bold px-1 px-0.2 rounded font-sans uppercase tracking-tight ${
                        sig.direction === 'Long' ? 'bg-[#26A69A]/10 text-[#26A69A]' : 'bg-[#EF5350]/10 text-[#EF5350]'
                      }`}>
                        {sig.direction === 'Long' ? 'LNG' : 'SHT'}
                      </span>
                    </div>
                    <span className="text-[9px] text-gray-500 block font-mono">{sig.date}</span>
                  </div>

                  <div className="text-right">
                    <span className={`text-xs font-mono font-bold block ${
                      sig.isWin ? 'text-[#26A69A]' : 'text-[#EF5350]'
                    }`}>
                      {sig.pnl}
                    </span>
                    <span className="text-[8px] uppercase tracking-wider text-gray-400 block font-sans">
                      {sig.result}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-[10px] text-gray-500 font-mono pt-3 border-t border-[#2A2E39] flex justify-between">
          <span>Avg RR Expected: 1:3.1</span>
          <span className="text-[#26A69A]">Winrate: 74%</span>
        </div>
      </div>
    </div>
  );
}
