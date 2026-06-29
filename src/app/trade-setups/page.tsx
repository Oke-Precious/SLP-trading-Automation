import React, { useMemo } from 'react';
import { useMarketStore } from '../../store/useMarketStore';
import { usePOIStore } from '../../store/usePOIStore';
import { useRealtimeCandles } from '../../hooks/useRealtimeCandles';
import { runSMCAnalysis } from '../../lib/analysis/smcEngine';
import { Target, Layers, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';
import { formatPrice } from '../../lib/market/marketDataService';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';

export default function TradeSetupsPage() {
  const { selectedPair, selectedTimeframe } = useMarketStore();
  const { pois } = usePOIStore();
  const { candles, isLoading } = useRealtimeCandles(selectedPair, selectedTimeframe);

  const smcResult = useMemo(() => {
    if (!candles || candles.length < 30) return null;
    return runSMCAnalysis(candles);
  }, [candles]);

  const setups = useMemo(() => {
    const list: any[] = [];
    if (!smcResult) return list;

    // From SMC Engine
    smcResult.orderBlocks.forEach((ob, idx) => {
      const type = ob.isBroken ? 'Breaker Block' : 'Order Block';
      const direction = ob.type;
      
      const relatedBos = smcResult.bosEvents.find(b => b.direction === direction && b.breakTime >= ob.startTime);
      const isConfirmed = !!relatedBos;

      list.push({
        id: `auto-${idx}`,
        source: 'Auto-SMC',
        title: `${selectedTimeframe} ${direction} ${type}`,
        direction,
        type,
        entryZone: `${formatPrice(Math.min(ob.bottom, ob.top), selectedPair)} - ${formatPrice(Math.max(ob.bottom, ob.top), selectedPair)}`,
        status: ob.status,
        isConfirmed,
        time: ob.startTime
      });
    });

    // From manual POIs
    pois.forEach((poi, idx) => {
      if (poi.status?.toUpperCase() === 'MITIGATED') return;
      const direction = poi.type === 'BB' ? 'Unknown' : poi.type === 'OB' ? 'BULLISH/BEARISH' : 'Unknown'; 
      // Manual POIs don't explicitly have direction stored inside 'type' unfortunately, they usually say "OB".
      list.push({
        id: `poi-${idx}`,
        source: 'Manual POI',
        title: poi.name || `Custom ${poi.type}`,
        direction: 'Pending',
        type: poi.type,
        entryZone: poi.priceRange,
        status: poi.status,
        isConfirmed: false,
        time: Date.now() - idx * 1000
      });
    });

    return list;
  }, [smcResult, pois, selectedTimeframe, selectedPair]);

  return (
    <div className="p-6 bg-[#111622] text-[#E0E3EB] min-h-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold font-display uppercase tracking-wider text-[#CAAA98] flex items-center gap-2">
            <Target size={20} />
            Trade Setups
          </h1>
          <p className="text-xs font-mono text-gray-500 mt-1 uppercase tracking-widest">
            {selectedPair} | {selectedTimeframe} Context
          </p>
        </div>
      </div>

      {isLoading && (!candles || candles.length === 0) ? (
        <div className="flex flex-col items-center justify-center p-12 text-gray-500">
          <LoadingSpinner />
          <span className="mt-4 font-mono text-xs uppercase tracking-widest">Loading Market Context...</span>
        </div>
      ) : setups.length === 0 ? (
        <div className="bg-[#1A1F2C] border border-[#2A2E39]/50 rounded-xl p-8">
          <EmptyState 
            icon="🎯" 
            title="No Active Setups" 
            message={`The SMC engine has not detected any unmitigated order blocks or breaker blocks for ${selectedPair} on ${selectedTimeframe}.`} 
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {setups.map((setup) => (
            <div key={setup.id} className="bg-[#1A1F2C] border border-[#2A2E39] rounded-xl p-5 hover:border-[#CAAA98]/40 transition-colors group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase tracking-wider ${
                    setup.direction === 'BULLISH' ? 'bg-[#26A69A]/10 text-[#26A69A] border border-[#26A69A]/20' : 
                    setup.direction === 'BEARISH' ? 'bg-[#EF5350]/10 text-[#EF5350] border border-[#EF5350]/20' :
                    'bg-gray-800 text-gray-400 border border-gray-700'
                  }`}>
                    {setup.direction}
                  </span>
                  <span className="text-[10px] bg-[#22283A] text-gray-400 px-2 py-0.5 rounded border border-[#2A2E39] font-mono">
                    {setup.source}
                  </span>
                </div>
                {setup.isConfirmed && (
                  <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                    BOS Confirmed
                  </span>
                )}
              </div>
              
              <h3 className="text-sm font-bold text-gray-200 mb-1 leading-tight group-hover:text-[#CAAA98] transition-colors">
                {setup.title}
              </h3>
              
              <div className="flex flex-col gap-3 mt-4 text-sm font-mono bg-[#111622] p-3 rounded-lg border border-[#2A2E39]/50">
                <div className="flex justify-between items-center text-gray-400">
                  <span className="text-[10px] uppercase tracking-wider font-bold">Entry Zone</span>
                  <span className="text-gray-200 text-xs font-semibold">{setup.entryZone}</span>
                </div>
                <div className="flex justify-between items-center text-gray-400">
                  <span className="text-[10px] uppercase tracking-wider font-bold">Status</span>
                  <span className="text-gray-300 text-[10px] uppercase">{setup.status}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-[#2A2E39] flex justify-between items-center">
                <div className="flex items-center text-[10px] text-gray-500 font-mono gap-1.5">
                  <Clock size={12} />
                  <span>{new Date(setup.time * (setup.source === 'Auto-SMC' ? 1000 : 1)).toLocaleTimeString()}</span>
                </div>
                <button className="text-[10px] font-bold uppercase tracking-wider text-[#CAAA98] hover:text-white transition-colors flex items-center gap-1 cursor-pointer">
                  Setup Alert
                  {setup.direction === 'BULLISH' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
