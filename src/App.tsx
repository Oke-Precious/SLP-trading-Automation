import React, { useState, useEffect } from 'react';
import { 
  Search, 
  HelpCircle, 
  Clock, 
  Check, 
  Slash,
  AlertTriangle,
  User,
  Users,
  Terminal,
  Grid,
  FileCode,
  Globe,
  Settings,
  Target,
  Bell,
  X
} from 'lucide-react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import OtherViews from './components/OtherViews';
import SpecsHub from './components/SpecsHub';
import { CurrencyPair, Timeframe } from './types';

export default function App() {
  const [activePage, setActivePage] = useState<string>('dashboard');
  const [currentPair, setCurrentPair] = useState<CurrencyPair>('BTCUSDT');
  const [currentTimeframe, setCurrentTimeframe] = useState<Timeframe>('4H');
  const [isSpecsHubOpen, setIsSpecsHubOpen] = useState(false);
  const [initialSpecsTab, setInitialSpecsTab] = useState<'spec' | 'personas'>('spec');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Dynamic Directional Bias matrix computed realistically to give high-fidelity interactions
  const getCalculatedBias = (pair: CurrencyPair, tf: Timeframe): 'BULLISH' | 'BEARISH' => {
    // Return custom layouts so when users select combinations, flags react appropriately
    if (pair === 'BTCUSDT') {
      return tf === '30m' ? 'BEARISH' : 'BULLISH';
    }
    if (pair === 'ETHUSDT') {
      return (tf === '1H' || tf === '30m' || tf === '15m') ? 'BEARISH' : 'BULLISH';
    }
    if (pair === 'EURUSD') {
      return tf === '4H' ? 'BEARISH' : 'BULLISH';
    }
    // GBPUSD is strongly bullish
    return 'BULLISH';
  };

  const bias = getCalculatedBias(currentPair, currentTimeframe);

  // Command palette search items
  const searchItems = [
    { type: 'Asset', label: 'BTCUSDT', phrase: 'Switch main asset to Bitcoin (BINANCE)', action: () => setCurrentPair('BTCUSDT') },
    { type: 'Asset', label: 'ETHUSDT', phrase: 'Switch main asset to Ethereum (BINANCE)', action: () => setCurrentPair('ETHUSDT') },
    { type: 'Asset', label: 'EURUSD', phrase: 'Switch main asset to Euro (OANDA Forex)', action: () => setCurrentPair('EURUSD') },
    { type: 'Asset', label: 'GBPUSD', phrase: 'Switch main asset to Pound (OANDA Forex)', action: () => setCurrentPair('GBPUSD') },
    { type: 'Navigation', label: 'Market Overview Heatmap', phrase: 'Go to multi-pair heatmap', action: () => { setActivePage('market-overview'); } },
    { type: 'Navigation', label: 'Directional Bias Matrix', phrase: 'Access structural biases matrix', action: () => { setActivePage('directional-bias'); } },
    { type: 'Navigation', label: 'POI Map Zoom View', phrase: 'Open high timeframe POI map canvas', action: () => { setActivePage('poi-map-page'); } },
    { type: 'Navigation', label: 'Trade Setups Board', phrase: 'Go to live structures & limit setups', action: () => { setActivePage('trade-setups'); } },
    { type: 'Navigation', label: 'Backtest Strategy Engine', phrase: 'Run strategy expectancy backtests', action: () => { setActivePage('backtest'); } },
    { type: 'Navigation', label: 'Diary Trade Journal', phrase: 'Open sessions diary log calendar', action: () => { setActivePage('journal'); } },
    { type: 'System', label: 'Show Technical Specifications Blueprint', phrase: 'Open product specifications markdown files', action: () => { setInitialSpecsTab('spec'); setIsSpecsHubOpen(true); } },
    { type: 'System', label: 'Show Trader Personas Dossiers', phrase: 'Browse Marcus, Chloe, or David dossiers', action: () => { setInitialSpecsTab('personas'); setIsSpecsHubOpen(true); } }
  ];

  const filteredSearchItems = searchItems.filter(item => 
    item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.phrase.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div id="applet-viewport" className="min-h-screen bg-[#111622] text-gray-100 font-sans flex flex-col justify-between overflow-x-hidden pt-12 pl-[64px]">
      
      {/* 1. TOP SUPREME HEADER BAR */}
      <Header 
        currentPair={currentPair}
        setCurrentPair={setCurrentPair}
        currentTimeframe={currentTimeframe}
        setCurrentTimeframe={setCurrentTimeframe}
        bias={bias}
        onOpenSpecs={() => { setInitialSpecsTab('spec'); setIsSpecsHubOpen(true); }}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      {/* 2. PERSISTENT COLLAPSIBLE SIDE NAV RAIL Bar */}
      <Sidebar 
        activePage={activePage} 
        setActivePage={setActivePage} 
        openPersonasModal={() => { setInitialSpecsTab('personas'); setIsSpecsHubOpen(true); }}
      />

      {/* 3. CORE ADAPTIVE WORKSPACE VIEW WRAPPER */}
      <main id="automata-workspace-viewport" className="flex-1 p-6 max-w-7xl mx-auto w-full transition-all duration-300">
        
        {/* Dynamic header contextual segment */}
        <div id="workspace-context-head" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center space-x-2 text-xs text-gray-500 font-mono tracking-wider uppercase">
              <span>Main Workspace</span>
              <span className="text-[10px] text-gray-600 font-sans">/</span>
              <span className="text-[#CAAA98] font-bold">{activePage.replace('-', ' ')}</span>
            </div>
            
            <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-white mt-1 flex items-center space-x-2">
              <span>AutoSLP Global Trading Console</span>
              <span className="text-[10px] bg-slate-800 text-[#CAAA98] border border-[#CAAA98]/20 px-2 py-0.5 rounded font-mono font-medium tracking-normal h-fit uppercase">V4.2</span>
            </h1>
          </div>

          <div className="flex items-center space-x-2.5">
            {/* Direct Quick Specs link */}
            <span className="hidden sm:inline font-mono text-[10px] text-gray-500 tracking-wider">
              SMC ALGO SYSTEMS READY
            </span>
            <div className="w-2.5 h-2.5 rounded-full bg-[#26A69A] animate-ping" title="API Streams Active" />
          </div>
        </div>

        {/* Workspace Dynamic Core Switcher Router */}
        {activePage === 'dashboard' ? (
          <DashboardView 
            currentPair={currentPair}
            currentTimeframe={currentTimeframe}
            setCurrentTimeframe={setCurrentTimeframe}
            bias={bias}
          />
        ) : (
          <OtherViews 
            pageId={activePage}
            currentPair={currentPair}
            bias={bias}
          />
        )}
      </main>

      {/* 4. TECHNICAL SPECIFICATION HUB OVERLAY (MODAL INTERACTIVE POPUP) */}
      {isSpecsHubOpen && (
        <SpecsHub 
          onClose={() => setIsSpecsHubOpen(false)} 
          initialTab={initialSpecsTab}
        />
      )}

      {/* 5. GREGARIOUS COMMAND PALETTE SEARCH ORGANIZER (CMD+K INTERACTION) */}
      {isSearchOpen && (
        <div 
          id="global-search-command-palette"
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-[15vh] p-4 animate-fadeIn"
          onClick={() => setIsSearchOpen(false)}
        >
          <div 
            className="bg-[#1A1F2C] border border-[#2A2E39] w-full max-w-lg rounded-xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-[#1E2433] border-b border-[#2A2E39] flex items-center space-x-3">
              <Search className="text-[#CAAA98]" size={18} />
              <input
                type="text"
                autoFocus
                placeholder="Type and jump (e.g. 'BTC', 'Bias', 'Spec', 'Gear')..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-0"
              />
              <button 
                onClick={() => setIsSearchOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto p-2 divide-y divide-[#2A2E39]/40 bg-[#111622]">
              {filteredSearchItems.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    item.action();
                    setIsSearchOpen(false);
                    setSearchQuery('');
                  }}
                  className="w-full text-left p-3 hover:bg-[#1A1F2C] rounded-lg transition-colors flex items-center justify-between group cursor-pointer"
                >
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded font-mono mr-2.5">
                      {item.type}
                    </span>
                    <span className="text-xs font-semibold text-gray-200 group-hover:text-[#CAAA98] transition-colors">
                      {item.label}
                    </span>
                    <p className="text-[10px] text-gray-400 mt-1 leading-snug">{item.phrase}</p>
                  </div>
                  <span className="text-gray-600 text-[10px] font-mono group-hover:text-gray-400 font-bold pr-1">ENT &rarr;</span>
                </button>
              ))}

              {filteredSearchItems.length === 0 && (
                <div className="text-center py-8 text-gray-500 text-xs font-mono">
                  No directory pathways found matching "{searchQuery}"
                </div>
              )}
            </div>

            <div className="p-3 bg-[#1E2433] border-t border-[#2A2E39] text-center text-[10px] font-mono text-gray-500 flex justify-between select-none">
              <span>Arrow Keys to navigate</span>
              <span>ESC to dismiss command hub</span>
            </div>
          </div>
        </div>
      )}

      {/* 6. STATIC SECURE FOOTER */}
      <footer className="w-full bg-[#111622] py-4 text-center border-t border-[#2A2E39]/40 select-none">
        <span className="font-mono text-[10px] text-gray-600 tracking-wider uppercase pb-1 block">
          AutoSLP Algorithmic Solutions &bull; May 2026 Sandbox Preview Mode
        </span>
      </footer>

    </div>
  );
}
