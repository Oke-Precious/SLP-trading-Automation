import { Candle, LiquidityPool } from '../../shared/types/index.js';

export function mapLiquidityPools(candles: Candle[], percentageThresh: number = 0.0015): LiquidityPool[] {
  const pools: LiquidityPool[] = [];
  const len = candles.length;

  for (let i = 0; i < len; i++) {
    for (let j = i + 5; j < len; j++) {
      const currentLow = candles[i].low;
      const futureLow = candles[j].low;
      
      const currentHigh = candles[i].high;
      const futureHigh = candles[j].high;

      // Equal Lows Check (EQL - Sell-side Liquidity Pool)
      if (Math.abs(currentLow - futureLow) / currentLow <= percentageThresh) {
        pools.push({
          id: `eql-${i}-${j}`,
          type: 'SELL_SIDE_LIQUIDITY',
          priceLevel: Math.min(currentLow, futureLow),
          candlesMatched: [candles[i].timestamp, candles[j].timestamp]
        });
      }

      // Equal Highs Check (EQH - Buy-side Liquidity Pool)
      if (Math.abs(currentHigh - futureHigh) / currentHigh <= percentageThresh) {
        pools.push({
          id: `eqh-${i}-${j}`,
          type: 'BUY_SIDE_LIQUIDITY',
          priceLevel: Math.max(currentHigh, futureHigh),
          candlesMatched: [candles[i].timestamp, candles[j].timestamp]
        });
      }
    }
  }

  return pools;
}
