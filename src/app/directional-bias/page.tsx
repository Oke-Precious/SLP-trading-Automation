/**
 * @file page.tsx
 * @description Directional bias page.
 */

'use client';

import React, { useState } from 'react';
import { useBiasStore } from '../../store/useBiasStore';
import { CurrencyPair, Timeframe } from '../../types';
import { BiasValue } from '../../types/bias';
import { Compass, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { motion } from 'motion/react';

export default function DirectionalBiasPage() {
  const { biasMap, setBias } = useBiasStore();
  const pairs: CurrencyPair[] = ['BTCUSDT', 'ETHUSDT', 'EURUSD', 'GBPUSD'];
  const timeframes: Timeframe[] = ['1D', '4H', '1H', '30m', '15m', '5m'];

  const [selectedPair, setSelectedPair] = useState<CurrencyPair>('BTCUSDT');

  const getBiasIcon = (bias: BiasValue) => {
    switch (bias) {
      case 'BULLISH': return <TrendingUp size={16} className="text-bullish" />;
      case 'BEARISH': return <TrendingDown size={16} className="text-bearish" />;
      case 'RANGING': return <Minus size={16} className="text-gray-400" />;
    }
  };

  const getBiasColor = (bias: BiasValue) => {
    switch (bias) {
      case 'BULLISH': return 'border-bullish text-bullish bg-bullish/10';
      case 'BEARISH': return 'border-bearish text-bearish bg-bearish/10';
      case 'RANGING': return 'border-gray-600 text-gray-400 bg-gray-800/50';
    }
  };

  return (
    <div className="p-6 h-full overflow-y-auto bg-[#0A0D14] text-gray-200">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2A2E39] pb-4">
          <div>
            <h1 className="text-2xl font-bold font-display uppercase tracking-wide text-white flex items-center gap-3">
              <Compass className="text-[#CAAA98]" size={24} />
              Directional Bias Matrix
            </h1>
            <p className="text-sm text-gray-400 mt-1">Configure your multi-timeframe directional bias manually or let ML models update it.</p>
          </div>
        </div>

        {/* Pair Selector */}
        <div className="flex gap-2 p-1 bg-[#131722] border border-[#2A2E39] rounded-lg w-fit">
          {pairs.map(pair => (
             <button
               key={pair}
               onClick={() => setSelectedPair(pair)}
               className={`px-4 py-2 rounded-md text-sm font-bold tracking-wider transition-colors ${
                 selectedPair === pair ? 'bg-[#2A2E39] text-white' : 'text-gray-500 hover:text-gray-300'
               }`}
             >
               {pair}
             </button>
          ))}
        </div>

        {/* Timeframe Matrix */}
        <motion.div 
          key={selectedPair}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="grid gap-4"
        >
           {timeframes.map((tf) => {
              const currentBias = biasMap[selectedPair]?.[tf] || 'RANGING';
              return (
                <div key={tf} className="bg-[#131722] border border-[#2A2E39] rounded-xl p-4 flex items-center justify-between">
                   <div className="flex items-center gap-4 w-1/3">
                      <span className="bg-[#2A2E39] text-white font-mono font-bold px-3 py-1 rounded text-sm min-w-[3rem] text-center">{tf}</span>
                      <span className="text-sm text-gray-400 hidden md:inline-block">Timeframe Bias</span>
                   </div>
                   
                   <div className="flex flex-1 justify-center gap-2 md:gap-4 w-full max-w-sm">
                      <button 
                         onClick={() => setBias(selectedPair, tf, 'BULLISH')}
                         className={`flex-1 py-2 px-3 rounded-lg border text-xs font-bold uppercase flex items-center justify-center gap-2 transition-colors ${currentBias === 'BULLISH' ? getBiasColor('BULLISH') : 'border-[#2A2E39] text-gray-500 hover:text-white bg-[#0A0D14]'}`}
                      >
                         <TrendingUp size={14} /> Bullish
                      </button>
                      <button 
                         onClick={() => setBias(selectedPair, tf, 'RANGING')}
                         className={`flex-1 py-2 px-3 rounded-lg border text-xs font-bold uppercase flex items-center justify-center gap-2 transition-colors ${currentBias === 'RANGING' ? getBiasColor('RANGING') : 'border-[#2A2E39] text-gray-500 hover:text-white bg-[#0A0D14]'}`}
                      >
                         <Minus size={14} /> Ranging
                      </button>
                      <button 
                         onClick={() => setBias(selectedPair, tf, 'BEARISH')}
                         className={`flex-1 py-2 px-3 rounded-lg border text-xs font-bold uppercase flex items-center justify-center gap-2 transition-colors ${currentBias === 'BEARISH' ? getBiasColor('BEARISH') : 'border-[#2A2E39] text-gray-500 hover:text-white bg-[#0A0D14]'}`}
                      >
                         <TrendingDown size={14} /> Bearish
                      </button>
                   </div>
                </div>
              );
           })}
        </motion.div>
      </div>
    </div>
  );
}
