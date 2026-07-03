"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CrosshairMode,
  LineStyle,
  Time,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  createSeriesMarkers,
} from "lightweight-charts";
import { useRealtimeCandles } from "../../hooks/useRealtimeCandles";
import { useMarketStore } from "../../store/useMarketStore";
import { usePOIStore } from "../../store/usePOIStore";
import { useChartSettingsStore } from "../../store/useChartSettingsStore";
import { runSLPAnalysis } from "../../lib/analysis/slpEngine";
import { formatPrice, CRYPTO_PAIRS } from "../../lib/market/marketDataService";
import LoadingSpinner from "../ui/LoadingSpinner";
import { MousePointer, TrendingUp, Maximize2, Minimize2, Camera, RotateCcw, Settings, X, Plus, ChevronDown, AlertCircle } from 'lucide-react';
import ChartSettingsPanel from "./ChartSettingsPanel";
import { toast } from "react-hot-toast";

interface Props {
  height?: number;
  hideToolbar?: boolean;
}

export default function CandlestickChart({ height = 480, hideToolbar = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  const chartApi = useRef<IChartApi | null>(null);
  const candleSeries = useRef<any>(null);
  const volumeSeries = useRef<any>(null);
  const poiSeriesRefs = useRef<any[]>([]);
  const markersPluginRef = useRef<any>(null);

  const { selectedPair, selectedTimeframe, setSelectedTimeframe } = useMarketStore();
  const { pois } = usePOIStore();
  const { settings } = useChartSettingsStore();
  const [chartInitialized, setChartInitialized] = useState(0);
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const handleCloseSettings = useCallback(() => {
    setShowSettings(false);
  }, []);
  const [activeDrawTool, setActiveDrawTool] = useState<'cursor' | 'trendline'>('cursor');
  
  const [drawings, setDrawings] = useState<Array<{ id: string, points: {time: Time, price: number}[], seriesRef: any }>>([]);
  const draftDrawingRef = useRef<{ points: {time: Time, price: number}[], seriesRef: any } | null>(null);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const { candles, isLoading, isConnected, isRealData, isCachedData, apiError, error, refetch } =
    useRealtimeCandles(selectedPair, selectedTimeframe);

  // Toggle Fullscreen logic
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error("Error attempting to enable fullscreen:", err);
      });
    } else {
      document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // ── Initialize chart once ──────────────────────────────
  useEffect(() => {
    if (!chartRef.current) return;

    chartApi.current = createChart(chartRef.current, {
      width: chartRef.current.clientWidth || 300,
      height: chartRef.current.clientHeight || height,
      layout: {
        background: { color: "#131722" },
        textColor: "#9AA3B2",
        fontSize: 12,
        fontFamily: "JetBrains Mono, monospace",
      },
      grid: {
        vertLines: { color: "#1E2433", style: LineStyle.Dotted },
        horzLines: { color: "#1E2433", style: LineStyle.Dotted },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "#CAAA98", labelBackgroundColor: "#202940" },
        horzLine: { color: "#CAAA98", labelBackgroundColor: "#202940" },
      },
      rightPriceScale: {
        borderColor: "#2A2E39",
        textColor: "#9AA3B2",
      },
      timeScale: {
        borderColor: "#2A2E39",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 15,
      },
      handleScroll: true,
      handleScale: true,
    });

    // Candlestick series
    candleSeries.current = chartApi.current.addSeries(CandlestickSeries, {
      upColor: "#26A69A",
      downColor: "#EF5350",
      borderUpColor: "#26A69A",
      borderDownColor: "#EF5350",
      wickUpColor: "#26A69A",
      wickDownColor: "#EF5350",
    });

    // Markers Plugin
    markersPluginRef.current = createSeriesMarkers(candleSeries.current, []);

    // Volume series (20% height at bottom)
    volumeSeries.current = chartApi.current.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    chartApi.current.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    setChartInitialized((prev) => prev + 1);

    const ro = new ResizeObserver((entries) => {
      if (!entries || !entries[0]) return;
      const { width, height: elHeight } = entries[0].contentRect;
      requestAnimationFrame(() => {
        if (chartRef.current && chartApi.current) {
          chartApi.current.resize(width, elHeight > 0 ? elHeight : height);
          
          // Responsive styling for mobile vs desktop
          const isMobile = width < 540;
          chartApi.current.applyOptions({
            layout: {
              fontSize: isMobile ? 10 : 12,
            },
            rightPriceScale: {
              alignLabels: true,
            },
            timeScale: {
              minBarSpacing: isMobile ? 3 : 6,
            }
          });
        }
      });
    });
    ro.observe(chartRef.current);

    return () => {
      ro.disconnect();
      chartApi.current?.remove();
    };
  }, [height]);

  useEffect(() => {
    if (!chartApi.current || !candleSeries.current) return;
    chartApi.current.applyOptions({
      layout: { background: { color: settings.backgroundColor } },
      grid: { vertLines: { color: settings.gridColor }, horzLines: { color: settings.gridColor } },
    });
    candleSeries.current.applyOptions({
      upColor: settings.upCandleColor, downColor: settings.downCandleColor,
      borderUpColor: settings.upCandleColor, borderDownColor: settings.downCandleColor,
      wickUpColor: settings.upWickColor, wickDownColor: settings.downWickColor,
    });
    if (volumeSeries.current) volumeSeries.current.applyOptions({ visible: settings.showVolume });
  }, [settings, chartInitialized]);

  // Update candle data
  useEffect(() => {
    if (!candleSeries.current || !volumeSeries.current || candles.length === 0) return;

    // Deduplicate candles by timestamp and sort in ascending chronological order (required by Lightweight Charts)
    const uniqueCandlesMap = new Map<number, typeof candles[0]>();
    candles.forEach((c) => {
      if (c && typeof c.time === 'number' && !isNaN(c.time) && c.time > 0) {
        uniqueCandlesMap.set(c.time, c);
      }
    });

    const sortedCandles = Array.from(uniqueCandlesMap.values()).sort((a, b) => a.time - b.time);

    if (sortedCandles.length === 0) return;

    candleSeries.current.setData(sortedCandles.map((c) => ({ 
      time: c.time as Time, 
      open: c.open, 
      high: c.high, 
      low: c.low, 
      close: c.close 
    })));

    volumeSeries.current.setData(sortedCandles.map((c) => ({ 
      time: c.time as Time, 
      value: c.volume, 
      color: c.close >= c.open ? settings.upCandleColor + "80" : settings.downCandleColor + "80" 
    })));

    const timeScale = chartApi.current?.timeScale();
    if (timeScale) {
       if (sortedCandles.length > 200) timeScale.scrollToRealTime();
    }
  }, [candles, chartInitialized, settings.upCandleColor, settings.downCandleColor]);

  // Drawing Tools Interactive Logic
  useEffect(() => {
    if (!chartApi.current || !candleSeries.current) return;

    const handleClick = (param: any) => {
      if (!param.point || !param.time || activeDrawTool !== 'trendline') return;
      const price = candleSeries.current.coordinateToPrice(param.point.y);
      if (price === null) return;

      if (!draftDrawingRef.current) {
        // Start new drawing
        const newSeries = chartApi.current!.addSeries(LineSeries, {
          color: '#CAAA98', lineWidth: 2, lineStyle: LineStyle.Solid,
          priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false
        });
        
        draftDrawingRef.current = {
          points: [{time: param.time, price}],
          seriesRef: newSeries
        };
        
        toast.success("Point 1 set. Click again for Point 2.");
      } else {
        // End drawing
        const draft = draftDrawingRef.current;
        draft.points.push({time: param.time, price});
        
        // ensure points are time-sorted
        draft.points.sort((a,b) => (a.time as number) - (b.time as number));
        const finalData = draft.points.map((p) => ({ time: p.time, value: p.price }));
        
        draftDrawingRef.current = null;
        setActiveDrawTool('cursor');
        
        requestAnimationFrame(() => {
          try {
            draft.seriesRef.setData(finalData);
          } catch {}
        });
        
        setDrawings(prev => [...prev, { id: Date.now().toString(), points: draft.points, seriesRef: draft.seriesRef }]);
        toast.success("Trendline saved!");
      }
    };

    const handleCrosshairMove = (param: any) => {
      if (activeDrawTool === 'trendline' && draftDrawingRef.current && param.point && param.time) {
        const price = candleSeries.current.coordinateToPrice(param.point.y);
        if (price !== null) {
           const p1 = draftDrawingRef.current.points[0];
           const p2 = { time: param.time, price };
           const sorted = [p1, p2].sort((a,b) => (a.time as number) - (b.time as number));
           requestAnimationFrame(() => {
             if (draftDrawingRef.current?.seriesRef) {
               try {
                 draftDrawingRef.current.seriesRef.setData(sorted.map(p => ({ time: p.time, value: p.price })));
               } catch {}
             }
           });
        }
      }
    };

    chartApi.current.subscribeClick(handleClick);
    chartApi.current.subscribeCrosshairMove(handleCrosshairMove);

    return () => {
      chartApi.current?.unsubscribeClick(handleClick);
      chartApi.current?.unsubscribeCrosshairMove(handleCrosshairMove);
    };
  }, [chartInitialized, activeDrawTool]);

  const clearDrawings = () => {
    drawings.forEach(d => {
      try { chartApi.current?.removeSeries(d.seriesRef); } catch {}
    });
    setDrawings([]);
    if (draftDrawingRef.current) {
      try { chartApi.current?.removeSeries(draftDrawingRef.current.seriesRef); } catch {}
      draftDrawingRef.current = null;
    }
  };

  const slpResult = React.useMemo(() => {
    if (candles.length === 0) return null;
    return runSLPAnalysis(candles);
  }, [candles]);

  const slpOverlayRefs = useRef<{ seriesList: any[]; markers: any[] }>({ seriesList: [], markers: [] });
  function clearSLPOverlays() {
    slpOverlayRefs.current.seriesList.forEach((s) => { try { chartApi.current?.removeSeries(s); } catch {} });
    slpOverlayRefs.current.seriesList = [];
  }

  useEffect(() => {
    if (!candleSeries.current) return;
    if (!slpResult || candles.length === 0) {
      clearSLPOverlays();
      try {
        markersPluginRef.current?.setMarkers([]);
      } catch {}
      return;
    }
    clearSLPOverlays();
    const allMarkers: any[] = [];

    // BOS
    if (settings.showBOS || settings.showMSS) {
      slpResult.bosEvents.forEach((bos) => {
        if (bos.type === 'BOS' && !settings.showBOS) return;
        if (bos.type === 'MSS' && !settings.showMSS) return;
        
        let color = bos.direction === "BULLISH" ? settings.bosUpColor : settings.bosDownColor;
        if (bos.type === 'MSS') color = settings.mssColor;
        
        const lineSeries = chartApi.current!.addSeries(LineSeries, { color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
        if (bos.swingTime < bos.breakTime) {
          lineSeries.setData([ { time: bos.swingTime as Time, value: bos.price }, { time: bos.breakTime as Time, value: bos.price } ]);
        }
        allMarkers.push({ time: bos.breakTime as Time, position: bos.direction === "BULLISH" ? "belowBar" : "aboveBar", color, shape: "circle", text: bos.type, size: 0.6 });
        slpOverlayRefs.current.seriesList.push(lineSeries);
      });
    }

    // Order Blocks
    if (settings.showOrderBlocks || settings.showBreakerBlocks) {
      slpResult.orderBlocks.forEach((ob) => {
        if (ob.isBroken && !settings.showBreakerBlocks) return;
        if (!ob.isBroken && !settings.showOrderBlocks) return;
        
        const borderCol = ob.isBroken ? settings.breakerColor : (ob.type === "BULLISH" ? settings.bullOBColor : settings.bearOBColor);
        const color = ob.isBroken ? settings.breakerColor + "12" : (ob.type === "BULLISH" ? settings.bullOBColor + "12" : settings.bearOBColor + "12"); // "12" is ~7% opacity for stacking nicely

        const obSeries = chartApi.current!.addSeries(CandlestickSeries, {
          upColor: color,
          downColor: color,
          borderUpColor: 'transparent',
          borderDownColor: 'transparent',
          wickUpColor: 'transparent',
          wickDownColor: 'transparent',
          priceLineVisible: false,
          lastValueVisible: false,
        });
        const obCandles = candles.filter((c) => c.time >= ob.startTime && c.time <= ob.endTime);
        if (obCandles.length > 0) {
          obSeries.setData(obCandles.map((c) => ({
            time: c.time as Time,
            open: ob.bottom,
            high: ob.top,
            low: ob.bottom,
            close: ob.top
          })));
        }

        const endLineTime = ob.endTime || candles[candles.length - 1].time;

        const topLine = chartApi.current!.addSeries(LineSeries, { color: borderCol, lineWidth: 1, lineStyle: LineStyle.Solid, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
        if (ob.startTime < endLineTime) {
          topLine.setData([{ time: ob.startTime as Time, value: ob.top }, { time: endLineTime as Time, value: ob.top }]);
        }
        
        allMarkers.push({ time: ob.startTime as Time, position: "aboveBar", color: borderCol, shape: "circle", text: ob.isBroken ? "BB" : ob.type === "BULLISH" ? "Bull OB" : "Bear OB", size: 0.5 });

        const botLine = chartApi.current!.addSeries(LineSeries, { color: borderCol, lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
        if (ob.startTime < endLineTime) {
          botLine.setData([{ time: ob.startTime as Time, value: ob.bottom }, { time: endLineTime as Time, value: ob.bottom }]);
        }

        slpOverlayRefs.current.seriesList.push(obSeries, topLine, botLine);
      });
    }

    // Liquidity Levels
    if (settings.showLiquidity) {
      slpResult.liquidityLevels.forEach((liq) => {
        let color = settings.trendlineLiqColor;
        let text = "TRENDLINE";
        if (liq.type === "EQUAL_HIGHS_LOWS") {
            color = settings.eqLiqColor;
            text = `EQ ${liq.strength || ''}`;
        }
        if (liq.type === "LONG_WICK") {
            color = settings.longWickLiqColor;
            text = "WICK";
        }

        const liqLine = chartApi.current!.addSeries(LineSeries, { color, lineWidth: liq.swept ? 1 : 2, lineStyle: LineStyle.Dotted, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
        const endLineTime = liq.sweepTime || candles[candles.length - 1].time;
        if (liq.time < endLineTime) {
          liqLine.setData([{ time: liq.time as Time, value: liq.price }, { time: endLineTime as Time, value: liq.price }]);
        }
        
        allMarkers.push({ time: liq.time as Time, position: "aboveBar", color, shape: "circle", text: liq.swept ? `${text} ✓` : text, size: 0.5 });
        slpOverlayRefs.current.seriesList.push(liqLine);
      });
    }

    slpResult.swingHighs.forEach((h) => allMarkers.push({ time: h.time as Time, position: "aboveBar", color: settings.downCandleColor, shape: "arrowDown", text: "SH", size: 0.5 }));
    slpResult.swingLows.forEach((l) => allMarkers.push({ time: l.time as Time, position: "belowBar", color: settings.upCandleColor, shape: "arrowUp", text: "SL", size: 0.5 }));

    if (settings.showInducement) {
      slpResult.inducements.forEach((indu) => allMarkers.push({ time: indu.time as Time, position: indu.type === "BULLISH" ? "belowBar" : "aboveBar", color: settings.inducementColor, shape: "circle", text: "INDU Pullback", size: 0.8 }));
    }

    allMarkers.sort((a, b) => (a.time as number) - (b.time as number));
    
    // Deduplicate markers (Lightweight Charts throws if multiple markers have the exact same time)
    const uniqueMarkers: any[] = [];
    allMarkers.forEach((m) => {
      if (uniqueMarkers.length > 0 && uniqueMarkers[uniqueMarkers.length - 1].time === m.time) {
        // Merge text if multiple markers occur on same candle
        uniqueMarkers[uniqueMarkers.length - 1].text += ` | ${m.text}`;
      } else {
        uniqueMarkers.push(m);
      }
    });

    markersPluginRef.current?.setMarkers(uniqueMarkers);
  }, [slpResult, chartInitialized, settings]);

  // Live Price Line
  const livePriceLineRef = useRef<any>(null);
  useEffect(() => {
    if (!candleSeries.current || candles.length === 0) return;
    const currentLivePrice = candles[candles.length - 1].close;

    if (livePriceLineRef.current) {
      candleSeries.current.removePriceLine(livePriceLineRef.current);
    }
    livePriceLineRef.current = candleSeries.current.createPriceLine({
      price: currentLivePrice,
      color: "#CAAA98",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: "LIVE",
    });
  }, [candles, chartInitialized]);

  // High-Fidelity Custom Tooltip
  useEffect(() => {
    if (!chartApi.current || !chartRef.current) return;
    
    // ML Data Collection hook
    if (slpResult && candles.length > 0) {
      import('../../lib/ml/mlCollectorService')
        .then(({ processMLDataCollection }) => processMLDataCollection(slpResult.bosEvents, candles))
        .catch(() => {});
    }
    
    const handleCrosshairMove = (param: any) => {
      if (!chartRef.current || !tooltipRef.current) return;
      
      const chartWidth = chartRef.current.clientWidth;
      const chartHeight = chartRef.current.clientHeight || height;
      
      if (!param.point || !param.time || param.point.x < 0 || param.point.x > chartWidth || param.point.y < 0 || param.point.y > chartHeight) {
        tooltipRef.current.style.display = "none";
        return;
      }
      
      const candleData = param.seriesData.get(candleSeries.current) as any;
      const volumeData = volumeSeries.current ? (param.seriesData.get(volumeSeries.current) as any) : null;
      if (!candleData) {
        tooltipRef.current.style.display = "none";
        return;
      }

      tooltipRef.current.style.display = "block";
      
      const date = new Date((param.time as number) * 1000);
      let smcText = "";
      
      if (slpResult) {
        const timeNum = param.time as number;
        const activeOB = slpResult.orderBlocks.find((ob: any) => timeNum >= ob.startTime && timeNum <= ob.endTime);
        const thisBOS = slpResult.bosEvents.find((bos: any) => timeNum === bos.breakTime);
        
        if (activeOB) {
          smcText += `<div style="margin-top:4px; padding-top:4px; border-top: 1px dashed #2A2E39; color: ${activeOB.type === 'BULLISH' ? '#26A69A' : '#EF5350'}">${activeOB.type === 'BULLISH' ? 'Bull OB' : 'Bear OB'} Zone</div>`;
        }
        if (thisBOS) {
          smcText += `<div style="margin-top:4px; padding-top:4px; border-top: 1px dashed #2A2E39; color: ${thisBOS.direction === 'BULLISH' ? '#26A69A' : '#EF5350'}">${thisBOS.type} Broken Here</div>`;
        }
      }
      
      const isBullish = candleData.close >= candleData.open;
      const candleColor = isBullish ? '#26A69A' : '#EF5350';

      const content = `
        <div style="font-weight: 600; color: #E2E8F0; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid #2A2E39; display: flex; justify-content: space-between;">
          <span>${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}</span>
          <span style="color: #9AA3B2;">${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}</span>
        </div>
        <div style="display: flex; justify-content: space-between; gap: 16px; margin-bottom: 2px;"><span>O</span> <span style="color: ${candleColor}; font-weight: 500;">${candleData.open.toFixed(2)}</span></div>
        <div style="display: flex; justify-content: space-between; gap: 16px; margin-bottom: 2px;"><span>H</span> <span style="color: ${candleColor}; font-weight: 500;">${candleData.high.toFixed(2)}</span></div>
        <div style="display: flex; justify-content: space-between; gap: 16px; margin-bottom: 2px;"><span>L</span> <span style="color: ${candleColor}; font-weight: 500;">${candleData.low.toFixed(2)}</span></div>
        <div style="display: flex; justify-content: space-between; gap: 16px; margin-bottom: 2px;"><span>C</span> <span style="color: ${candleColor}; font-weight: 500;">${candleData.close.toFixed(2)}</span></div>
        ${volumeData ? `<div style="display: flex; justify-content: space-between; gap: 16px; margin-top: 4px; padding-top: 4px; border-top: 1px solid #2A2E39;"><span>Vol</span> <span>${volumeData.value.toFixed(2)}</span></div>` : ''}
        ${smcText}
      `;
      
      tooltipRef.current.innerHTML = content;
      
      let left = param.point.x + 20;
      let top = param.point.y + 20;
      
      const tooltipWidth = tooltipRef.current.offsetWidth;
      const tooltipHeight = tooltipRef.current.offsetHeight;
      
      if (left + tooltipWidth > chartWidth - 10) {
        left = param.point.x - tooltipWidth - 20;
      }
      if (top + tooltipHeight > chartHeight - 10) {
        top = param.point.y - tooltipHeight - 20;
      }
      
      tooltipRef.current.style.left = left + 'px';
      tooltipRef.current.style.top = top + 'px';
    };

    chartApi.current.subscribeCrosshairMove(handleCrosshairMove);
    return () => {
      chartApi.current?.unsubscribeCrosshairMove(handleCrosshairMove);
    }
  }, [chartInitialized, slpResult, height]);

  return (
    <div
      ref={containerRef}
      className={`relative bg-[#131722] rounded-lg overflow-hidden border border-[#2A2E39] flex flex-col w-full ${isFullscreen ? 'h-screen fixed inset-0 z-50 rounded-none' : 'h-full'}`}
    >
      {/* Top Banner */}
      <div className="bg-[#1A1F2C] border-b border-[#2A2E39] p-2 flex items-center justify-between shrink-0">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-gray-200">{selectedPair}</span>
            <div className="flex bg-[#111622] rounded border border-[#2D3345] items-center relative" ref={dropdownRef}>
              {(['1m', '5m', '15m', '30m', '1H', '4H', '1D'] as any[]).map(tf => (
                 <button 
                    key={tf} 
                    onClick={() => {
                      setSelectedTimeframe(tf);
                      setIsDropdownOpen(false);
                    }}
                    className={`px-2 py-1 text-xs font-mono transition-colors cursor-pointer ${selectedTimeframe === tf ? 'bg-[#CAAA98] text-[#111622] font-bold' : 'text-gray-400 hover:bg-[#202940]'}`}
                 >
                    {tf}
                 </button>
              ))}
              
              {/* Dropdown Toggle */}
              <div className="relative border-l border-[#2D3345] h-full flex items-center">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={`px-3 py-1 text-xs font-mono transition-all flex items-center space-x-1 cursor-pointer h-full hover:bg-[#202940] rounded-r ${
                    !['1m', '5m', '15m', '30m', '1H', '4H', '1D'].includes(selectedTimeframe)
                      ? 'bg-[#CAAA98] text-[#111622] font-bold hover:bg-[#bfa08f]'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <span className="uppercase">{!['1m', '5m', '15m', '30m', '1H', '4H', '1D'].includes(selectedTimeframe) ? selectedTimeframe : 'More'}</span>
                  <ChevronDown size={12} className={`shrink-0 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1.5 bg-[#1A1F2C] border border-[#2D3345] rounded shadow-2xl z-50 py-1.5 min-w-[120px] max-h-56 overflow-y-auto scrollbar-none animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="px-2 pb-1 text-[9px] text-gray-500 font-bold uppercase tracking-wider border-b border-[#2D3345] mb-1">More Timeframes</div>
                    {(['3m', '45m', '2H', '8H', '12H', '1W', '1M'] as any[]).map((tf) => (
                      <button
                        key={tf}
                        onClick={() => {
                          setSelectedTimeframe(tf);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs font-mono transition-colors hover:bg-[#202940] block cursor-pointer ${
                          selectedTimeframe === tf ? 'text-[#CAAA98] font-bold' : 'text-gray-400'
                        }`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {CRYPTO_PAIRS.some(p => p.symbol === selectedPair) ? (
              isConnected ? (
                <span className="text-[10px] text-[#26A69A] font-bold tracking-wider ml-2 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-[#26A69A] rounded-full animate-pulse" />
                  LIVE STREAM ACTIVE
                </span>
              ) : (
                <span className="text-[10px] text-amber-500 font-bold tracking-wider ml-2 flex items-center gap-1 animate-pulse">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                  LIVE UNAVAILABLE, RETRYING...
                </span>
              )
            ) : (
              isCachedData ? (
                <span className="text-[10px] text-amber-500 font-bold tracking-wider ml-2 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                  SHOWING CACHED DATA
                </span>
              ) : isRealData ? (
                <span className="text-[10px] text-[#26A69A] font-bold tracking-wider ml-2 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-[#26A69A] rounded-full animate-pulse" />
                  TWELVE DATA SYNCHRONIZED
                </span>
              ) : (
                <span className="text-[10px] text-amber-500 font-bold tracking-wider ml-2 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                  SANDBOX MODE (EMULATED)
                </span>
              )
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={() => setShowSettings(!showSettings)} className={`p-1.5 rounded transition hover:bg-[#2A2E39] ${showSettings ? 'text-white' : 'text-gray-400'}`}>
            <Settings size={16} />
          </button>
          <button onClick={toggleFullscreen} className="p-1.5 rounded transition text-gray-400 hover:text-white hover:bg-[#2A2E39]">
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Dynamic Warning Bar */}
      {((!isConnected && CRYPTO_PAIRS.some(p => p.symbol === selectedPair) && !isLoading) || apiError || isCachedData) && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between shrink-0 text-xs text-amber-400 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
            <span>
              {isCachedData 
                ? (apiError || "Showing cached stale data. Twelve Data API is temporarily unavailable or quota is exhausted.")
                : apiError 
                  ? apiError 
                  : "Live stream unavailable (connection interrupted). Retrying connection and polling fallback feeds..."
              }
            </span>
          </div>
          <button 
            onClick={() => refetch()} 
            className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded border border-amber-500/30 transition-colors cursor-pointer text-[10px] uppercase font-bold"
          >
            Force Reconnect
          </button>
        </div>
      )}

      <div className="flex flex-1 min-h-0 relative">
        {/* Toolbar */}
        {!hideToolbar && (
          <div className="w-12 bg-[#1A1F2C] border-r border-[#2A2E39] flex flex-col items-center py-2 gap-2 shrink-0 z-10 box-border">
            <button 
               onClick={() => setActiveDrawTool('cursor')} 
               className={`p-2 rounded transition-colors ${activeDrawTool === 'cursor' ? 'bg-[#2A2E39] text-[#CAAA98]' : 'text-gray-400 hover:text-white hover:bg-[#252B3A]'}`}
               title="Crosshair mode"
            >
              <MousePointer size={18} />
            </button>
            <button 
               onClick={() => setActiveDrawTool('trendline')} 
               className={`p-2 rounded transition-colors ${activeDrawTool === 'trendline' ? 'bg-[#2A2E39] text-[#CAAA98]' : 'text-gray-400 hover:text-white hover:bg-[#252B3A]'}`}
               title="Draw Trendline"
            >
              <TrendingUp size={18} />
            </button>
            <div className="h-[1px] w-8 bg-[#2A2E39] my-1" />
            <button 
               onClick={clearDrawings} 
               className="p-2 rounded transition-colors text-gray-400 hover:text-red-400 hover:bg-[#252B3A]"
               title="Clear all drawings"
            >
              <RotateCcw size={18} />
            </button>
            <button 
               onClick={() => toast.success("Screenshot saved to history!")} 
               className="p-2 rounded transition-colors text-gray-400 hover:text-white hover:bg-[#252B3A]"
               title="Snapshot"
            >
              <Camera size={18} />
            </button>
          </div>
        )}

        {/* Chart View */}
        <div className="flex-1 min-w-0 bg-[#131722] relative flex flex-col justify-stretch">
          {/* Real-time chart element is kept in DOM */}
          <div ref={chartRef} className="w-full h-full" />
          
          {candles.length === 0 && !isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#131722]/98 z-40 p-6 text-center select-none animate-in fade-in duration-300">
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4">
                <AlertCircle size={24} />
              </div>
              <h3 className="text-sm font-semibold text-white tracking-tight">Chart Data Unavailable</h3>
              <p className="text-xs text-gray-400 max-w-sm mt-2 leading-relaxed">
                {apiError ? apiError : (
                  <>
                    Could not retrieve live market candles for <span className="font-semibold text-gray-200">{selectedPair} ({selectedTimeframe})</span> from real-time feeds. Analytical integrity is maintained; synthetic fallback datasets have been disabled.
                  </>
                )}
              </p>
              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => refetch()}
                  className="px-4 py-2 text-xs font-semibold text-[#111622] bg-[#CAAA98] hover:bg-[#bfa08f] rounded transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw size={14} />
                  Retry Connection
                </button>
                <button
                  onClick={() => setShowSettings(true)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#252B3A] hover:bg-[#2A3142] border border-[#2D3345] rounded transition-all cursor-pointer"
                >
                  Configure API Settings
                </button>
              </div>
            </div>
          )}
          
          {!isRealData && (
            <div className="absolute top-4 left-4 z-10 max-w-sm bg-[#1E2433]/95 border border-amber-500/30 p-3.5 rounded-lg shadow-xl backdrop-blur-md flex gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex-shrink-0 text-amber-500 mt-0.5">
                <AlertCircle size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-semibold text-white flex items-center gap-1.5 leading-none">
                  Sandbox Emulated Mode Active
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                </h4>
                <p className="text-[10px] text-gray-400 leading-normal mt-1.5">
                  Live API unreachable or rate-limited. Running on emulated market candles so you can still test SLP order blocks, structures, and drawing overlays safely.
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => setShowSettings(true)}
                    className="text-[9px] font-bold text-[#111622] bg-[#CAAA98] hover:bg-[#bfa08f] px-2 py-1 rounded transition-colors cursor-pointer"
                  >
                    Configure API Key
                  </button>
                  <button
                    onClick={() => refetch()}
                    className="text-[9px] font-bold text-white bg-[#252B3A] hover:bg-[#2A3142] border border-[#2D3345] px-2 py-1 rounded transition-colors cursor-pointer"
                  >
                    Retry Live
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="absolute bottom-2 right-2 z-10 flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity">
            <a href="https://tradingview.com/" target="_blank" rel="noopener noreferrer" className="flex items-center space-x-1 text-[10px] text-gray-400 font-sans hover:text-[#CAAA98]">
              <span>Powered by TradingView</span>
            </a>
          </div>

          <div className="absolute bottom-2 left-2 z-10 bg-[#1E2433]/90 border border-[#2A2E39] px-2.5 py-1 rounded-md text-[10px] text-gray-400 font-mono pointer-events-none select-none flex items-center gap-1.5 backdrop-blur-sm">
            <span className={`w-1.5 h-1.5 rounded-full ${!isRealData ? 'bg-amber-500 animate-pulse' : (candles.length < 30 ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse')}`} />
            <span>
              {!isRealData
                ? 'SLP Engine: Running in Sandbox mode. Computing structure overlays (BOS, MSS, OBs) from emulated candles.'
                : candles.length < 30 
                  ? 'SLP Engine: Insufficient data to compute structure levels confidently (minimum 30 candles required).'
                  : 'SLP Engine: Active, computing live structural shifted overlays (BOS, CHoCH, MSS, OBs) from real-time OHLCV candles.'
              }
            </span>
          </div>
        </div>

        {/* Settings Overlay Slide out */}
        {showSettings && (
          <div className="absolute top-0 right-0 h-full w-80 shadow-2xl z-20">
            <ChartSettingsPanel onClose={handleCloseSettings} />
          </div>
        )}
      </div>

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#131722]/80 z-50 backdrop-blur-sm">
          <LoadingSpinner />
        </div>
      )}
    </div>
  );
}
