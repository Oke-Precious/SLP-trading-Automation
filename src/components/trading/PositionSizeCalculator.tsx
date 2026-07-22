import React, { useState, useEffect, useMemo } from 'react';
import { Calculator, AlertTriangle, Coins, TrendingUp, HelpCircle } from 'lucide-react';
import { usePositionSizeSettings } from '../../store/usePositionSizeSettings';
import {
  calculatePositionSize,
  projectTradeOutcome,
  getInstrumentCategory,
} from '../../lib/slp/slpPositionSizing';
import { ALL_INSTRUMENTS } from '../../lib/market/marketDataService';
import { usePositionSizeForSignal } from '../../hooks/usePositionSizeForSignal';

interface PositionSizeCalculatorProps {
  biasResult?: any;
  symbol?: string; // current active symbol in dashboard
}

export const PositionSizeCalculator: React.FC<PositionSizeCalculatorProps> = ({
  biasResult = null,
  symbol = 'BTCUSDT',
}) => {
  const { accountBalance, riskPercent, setAccountBalance, setRiskPercent } = usePositionSizeSettings();

  // Mode Selection: 'auto' | 'manual'
  const hasAutoSignal = useMemo(() => {
    if (!biasResult) return false;
    const isSetupValid = biasResult.status === 'SETUP_VALID' && biasResult.signal;
    const isEntryConfirmed = biasResult.status === 'ENTRY_CONFIRMED';
    return !!(isSetupValid || isEntryConfirmed);
  }, [biasResult]);

  const [activeMode, setActiveMode] = useState<'auto' | 'manual'>('manual');

  // Auto-switch to 'auto' mode when a valid signal becomes active
  useEffect(() => {
    if (hasAutoSignal) {
      setActiveMode('auto');
    } else {
      setActiveMode('manual');
    }
  }, [hasAutoSignal]);

  // --- AUTO MODE STATE & PROJECTION ---
  const autoProjection = usePositionSizeForSignal(biasResult, symbol);

  // --- MANUAL MODE INPUT STATES ---
  const [manualSymbol, setManualSymbol] = useState<string>(symbol);
  const [manualEntry, setManualEntry] = useState<string>('');
  const [manualStopLoss, setManualStopLoss] = useState<string>('');
  const [manualTakeProfit, setManualTakeProfit] = useState<string>('');

  // Sync manual symbol with the active dashboard symbol when it changes
  useEffect(() => {
    if (symbol) {
      setManualSymbol(symbol);
    }
  }, [symbol]);

  // Populate initial manual prices when symbol changes or active mode is entered
  useEffect(() => {
    if (hasAutoSignal) {
      const signal = biasResult.signal;
      if (signal) {
        setManualEntry(signal.entryPrice.toString());
        setManualStopLoss(signal.stopLoss.toString());
        setManualTakeProfit((signal.target1 || '').toString());
      } else if (biasResult.entryPrice !== undefined) {
        setManualEntry((biasResult.entryPrice || '').toString());
        setManualStopLoss((biasResult.stopLoss || '').toString());
        
        const tpPrice = biasResult.takeProfitLTF?.targetPrice || biasResult.takeProfitLTF || '';
        setManualTakeProfit(tpPrice.toString());
      }
    } else {
      // Standard fallback presets for manual mode based on chosen symbol
      const isForex = manualSymbol.startsWith('EUR') || manualSymbol.startsWith('GBP') || manualSymbol.startsWith('AUD') || manualSymbol.startsWith('NZD');
      const isJPY = manualSymbol.endsWith('JPY');
      if (isForex) {
        setManualEntry('1.1000');
        setManualStopLoss('1.0950');
        setManualTakeProfit('1.1150');
      } else if (isJPY) {
        setManualEntry('150.00');
        setManualStopLoss('149.50');
        setManualTakeProfit('151.50');
      } else if (manualSymbol === 'XAUUSD') {
        setManualEntry('2350.00');
        setManualStopLoss('2345.00');
        setManualTakeProfit('2365.00');
      } else {
        setManualEntry('65000');
        setManualStopLoss('64500');
        setManualTakeProfit('66500');
      }
    }
  }, [manualSymbol, hasAutoSignal, biasResult]);

  // --- MANUAL CALCULATIONS ---
  const manualCalculation = useMemo(() => {
    const entryNum = parseFloat(manualEntry);
    const slNum = parseFloat(manualStopLoss);
    const tpNum = parseFloat(manualTakeProfit);

    if (isNaN(entryNum) || isNaN(slNum) || entryNum <= 0 || slNum <= 0 || entryNum === slNum) {
      return null;
    }

    const category = getInstrumentCategory(manualSymbol);
    const positionSize = calculatePositionSize({
      accountBalance,
      riskPercent,
      entryPrice: entryNum,
      stopLossPrice: slNum,
      symbol: manualSymbol,
      category,
    });

    const takeProfitPrice = isNaN(tpNum) || tpNum <= 0 ? (entryNum + (entryNum - slNum) * 2) : tpNum;
    const projection = projectTradeOutcome(positionSize, entryNum, slNum, takeProfitPrice);

    return {
      positionSize,
      projection,
      hasCustomTP: !isNaN(tpNum) && tpNum > 0,
    };
  }, [accountBalance, riskPercent, manualSymbol, manualEntry, manualStopLoss, manualTakeProfit]);

  // Helpers for displaying info
  const activeSymbol = activeMode === 'auto' ? symbol : manualSymbol;
  const activeCategory = getInstrumentCategory(activeSymbol);

  return (
    <div className="bg-[#1A1F2C] border border-[#2D323F] rounded-xl overflow-hidden hover:border-[#3C4254] transition-all duration-300 shadow-xl" id="position-size-calculator-card">
      
      {/* Card Header */}
      <div className="p-4 bg-[#141822]/80 border-b border-[#2D323F] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Calculator className="text-[#CAAA98]" size={16} />
          <span className="text-xs font-bold uppercase tracking-wider text-gray-200">Position Sizing & Risk Desk</span>
        </div>
        <span className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 px-2 py-0.5 rounded font-mono font-bold uppercase">
          Phase 7 Lot Engine
        </span>
      </div>

      {/* Tabs / Mode Selector */}
      {hasAutoSignal && (
        <div className="flex border-b border-[#2D323F] bg-[#111622]/40 p-1.5 gap-1.5">
          <button
            onClick={() => setActiveMode('auto')}
            className={`flex-1 py-1 px-3 rounded text-[10px] font-bold uppercase tracking-wider transition-all select-none ${
              activeMode === 'auto'
                ? 'bg-[#CAAA98] text-slate-950 shadow-md'
                : 'text-gray-400 hover:text-white bg-transparent'
            }`}
          >
            Auto (Active Signal)
          </button>
          <button
            onClick={() => setActiveMode('manual')}
            className={`flex-1 py-1 px-3 rounded text-[10px] font-bold uppercase tracking-wider transition-all select-none ${
              activeMode === 'manual'
                ? 'bg-[#CAAA98] text-slate-950 shadow-md'
                : 'text-gray-400 hover:text-white bg-transparent'
            }`}
          >
            Manual Experimenter
          </button>
        </div>
      )}

      {/* Main Body Content */}
      <div className="p-4 space-y-4 text-xs font-sans text-gray-300">
        
        {/* SHARED CONTROLS (Account Balance & Risk Percent) - Read/Write for both modes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-[#2D323F]/60">
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1.5 font-bold">
              Account Balance (USD)
            </label>
            <div className="relative">
              <span className="absolute left-2.5 top-2 text-gray-500 font-mono text-xs">$</span>
              <input
                type="number"
                value={accountBalance || ''}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setAccountBalance(isNaN(val) ? 0 : val);
                }}
                className="w-full bg-[#111622] border border-[#2D323F] rounded p-1.5 pl-6 text-xs font-mono text-white focus:outline-none focus:border-[#CAAA98]"
                placeholder="10000"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[10px] text-gray-400 uppercase tracking-wider block font-bold">
                Risk Factor (%)
              </label>
              <span className="text-[11px] font-mono text-red-400 font-bold">{riskPercent}%</span>
            </div>
            
            {/* Slider */}
            <input
              type="range"
              min="0.25"
              max="5"
              step="0.25"
              value={riskPercent}
              onChange={(e) => setRiskPercent(parseFloat(e.target.value))}
              className="w-full accent-[#CAAA98] h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer mb-2"
            />

            {/* Presets */}
            <div className="flex gap-1">
              {[0.5, 1, 2].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setRiskPercent(preset)}
                  className={`flex-1 py-1 rounded text-[9px] font-mono font-bold select-none transition-colors border ${
                    riskPercent === preset
                      ? 'bg-red-500/10 border-red-500/40 text-red-400'
                      : 'bg-[#111622] border-[#2D323F] text-gray-400 hover:text-white'
                  }`}
                >
                  {preset}%
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* --- AUTO MODE INTERFACE --- */}
        {activeMode === 'auto' && (
          <div className="space-y-4">
            
            {/* Signal Details Header */}
            <div className="p-3 bg-[#171E2D] rounded-lg border border-blue-500/25 flex justify-between items-center">
              <div>
                <span className="text-[9px] text-blue-400 uppercase tracking-wider block font-bold font-mono">
                  Linked Active Signal
                </span>
                <span className="text-sm font-bold text-white font-display">
                  {symbol} — {biasResult?.signal?.direction || (biasResult?.activePOI?.direction === 'BULLISH' ? 'LONG' : 'SHORT')}
                </span>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase font-bold">
                AUTO MODE
              </span>
            </div>

            {/* Display Read Only Price Levels */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-[#111622]/60 p-2 rounded border border-[#2D323F]/40">
                <span className="text-[9px] text-gray-500 block uppercase font-bold tracking-wider mb-0.5">Entry Level</span>
                <span className="text-xs font-mono text-white font-semibold">
                  {biasResult?.signal?.entryPrice?.toFixed(activeCategory === 'FOREX_USD' ? 4 : 2) || 
                   biasResult?.activePOI?.entryLevel?.toFixed(activeCategory === 'FOREX_USD' ? 4 : 2) || '—'}
                </span>
              </div>
              <div className="bg-[#111622]/60 p-2 rounded border border-[#2D323F]/40">
                <span className="text-[9px] text-gray-500 block uppercase font-bold tracking-wider mb-0.5">Stop Loss</span>
                <span className="text-xs font-mono text-red-400 font-semibold">
                  {biasResult?.signal?.stopLoss?.toFixed(activeCategory === 'FOREX_USD' ? 4 : 2) || 
                   biasResult?.activePOI?.stopLossLevel?.toFixed(activeCategory === 'FOREX_USD' ? 4 : 2) || '—'}
                </span>
              </div>
              <div className="bg-[#111622]/60 p-2 rounded border border-[#2D323F]/40">
                <span className="text-[9px] text-gray-500 block uppercase font-bold tracking-wider mb-0.5">Take Profit</span>
                <span className="text-xs font-mono text-emerald-400 font-semibold">
                  {biasResult?.signal?.target1?.toFixed(activeCategory === 'FOREX_USD' ? 4 : 2) || 
                   biasResult?.takeProfitLTF?.targetPrice?.toFixed(activeCategory === 'FOREX_USD' ? 4 : 2) || '—'}
                </span>
              </div>
            </div>

            {/* Auto Projection Output Panel */}
            {autoProjection ? (
              <div className="space-y-3.5 bg-[#141822] p-3.5 rounded-lg border border-[#2D323F] mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Coins size={12} className="text-[#CAAA98]" />
                    Lot Size Allocation
                  </span>
                  <span className="text-base font-bold text-[#CAAA98] font-mono">
                    {autoProjection.positionSize.lotSizeRounded.toFixed(2)} lots
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-[#2D323F]/40">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider">Risk Amount</span>
                  <span className="text-xs font-mono font-bold text-red-400">
                    -${autoProjection.positionSize.riskAmountUSD.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider">Potential Reward</span>
                  <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1">
                    <TrendingUp size={12} />
                    +${autoProjection.potentialProfitUSD.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider">Risk Reward Ratio (R:R)</span>
                  <span className="text-xs font-mono font-semibold text-white">
                    1 : {autoProjection.rrRatio.toFixed(2)}
                  </span>
                </div>

                {/* Mathematical Formula Footnote */}
                <div className="pt-2 border-t border-[#2D323F]/30 text-[9px] font-mono text-gray-500 leading-relaxed break-all">
                  <span className="text-[#CAAA98]/60 font-semibold">Formula:</span> {autoProjection.positionSize.formula}
                </div>

                {/* Warnings Banner */}
                {autoProjection.positionSize.warning && (
                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/25 rounded flex items-start gap-2 text-[10px] text-amber-400 leading-normal font-sans">
                    <AlertTriangle size={13} className="shrink-0 mt-0.5 text-amber-500" />
                    <span>{autoProjection.positionSize.warning}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 text-center bg-[#141822]/40 rounded border border-dashed border-gray-800 text-[11px] text-gray-500">
                Invalid or incomplete values detected in the linked active signal. Sizing engine disengaged.
              </div>
            )}
          </div>
        )}

        {/* --- MANUAL MODE INTERFACE --- */}
        {activeMode === 'manual' && (
          <div className="space-y-4">
            
            {/* MANUAL CONTROLS */}
            <div className="grid grid-cols-2 gap-3.5">
              
              <div className="col-span-2">
                <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1 font-bold">
                  Instrument Symbol
                </label>
                <select
                  value={manualSymbol}
                  onChange={(e) => setManualSymbol(e.target.value)}
                  className="w-full bg-[#111622] border border-[#2D323F] rounded p-2 text-xs text-white focus:outline-none focus:border-[#CAAA98]"
                >
                  {ALL_INSTRUMENTS.map((inst) => (
                    <option key={inst.symbol} value={inst.symbol}>
                      {inst.symbol} — {inst.name} ({inst.category.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1 font-bold">
                  Entry Price
                </label>
                <input
                  type="number"
                  step="any"
                  value={manualEntry}
                  onChange={(e) => setManualEntry(e.target.value)}
                  className="w-full bg-[#111622] border border-[#2D323F] rounded p-1.5 text-xs font-mono text-white focus:outline-none focus:border-[#CAAA98]"
                  placeholder="e.g. 1.0850"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1 font-bold text-red-400">
                  Stop Loss Price
                </label>
                <input
                  type="number"
                  step="any"
                  value={manualStopLoss}
                  onChange={(e) => setManualStopLoss(e.target.value)}
                  className="w-full bg-[#111622] border border-[#2D323F] rounded p-1.5 text-xs font-mono text-white focus:outline-none focus:border-[#CAAA98]"
                  placeholder="e.g. 1.0800"
                />
              </div>

              <div className="col-span-2">
                <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1 font-bold text-emerald-400">
                  Take Profit Price (Optional)
                </label>
                <input
                  type="number"
                  step="any"
                  value={manualTakeProfit}
                  onChange={(e) => setManualTakeProfit(e.target.value)}
                  className="w-full bg-[#111622] border border-[#2D323F] rounded p-1.5 text-xs font-mono text-white focus:outline-none focus:border-[#CAAA98]"
                  placeholder="Defaults to 2R target if left empty"
                />
              </div>

            </div>

            {/* Manual Calculation Outputs */}
            {manualCalculation ? (
              <div className="space-y-3.5 bg-[#141822] p-3.5 rounded-lg border border-[#2D323F] mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Coins size={12} className="text-[#CAAA98]" />
                    Lot Size Allocation
                  </span>
                  <span className="text-base font-bold text-[#CAAA98] font-mono">
                    {manualCalculation.positionSize.lotSizeRounded.toFixed(2)} lots
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-[#2D323F]/40">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider">Risk Amount</span>
                  <span className="text-xs font-mono font-bold text-red-400">
                    -${manualCalculation.positionSize.riskAmountUSD.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider">Potential Reward</span>
                  <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1">
                    <TrendingUp size={12} />
                    +${manualCalculation.projection.potentialProfitUSD.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                    Risk Reward Ratio {manualCalculation.hasCustomTP ? '(Custom)' : '(Default 2R)'}
                  </span>
                  <span className="text-xs font-mono font-semibold text-white">
                    1 : {manualCalculation.projection.rrRatio.toFixed(2)}
                  </span>
                </div>

                {/* Mathematical Formula Footnote */}
                <div className="pt-2 border-t border-[#2D323F]/30 text-[9px] font-mono text-gray-500 leading-relaxed break-all">
                  <span className="text-[#CAAA98]/60 font-semibold">Formula:</span> {manualCalculation.positionSize.formula}
                </div>

                {/* Warnings Banner */}
                {manualCalculation.positionSize.warning && (
                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/25 rounded flex items-start gap-2 text-[10px] text-amber-400 leading-normal font-sans">
                    <AlertTriangle size={13} className="shrink-0 mt-0.5 text-amber-500" />
                    <span>{manualCalculation.positionSize.warning}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 text-center bg-[#141822]/40 rounded border border-dashed border-gray-800 text-[11px] text-gray-500">
                Insert a valid Entry Price and Stop Loss Price to initiate live position size mathematical calculation.
              </div>
            )}
          </div>
        )}

        {/* Permanent Educational Disclaimer */}
        <div className="pt-3 border-t border-[#2D323F]/60 text-[9px] text-[#94A3B8] leading-relaxed flex items-start space-x-2">
          <HelpCircle size={14} className="shrink-0 text-[#CAAA98]/70 mt-0.5" />
          <span>
            <span className="font-bold text-gray-300">Aesthetic Educational Alignment Disclaimer:</span> Position sizing uses simplified, course-aligned pip-value constants (6.62 for JPY pairs, 10 for USD pairs and commodities) as taught in the SLP video series. Real-world exchange rates fluctuate, causing actual broker pip values to vary. Always cross-check results on your broker's terminal before executing real-world positions.
          </span>
        </div>

      </div>
    </div>
  );
};
