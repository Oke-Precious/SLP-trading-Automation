import React from 'react';

export default function BacktestPage() {
  return (
    <div className="p-6 bg-[#111622] text-[#E0E3EB] min-h-full flex items-center justify-center">
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="text-[#CAAA98] text-5xl mb-4">🔬</div>
        <h2 className="text-white text-lg font-semibold mb-2 font-display uppercase tracking-wider">Backtest Engine — Coming Soon</h2>
        <p className="text-[#9AA3B2] text-sm max-w-sm leading-relaxed font-mono mt-2">
          The backtest engine will compute real win rates, trade outcomes, and performance metrics 
          once the SMC signal detection engine is complete. Real data only — no estimates.
        </p>
      </div>
    </div>
  );
}
