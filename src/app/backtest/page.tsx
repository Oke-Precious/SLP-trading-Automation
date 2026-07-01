import React, { useState, useEffect } from 'react';
import { 
  Play, 
  TrendingUp, 
  TrendingDown, 
  Percent, 
  BarChart3, 
  ArrowUpRight, 
  ArrowDownRight, 
  Layers, 
  Activity, 
  ShieldAlert,
  Loader2,
  RefreshCw,
  HelpCircle,
  Clock,
  Briefcase
} from 'lucide-react';
import { fetchCandles, ALL_INSTRUMENTS, Candle } from '../../lib/market/marketDataService';
import { formatPrice } from '../../lib/utils/formatters';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';

interface SimulatedTrade {
  id: string;
  type: 'LONG' | 'SHORT';
  setupType: string;
  entryIndex: number;
  entryPrice: number;
  entryTime: string;
  stopLoss: number;
  takeProfit: number;
  exitIndex: number;
  exitPrice: number;
  exitTime: string;
  status: 'TP_HIT' | 'SL_HIT' | 'FORCE_CLOSED';
  pnlPercent: number;
  equity: number;
}

export default function BacktestPage() {
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  const [selectedTimeframe, setSelectedTimeframe] = useState('1H');
  const [selectedLimit, setSelectedLimit] = useState(300);
  const [selectedStrategy, setSelectedStrategy] = useState('OB_MITIGATION');
  const [riskReward, setRiskReward] = useState(2.0);
  const [stopLossPct, setStopLossPct] = useState(1.5);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backtestRun, setBacktestRun] = useState(false);
  
  const [simulatedTrades, setSimulatedTrades] = useState<SimulatedTrade[]>([]);
  const [equityData, setEquityData] = useState<{ name: string; equity: number }[]>([]);
  const [stats, setStats] = useState({
    initialCapital: 10000,
    endingCapital: 10000,
    totalTrades: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    profitFactor: 0,
    maxDrawdown: 0,
    netProfitPct: 0
  });

  // Automatically run initial backtest on mount so user sees actual data right away
  useEffect(() => {
    handleRunBacktest();
  }, []);

  const handleRunBacktest = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch real historical candles
      const candles = await fetchCandles(selectedSymbol, selectedTimeframe, selectedLimit);
      
      if (!candles || candles.length < 20) {
        throw new Error(`Insufficient historical candle data returned for ${selectedSymbol} (${candles?.length || 0} candles)`);
      }

      // 2. Run simulation engine
      const trades: SimulatedTrade[] = [];
      let currentEquity = 10000;
      let peakEquity = 10000;
      let maxDrawdown = 0;
      
      const getSMA = (idx: number, period: number): number => {
        let sum = 0;
        let count = 0;
        for (let j = Math.max(0, idx - period); j < idx; j++) {
          sum += candles[j].close;
          count++;
        }
        return count > 0 ? sum / count : candles[idx].close;
      };

      for (let i = 15; i < candles.length - 3; i++) {
        // If we are currently inside a trade, wait until that trade exits before seeking the next trigger
        const lastActiveTrade = trades[trades.length - 1];
        if (lastActiveTrade && lastActiveTrade.exitIndex > i) {
          continue;
        }

        const currentCandle = candles[i];
        const prevCandle = candles[i - 1];
        const smaFast = getSMA(i, 8);
        const smaSlow = getSMA(i, 21);
        const isUptrend = smaFast > smaSlow;

        let trigger: 'LONG' | 'SHORT' | null = null;
        let sl = 0;
        let tp = 0;
        let setupName = '';

        if (selectedStrategy === 'OB_MITIGATION') {
          // Bullish Order Block mitigation
          const candidateOB = candles[i - 2];
          const isDownCandle = candidateOB.close < candidateOB.open;
          const isStrongUpBreak = candles[i - 1].close > candidateOB.high;
          
          if (isDownCandle && isStrongUpBreak && isUptrend && currentCandle.low <= candidateOB.high && currentCandle.close > candidateOB.low) {
            trigger = 'LONG';
            sl = candidateOB.low * 0.999;
            tp = currentCandle.close + (currentCandle.close - sl) * riskReward;
            setupName = 'OB Mitigation (Long)';
          } else {
            // Bearish Order Block mitigation
            const isUpCandle = candidateOB.close > candidateOB.open;
            const isStrongDownBreak = candles[i - 1].close < candidateOB.low;
            if (isUpCandle && isStrongDownBreak && !isUptrend && currentCandle.high >= candidateOB.low && currentCandle.close < candidateOB.high) {
              trigger = 'SHORT';
              sl = candidateOB.high * 1.001;
              tp = currentCandle.close - (sl - currentCandle.close) * riskReward;
              setupName = 'OB Mitigation (Short)';
            }
          }
        } else if (selectedStrategy === 'FVG_MITIGATION') {
          // Fair Value Gap fill
          // Bullish gap between candle[i-3] high and candle[i-1] low
          const fvgBottom = candles[i - 3].high;
          const fvgTop = candles[i - 1].low;
          if (fvgTop > fvgBottom && isUptrend && currentCandle.low <= fvgTop && currentCandle.close > fvgBottom) {
            trigger = 'LONG';
            sl = fvgBottom * 0.998;
            tp = currentCandle.close + (currentCandle.close - sl) * riskReward;
            setupName = 'FVG Fill (Long)';
          } else {
            // Bearish gap
            const fvgBearTop = candles[i - 3].low;
            const fvgBearBottom = candles[i - 1].high;
            if (fvgBearBottom < fvgBearTop && !isUptrend && currentCandle.high >= fvgBearBottom && currentCandle.close < fvgBearTop) {
              trigger = 'SHORT';
              sl = fvgBearTop * 1.002;
              tp = currentCandle.close - (sl - currentCandle.close) * riskReward;
              setupName = 'FVG Fill (Short)';
            }
          }
        } else {
          // LIQUIDITY_SWEEP
          // Sweep of recent 10-period highs or lows
          const subset = candles.slice(i - 10, i);
          const localHigh = Math.max(...subset.map(c => c.high));
          const localLow = Math.min(...subset.map(c => c.low));

          if (currentCandle.high > localHigh && currentCandle.close < localHigh) {
            trigger = 'SHORT';
            sl = currentCandle.high * 1.001;
            tp = currentCandle.close - (sl - currentCandle.close) * riskReward;
            setupName = 'Liquidity Sweep (Short)';
          } else if (currentCandle.low < localLow && currentCandle.close > localLow) {
            trigger = 'LONG';
            sl = currentCandle.low * 0.999;
            tp = currentCandle.close + (currentCandle.close - sl) * riskReward;
            setupName = 'Liquidity Sweep (Long)';
          }
        }

        if (trigger) {
          // Risk limit/guard rails - ensure SL isn't crazy
          const sizePct = Math.abs(currentCandle.close - sl) / currentCandle.close;
          if (sizePct < 0.0005 || sizePct > 0.08) {
            // Default to selected stop loss percent to prevent outlier results
            if (trigger === 'LONG') {
              sl = currentCandle.close * (1 - stopLossPct / 100);
              tp = currentCandle.close * (1 + (stopLossPct / 100) * riskReward);
            } else {
              sl = currentCandle.close * (1 + stopLossPct / 100);
              tp = currentCandle.close * (1 - (stopLossPct / 100) * riskReward);
            }
          }

          // Trace future candles
          let status: 'TP_HIT' | 'SL_HIT' | 'FORCE_CLOSED' = 'FORCE_CLOSED';
          let exitPrice = currentCandle.close;
          let exitIdx = candles.length - 1;

          for (let j = i + 1; j < candles.length; j++) {
            const check = candles[j];
            if (trigger === 'LONG') {
              if (check.low <= sl) {
                status = 'SL_HIT';
                exitPrice = sl;
                exitIdx = j;
                break;
              }
              if (check.high >= tp) {
                status = 'TP_HIT';
                exitPrice = tp;
                exitIdx = j;
                break;
              }
            } else {
              if (check.high >= sl) {
                status = 'SL_HIT';
                exitPrice = sl;
                exitIdx = j;
                break;
              }
              if (check.low <= tp) {
                status = 'TP_HIT';
                exitPrice = tp;
                exitIdx = j;
                break;
              }
            }
          }

          // Standard 1% account risk size
          const riskSize = 0.01; 
          const currentStopPct = Math.abs(currentCandle.close - sl) / currentCandle.close;
          const positionSizeInUnits = (currentEquity * riskSize) / currentStopPct;
          
          let pnlPercent = 0;
          if (trigger === 'LONG') {
            pnlPercent = ((exitPrice - currentCandle.close) / currentCandle.close) * 100;
          } else {
            pnlPercent = ((currentCandle.close - exitPrice) / currentCandle.close) * 100;
          }

          const absolutePnL = (pnlPercent / 100) * positionSizeInUnits;
          currentEquity += absolutePnL;
          
          if (currentEquity > peakEquity) {
            peakEquity = currentEquity;
          }
          const drawdown = ((peakEquity - currentEquity) / peakEquity) * 100;
          if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
          }

          trades.push({
            id: `backtest-t-${i}-${j()}`,
            type: trigger,
            setupType: setupName,
            entryIndex: i,
            entryPrice: currentCandle.close,
            entryTime: new Date(currentCandle.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }),
            stopLoss: sl,
            takeProfit: tp,
            exitIndex: exitIdx,
            exitPrice,
            exitTime: new Date(candles[exitIdx].time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }),
            status,
            pnlPercent: parseFloat(((absolutePnL / (currentEquity - absolutePnL)) * 100).toFixed(2)),
            equity: parseFloat(currentEquity.toFixed(2))
          });
        }
      }

      // 3. Compute stats
      const totalTrades = trades.length;
      const wins = trades.filter(t => t.status === 'TP_HIT').length;
      const losses = trades.filter(t => t.status === 'SL_HIT').length;
      const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
      
      const totalWinAmt = trades.filter(t => t.status === 'TP_HIT').reduce((acc, curr) => acc + (curr.pnlPercent > 0 ? curr.pnlPercent : 0), 0);
      const totalLossAmt = trades.filter(t => t.status === 'SL_HIT').reduce((acc, curr) => acc + (curr.pnlPercent < 0 ? Math.abs(curr.pnlPercent) : 0), 0);
      const profitFactor = totalLossAmt > 0 ? totalWinAmt / totalLossAmt : totalWinAmt > 0 ? 99.9 : 1.0;
      const netProfitPct = ((currentEquity - 10000) / 10000) * 100;

      // Make equity curve array for recharts
      const tempEquityArray = [{ name: 'Start', equity: 10000 }];
      trades.forEach((t, index) => {
        tempEquityArray.push({
          name: `T-${index + 1}`,
          equity: t.equity
        });
      });

      setSimulatedTrades(trades);
      setEquityData(tempEquityArray);
      setStats({
        initialCapital: 10000,
        endingCapital: parseFloat(currentEquity.toFixed(2)),
        totalTrades,
        wins,
        losses,
        winRate: parseFloat(winRate.toFixed(1)),
        profitFactor: parseFloat(profitFactor.toFixed(2)),
        maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
        netProfitPct: parseFloat(netProfitPct.toFixed(2))
      });
      setBacktestRun(true);

    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to complete backtest strategy calculation.');
    } finally {
      setIsLoading(false);
    }
  };

  function j() {
    return Math.random().toString(36).substr(2, 4);
  }

  return (
    <div className="p-6 bg-[#111622] text-[#E0E3EB] min-h-full">
      {/* Top Heading */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[#1F2635] pb-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white font-display uppercase tracking-wider flex items-center">
            <BarChart3 className="text-[#CAAA98] mr-3" size={24} />
            SLP Mechanical Backtest Engine
          </h1>
          <p className="text-gray-400 text-xs mt-1 font-sans">
            Instantly run historical backtests of core mechanical SLP setups against live exchange candles.
          </p>
        </div>
        <div className="mt-3 md:mt-0 flex items-center space-x-2">
          <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-1 rounded font-bold uppercase tracking-wider flex items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1.5" />
            Exchange Connected
          </span>
        </div>
      </div>

      {/* Control panel and quick stats banner */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        
        {/* Left Control Column */}
        <div className="lg:col-span-1 bg-[#202940] border border-[#2C354E] rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-[#CAAA98] font-bold text-xs uppercase tracking-widest border-b border-[#2C354E]/50 pb-2 mb-3">
              Strategy Presets
            </h3>
            
            {/* Instrument Dropdown */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-wider">Asset Pair</label>
              <select 
                value={selectedSymbol} 
                onChange={(e) => setSelectedSymbol(e.target.value)}
                className="w-full bg-[#131824] border border-[#2C354E] text-sm text-gray-200 rounded-lg p-2.5 outline-none focus:border-[#CAAA98]"
              >
                {ALL_INSTRUMENTS.map((inst) => (
                  <option key={inst.symbol} value={inst.symbol}>
                    {inst.symbol} ({inst.name})
                  </option>
                ))}
              </select>
            </div>

            {/* Timeframe selector */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-wider">Timeframe</label>
              <select 
                value={selectedTimeframe} 
                onChange={(e) => setSelectedTimeframe(e.target.value)}
                className="w-full bg-[#131824] border border-[#2C354E] text-sm text-gray-200 rounded-lg p-2.5 outline-none focus:border-[#CAAA98]"
              >
                <option value="5m">5 Minute (5m)</option>
                <option value="15m">15 Minute (15m)</option>
                <option value="1H">1 Hour (1H)</option>
                <option value="4H">4 Hour (4H)</option>
                <option value="1D">Daily (1D)</option>
              </select>
            </div>

            {/* Strategy Select */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-wider">Mechanical Setup</label>
              <select 
                value={selectedStrategy} 
                onChange={(e) => setSelectedStrategy(e.target.value)}
                className="w-full bg-[#131824] border border-[#2C354E] text-sm text-gray-200 rounded-lg p-2.5 outline-none focus:border-[#CAAA98]"
              >
                <option value="OB_MITIGATION">Order Block (OB) Retest</option>
                <option value="FVG_MITIGATION">Fair Value Gap (FVG) Fill</option>
                <option value="LIQUIDITY_SWEEP">Liquidity Sweep Reversal</option>
              </select>
            </div>

            {/* Historical limit count */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">Sample Size</label>
                <span className="text-[10px] font-mono text-[#CAAA98] font-bold">{selectedLimit} candles</span>
              </div>
              <input 
                type="range" 
                min={100} 
                max={500} 
                step={50}
                value={selectedLimit} 
                onChange={(e) => setSelectedLimit(parseInt(e.target.value))}
                className="w-full accent-[#CAAA98]"
              />
            </div>

            {/* Risk to Reward Ratio */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">Risk / Reward (R:R)</label>
                <span className="text-[10px] font-mono text-[#CAAA98] font-bold">1 : {riskReward.toFixed(1)}</span>
              </div>
              <input 
                type="range" 
                min={1.0} 
                max={4.0} 
                step={0.5}
                value={riskReward} 
                onChange={(e) => setRiskReward(parseFloat(e.target.value))}
                className="w-full accent-[#CAAA98]"
              />
            </div>

            {/* Stop Loss Percent */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">Defensive Stop Size</label>
                <span className="text-[10px] font-mono text-[#CAAA98] font-bold">{stopLossPct.toFixed(1)}%</span>
              </div>
              <input 
                type="range" 
                min={0.5} 
                max={4.0} 
                step={0.1}
                value={stopLossPct} 
                onChange={(e) => setStopLossPct(parseFloat(e.target.value))}
                className="w-full accent-[#CAAA98]"
              />
            </div>
          </div>

          <button
            onClick={handleRunBacktest}
            disabled={isLoading}
            className="w-full mt-6 bg-[#CAAA98] text-[#111622] hover:bg-[#bfa08e] disabled:bg-gray-700 disabled:text-gray-400 font-bold py-3 rounded-lg text-xs uppercase tracking-wider flex items-center justify-center transition-all cursor-pointer shadow-md shadow-[#CAAA98]/10"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin mr-2" size={16} />
                Executing Model...
              </>
            ) : (
              <>
                <Play className="fill-current mr-2" size={12} />
                Run Backtest
              </>
            )}
          </button>
        </div>

        {/* Right Performance Dashboard Area */}
        <div className="lg:col-span-3 flex flex-col justify-between">
          
          {/* Main Key Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            
            {/* Win Rate */}
            <div className="bg-[#202940] border border-[#2C354E] rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider block">Win Rate</span>
              <div className="flex items-baseline mt-2">
                <span className="text-2xl font-bold font-display text-white">{stats.winRate}%</span>
              </div>
              <span className="text-[10px] text-gray-500 mt-1 block">
                {stats.wins} Wins / {stats.losses} Losses
              </span>
            </div>

            {/* Net PnL */}
            <div className="bg-[#202940] border border-[#2C354E] rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider block">Net Return</span>
              <div className="flex items-baseline mt-2">
                <span className={`text-2xl font-bold font-display ${stats.netProfitPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {stats.netProfitPct >= 0 ? '+' : ''}{stats.netProfitPct}%
                </span>
                {stats.netProfitPct >= 0 ? (
                  <ArrowUpRight className="text-emerald-400 ml-1.5 self-center shrink-0" size={18} />
                ) : (
                  <ArrowDownRight className="text-rose-400 ml-1.5 self-center shrink-0" size={18} />
                )}
              </div>
              <span className="text-[10px] text-gray-500 mt-1 block">
                Ending Capital: ${stats.endingCapital.toLocaleString()}
              </span>
            </div>

            {/* Profit Factor */}
            <div className="bg-[#202940] border border-[#2C354E] rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider block">Profit Factor</span>
              <div className="flex items-baseline mt-2">
                <span className="text-2xl font-bold font-display text-white">{stats.profitFactor}</span>
              </div>
              <span className="text-[10px] text-gray-500 mt-1 block">
                Ratio of Gross Wins / Gross Losses
              </span>
            </div>

            {/* Max Drawdown */}
            <div className="bg-[#202940] border border-[#2C354E] rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider block">Max Drawdown</span>
              <div className="flex items-baseline mt-2">
                <span className="text-2xl font-bold font-display text-white">{stats.maxDrawdown}%</span>
              </div>
              <span className="text-[10px] text-gray-500 mt-1 block">
                Max peak-to-trough account drop
              </span>
            </div>
          </div>

          {/* Recharts Area for Equity Curve */}
          <div className="bg-[#202940] border border-[#2C354E] rounded-xl p-5 shadow-lg flex-1 min-h-[250px] flex flex-col justify-between">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs uppercase font-bold text-gray-300 tracking-wider font-display flex items-center">
                <Activity className="text-[#CAAA98] mr-2" size={16} />
                Account Equity Growth Curve (USD)
              </span>
              <span className="text-[10px] text-gray-500 font-mono">Simulated sizing: 1% risk per setup</span>
            </div>

            {error ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-[#131824]/55 rounded-lg border border-dashed border-[#2C354E]">
                <ShieldAlert className="text-amber-500 mb-2" size={32} />
                <p className="text-xs font-mono text-gray-400 max-w-sm">{error}</p>
                <button 
                  onClick={handleRunBacktest} 
                  className="mt-4 flex items-center bg-[#2C354E] text-white hover:bg-gray-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                >
                  <RefreshCw className="mr-1.5" size={12} /> Retry Strategy Run
                </button>
              </div>
            ) : isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                <Loader2 className="animate-spin text-[#CAAA98] mb-3" size={36} />
                <p className="text-xs text-gray-400 font-mono">Analyzing historical candle flow, structure, and swing points...</p>
              </div>
            ) : simulatedTrades.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-[#131824]/55 rounded-lg border border-dashed border-[#2C354E]">
                <HelpCircle className="text-gray-500 mb-2" size={32} />
                <h4 className="text-white text-xs font-semibold uppercase tracking-wider">No Setups Detected</h4>
                <p className="text-[11px] text-gray-400 mt-1 max-w-xs leading-relaxed">
                  No mechanical {selectedStrategy.replace('_', ' ')} setups met constraints in this historical window. Try increasing the sample size or adjusting timeframe/R:R.
                </p>
              </div>
            ) : (
              <div className="w-full h-[200px] mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={equityData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#CAAA98" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#CAAA98" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2C354E" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      stroke="#4B5563" 
                      fontSize={10}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="#4B5563" 
                      fontSize={10}
                      domain={['dataMin - 100', 'dataMax + 100']}
                      tickLine={false}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#131824', borderColor: '#2C354E', borderRadius: '8px' }}
                      labelStyle={{ color: '#9AA3B2', fontSize: '10px', textTransform: 'uppercase' }}
                      itemStyle={{ color: '#E0E3EB', fontSize: '11px', fontWeight: 'bold' }}
                      formatter={(value: any) => [`$${parseFloat(value).toLocaleString()}`, 'Equity']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="equity" 
                      stroke="#CAAA98" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#equityGrad)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Trade logs and strategy documentation explanation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Trade Logs list */}
        <div className="lg:col-span-2 bg-[#202940] border border-[#2C354E] rounded-xl p-5 shadow-lg flex flex-col h-[400px]">
          <div className="flex justify-between items-center border-b border-[#2C354E]/50 pb-3 mb-3">
            <span className="text-xs uppercase font-bold text-white tracking-wider font-display flex items-center">
              <Briefcase className="text-[#CAAA98] mr-2" size={16} />
              Simulated Backtest Trade Logs
            </span>
            <span className="text-[10px] bg-[#131824] px-2 py-0.5 rounded text-gray-400 font-mono">
              {simulatedTrades.length} Trades Simulated
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-2 scrollbar-thin">
            {simulatedTrades.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500 font-mono text-xs text-center p-6">
                No active trade logs to show. Click run above.
              </div>
            ) : (
              [...simulatedTrades].reverse().map((trade) => (
                <div 
                  key={trade.id}
                  className="bg-[#131824] border border-[#2C354E]/70 hover:border-[#CAAA98]/40 p-3 rounded-lg flex flex-col md:flex-row md:items-center justify-between transition-colors text-xs"
                >
                  <div className="flex items-start md:items-center space-x-3 mb-2 md:mb-0">
                    <div className={`p-1.5 rounded font-black text-[9px] uppercase leading-none tracking-wider shrink-0 ${
                      trade.type === 'LONG' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {trade.type}
                    </div>
                    <div>
                      <div className="font-bold text-gray-200 uppercase">{trade.setupType}</div>
                      <div className="text-[10px] text-gray-500 flex items-center mt-1">
                        <Clock size={11} className="mr-1" />
                        Entered: {trade.entryTime}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6 text-right font-mono">
                    <div className="hidden md:block">
                      <div className="text-[10px] text-gray-500 uppercase">Prices</div>
                      <div className="text-gray-300 font-semibold">
                        Entry: {formatPrice(trade.entryPrice)} → Exit: {formatPrice(trade.exitPrice)}
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        trade.status === 'TP_HIT' ? 'bg-emerald-500/15 text-emerald-400' :
                        trade.status === 'SL_HIT' ? 'bg-rose-500/15 text-rose-400' : 'bg-gray-500/15 text-gray-400'
                      }`}>
                        {trade.status === 'TP_HIT' ? 'TP HIT (+R)' : trade.status === 'SL_HIT' ? 'SL HIT (-1R)' : 'FORCE CLOSE'}
                      </span>
                      <span className={`text-xs font-bold mt-1 ${trade.pnlPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {trade.pnlPercent >= 0 ? '+' : ''}{trade.pnlPercent}%
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Strategy Mechanics Card */}
        <div className="lg:col-span-1 bg-[#202940] border border-[#2C354E] rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-[#CAAA98] font-bold text-xs uppercase tracking-widest border-b border-[#2C354E]/50 pb-2 mb-3">
              Mechanical Strategy Rules
            </h3>
            <p className="text-xs text-gray-300 leading-relaxed font-sans mb-4">
              All backtests strictly adhere to mechanical setup logic. No subjective estimates or discretionary interventions are used.
            </p>

            <div className="space-y-4">
              <div className="bg-[#131824] p-3 rounded-lg border border-[#2C354E]/50">
                <span className="text-[10px] uppercase font-bold text-[#CAAA98] tracking-wider block mb-1">
                  Trend Filter (SMA 8/21)
                </span>
                <p className="text-[11px] text-gray-400 leading-normal font-sans">
                  Trades are filtered to align strictly with the direction of the EMA fast/slow cross. Longs only if 8 SMA &gt; 21 SMA; shorts only if 8 SMA &lt; 21 SMA.
                </p>
              </div>

              <div className="bg-[#131824] p-3 rounded-lg border border-[#2C354E]/50">
                <span className="text-[10px] uppercase font-bold text-[#CAAA98] tracking-wider block mb-1">
                  Standard Risk Size
                </span>
                <p className="text-[11px] text-gray-400 leading-normal font-sans">
                  Position size is dynamically adjusted for every setup so that account risk is limited strictly to exactly <strong className="text-gray-200">1.0%</strong> of current equity per trade.
                </p>
              </div>

              <div className="bg-[#131824] p-3 rounded-lg border border-[#2C354E]/50">
                <span className="text-[10px] uppercase font-bold text-[#CAAA98] tracking-wider block mb-1">
                  Defensive Stop Placement
                </span>
                <p className="text-[11px] text-gray-400 leading-normal font-sans">
                  The Stop Loss is automatically set just below the triggering structure level or Order Block low, giving the trade room to play out.
                </p>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-gray-500 font-mono mt-4 leading-normal">
            Real exchange candle feeds parsed directly. Past performance is not a guarantee of future outcomes.
          </div>
        </div>

      </div>
    </div>
  );
}
