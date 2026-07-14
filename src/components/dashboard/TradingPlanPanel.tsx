/**
 * @file TradingPlanPanel.tsx
 * @description The interactive 6-step trading checklist embodying the strict video masterclass rules.
 */

import React, { useState } from 'react';
import { CheckSquare, Square, Flame, Calculator, ChevronDown, ChevronUp } from 'lucide-react';
import { usePOIStore } from '../../store/usePOIStore';
import { SLPBiasResult } from '../../lib/slp/slpBias';
import { SLPSetup } from '../../lib/slp/slpPipeline';
import { ActiveSignalCard } from './ActiveSignalCard';

interface TradingPlanPanelProps {
  biasResult: SLPBiasResult | null;
  slpAnalysis?: SLPSetup | null;
}

export const TradingPlanPanel: React.FC<TradingPlanPanelProps> = ({ biasResult, slpAnalysis }) => {
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: false,
    4: false,
    5: false,
    6: false,
  });

  const [showCalculator, setShowCalculator] = useState(false);
  const [accountBalance, setAccountBalance] = useState<number>(10000);
  const [riskPercent, setRiskPercent] = useState<number>(1);
  const [stopLossDistance, setStopLossDistance] = useState<number>(500); // e.g. difference in price or pips

  const [accountError, setAccountError] = useState<string | null>(null);
  const [riskError, setRiskError] = useState<string | null>(null);
  const [slError, setSlError] = useState<string | null>(null);

  const handleAccountChange = (valStr: string) => {
    const val = Number(valStr);
    if (valStr === '' || isNaN(val) || val <= 0) {
      setAccountError("Must be greater than 0");
    } else {
      setAccountError(null);
    }
    setAccountBalance(val);
  };

  const handleRiskChange = (valStr: string) => {
    const val = Number(valStr);
    if (valStr === '' || isNaN(val) || val < 0) {
      setRiskError("Cannot be negative");
    } else if (val > 100) {
      setRiskError("Max 100%");
    } else {
      setRiskError(null);
    }
    setRiskPercent(val);
  };

  const handleSlChange = (valStr: string) => {
    const val = Number(valStr);
    if (valStr === '' || isNaN(val) || val < 0) {
      setSlError("Cannot be negative");
    } else {
      setSlError(null);
    }
    setStopLossDistance(val);
  };

  const hasCalculatorError = !!(accountError || riskError || slError || accountBalance <= 0 || riskPercent < 0 || stopLossDistance < 0);

  const { pois } = usePOIStore();
  const hasActivePois = pois.some(p => p.status === 'Active');

  const hasSweptLiquidity = slpAnalysis?.liquidityLevels.some(l => l.swept) ?? false;

  const steps = slpAnalysis ? [
    {
      id: 1,
      title: 'Step 1: Establish HTF Bias',
      desc: slpAnalysis.bias.bias !== 'NEUTRAL' ? `Operational Bias is set to ${slpAnalysis.bias.bias}` : 'Establishing daily/4h market structure bias...',
      done: slpAnalysis.bias.bias !== 'NEUTRAL',
    },
    {
      id: 2,
      title: 'Step 2: Monitor LTF Shift (MSS)',
      desc: slpAnalysis.structure.mssEvents.length > 0 ? 'Market Structure Shift detected on body close' : 'Waiting for LTF structure shift against trend wicks',
      done: slpAnalysis.structure.mssEvents.length > 0,
    },
    {
      id: 3,
      title: 'Step 3: Confirm Break of Structure',
      desc: slpAnalysis.structure.bosEvents.length > 0 ? 'BOS confirmed after MSS validating order flow' : 'Waiting for structure continuation break close',
      done: slpAnalysis.structure.bosEvents.length > 0,
    },
    {
      id: 4,
      title: 'Step 4: Swept Liquidity Pools',
      desc: hasSweptLiquidity ? 'Key buy-side or sell-side liquidity swept' : 'Waiting for inducement or liquidity sweeps',
      done: hasSweptLiquidity,
    },
    {
      id: 5,
      title: 'Step 5: Validated POI Zones',
      desc: slpAnalysis.validPOIs.length > 0 ? `${slpAnalysis.validPOIs.length} validated POIs mapped (OB/BB)` : 'Waiting for a valid POI satisfying all 4 SLP rules',
      done: slpAnalysis.validPOIs.length > 0,
    },
    {
      id: 6,
      title: 'Step 6: 50% Entry pullback',
      desc: slpAnalysis.retracementCheck?.retracementReached 
        ? 'Price has retraced to at least 50% of the POI' 
        : slpAnalysis.retracementCheck 
          ? `Current pullback: ${slpAnalysis.retracementCheck.retracementPercent.toFixed(0)}% (target: ${formatPrice(slpAnalysis.retracementCheck.poiMidPrice)})`
          : 'Waiting for pullback to 50% entry zone of the POI',
      done: !!slpAnalysis.retracementCheck?.retracementReached,
    }
  ] : [
    { 
      id: 1, 
      title: 'Establish HTF Bias (Daily/4H)', 
      desc: biasResult && biasResult.structure && biasResult.structure !== 'Insufficient data'
        ? `Market is ${biasResult.structure}`
        : 'Daily order flow in structural trend (HH + HL sequence).' ,
      done: completedSteps[1]
    },
    { 
      id: 2, 
      title: 'Plot Unmitigated HTF POIs', 
      desc: 'Symmetric Order Blocks & Breaker structures plotted.' ,
      done: completedSteps[2]
    },
    { 
      id: 3, 
      title: 'Monitor Retracement to POI', 
      desc: biasResult && biasResult.nextMove && biasResult.nextMove !== 'Need more candle data'
        ? biasResult.nextMove 
        : 'Wait patiently for price to correct into unmitigated zone.' ,
      done: completedSteps[3]
    },
    { 
      id: 4, 
      title: 'Wait for Lower TF MSS & Inducement', 
      desc: 'Confirm on H1/15m. Structure Shift close must be on BODY close, not wick.' ,
      done: completedSteps[4]
    },
    { 
      id: 5, 
      title: 'Place Limit Entry at LTF POI', 
      desc: 'Secure order set at closest unmitigated block aligned with overall HTF trend.' ,
      done: completedSteps[5]
    },
    { 
      id: 6, 
      title: 'Target Swing Bounds & DBOS', 
      desc: 'Target next logical HH/LL. Scale-in via Double Breaker Steps.' ,
      done: completedSteps[6]
    },
  ];

  function formatPrice(price: number): string {
    return price >= 100 ? price.toFixed(2) : price.toFixed(4);
  }

  const toggleStep = (id: number) => {
    setCompletedSteps((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const completedCount = steps.filter(s => s.done).length;

  return (
    <div className="bg-card border border-border-custom rounded-xl p-5 hover:border-[#3A455E] transition-all duration-300 h-full flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <Flame className="text-light shrink-0" size={18} />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">Interactive Trading Plan</h3>
          </div>
          <span className="text-[10px] bg-light/10 text-light border border-light/25 px-2.5 py-0.5 rounded font-mono font-bold uppercase">
            {completedCount} / 6 STEPS COMPLETED
          </span>
        </div>

        <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
          {steps.map((step) => {
            const isDone = step.done;
            return (
              <div 
                key={step.id}
                onClick={() => !slpAnalysis && toggleStep(step.id)}
                className={`flex items-start space-x-3 p-2 rounded-lg border transition-all ${
                  !slpAnalysis ? 'cursor-pointer' : ''
                } ${
                  isDone 
                    ? 'bg-bullish/5 border-bullish/20 text-text-primary' 
                    : 'bg-[#141822]/40 border-gray-800 text-text-secondary hover:border-gray-700'
                }`}
              >
                <button className="mt-0.5 text-light shrink-0 focus:outline-none">
                  {isDone ? (
                    <CheckSquare size={16} className="text-bullish" />
                  ) : (
                    <Square size={16} className="text-gray-600" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold leading-tight uppercase block ${
                      isDone ? 'text-bullish line-through' : 'text-gray-200'
                    }`}>
                      {step.title}
                    </span>
                    {step.id === 1 && slpAnalysis && slpAnalysis.bias.bias !== 'NEUTRAL' && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        slpAnalysis.bias.bias === 'BULLISH' ? 'bg-bullish/25 text-bullish' : 'bg-bearish/25 text-bearish'
                      }`}>
                        {slpAnalysis.bias.bias}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {slpAnalysis && (
          <div className="mt-4 p-3 bg-[#171E2D] rounded-lg border border-blue-500/20 text-xs">
            <div className="flex items-start space-x-1 mb-1.5">
              <span className="font-bold text-gray-400 uppercase tracking-wider text-[9px] shrink-0">STATUS:</span>
              <span className="text-white font-medium ml-1 leading-snug">{slpAnalysis.statusMessage}</span>
            </div>
            <div className="flex items-start space-x-1">
              <span className="font-bold text-blue-400 uppercase tracking-wider text-[9px] shrink-0">NEXT:</span>
              <span className="text-gray-300 ml-1 leading-snug">{slpAnalysis.nextStep}</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-[#2D313E]/60">
        <button 
          onClick={() => setShowCalculator(!showCalculator)}
          className="flex items-center justify-between w-full text-xs font-bold uppercase text-gray-200 hover:text-white transition-colors focus:outline-none"
        >
          <div className="flex items-center space-x-2">
            <Calculator size={16} className="text-blue-400" />
            <span>Position Size Calculator</span>
          </div>
          {showCalculator ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        
        {showCalculator && (
          <div className="mt-3 space-y-3 bg-[#131722] p-3 rounded-lg border border-gray-800 text-[10px]">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Account ($)</label>
                <input 
                  type="number" 
                  value={accountBalance || ''}
                  onChange={(e) => handleAccountChange(e.target.value)}
                  className={`w-full bg-[#1A1E29] border ${accountError ? 'border-red-500' : 'border-gray-700'} rounded text-xs p-1.5 text-white focus:outline-none focus:border-blue-500`}
                />
                {accountError && (
                  <p className="text-red-400 text-[9px] mt-1 font-mono">{accountError}</p>
                )}
              </div>
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Risk (%)</label>
                <input 
                  type="number"
                  step="0.1" 
                  value={riskPercent || ''}
                  onChange={(e) => handleRiskChange(e.target.value)}
                  className={`w-full bg-[#1A1E29] border ${riskError ? 'border-red-500' : 'border-gray-700'} rounded text-xs p-1.5 text-white focus:outline-none focus:border-blue-500`}
                />
                {riskError && (
                  <p className="text-red-400 text-[9px] mt-1 font-mono">{riskError}</p>
                )}
              </div>
              <div className="col-span-2">
                <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">SL Distance (Price diff/Pips)</label>
                <input 
                  type="number" 
                  value={stopLossDistance || ''}
                  onChange={(e) => handleSlChange(e.target.value)}
                  className={`w-full bg-[#1A1E29] border ${slError ? 'border-red-500' : 'border-gray-700'} rounded text-xs p-1.5 text-white focus:outline-none focus:border-blue-500`}
                />
                {slError && (
                  <p className="text-red-400 text-[9px] mt-1 font-mono">{slError}</p>
                )}
              </div>
            </div>
            
            <div className="mt-2 pt-2 border-t border-gray-700 flex justify-between items-center">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider">Position Size (Units)</span>
              <span className="text-sm font-bold text-blue-400">
                {hasCalculatorError ? (
                  <span className="text-red-400 text-xs font-mono">Invalid Input</span>
                ) : (
                  stopLossDistance > 0 ? ((accountBalance * (riskPercent / 100)) / stopLossDistance).toFixed(4) : "0.0000"
                )}
              </span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider">Risk Amount</span>
              <span className="text-xs font-medium text-red-400">
                {hasCalculatorError ? (
                  <span className="text-red-400 text-xs font-mono">Invalid Input</span>
                ) : (
                  `$${(accountBalance * (riskPercent / 100)).toFixed(2)}`
                )}
              </span>
            </div>
          </div>
        )}
      </div>

      {(slpAnalysis?.signal || hasActivePois) && (
        <div data-testid="active-signal-card" className="mt-4 pt-4 border-t border-[#2D313E]/60">
          <ActiveSignalCard signal={slpAnalysis?.signal} />
        </div>
      )}
    </div>
  );
};

export default TradingPlanPanel;
