import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import SpecsHub from '../SpecsHub';
import { useUIStore } from '../../store/useUIStore';
import { useMarketStore } from '../../store/useMarketStore';
import { Search, Globe, X } from 'lucide-react';
import FeedbackWidget from '../FeedbackWidget';

export default function MainLayout() {
  const sidebarExpanded = useUIStore((state) => state.sidebarExpanded);
  const currentPair = useMarketStore((state) => state.selectedPair);
  const setCurrentPair = useMarketStore((state) => state.setSelectedPair);
  const currentTimeframe = useMarketStore((state) => state.selectedTimeframe);
  const setCurrentTimeframe = useMarketStore((state) => state.setSelectedTimeframe);
  
  const [isSpecsHubOpen, setIsSpecsHubOpen] = useState(false);
  const [initialSpecsTab, setInitialSpecsTab] = useState<'spec' | 'user_docs' | 'dev_docs' | 'personas'>('spec');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingProgress, setLoadingProgress] = useState<number | null>(null);
  
  // GDPR Cookie Consent States
  const [showCookieBanner, setShowCookieBanner] = useState(false);
  const [cookieConsent, setCookieConsent] = useState<{ essentialOnly: boolean; optOutAnalytics: boolean } | null>(null);
  
  const [online, setOnline] = useState(typeof window !== 'undefined' ? window.navigator.onLine : true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const consent = localStorage.getItem('autoslp_cookie_consent_v1');
    if (!consent) {
      setShowCookieBanner(true);
    } else {
      setCookieConsent(JSON.parse(consent));
    }
  }, []);

  const handleAcceptAll = () => {
    const consent = { essentialOnly: false, optOutAnalytics: false };
    localStorage.setItem('autoslp_cookie_consent_v1', JSON.stringify(consent));
    setCookieConsent(consent);
    setShowCookieBanner(false);
  };

  const handleAcceptEssential = () => {
    const consent = { essentialOnly: true, optOutAnalytics: true };
    localStorage.setItem('autoslp_cookie_consent_v1', JSON.stringify(consent));
    setCookieConsent(consent);
    setShowCookieBanner(false);
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        useUIStore.getState().toggleSidebar();
      }
      const isInputActive = 
        document.activeElement?.tagName === 'INPUT' || 
        document.activeElement?.tagName === 'TEXTAREA' || 
        document.activeElement?.getAttribute('contenteditable') === 'true';

      if (!isInputActive) {
        if (e.key === '1') { e.preventDefault(); setCurrentTimeframe('1D'); }
        if (e.key === '2') { e.preventDefault(); setCurrentTimeframe('4H'); }
        if (e.key === '3') { e.preventDefault(); setCurrentTimeframe('1H'); }
        if (e.key === '4') { e.preventDefault(); setCurrentTimeframe('30m'); }
        if (e.key === '5') { e.preventDefault(); setCurrentTimeframe('15m'); }
        if (e.key === '6') { e.preventDefault(); setCurrentTimeframe('5m'); }
      }

      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsSpecsHubOpen(false);
        const escEvent = new CustomEvent('autoslp_escape_pressed');
        window.dispatchEvent(escEvent);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setCurrentTimeframe]);

  const searchItems = [
    { type: 'Asset', label: 'BTCUSDT', phrase: 'Switch main asset to Bitcoin (BINANCE)', action: () => setCurrentPair('BTCUSDT') },
    { type: 'Asset', label: 'ETHUSDT', phrase: 'Switch main asset to Ethereum (BINANCE)', action: () => setCurrentPair('ETHUSDT') },
    { type: 'Asset', label: 'EURUSD', phrase: 'Switch main asset to Euro (OANDA Forex)', action: () => setCurrentPair('EURUSD') },
    { type: 'Asset', label: 'GBPUSD', phrase: 'Switch main asset to Pound (OANDA Forex)', action: () => setCurrentPair('GBPUSD') },
    { type: 'System', label: 'Show Technical Specifications Blueprint', phrase: 'Open product specifications markdown files', action: () => { setInitialSpecsTab('spec'); setIsSpecsHubOpen(true); } },
    { type: 'System', label: 'Show User Manual & FAQs', phrase: 'Learn how to navigate, configure, and troubleshoot the app', action: () => { setInitialSpecsTab('user_docs'); setIsSpecsHubOpen(true); } },
    { type: 'System', label: 'Show Developer & Architecture Guide', phrase: 'Technical standards, code walkthroughs, and db schemas', action: () => { setInitialSpecsTab('dev_docs'); setIsSpecsHubOpen(true); } },
    { type: 'System', label: 'Show Trader Personas Dossiers', phrase: 'Browse Marcus, Chloe, or David dossiers', action: () => { setInitialSpecsTab('personas'); setIsSpecsHubOpen(true); } }
  ];

  const filteredSearchItems = searchItems.filter(item => 
    item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.phrase.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div 
      id="applet-viewport" 
      className={`min-h-screen bg-[#111622] text-gray-100 font-sans flex flex-col justify-between overflow-x-hidden pt-12 transition-all duration-300 ${
        sidebarExpanded ? 'md:pl-[220px]' : 'md:pl-[64px]'
      } pl-0 pb-20 md:pb-4`}
    >
      {loadingProgress !== null && (
        <div 
          id="loading-progress-bar"
          className="fixed top-0 left-0 h-[2px] bg-[#CAAA98] transition-all duration-150 ease-out z-[99999]"
          style={{ width: `${loadingProgress}%` }}
        />
      )}
      <Header 
        onOpenSpecs={() => { setInitialSpecsTab('spec'); setIsSpecsHubOpen(true); }}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      {!online && (
        <div id="offline-global-banner" className="bg-red-500/90 text-white text-xs font-mono py-2.5 px-4 flex items-center justify-center gap-2 z-50 relative shrink-0">
          <Globe size={14} className="animate-pulse" />
          <span>You are currently offline. AutoSLP will automatically resume live data synchronization once connection is restored.</span>
        </div>
      )}

      <Sidebar 
        openPersonasModal={() => { setInitialSpecsTab('personas'); setIsSpecsHubOpen(true); }}
      />

      <main id="automata-workspace-viewport" className="flex-1 p-6 max-w-7xl mx-auto w-full transition-all duration-300">
        <div id="workspace-context-head" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center space-x-2 text-xs text-gray-500 font-mono tracking-wider uppercase">
              <span>Main Workspace</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-white mt-1 flex items-center space-x-2">
              <span>AutoSLP Global Trading Console</span>
              <span className="text-[10px] bg-slate-800 text-[#CAAA98] border border-[#CAAA98]/20 px-2 py-0.5 rounded font-mono font-medium tracking-normal h-fit uppercase">V4.2</span>
            </h1>
          </div>
          <div className="flex items-center space-x-2.5">
            <span className="hidden sm:inline font-mono text-[10px] text-gray-500 tracking-wider">
              SLP ALGO SYSTEMS READY
            </span>
            <div className="w-2.5 h-2.5 rounded-full bg-[#26A69A] animate-ping" title="API Streams Active" />
          </div>
        </div>
        <Outlet />
      </main>

      {isSpecsHubOpen && (
        <SpecsHub 
          onClose={() => setIsSpecsHubOpen(false)} 
          initialTab={initialSpecsTab}
        />
      )}

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
            </div>
            <div className="p-3 bg-[#1E2433] border-t border-[#2A2E39] text-center text-[10px] font-mono text-gray-500 flex justify-between select-none">
              <span>Arrow Keys to navigate</span>
              <span>ESC to dismiss command hub</span>
            </div>
          </div>
        </div>
      )}

      <footer className="w-full bg-[#111622] py-4 text-center border-t border-[#2A2E39]/40 select-none flex flex-col items-center justify-center gap-2 mt-auto">
        <span className="font-mono text-[10px] text-gray-600 tracking-wider uppercase">
          AutoSLP Algorithmic Solutions &bull; May 2026 Sandbox Preview Mode
        </span>
        <div className="flex space-x-4 text-[10px] font-mono text-gray-500">
          <a href="#" className="hover:text-[#CAAA98] transition-colors">Privacy Policy</a>
          <span>&middot;</span>
          <a href="#" className="hover:text-[#CAAA98] transition-colors">Terms of Service</a>
          <span>&middot;</span>
          <button 
            onClick={() => {
              const updated = { essentialOnly: true, optOutAnalytics: true };
              localStorage.setItem('autoslp_cookie_consent_v1', JSON.stringify(updated));
              setCookieConsent(updated);
              alert('Successfully Opted Out of Analytics, saving essential preference.');
            }} 
            className="hover:text-[#CAAA98] transition-colors uppercase tracking-tight underline cursor-pointer"
          >
            {cookieConsent?.optOutAnalytics ? "Analytics: Opted Out" : "Opt out of Analytics"}
          </button>
        </div>
      </footer>

      {showCookieBanner && (
        <div 
          id="cookie-consent-overlay-banner"
          className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:max-w-md bg-[#1B2131] border border-[#2A344C] rounded-xl shadow-2xl p-5 z-50 flex flex-col gap-3 font-sans"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 bg-[#CAAA98]/10 text-[#CAAA98] rounded">
                <Globe size={16} />
              </div>
              <h3 className="text-sm font-bold text-white tracking-wide">Cookie Privacy Consent</h3>
            </div>
            <button 
              onClick={() => setShowCookieBanner(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={15} />
            </button>
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed font-normal">
            We employ essential cookies for secure login sessions, 2FA profiles, and state continuity. Analytics cookies remain optional, disabled by default. You can change your selection at any time.
          </p>
          <div className="flex items-center space-x-2 mt-1">
            <button 
              onClick={handleAcceptAll}
              className="flex-1 bg-[#CAAA98] hover:bg-[#CAAA98]/90 text-slate-950 text-[10px] font-bold py-1.5 px-3 rounded cursor-pointer uppercase tracking-wider transition-colors"
            >
              Accept All
            </button>
            <button 
              onClick={handleAcceptEssential}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-gray-300 hover:text-white text-[10px] font-bold py-1.5 px-3 rounded cursor-pointer border border-slate-700 uppercase tracking-wider transition-colors"
            >
              Essential Only
            </button>
          </div>
        </div>
      )}

      <FeedbackWidget />
    </div>
  );
}
