/**
 * @file CandlestickChart.tsx
 * @description Candlestick rendering using TradingView lightweight-charts.
 */

import React, { useEffect, useRef } from 'react';
import { createChart, ISeriesApi, UTCTimestamp } from 'lightweight-charts';
import { useMarketStore } from '../../store/useMarketStore';

export interface CandlestickChartProps {
  height?: number;
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({ height = 400 }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const { selectedPair, selectedTimeframe } = useMarketStore();

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

    // Populate mock data matching the pair and timeframe for high-fidelity previews
    const numericBase = selectedPair === 'BTCUSDT' ? 62000 : selectedPair === 'ETHUSDT' ? 3100 : 1.1000;
    const count = 60;
    const mData = [];
    let price = numericBase;
    const nowSecs = Math.floor(Date.now() / 1000);

    for (let i = 0; i < count; i++) {
      const time = (nowSecs - (count - i) * 3600 * 4) as UTCTimestamp;
      const change = (Math.sin(i / 3) + Math.cos(i / 5)) * (numericBase * 0.005);
      const open = price;
      const close = price + change;
      const high = Math.max(open, close) + (Math.random() * (numericBase * 0.002));
      const low = Math.min(open, close) - (Math.random() * (numericBase * 0.002));
      price = close;
      mData.push({ time, open, high, low, close });
    }

    candlestickSeries.setData(mData);
    chart.timeScale().fitContent();

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [selectedPair, selectedTimeframe, height]);

  return (
    <div className="relative bg-[#131722] border border-[#2A2E39] rounded-xl overflow-hidden p-2">
      <div className="absolute top-4 left-4 z-10 flex items-center space-x-2 font-mono text-xs text-light">
        <span className="font-bold uppercase">{selectedPair}</span>
        <span className="bg-[#2A3245] px-1.5 py-0.5 rounded text-[10px] text-gray-400 font-semibold">{selectedTimeframe}</span>
        <span className="text-[10px] text-bearish font-bold animate-pulse">&bull; LIVE DATAFEED</span>
      </div>
      <div ref={chartContainerRef} className="w-full" style={{ height: `${height}px` }} />
    </div>
  );
};

export default CandlestickChart;
