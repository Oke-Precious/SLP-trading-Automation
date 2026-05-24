/**
 * @file CandlestickChart.tsx
 * @description Candlestick rendering using TradingView lightweight-charts with live react-query and websocket streams.
 */

import React, { useEffect, useRef } from 'react';
import { createChart, UTCTimestamp } from 'lightweight-charts';
import { useMarketStore } from '../../store/useMarketStore';
import { useCandles } from '../../hooks/useMarketData';
import { useRealtimeCandles } from '../../lib/websocket/hooks';

export interface CandlestickChartProps {
  height?: number;
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({ height = 400 }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const { selectedPair, selectedTimeframe } = useMarketStore();
  
  // Real-time hooks integration
  const { data: candles, isLoading, isError } = useCandles(selectedPair, selectedTimeframe);
  useRealtimeCandles(selectedPair, selectedTimeframe);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const handleResize = () => {
      if (chart && chartContainerRef.current) {
        chart.resize(chartContainerRef.current.clientWidth, height);
      }
    };

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
    });

    const candlestickSeries = (chart as any).addCandlestickSeries({
      upColor: '#26A69A',
      downColor: '#EF5350',
      borderVisible: false,
      wickUpColor: '#26A69A',
      wickDownColor: '#EF5350',
    });

    // Populate using live or fallback queries
    const activeData = candles || [];
    const mData = activeData
      .map((c: any) => ({
        time: (c.time > 1000000000000 ? Math.floor(c.time / 1000) : c.time) as UTCTimestamp,
        open: Number(c.open),
        high: Number(c.high),
        low: Number(c.low),
        close: Number(c.close),
      }))
      // Sort in ascending order by time (immutable sorting)
      .slice()
      .sort((a, b) => a.time - b.time);

    // Filter duplicates if any
    const uniqueMap = new Map<number, typeof mData[0]>();
    mData.forEach((item) => {
      uniqueMap.set(item.time, item);
    });
    const finalData = Array.from(uniqueMap.values());

    if (finalData.length > 0) {
      candlestickSeries.setData(finalData);
      chart.timeScale().fitContent();
    }

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [candles, height, selectedPair, selectedTimeframe]);

  return (
    <div className="relative bg-[#131722] border border-[#2A2E39] rounded-xl overflow-hidden p-2">
      <div className="absolute top-4 left-4 z-10 flex items-center space-x-2 font-mono text-xs text-light">
        <span className="font-bold uppercase text-white">{selectedPair}</span>
        <span className="bg-[#2A3245] px-1.5 py-0.5 rounded text-[10px] text-gray-400 font-semibold">{selectedTimeframe}</span>
        {isError ? (
          <span className="text-[10px] text-zinc-500 font-bold font-mono uppercase tracking-wider">&bull; OFFLINE STREAMING MODE</span>
        ) : isLoading ? (
          <span className="text-[10px] text-amber-500 font-bold animate-pulse font-mono uppercase tracking-wider">&bull; FETCHING HISTORICAL...</span>
        ) : (
          <span className="text-[10px] text-emerald-400 font-bold animate-pulse font-mono uppercase tracking-wider">&bull; LIVE DATAFEED ACTIVE</span>
        )}
      </div>
      <div ref={chartContainerRef} className="w-full animate-fade-in" style={{ height: `${height}px` }} />
    </div>
  );
};

export default CandlestickChart;

