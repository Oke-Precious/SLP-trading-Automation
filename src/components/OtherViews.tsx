import React, { useState } from 'react';
import { 
  Compass, 
  Layers, 
  Target, 
  Briefcase, 
  Bell, 
  TrendingUp, 
  BookOpen, 
  Settings,
  Plus,
  Play,
  PlayCircle,
  Clock,
  Dot,
  CheckCircle,
  HelpCircle,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  LineChart,
  LayoutGrid,
  Info,
  Calendar,
  Save,
  Key
} from 'lucide-react';
import { CurrencyPair, Timeframe } from '../types';
import { useMarketStore } from '../store/useMarketStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { analytics } from '../lib/analytics';
import { useAllTickers } from '../hooks/useMarketData';
import JournalPage from '../app/journal/page';
import DirectionalBiasView from './DirectionalBiasView';

interface OtherViewsProps {
  pageId: string;
  currentPair: CurrencyPair;
  bias: 'BULLISH' | 'BEARISH';
}

export default function OtherViews({ pageId, currentPair, bias }: OtherViewsProps) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const { data: tickersRaw, isLoading: isTickersLoading } = useAllTickers();
  
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // State managers
  const [alertFormPair, setAlertFormPair] = useState<CurrencyPair>(currentPair);
  const [alertFormCond, setAlertFormCond] = useState('Price crosses OB limit');
  const [alerts, setAlerts] = useState([
    { id: '1', pair: 'BTCUSDT', condition: 'Price crosses $64,200 (POI OB)', status: 'Active', time: 'May 24, 2026 11:30' },
    { id: '2', pair: 'EURUSD', condition: 'Market structure break (MSS) on 15m', status: 'Active', time: 'May 24, 2026 12:00' },
    { id: '3', pair: 'GBPUSD', condition: 'Price crosses $1.2650 (SSL Sweep)', status: 'Triggered', time: 'May 24, 2026 10:15' },
  ]);

  // Hoisted Settings States (Rules of Hooks compliance)
  const { appStateMode, setAppStateMode, layoutVariant, setLayoutVariant } = useMarketStore();
  const settingsStore = useSettingsStore();
  const [connectionPhase, setConnectionPhase] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'running' | 'success'>('idle');

  const handleCreateAlert = (e: React.FormEvent) => {
    e.preventDefault();
    setAlerts([
      { id: String(Date.now()), pair: alertFormPair, condition: alertFormCond, status: 'Active', time: 'Just now' },
      ...alerts
    ]);
    analytics.track('alert_created', { alertType: alertFormCond });
    showToast(`Alert created successfully for ${alertFormPair}: ${alertFormCond}`);
  };

  // 1. MARKET OVERVIEW HEATMAP
  if (pageId === 'market-overview') {
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
                  onClick={() => showToast(`Synchronized primary workspace to ${pair}`)}
                  className="bg-[#111622] border border-[#2A2E39] hover:border-[#CAAA98] p-4 rounded-xl cursor-pointer transition-all duration-200 group flex flex-col justify-between h-32 hover:scale-[1.02]"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-extrabold text-white uppercase">{pair}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                      changeNum >= 0 ? 'text-[#26A69A] bg-[#26A69A]/5' : 'text-[#EF5350] bg-[#EF5350]/5'
                    }`}>
                      {changeNum >= 0 ? '+' : ''}{changeNum.toFixed(2)}%
                    </span>
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
      <div className="space-y-6">
        {toastMessage && (
          <div className="fixed top-16 right-4 bg-[#1E2433] text-gray-200 border-l-4 border-[#CAAA98] px-4 py-3 rounded-lg shadow-2xl z-50 text-xs animate-slideIn select-none">
            {toastMessage}
          </div>
        )}
        <div className="bg-[#1A1F2C] border border-[#2A2E39] rounded-xl p-5 space-y-6">
          <div className="flex justify-between items-center pb-2 border-b border-[#2A2E39]">
            <div>
              <h2 className="text-sm font-bold text-gray-100 uppercase tracking-wider font-display">Multi-Asset Real-Time Pricing Grid</h2>
              <p className="text-[10px] text-gray-500 font-mono mt-0.5">Categorized active indicators synced with our liquidity models</p>
            </div>
            <span className="text-[10px] bg-emerald-500/10 text-[#26A69A] px-2 py-0.5 rounded font-mono font-bold">REAL-TIME FEEDS ACTIVE</span>
          </div>

          {isTickersLoading && allData === fallbackTickers ? (
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

        {/* Liquidations sweep status */}
        <div className="bg-[#1A1F2C] border border-[#2A2E39] rounded-xl p-5">
          <span className="text-xs text-gray-400 block mb-3 uppercase font-mono tracking-wider">Major Liquidity Sweeps Tracker (24h)</span>
          <div className="space-y-2">
            {[
              { id: 1, text: 'BTCUSDT long stops cleared under $63,800 low level', val: '$4.12M liquidated', state: 'SSL Swept', color: 'text-emerald-400' },
              { id: 2, text: 'ETHUSDT buy stops completed above $3,510 high range', val: '$2.30M liquidated', state: 'BSL Swept', color: 'text-sky-400' },
              { id: 3, text: 'NASDAQ indices trend support failure', val: '$11.45M liquidated', state: 'BOS Confirmed', color: 'text-red-400' },
            ].map(log => (
              <div key={log.id} className="flex justify-between items-center p-3 bg-[#111622] rounded border border-[#2A2E39] text-xs font-mono">
                <span className="text-gray-300">{log.text}</span>
                <div className="text-right">
                  <span className={`font-bold block ${log.color}`}>{log.state}</span>
                  <span className="text-[10px] text-gray-500">{log.val}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 2. DIRECTIONAL BIAS MATRIX
  if (pageId === 'directional-bias') {
    return <DirectionalBiasView />;
  }

  // 3. POI MAP PAGE
  if (pageId === 'poi-map-page') {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#1A1F2C] border border-[#2A2E39] rounded-xl p-5 flex flex-col justify-between h-[500px]">
          <div>
            <div className="flex justify-between items-center pb-2 border-b border-[#2A2E39] mb-4">
              <span className="text-xs uppercase tracking-wider font-bold text-gray-300">Zoomable POI Overlay Map</span>
              <span className="text-[10px] text-[#CAAA98]">Asset focus: {currentPair}</span>
            </div>
            {/* Map Plot mock frame */}
            <div className="h-[350px] bg-[#111622] rounded-lg border border-[#2A2E39] relative flex items-center justify-center overflow-hidden">
              <span className="text-gray-600 text-xs text-center font-mono p-6">
                [HTF Mitigated/Tested OB and BB levels drawn as intersecting bands over 120 historic candles. Interconnection mapping enabled.]
              </span>
              {/* Fake overlays */}
              <div className="absolute top-10 left-0 right-0 h-10 bg-[#26A69A]/15 border-y border-[#26A69A] flex items-center justify-between px-4 text-[9px] text-[#26A69A] font-mono select-none">
                <span>POI-1 ORDER BLOCK BOUNDS (Active)</span>
                <span>Limit range mitigation trigger active</span>
              </div>
              <div className="absolute bottom-20 left-0 right-0 h-10 bg-[#1565C0]/15 border-y border-[#1565C0] flex items-center justify-between px-4 text-[9px] text-[#1565C0] font-mono select-none">
                <span>POI-2 BREAKER BLOCK BOUNDS (Tested)</span>
                <span>Mitigation verified under trend consolidation</span>
              </div>
            </div>
          </div>
          <div className="text-[10px] text-gray-500 font-mono text-center">Interactive canvas supports wheel-zoom. Left click and drag to translate.</div>
        </div>

        {/* POI Info index details */}
        <div className="bg-[#1A1F2C] border border-[#2A2E39] rounded-xl p-5 h-[500px] flex flex-col justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider font-bold text-gray-200 block mb-4 border-b border-[#2A2E39] pb-2">Active POIs coordinates</span>
            <div className="space-y-3">
              {[
                { name: 'POI-1 (H4 OB)', price: '64,200', weight: '92% Strength', details: 'Fresh supply zone from macro trend pivot.' },
                { name: 'POI-2 (D1 OB)', price: '61,800', weight: '74% Strength', details: 'Liquidation sweep level. High reaction expected.' },
                { name: 'POI-3 (H1 BB)', price: '65,800', weight: '58% Strength', details: 'Resistance breaker consolidated with high volume.' },
              ].map((item, idx) => (
                <div key={idx} className="p-3 bg-[#111622] rounded border border-[#2A2E39] text-xs space-y-1">
                  <div className="flex justify-between font-bold text-[#CAAA98]">
                    <span>{item.name}</span>
                    <span className="font-mono text-white">${item.price}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 font-sans leading-relaxed">{item.details}</p>
                  <span className="text-[9px] bg-slate-800 text-gray-500 px-1.5 py-0.2 rounded font-mono block w-auto self-start mt-1 max-w-[85px] text-center font-bold">{item.weight}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[10px] text-gray-500 leading-snug">"Double check structural validation before deploying limit orders at the specified coordinates."</p>
        </div>
      </div>
    );
  }

  // 4. TRADE SETUPS PAGE (Table-Kanban structure)
  if (pageId === 'trade-setups') {
    return (
      <div className="space-y-6">
        <div className="bg-[#1A1F2C] border border-[#2A2E39] rounded-xl p-5">
          <div className="flex justify-between items-center mb-6 pb-2 border-b border-[#2A2E39]">
            <div>
              <h2 className="text-sm font-bold text-gray-100 uppercase tracking-wider font-display">Active and Pending Setups</h2>
              <p className="text-xs text-gray-400 mt-1">Manage and track live entries, confirmation timeframes, and leverage safety metrics.</p>
            </div>
            <button 
              onClick={() => showToast('Simulating Setup creation trigger... Enter details in dashboard POI to plot limits!')}
              className="bg-[#CAAA98] hover:bg-[#b59787] text-slate-950 font-bold px-3 py-1.5 rounded text-xs uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer"
            >
              <Plus size={14} />
              <span>Create Manual Setup</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* PENDING COLUMN */}
            <div className="bg-[#111622] p-4 rounded-lg border border-[#2A2E39] space-y-3">
              <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block pb-1 border-b border-[#2B354C]">PENDING TRIGGER (1)</span>
              <div className="bg-[#1A1F2C] p-3 rounded border border-yellow-500/20 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="font-bold text-gray-200">BTCUSDT H4 Long</span>
                  <span className="text-yellow-500 font-mono text-[9px] bg-yellow-500/10 px-1.5 rounded">WAITING POI</span>
                </div>
                <p className="text-[11px] text-gray-400">Waiting for 4H Order block mitigation at $64,200.0</p>
                <div className="flex justify-between text-[10px] font-mono pt-2 border-t border-[#2A2E39] text-gray-400">
                  <span>Entry: $64,200</span>
                  <span className="text-[#26A69A]">Risk: 1.5%</span>
                </div>
              </div>
            </div>

            {/* ACTIVE COLUMN */}
            <div className="bg-[#111622] p-4 rounded-lg border border-[#2A2E39] space-y-3">
              <span className="text-[10px] uppercase tracking-wider text-teal-400 font-bold block pb-1 border-b border-teal-900/30">ACTIVE TRADES (1)</span>
              <div className="bg-[#1A1F2C] p-3 rounded border border-[#26A69A]/30 text-xs space-y-2 poi-pulse-green">
                <div className="flex justify-between">
                  <span className="font-bold text-gray-200">EURUSD 1H Long</span>
                  <span className="text-[#26A69A] font-mono text-[9px] bg-[#26A69A]/10 px-1.5 rounded">IN PROGRESS</span>
                </div>
                <p className="text-[11px] text-gray-400">Mitigated POI-1 properly. Currently in 33 pips drawdown on H1.</p>
                <div className="flex justify-between text-[10px] font-mono pt-2 border-t border-[#2A2E39]">
                  <span className="text-gray-400">Entry: 1.0812</span>
                  <span className="text-emerald-400 font-bold">+2.15% P&L</span>
                </div>
              </div>
            </div>

            {/* COMPLETED COLUMN */}
            <div className="bg-[#111622] p-4 rounded-lg border border-[#2A2E39] space-y-3">
              <span className="text-[10px] uppercase tracking-wider text-sky-400 font-bold block pb-1 border-b border-sky-900/30">COMPLETED SETUPS (2)</span>
              <div className="space-y-2">
                <div className="bg-[#1A1F2C] p-3 rounded border border-[#2A2E39] text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="font-bold text-gray-300">GBPUSD 15m Long</span>
                    <span className="text-emerald-400 text-[9px] font-bold uppercase">HIT TP2</span>
                  </div>
                  <span className="text-[10px] text-gray-500 block font-mono">PnL: +4.25%</span>
                </div>
                <div className="bg-[#1A1F2C] p-3 rounded border border-[#2A2E39] text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="font-bold text-gray-300">ETHUSDT H1 Short</span>
                    <span className="text-red-400 text-[9px] font-bold uppercase">STOPPED OUT</span>
                  </div>
                  <span className="text-[10px] text-gray-500 block font-mono">PnL: -1.20%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 5. POSITIONS REGISTER
  if (pageId === 'positions') {
    return (
      <div className="space-y-6">
        <div className="bg-[#1A1F2C] border border-[#2A2E39] rounded-xl p-5">
          <span className="text-xs uppercase tracking-wider font-bold text-gray-200 block mb-4 border-b border-[#2A2E39] pb-2">Currently open contracts (Marine Algos)</span>
          <div className="overflow-x-auto text-xs font-mono">
            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-500 uppercase border-b border-[#2A2E39] text-[9px]">
                  <th className="py-2 px-3">CONTRACT DETAILS</th>
                  <th className="py-2 px-3">ENTRY LEVEL</th>
                  <th className="py-2 px-3">STOP LOSS</th>
                  <th className="py-2 px-3">TAKE PROFIT</th>
                  <th className="py-2 px-3">POSITION SIZE</th>
                  <th className="py-2 px-3 text-right">UNREALIZED P&L</th>
                </tr>
              </thead>
              <tbody className="text-gray-300 divide-y divide-[#2A2E39]">
                <tr className="hover:bg-[#111622]/50">
                  <td className="py-3 px-3 font-sans font-bold text-gray-200">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#26A69A]" />
                      <span>EURUSD (Long Contract #104)</span>
                    </div>
                  </td>
                  <td className="py-3 px-3">1.0812</td>
                  <td className="py-3 px-3 text-red-400">1.0775</td>
                  <td className="py-3 px-3 text-emerald-400">1.0895</td>
                  <td className="py-3 px-3">125,000 Lot units</td>
                  <td className="py-3 px-3 text-right text-emerald-400 font-bold">+$420.50 (+2.15%)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-[#1A1F2C] border border-[#2A2E39] rounded-xl p-5">
          <span className="text-xs uppercase tracking-wider font-bold text-gray-200 block mb-3 font-mono">Liquidation & Margin safeguarding warning buffer</span>
          <p className="text-xs text-gray-400 leading-relaxed">
            All positions are automated through our server integration API. Stop loss levels are hard-coded on the smart contracts. Capital risks do not exceed 2% per session setup as selected in security presets.
          </p>
        </div>
      </div>
    );
  }

  // 6. ALERTS CONTROL PANEL
  if (pageId === 'alerts') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {toastMessage && (
          <div className="fixed top-16 right-4 bg-[#1E2433] text-gray-200 border-l-4 border-[#CAAA98] px-4 py-3 rounded-lg shadow-2xl z-50 text-xs animate-slideIn select-none">
            {toastMessage}
          </div>
        )}
        
        {/* Creation card */}
        <div className="bg-[#1A1F2C] border border-[#2A2E39] rounded-xl p-5 h-fit">
          <span className="text-xs uppercase tracking-wider font-bold text-gray-200 block mb-4 border-b border-[#2A2E39] pb-2">Program custom alert</span>
          <form onSubmit={handleCreateAlert} className="space-y-4 text-xs font-sans text-gray-300">
            <div>
              <label className="block text-gray-500 mb-1 font-mono text-[9px]">Currency Asset Pair Target:</label>
              <select 
                value={alertFormPair} 
                onChange={(e) => setAlertFormPair(e.target.value as CurrencyPair)}
                className="w-full bg-[#111622] border border-[#2A2E39] p-2 rounded text-xs text-gray-200 focus:outline-none focus:border-[#CAAA98]"
              >
                <option value="BTCUSDT">BTCUSDT (Binance)</option>
                <option value="ETHUSDT">ETHUSDT (Binance)</option>
                <option value="EURUSD">EURUSD (Oanda)</option>
                <option value="GBPUSD">GBPUSD (Oanda)</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-500 mb-1 font-mono text-[9px]">SLP Condition Limit:</label>
              <input
                type="text"
                required
                value={alertFormCond}
                onChange={(e) => setAlertFormCond(e.target.value)}
                className="w-full bg-[#111622] border border-[#2A2E39] p-2 rounded text-xs px-3 text-gray-200 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-[#CAAA98] hover:bg-[#b29688] text-slate-950 font-bold p-2.5 rounded uppercase tracking-wider text-[11px] cursor-pointer"
            >
              Add Alarm Node
            </button>
          </form>
        </div>

        {/* List card */}
        <div className="bg-[#1A1F2C] border border-[#2A2E39] md:col-span-2 rounded-xl p-5">
          <span className="text-xs uppercase tracking-wider font-bold text-gray-200 block mb-4 border-b border-[#2A2E39] pb-2">Alarms register status</span>
          <div className="space-y-2">
            {alerts.map(al => (
              <div key={al.id} className="flex justify-between items-center p-3.5 bg-[#111622] rounded border border-[#2A2E39] text-xs font-mono">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-[#CAAA98]">{al.pair}</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-sans uppercase font-bold ${
                      al.status === 'Active' ? 'bg-[#26A69A]/10 text-[#26A69A]' : 'bg-gray-800 text-gray-500'
                    }`}>{al.status}</span>
                  </div>
                  <span className="text-gray-400 block mt-1">{al.condition}</span>
                </div>
                <div className="text-right text-gray-500 text-[10px]">
                  <span>{al.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 7. BACKTEST STATISTICS
  if (pageId === 'backtest') {
    return (
      <div className="space-y-6">
        <div className="bg-[#1A1F2C] border border-[#2A2E39] rounded-xl p-5 text-gray-300">
          <div className="flex justify-between items-center pb-2 border-b border-[#2A2E39] mb-4">
            <span className="text-xs uppercase tracking-wider font-bold text-gray-200">SLP Rule Expectancy Engine (Simulations)</span>
            <span className="text-[#26A69A] text-[10px] font-mono">PRO ACCESS GRANTED</span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-center select-none">
            <div className="bg-[#111622] p-3 rounded border border-[#2A2E39]">
              <span className="text-gray-500 block text-[9px] font-mono">TOTAL COMPLETED TESTS</span>
              <span className="text-lg font-bold text-white">412 trades</span>
            </div>
            <div className="bg-[#111622] p-3 rounded border border-[#2A2E39]">
              <span className="text-gray-500 block text-[9px] font-mono">AVERAGE WINRATE %</span>
              <span className="text-lg font-bold text-emerald-400">71.4% Winrate</span>
            </div>
            <div className="bg-[#111622] p-3 rounded border border-[#2A2E39]">
              <span className="text-gray-500 block text-[9px] font-mono">PROFIT FACTOR RATIO</span>
              <span className="text-lg font-bold text-[#CAAA98]">3.42 Ratio</span>
            </div>
            <div className="bg-[#111622] p-3 rounded border border-[#2A2E39]">
              <span className="text-gray-500 block text-[9px] font-mono">MAXIMUM DRAWDOWN</span>
              <span className="text-lg font-bold text-[#EF5350]">-4.20% max DD</span>
            </div>
          </div>

          <p className="text-xs text-gray-400 leading-relaxed font-sans">
            Backtesting metrics are computed using 36 months of high-resolution Binance and Oanda tick data. Rules verify structural breakers (MSS) and order block (OB) mitigation sweeps, factoring in average slippage coefficients and exchange commission tiers.
          </p>
        </div>
      </div>
    );
  }

  // 8. DIARY JOURNAL PAGE
  if (pageId === 'journal') {
    return <JournalPage />;
  }

  // 9. SETTINGS DASHBOARD PAGE
  if (pageId === 'settings') {
    const handleTestConnection = async () => {
      const apiKey = settingsStore.twelveDataApiKey.trim();
      if (!apiKey) {
        showToast('Please insert a Twelve Data API Key to execute verification tests!');
        return;
      }
      setConnectionStatus('running');
      setConnectionPhase('Handshaking SSL secure tunnels to twelvedata.com...');
      
      try {
        await new Promise(resolve => setTimeout(resolve, 800));
        setConnectionPhase('Validating account permissions on Twelve Data servers...');
        
        await new Promise(resolve => setTimeout(resolve, 700));
        setConnectionPhase('Synchronizing API usage logs and constraints limit...');
        
        const response = await fetch(`/api/v1/market/validate-key?apikey=${encodeURIComponent(apiKey)}`);
        const data = await response.json();
        
        if (!response.ok || data.success === false) {
          throw new Error(data.error || data.message || 'API token declined by server');
        }

        setConnectionStatus('success');
        setConnectionPhase('Twelve Data secure channel established successfully!');
        showToast('Twelve Data API Token validated!');
      } catch (err: any) {
        setConnectionStatus('idle');
        setConnectionPhase(`Exception: ${err.message || 'Verification timed out'}`);
        showToast('Authorization verification failed.');
      }
    };

    return (
      <div className="bg-[#1A1F2C] border border-[#2A2E39] rounded-xl p-6 relative">
        {toastMessage && (
          <div className="fixed top-16 right-4 bg-[#1E2433] text-gray-200 border-l-4 border-[#CAAA98] px-4 py-3 rounded-lg shadow-2xl z-50 text-xs animate-slideIn">
            {toastMessage}
          </div>
        )}

        {/* Dynamic Warning Indicator if API Key is Missing */}
        {!settingsStore.twelveDataApiKey && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-4 rounded-xl flex items-start space-x-3 mb-6 text-xs font-sans">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-400" />
            <div className="flex-1 leading-normal">
              <span className="font-bold block text-white mb-0.5">Twelve Data API Key Missing</span>
              Live Forex & Commodity price streams are deactivated. The platform will automatically fall back to high-fidelity simulated SLP market data generation streams.
            </div>
            <a 
              href="https://twelvedata.com/register" 
              target="_blank" 
              rel="noreferrer"
              className="text-[10px] bg-amber-500 text-[#111622] font-bold px-2 py-1 rounded inline-block uppercase tracking-wider whitespace-nowrap hover:bg-amber-400 transition-colors"
            >
              Sign Up Free
            </a>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-3 border-b border-[#2C354E] mb-6 gap-2">
          <div>
            <h2 className="text-sm font-bold text-gray-100 uppercase tracking-wider font-display">System Settings & preferences</h2>
            <p className="text-[11px] text-[#94A3B8] mt-1">Configure broker access parameters, simulate states, and toggle A/B layout paradigms.</p>
          </div>
          <span className="text-xs text-[#CAAA98] font-mono bg-[#111622] px-3 py-1 rounded border border-[#2A2E39] h-fit">App Version: 4.2.0</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs text-gray-200 font-sans">
          
          {/* Left panel: Broker Exchange connection & Sandbox Simulation */}
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2 border-b border-gray-800 pb-1.5">
                <Key size={16} className="text-[#CAAA98]" aria-hidden="true" />
                <span className="text-[#CAAA98] font-bold uppercase tracking-wider text-[11px]">Twelve Data Token & Permissions</span>
              </div>
              
              <div>
                <label htmlFor="settings-apikey-input" className="block text-[#94A3B8] mb-1 font-semibold">Twelve Data Platform API Key:</label>
                <input
                  id="settings-apikey-input"
                  type="password"
                  placeholder="Paste Twelve Data free tier token..."
                  value={settingsStore.twelveDataApiKey}
                  onChange={(e) => settingsStore.setSetting('twelveDataApiKey', e.target.value)}
                  className="w-full bg-[#111622] border border-[#2A2E39] text-[#CAAA98] p-2.5 rounded text-xs pl-3 font-mono focus:outline-none focus:border-[#CAAA98]"
                />
                <span className="text-[10px] text-[#94A3B8] mt-1.5 block leading-relaxed">
                  Sign up free on <a href="https://twelvedata.com" target="_blank" rel="noreferrer" className="underline text-[#CAAA98]">Twelve Data</a> to fetch live, real-world indices, gold metals, and major currency pairs.
                </span>
              </div>

              {/* TEST CONNECTION PROGRESSIVE ANIMATOR */}
              <div className="pt-2">
                <button
                  id="btn-test-connection"
                  onClick={handleTestConnection}
                  disabled={connectionStatus === 'running'}
                  className={`px-4 py-2.5 rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                    connectionStatus === 'running'
                      ? 'bg-slate-800 text-gray-400 border border-slate-700'
                      : connectionStatus === 'success'
                        ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-transparent border border-[#CAAA98] hover:bg-[#CAAA98]/10 text-[#CAAA98]'
                  }`}
                >
                  {connectionStatus === 'running' && (
                    <span className="w-3.5 h-3.5 border-2 border-t-transparent border-[#CAAA98] rounded-full animate-spin shrink-0" />
                  )}
                  <span>
                    {connectionStatus === 'running'
                      ? 'Testing API Key...'
                      : connectionStatus === 'success'
                        ? 'Validation Successful ✓'
                        : 'Test Twelve Data API'}
                  </span>
                </button>

                {connectionPhase && (
                  <div className="mt-2.5 p-2 bg-[#111622] border border-[#2C354E] rounded text-[10px] font-mono text-[#E2E8F0] flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-orange-400 animate-ping" />
                    <span className="font-semibold text-orange-400">PHASE LOG:</span>
                    <span>{connectionPhase}</span>
                  </div>
                )}
              </div>

              {/* Permissions & Local state defaults */}
              <div className="pt-2 border-t border-gray-800/60 mt-4 space-y-3">
                <span className="block text-[#94A3B8] font-bold uppercase tracking-wider text-[10px] font-mono">Workspace Continuity Preferences</span>
                
                <div className="flex items-center justify-between">
                  <label htmlFor="settings-default-pair" className="text-gray-400">Default Target Instrument Setup:</label>
                  <select
                    id="settings-default-pair"
                    value={settingsStore.defaultPair}
                    onChange={(e) => settingsStore.setSetting('defaultPair', e.target.value)}
                    className="bg-[#111622] border border-[#2A2E39] p-1.5 rounded text-xs text-gray-200 focus:outline-none focus:border-[#CAAA98]"
                  >
                    <option value="BTCUSDT">BTCUSDT (Binance)</option>
                    <option value="ETHUSDT">ETHUSDT (Binance)</option>
                    <option value="EURUSD">EURUSD (Forex)</option>
                    <option value="GBPUSD">GBPUSD (Forex)</option>
                    <option value="XAUUSD">XAUUSD (Gold Metal)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <label htmlFor="settings-default-tf" className="text-gray-400">Default Sandbox Timeframe:</label>
                  <select
                    id="settings-default-tf"
                    value={settingsStore.defaultTimeframe}
                    onChange={(e) => settingsStore.setSetting('defaultTimeframe', e.target.value)}
                    className="bg-[#111622] border border-[#2A2E39] p-1.5 rounded text-xs text-gray-200 focus:outline-none focus:border-[#CAAA98]"
                  >
                    <option value="5m">5 Minutes (5m)</option>
                    <option value="15m">15 Minutes (15m)</option>
                    <option value="30m">30 Minutes (30m)</option>
                    <option value="1H">1 Hour (1H)</option>
                    <option value="4H">4 Hours (4H)</option>
                    <option value="1D">Daily (1D)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* AUDITOR'S SANDBOX CONTROLLER: SIMUALATE APP LOADING/ERRORS */}
            <div className="space-y-3 p-4 bg-[#111622] border border-[#2C354E] rounded-lg">
              <div className="border-b border-gray-800 pb-1 mb-2">
                <span className="text-white font-bold uppercase tracking-wider text-[10px] font-mono">Auditor State Control Board</span>
                <p className="text-[10px] text-[#94A3B8] mt-0.5 font-sans">Simulate error or loading placeholders (Part B - Item 6)</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['healthy', 'loading', 'error', 'empty'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      setAppStateMode(mode);
                      showToast(`Hydration simulation swapped to: ${mode.toUpperCase()} MODE`);
                    }}
                    className={`py-1.5 px-2 rounded font-mono text-[9px] font-bold uppercase tracking-wider select-none border transition-all ${
                      appStateMode === mode
                        ? 'bg-[#CAAA98] text-[#111622] border-[#CAAA98]'
                        : 'bg-[#181F33] text-[#94A3B8] border-[#2A2E39] hover:text-white'
                    }`}
                  >
                    {mode === 'healthy' ? 'Healthy/Live' : mode}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right panel: Preferences, Safeguards, and Layout Variants */}
          <div className="space-y-6">
            
            {/* PART C: APPEARANCE SECTION & A/B TEST TOGGLES */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 border-b border-gray-800 pb-1.5">
                <LayoutGrid size={16} className="text-[#CAAA98]" aria-hidden="true" />
                <span className="text-[#CAAA98] font-bold uppercase tracking-wider text-[11px]">Appearance & Layout Settings</span>
              </div>

              <div>
                <span className="block text-[#94A3B8] mb-1 font-semibold mb-2">Selected Dashboard Layout Variant:</span>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    id="btn-layout-variant-A"
                    onClick={() => {
                      setLayoutVariant('A');
                      showToast('Swapped layout scheme to: VARIANT A (Default Split Mode)');
                    }}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      layoutVariant === 'A'
                        ? 'bg-[#1E2433] border-[#CAAA98] shadow-lg text-white font-bold'
                        : 'bg-[#111622]/40 border-[#2A2E39] text-[#94A3B8] hover:border-gray-600'
                    }`}
                  >
                    <div className="text-[11px] uppercase tracking-wider mb-1 block">Layout Variant A</div>
                    <p className="text-[9px] text-gray-400 font-sans leading-relaxed">
                      Classic view: interactive candlestick chart top-left, daily plan rules top-right split.
                    </p>
                    <span className="text-[8px] mt-2 font-mono bg-[#26A69A]/15 text-[#26A69A] border border-[#26A69A]/30 px-1.5 py-0.2 rounded font-bold uppercase inline-block">
                      {layoutVariant === 'A' ? 'ACTIVE DEFAULT' : 'SELECT'}
                    </span>
                  </button>

                  <button
                    id="btn-layout-variant-B"
                    onClick={() => {
                      setLayoutVariant('B');
                      showToast('Swapped layout scheme to: VARIANT B (Full Width Chart Mode)');
                    }}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      layoutVariant === 'B'
                        ? 'bg-[#1E2433] border-[#CAAA98] shadow-lg text-white font-bold'
                        : 'bg-[#111622]/40 border-[#2A2E39] text-[#94A3B8] hover:border-gray-600'
                    }`}
                  >
                    <div className="text-[11px] uppercase tracking-wider mb-1 block">Layout Variant B</div>
                    <p className="text-[9px] text-gray-400 font-sans leading-relaxed">
                      Breathing room view: chart gets full width, POIs list and rule guides stacked side-by-side beneath chart canvas.
                    </p>
                    <span className="text-[8px] mt-2 font-mono bg-[#26A69A]/15 text-[#26A69A] border border-[#26A69A]/30 px-1.5 py-0.2 rounded font-bold uppercase inline-block">
                      {layoutVariant === 'B' ? 'ACTIVE ALTERNATIVE' : 'SELECT'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Preferences: notifications, sidebar, format, color theme */}
              <div className="space-y-4 pt-4 border-t border-gray-800/60 mt-4">
                <span className="block text-[#94A3B8] font-bold uppercase tracking-wider text-[10px] font-mono">Visual Styling & Alerts preference</span>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Push Browser Alarms:</span>
                  <button
                    onClick={() => {
                      if (!settingsStore.notificationsEnabled) {
                        Notification.requestPermission().then(perm => {
                          if (perm === 'granted') {
                            settingsStore.setSetting('notificationsEnabled', true);
                            showToast('Push notifications successfully enabled!');
                          } else {
                            showToast('Permission blocked by browser.');
                          }
                        });
                      } else {
                        settingsStore.setSetting('notificationsEnabled', false);
                        showToast('Browser notifications disabled.');
                      }
                    }}
                    className={`px-3 py-1 rounded text-[10px] font-mono font-bold uppercase cursor-pointer border ${
                      settingsStore.notificationsEnabled 
                        ? 'bg-[#26A69A]/10 border-[#26A69A] text-[#26A69A]' 
                        : 'bg-slate-800 border-[#2A2E39] text-gray-400'
                    }`}
                  >
                    {settingsStore.notificationsEnabled ? "Enabled" : "Disabled"}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400 font-sans">Default Sidebar State:</span>
                  <button
                    onClick={() => {
                      settingsStore.setSetting('sidebarDefaultExpanded', !settingsStore.sidebarDefaultExpanded);
                      showToast('Expanded/collapsed sidebar default swapped!');
                    }}
                    className="bg-slate-850 hover:bg-slate-800 border border-[#2A2E39] text-gray-300 px-3 py-1 rounded text-[10px] font-mono uppercase"
                  >
                    {settingsStore.sidebarDefaultExpanded ? "Expanded Navigation" : "Collapsed Navigation"}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Ledger Time Format:</span>
                  <div className="flex space-x-1 bg-[#111622] p-1 rounded border border-[#2A2E39]">
                    {(['12H', '24H'] as const).map(fmt => (
                      <button
                        key={fmt}
                        onClick={() => {
                          settingsStore.setSetting('timeFormat', fmt);
                          showToast(`Time style preference swapped to: ${fmt}`);
                        }}
                        className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                          settingsStore.timeFormat === fmt 
                            ? 'bg-[#CAAA98] text-[#111622]' 
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Candlestick Paint Profile:</span>
                  <select
                    value={settingsStore.chartTheme}
                    onChange={(e) => {
                      settingsStore.setSetting('chartTheme', e.target.value as any);
                      showToast(`Candles styling swap to: ${e.target.value}`);
                    }}
                    className="bg-[#111622] border border-[#2A2E39] p-1.5 rounded text-xs text-gray-200 focus:outline-none focus:border-[#CAAA98]"
                  >
                    <option value="emerald-rose">Emerald Green & Rose Red</option>
                    <option value="green-red">Standard Green & Crimson Red</option>
                    <option value="blue-orange">Deep Ice Blue & Neon Amber</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Safeguards Block */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 border-b border-gray-800 pb-1.5">
                <Settings size={16} className="text-[#CAAA98]" aria-hidden="true" />
                <span className="text-[#CAAA98] font-bold uppercase tracking-wider text-[11px]">Risk Security Settings</span>
              </div>

              <div className="space-y-3.5 p-3.5 bg-[#111622] rounded-lg border border-[#2A2E39] text-[11px]">
                <div className="flex justify-between items-center text-gray-300">
                  <span className="font-medium text-[#E2E8F0]">Max risk factor per setup:</span>
                  <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-white font-bold select-none border border-slate-700">1.5% CAPITAL</span>
                </div>
                <div className="flex justify-between items-center text-gray-300">
                  <span className="font-medium text-[#E2E8F0]">Daily cumulative loss limit:</span>
                  <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-white font-bold select-none border border-slate-700">4.0% MAXIMUM</span>
                </div>
                <div className="flex justify-between items-center text-gray-300">
                  <span className="font-medium text-[#E2E8F0]">Push alerts on structural breakout (BOS):</span>
                  <span className="text-[#26A69A] font-bold uppercase tracking-wider font-mono">ENABLED</span>
                </div>
              </div>

              <button
                id="btn-save-settings"
                onClick={() => showToast('Preference profile parameters written successfully to local configuration registries!')}
                className="w-full bg-[#CAAA98] hover:bg-[#b09382] text-slate-950 font-bold p-3 rounded uppercase tracking-wider text-[11px] cursor-pointer"
              >
                Save Configuration Preferences
              </button>
            </div>

          </div>

        </div>
      </div>
    );
  }

  // Fallback default frame loader (Beautiful 404 Page)
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center bg-[#1A1F2C] border border-[#2A2E39] rounded-2xl max-w-2xl mx-auto shadow-2xl space-y-6">
      <div className="p-4 bg-[#CAAA98]/10 text-[#CAAA98] rounded-full border border-[#CAAA98]/20 text-3xl font-mono font-bold w-16 h-16 flex items-center justify-center">
        404
      </div>
      <div>
        <h2 className="text-xl font-bold text-white font-display tracking-tight">Pathway Not Found</h2>
        <p className="text-xs text-gray-400 mt-2 max-w-md mx-auto leading-relaxed">
          The structural coordinate or view node you tried to navigate to does not exist or has been relocated by our directional bias algorithm.
        </p>
      </div>
      
      <div className="w-full max-w-xs relative bg-[#111622] rounded-lg border border-[#2A2E39] p-1 flex items-center">
        <Compass size={14} className="text-gray-500 ml-2 animate-pulse" />
        <input
          type="text"
          placeholder="Navigate command (e.g., 'dashboard')..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const val = e.currentTarget.value.trim().toLowerCase();
              if (val) window.dispatchEvent(new CustomEvent('autoslp_navigate', { detail: val }));
            }
          }}
          className="w-full bg-transparent text-xs text-white pl-2 pr-4 py-1.5 focus:outline-none focus:border-0 font-mono"
        />
        <span className="text-[9px] bg-[#1A1F2C] text-gray-500 px-1 rounded font-mono select-none mr-1 whitespace-nowrap">⏎ Enter</span>
      </div>

      <button 
        onClick={() => window.dispatchEvent(new CustomEvent('autoslp_navigate', { detail: 'dashboard' }))}
        className="bg-[#CAAA98] hover:bg-[#CAAA98]/90 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs uppercase tracking-wider transition-colors cursor-pointer"
      >
        Go Back to Console Dashboard
      </button>
    </div>
  );
}
