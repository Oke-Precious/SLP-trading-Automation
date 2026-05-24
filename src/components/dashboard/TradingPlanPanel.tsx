/**
 * @file TradingPlanPanel.tsx
 * @description The interactive 6-step trading checklist embodying the strict video masterclass rules.
 */

import React, { useState } from 'react';
import { CheckSquare, Square, Flame } from 'lucide-react';

export const TradingPlanPanel: React.FC = () => {
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: false,
    4: false,
    5: false,
    6: false,
  });

  const steps = [
    { id: 1, title: 'Establish HTF Bias (Daily/4H)', desc: 'Daily order flow in structural trend (HH + HL sequence).' },
    { id: 2, title: 'Plot Unmitigated HTF POIs', desc: 'Symmetric Order Blocks & Breaker structures plotted.' },
    { id: 3, title: 'Monitor Retracement to POI', desc: 'Wait patiently for price to correct into unmitigated zone.' },
    { id: 4, title: 'Wait for Lower TF MSS & Inducement', desc: 'Confirm on H1/15m. Structure Shift close must be on BODY close, not wick.' },
    { id: 5, title: 'Place Limit Entry at LTF POI', desc: 'Secure order set at closest unmitigated block aligned with overall HTF trend.' },
    { id: 6, title: 'Target Swing Bounds & DBOS', desc: 'Target next logical HH/LL. Scale-in via Double Breaker Steps.' },
  ];

  const toggleStep = (id: number) => {
    setCompletedSteps((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const completedCount = Object.values(completedSteps).filter(Boolean).length;

  return (
    <div className="bg-card border border-border-custom rounded-xl p-5 hover:border-[#3A455E] transition-all duration-300">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <Flame className="text-light shrink-0" size={18} />
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">Interactive Trading Plan</h3>
        </div>
        <span className="text-[10px] bg-light/10 text-light border border-light/25 px-2.5 py-0.5 rounded font-mono font-bold uppercase">
          {completedCount} / 6 STEPS COMPLETED
        </span>
      </div>

      <div className="space-y-2.5 max-h-[290px] overflow-y-auto pr-1">
        {steps.map((step) => {
          const isDone = completedSteps[step.id];
          return (
            <div 
              key={step.id}
              onClick={() => toggleStep(step.id)}
              className={`flex items-start space-x-3 p-2.5 rounded-lg border transition-all cursor-pointer ${
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
  );
};

export default TradingPlanPanel;
