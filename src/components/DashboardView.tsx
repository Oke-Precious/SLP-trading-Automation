import React, { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { CurrencyPair, Timeframe, POI, Signal } from '../types';
import { useMarketStore } from '../store/useMarketStore';
import { usePOIs, useCreatePOI } from '../hooks/usePOIs';
import { analytics } from '../lib/analytics';

import DashboardChart from './DashboardChart';
import DashboardPlan from './DashboardPlan';
import DashboardSummary from './DashboardSummary';
import DashboardDoublePanels from './DashboardDoublePanels';
import AiAnalysisPanel from './AiAnalysisPanel';

interface DashboardViewProps {
  currentPair: CurrencyPair;
  currentTimeframe: Timeframe;
  setCurrentTimeframe: (tf: Timeframe) => void;
  bias: 'BULLISH' | 'BEARISH';
}

export default function DashboardView({ 
  currentPair, 
  currentTimeframe, 
  setCurrentTimeframe, 
  bias 
}: DashboardViewProps) {
  const { layoutVariant, appStateMode, setAppStateMode } = useMarketStore();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeDrawTool, setActiveDrawTool] = useState<string | null>(null);
  const [stepsCompleted, setStepsCompleted] = useState<boolean[]>([true, true, false, false, false, false]);
  const [showAddPoiModal, setShowAddPoiModal] = useState(false);
  const [poiFlashId, setPoiFlashId] = useState<string | null>(null);

  // Interactive Chart drawings coordinates state
  const [clickCoordinates, setClickCoordinates] = useState<{ x: number; y: number }[]>([]);

  // Escape Press event listeners for modal dismiss
  useEffect(() => {
    const handleEscapePressed = () => {
      setShowAddPoiModal(false);
    };

    window.addEventListener('autoslp_escape_pressed', handleEscapePressed);
    return () => window.removeEventListener('autoslp_escape_pressed', handleEscapePressed);
  }, []);

  // New POI form inputs
  const [newPoiName, setNewPoiName] = useState('POI - Custom OB');
  const [newPoiType, setNewPoiType] = useState<'OB' | 'BB'>('OB');
  const [newPoiMin, setNewPoiMin] = useState('');
  const [newPoiMax, setNewPoiMax] = useState('');

  // Notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Default price multipliers to generate context-relevant numbers
  const assetScale = {
    BTCUSDT: { base: 64200, tick: 1500, label: 'OB' },
    ETHUSDT: { base: 3450, tick: 110, label: 'OB' },
    EURUSD: { base: 1.0850, tick: 0.0040, label: 'OB' },
    GBPUSD: { base: 1.2720, tick: 0.0050, label: 'OB' }
  };

  const scale = assetScale[currentPair] || assetScale.BTCUSDT;
  const coinStep = scale.tick / 16;
  const pivotBase = scale.base;

  // Set default form values dynamically when target changes
  useEffect(() => {
    const minVal = (scale.base - scale.tick * 0.4).toFixed(currentPair.includes('USD') && !currentPair.includes('USDT') ? 4 : 1);
    const maxVal = (scale.base + scale.tick * 0.2).toFixed(currentPair.includes('USD') && !currentPair.includes('USDT') ? 4 : 1);
    setNewPoiMin(minVal);
    setNewPoiMax(maxVal);
  }, [currentPair, scale]);

  // Initial Points of Interest
  const [poiList, setPoiList] = useState<POI[]>([]);
  const { data: qPoiList } = usePOIs({ pair: currentPair });
  const createPoiMutation = useCreatePOI();

  // Sync state when backend or cached query updates
  useEffect(() => {
    if (qPoiList && qPoiList.length > 0) {
      setPoiList(qPoiList);
    } else {
      // Offline fallback defaults when database query is empty or not loaded yet
      if (currentPair === 'BTCUSDT') {
        setPoiList([
          { id: '1', name: 'POI - 1 (OB)', type: 'OB', priceRange: '64,200.0 – 65,100.0', priceMin: 64200, priceMax: 65100, status: 'Active', timeframe: '4H' },
          { id: '2', name: 'POI - 2 (OB)', type: 'OB', priceRange: '61,800.0 – 62,500.0', priceMin: 61800, priceMax: 62500, status: 'Mitigated', timeframe: '1D' },
          { id: '3', name: 'POI - 3 (BB)', type: 'BB', priceRange: '65,800.0 – 66,400.0', priceMin: 65800, priceMax: 66400, status: 'Tested', timeframe: '1H' },
        ]);
      } else if (currentPair === 'ETHUSDT') {
        setPoiList([
          { id: '1', name: 'POI - 1 (OB)', type: 'OB', priceRange: '3,410.0 – 3,460.0', priceMin: 3410, priceMax: 3460, status: 'Active', timeframe: '4H' },
          { id: '2', name: 'POI - 2 (OB)', type: 'OB', priceRange: '3,280.0 – 3,330.0', priceMin: 3280, priceMax: 3330, status: 'Mitigated', timeframe: '1D' },
          { id: '3', name: 'POI - 3 (BB)', type: 'BB', priceRange: '3,520.0 – 3,560.0', priceMin: 3520, priceMax: 3560, status: 'Tested', timeframe: '1H' },
        ]);
      } else if (currentPair === 'EURUSD') {
        setPoiList([
          { id: '1', name: 'POI - 1 (OB)', type: 'OB', priceRange: '1.0810 – 1.0840', priceMin: 1.0810, priceMax: 1.0840, status: 'Active', timeframe: '4H' },
          { id: '2', name: 'POI - 2 (OB)', type: 'OB', priceRange: '1.0740 – 1.0780', priceMin: 1.0740, priceMax: 1.0780, status: 'Mitigated', timeframe: '1D' },
          { id: '3', name: 'POI - 3 (BB)', type: 'BB', priceRange: '1.0890 – 1.0920', priceMin: 1.0890, priceMax: 1.0920, status: 'Tested', timeframe: '1H' },
        ]);
      } else { // GBPUSD
        setPoiList([
          { id: '1', name: 'POI - 1 (OB)', type: 'OB', priceRange: '1.2670 – 1.2720', priceMin: 1.2670, priceMax: 1.2720, status: 'Active', timeframe: '4H' },
          { id: '2', name: 'POI - 2 (OB)', type: 'OB', priceRange: '1.2580 – 1.2630', priceMin: 1.2580, priceMax: 1.2630, status: 'Mitigated', timeframe: '1D' },
          { id: '3', name: 'POI - 3 (BB)', type: 'BB', priceRange: '1.2790 – 1.2840', priceMin: 1.2790, priceMax: 1.2840, status: 'Tested', timeframe: '1H' },
        ]);
      }
    }
  }, [qPoiList, currentPair]);

  // Handle POI addition
  const handleAddPoiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const minVal = parseFloat(newPoiMin);
    const maxVal = parseFloat(newPoiMax);
    if (isNaN(minVal) || isNaN(maxVal)) {
      showToast('Please type proper numbers for the prices!');
      return;
    }

    const isCrypto = currentPair.includes('USDT');
    const displayRange = isCrypto
      ? `${minVal.toLocaleString(undefined, { minimumFractionDigits: 1 })} – ${maxVal.toLocaleString(undefined, { minimumFractionDigits: 1 })}`
      : `${minVal.toFixed(4)} – ${maxVal.toFixed(4)}`;

    const newPoi: POI = {
      id: String(Date.now()),
      name: newPoiName,
      type: newPoiType,
      priceRange: displayRange,
      priceMin: Math.min(minVal, maxVal),
      priceMax: Math.max(minVal, maxVal),
      status: 'Active',
      timeframe: currentTimeframe
    };

    // Trigger persistent database save mutation
    createPoiMutation.mutate({
      name: newPoi.name,
      type: newPoi.type,
      priceRange: newPoi.priceRange,
      priceMin: newPoi.priceMin,
      priceMax: newPoi.priceMax,
      status: 'Active',
      timeframe: newPoi.timeframe,
      pair: currentPair
    });

    setPoiList([newPoi, ...poiList]);
    setShowAddPoiModal(false);
    
    // Track privacy-first event in self-hosted analytics
    analytics.track('poi_created', { type: newPoiType === 'OB' ? 'ORDER_BLOCK' : 'BREAKER_BLOCK' });
    
    showToast(`Successfully added custom Point of Interest zone: ${newPoiName}`);

    // Trigger local status flash ID to give a subtle feedback animation in lists
    setPoiFlashId(newPoi.id);
    setTimeout(() => {
      setPoiFlashId(null);
    }, 3000);
  };

  // Base list of performance signals
  const performanceSignals: Signal[] = [
    { id: 's1', date: 'May 24, 2026', pair: 'BTCUSDT', direction: 'Long', result: 'HIT TP1', pnl: '+2.35%', isWin: true },
    { id: 's2', date: 'May 23, 2026', pair: 'ETHUSDT', direction: 'Short', result: 'STOPPED OUT', pnl: '-1.45%', isWin: false },
    { id: 's3', date: 'May 22, 2026', pair: 'EURUSD', direction: 'Long', result: 'HIT TP2', pnl: '+5.12%', isWin: true },
    { id: 's4', date: 'May 21, 2026', pair: 'GBPUSD', direction: 'Long', result: 'HIT TP1', pnl: '+1.80%', isWin: true },
  ];

  const filteredSignals = performanceSignals.filter(s => s.pair === currentPair || currentPair === 'BTCUSDT');

  // Spec details to render in trading setup parameters
  const activeSignalParameters = {
    BTCUSDT: { entry: '64,200', sl: '63,100', tp1: '66,800', tp2: '69,200', rr: '1:3.2' },
    ETHUSDT: { entry: '3,410', sl: '3,340', tp1: '3,595', tp2: '3,750', rr: '1:3.5' },
    EURUSD: { entry: '1.0810', sl: '1.0775', tp1: '1.0895', tp2: '1.0940', rr: '1:2.8' },
    GBPUSD: { entry: '1.2670', sl: '1.2625', tp1: '1.2785', tp2: '1.2850', rr: '1:3.0' },
  };

  const signalSpec = activeSignalParameters[currentPair] || activeSignalParameters.BTCUSDT;

  const isCrypto = currentPair.includes('USDT');
  const currencySymbol = isCrypto ? '$' : '';

  return (
    <div className="flex flex-col space-y-6">
      
      {/* Dynamic Action Toast Notifications */}
      {toastMessage && (
        <div className="fixed top-16 right-4 bg-[#1E2433] text-gray-200 border-l-4 border-[#CAAA98] px-4 py-3 rounded-lg shadow-2xl z-50 flex items-center space-x-3 text-xs tracking-wide animate-slideIn">
          <Check size={16} className="text-[#26A69A]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Primary Layout Engine (supporting Layout Variant A and Variant B) */}
      {layoutVariant === 'B' ? (
        /* Dynamic Layout B: Side-by-side vertical grouping */
        <div className={`grid grid-cols-1 ${isFullscreen ? 'lg:grid-cols-1' : 'lg:grid-cols-3'} gap-6`}>
          <div className={`space-y-6 ${isFullscreen ? 'lg:col-span-1' : 'lg:col-span-2'}`}>
            <DashboardChart
              currentPair={currentPair}
              currentTimeframe={currentTimeframe}
              setCurrentTimeframe={setCurrentTimeframe}
              scale={scale}
              coinStep={coinStep}
              pivotBase={pivotBase}
              poiList={poiList}
              activeDrawTool={activeDrawTool}
              setActiveDrawTool={setActiveDrawTool}
              clickCoordinates={clickCoordinates}
              setClickCoordinates={setClickCoordinates}
              showToast={showToast}
              isFullscreen={isFullscreen}
              setIsFullscreen={setIsFullscreen}
              appStateMode={appStateMode}
            />
            {!isFullscreen && (
              <div className="space-y-6">
                <DashboardSummary
                  currentPair={currentPair}
                  bias={bias}
                  fullWidth={true}
                />
                <AiAnalysisPanel 
                  currentPair={currentPair}
                  currentTimeframe={currentTimeframe}
                  bias={bias}
                />
              </div>
            )}
          </div>

          {!isFullscreen && (
            <div className="space-y-6">
              <DashboardPlan
                stepsCompleted={stepsCompleted}
                setStepsCompleted={setStepsCompleted}
                showToast={showToast}
                appStateMode={appStateMode}
                setAppStateMode={setAppStateMode}
                signalSpec={signalSpec}
                currencySymbol={currencySymbol}
              />
              <DashboardDoublePanels
                poiList={poiList}
                setPoiList={setPoiList}
                filteredSignals={filteredSignals}
                setShowAddPoiModal={setShowAddPoiModal}
                showToast={showToast}
                appStateMode={appStateMode}
                setAppStateMode={setAppStateMode}
                poiFlashId={poiFlashId}
                currencySymbol={currencySymbol}
                isLayoutB={true}
              />
            </div>
          )}
        </div>
      ) : (
        /* Layout A: Standard 2-Row Quadrant System */
        <>
          <div className={`grid grid-cols-1 ${isFullscreen ? 'lg:grid-cols-1' : 'lg:grid-cols-3'} gap-6`}>
            <div className={isFullscreen ? 'lg:col-span-1' : 'lg:col-span-2'}>
              <DashboardChart
                currentPair={currentPair}
                currentTimeframe={currentTimeframe}
                setCurrentTimeframe={setCurrentTimeframe}
                scale={scale}
                coinStep={coinStep}
                pivotBase={pivotBase}
                poiList={poiList}
                activeDrawTool={activeDrawTool}
                setActiveDrawTool={setActiveDrawTool}
                clickCoordinates={clickCoordinates}
                setClickCoordinates={setClickCoordinates}
                showToast={showToast}
                isFullscreen={isFullscreen}
                setIsFullscreen={setIsFullscreen}
                appStateMode={appStateMode}
              />
            </div>

            {!isFullscreen && (
              <DashboardPlan
                stepsCompleted={stepsCompleted}
                setStepsCompleted={setStepsCompleted}
                showToast={showToast}
                appStateMode={appStateMode}
                setAppStateMode={setAppStateMode}
                signalSpec={signalSpec}
                currencySymbol={currencySymbol}
              />
            )}
          </div>

          {!isFullscreen && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pb-12">
              <DashboardSummary
                currentPair={currentPair}
                bias={bias}
                className="md:col-span-12 lg:col-span-3"
              />
              <div className="md:col-span-12 lg:col-span-4">
                <AiAnalysisPanel 
                  currentPair={currentPair}
                  currentTimeframe={currentTimeframe}
                  bias={bias}
                />
              </div>
              <DashboardDoublePanels
                poiList={poiList}
                setPoiList={setPoiList}
                filteredSignals={filteredSignals}
                setShowAddPoiModal={setShowAddPoiModal}
                showToast={showToast}
                appStateMode={appStateMode}
                setAppStateMode={setAppStateMode}
                poiFlashId={poiFlashId}
                currencySymbol={currencySymbol}
                isLayoutB={false}
              />
            </div>
          )}
        </>
      )}

      {/* =================================================================
          MODAL: ADD NEW POINT OF INTEREST FORM (Interactive chart overlay injection)
          ================================================================= */}
      {showAddPoiModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#1A1F2C] border border-[#2A2E39] rounded-xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-4 bg-[#1E2433] border-b border-[#2A2E39] flex justify-between items-center text-gray-200">
              <span className="text-xs uppercase tracking-wider font-bold font-display">
                Plot Custom SMC POI Zone
              </span>
              <button 
                onClick={() => setShowAddPoiModal(false)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddPoiSubmit} className="p-4 space-y-4 text-xs font-sans text-gray-300">
              <div>
                <label className="block text-gray-400 mb-1 uppercase text-[9px] font-mono">POI Label:</label>
                <input
                  type="text"
                  required
                  value={newPoiName}
                  onChange={(e) => setNewPoiName(e.target.value)}
                  className="w-full bg-[#111622] border border-[#2A2E39] p-2 rounded text-xs px-3 focus:outline-none focus:border-[#CAAA98] text-white"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1 uppercase text-[9px] font-mono">SMC Block Type:</label>
                <div className="flex bg-[#111622] p-1 rounded-sm border border-[#2A2E39]">
                  <button
                    type="button"
                    onClick={() => {
                      setNewPoiType('OB');
                      setNewPoiName('POI - Custom OB');
                    }}
                    className={`flex-1 py-1.5 rounded transition-colors uppercase font-bold text-[10px] tracking-wider cursor-pointer ${
                      newPoiType === 'OB' ? 'bg-[#26A69A]/25 text-[#26A69A]' : 'text-gray-400'
                    }`}
                  >
                    Order Block (OB)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewPoiType('BB');
                      setNewPoiName('POI - Custom BB');
                    }}
                    className={`flex-1 py-1.5 rounded transition-colors uppercase font-bold text-[10px] tracking-wider cursor-pointer ${
                      newPoiType === 'BB' ? 'bg-[#1565C0]/25 text-[#1565C0]' : 'text-gray-400'
                    }`}
                  >
                    Breaker Block (BB)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1 uppercase text-[9px] font-mono">Floor Price ({currentPair}):</label>
                  <input
                    type="text"
                    required
                    value={newPoiMin}
                    onChange={(e) => setNewPoiMin(e.target.value)}
                    className="w-full bg-[#111622] border border-[#2A2E39] p-2 rounded text-xs px-3 font-mono focus:outline-none focus:border-[#CAAA98] text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1 uppercase text-[9px] font-mono">Ceiling Price ({currentPair}):</label>
                  <input
                    type="text"
                    required
                    value={newPoiMax}
                    onChange={(e) => setNewPoiMax(e.target.value)}
                    className="w-full bg-[#111622] border border-[#2A2E39] p-2 rounded text-xs px-3 font-mono focus:outline-none focus:border-[#CAAA98] text-white"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-[#CAAA98] hover:bg-[#b09382] text-slate-950 font-bold p-2.5 rounded uppercase tracking-wider text-[11px] transition-colors cursor-pointer"
                >
                  Confirm & Plot Zone Overlay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
