import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Trash2, 
  Fullscreen, 
  Maximize2, 
  Minimize2, 
  Camera, 
  RotateCcw, 
  Activity, 
  TrendingUp,
  X,
  Settings
} from 'lucide-react';
import { CurrencyPair, Timeframe, POI } from '../types';
import CandlestickChart from './chart/CandlestickChart';
import TradingViewWidget from './chart/TradingViewWidget';
import ChartSettingsPanel from './chart/ChartSettingsPanel';
import { useMarketStore } from '../store/useMarketStore';

interface DashboardChartProps {
  currentPair: CurrencyPair;
  currentTimeframe: Timeframe;
  setCurrentTimeframe: (tf: Timeframe) => void;
  scale: { base: number; tick: number };
  coinStep: number;
  pivotBase: number;
  poiList: POI[];
  activeDrawTool: string | null;
  setActiveDrawTool: (tool: string | null) => void;
  clickCoordinates: { x: number; y: number }[];
  setClickCoordinates: React.Dispatch<React.SetStateAction<{ x: number; y: number }[]>>;
  showToast: (msg: string) => void;
  isFullscreen: boolean;
  setIsFullscreen: (v: boolean) => void;
  appStateMode: string;
}

export default function DashboardChart({
  currentPair,
  currentTimeframe,
  setCurrentTimeframe,
  scale,
  coinStep,
  pivotBase,
  poiList,
  activeDrawTool,
  setActiveDrawTool,
  clickCoordinates,
  setClickCoordinates,
  showToast,
  isFullscreen,
  setIsFullscreen,
  appStateMode
}: DashboardChartProps) {
  const [mouseX, setMouseX] = useState<number | null>(null);
  const [mouseY, setMouseY] = useState<number | null>(null);
  const [hoveredCandle, setHoveredCandle] = useState<any>(null);
  const [hoveredCandleIndex, setHoveredCandleIndex] = useState<number | null>(null);
  const [hoveredPoi, setHoveredPoi] = useState<string | null>(null);
  const [chartViewMode, setChartViewMode] = useState<'live' | 'tradingview'>('live');
  const [showSettings, setShowSettings] = useState(false);

  const handleCloseSettings = useCallback(() => {
    setShowSettings(false);
  }, []);

  const chartOuterRef = useRef<SVGSVGElement | null>(null);
  const ticker = useMarketStore(state => state.ticker);

  const isCrypto = currentPair.includes('USDT');
  const currencySymbol = isCrypto ? '$' : '';
  const priceFormatter = (val: number) => {
    return isCrypto 
      ? val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
      : val.toFixed(4);
  };
  
  const realPrice = ticker?.price || (pivotBase + coinStep * 1.5);

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

  const handleChartClick = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!activeDrawTool) return;
    if (chartOuterRef.current) {
      const rect = chartOuterRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      if (activeDrawTool === 'pointer') {
         showToast(`Coordinate captured at price level: ${(pivotBase + (100 - (y-60)/2.5) * (coinStep / 4)).toLocaleString(undefined, { maximumFractionDigits: 2 })}`);
         return;
      }
      
      setClickCoordinates(prev => [...prev, { x, y }]);
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

  return (
    <section 
      id="quad-1-chart-area"
      className={`bg-[#1A1F2C] border border-[#2A2E39] rounded-xl flex flex-col justify-between relative transition-all duration-300 w-full ${
        isFullscreen ? 'h-[80vh]' : 'h-[520px]'
      }`}
    >
      <div className="p-4 bg-[#1E2433] border-b border-[#2A2E39] flex items-center justify-between rounded-t-xl shrink-0 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center space-x-2.5">
            <span className="text-xs uppercase tracking-wider font-bold text-gray-300 font-sans">
              Market Structure Chart
            </span>
            <span className="text-[10px] bg-[#CAAA98]/10 text-[#CAAA98] border border-[#CAAA98]/30 font-mono px-2 py-0.5 rounded">
              {currentPair} ({currentTimeframe})
            </span>
          </div>

          <div className="flex bg-[#111622] p-0.5 rounded border border-[#2D3345] text-[10px] h-fit md:-my-1">
            <button
              onClick={() => {
                setChartViewMode('live');
                showToast('Switched to Local SLP Engine Analysis');
              }}
              className={`px-3 py-1 rounded transition-all font-semibold cursor-pointer ${
                chartViewMode === 'live' 
                  ? 'bg-[#CAAA98] text-slate-950 font-bold' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              SLP Engine
            </button>
            <button
              onClick={() => {
                setChartViewMode('tradingview');
                showToast('Switched to Official Real-Time TradingView Chart');
              }}
              className={`px-3 py-1 rounded transition-all font-semibold cursor-pointer ${
                chartViewMode === 'tradingview' 
                  ? 'bg-[#CAAA98] text-slate-950 font-bold' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              TradingView Chart
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-1 sm:space-x-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              showSettings ? 'bg-[#CAAA98] text-[#111622]' : 'text-gray-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Chart Settings"
          >
            <Settings size={14} />
          </button>

          <button
            id="btn-tool-fullscreen"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-md hover:bg-slate-800 transition-colors text-gray-400 hover:text-white cursor-pointer"
            title="Toggle Expanded View"
          >
            {isFullscreen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14h6v6"/><path d="M20 10h-6V4"/><path d="M14 10l7-7"/><path d="M10 14l-7 7"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
            )}
          </button>
        </div>
      </div>

      <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden">
        {showSettings && <ChartSettingsPanel onClose={handleCloseSettings} />}
        {chartViewMode === 'live' ? (
          <div className="w-full flex-1 flex min-h-0">
            <CandlestickChart height={isFullscreen ? 800 : 400} />
          </div>
        ) : (
          <div className="w-full flex-1 flex min-h-0">
            <TradingViewWidget 
              symbol={currentPair} 
              timeframe={currentTimeframe} 
              height={isFullscreen ? 800 : 400} 
            />
          </div>
        )}

        {/* Disabled fallback SVG canvas */}
        {false && (
          <svg 
            ref={chartOuterRef}
          onClick={handleChartClick}
          onMouseMove={(e) => {
            if (chartOuterRef.current) {
              const rect = chartOuterRef.current.getBoundingClientRect();
              const currX = e.clientX - rect.left;
              const currY = e.clientY - rect.top;
              
              setMouseX(currX);
              setMouseY(currY);
              
              const offsetLeft = 40;
              const step = 32; 
              const idx = Math.round((currX - offsetLeft - 7) / step);
              if (idx >= 0 && idx < candleArray.length && currX >= offsetLeft - 5) {
                setHoveredCandleIndex(idx);
                setHoveredCandle(candleArray[idx]);
              } else {
                setHoveredCandleIndex(null);
                setHoveredCandle(null);
              }
            }
          }}
          onMouseLeave={() => {
            setMouseX(null);
            setMouseY(null);
            setHoveredCandleIndex(null);
            setHoveredCandle(null);
          }}
          className="w-full flex-1 min-h-[340px] cursor-crosshair bg-[#141822]/80 relative"
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
              <text 
                x="100%" 
                y={yVal - 4} 
                textAnchor="end" 
                className="font-mono text-[9px] fill-gray-500 pr-2 select-none"
                dx="-12"
              >
                {priceFormatter(scale.base + (180 - yVal) * (scale.tick / 16 / 11))}
              </text>
            </g>
          ))}

          {/* Order Blocks */}
          {(appStateMode !== 'empty' && Array.isArray(poiList)) && poiList.filter(p => p.type === 'OB' && p.status === 'Active').map((ob) => (
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
                x="20" 
                y="200" 
                className="font-mono text-[9px] fill-[#26A69A] font-bold tracking-wider select-none opacity-80"
              >
                {ob.name} ZONE (HTF ORDER BLOCK)
              </text>
            </g>
          ))}

          {/* Breaker OB Blocks */}
          {(appStateMode !== 'empty' && Array.isArray(poiList)) && poiList.filter(p => p.type === 'BB').map((bb) => (
            <g key={bb.id}
               className="transition-opacity duration-200"
               onMouseEnter={() => setHoveredPoi(bb.id)}
               onMouseLeave={() => setHoveredPoi(null)}
            >
              <rect 
                x="45%" 
                y="60" 
                width="50%" 
                height="65" 
                fill="#1565C0" 
                fillOpacity="0.12" 
                stroke="#1565C0" 
                strokeWidth={hoveredPoi === bb.id ? '2' : '1'}
                strokeDasharray="2 2"
                className="transition-all"
              />
              <text 
                x="48%" 
                y="75" 
                className="font-mono text-[9px] fill-[#42A5F5] font-bold tracking-wider select-none opacity-80"
              >
                {bb.name} CORRIDOR (BB LEVEL)
              </text>
            </g>
          ))}

          {/* Captured clicks */}
          {clickCoordinates.map((coord, cIdx) => (
            <circle 
              key={cIdx} 
              cx={coord.x} 
              cy={coord.y} 
              r="3.5" 
              fill="#CAAA98" 
              stroke="#1E2433" 
              strokeWidth="1.5"
              className="animate-pulse"
            />
          ))}

          {/* Manual segments */}
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

          {/* SLP Overlays */}
          <g>
            {/* BOS Line (Break of Structure from Candle 3 to 10) */}
            <line x1="110" y1="150" x2="330" y2="150" stroke="#26A69A" strokeWidth="1" strokeDasharray="3 2" />
            <text x="220" y="146" textAnchor="middle" className="font-mono text-[9px] fill-[#26A69A] font-bold select-none">BOS ↑</text>

            {/* MSS (Market Structure Shift from Candle 6 dropping below Candle 5) */}
            <line x1="200" y1="225" x2="260" y2="225" stroke="#CAAA98" strokeWidth="1" strokeDasharray="4 2" />
            <text x="230" y="221" textAnchor="middle" className="font-mono text-[9px] fill-[#CAAA98] font-bold select-none">MSS ↓</text>

            {/* Order Block (OB at bottom of Candle 1) */}
            <rect x="40" y="255" width="28" height="20" fill="#26A69A" fillOpacity="0.2" stroke="#26A69A" strokeWidth="1" />
            <text x="54" y="270" textAnchor="middle" className="font-mono text-[8px] fill-[#26A69A] font-bold pointer-events-none">OB</text>

            {/* Breaker Block (BB at Candle 6 drop) */}
            <rect x="230" y="165" width="28" height="20" fill="#1565C0" fillOpacity="0.2" stroke="#1565C0" strokeWidth="1" strokeDasharray="1 1" />
            <text x="244" y="180" textAnchor="middle" className="font-mono text-[8px] fill-[#42A5F5] font-bold pointer-events-none">BB</text>

            {/* Liquidity Sweep (BSL at Candle 10) */}
            <line x1="320" y1="120" x2="350" y2="120" stroke="#F0B90B" strokeWidth="1.5" strokeDasharray="1 1" />
            <text x="335" y="115" textAnchor="middle" className="font-mono text-[9px] fill-[#F0B90B] font-bold">BSL</text>
          </g>

          {/* Candlesticks loop */}
          {candleArray.map((c, idx) => {
            const candleWidth = 14;
            const spacing = 18;
            const offsetLeft = 40;
            const x = offsetLeft + idx * (candleWidth + spacing);
            
            const highY = 240 - (c.high - pivotBase) * (15 / coinStep);
            const lowY = 240 - (c.low - pivotBase) * (15 / coinStep);
            const openY = 240 - (c.open - pivotBase) * (15 / coinStep);
            const closeY = 240 - (c.close - pivotBase) * (15 / coinStep);
            
            const topOb = Math.min(openY, closeY);
            const tallOb = Math.max(1, Math.abs(openY - closeY));
            const color = c.isBullish ? '#26A69A' : '#EF5350';

            return (
              <g key={c.id}>
                <line 
                  x1={x + candleWidth / 2} 
                  y1={highY} 
                  x2={x + candleWidth / 2} 
                  y2={lowY} 
                  stroke={color} 
                  strokeWidth="1.5"
                />
                <rect 
                  x={x} 
                  y={topOb} 
                  width={candleWidth} 
                  height={tallOb} 
                  fill={color} 
                  stroke={color}
                  strokeWidth="1"
                  rx="1"
                />
                <rect 
                  x={x} 
                  y={320 + (50 - c.volume * 0.25)} 
                  width={candleWidth} 
                  height={c.volume * 0.25} 
                  fill={color} 
                  fillOpacity="0.25"
                />

                {c.label && (
                  <g>
                    <line 
                      x1={x + candleWidth / 2} 
                      y1={c.isBullish ? lowY + 4 : highY - 4} 
                      x2={x + candleWidth / 2} 
                      y2={c.isBullish ? lowY + 14 : highY - 14} 
                      stroke={c.isBullish ? '#26A69A' : '#EF5350'} 
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
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
              LIVE PRICE: {currencySymbol}{priceFormatter(realPrice)}
            </text>
          </g>

          {/* Crosshairs */}
          {hoveredCandleIndex !== null && mouseX !== null && (
            <g>
              <line 
                x1={40 + hoveredCandleIndex * 32 + 7}
                y1="0"
                x2={40 + hoveredCandleIndex * 32 + 7}
                y2="340"
                stroke="#CAAA98"
                strokeWidth="0.75"
                strokeDasharray="3 3"
                opacity="0.7"
              />
              {mouseY !== null && (
                <line 
                  x1="0"
                  y1={mouseY}
                  x2="100%"
                  y2={mouseY}
                  stroke="#CAAA98"
                  strokeWidth="0.75"
                  strokeDasharray="3 3"
                  opacity="0.7"
                />
              )}
            </g>
          )}
        </svg>
        )}

        {/* Tooltip */}
        {(chartViewMode as any) === 'drawing' && hoveredCandle && mouseX !== null && (
          <div 
            style={{
              top: Math.min(mouseY ? mouseY + 12 : 60, 160),
              left: mouseX < 260 ? mouseX + 16 : mouseX - 190
            }}
            className="absolute bg-[#1A1F2C]/95 backdrop-blur-md border border-[#CAAA98] p-3 rounded-lg shadow-2xl text-[9px] font-mono text-gray-300 w-[180px] pointer-events-none z-30 space-y-1.5 animate-fadeIn"
          >
            <div className="flex border-b border-[#2A2E39] pb-1 uppercase font-bold text-slate-100 justify-between">
              <span>CANDLE #{hoveredCandle.id}</span>
              <span className={hoveredCandle.type !== 'normal' ? 'text-[#CAAA98] font-bold' : 'text-gray-500'}>
                {hoveredCandle.type.toUpperCase()}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-x-2 text-[9px]">
              <div>OPEN: <span className="text-gray-200 block font-semibold">{currencySymbol}{priceFormatter(hoveredCandle.open)}</span></div>
              <div>CLOSE: <span className="text-gray-200 block font-semibold">{currencySymbol}{priceFormatter(hoveredCandle.close)}</span></div>
              <div className="mt-1">HIGH: <span className="text-emerald-400 block font-semibold">{currencySymbol}{priceFormatter(hoveredCandle.high)}</span></div>
              <div className="mt-1">LOW: <span className="text-red-400 block font-semibold">{currencySymbol}{priceFormatter(hoveredCandle.low)}</span></div>
            </div>

            <div className="border-t border-[#2A2E39]/60 pt-1.5 flex items-center justify-between">
              <span>VOLUME:</span>
              <span className="text-gray-200 font-bold">{(hoveredCandle.volume * 1000).toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between">
              <span>% MOVE:</span>
              {(() => {
                const change = ((hoveredCandle.close - hoveredCandle.open) / hoveredCandle.open) * 100;
                return (
                  <span className={`font-bold ${change >= 0 ? 'text-[#26A69A]' : 'text-[#EF5350]'}`}>
                    {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                  </span>
                );
              })()}
            </div>

            <div className="text-[8px] text-gray-500 italic pt-1 border-t border-[#2A2E39]/40">
              Time since open: {
                currentTimeframe === '1D' ? '14h 23m' :
                currentTimeframe === '4H' ? '2h 14m' :
                currentTimeframe === '1H' ? '41m 12s' :
                currentTimeframe === '30m' ? '18m 05s' :
                currentTimeframe === '15m' ? '9m 40s' : '2m 15s'
              }
            </div>
          </div>
        )}

        {(chartViewMode as any) === 'drawing' && (
          <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md p-3 rounded border border-[#2A2E39] font-mono text-[10px] text-gray-400 space-y-1 select-none pointer-events-none">
            <div className="text-white font-bold mb-1 opacity-100 flex items-center space-x-1">
              <span>AutoSLP Algos V3.1</span>
            </div>
            <div>BOS Match: <span className="text-[#26A69A]">SLP Uptrend</span></div>
            <div>Swing Confirmation: <span className="text-[#26A69A]">Validated</span></div>
          </div>
        )}
      </div>

      <div className="p-1 px-4 bg-[#1E2433] border-t border-[#2A2E39] flex items-center justify-between rounded-b-xl shrink-0">
        <div className="flex space-x-2">
          {(['1D', '4H', '1H', '30m', '15m', '5m'] as Timeframe[]).map((tf) => (
            <button
              key={tf}
              onClick={() => setCurrentTimeframe(tf)}
              className={`px-3 py-1.5 text-xs font-mono tracking-wider transition-colors cursor-pointer ${
                currentTimeframe === tf 
                  ? 'text-[#CAAA98]' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
        <div className="text-[10px] text-gray-500 font-mono hidden sm:inline">
          RSI: 58.4 &bull; MACD: Bull Cross
        </div>
      </div>
    </section>
  );
}
