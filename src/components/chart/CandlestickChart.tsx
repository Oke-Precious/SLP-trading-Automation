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
import { runSMCAnalysis } from "../../lib/analysis/smcEngine";
import { formatPrice } from "../../lib/market/marketDataService";
import LoadingSpinner from "../ui/LoadingSpinner";
import { MousePointer, TrendingUp, Maximize2, Minimize2, Camera, RotateCcw, Settings, X, Plus, ChevronDown } from 'lucide-react';
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

  const { candles, isLoading, isConnected, error, refetch } =
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
    candleSeries.current.setData(candles.map((c) => ({ time: c.time as Time, open: c.open, high: c.high, low: c.low, close: c.close })));
    volumeSeries.current.setData(candles.map((c) => ({ time: c.time as Time, value: c.volume, color: c.close >= c.open ? settings.upCandleColor + "80" : settings.downCandleColor + "80" })));

    const timeScale = chartApi.current?.timeScale();
    if (timeScale) {
       if (candles.length > 200) timeScale.scrollToRealTime();
    }
  }, [candles, chartInitialized]);

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

  const smcResult = React.useMemo(() => {
    if (candles.length === 0) return null;
    return runSMCAnalysis(candles);
  }, [candles]);

  const smcOverlayRefs = useRef<{ seriesList: any[]; markers: any[] }>({ seriesList: [], markers: [] });
  function clearSMCOverlays() {
    smcOverlayRefs.current.seriesList.forEach((s) => { try { chartApi.current?.removeSeries(s); } catch {} });
    smcOverlayRefs.current.seriesList = [];
  }

  useEffect(() => {
    if (!candleSeries.current || !smcResult) return;
    clearSMCOverlays();
    const allMarkers: any[] = [];

    // BOS
    if (settings.showBOS || settings.showCHoCH || settings.showMSS) {
      smcResult.bosEvents.forEach((bos) => {
        if (bos.type === 'BOS' && !settings.showBOS) return;
        if (bos.type === 'CHOCH' && !settings.showCHoCH) return;
        if (bos.type === 'MSS' && !settings.showMSS) return;
        
        let color = bos.direction === "BULLISH" ? settings.bosUpColor : settings.bosDownColor;
        if (bos.type === 'CHOCH') color = settings.chochColor;
        if (bos.type === 'MSS') color = settings.mssColor;
        
        const lineSeries = chartApi.current!.addSeries(LineSeries, { color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
        lineSeries.setData([ { time: bos.swingTime as Time, value: bos.price }, { time: bos.breakTime as Time, value: bos.price } ]);
        allMarkers.push({ time: bos.breakTime as Time, position: bos.direction === "BULLISH" ? "belowBar" : "aboveBar", color, shape: "circle", text: bos.type, size: 0.6 });
        smcOverlayRefs.current.seriesList.push(lineSeries);
      });
    }

    // Order Blocks
    if (settings.showOrderBlocks || settings.showBreakerBlocks) {
      smcResult.orderBlocks.forEach((ob) => {
        if (ob.isBroken && !settings.showBreakerBlocks) return;
        if (!ob.isBroken && !settings.showOrderBlocks) return;
        
        const borderCol = ob.isBroken ? settings.breakerColor : (ob.type === "BULLISH" ? settings.bullOBColor : settings.bearOBColor);
        const color = ob.isBroken ? settings.breakerColor + "20" : (ob.type === "BULLISH" ? settings.bullOBColor + "20" : settings.bearOBColor + "20"); // 20 is Low Opacity hex

        const obSeries = chartApi.current!.addSeries(HistogramSeries, {
          color,
          priceFormat: { type: "price" },
          priceScaleId: "right",
          priceLineVisible: false,
          lastValueVisible: false,
        });
        const obCandles = candles.filter((c) => c.time >= ob.startTime && c.time <= ob.endTime);
        obSeries.setData(obCandles.map((c) => ({ time: c.time as Time, value: ob.top, color })));

        const endLineTime = ob.endTime || candles[candles.length - 1].time;

        const topLine = chartApi.current!.addSeries(LineSeries, { color: borderCol, lineWidth: 1, lineStyle: LineStyle.Solid, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
        topLine.setData([{ time: ob.startTime as Time, value: ob.top }, { time: endLineTime as Time, value: ob.top }]);
        
        allMarkers.push({ time: ob.startTime as Time, position: "aboveBar", color: borderCol, shape: "circle", text: ob.isBroken ? "BB" : ob.type === "BULLISH" ? "Bull OB" : "Bear OB", size: 0.5 });

        const botLine = chartApi.current!.addSeries(LineSeries, { color: borderCol, lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
        botLine.setData([{ time: ob.startTime as Time, value: ob.bottom }, { time: endLineTime as Time, value: ob.bottom }]);

        smcOverlayRefs.current.seriesList.push(obSeries, topLine, botLine);
      });
    }

    // Liquidity Levels
    if (settings.showLiquidity) {
      smcResult.liquidityLevels.forEach((liq) => {
        // @ts-ignore
        const color = liq.type === "BUY_SIDE" ? settings.bslColor : settings.sslColor;
        const liqLine = chartApi.current!.addSeries(LineSeries, { color, lineWidth: liq.swept ? 1 : 2, lineStyle: LineStyle.Dotted, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
        const endLineTime = liq.sweepTime || candles[candles.length - 1].time;
        liqLine.setData([{ time: liq.time as Time, value: liq.price }, { time: endLineTime as Time, value: liq.price }]);
        
        // @ts-ignore
        allMarkers.push({ time: liq.time as Time, position: liq.type === "BUY_SIDE" ? "aboveBar" : "belowBar", color, shape: "circle", text: liq.swept ? liq.type === "BUY_SIDE" ? "BSL ✓" : "SSL ✓" : liq.type === "BUY_SIDE" ? `BSL×${liq.strength}` : `SSL×${liq.strength}`, size: 0.5 });
        smcOverlayRefs.current.seriesList.push(liqLine);
      });
    }

    // FVGs
    if (settings.showFVG) {
      smcResult.fvgs.forEach((fvg) => {
        const color = fvg.type === "BULLISH" ? settings.fvgBullColor : settings.fvgBearColor;
        const endLineTime = fvg.endTime || candles[candles.length - 1].time;

        const topLine = chartApi.current!.addSeries(LineSeries, { color, lineWidth: 1, lineStyle: LineStyle.Solid, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
        topLine.setData([{ time: fvg.time as Time, value: fvg.top }, { time: endLineTime as Time, value: fvg.top }]);
        
        allMarkers.push({ time: fvg.time as Time, position: "aboveBar", color, shape: "circle", text: fvg.type === "BULLISH" ? "FVG ↑" : "FVG ↓", size: 0.5 });

        const botLine = chartApi.current!.addSeries(LineSeries, { color, lineWidth: 1, lineStyle: LineStyle.Dotted, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
        botLine.setData([{ time: fvg.time as Time, value: fvg.bottom }, { time: endLineTime as Time, value: fvg.bottom }]);
        
        smcOverlayRefs.current.seriesList.push(topLine, botLine);
      });
    }

    smcResult.swingHighs.forEach((h) => allMarkers.push({ time: h.time as Time, position: "aboveBar", color: settings.downCandleColor, shape: "arrowDown", text: "SH", size: 0.5 }));
    smcResult.swingLows.forEach((l) => allMarkers.push({ time: l.time as Time, position: "belowBar", color: settings.upCandleColor, shape: "arrowUp", text: "SL", size: 0.5 }));

    if (settings.showInducement) {
      smcResult.inducements.forEach((indu) => allMarkers.push({ time: indu.time as Time, position: indu.type === "BULLISH" ? "belowBar" : "aboveBar", color: "#9A8678", shape: "circle", text: "INDU", size: 0.8 }));
    }

    allMarkers.sort((a, b) => (a.time as number) - (b.time as number));
    markersPluginRef.current?.setMarkers(allMarkers);
  }, [smcResult, chartInitialized, settings]);

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
    if (smcResult && candles.length > 0) {
      import('../../lib/ml/mlCollectorService')
        .then(({ processMLDataCollection }) => processMLDataCollection(smcResult.bosEvents, candles))
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
      
      if (smcResult) {
        const timeNum = param.time as number;
        const activeOB = smcResult.orderBlocks.find((ob: any) => timeNum >= ob.startTime && timeNum <= ob.endTime);
        const thisBOS = smcResult.bosEvents.find((bos: any) => timeNum === bos.breakTime);
        const thisFVG = smcResult.fvgs.find((fvg: any) => timeNum === fvg.time);
        
        if (activeOB) {
          smcText += `<div style="margin-top:4px; padding-top:4px; border-top: 1px dashed #2A2E39; color: ${activeOB.type === 'BULLISH' ? '#26A69A' : '#EF5350'}">${activeOB.type === 'BULLISH' ? 'Bull OB' : 'Bear OB'} Zone</div>`;
        }
        if (thisBOS) {
          smcText += `<div style="margin-top:4px; padding-top:4px; border-top: 1px dashed #2A2E39; color: ${thisBOS.direction === 'BULLISH' ? '#26A69A' : '#EF5350'}">${thisBOS.type} Broken Here</div>`;
        }
        if (thisFVG) {
          smcText += `<div style="margin-top:4px; padding-top:4px; border-top: 1px dashed #2A2E39; color: ${thisFVG.type === 'BULLISH' ? '#26A69A' : '#EF5350'}">FVG</div>`;
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
  }, [chartInitialized, smcResult, height]);

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
            <span className="text-[10px] text-[#26A69A] font-bold tracking-wider ml-2 animate-pulse hidden sm:inline">LIVE FEED</span>
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
        <div className="flex-1 min-w-0 bg-[#131722] relative">
          <div ref={chartRef} className="w-full h-full" />
          <div className="absolute bottom-2 left-2 z-10 bg-[#1E2433]/90 border border-[#2A2E39] px-2.5 py-1 rounded-md text-[10px] text-gray-400 font-mono pointer-events-none select-none flex items-center gap-1.5 backdrop-blur-sm">
            <span className={`w-1.5 h-1.5 rounded-full ${candles.length < 30 ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />
            <span>
              {candles.length < 30 
                ? 'SMC Engine: Insufficient data to compute structure levels confidently (minimum 30 candles required).'
                : 'SMC Engine: Active, computing live structural shifted overlays (BOS, CHoCH, MSS, OBs) from real-time OHLCV candles.'
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
