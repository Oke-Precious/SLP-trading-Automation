import React, { useState } from 'react';
import { Target, Check } from 'lucide-react';

interface DashboardPlanProps {
  stepsCompleted: boolean[];
  setStepsCompleted: (steps: boolean[]) => void;
  showToast: (msg: string) => void;
  appStateMode: string;
  setAppStateMode: (m: string) => void;
  signalSpec: { entry: string; sl: string; tp1: string; tp2: string; rr: string };
  currencySymbol: string;
}

export default function DashboardPlan({
  stepsCompleted,
  setStepsCompleted,
  showToast,
  appStateMode,
  setAppStateMode,
  signalSpec,
  currencySymbol
}: DashboardPlanProps) {
  const [showCalculator, setShowCalculator] = useState(false);
  const [accountBalance, setAccountBalance] = useState<number>(10000);
  const [riskPercent, setRiskPercent] = useState<number>(1);
  const [stopLossDistance, setStopLossDistance] = useState<number>(500);

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
  if (appStateMode === 'empty') {
    return (
      <section className="bg-[#1A1F2C] border border-[#2A2E39] rounded-xl flex flex-col justify-between h-[520px] overflow-hidden">
        <div className="p-4 bg-[#1E2433] border-b border-[#2A2E39] flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider font-bold text-gray-300">Daily Trading Plan Rules</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center p-5 space-y-3">
          <Target size={32} className="text-gray-500 animate-pulse" />
          <span className="text-xs text-gray-300 font-bold font-mono">RULES CHECKLIST OFFLINE</span>
          <p className="text-[10px] text-gray-500 max-w-[200px] leading-snug">No active bounds defined. Click below to reload active compliance constraints into the plan roster.</p>
          <button
            onClick={() => {
              setStepsCompleted([true, true, false, false, false, false]);
              setAppStateMode('healthy');
              showToast("Standard compliance steps re-loaded successfully!");
            }}
            className="text-[9px] bg-[#26A69A]/15 text-[#26A69A] border border-[#26A69A]/30 px-3 py-1.5 rounded hover:bg-[#26A69A]/30 transition-all uppercase font-semibold cursor-pointer"
          >
            Restore Rules Checklist
          </button>
        </div>
      </section>
    );
  }

  const stepsList = [
    { idx: 1, title: '1. Establish HTF Bias (Daily/4H)', desc: 'Scan daily chart for 2-3 consecutive trends (e.g., HH/HL for Bullish or LH/LL for Bearish).' },
    { idx: 2, title: '2. Plot Unmitigated HTF POIs', desc: 'Mark Daily/4H Order Blocks or Breakers. These are areas where price usually retraces.' },
    { idx: 3, title: '3. Monitor Retracement to POI', desc: 'Wait patiently for price to correction or retrace into unmitigated zone. Avoid chasing premium spikes.' },
    { idx: 4, title: '4. Wait for Lower TF MSS', desc: 'Confirm on H1/15m with a Market Structure Shift. The candle body must close cleanly beyond the trigger high/low.' },
    { idx: 5, title: '5. Place Entry at LTF POI', desc: 'Set limit setups at nearest unmitigated LTF block aligned strictly with the overall HTF bias.' },
    { idx: 6, title: '6. Target Swing Bounds & DBOS', desc: 'Target next logical HH (bullish) or LL (bearish). Scale-in trailing entries via Double Breaker Steps.' },
  ];

  return (
    <section 
      id="quad-2-trading-plan"
      className="bg-[#1A1F2C] border border-[#2A2E39] rounded-xl flex flex-col justify-between h-[520px] overflow-hidden"
    >
      <div className="p-4 bg-[#1E2433] border-b border-[#2A2E39] flex items-center justify-between shrink-0">
        <span className="text-xs uppercase tracking-wider font-bold text-gray-300">
          Daily Trading Plan Rules
        </span>
        <span className="text-[10px] bg-[#26A69A]/10 text-[#26A69A] border border-[#26A69A]/30 px-1.5 py-0.5 rounded font-bold">
          SESSION ACTIVE
        </span>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-2.5">
        {stepsList.map((step, sIdx) => {
          const isDone = stepsCompleted[sIdx];
          return (
            <div 
              key={step.idx}
              onClick={() => {
                const newSteps = [...stepsCompleted];
                newSteps[sIdx] = !newSteps[sIdx];
                setStepsCompleted(newSteps);
                showToast(`Step ${step.idx} status updated!`);
              }}
              className={`p-2.5 rounded border transition-colors cursor-pointer flex items-start space-x-3 ${
                isDone 
                  ? 'bg-[#2A3245]/20 border-[#26A69A]/30 text-gray-300' 
                  : 'bg-[#141822] border-[#2A2E39] text-gray-400 hover:border-gray-600'
              }`}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                isDone ? 'bg-[#26A69A] text-slate-950' : 'bg-[#202940] text-slate-100'
              }`}>
                {isDone ? <Check size={10} className="stroke-[3]" /> : step.idx}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className={`text-xs font-bold leading-tight ${isDone ? 'text-gray-400 line-through' : 'text-gray-100'}`}>
                  {step.title}
                </h4>
                <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">
                  {step.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 border-t border-[#2A2E39] bg-[#141822] shrink-0">
        <div className="border border-[#26A69A] bg-[#26A69A]/5 rounded-lg p-3 relative overflow-hidden">
          <div className="absolute top-2 right-2 text-[8px] bg-[#26A69A]/20 text-[#26A69A] px-1.5 py-0.5 rounded font-mono font-bold">
            ACTIVE SIGNAL
          </div>

          <div className="flex items-center space-x-2">
            <Target size={14} className="text-[#26A69A]" />
            <span className="text-xs font-bold text-gray-200">SLP Long Setup Trigger</span>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-[#26A69A]/15 text-[9px] font-mono">
            <div>
              <span className="text-gray-500 block">ENTRY:</span>
              <span className="text-[#26A69A] font-bold">{currencySymbol}{signalSpec.entry}</span>
            </div>
            <div>
              <span className="text-gray-500 block">STOP LOSS:</span>
              <span className="text-[#EF5350] font-bold">{currencySymbol}{signalSpec.sl}</span>
            </div>
            <div>
              <span className="text-gray-500 block">PROFIT RATIO:</span>
              <span className="text-[#CAAA98] font-bold">{signalSpec.rr}</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-[#26A69A]/15">
            <button 
              onClick={() => setShowCalculator(!showCalculator)}
              className="flex items-center justify-between w-full text-xs font-bold uppercase text-gray-200 hover:text-white transition-colors focus:outline-none cursor-pointer"
            >
              <div className="flex items-center space-x-2">
                <Target size={14} className="text-blue-400" />
                <span>POSITION SIZE CALCULATOR</span>
              </div>
              <span className="text-[10px]">{showCalculator ? '▲' : '▼'}</span>
            </button>
            
            {showCalculator && (
              <div className="mt-3 space-y-2 bg-[#1A1E29] p-2.5 rounded-lg border border-gray-800 text-[10px]">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-gray-400 uppercase tracking-wider block mb-1">Account Bal ($)</label>
                    <input 
                      type="number" 
                      value={accountBalance || ''}
                      onChange={(e) => handleAccountChange(e.target.value)}
                      className={`w-full bg-[#111622] border ${accountError ? 'border-red-500' : 'border-gray-700'} rounded p-1.5 text-white focus:outline-none focus:border-blue-500 font-mono`}
                    />
                    {accountError && (
                      <p className="text-red-400 text-[8px] mt-0.5 font-mono">{accountError}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-gray-400 uppercase tracking-wider block mb-1">Risk (%)</label>
                    <input 
                      type="number"
                      step="0.1" 
                      value={riskPercent || ''}
                      onChange={(e) => handleRiskChange(e.target.value)}
                      className={`w-full bg-[#111622] border ${riskError ? 'border-red-500' : 'border-gray-700'} rounded p-1.5 text-white focus:outline-none focus:border-blue-500 font-mono`}
                    />
                    {riskError && (
                      <p className="text-red-400 text-[8px] mt-0.5 font-mono">{riskError}</p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <label className="text-gray-400 uppercase tracking-wider block mb-1">SL Distance (Price diff/Pips)</label>
                    <input 
                      type="number" 
                      value={stopLossDistance || ''}
                      onChange={(e) => handleSlChange(e.target.value)}
                      className={`w-full bg-[#111622] border ${slError ? 'border-red-500' : 'border-gray-700'} rounded p-1.5 text-white focus:outline-none focus:border-blue-500 font-mono`}
                    />
                    {slError && (
                      <p className="text-red-400 text-[8px] mt-0.5 font-mono">{slError}</p>
                    )}
                  </div>
                </div>
                
                <div className="mt-2 pt-2 border-t border-gray-700 flex justify-between items-center bg-[#2A3245]/20 p-2 rounded">
                  <span className="text-gray-400 uppercase tracking-wider">Position Size (Units)</span>
                  <span className="text-[11px] font-bold text-blue-400 font-mono">
                    {hasCalculatorError ? (
                      <span className="text-red-400 text-[9px]">Invalid Input</span>
                    ) : (
                      stopLossDistance > 0 ? ((accountBalance * (riskPercent / 100)) / stopLossDistance).toFixed(4) : "0.0000"
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center p-1 px-2">
                  <span className="text-gray-400 uppercase tracking-wider">Risk Amount</span>
                  <span className="font-medium text-red-400 font-mono">
                    {hasCalculatorError ? (
                      <span className="text-red-400 text-[9px]">Invalid Input</span>
                    ) : (
                      `$${(accountBalance * (riskPercent / 100)).toFixed(2)}`
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => showToast(`Limit order parameters synchronized to terminal: Entry ${currencySymbol}${signalSpec.entry}!`)}
            className="w-full mt-3 bg-[#26A69A] hover:bg-emerald-600 text-slate-950 py-1.5 rounded font-bold text-[10px] transition-colors cursor-pointer text-center block uppercase"
          >
            Deploy Order Limit &rarr;
          </button>
        </div>
      </div>
    </section>
  );
}
