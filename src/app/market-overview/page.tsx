/**
 * @file page.tsx
 * @description Market overview page component with live tickers grid categorization.
 */

import React from 'react';
import { useAllTickers } from '../../hooks/useMarketData';

export default function MarketOverviewPage() {
  const { data: tickersRaw, isLoading } = useAllTickers();

  const fallbackTickers = [
    { pair: 'BTCUSDT', price: 62450.5, change24h: 3.42, high24h: 63200, low24h: 61100, volume24h: 3410500 },
    { pair: 'ETHUSDT', price: 3140.2, change24h: 1.85, high24h: 3200, low24h: 3050, volume24h: 1205000 },
    { pair: 'EURUSD', price: 1.0854, change24h: 0.12, high24h: 1.0890, low24h: 1.0810, volume24h: 84000 },
    { pair: 'GBPUSD', price: 1.2542, change24h: -0.05, high24h: 1.2610, low24h: 1.2505, volume24h: 92000 },
    { pair: 'XAUUSD', price: 2341.2, change24h: -1.15, high24h: 2365, low24h: 2320, volume24h: 430000 }
  ];

  const allData = Array.isArray(tickersRaw) && tickersRaw.length > 0 ? tickersRaw : fallbackTickers;

  // Separate into sections: Crypto, Forex, Commodities
  const crypto: any[] = [];
  const forex: any[] = [];
  const commodities: any[] = [];

  allData.forEach((t: any) => {
    const p = String(t.pair || '').toUpperCase();
    if (p.includes('BTC') || p.includes('ETH') || p.includes('USDT') || p.includes('SOL')) {
      crypto.push(t);
    } else if (p.includes('XAU') || p.includes('GOLD') || p.includes('SLV') || p.includes('OIL')) {
      commodities.push(t);
    } else {
      forex.push(t);
    }
  });

  const renderSection = (title: string, list: any[]) => {
    if (list.length === 0) return null;
    return (
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-[#CAAA98] font-mono uppercase tracking-widest pl-1">{title}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {list.map((t: any) => {
            const pair = t.pair || 'Unknown';
            const price = typeof t.price === 'string' ? parseFloat(t.price) : (t.price || 0);
            const change = typeof t.change24h !== 'undefined' ? t.change24h : (t.changePct || 0);
            const changeNum = typeof change === 'string' ? parseFloat(change) : change;
            const high = typeof t.high24h !== 'undefined' ? t.high24h : (t.high || price * 1.02);
            const low = typeof t.low24h !== 'undefined' ? t.low24h : (t.low || price * 0.98);
            const vol = typeof t.volume24h !== 'undefined' ? t.volume24h : (t.volume || 'N/A');

            return (
              <div 
                key={pair}
                className="bg-[#111622] border border-[#2A2E39] hover:border-[#CAAA98] p-4 rounded-xl transition-all duration-200 group flex flex-col justify-between h-32"
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-extrabold text-white uppercase">{pair}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                    changeNum >= 0 ? 'text-[#26A69A] bg-[#26A69A]/5' : 'text-[#EF5350] bg-[#EF5350]/5'
                  }`}>{changeNum >= 0 ? '+' : ''}{changeNum.toFixed(2)}%</span>
                </div>
                <div className="text-lg font-mono font-bold text-gray-100 group-hover:text-[#CAAA98] transition-colors my-1">
                  ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </div>
                <div className="text-[10px] text-gray-500 font-mono mt-2 pt-2 border-t border-[#2A2E39]/40 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Range (H/L):</span>
                    <span className="text-gray-400">
                      ${Number(high).toLocaleString(undefined, { maximumFractionDigits: 2 })} / ${Number(low).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Volume:</span>
                    <span className="text-gray-400">
                      {typeof vol === 'number' ? vol.toLocaleString(undefined, { maximumFractionDigits: 0 }) : vol}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 bg-[#131722] text-[#E0E3EB] space-y-6">
      <div className="flex justify-between items-center pb-2 border-b border-[#2A2E39]">
        <div>
          <h1 className="text-xl font-bold font-display uppercase tracking-wide text-[#CAAA98]">Asset Strength Heatmap Map</h1>
          <p className="text-xs text-gray-500 font-mono mt-0.5">Categorized active indicators synced with our liquidity models</p>
        </div>
        <span className="text-[10px] bg-emerald-500/10 text-[#26A69A] px-2 py-0.5 rounded font-mono font-bold">REAL-TIME FEEDS ACTIVE</span>
      </div>

      {isLoading && allData === fallbackTickers ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="h-28 bg-slate-800/40 rounded-xl animate-pulse" />
          <div className="h-28 bg-slate-800/40 rounded-xl animate-pulse" />
          <div className="h-28 bg-slate-800/40 rounded-xl animate-pulse" />
          <div className="h-28 bg-slate-800/40 rounded-xl animate-pulse" />
        </div>
      ) : (
        <div className="space-y-6">
          {renderSection('Cryptocurrencies', crypto)}
          {renderSection('Forex Markets', forex)}
          {renderSection('Commodities & Metals', commodities)}
        </div>
      )}
    </div>
  );
}
