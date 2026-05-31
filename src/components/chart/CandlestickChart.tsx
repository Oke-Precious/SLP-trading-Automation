'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CrosshairMode,
  LineStyle,
  Time,
  CandlestickSeries,
  HistogramSeries,
  createSeriesMarkers,
} from 'lightweight-charts';
import { useRealtimeCandles } from '../../hooks/useRealtimeCandles';
import { useMarketStore } from '../../store/useMarketStore';
import { usePOIStore } from '../../store/usePOIStore';
import { formatPrice } from '../../lib/market/marketDataService';
import LoadingSpinner from '../ui/LoadingSpinner';

interface Props {
  height?: number;
}

export default function CandlestickChart({ height = 480 }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartApi = useRef<IChartApi | null>(null);
  const candleSeries = useRef<any>(null);
  const volumeSeries = useRef<any>(null);
  const poiSeriesRefs = useRef<any[]>([]);
  const markersPluginRef = useRef<any>(null);

  const { selectedPair, selectedTimeframe } = useMarketStore();
  const { pois } = usePOIStore();
  const [chartInitialized, setChartInitialized] = useState(0);
  const { candles, isLoading, isConnected, error, refetch } = useRealtimeCandles(
    selectedPair,
    selectedTimeframe
  );

  // ── Initialize chart once ──────────────────────────────
  useEffect(() => {
    if (!chartRef.current) return;

    chartApi.current = createChart(chartRef.current, {
      width: chartRef.current.clientWidth || 300,
      height: Math.floor(height * 0.8),
      layout: {
        background: { color: '#131722' },
        textColor: '#9AA3B2',
        fontSize: 12,
        fontFamily: 'JetBrains Mono, monospace',
      },
      grid: {
        vertLines: { color: '#1E2433', style: LineStyle.Dotted },
        horzLines: { color: '#1E2433', style: LineStyle.Dotted },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#CAAA98', labelBackgroundColor: '#202940' },
        horzLine: { color: '#CAAA98', labelBackgroundColor: '#202940' },
      },
      rightPriceScale: {
        borderColor: '#2A2E39',
        textColor: '#9AA3B2',
      },
      timeScale: {
        borderColor: '#2A2E39',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
      },
      handleScroll: true,
      handleScale: true,
    });

    // Candlestick series
    candleSeries.current = chartApi.current.addSeries(CandlestickSeries, {
      upColor: '#26A69A',
      downColor: '#EF5350',
      borderUpColor: '#26A69A',
      borderDownColor: '#EF5350',
      wickUpColor: '#26A69A',
      wickDownColor: '#EF5350',
    });

    // Markers Plugin
    markersPluginRef.current = createSeriesMarkers(candleSeries.current, []);

    // Volume series (20% height at bottom)
    volumeSeries.current = chartApi.current.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    chartApi.current.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    // Mark as initialized
    setChartInitialized((prev) => prev + 1);

    // Responsive resize
    const ro = new ResizeObserver(() => {
      if (chartRef.current && chartApi.current) {
        chartApi.current.resize(chartRef.current.clientWidth, Math.floor(height * 0.8));
      }
    });
    ro.observe(chartRef.current);

    return () => {
      ro.disconnect();
      chartApi.current?.remove();
    };
  }, [height]);

  // ── Update candle data when pair/timeframe changes ─────
  useEffect(() => {
    if (!candleSeries.current || !volumeSeries.current || candles.length === 0) return;

    candleSeries.current.setData(
      candles.map((c) => ({
        time: c.time as Time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );

    volumeSeries.current.setData(
      candles.map((c) => ({
        time: c.time as Time,
        value: c.volume,
        color: c.close >= c.open ? 'rgba(38,166,154,0.5)' : 'rgba(239,83,80,0.5)',
      }))
    );

    chartApi.current?.timeScale().fitContent();
  }, [candles, chartInitialized]);

  // ── Render POI zones as price lines ───────────────────
  useEffect(() => {
    if (!candleSeries.current) return;

    // Remove old POI lines
    poiSeriesRefs.current.forEach((line) => {
      try {
        candleSeries.current?.removePriceLine(line);
      } catch {}
    });
    poiSeriesRefs.current = [];

    pois.forEach((poi) => {
      if (poi.status?.toUpperCase() === 'MITIGATED') return;
      
      const isOrderBlock = (poi.type as string) === 'OB' || (poi.type as string) === 'ORDER_BLOCK';
      const color = isOrderBlock ? '#26A69A' : '#1565C0';
      const priceMax = poi.priceMax ?? (poi as any).priceTo;
      const priceMin = poi.priceMin ?? (poi as any).priceFrom;

      if (priceMax === undefined || priceMin === undefined) return;

      const topLine = candleSeries.current?.createPriceLine({
        price: priceMax,
        color,
        lineWidth: 1,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: `${poi.name} ▲`,
      });
      const botLine = candleSeries.current?.createPriceLine({
        price: priceMin,
        color,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: false,
        title: `${poi.name} ▼`,
      });
      if (topLine) poiSeriesRefs.current.push(topLine);
      if (botLine) poiSeriesRefs.current.push(botLine);
    });
  }, [pois, chartInitialized]);

  // ── HH/HL markers from structure analysis ─────────────
  useEffect(() => {
    if (!markersPluginRef.current || candles.length < 10) return;
    const markers = detectStructureMarkers(candles);
    markersPluginRef.current.setMarkers(markers);
  }, [candles, chartInitialized]);

  return (
    <div
      id="candlestick-chart-wrapper"
      className="relative bg-[#131722] rounded-lg overflow-hidden border border-[#2A2E39]"
      style={{ height }}
    >
      {/* Loading Overlay */}
      {isLoading && (
        <div
          id="candlestick-chart-loading-overlay"
          className="absolute inset-0 flex items-center justify-center bg-[#131722] z-50 rounded-lg"
        >
          <LoadingSpinner />
          <span className="ml-3 text-text-secondary text-sm">
            Loading {selectedPair} chart...
          </span>
        </div>
      )}

      {/* Error Overlay */}
      {error && !isLoading && (
        <div
          id="candlestick-chart-error-overlay"
          className="absolute inset-0 flex flex-col items-center justify-center bg-[#131722] z-50 rounded-lg gap-3"
        >
          <span className="text-bearish text-sm">{error}</span>
          <button
            id="candlestick-chart-retry-btn"
            onClick={refetch}
            className="text-xs text-light underline focus:outline-none cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Visual Live indicator */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 font-mono">
        <div
          className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-[#26A69A] animate-pulse' : 'bg-gray-500'
          }`}
        />
        <span className="text-[10px] text-gray-400 font-bold tracking-wider">
          {isConnected ? 'LIVE DATAFEED ACTIVE' : 'DELAYED DATAFEED ACTIVE'}
        </span>
      </div>
      <div className="absolute top-3 left-4 z-10 flex items-center space-x-2 font-mono text-xs text-light">
        <span className="font-bold uppercase text-white">{selectedPair}</span>
        <span className="bg-[#2A3245] px-1.5 py-0.5 rounded text-[10px] text-gray-400 font-semibold">
          {selectedTimeframe}
        </span>
      </div>
      <div id="candlestick-chart-container" ref={chartRef} style={{ width: '100%', height }} />
    </div>
  );
}

// ── Detect HH/HL/LH/LL for chart markers ──────────────────
function detectStructureMarkers(candles: any[]) {
  const markers: any[] = [];
  const lookback = 5;

  for (let i = lookback; i < candles.length - lookback; i++) {
    const curr = candles[i];
    const prevCandles = candles.slice(i - lookback, i);
    const nextCandles = candles.slice(i + 1, i + lookback + 1);

    const isSwingHigh =
      prevCandles.every((c) => c.high < curr.high) &&
      nextCandles.every((c) => c.high < curr.high);
    const isSwingLow =
      prevCandles.every((c) => c.low > curr.low) &&
      nextCandles.every((c) => c.low > curr.low);

    if (isSwingHigh) {
      const lastHH = markers.slice().reverse().find((m) => m.text === 'HH');
      const lastHHCandle = lastHH
        ? candles.find((c) => c.time === lastHH.time)
        : null;
      markers.push({
        time: curr.time,
        position: 'aboveBar',
        color: '#EF5350',
        shape: 'arrowDown',
        text: !lastHHCandle || curr.high > lastHHCandle.high ? 'HH' : 'LH',
        size: 1,
      });
    }
    if (isSwingLow) {
      const lastLL = markers.slice().reverse().find((m) => m.text === 'LL');
      const lastLLCandle = lastLL
        ? candles.find((c) => c.time === lastLL.time)
        : null;
      markers.push({
        time: curr.time,
        position: 'belowBar',
        color: '#26A69A',
        shape: 'arrowUp',
        text: !lastLLCandle || curr.low < lastLLCandle.low ? 'LL' : 'HL',
        size: 1,
      });
    }
  }
  return markers;
}
