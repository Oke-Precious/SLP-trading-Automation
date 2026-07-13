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
import { detectSwingPoints, analyseSLPBias } from "../../lib/slp/slpBias";
import { detectSLPStructure } from "../../lib/slp/slpStructure";
import { detectSLPLiquidity, calcATR } from "../../lib/slp/slpLiquidity";
import { detectSLPPOIs } from "../../lib/slp/slpPOI";
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
  const [isLegendExpanded, setIsLegendExpanded] = useState(true);
  
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

  const slpStructure = React.useMemo(() => {
    if (candles.length < 30) return { mssEvents: [], bosEvents: [] };
    const biasResult = analyseSLPBias(candles, selectedTimeframe);
    const { highs, lows } = detectSwingPoints(candles, selectedTimeframe);
    return detectSLPStructure(candles, selectedTimeframe, biasResult.bias, highs, lows);
  }, [candles, selectedTimeframe]);

  const slpLiquidity = React.useMemo(() => {
    if (candles.length < 30) return [];
    const biasResult = analyseSLPBias(candles, selectedTimeframe);
    const { highs, lows } = detectSwingPoints(candles, selectedTimeframe);
    const atr = calcATR(candles, 14);
    return detectSLPLiquidity(candles, highs, lows, biasResult.bias, atr);
  }, [candles, selectedTimeframe]);

  const slpPOIs = React.useMemo(() => {
    if (candles.length < 30 || !slpStructure || !slpLiquidity) return [];
    return detectSLPPOIs(candles, slpStructure.mssEvents, slpStructure.bosEvents, slpLiquidity);
  }, [candles, slpStructure, slpLiquidity]);

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

    // Sequential MSS and BOS drawing
    if (settings.showMSS && slpStructure) {
      slpStructure.mssEvents.forEach((mss) => {
        const color = "#CAAA98";
        const text = mss.direction === 'BULLISH' ? 'MSS ↑' : 'MSS ↓';
        const position = mss.direction === 'BULLISH' ? 'belowBar' : 'aboveBar';
        allMarkers.push({
          time: mss.time as Time,
          position,
          color,
          shape: mss.direction === 'BULLISH' ? 'arrowUp' : 'arrowDown',
          text,
          size: 1.0,
        });
      });
    }

    if (settings.showBOS && slpStructure) {
      slpStructure.bosEvents.forEach((bos) => {
        const color = bos.direction === 'BULLISH' ? '#26A69A' : '#EF5350';
        
        // Horizontal line from swingBroken.time to breakTime (lineTo)
        const lineSeries = chartApi.current!.addSeries(LineSeries, {
          color,
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
        
        if (bos.lineFrom < bos.lineTo) {
          lineSeries.setData([
            { time: bos.lineFrom as Time, value: bos.price },
            { time: bos.lineTo as Time, value: bos.price },
          ]);
        }
        slpOverlayRefs.current.seriesList.push(lineSeries);

        // Marker at the breakTime end point
        allMarkers.push({
          time: bos.lineTo as Time,
          position: bos.direction === 'BULLISH' ? 'belowBar' : 'aboveBar',
          color,
          shape: 'circle',
          text: 'BOS',
          size: 0.8,
        });
      });
    }

    // Valid SLP POIs (Order Blocks & Breaker Blocks satisfying all 4 rules)
    if ((settings.showOrderBlocks || settings.showBreakerBlocks) && slpPOIs) {
      slpPOIs.forEach((poi) => {
        if (poi.type === 'ORDER_BLOCK' && !settings.showOrderBlocks) return;
        if (poi.type === 'BREAKER_BLOCK' && !settings.showBreakerBlocks) return;

        let color = '#1565C0'; // Breaker Block color
        if (poi.type === 'ORDER_BLOCK') {
          color = poi.direction === 'BULLISH' ? '#26A69A' : '#EF5350';
        }

        const endTime = candles[candles.length - 1].time;

        // Top line (solid)
        const topLine = chartApi.current!.addSeries(LineSeries, {
          color,
          lineWidth: 1,
          lineStyle: LineStyle.Solid,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false
        });
        if (poi.time < endTime) {
          topLine.setData([
            { time: poi.time as Time, value: poi.priceTop },
            { time: endTime as Time, value: poi.priceTop }
          ]);
        }

        // 50% midpoint line (dashed) - labeled: "50% — Entry Zone"
        const midLine = chartApi.current!.addSeries(LineSeries, {
          color,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
          title: '50% — Entry Zone'
        });
        if (poi.time < endTime) {
          midLine.setData([
            { time: poi.time as Time, value: poi.priceMid },
            { time: endTime as Time, value: poi.priceMid }
          ]);
        }

        // Bottom line (dotted)
        const botLine = chartApi.current!.addSeries(LineSeries, {
          color,
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false
        });
        if (poi.time < endTime) {
          botLine.setData([
            { time: poi.time as Time, value: poi.priceBottom },
            { time: endTime as Time, value: poi.priceBottom }
          ]);
        }

        // Marker at start of zone
        allMarkers.push({
          time: poi.time as Time,
          position: poi.direction === 'BULLISH' ? 'belowBar' : 'aboveBar',
          color,
          shape: 'circle',
          text: poi.displayLabel,
          size: 0.7
        });

        slpOverlayRefs.current.seriesList.push(topLine, midLine, botLine);
      });
    }

    // Liquidity Levels
    if (settings.showLiquidity && slpLiquidity) {
      slpLiquidity.forEach((liq) => {
        let color = '#9A8678';
        let label = '';

        if (liq.type === 'EQUAL_HIGHS') {
          color = '#F0B90B';
          label = `EQH×${liq.touchCount}`;
        } else if (liq.type === 'EQUAL_LOWS') {
          color = '#F0B90B';
          label = `EQL×${liq.touchCount}`;
        } else if (liq.type === 'LONG_WICK_HIGH') {
          color = '#9A8678';
          label = 'LWH';
        } else if (liq.type === 'LONG_WICK_LOW') {
          color = '#9A8678';
          label = 'LWL';
        } else if (liq.type === 'INDUCEMENT_HIGH' || liq.type === 'INDUCEMENT_LOW') {
          color = '#CAAA98';
          label = 'INDU';
        }

        if (liq.swept) {
          color = '#444444';
          label += ' (Swept)';
        }

        const lineWidth = liq.touchCount >= 3 ? 2 : 1;
        const liqLine = chartApi.current!.addSeries(LineSeries, {
          color,
          lineWidth,
          lineStyle: LineStyle.Dotted,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false
        });

        const endLineTime = liq.sweptTime || candles[candles.length - 1].time;
        if (liq.time < endLineTime) {
          liqLine.setData([
            { time: liq.time as Time, value: liq.price },
            { time: endLineTime as Time, value: liq.price }
          ]);
        }

        allMarkers.push({
          time: liq.time as Time,
          position: liq.side === 'BUY_SIDE' ? 'aboveBar' : 'belowBar',
          color,
          shape: 'circle',
          text: label,
          size: 0.6
        });
        slpOverlayRefs.current.seriesList.push(liqLine);
      });
    }

    slpResult.swingHighs.forEach((h) => allMarkers.push({ time: h.time as Time, position: "aboveBar", color: settings.downCandleColor, shape: "arrowDown", text: "SH", size: 0.5 }));
    slpResult.swingLows.forEach((l) => allMarkers.push({ time: l.time as Time, position: "belowBar", color: settings.upCandleColor, shape: "arrowUp", text: "SL", size: 0.5 }));

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
  }, [slpResult, slpStructure, slpLiquidity, chartInitialized, settings]);

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
    if (slpStructure && slpStructure.bosEvents.length > 0 && candles.length > 0) {
      const mappedEvents = slpStructure.bosEvents.map((b) => ({
        swingTime: b.lineFrom,
        breakTime: b.lineTo,
        price: b.price,
        direction: b.direction,
        type: 'BOS' as const,
        impulseStartPrice: b.mssReference?.price || b.price,
        impulseStartTime: b.mssReference?.time || b.lineFrom,
      }));
      import('../../lib/ml/mlCollectorService')
        .then(({ processMLDataCollection }) => processMLDataCollection(mappedEvents, candles))
        .catch(() => {});
    } else if (slpResult && candles.length > 0) {
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
      let slpText = "";
      
      if (slpResult) {
        const timeNum = param.time as number;
        const activePOI = slpPOIs?.find((poi: any) => timeNum >= poi.time);
        const thisBOS = slpStructure?.bosEvents.find((bos) => timeNum === bos.lineTo);
        const thisMSS = slpStructure?.mssEvents.find((mss) => timeNum === mss.time);
        
        if (activePOI) {
          const color = activePOI.direction === 'BULLISH' ? '#26A69A' : '#EF5350';
          slpText += `<div style="margin-top:4px; padding-top:4px; border-top: 1px dashed #2A2E39; color: ${color}">${activePOI.displayLabel} Zone</div>`;
        }
        if (thisBOS) {
          slpText += `<div style="margin-top:4px; padding-top:4px; border-top: 1px dashed #2A2E39; color: ${thisBOS.direction === 'BULLISH' ? '#26A69A' : '#EF5350'}">BOS Broken Here</div>`;
        }
        if (thisMSS) {
          slpText += `<div style="margin-top:4px; padding-top:4px; border-top: 1px dashed #2A2E39; color: #CAAA98">MSS Shift Here</div>`;
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
        ${slpText}
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
            {candles.length === 0 ? (
              <span className="text-[10px] text-red-500 font-bold tracking-wider ml-2 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                LIVE FEED OFFLINE
              </span>
            ) : CRYPTO_PAIRS.some(p => p.symbol === selectedPair) ? (
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
              ) : (
                <span className="text-[10px] text-[#26A69A] font-bold tracking-wider ml-2 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-[#26A69A] rounded-full animate-pulse" />
                  TWELVE DATA SYNCHRONIZED
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

          {/* Floating SLP Legend Overlay */}
          <div className="absolute top-3 left-3 z-10 bg-[#1E2433]/90 border border-[#2A2E39] rounded-md overflow-hidden backdrop-blur-sm shadow-lg w-52 pointer-events-auto">
            <div 
              className="flex items-center justify-between px-2.5 py-1.5 bg-[#161B26]/80 border-b border-[#2A2E39] cursor-pointer select-none" 
              onClick={() => setIsLegendExpanded(!isLegendExpanded)}
            >
              <span className="text-[10px] font-bold text-[#CAAA98] tracking-wider uppercase font-mono">SLP Legend Map</span>
              <span className="text-[9px] text-gray-400 font-mono font-bold">{isLegendExpanded ? "HIDE" : "SHOW"}</span>
            </div>
            {isLegendExpanded && (
              <div className="p-2 space-y-1.5 text-[9px] font-mono text-gray-400 select-none">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded bg-[#26A69A] shrink-0" style={{ backgroundColor: settings.bosUpColor }} />
                    <span className="text-gray-300 font-semibold uppercase">BOS ↑</span>
                    <span className="text-[8px] text-gray-500">Break of Structure (Up)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded bg-[#EF5350] shrink-0" style={{ backgroundColor: settings.bosDownColor }} />
                    <span className="text-gray-300 font-semibold uppercase">BOS ↓</span>
                    <span className="text-[8px] text-gray-500">Break of Structure (Down)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded bg-[#CAAA98] shrink-0" style={{ backgroundColor: settings.mssColor }} />
                    <span className="text-gray-300 font-semibold uppercase">MSS ↑/↓</span>
                    <span className="text-[8px] text-gray-500">Market Structure Shift</span>
                  </div>
                </div>
                <div className="h-[1px] bg-[#2A2E39] my-1" />
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm bg-[#26A69A] shrink-0" style={{ backgroundColor: settings.bullOBColor }} />
                    <span className="text-gray-300 font-semibold uppercase">BULL OB</span>
                    <span className="text-[8px] text-gray-500">Bullish Order Block</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm bg-[#EF5350] shrink-0" style={{ backgroundColor: settings.bearOBColor }} />
                    <span className="text-gray-300 font-semibold uppercase">BEAR OB</span>
                    <span className="text-[8px] text-gray-500">Bearish Order Block</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm bg-[#1565C0] shrink-0" style={{ backgroundColor: settings.breakerColor }} />
                    <span className="text-gray-300 font-semibold uppercase">BB</span>
                    <span className="text-[8px] text-gray-500">Breaker Block (Broken OB)</span>
                  </div>
                </div>
                <div className="h-[1px] bg-[#2A2E39] my-1" />
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-6 text-center font-bold text-[#E040FB] shrink-0 text-[8px] border border-[#E040FB]/30 bg-[#E040FB]/5 rounded-sm" style={{ color: settings.eqLiqColor, borderColor: settings.eqLiqColor + '30', backgroundColor: settings.eqLiqColor + '10' }}>EQH/EQL</span>
                    <span className="text-[8px] text-gray-500">Equal Highs / Lows</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-6 text-center font-bold text-[#29B6F6] shrink-0 text-[8px] border border-[#29B6F6]/30 bg-[#29B6F6]/5 rounded-sm" style={{ color: settings.longWickLiqColor, borderColor: settings.longWickLiqColor + '30', backgroundColor: settings.longWickLiqColor + '10' }}>WICK</span>
                    <span className="text-[8px] text-gray-500">Long Wick Liquidity</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-6 text-center font-bold text-[#FF7043] shrink-0 text-[8px] border border-[#FF7043]/30 bg-[#FF7043]/5 rounded-sm" style={{ color: (settings as any).inducementLiqColor || '#FF7043', borderColor: ((settings as any).inducementLiqColor || '#FF7043') + '30', backgroundColor: ((settings as any).inducementLiqColor || '#FF7043') + '10' }}>IND</span>
                    <span className="text-[8px] text-gray-500">Inducement Liquidity</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-6 text-center font-bold text-[#F0B90B] shrink-0 text-[8px] border border-[#F0B90B]/30 bg-[#F0B90B]/5 rounded-sm" style={{ color: settings.trendlineLiqColor, borderColor: settings.trendlineLiqColor + '30', backgroundColor: settings.trendlineLiqColor + '10' }}>TL</span>
                    <span className="text-[8px] text-gray-500">Trendline Liquidity *</span>
                  </div>
                </div>
                <div className="pt-1 text-[7px] text-gray-500 leading-tight border-t border-[#2A2E39]/30">
                  * Trendline liquidity can be drawn manually using toolbar trendline helper
                </div>
              </div>
            )}
          </div>
          
          {candles.length === 0 && !isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#131722]/98 z-40 p-6 text-center select-none animate-in fade-in duration-300">
              <div className="w-12 h-12 rounded-full bg-[#CAAA98]/10 border border-[#CAAA98]/20 flex items-center justify-center text-[#CAAA98] mb-4">
                <AlertCircle size={24} />
              </div>
              <h3 className="text-sm font-semibold text-white tracking-tight">Chart Data Unavailable</h3>
              <p className="text-xs text-gray-400 max-w-sm mt-2 leading-relaxed">
                Live chart data is temporarily unavailable. Please try again shortly.
              </p>
              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => refetch()}
                  className="px-4 py-2 text-xs font-semibold text-[#111622] bg-[#CAAA98] hover:bg-[#bfa08f] rounded transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw size={14} />
                  Force Reconnect
                </button>
              </div>
            </div>
          )}

          <div className="absolute bottom-2 right-2 z-10 flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity">
            <a href="https://tradingview.com/" target="_blank" rel="noopener noreferrer" className="flex items-center space-x-1 text-[10px] text-gray-400 font-sans hover:text-[#CAAA98]">
              <span>Powered by TradingView</span>
            </a>
          </div>

          <div className="absolute bottom-2 left-2 z-10 bg-[#1E2433]/90 border border-[#2A2E39] px-2.5 py-1 rounded-md text-[10px] text-gray-400 font-mono pointer-events-none select-none flex items-center gap-1.5 backdrop-blur-sm">
            <span className={`w-1.5 h-1.5 rounded-full ${candles.length < 30 ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />
            <span>
              {candles.length < 30 
                ? 'SLP Engine: Insufficient data to compute structure levels confidently (minimum 30 candles required).'
                : 'SLP Engine: Active, computing live structural shifted overlays (BOS, MSS, OBs, BBs) from real-time OHLCV candles.'
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
