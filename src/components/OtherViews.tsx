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

interface OtherViewsProps {
  pageId: string;
  currentPair: CurrencyPair;
  bias: 'BULLISH' | 'BEARISH';
}

export default function OtherViews({ pageId, currentPair, bias }: OtherViewsProps) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
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

  const handleCreateAlert = (e: React.FormEvent) => {
    e.preventDefault();
    setAlerts([
      { id: String(Date.now()), pair: alertFormPair, condition: alertFormCond, status: 'Active', time: 'Just now' },
      ...alerts
    ]);
    showToast(`Alert created successfully for ${alertFormPair}: ${alertFormCond}`);
  };

  // 1. MARKET OVERVIEW HEATMAP
  if (pageId === 'market-overview') {
    const marketPairs = [
      { pair: 'BTCUSDT', price: '64,720.5', change: '+2.4%', state: 'BULLISH', volume: '$124M', activity: 'High' },
      { pair: 'ETHUSDT', price: '3,442.2', change: '+1.8%', state: 'BULLISH', volume: '$84M', activity: 'High' },
      { pair: 'GBPUSD', price: '1.2715', change: '+0.15%', state: 'BULLISH', volume: '$12M', activity: 'Normal' },
      { pair: 'EURUSD', price: '1.0825', change: '+0.04%', state: 'BULLISH', volume: '$8M', activity: 'Normal' },
      { pair: 'AUDUSD', price: '0.6610', change: '-0.3%', state: 'BEARISH', volume: '$4M', activity: 'Low' },
      { pair: 'USDCAD', price: '1.3680', change: '+0.45%', state: 'BEARISH', volume: '$3M', activity: 'Normal' },
      { pair: 'USDJPY', price: '156.40', change: '+0.85%', state: 'BEARISH', volume: '$19M', activity: 'High' },
      { pair: 'XAUUSD', price: '2,341.2', change: '-1.1%', state: 'BEARISH', volume: '$43M', activity: 'High' }
    ];

    return (
      <div className="space-y-6">
        {toastMessage && (
          <div className="fixed top-16 right-4 bg-[#1E2433] text-gray-200 border-l-4 border-[#CAAA98] px-4 py-3 rounded-lg shadow-2xl z-50 text-xs animate-slideIn select-none">
            {toastMessage}
          </div>
        )}
        <div className="bg-[#1A1F2C] border border-[#2A2E39] rounded-xl p-5">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#2A2E39]">
            <h2 className="text-sm font-bold text-gray-100 uppercase tracking-wider font-display">Multi-Asset Volatility Heatmap</h2>
            <span className="text-[10px] bg-emerald-500/10 text-[#26A69A] px-2 py-0.5 rounded font-mono">REAL-TIME FEEDS ACTIVE</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {marketPairs.map(mp => (
              <div 
                key={mp.pair}
                onClick={() => showToast(`Synchronized primary workspace to ${mp.pair}`)}
                className="bg-[#111622] border border-[#2A2E39] hover:border-[#CAAA98] p-4 rounded-lg cursor-pointer transition-all duration-200 group flex flex-col justify-between h-28"
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-gray-200">{mp.pair}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                    mp.change.startsWith('+') ? 'text-[#26A69A] bg-[#26A69A]/5' : 'text-[#EF5350] bg-[#EF5350]/5'
                  }`}>{mp.change}</span>
                </div>
                <div className="text-md font-mono font-bold text-gray-100 group-hover:text-[#CAAA98] transition-colors">{mp.price}</div>
                <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono">
                  <span>{mp.volume} Vol</span>
                  <span className={`px-1 rounded uppercase p-0.2 text-[8px] font-bold ${
                    mp.state === 'BULLISH' ? 'bg-[#26A69A]/10 text-[#26A69A]' : 'bg-[#EF5350]/10 text-[#EF5350]'
                  }`}>{mp.state}</span>
                </div>
              </div>
            ))}
          </div>
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
    const matrix = [
      { pair: 'BTCUSDT', d1: 'BULLISH', h4: 'BULLISH', h1: 'BULLISH', m30: 'BEARISH', m15: 'BULLISH', strength: 'Strong Bullish' },
      { pair: 'ETHUSDT', d1: 'BULLISH', h4: 'BULLISH', h1: 'BEARISH', m30: 'BEARISH', m15: 'BEARISH', strength: 'Moderate Bullish' },
      { pair: 'EURUSD', d1: 'BULLISH', h4: 'BEARISH', h1: 'BULLISH', m30: 'BULLISH', m15: 'BULLISH', strength: 'Moderate Bullish' },
      { pair: 'GBPUSD', d1: 'BULLISH', h4: 'BULLISH', h1: 'BULLISH', m30: 'BULLISH', m15: 'BULLISH', strength: 'Strong Bullish' },
      { pair: 'USDJPY', d1: 'BEARISH', h4: 'BEARISH', h1: 'BEARISH', m30: 'BEARISH', m15: 'BULLISH', strength: 'Strong Bearish' },
      { pair: 'XAUUSD', d1: 'BEARISH', h4: 'BULLISH', h1: 'BEARISH', m30: 'BEARISH', m15: 'BEARISH', strength: 'Moderate Bearish' }
    ];

    return (
      <div className="bg-[#1A1F2C] border border-[#2A2E39] rounded-xl p-5">
        <div className="flex justify-between items-center mb-6 pb-2 border-b border-[#2A2E39]">
          <div>
            <h2 className="text-sm font-bold text-gray-100 uppercase tracking-wider font-display">Multi-Timeframe Structure Matrix</h2>
            <p className="text-xs text-gray-400 mt-1">Simultaneous alignment matrix verifying SMC macro elements across all resolutions.</p>
          </div>
          <span className="text-[9px] text-[#CAAA98] border border-[#CAAA98]/30 px-2 py-0.5 rounded font-mono font-bold uppercase">100% Core Matrix Aligned</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-[#2A2E39] text-gray-500 uppercase text-[10px]">
                <th className="py-3 px-4">ASSET PAIR</th>
                <th className="py-3 px-4">DAILY (1D)</th>
                <th className="py-3 px-4">4 HOURS (4H)</th>
                <th className="py-3 px-4">1 HOUR (1H)</th>
                <th className="py-3 px-4">30 MINS (30m)</th>
                <th className="py-3 px-4">15 MINS (15m)</th>
                <th className="py-3 px-4 text-right">OVERALL BIAS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2E39] text-gray-300">
              {matrix.map((row) => (
                <tr key={row.pair} className="hover:bg-[#111622]/50 transition-colors">
                  <td className="py-4 px-4 font-bold text-[#CAAA98]">{row.pair}</td>
                  {[row.d1, row.h4, row.h1, row.m30, row.m15].map((cell, cIdx) => (
                    <td key={cIdx} className="py-4 px-4">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        cell === 'BULLISH' ? 'bg-[#26A69A]/10 text-[#26A69A]' : 'bg-[#EF5350]/10 text-[#EF5350]'
                      }`}>
                        {cell}
                      </span>
                    </td>
                  ))}
                  <td className="py-4 px-4 font-sans font-semibold text-right">
                    <span className={`inline-flex items-center space-x-1 ${
                      row.strength.includes('Bullish') ? 'text-[#26A69A]' : 'text-[#EF5350]'
                    }`}>
                      <span>&bull;</span>
                      <span>{row.strength}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
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
              <label className="block text-gray-500 mb-1 font-mono text-[9px]">SMC Condition Limit:</label>
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
            <span className="text-xs uppercase tracking-wider font-bold text-gray-200">SMC Rule Expectancy Engine (Simulations)</span>
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
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#1A1F2C] border border-[#2A2E39] md:col-span-2 rounded-xl p-5">
            <span className="text-xs uppercase tracking-wider font-bold text-gray-200 block mb-4 border-b border-[#2A2E39] pb-2">May 2026 performance matrix tracker</span>
            
            {/* Heatmap calendar grid */}
            <div className="grid grid-cols-7 gap-1 font-mono text-[10px] text-center mb-4">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <div key={day} className="text-gray-500 py-1">{day}</div>
              ))}
              {Array.from({ length: 31 }).map((_, i) => {
                const dayNum = i + 1;
                // Random green, gray, red colors representing calendar performance
                let colorClass = 'bg-[#1C202F] text-gray-500';
                if (dayNum === 5 || dayNum === 12 || dayNum === 22) colorClass = 'bg-[#EF5350]/20 text-[#EF5350] border border-[#EF5350]/30';
                if (dayNum === 1 || dayNum === 8 || dayNum === 14 || dayNum === 18 || dayNum === 24) colorClass = 'bg-[#26A69A]/20 text-emerald-400 border border-[#26A69A]/30 font-bold';
                
                return (
                  <div key={i} className={`p-2.5 rounded h-10 flex flex-col justify-between ${colorClass}`}>
                    <span className="block text-[8px] text-right">{dayNum}</span>
                    {dayNum === 24 && <span className="block text-[7px] text-left">+2.3%</span>}
                    {dayNum === 5 && <span className="block text-[7px] text-left">-1.2%</span>}
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-gray-500 leading-none">Green cells indicate winning sessions; Red cells highlight loss sessions. Dark slate cells indicate resting/no-trade days.</p>
          </div>

          {/* Notes side card */}
          <div className="bg-[#1A1F2C] border border-[#2A2E39] rounded-xl p-5 flex flex-col justify-between h-[340px]">
            <div>
              <span className="text-xs uppercase tracking-wider font-bold text-gray-200 block mb-3 border-b border-[#2A2E39] pb-2">May 24 session diary</span>
              <textarea 
                defaultValue="Identified nice BOS break of structures on BTC H4. Placed entry limits under $64,200 discount zone. Price touched, swept stops, and rebounded fully as planned in the NY overlap session."
                className="w-full bg-[#111622] border border-[#2A2E39] p-2 text-xs rounded text-gray-300 h-44 focus:outline-none"
              />
            </div>
            <button 
              onClick={() => showToast('Session log archived in SQLite / Local Storage!')}
              className="bg-[#26A69A] hover:bg-emerald-600 text-slate-950 font-bold p-2 text-xs rounded uppercase tracking-wider cursor-pointer"
            >
              Archive Diary log
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 9. SETTINGS DASHBOARD PAGE
  if (pageId === 'settings') {
    const [mockApiKey, setMockApiKey] = useState('***********************************3A1f');
    const [mockExchange, setMockExchange] = useState('BINANCE_US');

    return (
      <div className="bg-[#1A1F2C] border border-[#2A2E39] rounded-xl p-5">
        {toastMessage && (
          <div className="fixed top-16 right-4 bg-[#1E2433] text-gray-200 border-l-4 border-[#CAAA98] px-4 py-3 rounded-lg shadow-2xl z-50 text-xs animate-slideIn">
            {toastMessage}
          </div>
        )}
        <div className="flex justify-between items-center pb-2 border-b border-[#2A2E39] mb-6">
          <h2 className="text-sm font-bold text-gray-100 uppercase tracking-wider font-display">System Settings & preferences</h2>
          <span className="text-xs text-gray-500 font-mono">App Version: 4.1.2</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs text-gray-300 font-sans">
          
          {/* API Keys (Do NOT generate input for actual API keys, manage mock configuration safely) */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 border-b border-gray-800 pb-1.5">
              <Key size={16} className="text-[#CAAA98]" />
              <span className="text-[#CAAA98] font-bold uppercase tracking-wider text-[11px]">Broker Exchange Integrations</span>
            </div>
            
            <div>
              <label className="block text-gray-400 mb-1">Exchange Origin Connection:</label>
              <select 
                value={mockExchange}
                onChange={(e) => setMockExchange(e.target.value)}
                className="w-full bg-[#111622] border border-[#2A2E39] p-2 rounded text-xs select-none"
              >
                <option value="BINANCE_US">Binance US (Futures API)</option>
                <option value="OANDA">Oanda Forex Services</option>
                <option value="BYBIT">Bybit Exchange Algos</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-400 mb-1">Secure Integration API Key ID:</label>
              <input
                type="text"
                disabled
                value={mockApiKey}
                className="w-full bg-[#111622]/50 border border-[#2A2E39]/80 text-[#CAAA98] p-2 rounded text-xs pl-3 font-mono"
              />
              <span className="text-[10px] text-gray-500 mt-1 block">To replace secrets safely, update your environment variables inside the Platform Secrets Panel in the Google AI Studio menu.</span>
            </div>
          </div>

          {/* Preferences configuration */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 border-b border-gray-800 pb-1.5">
              <Settings size={16} className="text-[#CAAA98]" />
              <span className="text-[#CAAA98] font-bold uppercase tracking-wider text-[11px]">Safety safeguards</span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span>Maximum capitalization risk per trade setup:</span>
                <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-white font-semibold">1.5% MAX RISK</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Daily cumulative loss safeguard threshold:</span>
                <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-white font-semibold">4.0% DAILY CEILING</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Push notifications on structural breakout (BOS):</span>
                <span className="text-emerald-400 font-bold uppercase">Enabled</span>
              </div>
            </div>

            <button
              onClick={() => showToast('Preference profile parameters written successfully to local configuration registries.')}
              className="w-full bg-[#CAAA98] hover:bg-[#b09382] text-slate-950 font-bold p-2.5 rounded uppercase tracking-wider text-[11px] cursor-pointer mt-4"
            >
              Save Configuration Preferences
            </button>
          </div>

        </div>
      </div>
    );
  }

  // Fallback default frame loader
  return (
    <div className="p-8 text-center bg-[#1A1F2C] border border-[#2A2E39] rounded-xl text-xs text-gray-400">
      Section view under active construction. Select a sidebar tab to hydrate logs.
    </div>
  );
}
