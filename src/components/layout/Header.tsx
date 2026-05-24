/**
 * @file Header.tsx
 * @description Layout header for asset and timeframe selection, coupled with Zustand.
 */

import React, { useEffect, useState } from 'react';
import { 
  Search, 
  Bell, 
  HelpCircle, 
  FileText, 
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { CurrencyPair, Timeframe } from '../../types';
import { useMarketStore } from '../../store/useMarketStore';
import { useBiasStore } from '../../store/useBiasStore';

export interface HeaderProps {
  onOpenSpecs: () => void;
  onOpenSearch: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  onOpenSpecs,
  onOpenSearch
}) => {
  const { selectedPair, setSelectedPair, selectedTimeframe, setSelectedTimeframe } = useMarketStore();
  const biasMap = useBiasStore((state) => state.biasMap);
  const bias = biasMap[selectedPair]?.[selectedTimeframe] || 'BULLISH';

  const [dateTimeStr, setDateTimeStr] = useState('');
  const [showPairMenu, setShowPairMenu] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      };
      setDateTimeStr(now.toLocaleString('en-US', options).replace(',', ''));
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const pairs: { label: CurrencyPair; exchange: string }[] = [
    { label: 'BTCUSDT', exchange: 'BINANCE' },
    { label: 'ETHUSDT', exchange: 'BINANCE' },
    { label: 'EURUSD', exchange: 'OANDA' },
    { label: 'GBPUSD', exchange: 'OANDA' }
  ];

  const timeframes: Timeframe[] = ['1D', '4H', '1H', '30m', '15m'];

  const notifications = [
    { id: 1, title: 'BOS Confirmed (BTCUSDT H4)', desc: 'Break of Structure identified at $67,400', time: '5m ago', type: 'structure' },
    { id: 2, title: 'POI Mitigation Warning (ETHUSDT H1)', desc: 'Price entered the lower order block', time: '14m ago', type: 'mitigation' },
    { id: 3, title: 'New Signal Long Generated', desc: 'AutoSLP entry triggered for GBPUSD', time: '1h ago', type: 'signal' },
  ];

  return (
    <header 
      id="root-layout-header"
      className="fixed top-0 left-0 right-0 h-12 bg-card border-b border-[#2A2E39] px-4 flex items-center justify-between z-50 select-none font-sans"
    >
      <div className="flex items-center space-x-4 min-w-[240px]">
        <div className="flex flex-col justify-center">
          <div className="flex items-center space-x-1.5">
            <span className="text-light font-bold tracking-tight text-sm font-display">AutoSLP</span>
            <span className="text-white font-bold tracking-tight text-xs bg-slate-800 px-1 py-0.2 rounded scale-90">TRADER</span>
          </div>
          <span className="text-[9px] text-warm font-mono leading-none tracking-widest mt-0.5 uppercase">
            Directional Bias System
          </span>
        </div>
      </div>

      <div className="hidden lg:flex items-center space-x-6">
        <div className="relative">
          <button 
            id="pair-selector-dropdown-trigger"
            onClick={() => setShowPairMenu(!showPairMenu)}
            className="flex items-center space-x-2 bg-surface hover:bg-[#1C202F] text-gray-200 px-3 py-1 rounded-md border border-[#2A2E39] text-xs font-mono transition-colors cursor-pointer"
          >
            <span className="text-gray-500 text-[9px] bg-slate-900 px-1.5 py-0.5 rounded mr-1">
              {pairs.find(p => p.label === selectedPair)?.exchange || 'BINANCE'}
            </span>
            <span className="font-bold text-light">{selectedPair}</span>
            <ChevronDown size={14} className="text-gray-400" />
          </button>

          {showPairMenu && (
            <div className="absolute left-0 mt-1 w-44 bg-[#1A1F2C] border border-[#2A2E39] rounded-md shadow-2xl z-50 p-1">
              {pairs.map((p) => (
                <button
                  key={p.label}
                  onClick={() => {
                    setSelectedPair(p.label);
                    setShowPairMenu(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-mono text-left hover:bg-[#202738] rounded cursor-pointer ${
                    selectedPair === p.label ? 'text-light bg-surface font-semibold' : 'text-gray-300'
                  }`}
                >
                  <span>{p.label}</span>
                  <span className="text-[9px] text-gray-500 font-mono italic">{p.exchange}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex bg-surface border border-[#2A2E39] rounded-full p-0.5">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => setSelectedTimeframe(tf)}
              className={`px-3 py-0.5 rounded-full text-xs transition-all duration-200 cursor-pointer ${
                selectedTimeframe === tf 
                  ? 'bg-[#2A3245] text-light font-semibold shadow-inner' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        <div className="text-gray-400 text-xs font-mono hidden xl:block border-l border-[#2A2E39] pl-6">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider block leading-none mb-0.5">Analysis Clock</span>
          <span className="text-light">{dateTimeStr}</span>
        </div>

        <div className="border-l border-[#2A2E39] pl-6 flex items-center shadow-sm">
          <div 
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider transition-colors duration-300 animate-pulse ${
              bias === 'BULLISH' 
                ? 'bg-bullish/15 text-bullish border border-bullish/30 poi-pulse-green' 
                : 'bg-bearish/15 text-bearish border border-bearish/30 poi-pulse-blue'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${bias === 'BULLISH' ? 'bg-bullish' : 'bg-bearish'}`} />
            <span>{bias} BIAS</span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <button
          onClick={onOpenSpecs}
          className="flex items-center space-x-1.5 bg-light/10 hover:bg-light/20 text-light border border-light/30 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all duration-200 hover:scale-105"
        >
          <FileText size={15} />
          <span className="hidden sm:inline">Specs & Personas</span>
        </button>

        <button
          onClick={onOpenSearch}
          className="hidden sm:flex items-center space-x-2 bg-surface hover:bg-[#1C202F] text-gray-400 hover:text-white px-3 py-1.5 rounded-md border border-[#2A2E39] text-xs font-mono transition-colors cursor-pointer"
        >
          <Search size={14} />
          <span>Search...</span>
          <span className="text-[10px] bg-slate-800 text-gray-500 px-1 py-0.2 rounded">⌘K</span>
        </button>

        <div className="relative">
          <button
            onClick={() => setNotificationOpen(!notificationOpen)}
            className="relative text-gray-400 hover:text-white p-1.5 hover:bg-surface rounded-md transition-colors cursor-pointer"
          >
            <Bell size={18} />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border border-[#1E2433] rounded-full flex items-center justify-center">
              <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
            </span>
          </button>

          {notificationOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-[#1A1F2C] border border-[#2A2E39] rounded-md shadow-2xl z-50 p-1">
              <div className="px-3 py-2 border-b border-[#2A2E39] flex items-center justify-between">
                <span className="text-xs font-bold text-gray-200 uppercase tracking-wider font-display">System Notifications</span>
                <span className="text-[10px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded font-mono font-semibold">3 Active</span>
              </div>
              <div className="divide-y divide-[#2A2E39]">
                {notifications.map((n) => (
                  <div key={n.id} className="p-3 hover:bg-[#202738] transition-colors cursor-pointer">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-semibold text-light">{n.title}</span>
                      <span className="text-[9px] text-gray-500">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">{n.desc}</p>
                  </div>
                ))}
              </div>
              <div className="p-2 border-t border-[#2A2E39] text-center">
                <button 
                  onClick={() => setNotificationOpen(false)}
                  className="text-xs text-gray-400 hover:text-white cursor-pointer w-full text-center py-1"
                >
                  Dismiss All
                </button>
              </div>
            </div>
          )}
        </div>

        <button className="text-gray-400 hover:text-white p-1.5 hover:bg-surface rounded-md transition-colors hidden sm:block">
          <HelpCircle size={18} />
        </button>
      </div>
    </header>
  );
};

export default Header;
