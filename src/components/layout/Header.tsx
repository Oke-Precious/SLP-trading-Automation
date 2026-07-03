/**
 * @file Header.tsx
 * @description Layout header for asset and timeframe selection, coupled with Zustand.
 */

import React, { useEffect, useState, useRef } from 'react';
import { 
  Search, 
  Bell, 
  HelpCircle, 
  FileText, 
  ChevronDown,
  ChevronUp,
  Menu,
  Star,
  Pin
} from 'lucide-react';
import { CurrencyPair, Timeframe } from '../../types';
import { useMarketStore } from '../../store/useMarketStore';
import { useBiasStore } from '../../store/useBiasStore';
import { useUIStore } from '../../store/useUIStore';
import { useAuthStore } from '../../store/useAuthStore';
import { onSignalCreated, onAlertTriggered, onPOIStatusChange } from '../../lib/websocket/client';
import { useRealtimeTicker } from '../../hooks/useRealtimeTicker';
import { ALL_INSTRUMENTS, formatPrice } from '../../lib/market/marketDataService';

export interface HeaderProps {
  onOpenSpecs: () => void;
  onOpenSearch: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  onOpenSpecs,
  onOpenSearch
}) => {
  const { selectedPair, setSelectedPair, selectedTimeframe, setSelectedTimeframe } = useMarketStore();
  const { user, clearAuth } = useAuthStore();
  const { ticker } = useRealtimeTicker(selectedPair);
  const { biasMap } = useBiasStore();
  
  const bias = biasMap[selectedPair]?.[selectedTimeframe] || 'BULLISH';
  
  const [pulse, setPulse] = useState(false);
  const prevBiasRef = useRef(bias);

  useEffect(() => {
    if (prevBiasRef.current !== bias) {
      setPulse(true);
      const timer = setTimeout(() => setPulse(false), 1000);
      prevBiasRef.current = bias;
      return () => clearTimeout(timer);
    }
  }, [bias]);
  
  const isExpanded = useUIStore((state) => state.sidebarExpanded);
  const toggleMobileSidebar = useUIStore((state) => state.toggleMobileSidebar);
  const connectionStatus = useUIStore((state) => state.connectionStatus);

  const [dateTimeStr, setDateTimeStr] = useState('');
  const [showPairMenu, setShowPairMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Timeframe pinning and dropdown states
  const [pinnedTimeframes, setPinnedTimeframes] = useState<Timeframe[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('autoslp_pinned_timeframes');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
    return ['15m', '1H', '4H', '1D']; // sensible defaults matching core layouts
  });

  const [tfDropdownOpen, setTfDropdownOpen] = useState(false);
  const tfDropdownRef = useRef<HTMLDivElement>(null);
  const pairSelectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('autoslp_pinned_timeframes', JSON.stringify(pinnedTimeframes));
    }
  }, [pinnedTimeframes]);

  // Click outside dropdowns listener
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Close timeframe dropdown if clicked outside
      if (tfDropdownRef.current && !tfDropdownRef.current.contains(target)) {
        setTfDropdownOpen(false);
      }
      
      // Close pair selector if clicked outside
      if (pairSelectorRef.current && !pairSelectorRef.current.contains(target)) {
        setShowPairMenu(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  const togglePinTimeframe = (tf: Timeframe) => {
    setPinnedTimeframes((prev) => {
      if (prev.includes(tf)) {
        // Allow unpinning, but keep at least 1 timeframe to avoid empty bars
        if (prev.length <= 1) return prev;
        return prev.filter((p) => p !== tf);
      } else {
        // Enforce the requested maximum of 7 pinned timeframes
        if (prev.length >= 7) {
          return prev;
        }
        return [...prev, tf];
      }
    });
  };

  const [notifications, setNotifications] = useState([
    { id: '1', title: 'BOS Confirmed (BTCUSDT H4)', desc: 'Break of Structure identified at $67,400', time: '5m ago', type: 'structure' },
    { id: '2', title: 'POI Mitigation Warning (ETHUSDT H1)', desc: 'Price entered the lower order block', time: '14m ago', type: 'mitigation' },
    { id: '3', title: 'New Signal Long Generated', desc: 'AutoSLP entry triggered for GBPUSD', time: '1h ago', type: 'signal' },
  ]);

  useEffect(() => {
    // Request permission on-demand when header mounts
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }

    const triggerNotification = (title: string, desc: string, type = 'signal') => {
      // 1. Browser push constructor
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(title, { body: desc });
        } catch (err) {
          console.error('Push notification failed to trigger:', err);
        }
      }

      // 2. Prepend in-app notification state
      setNotifications((prev) => [
        {
          id: 'ws-' + Date.now(),
          title,
          desc,
          time: 'Just now',
          type,
        },
        ...prev,
      ]);
    };

    // WebSocket Listeners
    const unsubSignal = onSignalCreated((signal: any) => {
      triggerNotification(
        `New Signal Created: ${signal.pair} ${signal.direction}`,
        `A high-probability setup was identified at key structural levels.`
      );
    });

    const unsubAlert = onAlertTriggered((alert: any) => {
      triggerNotification(
        `Alert Triggered: ${alert.pair}`,
        `Target condition hit: ${alert.condition}`
      );
    });

    const unsubPOI = onPOIStatusChange((poi: any) => {
      triggerNotification(
        `POI Zone Updated: ${poi.name}`,
        `POI block status mutated to ${poi.status}.`
      );
    });

    return () => {
      unsubSignal();
      unsubAlert();
      unsubPOI();
    };
  }, []);

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

  const timeframes: Timeframe[] = [
    '1m', '3m', '5m', '15m', '30m', '45m',
    '1H', '2H', '4H', '8H', '12H',
    '1D', '1W', '1M'
  ];

  const filteredInstruments = ALL_INSTRUMENTS.filter(ins => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return ins.symbol.toLowerCase().includes(q) || ins.name.toLowerCase().includes(q);
  });

  const groupedInstruments = {
    Crypto: filteredInstruments.filter(ins => ins.category === 'crypto'),
    Forex: filteredInstruments.filter(ins => ins.category === 'forex'),
    Commodity: filteredInstruments.filter(ins => ins.category === 'commodity'),
    Index: filteredInstruments.filter(ins => ins.category === 'index'),
  };

  const activeInstrument = ALL_INSTRUMENTS.find(i => i.symbol === selectedPair);
  const activeExchange = activeInstrument?.category === 'crypto' ? 'BINANCE' : 'OANDA';


  return (
    <header 
      id="root-layout-header"
      className={`fixed top-0 right-0 h-12 bg-card border-b border-[#2A2E39] px-4 flex items-center justify-between z-40 select-none font-sans transition-all duration-200 ease-in-out w-full md:w-[calc(100vw-${isExpanded ? '220px' : '64px'})]`}
      style={{
        left: typeof window !== 'undefined' && window.innerWidth < 768 ? 0 : isExpanded ? '220px' : '64px'
      }}
    >
      <div className="flex items-center space-x-2 md:space-x-4 min-w-[140px] md:min-w-[240px]">
        <button 
          className="md:hidden p-1.5 text-gray-400 hover:text-white" 
          onClick={toggleMobileSidebar}
        >
          <Menu size={20} />
        </button>
        <div className="flex flex-col justify-center">
          <div className="flex items-center space-x-1.5 animate-fade-in">
            <span className="text-light font-bold tracking-tight text-sm font-display">AutoSLP</span>
            <span className="hidden xs:inline-block text-white font-bold tracking-tight text-xs bg-slate-800 px-1.5 py-0.5 rounded scale-90">TRADER</span>
            <div className="flex items-center space-x-1 shadow-sm border-l border-slate-700 pl-2">
              <span className={`w-1.5 h-1.5 rounded-full ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-500 shadow-[0_0_8px_rgb(16,185,129)]'
                  : connectionStatus === 'connecting'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-rose-500'
              }`} />
              <span className="hidden sm:inline-block text-[8px] text-gray-400 uppercase font-mono tracking-wider">
                {connectionStatus}
              </span>
            </div>
          </div>
          <span className="hidden sm:inline-block text-[9px] text-warm font-mono leading-none tracking-widest mt-0.5 uppercase">
            Directional Bias System
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-1.5 sm:space-x-4 lg:space-x-6">
        <div className="relative" ref={pairSelectorRef}>
          <button 
            id="pair-selector-dropdown-trigger"
            onClick={() => setShowPairMenu(!showPairMenu)}
            className="flex items-center space-x-1 sm:space-x-2 bg-surface hover:bg-[#1C202F] text-gray-200 px-2 py-1 sm:px-3 sm:py-1 rounded-md border border-[#2A2E39] text-xs font-mono transition-colors cursor-pointer h-7"
          >
            <span className="hidden xs:inline-block text-gray-500 text-[9px] bg-slate-900 px-1.5 py-0.5 rounded mr-1">
              {activeExchange}
            </span>
            <span className="font-bold text-light text-xs sm:text-xs">{selectedPair}</span>
            <ChevronDown size={12} className="text-gray-400" />
          </button>

          {showPairMenu && (
            <div className="absolute left-0 mt-1 w-80 bg-[#1A1F2C] border border-[#2A2E39] rounded-md shadow-2xl z-50 p-2 max-h-[30rem] overflow-y-auto">
              <div className="p-1 mb-2 border-b border-[#2A2E39] flex items-center space-x-1.5">
                <Search size={12} className="text-gray-400" />
                <input
                  type="text"
                  placeholder="Search pairs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#111622] text-xs border border-transparent rounded px-2 py-1 text-white focus:outline-none focus:border-[#2A2E39] font-mono"
                  autoFocus
                />
              </div>

              <div className="space-y-3">
                {Object.entries(groupedInstruments).map(([groupName, items]) => {
                  if (items.length === 0) return null;
                  return (
                    <div key={groupName} className="space-y-1">
                      <div className="text-[9px] text-gray-500 uppercase font-bold tracking-wider px-2">
                        {groupName}
                      </div>
                      {items.map((ins) => {
                        const isSelected = selectedPair === ins.symbol;
                        const twoLetter = ins.base ? ins.base.slice(0, 2) : ins.symbol.slice(0, 2);
                        return (
                          <button
                            key={ins.symbol}
                            onClick={() => {
                              setSelectedPair(ins.symbol);
                              setShowPairMenu(false);
                              setSearchQuery('');
                            }}
                            className={`w-full flex items-center justify-between px-2 py-1.5 text-xs text-left hover:bg-[#202738] rounded cursor-pointer transition-colors ${
                              isSelected ? 'text-light bg-surface font-semibold' : 'text-gray-300'
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              <span className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 text-[#CAAA98] font-bold text-[8px] uppercase">
                                {twoLetter}
                              </span>
                              <div className="flex flex-col">
                                <span className="font-bold text-white font-mono">{ins.symbol}</span>
                                <span className="text-[10px] text-gray-400 font-sans">{ins.name}</span>
                              </div>
                            </div>
                            <span className="text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider font-mono text-gray-500 bg-slate-900 leading-none">
                              {ins.category}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
                {filteredInstruments.length === 0 && (
                  <div className="text-center py-4 text-xs text-gray-500 font-mono">
                    No matching pairs
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-1 sm:space-x-2" ref={tfDropdownRef}>
          {/* Pinned Timeframe Shortcuts */}
          <div className="hidden md:flex bg-surface border border-[#2A2E39] rounded-lg p-0.5 whitespace-nowrap scrollbar-none">
            {pinnedTimeframes.map((tf) => (
              <button
                key={tf}
                onClick={() => setSelectedTimeframe(tf)}
                className={`px-2.5 py-0.5 rounded text-xs transition-all duration-200 cursor-pointer font-mono ${
                  selectedTimeframe === tf 
                    ? 'bg-[#2A3245] text-[#CAAA98] font-bold shadow-inner' 
                    : 'text-gray-400 hover:text-white hover:bg-[#202738]/50'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* All Timeframes Dropdown */}
          <div className="relative">
            <button
              onClick={() => setTfDropdownOpen(!tfDropdownOpen)}
              className={`flex items-center space-x-1 bg-surface hover:bg-[#1C202F] text-gray-200 px-2 sm:px-3 py-1 rounded-md border border-[#2A2E39] text-xs font-mono transition-colors cursor-pointer h-7 ${
                !pinnedTimeframes.includes(selectedTimeframe) ? 'border-[#CAAA98]/40 bg-[#CAAA98]/5 text-[#CAAA98]' : ''
              }`}
              title="Select timeframe"
            >
              <span className="font-semibold text-xs">
                {selectedTimeframe}
              </span>
              <ChevronDown size={12} className="text-gray-400" />
            </button>

            {tfDropdownOpen && (
              <div className="absolute right-0 mt-1 w-56 bg-[#1A1F2C] border border-[#2A2E39] rounded-md shadow-2xl z-50 p-1 animate-in fade-in slide-in-from-top-1 duration-100">
                <div className="px-2.5 py-1.5 text-[9px] text-gray-500 font-bold uppercase tracking-wider border-b border-[#2A2E39] mb-1 flex justify-between items-center select-none">
                  <span>Select Timeframe</span>
                  <span className="text-gray-400 font-normal lowercase">({pinnedTimeframes.length}/7 pinned)</span>
                </div>
                <div className="max-h-60 overflow-y-auto scrollbar-none space-y-0.5">
                  {timeframes.map((tf) => {
                    const isPinned = pinnedTimeframes.includes(tf);
                    const isSelected = selectedTimeframe === tf;
                    return (
                      <div
                        key={tf}
                        className={`flex items-center justify-between rounded px-2 py-1 text-xs font-mono hover:bg-[#202738] transition-colors group ${
                          isSelected ? 'bg-[#2A3245]/40 text-light' : 'text-gray-400'
                        }`}
                      >
                        <button
                          onClick={() => {
                            setSelectedTimeframe(tf);
                            setTfDropdownOpen(false);
                          }}
                          className="flex-1 text-left py-0.5 cursor-pointer text-white"
                        >
                          {tf} {isSelected && <span className="text-[10px] text-[#CAAA98] ml-1.5">(active)</span>}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePinTimeframe(tf);
                          }}
                          className={`p-1.5 rounded cursor-pointer transition-colors ${
                            isPinned 
                              ? 'text-amber-400 hover:text-amber-500 hover:bg-amber-500/10' 
                              : 'text-gray-600 hover:text-gray-200 hover:bg-gray-700/30'
                          }`}
                          title={isPinned ? 'Unpin from navbar' : 'Pin to navbar'}
                        >
                          <Star size={12} className={isPinned ? 'fill-current' : ''} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {ticker && (
          <div className="text-gray-400 text-xs font-mono hidden lg:flex border-l border-[#2A2E39] pl-6 space-x-5 items-center">
            <div>
              <span className="text-[9px] text-gray-500 uppercase tracking-wider block leading-none mb-1">Price</span>
              <span className="text-white font-extrabold text-sm">${formatPrice(ticker.price, selectedPair)}</span>
            </div>
            <div>
              <span className="text-[9px] text-gray-500 uppercase tracking-wider block leading-none mb-1">24h Change</span>
              <span className={`font-extrabold text-xs ${ticker.changePct24h >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                {ticker.changePct24h >= 0 ? '+' : ''}
                {ticker.changePct24h.toFixed(2)}%
              </span>
            </div>
            <div className="text-[10px] text-gray-500 space-y-0.5 leading-none">
              <div>H: <span className="text-gray-300 font-bold">{formatPrice(ticker.high24h, selectedPair)}</span></div>
              <div>L: <span className="text-gray-300 font-bold">{formatPrice(ticker.low24h, selectedPair)}</span></div>
            </div>
          </div>
        )}

        <div className="text-gray-400 text-xs font-mono hidden xl:block border-l border-[#2A2E39] pl-6">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider block leading-none mb-0.5">Analysis Clock</span>
          <span className="text-light">{dateTimeStr}</span>
        </div>

        <div className="hidden sm:flex border-l border-[#2A2E39] pl-4 lg:pl-6 items-center shadow-sm">
          <div 
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider transition-all duration-300 ${
              pulse ? 'scale-110 ring-2 ring-[#CAAA98] animate-pulse duration-500 bg-opacity-35' : ''
            } ${
              bias === 'BULLISH' 
                ? 'bg-[#26A69A]/15 text-bullish border border-[#26A69A]/35' 
                : bias === 'BEARISH'
                  ? 'bg-[#EF5350]/15 text-bearish border border-[#EF5350]/35'
                  : 'bg-slate-700/15 text-gray-400 border border-slate-700/30'
            }`}
            title={`Zustand Aligned: ${bias}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${bias === 'BULLISH' ? 'bg-bullish' : bias === 'BEARISH' ? 'bg-bearish' : 'bg-gray-400'}`} />
            <span>{bias}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <button
          onClick={onOpenSpecs}
          className="flex items-center space-x-1.5 bg-light/10 hover:bg-light/20 text-light border border-light/30 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all duration-200 hover:scale-105"
        >
          <FileText size={15} />
          <span className="hidden sm:inline">Docs & Blueprints</span>
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
            aria-label="Notification Bell"
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

        {/* User Dropdown Avatar Option */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center space-x-1 focus:outline-none cursor-pointer p-1 rounded-md hover:bg-[#2A3245]"
          >
            <div className="w-7 h-7 rounded-full bg-slate-700 border border-[#CAAA98] flex items-center justify-center text-white font-bold text-xs uppercase">
              {(user?.username || 'Trader')[0]}
            </div>
            <ChevronDown size={12} className="text-gray-400" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-[#1A1F2C] border border-[#2A2E39] rounded-md shadow-2xl z-50 p-1">
              <div className="px-3 py-1.5 border-b border-[#2A2E39] text-[10px] text-gray-400 font-mono uppercase">
                {user?.username || 'Marcus Vance'}
              </div>
              <button
                onClick={() => {
                  onOpenSpecs();
                  setUserMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-[#202738] rounded cursor-pointer"
              >
                Trader Personas
              </button>
              <div className="w-[calc(100%-8px)] mx-1 my-1 px-3 py-1.5 text-[10px] text-emerald-400 bg-emerald-500/10 font-bold uppercase tracking-wider rounded select-none text-center">
                {user?.plan || 'PRO PLAN'} ACTIVE
              </div>
              <div className="border-t border-[#2A2E39] my-1" />
              <button
                onClick={async () => {
                  setUserMenuOpen(false);
                  try {
                    const { signOut } = await import('firebase/auth');
                    const { auth } = await import('../../lib/firebase/firebase');
                    await signOut(auth);
                  } catch (e) {
                    console.error("Firebase signOut exception in Header:", e);
                  }
                  clearAuth();
                }}
                className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-[#202738] rounded cursor-pointer"
              >
                Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
