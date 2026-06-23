import React, { useState } from 'react';
import { useMarketStore } from '../../store/useMarketStore';
import { useRealtimeCandles } from '../../hooks/useRealtimeCandles';
import { runSMCAnalysis } from '../../lib/analysis/smcEngine';
import { Play, Download, AlertTriangle, HelpCircle } from 'lucide-react';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function BacktestPage() {
  const { selectedPair, selectedTimeframe } = useMarketStore();
  const { candles, isLoading } = useRealtimeCandles(selectedPair, selectedTimeframe);
  
  const [isRunning, setIsRunning] = useState(false);
  const [slippage, setSlippage] = useState<number>(0.05); // Default 0.05%
  const [results, setResults] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [expandedTradeId, setExpandedTradeId] = useState<string | null>(null);

  // Helper functions for trade closing (Rule C, Rule G)
  const closeTradeAsLoss = (position: any, candle: any, reason: string, slippageFraction: number) => {
    const isLong = position.direction === 'LONG';
    const rawExit = position.stopLoss;
    const exitPrice = isLong ? rawExit * (1 - slippageFraction) : rawExit * (1 + slippageFraction);
    
    let rMultiple = 0;
    const absRisk = Math.abs(position.entryPrice - position.stopLoss);
    if (absRisk > 0) {
      if (isLong) {
        rMultiple = (exitPrice - position.entryPrice) / absRisk;
      } else {
        rMultiple = (position.entryPrice - exitPrice) / absRisk;
      }
    }

    return {
      ...position,
      exitDate: new Date(candle.time * 1000).toISOString(),
      exitTime: candle.time,
      exitPrice,
      result: 'LOSS',
      rMultiple,
      exitReason: reason,
    };
  };

  const closeTradeAsWin = (position: any, candle: any, reason: string, slippageFraction: number) => {
    const isLong = position.direction === 'LONG';
    const rawExit = position.target;
    const exitPrice = isLong ? rawExit * (1 - slippageFraction) : rawExit * (1 + slippageFraction);
    
    let rMultiple = 0;
    const absRisk = Math.abs(position.entryPrice - position.stopLoss);
    if (absRisk > 0) {
      if (isLong) {
        rMultiple = (exitPrice - position.entryPrice) / absRisk;
      } else {
        rMultiple = (position.entryPrice - exitPrice) / absRisk;
      }
    }

    return {
      ...position,
      exitDate: new Date(candle.time * 1000).toISOString(),
      exitTime: candle.time,
      exitPrice,
      result: 'WIN',
      rMultiple,
      exitReason: reason,
    };
  };

  const calculateProfitFactor = (wins: any[], losses: any[]) => {
    const grossProfit = wins.reduce((sum, t) => sum + t.rMultiple, 0);
    const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.rMultiple, 0));
    return grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
  };

  const calculateMaxDrawdown = (resolved: any[]) => {
    let peak = 0;
    let maxDd = 0;
    let currentEquity = 0; // Cumulative R-gained
    for (const t of resolved) {
      currentEquity += t.rMultiple;
      if (currentEquity > peak) {
        peak = currentEquity;
      }
      const dd = peak - currentEquity;
      if (dd > maxDd) {
        maxDd = dd;
      }
    }
    return maxDd;
  };

  const runBacktest = async () => {
    if (!candles || candles.length < 100) return;
    setIsRunning(true);
    setResults([]);
    setSummary(null);

    // Slippage fraction logic (e.g. 0.05% => 0.0005)
    const slippageFraction = slippage / 100;
    const minLookback = 50;
    let position: any = null; // null = NO_POSITION, otherwise holds position details
    const trades: any[] = [];

    // Chronological Loop (Rule A)
    for (let i = minLookback; i < candles.length; i++) {
      const historySoFar = candles.slice(0, i + 1);
      
      // We evaluate entry conditions only on prior CLOSED candles to avoid lookahead (Rule A)
      const priorHistory = historySoFar.slice(0, historySoFar.length - 1);
      const currentCandle = candles[i];

      if (position === null) {
        // Evaluate SMC setup entry conditions
        const smcResult = runSMCAnalysis(priorHistory);
        const activeOBs = smcResult.orderBlocks.filter(ob => ob.status === 'ACTIVE');

        for (const ob of activeOBs) {
          if (ob.type === 'BULLISH' && currentCandle.low <= ob.top && currentCandle.high >= ob.bottom) {
            // Check for BOS confirmation
            const recentBullishBOS = smcResult.bosEvents.some(
              b => b.direction === 'BULLISH' && (currentCandle.time - b.breakTime) < 86400 * 5
            );
            const lastSwingHigh = smcResult.swingHighs[smcResult.swingHighs.length - 1];
            const targetPrice = lastSwingHigh ? lastSwingHigh.price : ob.top + (ob.top - ob.bottom) * 2.5;

            if (targetPrice > ob.top && ob.top > ob.bottom) {
              const rawEntry = ob.top;
              const entryPrice = rawEntry * (1 + slippageFraction); // Rule G long slippage cost added to entry

              position = {
                id: `trade-${i}`,
                pair: selectedPair,
                timeframe: selectedTimeframe,
                entryDate: new Date(currentCandle.time * 1000).toISOString(),
                entryTime: currentCandle.time,
                entryPrice,
                direction: 'LONG',
                stopLoss: ob.bottom,
                target: targetPrice,
                ruleTriggered: recentBullishBOS ? 'Bullish OB + BOS confirmation' : 'Bullish OB zone touch',
              };
              break; // One position at a time (Rule D)
            }
          } else if (ob.type === 'BEARISH' && currentCandle.high >= ob.bottom && currentCandle.low <= ob.top) {
            // Check for BEARISH BOS confirmation
            const recentBearishBOS = smcResult.bosEvents.some(
              b => b.direction === 'BEARISH' && (currentCandle.time - b.breakTime) < 86400 * 5
            );
            const lastSwingLow = smcResult.swingLows[smcResult.swingLows.length - 1];
            const targetPrice = lastSwingLow ? lastSwingLow.price : ob.bottom - (ob.top - ob.bottom) * 2.5;

            if (targetPrice < ob.bottom && ob.top > ob.bottom) {
              const rawEntry = ob.bottom;
              const entryPrice = rawEntry * (1 - slippageFraction); // Rule G short slippage cost subtracted from entry

              position = {
                id: `trade-${i}`,
                pair: selectedPair,
                timeframe: selectedTimeframe,
                entryDate: new Date(currentCandle.time * 1000).toISOString(),
                entryTime: currentCandle.time,
                entryPrice,
                direction: 'SHORT',
                stopLoss: ob.top,
                target: targetPrice,
                ruleTriggered: recentBearishBOS ? 'Bearish OB + BOS confirmation' : 'Bearish OB zone touch',
              };
              break; // One position at a time (Rule D)
            }
          }
        }
      } else {
        // Validate exit conditions based on current candle's wicks (Rule B)
        const hitTP = position.direction === 'LONG'
          ? currentCandle.high >= position.target
          : currentCandle.low <= position.target;
        const hitSL = position.direction === 'LONG'
          ? currentCandle.low <= position.stopLoss
          : currentCandle.high >= position.stopLoss;

        if (hitTP && hitSL) {
          // Same-candle conflict: Assume worse outcome (Rule C)
          trades.push(closeTradeAsLoss(position, currentCandle, 'same-candle-conflict-assumed-sl', slippageFraction));
          position = null;
        } else if (hitSL) {
          trades.push(closeTradeAsLoss(position, currentCandle, 'sl-hit', slippageFraction));
          position = null;
        } else if (hitTP) {
          trades.push(closeTradeAsWin(position, currentCandle, 'tp-hit', slippageFraction));
          position = null;
        }
      }
    }

    // Unresolved trades at dataset end (Rule E)
    if (position !== null) {
      trades.push({
        ...position,
        exitDate: null,
        exitPrice: null,
        result: 'STILL_OPEN',
        rMultiple: 0,
        exitReason: 'Dataset ended with trade open',
        excluded: true,
      });
    }

    // Step 2.3 Stats computation
    const resolved = trades.filter(t => t.result !== 'STILL_OPEN');
    const wins = resolved.filter(t => t.result === 'WIN');
    const losses = resolved.filter(t => t.result === 'LOSS');

    const totalTrades = resolved.length;
    const stillOpenExcluded = trades.length - resolved.length;
    const winRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;
    const totalRGained = resolved.reduce((sum, t) => sum + t.rMultiple, 0);
    const avgRMultiple = totalTrades > 0 ? totalRGained / totalTrades : 0;
    const largestWin = wins.length > 0 ? Math.max(...wins.map(t => t.rMultiple)) : 0;
    const largestLoss = losses.length > 0 ? Math.min(...losses.map(t => t.rMultiple)) : 0;
    const profitFactor = calculateProfitFactor(wins, losses);
    const maxDrawdown = calculateMaxDrawdown(resolved);

    setSummary({
      totalTrades,
      stillOpenExcluded,
      winRate,
      avgRMultiple,
      totalRGained,
      largestWin,
      largestLoss,
      profitFactor,
      maxDrawdown,
    });

    setResults(trades.reverse()); // Show newest trades first
    setIsRunning(false);
  };

  const exportToCSV = () => {
    if (results.length === 0) return;
    const resolved = results.filter(t => t.result !== 'STILL_OPEN');

    const headers = [
      'Pair',
      'Timeframe',
      'Entry Date',
      'Entry Price',
      'Direction',
      'Stop Loss',
      'Target Price',
      'Exit Date',
      'Exit Price',
      'Result',
      'R-Multiple',
      'Exit Reason',
      'Rule Triggered',
    ];

    const rows = resolved.map(t => [
      t.pair,
      t.timeframe,
      t.entryDate,
      t.entryPrice.toFixed(4),
      t.direction,
      t.stopLoss.toFixed(4),
      t.target.toFixed(4),
      t.exitDate || '',
      t.exitPrice ? t.exitPrice.toFixed(4) : '',
      t.result,
      t.rMultiple.toFixed(2),
      t.exitReason,
      t.ruleTriggered,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(val => `"${val}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `verifiable_backtest_${selectedPair}_${selectedTimeframe}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 bg-[#111622] text-[#E0E3EB] min-h-full">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-xl font-bold font-display uppercase tracking-wider text-[#CAAA98]" id="backtest-header-title">
            Verifiable Backtest Engine (SMC)
          </h1>
          <p className="text-xs font-mono text-gray-500 mt-1 uppercase tracking-widest">
            {selectedPair} | {selectedTimeframe} | Data points: {candles.length} candles available
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-[#1E2433] p-3 rounded-lg border border-[#2A2E39]">
          {/* Slippage controller (Rule G) */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">Slippage/Spread:</span>
            <input
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={slippage}
              onChange={e => setSlippage(Math.max(0, Number(e.target.value)))}
              className="w-16 bg-[#111622] border border-[#2A2E39] text-[#CAAA98] rounded px-1.5 py-0.5 text-xs font-mono font-bold text-center"
            />
            <span className="text-xs font-mono text-gray-400">%</span>
          </div>

          <button
            onClick={runBacktest}
            disabled={isRunning || candles.length < 100}
            className="flex items-center gap-2 bg-[#CAAA98] hover:bg-[#CAAA98]/90 text-[#111622] px-4 py-1.5 rounded font-bold font-mono text-xs tracking-wider uppercase transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            id="run-backtest-btn"
          >
            {isRunning ? <LoadingSpinner /> : <Play size={14} />}
            {isRunning ? 'Running...' : 'Run Simulation'}
          </button>
        </div>
      </div>

      {/* KPI Stats Panel (Step 2.3) */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          <div className="bg-[#1A1F2C] border border-[#2A2E39] p-3 rounded-xl">
            <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-1 block">Total Trades</span>
            <span className="text-xl font-bold text-white tracking-tight">{summary.totalTrades}</span>
          </div>
          <div className="bg-[#1A1F2C] border border-[#2A2E39] p-3 rounded-xl">
            <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-1 block">Win Rate</span>
            <span className="text-xl font-bold text-[#26A69A] tracking-tight">{summary.winRate.toFixed(1)}%</span>
          </div>
          <div className="bg-[#1A1F2C] border border-[#2A2E39] p-3 rounded-xl">
            <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-1 block">Total Gained R</span>
            <span className={`text-xl font-bold tracking-tight ${summary.totalRGained > 0 ? 'text-[#26A69A]' : summary.totalRGained < 0 ? 'text-[#EF5350]' : 'text-gray-300'}`}>
              {summary.totalRGained > 0 ? '+' : ''}{summary.totalRGained.toFixed(2)}R
            </span>
          </div>
          <div className="bg-[#1A1F2C] border border-[#2A2E39] p-3 rounded-xl">
            <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-1 block">Profit Factor</span>
            <span className="text-xl font-bold text-white tracking-tight">
              {summary.profitFactor === Infinity ? '∞' : summary.profitFactor.toFixed(2)}
            </span>
          </div>
          <div className="bg-[#1A1F2C] border border-[#2A2E39] p-3 rounded-xl">
            <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-1 block">Max Drawdown</span>
            <span className="text-xl font-bold text-[#EF5350] tracking-tight">-{summary.maxDrawdown.toFixed(2)}R</span>
          </div>
          <div className="bg-[#1A1F2C] border border-[#2A2E39] p-3 rounded-xl">
            <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-1 block">Still Open</span>
            <span className="text-xl font-semibold text-amber-500 tracking-tight">{summary.stillOpenExcluded}</span>
          </div>
        </div>
      )}

      {/* Results Trades Table & Export Block */}
      {results.length > 0 ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-[#1E2433] p-4 rounded-xl border border-[#2A2E39]">
            <span className="text-xs font-mono text-gray-400">
               Verifiable trades available for export. Download CSV to compare against TradingView.
            </span>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-1.5 bg-[#1F2E3D] hover:bg-[#253A4F] text-[#CAAA98] border border-[#CAAA98]/40 px-3 py-1.5 rounded font-mono text-xs font-bold uppercase transition-colors cursor-pointer"
              id="export-csv-btn"
            >
              <Download size={13} />
              Export CSV for TradingView
            </button>
          </div>

          <div className="bg-[#1A1F2C] border border-[#2A2E39] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono text-left">
                <thead className="bg-[#1E2433] text-gray-400 uppercase tracking-wider">
                  <tr>
                    <th className="p-4 border-b border-[#2A2E39]">Date / Entry Time</th>
                    <th className="p-4 border-b border-[#2A2E39]">Setup Rule</th>
                    <th className="p-4 border-b border-[#2A2E39]">Type</th>
                    <th className="p-4 border-b border-[#2A2E39]">Entry Price</th>
                    <th className="p-4 border-b border-[#2A2E39]">Exit Price</th>
                    <th className="p-4 border-b border-[#2A2E39]">Result / Reason</th>
                    <th className="p-4 border-b border-[#2A2E39] text-right">R-Multiple</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A2E39]">
                  {results.map((trade) => {
                    const isExpanded = expandedTradeId === trade.id;
                    const isStillOpen = trade.result === 'STILL_OPEN';
                    return (
                      <React.Fragment key={trade.id}>
                        <tr 
                          onClick={() => setExpandedTradeId(isExpanded ? null : trade.id)}
                          className="hover:bg-[#1E2433]/50 transition-colors cursor-pointer"
                        >
                          <td className="p-4 text-gray-300">
                            {new Date(trade.entryTime * 1000).toLocaleString()}
                          </td>
                          <td className="p-4 text-[#CAAA98] font-bold">
                            {trade.ruleTriggered}
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              trade.direction === 'LONG' ? 'bg-[#26A69A]/10 text-[#26A69A]' : 'bg-[#EF5350]/10 text-[#EF5350]'
                            }`}>
                              {trade.direction}
                            </span>
                          </td>
                          <td className="p-4 text-gray-200">{trade.entryPrice.toFixed(4)}</td>
                          <td className="p-4 text-gray-200">
                            {isStillOpen ? '—' : trade.exitPrice?.toFixed(4)}
                          </td>
                          <td className="p-4">
                            <span className={`text-xs font-bold uppercase ${
                              trade.result === 'WIN' ? 'text-[#26A69A]' : isStillOpen ? 'text-amber-500' : 'text-[#EF5350]'
                            }`}>
                              {trade.result}
                            </span>
                            <div className="text-[10px] text-gray-500 mt-0.5 max-w-[150px] truncate" title={trade.exitReason}>
                              {trade.exitReason}
                            </div>
                          </td>
                          <td className={`p-4 text-right font-bold ${
                            trade.rMultiple > 0 ? 'text-[#26A69A]' : trade.rMultiple < 0 ? 'text-[#EF5350]' : 'text-gray-400'
                          }`}>
                            {isStillOpen ? '—' : `${trade.rMultiple > 0 ? '+' : ''}${trade.rMultiple.toFixed(2)}R`}
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-[#111622]">
                            <td colSpan={7} className="p-4 border-b border-[#2A2E39] font-mono text-xs text-gray-400">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#1A1F2C] p-4 rounded-lg border border-[#2A2E39]">
                                <div>
                                  <h4 className="font-bold text-white mb-2 uppercase text-[10px] tracking-wider text-[#CAAA98]">TradingView Reference details</h4>
                                  <ul className="space-y-1">
                                    <li><span className="text-gray-500">Pair:</span> {trade.pair}</li>
                                    <li><span className="text-gray-500">Timeframe:</span> {trade.timeframe}</li>
                                    <li><span className="text-gray-500">Direction:</span> {trade.direction}</li>
                                    <li><span className="text-gray-500">Trigger Rule:</span> {trade.ruleTriggered}</li>
                                    <li><span className="text-gray-500">Entry Timestamp:</span> {trade.entryDate}</li>
                                  </ul>
                                </div>
                                <div>
                                  <h4 className="font-bold text-white mb-2 uppercase text-[10px] tracking-wider text-[#CAAA98]">Trade levels (With {slippage}% slippage cost)</h4>
                                  <ul className="space-y-1">
                                    <li><span className="text-gray-500">Simulation Entry Price:</span> {trade.entryPrice.toFixed(4)}</li>
                                    <li><span className="text-gray-500">Simulation Stop Loss Price:</span> {trade.stopLoss.toFixed(4)}</li>
                                    <li><span className="text-gray-500">Simulation Target TP Price:</span> {trade.target.toFixed(4)}</li>
                                    {!isStillOpen && (
                                      <>
                                        <li><span className="text-gray-500">Exit Timestamp:</span> {trade.exitDate}</li>
                                        <li><span className="text-gray-500">Exit Price:</span> {trade.exitPrice?.toFixed(4)}</li>
                                        <li><span className="text-gray-500">Resulting R-Multiple:</span> <strong className={trade.rMultiple > 0 ? 'text-[#26A69A]' : 'text-[#EF5350]'}>{trade.rMultiple.toFixed(2)}R</strong></li>
                                      </>
                                    )}
                                  </ul>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        !isRunning && (
          <div className="text-center p-12 text-gray-500 font-mono text-sm border border-dashed border-[#2A2E39] rounded-xl flex flex-col items-center">
            <HelpCircle size={32} className="text-gray-600 mb-3" />
            <span>Run the backtest to simulate the SMC logic against recent historical data and calculate expected win rate and R-multiples.</span>
            {candles.length < 100 && (
              <span className="text-[#EF5350] mt-2 block font-bold">Not enough historical candles available (need at least 100, saw {candles.length}). Try changing pair or timeframe.</span>
            )}
          </div>
        )
      )}

      {/* Footer Disclaimer (Step 2.5) */}
      <div className="mt-8 pt-6 border-t border-[#2A2E39]/40 flex gap-3 text-xs text-gray-500 leading-relaxed font-mono">
        <AlertTriangle size={16} className="text-amber-500/80 shrink-0 mt-0.5" />
        <p>
          Backtest results are based on historical OHLCV data and the rules shown above. Same-candle TP/SL conflicts are resolved conservatively (stop loss assumed). A {slippage}% execution cost is applied to every trade. Past performance does not guarantee future results. Always verify results against live charts before trusting any strategy.
        </p>
      </div>
    </div>
  );
}
