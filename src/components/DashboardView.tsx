import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Fullscreen, 
  Maximize2, 
  Minimize2, 
  Camera, 
  RotateCcw, 
  MoreHorizontal, 
  Check, 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  AlertCircle,
  TrendingDown,
  Activity,
  Layers,
  Dot,
  Target
} from 'lucide-react';
import { CurrencyPair, Timeframe, POI, Signal } from '../types';

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeDrawTool, setActiveDrawTool] = useState<string | null>(null);
  const [stepsCompleted, setStepsCompleted] = useState<boolean[]>([true, true, false, false, false, false]);
  const [showAddPoiModal, setShowAddPoiModal] = useState(false);
  const [hoveredPoi, setHoveredPoi] = useState<string | null>(null);

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

  // Set default form values dynamically when target changes
  useEffect(() => {
    const minVal = (scale.base - scale.tick * 0.4).toFixed(currentPair.includes('USD') && !currentPair.includes('USDT') ? 4 : 1);
    const maxVal = (scale.base + scale.tick * 0.2).toFixed(currentPair.includes('USD') && !currentPair.includes('USDT') ? 4 : 1);
    setNewPoiMin(minVal);
    setNewPoiMax(maxVal);
  }, [currentPair]);

  // Initial Points of Interest
  const [poiList, setPoiList] = useState<POI[]>([
    { id: '1', name: 'POI - 1 (OB)', type: 'OB', priceRange: '64,200.0 – 65,100.0', priceMin: 64200, priceMax: 65100, status: 'Active', timeframe: '4H' },
    { id: '2', name: 'POI - 2 (OB)', type: 'OB', priceRange: '61,800.0 – 62,500.0', priceMin: 61800, priceMax: 62500, status: 'Mitigated', timeframe: '1D' },
    { id: '3', name: 'POI - 3 (BB)', type: 'BB', priceRange: '65,800.0 – 66,400.0', priceMin: 65800, priceMax: 66400, status: 'Tested', timeframe: '1H' },
  ]);

  // Update POI list bounds dynamically when pair switches to match relative price offsets
  useEffect(() => {
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
  }, [currentPair]);

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

    setPoiList([newPoi, ...poiList]);
    setShowAddPoiModal(false);
    showToast(`Successfully added custom Point of Interest zone: ${newPoiName}`);
  };

  // Remove a POI zone
  const handleDeletePoi = (id: string, name: string) => {
    setPoiList(poiList.filter(p => p.id !== id));
    showToast(`Deleted Point of Interest zone: ${name}`);
  };

  // Default static signal records
  const performanceSignals: Signal[] = [
    { id: 's1', date: 'May 24, 2026', pair: 'BTCUSDT', direction: 'Long', result: 'HIT TP1', pnl: '+2.35%', isWin: true },
    { id: 's2', date: 'May 23, 2026', pair: 'ETHUSDT', direction: 'Short', result: 'STOPPED OUT', pnl: '-1.45%', isWin: false },
    { id: 's3', date: 'May 22, 2026', pair: 'EURUSD', direction: 'Long', result: 'HIT TP2', pnl: '+5.12%', isWin: true },
    { id: 's4', date: 'May 21, 2026', pair: 'GBPUSD', direction: 'Long', result: 'HIT TP1', pnl: '+1.80%', isWin: true },
  ];

  const filteredSignals = performanceSignals.filter(s => s.pair === currentPair || currentPair === 'BTCUSDT');

  // Interactive dynamic candlestick data construction based on scale
  const coinStep = scale.tick / 16;
  const pivotBase = scale.base;
  
  // Custom interactive trendline drawing state
  const [clickCoordinates, setClickCoordinates] = useState<{ x: number; y: number }[]>([]);
  const chartOuterRef = useRef<SVGSVGElement | null>(null);

  const handleChartClick = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!activeDrawTool) return;
    if (chartOuterRef.current) {
      const rect = chartOuterRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      if (activeDrawTool === 'pointer') {
         // select point
         showToast(`Coordinate captured at price level: ${(pivotBase + (100 - (y-60)/2.5) * (coinStep / 4)).toLocaleString(undefined, { maximumFractionDigits: 2 })}`);
         return;
      }
      
      setClickCoordinates([...clickCoordinates, { x, y }]);
      if (clickCoordinates.length === 1 && activeDrawTool === 'trendline') {
        showToast('Trendline segment completed on the structural canvas!');
        setActiveDrawTool(null);
      }
    }
  };

  const handleResetDrawings = () => {
    setClickCoordinates([]);
    setActiveDrawTool(null);
    showToast('Chart drawing elements reset successfully.');
  };

  // Generate beautiful simulated candle profiles synchronized with the pair
  const isCrypto = currentPair.includes('USDT');
  const currencySymbol = isCrypto ? '$' : '';
  const priceFormatter = (val: number) => {
    return isCrypto 
      ? val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
      : val.toFixed(4);
  };

  // Render simulated candlestick arrays
  const candleArray = [
    { id: 1, open: pivotBase - coinStep * 4, close: pivotBase - coinStep * 1, low: pivotBase - coinStep * 5, high: pivotBase, volume: 82, isBullish: true, type: 'HL', label: 'HL' },
    { id: 2, open: pivotBase - coinStep * 1, close: pivotBase + coinStep * 3, low: pivotBase - coinStep * 2, high: pivotBase + coinStep * 4, volume: 110, isBullish: true, type: 'normal' },
    { id: 3, open: pivotBase + coinStep * 3, close: pivotBase + coinStep * 5, low: pivotBase + coinStep * 2, high: pivotBase + coinStep * 6, volume: 95, isBullish: true, type: 'HH', label: 'HH' },
    { id: 4, open: pivotBase + coinStep * 5, close: pivotBase + coinStep * 2, low: pivotBase + coinStep * 1, high: pivotBase + coinStep * 6, volume: 140, isBullish: false, type: 'normal' },
    { id: 5, open: pivotBase + coinStep * 2, close: pivotBase + coinStep * 4, low: pivotBase + coinStep * 1, high: pivotBase + coinStep * 5, volume: 75, isBullish: true, type: 'normal' },
    { id: 6, open: pivotBase + coinStep * 4, close: pivotBase - coinStep * 2, low: pivotBase - coinStep * 3, high: pivotBase + coinStep * 5, volume: 165, isBullish: false, type: 'LH', label: 'LH' },
    { id: 7, open: pivotBase - coinStep * 2, close: pivotBase - coinStep * 5, low: pivotBase - coinStep * 6, high: pivotBase - coinStep * 1, volume: 115, isBullish: false, type: 'LL', label: 'LL' },
    { id: 8, open: pivotBase - coinStep * 5, close: pivotBase - coinStep * 2, low: pivotBase - coinStep * 6, high: pivotBase - coinStep * 1, volume: 90, isBullish: true, type: 'normal' },
    { id: 9, open: pivotBase - coinStep * 2, close: pivotBase + coinStep * 3, low: pivotBase - coinStep * 3, high: pivotBase + coinStep * 4, volume: 120, isBullish: true, type: 'normal' },
    { id: 10, open: pivotBase + coinStep * 3, close: pivotBase + coinStep * 7, low: pivotBase + coinStep * 2, high: pivotBase + coinStep * 8, volume: 200, isBullish: true, type: 'normal' },
  ];

  // Specific dynamic ranges to output
  const activeSignalParameters = {
    BTCUSDT: { entry: '64,200', sl: '63,100', tp1: '66,800', tp2: '69,200', rr: '1:3.2' },
    ETHUSDT: { entry: '3,410', sl: '3,340', tp1: '3,595', tp2: '3,750', rr: '1:3.5' },
    EURUSD: { entry: '1.0810', sl: '1.0775', tp1: '1.0895', tp2: '1.0940', rr: '1:2.8' },
    GBPUSD: { entry: '1.2670', sl: '1.2625', tp1: '1.2785', tp2: '1.2850', rr: '1:3.0' },
  };

  const signalSpec = activeSignalParameters[currentPair] || activeSignalParameters.BTCUSDT;

  return (
    <div className="flex flex-col space-y-6">
      
      {/* Dynamic Action Toast Notifications */}
      {toastMessage && (
        <div className="fixed top-16 right-4 bg-[#1E2433] text-gray-200 border-l-4 border-[#CAAA98] px-4 py-3 rounded-lg shadow-2xl z-50 flex items-center space-x-3 text-xs tracking-wide animate-slideIn">
          <Check size={16} className="text-[#26A69A]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Primary Layout Container (Grid system based on Fullscreen state) */}
      <div className={`grid grid-cols-1 ${isFullscreen ? 'lg:grid-cols-1' : 'lg:grid-cols-3'} gap-6`}>
        
        {/* =================================================================
            QUADRANT 1: HIGHER TIMEFRAME CANDLESTICK & STRUCTURE CHART CANVAS
            ================================================================= */}
        <section 
          id="quad-1-chart-area"
          className={`bg-[#1A1F2C] border border-[#2A2E39] rounded-xl flex flex-col justify-between relative transition-all duration-300 ${
            isFullscreen ? 'lg:col-span-3 h-[80vh]' : 'lg:col-span-2 h-[520px]'
          }`}
        >
          {/* Chart Header */}
          <div className="p-4 bg-[#1E2433] border-b border-[#2A2E39] flex items-center justify-between rounded-t-xl shrink-0">
            <div className="flex items-center space-x-3">
              <span className="text-xs uppercase tracking-wider font-bold text-gray-300 font-sans">
                Higher Timeframe Structure Canvas
              </span>
              <span className="text-[10px] bg-[#CAAA98]/10 text-[#CAAA98] border border-[#CAAA98]/30 font-mono px-2 py-0.5 rounded">
                {currentPair} ({currentTimeframe})
              </span>
            </div>

            {/* Toolbar Buttons matching requirements */}
            <div className="flex items-center space-x-1 sm:space-x-2">
              <button
                id="btn-tool-pointer"
                onClick={() => {
                  setActiveDrawTool(activeDrawTool === 'pointer' ? null : 'pointer');
                  showToast('Pointer/Inspection tool selected. Click points to extract price logs.');
                }}
                className={`p-1.5 rounded-md hover:bg-slate-800 transition-colors cursor-pointer ${
                  activeDrawTool === 'pointer' ? 'bg-[#CAAA98] text-[#111622]' : 'text-gray-400 hover:text-white'
                }`}
                title="Crosshair price cursor"
              >
                <Activity size={14} />
              </button>
              
              <button
                id="btn-tool-trendline"
                onClick={() => {
                  setActiveDrawTool(activeDrawTool === 'trendline' ? null : 'trendline');
                  setClickCoordinates([]);
                  showToast('Click two points on the chart to overlay a manual trendline segment.');
                }}
                className={`p-1.5 rounded-md hover:bg-slate-800 transition-colors cursor-pointer ${
                  activeDrawTool === 'trendline' ? 'bg-[#CAAA98] text-[#111622]' : 'text-gray-400 hover:text-white'
                }`}
                title="Trendline Draw segment"
              >
                <TrendingUp size={14} />
              </button>

              <button
                id="btn-tool-screenshot"
                onClick={() => showToast('Simulating Hi-Res canvas snapshot export to clipboard... Done!')}
                className="p-1.5 rounded-md hover:bg-slate-800 transition-colors text-gray-400 hover:text-white cursor-pointer"
                title="Screenshot Chart"
              >
                <Camera size={14} />
              </button>

              <button
                id="btn-tool-reset"
                onClick={handleResetDrawings}
                className="p-1.5 rounded-md hover:bg-slate-800 transition-colors text-gray-400 hover:text-white cursor-pointer"
                title="Reset Drawings"
              >
                <RotateCcw size={14} />
              </button>

              <div className="h-4 w-[1px] bg-[#2A2E39] mx-1" />

              <button
                id="btn-tool-fullscreen"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1.5 rounded-md hover:bg-slate-800 transition-colors text-gray-400 hover:text-white cursor-pointer"
                title="Toggle Expanded View"
              >
                {isFullscreen ? <Minimize2 size={14} /> : <Fullscreen size={14} />}
              </button>
            </div>
          </div>

          {/* Interactive Chart Canvas (rendered cleanly using beautiful SVG vectors) */}
          <div className="flex-1 w-full bg-[#111622] relative overflow-hidden flex items-stretch">
            {/* Custom SVG Board */}
            <svg 
              ref={chartOuterRef}
              onClick={handleChartClick}
              className={`w-full h-full flex-1 min-h-0 ${activeDrawTool ? 'cursor-radial-cross' : 'cursor-crosshair'}`}
            >
              {/* Horizontal Gridlines */}
              {[40, 110, 180, 250, 320].map((yVal, gridIdx) => (
                <g key={gridIdx}>
                  <line 
                    x1="0" 
                    y1={yVal} 
                    x2="100%" 
                    y2={yVal} 
                    stroke="#1C2230" 
                    strokeWidth="1" 
                    strokeDasharray="4 4" 
                  />
                  {/* Y Axis Prices */}
                  <text 
                    x="100%" 
                    y={yVal - 4} 
                    textAnchor="end" 
                    className="font-mono text-[9px] fill-gray-500 pr-2 select-none"
                    dx="-12"
                  >
                    {priceFormatter(scale.base + (180 - yVal) * (coinStep / 11))}
                  </text>
                </g>
              ))}

              {/* AUTOMATIC COMPREHENSIVE OVERLAYS DESIRED BY PARTS C & D: */}
              
              {/* Order Block Semi-Transparent rectangles */}
              {poiList.filter(p => p.type === 'OB' && p.status === 'Active').map((ob) => (
                <g key={ob.id} 
                   className="transition-opacity duration-200"
                   onMouseEnter={() => setHoveredPoi(ob.id)}
                   onMouseLeave={() => setHoveredPoi(null)}
                >
                  <rect 
                    x="10" 
                    y="185" 
                    width="62%" 
                    height="90" 
                    fill="#26A69A" 
                    fillOpacity="0.15" 
                    stroke="#26A69A" 
                    strokeWidth={hoveredPoi === ob.id ? '2' : '1'}
                    className="transition-all"
                  />
                  <text 
                    x="25" 
                    y="205" 
                    className="font-mono text-[10px] font-bold fill-white select-none pointer-events-none"
                  >
                    {ob.name} H4 (OB) Zone
                  </text>
                  <text 
                    x="25" 
                    y="220" 
                    className="font-mono text-[8px] fill-gray-400 select-none pointer-events-none"
                  >
                    Price: {ob.priceRange}
                  </text>
                </g>
              ))}

              {/* Breaker Block Semi-Transparent rectangles */}
              {poiList.filter(p => p.type === 'BB' && p.status === 'Tested').map((bb) => (
                <g key={bb.id}
                   className="transition-opacity duration-200"
                   onMouseEnter={() => setHoveredPoi(bb.id)}
                   onMouseLeave={() => setHoveredPoi(null)}
                >
                  <rect 
                    x="45%" 
                    y="60" 
                    width="48%" 
                    height="65" 
                    fill="#1565C0" 
                    fillOpacity="0.15" 
                    stroke="#1565C0" 
                    strokeWidth={hoveredPoi === bb.id ? '2' : '1'}
                    className="transition-all"
                  />
                  <text 
                    x="48%" 
                    y="80" 
                    className="font-mono text-[10px] font-bold fill-white select-none pointer-events-none"
                  >
                    {bb.name} (BB) Tested
                  </text>
                </g>
              ))}

              {/* Automated Trendline generated from HLs in our sequence (Active uptrend HL automatic joiner) */}
              <line 
                x1="8%" 
                y1="340" 
                x2="68%" 
                y2="280" 
                stroke="#CAAA98" 
                strokeWidth="2" 
                strokeDasharray="2 2"
                className="animate-pulse"
              />
              <text x="32%" y="325" fill="#CAAA98" className="text-[9px] font-sans italic opacity-80 pointer-events-none select-none">
                HTF Automated Trendline
              </text>

              {/* Manual Drawing Coordinates drawn interactively by clicking */}
              {clickCoordinates.map((coord, index) => (
                <circle 
                  key={index} 
                  cx={coord.x} 
                  cy={coord.y} 
                  r="4" 
                  fill="#CAAA98" 
                  stroke="#111622" 
                  strokeWidth="2.5" 
                />
              ))}

              {/* Manual Drawn Segment connector */}
              {clickCoordinates.length >= 2 && (
                <line 
                  x1={clickCoordinates[0].x} 
                  y1={clickCoordinates[0].y} 
                  x2={clickCoordinates[1].x} 
                  y2={clickCoordinates[1].y} 
                  stroke="#CAAA98" 
                  strokeWidth="1.5" 
                />
              )}

              {/* Candlesticks & Volume rendering loop */}
              {candleArray.map((c, idx) => {
                const totalCandles = candleArray.length;
                const candleWidth = 14;
                const spacing = 18;
                const offsetLeft = 40;
                
                // SVG position transforms
                const x = offsetLeft + idx * (candleWidth + spacing);
                
                // Scale values to fit vertical drawing canvas
                const highY = 240 - (c.high - pivotBase) * (110 / coinStep);
                const lowY = 240 - (c.low - pivotBase) * (110 / coinStep);
                const openY = 240 - (c.open - pivotBase) * (110 / coinStep);
                const closeY = 240 - (c.close - pivotBase) * (110 / coinStep);
                
                const topOb = Math.min(openY, closeY);
                const tallOb = Math.max(1, Math.abs(openY - closeY));
                
                const color = c.isBullish ? '#26A69A' : '#EF5350';

                return (
                  <g key={c.id}>
                    {/* Shadow wick */}
                    <line 
                      x1={x + candleWidth / 2} 
                      y1={highY} 
                      x2={x + candleWidth / 2} 
                      y2={lowY} 
                      stroke={color} 
                      strokeWidth="1.5"
                    />
                    
                    {/* Candle Real Body */}
                    <rect 
                      x={x} 
                      y={topOb} 
                      width={candleWidth} 
                      height={ tallOb } 
                      fill={color} 
                      stroke={color}
                      strokeWidth="1"
                      rx="1"
                    />

                    {/* Volume Histogram block at bottom (20% height mapped) */}
                    <rect 
                      x={x} 
                      y={360 + (80 - c.volume * 0.4)} 
                      width={candleWidth} 
                      height={c.volume * 0.4} 
                      fill={color} 
                      fillOpacity="0.25"
                    />

                    {/* Swing Indicator Labels: HH/HL/LH/LL on key swing points */}
                    {c.label && (
                      <g>
                        {/* Connecting pointer */}
                        <line 
                          x1={x + candleWidth / 2} 
                          y1={c.isBullish ? lowY + 4 : highY - 4} 
                          x2={x + candleWidth / 2} 
                          y2={c.isBullish ? lowY + 14 : highY - 14} 
                          stroke={c.isBullish ? '#26A69A' : '#EF5350'} 
                          strokeWidth="1"
                          strokeDasharray="2 2"
                        />
                        {/* Dynamic Pill Container */}
                        <rect 
                          x={x + candleWidth / 2 - 12} 
                          y={c.isBullish ? lowY + 14 : highY - 26} 
                          width="24" 
                          height="12" 
                          rx="4" 
                          fill={c.isBullish ? '#26A69A' : '#EF5350'} 
                        />
                        <text 
                          x={x + candleWidth / 2} 
                          y={c.isBullish ? lowY + 23 : highY - 17} 
                          textAnchor="middle" 
                          className="font-mono text-[8px] font-bold fill-slate-950 select-none pointer-events-none"
                        >
                          {c.label}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Current Price Dashed line and hovering coordinate tag */}
              <g>
                <line 
                  x1="0" 
                  y1="150" 
                  x2="100%" 
                  y2="150" 
                  stroke="#FFFFFF" 
                  strokeWidth="1" 
                  strokeDasharray="4 2" 
                />
                <rect 
                  x="5" 
                  y="138" 
                  width="110" 
                  height="16" 
                  fill="#1E2433" 
                  stroke="#FFFFFF" 
                  strokeWidth="0.5" 
                  rx="3" 
                />
                <text 
                  x="12" 
                  y="150" 
                  className="font-mono text-[9px] font-bold fill-white animate-pulse"
                >
                  LIVE PRICE: {currencySymbol}{priceFormatter(pivotBase + coinStep * 1.5)}
                </text>
              </g>

            </svg>

            {/* Float visual indicators & controls overlay */}
            <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md p-3.5 rounded border border-[#2A2E39] font-mono text-[10px] text-gray-400 space-y-1 select-none pointer-events-none">
              <div className="text-white font-bold mb-1 opacity-100 flex items-center space-x-1">
                <span>AutoSLP Algos V3.1</span>
              </div>
              <div>BOS Trend Match: <span className="text-[#26A69A]">SMC Uptrend</span></div>
              <div>MSS Swing confirmation: <span className="text-[#26A69A]">Validated</span></div>
              <div>ATR Ratio index: <span className="text-gray-300">1.44 (Low risk)</span></div>
            </div>
          </div>

          {/* Timeframe tabs below the chart matching exact specifications */}
          <div className="p-1 px-4 bg-[#1E2433] border-t border-[#2A2E39] flex items-center justify-between rounded-b-xl shrink-0">
            <div className="flex space-x-2">
              {(['1D', '4H', '1H', '30m', '15m'] as Timeframe[]).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setCurrentTimeframe(tf)}
                  className={`px-3 py-1.5 text-xs font-mono tracking-wider transition-colors cursor-pointer ${
                    currentTimeframe === tf 
                      ? 'text-[#CAAA98] border-b-2 border-[#CAAA98] font-bold' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
            
            <div className="text-[10px] text-gray-500 font-mono flex items-center space-x-4">
              <span>RSI (14): 58.4 &bull; MACD (12, 26): Bull Cross</span>
              <span className="hidden sm:inline">Volume: {isCrypto ? '184.2K BTC' : '422.5M OND'}</span>
            </div>
          </div>
        </section>

        {/* =================================================================
            QUADRANT 2: TRADING PLAN PANEL (Numbered Steps)
            ================================================================= */}
        <section 
          id="quad-2-trading-plan"
          className="bg-[#1A1F2C] border border-[#2A2E39] rounded-xl flex flex-col justify-between h-[520px] overflow-hidden"
        >
          {/* Panel Header */}
          <div className="p-4 bg-[#1E2433] border-b border-[#2A2E39] flex items-center justify-between shrink-0">
            <span className="text-xs uppercase tracking-wider font-bold text-gray-300">
              Daily Trading Plan Rules
            </span>
            <span className="text-[10px] bg-[#26A69A]/10 text-[#26A69A] border border-[#26A69A]/30 px-1.5 py-0.5 rounded font-bold">
              SESSION ACTIVE
            </span>
          </div>

          {/* Steps list container */}
          <div className="flex-1 p-4 overflow-y-auto space-y-2.5">
            {[
              { idx: 1, title: '1. Establish HTF Bias (Daily/4H)', desc: 'Scan daily chart for 2-3 consecutive trends (e.g., HH/HL for Bullish or LH/LL for Bearish).' },
              { idx: 2, title: '2. Plot Unmitigated HTF POIs', desc: 'Mark Daily/4H Order Blocks or Breakers. These are areas where price usually retraces.' },
              { idx: 3, title: '3. Monitor Retracement to POI', desc: 'Wait patiently for price to corrector retrace into unmitigated zone. Avoid chasing premium spikes.' },
              { idx: 4, title: '4. Wait for Lower TF MSS & Inducement', desc: 'Confirm on H1/15m with a Market Structure Shift. Inducement must have a solid BODY CLOSE, no wicks.' },
              { idx: 5, title: '5. Place Entry at LTF POI', desc: 'Set limit setups at nearest unmitigated LTF block aligned strictly with the overall HTF bias.' },
              { idx: 6, title: '6. Target Swing Bounds & DBOS', desc: 'Target next logical HH (bullish) or LL (bearish). Scale-in trailing entries via Double Breaker Steps.' },
            ].map((step, sIdx) => {
              const isDone = stepsCompleted[sIdx];
              return (
                <div 
                  key={step.idx}
                  onClick={() => {
                    const newSteps = [...stepsCompleted];
                    newSteps[sIdx] = !newSteps[sIdx];
                    setStepsCompleted(newSteps);
                    showToast(`Step ${step.idx} compliance toggled!`);
                  }}
                  className={`p-2.5 rounded border transition-colors cursor-pointer flex items-start space-x-3 ${
                    isDone 
                      ? 'bg-[#2A3245]/20 border-emerald-500/30 text-gray-300' 
                      : 'bg-[#141822] border-[#2A2E39] text-gray-400 hover:border-gray-600'
                  }`}
                >
                  {/* Number Circle container */}
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                    isDone ? 'bg-[#26A69A] text-slate-950' : 'bg-[#202940] text-slate-100'
                  }`}>
                    {isDone ? <Check size={10} className="stroke-[3]" /> : step.idx}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className={`text-xs font-bold leading-tight ${isDone ? 'text-gray-200 line-through' : 'text-gray-100'}`}>
                      {step.title}
                    </h4>
                    <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Underlay: Active Signal Card as requested */}
          <div className="p-3 border-t border-[#2A2E39] bg-[#141822] shrink-0">
            <div className="border border-[#26A69A] bg-[#26A69A]/5 rounded-lg p-3 relative overflow-hidden poi-pulse-green">
              {/* Badge label */}
              <div className="absolute top-2 right-2 text-[9px] bg-[#26A69A]/20 text-[#26A69A] px-1.5 py-0.5 rounded font-mono font-bold animate-pulse">
                ACTIVE TRADING SIGNAL
              </div>

              <div className="flex items-center space-x-2">
                <Target size={16} className="text-[#26A69A]" />
                <span className="text-xs font-bold text-gray-200 font-display">POI-1 Long Trigger</span>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-[#26A69A]/25 text-[10px] font-mono">
                <div>
                  <span className="text-gray-500 block text-[9px]">LIMIT ENTRY:</span>
                  <span className="text-[#26A69A] font-bold">{currencySymbol}{signalSpec.entry}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[9px]">STOP LOSS:</span>
                  <span className="text-[#EF5350] font-bold">{currencySymbol}{signalSpec.sl}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[9px]">BIAS / SCALE:</span>
                  <span className="text-emerald-400 font-bold">LONG</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[9px]">CONFIRMATION:</span>
                  <span className="text-gray-300">15m MSS</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[9px]">TARGET 1:</span>
                  <span className="text-[#26A69A]">{currencySymbol}{signalSpec.tp1}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[9px]">REWARD RATIO:</span>
                  <span className="text-[#CAAA98] font-bold">{signalSpec.rr}</span>
                </div>
              </div>

              {/* View Full Setup CTA Click trigger */}
              <button
                _id="cta-view-full-setup"
                onClick={() => showToast(`Trade orders deployed to terminal: Entry ${currencySymbol}${signalSpec.entry}. Verify in Trade Setups screen!`)}
                className="w-full mt-3 bg-[#26A69A] hover:bg-emerald-600 text-[#111622] py-1 px-3 rounded font-bold text-[11px] transition-colors cursor-pointer text-center block uppercase tracking-wider"
              >
                View Full Setup &rarr;
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Grid system block below for Quadrants 3 and 4 */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pb-12">
        {/* =================================================================
            QUADRANT 3: MARKET SUMMARY CORE PANEL
            ================================================================= */}
        <section 
          id="quad-3-market-summary"
          className="md:col-span-5 bg-[#1A1F2C] border border-[#2A2E39] rounded-xl p-5 flex flex-col justify-between h-[360px]"
        >
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#2A2E39]">
              <span className="text-xs uppercase tracking-wider font-bold text-gray-300">
                Market Summary Metrics
              </span>
              <span className="text-[10px] text-gray-500 font-mono">ID: {currentPair}</span>
            </div>

            <div className="space-y-4">
              {/* Bias Row */}
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

              {/* Trend Strength */}
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Order Flow Trend Strength:</span>
                <div className="flex items-center space-x-1.5 text-gray-200">
                  <span className="w-2 h-2 rounded-full bg-[#26A69A] animate-ping" />
                  <span className="font-semibold text-emerald-400">Strong Momentum</span>
                </div>
              </div>

              {/* Structural Frame */}
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Market Structure State:</span>
                <span className="text-[#CAAA98] font-mono font-bold">Higher Highs / Higher Lows</span>
              </div>

              {/* Current Cycle Phase */}
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Current Swing Cycle Phase:</span>
                <span className="text-gray-200 bg-slate-800 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider">
                  Impulse Leg expansion
                </span>
              </div>

              {/* Expected Extension */}
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Next Expected Market structural Shift:</span>
                <span className="text-[#26A69A] font-semibold text-right">Expansion Continuation High (HH)</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Legend Map as requested */}
            <div className="p-3 bg-[#111622] rounded border border-[#2A2E39] text-[10px]">
              <span className="text-gray-500 uppercase tracking-wider block mb-1 font-mono">SMC Legend Map</span>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-[#26A69A]" />
                  <span className="text-gray-300 font-semibold">OB (Order Block)</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-[#1565C0]" />
                  <span className="text-gray-300 font-semibold">BB (Breaker Block)</span>
                </div>
              </div>
            </div>

            {/* Italic warning disclaimer footer text */}
            <p className="text-[11px] italic text-[#9AA3B2] leading-snug">
              "Trade only in alignment with the high timeframe bias. Avoid highly speculative counter-trend setups under premium zones."
            </p>
          </div>
        </section>

        {/* =================================================================
            QUADRANT 4: HTF POI MAP & RECENT COMPLETED SIGNALS WIDGETS
            ================================================================= */}
        <div id="quad-4-double-panels" className="md:col-span-7 bg-[#1A1F2C] border border-[#2A2E39] rounded-xl grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[#2A2E39] h-[360px] overflow-hidden">
          
          {/* LEFT SUB-PANEL: HIGHER TIMEFRAME POI MAP */}
          <div className="p-4 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-200">
                  Higher Timeframe POI Map
                </h3>
                {/* Outlined Add button trigger */}
                <button
                  id="btn-add-poi-modal"
                  onClick={() => setShowAddPoiModal(true)}
                  className="flex items-center space-x-1 border border-[#CAAA98]/40 hover:bg-[#CAAA98]/10 text-[#CAAA98] px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer transition-colors"
                >
                  <Plus size={10} />
                  <span>Add POI</span>
                </button>
              </div>

              {/* Rows matching requested attributes */}
              <div className="space-y-1 overflow-y-auto max-h-[220px] pr-1">
                {poiList.map((poi) => (
                  <div
                    key={poi.id}
                    onMouseEnter={() => setHoveredPoi(poi.id)}
                    onMouseLeave={() => setHoveredPoi(null)}
                    className="flex items-center justify-between p-2 rounded hover:bg-[#1C2230] transition-colors group relative border border-transparent hover:border-[#2A2E39]"
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
                      
                      {/* Delete zone icon */}
                      <button 
                        onClick={() => handleDeletePoi(poi.id, poi.name)}
                        className="text-gray-500 hover:text-[#EF5350] p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="Remove Zone"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-[10px] text-gray-500 font-mono pt-3 border-t border-[#2A2E39]">
              HTF Level Align: {poiList.filter(p => p.status === 'Active').length} Active structural OB Blocks
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

              {/* Past signal logs */}
              <div className="space-y-1 overflow-y-auto max-h-[220px]">
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
            </div>

            <div className="text-[10px] text-gray-500 font-mono pt-3 border-t border-[#2A2E39] flex justify-between">
              <span>Avg RR Expected: 1:3.1</span>
              <span className="text-[#26A69A]">Winrate: 74%</span>
            </div>
          </div>

        </div>
      </div>

      {/* =================================================================
          MODAL: ADD NEW POINT OF INTEREST FORM (Interactive chart overlay injection)
          ================================================================= */}
      {showAddPoiModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#1A1F2C] border border-[#2A2E39] rounded-xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-4 bg-[#1E2433] border-b border-[#2A2E39] flex justify-between items-center">
              <span className="text-xs uppercase tracking-wider font-bold text-gray-200 font-display">
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
              {/* Name */}
              <div>
                <label className="block text-gray-500 font-mono mb-1 uppercase text-[9px]">POI Label:</label>
                <input
                  type="text"
                  required
                  value={newPoiName}
                  onChange={(e) => setNewPoiName(e.target.value)}
                  className="w-full bg-[#111622] border border-[#2A2E39] p-2 rounded text-xs px-3 focus:outline-none focus:border-[#CAAA98]"
                />
              </div>

              {/* Type OB or BB */}
              <div>
                <label className="block text-gray-500 font-mono mb-1 uppercase text-[9px]">SMC Block Type:</label>
                <div className="flex bg-[#111622] p-1 rounded-sm border border-[#2A2E39]">
                  <button
                    type="button"
                    onClick={() => {
                      setNewPoiType('OB');
                      setNewPoiName('POI - Custom OB');
                    }}
                    className={`flex-1 py-1.5 rounded transition-colors uppercase font-bold text-[10px] tracking-wider ${
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
                    className={`flex-1 py-1.5 rounded transition-colors uppercase font-bold text-[10px] tracking-wider ${
                      newPoiType === 'BB' ? 'bg-[#1565C0]/25 text-[#1565C0]' : 'text-gray-400'
                    }`}
                  >
                    Breaker Block (BB)
                  </button>
                </div>
              </div>

              {/* Price Limits */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-500 font-mono mb-1 uppercase text-[9px]">Floor Price ({currentPair}):</label>
                  <input
                    type="text"
                    required
                    value={newPoiMin}
                    onChange={(e) => setNewPoiMin(e.target.value)}
                    className="w-full bg-[#111622] border border-[#2A2E39] p-2 rounded text-xs px-3 font-mono focus:outline-none focus:border-[#CAAA98]"
                  />
                </div>
                <div>
                  <label className="block text-gray-500 font-mono mb-1 uppercase text-[9px]">Ceiling Price ({currentPair}):</label>
                  <input
                    type="text"
                    required
                    value={newPoiMax}
                    onChange={(e) => setNewPoiMax(e.target.value)}
                    className="w-full bg-[#111622] border border-[#2A2E39] p-2 rounded text-xs px-3 font-mono focus:outline-none focus:border-[#CAAA98]"
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

// Simple absolute SVG helper
function X({ size }: { size: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}
