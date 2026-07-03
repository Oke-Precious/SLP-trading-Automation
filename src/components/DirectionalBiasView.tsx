import React, { useState, useEffect } from 'react';
import { fetchCandlesWithFlag } from '../lib/market/marketDataService';
import { analyseBias } from '../lib/analysis/biasEngine';

const PAIRS = ['BTCUSDT','ETHUSDT','SOLUSDT','EURUSD','GBPUSD','USDJPY','XAUUSD'];
const TIMEFRAMES = ['1d', '4h', '1h', '30m', '15m'];

export default function DirectionalBiasView() {
  const [data, setData] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [now, setNow] = useState<Date>(new Date());

  const loadData = async () => {
    setIsLoading(true);
    const newData: any = {};
    
    for (const pair of PAIRS) {
      newData[pair] = {};
    }

    try {
      await Promise.allSettled(
        PAIRS.map(async (pair) => {
          const results = await Promise.allSettled(
            TIMEFRAMES.map((tf) => fetchCandlesWithFlag(pair, tf, 100))
          );
          
          results.forEach((result, i) => {
            const tf = TIMEFRAMES[i];
            if (result.status === 'fulfilled' && result.value.candles.length >= 20) {
              const biasResult = analyseBias(result.value.candles, tf);
              newData[pair][tf] = { 
                bias: biasResult.bias, 
                isRealData: result.value.isRealData, 
                rawBias: biasResult.bias 
              };
            } else {
              newData[pair][tf] = { bias: 'N/A', isRealData: false, rawBias: 'N/A' };
            }
          });
        })
      );
      
      setData(newData);
      setLastRefreshed(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5 * 60 * 1000);
    const timeInterval = setInterval(() => setNow(new Date()), 1000);
    
    return () => {
      clearInterval(interval);
      clearInterval(timeInterval);
    };
  }, []);

  const getOverallBias = (pairData: any) => {
    if (!pairData) return { overall: 'RANGING', color: 'text-gray-500' };
    
    let bullish = 0;
    let bearish = 0;
    
    ['1d', '4h', '1h'].forEach(tf => {
       if (pairData[tf]?.rawBias === 'BULLISH') bullish++;
       if (pairData[tf]?.rawBias === 'BEARISH') bearish++;
    });
    
    if (bullish >= 2) return { overall: 'BULLISH', color: 'text-[#26A69A]' };
    if (bearish >= 2) return { overall: 'BEARISH', color: 'text-[#EF5350]' };
    return { overall: 'RANGING', color: 'text-gray-500' };
  };

  return (
    <div className="bg-[#1A1F2C] border border-[#2A2E39] rounded-xl p-5">
      <div className="flex justify-between items-center mb-6 pb-2 border-b border-[#2A2E39]">
        <div>
          <h2 className="text-sm font-bold text-gray-100 uppercase tracking-wider font-display">Multi-Timeframe Structure Matrix</h2>
          <p className="text-xs text-gray-400 mt-1">Simultaneous alignment matrix verifying SLP macro elements across all resolutions.</p>
          <p className="text-[10px] text-gray-500 mt-1">
            {lastRefreshed ? `Last refreshed: ${lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Loading...'}
          </p>
        </div>
        <button 
          onClick={loadData} 
          disabled={isLoading}
          className="text-[10px] bg-[#2A2E39] hover:bg-[#3A3E49] text-gray-300 px-3 py-1.5 rounded font-mono uppercase transition-colors"
        >
          {isLoading ? 'Refreshing...' : 'Refresh All'}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="border-b border-[#2A2E39] text-gray-500 uppercase text-[10px]">
              <th className="py-3 px-4">ASSET PAIR</th>
              <th className="py-3 px-4">DAILY (1D)</th>
              <th className="py-3 px-4">4 HOURS (4H)</th>
              <th className="py-3 px-4">1 HOUR (1H)</th>
              <th className="py-3 px-4">30 MINS (30m)</th>
              <th className="py-3 px-4">15 MINS (15m)</th>
              <th className="py-3 px-4 text-right">OVERALL BIAS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2A2E39] text-gray-300">
            {PAIRS.map((pair) => {
              const pairData = data[pair] || {};
              const overall = getOverallBias(pairData);
              return (
                <tr key={pair} className="hover:bg-[#111622]/50 transition-colors">
                  <td className="py-4 px-4 font-bold text-[#CAAA98]">
                    {pair}
                    <div className="text-[9px] text-gray-600 font-sans font-normal mt-1">
                      {lastRefreshed ? `Updated: ${Math.floor((now.getTime() - lastRefreshed.getTime()) / 1000)} seconds ago` : ''}
                    </div>
                  </td>
                  {TIMEFRAMES.map((tf, cIdx) => {
                    const cell = pairData[tf];
                    let display = 'LOADING';
                    let bg = 'bg-gray-800 text-gray-400';
                    let title = '';
                    
                    if (cell) {
                      if (!cell.isRealData && cell.bias === 'N/A') {
                        display = 'N/A';
                        bg = 'bg-gray-700 text-gray-400';
                        title = 'Live data unavailable';
                      } else {
                        display = cell.bias;
                        bg = display === 'BULLISH' ? 'bg-[#26A69A]/10 text-[#26A69A]' : display === 'BEARISH' ? 'bg-[#EF5350]/10 text-[#EF5350]' : 'bg-gray-600/20 text-gray-400';
                        if (!cell.isRealData) {
                          display = display + ' *';
                          title = 'Demo Sandbox Data — add API key for live feed';
                        }
                      }
                    }
                    
                    return (
                      <td key={cIdx} className="py-4 px-4" title={title}>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${bg}`}>
                          {display}
                        </span>
                      </td>
                    );
                  })}
                  <td className="py-4 px-4 font-sans font-semibold text-right">
                    <span className={`inline-flex items-center space-x-1 ${overall.color}`}>
                      <span>&bull;</span>
                      <span>{overall.overall}</span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="text-[10px] text-gray-500 mt-4 border-t border-[#2A2E39] pt-3 flex items-center justify-between">
        <span>* Sandbox Mode: Items marked with (*) are running on emulated market data due to live feed restrictions.</span>
        <span className="text-[#CAAA98] cursor-pointer hover:underline" onClick={loadData}>Force Sync</span>
      </div>
    </div>
  );
}
