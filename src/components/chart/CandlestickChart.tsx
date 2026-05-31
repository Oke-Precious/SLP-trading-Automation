/**
 * @file CandlestickChart.tsx
 * @description Candlestick rendering using TradingView lightweight-charts mapped to use real-query candles.
 */

import React, { useEffect, useRef } from 'react';
import { createChart, UTCTimestamp } from 'lightweight-charts';
import { useMarketStore } from '../../store/useMarketStore';
import { useCandles } from '../../hooks/useMarketData';
import { Skeleton } from '../ui/Skeleton';
import { Button } from '../ui/Button';

export interface CandlestickChartProps {
  height?: number;
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({ height = 400 }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);
  
  const { selectedPair, selectedTimeframe } = useMarketStore();
  
  // Real-time hooks integration
  const { data: candles, isLoading, isError, refetch } = useCandles();

  // Initialize TradingView lightweight chart instance
  useEffect(() => {
    if (!chartContainerRef.current || isLoading || isError || !candles) return;

    const container = chartContainerRef.current;
    
    // Create the lightweight chart
    const chart = createChart(container, {
      width: container.clientWidth,
      height: height,
      layout: {
        background: { color: '#131722' },
        textColor: '#D9D9D9',
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.3)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.3)' },
      },
      timeScale: {
        borderColor: '#2A2E39',
        timeVisible: true,
      },
    }) as any;

    const series = chart.addCandlestickSeries({
      upColor: '#26A69A',
      downColor: '#EF5350',
      borderVisible: false,
      wickUpColor: '#26A69A',
      wickDownColor: '#EF5350',
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const handleResize = () => {
      if (chart && container) {
        chart.resize(container.clientWidth, height);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [isLoading, isError, candles, height]);

  // Load and format candle data onto series instance
  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!candles || !series || !chart) return;

    const formatted = candles.map((c: any) => {
      const timestamp = c.timestamp ? new Date(c.timestamp).getTime() : (c.time > 10000000000 ? c.time : c.time * 1000);
      return {
        time: Math.floor(timestamp / 1000) as UTCTimestamp,
        open: parseFloat(c.open || c.openPrice || '0'),
        high: parseFloat(c.high || c.highPrice || '0'),
        low: parseFloat(c.low || c.lowPrice || '0'),
        close: parseFloat(c.close || c.closePrice || '0'),
      };
    }).sort((a: any, b: any) => a.time - b.time);

    // Keep unique time keys to avoid TradingView duplicate key asserts
    const uniqueMap = new Map<number, typeof formatted[0]>();
    formatted.forEach((item: any) => {
      uniqueMap.set(item.time, item);
    });
    const finalData = Array.from(uniqueMap.values());

    if (finalData.length > 0) {
      series.setData(finalData);
      chart.timeScale().fitContent();
    }
  }, [candles]);

  if (isLoading) {
    return (
      <div className="relative bg-[#131722] border border-[#2A2E39] rounded-xl overflow-hidden p-4 flex flex-col justify-between" style={{ height: `${height + 24}px` }}>
        <div className="flex justify-between items-center mb-4">
          <div className="flex space-x-2">
            <Skeleton className="w-24 h-6" />
            <Skeleton className="w-12 h-6" />
          </div>
          <Skeleton className="w-32 h-6" />
        </div>
        <Skeleton className="w-full flex-grow rounded" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="relative bg-[#131722] border border-[#2A2E39] rounded-xl overflow-hidden p-6 flex flex-col items-center justify-center text-center" style={{ height: `${height + 24}px` }}>
        <div className="max-w-md space-y-4">
          <div className="mx-auto w-12 h-12 bg-red-950/50 border border-red-500/30 rounded-full flex items-center justify-center text-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h3 className="text-white font-medium text-lg">Failed to Load Candlestick Data</h3>
          <p className="text-gray-400 text-sm">There was an issue connecting to the market api service. Please verify your connection status and attempt again.</p>
          <Button onClick={() => refetch()} variant="secondary" className="mt-2">
            Retry Connection
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-[#131722] border border-[#2A2E39] rounded-xl overflow-hidden p-2">
      <div className="absolute top-4 left-4 z-10 flex items-center space-x-2 font-mono text-xs text-light">
        <span className="font-bold uppercase text-white">{selectedPair}</span>
        <span className="bg-[#2A3245] px-1.5 py-0.5 rounded text-[10px] text-gray-400 font-semibold">{selectedTimeframe}</span>
        <span className="text-[10px] text-emerald-400 font-bold animate-pulse font-mono uppercase tracking-wider">&bull; LIVE DATAFEED ACTIVE</span>
      </div>
      <div ref={chartContainerRef} className="w-full animate-fade-in" style={{ height: `${height}px` }} />
    </div>
  );
};

export default CandlestickChart;
