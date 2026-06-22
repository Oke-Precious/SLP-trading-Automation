import React, { useState } from 'react';
import { useMarketStore } from '../../store/useMarketStore';
import { useRealtimeCandles } from '../../hooks/useRealtimeCandles';
import { runSMCAnalysis, OrderBlock } from '../../lib/analysis/smcEngine';
import { Play } from 'lucide-react';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function BacktestPage() {
  const { selectedPair, selectedTimeframe } = useMarketStore();
  const { candles, isLoading } = useRealtimeCandles(selectedPair, selectedTimeframe);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);

  const runBacktest = async () => {
    if (!candles || candles.length < 100) return;
    setIsRunning(true);
    setResults([]);
    
    // Minimal backtest engine using 50 candles lookback rolling window
    const windowSize = 50;
    let activeTrade: any = null;
    const trades: any[] = [];
    
    // Start iterating from index windowSize to the end
    for (let i = windowSize; i < candles.length - 1; i++) {
      const windowCandles = candles.slice(i - windowSize, i);
      const currentCandle = candles[i];
      const smcResult = runSMCAnalysis(windowCandles);
      
      // If we are in a trade, check exit
      if (activeTrade) {
        if (activeTrade.direction === 'BULLISH') {
          if (currentCandle.low <= activeTrade.stopLoss) {
            // STOP LOSS HIT
            activeTrade.exitPrice = activeTrade.stopLoss;
            activeTrade.pnl = -1; // -1 R
            activeTrade.status = 'STOPPED';
            trades.push(activeTrade);
            activeTrade = null;
          } else if (currentCandle.high >= activeTrade.target) {
            // TARGET HIT
            activeTrade.exitPrice = activeTrade.target;
            const rr = (activeTrade.target - activeTrade.entryPrice) / (activeTrade.entryPrice - activeTrade.stopLoss);
            activeTrade.pnl = rr;
            activeTrade.status = 'TARGET HIT';
            trades.push(activeTrade);
            activeTrade = null;
          }
        } else {
          if (currentCandle.high >= activeTrade.stopLoss) {
            activeTrade.exitPrice = activeTrade.stopLoss;
            activeTrade.pnl = -1;
            activeTrade.status = 'STOPPED';
            trades.push(activeTrade);
            activeTrade = null;
          } else if (currentCandle.low <= activeTrade.target) {
            activeTrade.exitPrice = activeTrade.target;
            const rr = (activeTrade.entryPrice - activeTrade.target) / (activeTrade.stopLoss - activeTrade.entryPrice);
            activeTrade.pnl = rr;
            activeTrade.status = 'TARGET HIT';
            trades.push(activeTrade);
            activeTrade = null;
          }
        }
        continue;
      }

      // If NO trade active, look for entry criteria: Price touches active OB
      const activeOBs = smcResult.orderBlocks.filter(ob => ob.status === 'ACTIVE');
      for (const ob of activeOBs) {
        if (ob.type === 'BULLISH' && currentCandle.low <= ob.top && currentCandle.high >= ob.bottom) {
          // ENTER LONG
          const lastSwingHigh = smcResult.swingHighs[smcResult.swingHighs.length - 1];
          const target = lastSwingHigh ? lastSwingHigh.price : ob.top + (ob.top - ob.bottom) * 2;
          const stop = ob.bottom;
          if (target > ob.top) {
            activeTrade = {
              id: `tr-${i}`,
              time: currentCandle.time,
              direction: 'BULLISH',
              entryPrice: ob.top,
              stopLoss: stop,
              target: target,
            };
            break; // only take one trade
          }
        } else if (ob.type === 'BEARISH' && currentCandle.high >= ob.bottom && currentCandle.low <= ob.top) {
          // ENTER SHORT
          const lastSwingLow = smcResult.swingLows[smcResult.swingLows.length - 1];
          const target = lastSwingLow ? lastSwingLow.price : ob.bottom - (ob.top - ob.bottom) * 2;
          const stop = ob.top;
          if (target < ob.bottom) {
            activeTrade = {
              id: `tr-${i}`,
              time: currentCandle.time,
              direction: 'BEARISH',
              entryPrice: ob.bottom,
              stopLoss: stop,
              target: target,
            };
            break;
          }
        }
      }
    }
    
    // Summary computation
    const totalTrades = trades.length;
    const wins = trades.filter(t => t.pnl > 0).length;
    const winRate = totalTrades > 0 ? (wins / totalTrades * 100).toFixed(1) : 0;
    const totalR = trades.reduce((sum, t) => sum + t.pnl, 0).toFixed(2);
    
    setSummary({ totalTrades, winRate, totalR });
    setResults(trades.reverse());
    setIsRunning(false);
  };

  return (
    <div className="p-6 bg-[#111622] text-[#E0E3EB] min-h-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold font-display uppercase tracking-wider text-[#CAAA98]">Strategy Backtest Runner</h1>
          <p className="text-xs font-mono text-gray-500 mt-1 uppercase tracking-widest">
            {selectedPair} | {selectedTimeframe} | Data points: {candles.length} limit
          </p>
        </div>
        <button 
          onClick={runBacktest}
          disabled={isRunning || candles.length < 100}
          className="flex items-center gap-2 bg-[#CAAA98] hover:bg-[#CAAA98]/90 text-slate-900 px-4 py-2 rounded font-bold font-mono text-sm tracking-wider uppercase transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRunning ? <LoadingSpinner /> : null}
          {isRunning ? 'Running...' : 'Run Backtest'}
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-[#1A1F2C] border border-[#2A2E39] p-4 rounded-xl">
            <span className="text-xs text-gray-500 font-mono uppercase tracking-widest mb-1 block">Total Trades</span>
            <span className="text-2xl font-bold text-white tracking-tight">{summary.totalTrades}</span>
          </div>
          <div className="bg-[#1A1F2C] border border-[#2A2E39] p-4 rounded-xl">
            <span className="text-xs text-gray-500 font-mono uppercase tracking-widest mb-1 block">Win Rate</span>
            <span className="text-2xl font-bold text-[#26A69A] tracking-tight">{summary.winRate}%</span>
          </div>
          <div className="bg-[#1A1F2C] border border-[#2A2E39] p-4 rounded-xl">
            <span className="text-xs text-gray-500 font-mono uppercase tracking-widest mb-1 block">Total Returns (R)</span>
            <span className={`text-2xl font-bold tracking-tight ${Number(summary.totalR) > 0 ? 'text-[#26A69A]' : Number(summary.totalR) < 0 ? 'text-[#EF5350]' : 'text-gray-300'}`}>
              {summary.totalR > 0 ? '+' : ''}{summary.totalR} R
            </span>
          </div>
        </div>
      )}

      {results.length > 0 ? (
        <div className="bg-[#1A1F2C] border border-[#2A2E39] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-mono text-left">
              <thead className="bg-[#1E2433] text-gray-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-4 border-b border-[#2A2E39]">Date/Time</th>
                  <th className="p-4 border-b border-[#2A2E39]">Type</th>
                  <th className="p-4 border-b border-[#2A2E39]">Entry</th>
                  <th className="p-4 border-b border-[#2A2E39]">Exit</th>
                  <th className="p-4 border-b border-[#2A2E39]">Result</th>
                  <th className="p-4 border-b border-[#2A2E39] text-right">R-Multiple</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A2E39]">
                {results.map((trade) => (
                  <tr key={trade.id} className="hover:bg-[#1E2433]/50 transition-colors">
                    <td className="p-4 text-gray-300">
                      {new Date(trade.time * 1000).toLocaleString()}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${trade.direction === 'BULLISH' ? 'bg-[#26A69A]/10 text-[#26A69A]' : 'bg-[#EF5350]/10 text-[#EF5350]'}`}>
                        {trade.direction}
                      </span>
                    </td>
                    <td className="p-4 text-gray-200">{trade.entryPrice.toFixed(2)}</td>
                    <td className="p-4 text-gray-200">{trade.exitPrice?.toFixed(2)}</td>
                    <td className="p-4">
                      <span className={`text-xs font-bold ${trade.status === 'TARGET HIT' ? 'text-[#26A69A]' : 'text-[#EF5350]'}`}>
                        {trade.status}
                      </span>
                    </td>
                    <td className={`p-4 text-right font-bold ${trade.pnl > 0 ? 'text-[#26A69A]' : 'text-[#EF5350]'}`}>
                      {trade.pnl > 0 ? '+' : ''}{trade.pnl.toFixed(2)}R
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        !isRunning && (
          <div className="text-center p-12 text-gray-500 font-mono text-sm border border-dashed border-[#2A2E39] rounded-xl flex flex-col items-center">
            Run the backtest to simulate the SMC logic against recent historical data and calculate expected win rate and R-multiples.
            {candles.length < 100 && (
              <span className="text-[#EF5350] mt-2 block">Not enough historical candles available (need 100).</span>
            )}
          </div>
        )
      )}
    </div>
  );
}
