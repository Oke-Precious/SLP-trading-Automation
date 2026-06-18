/**
 * @file TradingPlanPanel.tsx
 * @description The interactive 6-step trading checklist embodying the strict video masterclass rules.
 */

import React, { useState } from 'react';
import { CheckSquare, Square, Flame, Calculator, ChevronDown, ChevronUp } from 'lucide-react';
import { usePOIStore } from '../../store/usePOIStore';
import { BiasResult } from '../../lib/analysis/biasEngine';
import { ActiveSignalCard } from './ActiveSignalCard';

interface TradingPlanPanelProps {
  biasResult: BiasResult | null;
}

export const TradingPlanPanel: React.FC<TradingPlanPanelProps> = ({ biasResult }) => {
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

  const { pois } = usePOIStore();
  const hasActivePois = pois.some(p => p.status === 'Active');

  const steps = [
    { 
      id: 1, 
      title: 'Establish HTF Bias (Daily/4H)', 
      desc: biasResult && biasResult.structure && biasResult.structure !== 'Insufficient data'
        ? `Market is ${biasResult.structure}`
        : 'Daily order flow in structural trend (HH + HL sequence).' 
    },
    { 
      id: 2, 
      title: 'Plot Unmitigated HTF POIs', 
      desc: 'Symmetric Order Blocks & Breaker structures plotted.' 
    },
    { 
      id: 3, 
      title: 'Monitor Retracement to POI', 
      desc: biasResult && biasResult.nextMove && biasResult.nextMove !== 'Need more candle data'
        ? biasResult.nextMove 
        : 'Wait patiently for price to correct into unmitigated zone.' 
    },
    { 
      id: 4, 
      title: 'Wait for Lower TF MSS & Inducement', 
      desc: 'Confirm on H1/15m. Structure Shift close must be on BODY close, not wick.' 
    },
    { 
      id: 5, 
      title: 'Place Limit Entry at LTF POI', 
      desc: 'Secure order set at closest unmitigated block aligned with overall HTF trend.' 
    },
    { 
      id: 6, 
      title: 'Target Swing Bounds & DBOS', 
      desc: 'Target next logical HH/LL. Scale-in via Double Breaker Steps.' 
    },
  ];

  const toggleStep = (id: number) => {
    setCompletedSteps((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const completedCount = Object.values(completedSteps).filter(Boolean).length;

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
            const isDone = completedSteps[step.id];
            return (
              <div 
                key={step.id}
                onClick={() => toggleStep(step.id)}
                className={`flex items-start space-x-3 p-2 rounded-lg border transition-all cursor-pointer ${
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
                <div>
                  <span className={`text-xs font-bold leading-tight uppercase block ${
                    isDone ? 'text-bullish line-through' : 'text-gray-200'
                  }`}>
                    {step.title}
                  </span>
                  <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
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
          <div className="mt-3 space-y-3 bg-[#131722] p-3 rounded-lg border border-gray-800">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Account ($)</label>
                <input 
                  type="number" 
                  value={accountBalance}
                  onChange={(e) => setAccountBalance(Number(e.target.value))}
                  className="w-full bg-[#1A1E29] border border-gray-700 rounded text-xs p-1.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Risk (%)</label>
                <input 
                  type="number"
                  step="0.1" 
                  value={riskPercent}
                  onChange={(e) => setRiskPercent(Number(e.target.value))}
                  className="w-full bg-[#1A1E29] border border-gray-700 rounded text-xs p-1.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">SL Distance (Price diff/Pips)</label>
                <input 
                  type="number" 
                  value={stopLossDistance}
                  onChange={(e) => setStopLossDistance(Number(e.target.value))}
                  className="w-full bg-[#1A1E29] border border-gray-700 rounded text-xs p-1.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="mt-2 pt-2 border-t border-gray-700 flex justify-between items-center">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider">Position Size (Units)</span>
              <span className="text-sm font-bold text-blue-400">
                {stopLossDistance > 0 ? ((accountBalance * (riskPercent / 100)) / stopLossDistance).toFixed(4) : "0.0000"}
              </span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider">Risk Amount</span>
              <span className="text-xs font-medium text-red-400">
                ${(accountBalance * (riskPercent / 100)).toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>

      {hasActivePois && (
        <div data-testid="active-signal-card" className="mt-4 pt-4 border-t border-[#2D313E]/60">
          <ActiveSignalCard />
        </div>
      )}
    </div>
  );
};

export default TradingPlanPanel;
