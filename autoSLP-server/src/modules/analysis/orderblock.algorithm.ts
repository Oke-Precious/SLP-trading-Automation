import { Candle, POIZone } from '../../shared/types/index.js';

/**
 * Calculates average true range (ATR) to establish dynamic impulse multiplier limits
 */
function calculateATR(candles: Candle[], period: number = 14): number {
  if (candles.length < period) return 1.0; // fallback standard
  let sum = 0;
  for (let i = 1; i < Math.min(candles.length, period + 1); i++) {
    const highLow = candles[i].high - candles[i].low;
    const highClose = Math.abs(candles[i].high - candles[i - 1].close);
    const lowClose = Math.abs(candles[i].low - candles[i - 1].close);
    sum += Math.max(highLow, highClose, lowClose);
  }
  return sum / period;
}

export function detectOrderBlocks(candles: Candle[]): POIZone[] {
  const blocks: POIZone[] = [];
  if (candles.length < 5) return blocks;

  const atr = calculateATR(candles, 14);
  const impulseThreshold = atr * 3.0;

  for (let i = 2; i < candles.length - 2; i++) {
    const prior = candles[i - 1];
    const current = candles[i];
    const trigger = candles[i + 1];

    const isBearishPrior = current.close < current.open;
    const isBullishPrior = current.close > current.open;

    const isBullishTrigger = trigger.close > trigger.open;
    const isBearishTrigger = trigger.close < trigger.open;

    // Detect upward expansion (Impulsive Bullish OB)
    const expansionUp = trigger.close - trigger.open;
    if (isBearishPrior && isBullishTrigger && expansionUp >= impulseThreshold) {
      blocks.push({
        type: 'ORDER_BLOCK',
        direction: 'BULLISH',
        priceFloor: current.low,
        priceCeiling: Math.max(current.open, current.high),
        timestamp: current.timestamp,
        status: 'ACTIVE',
        notes: `Bullish OB detected prior to dynamic up-surge of ${expansionUp.toFixed(1)}`
      });
    }

    // Detect downward expansion (Impulsive Bearish OB)
    const expansionDown = trigger.open - trigger.close;
    if (isBullishPrior && isBearishTrigger && expansionDown >= impulseThreshold) {
      blocks.push({
        type: 'ORDER_BLOCK',
        direction: 'BEARISH',
        priceFloor: Math.min(current.open, current.low),
        priceCeiling: current.high,
        timestamp: current.timestamp,
        status: 'ACTIVE',
        notes: `Bearish OB detected prior to dynamic down-drop of ${expansionDown.toFixed(1)}`
      });
    }
  }

  return blocks;
}

export function detectBreakerBlocks(candles: Candle[], orderBlocks: POIZone[]): POIZone[] {
  if (candles.length === 0) return orderBlocks;
  const latestPrice = candles[candles.length - 1].close;

  return orderBlocks.map((block) => {
    // If a Bullish OB was broken by a candle closing below its floor price, it becomes a Bearish Breaker Block
    if (block.type === 'ORDER_BLOCK' && block.direction === 'BULLISH' && latestPrice < block.priceFloor) {
      return {
        ...block,
        type: 'BREAKER_BLOCK',
        direction: 'BEARISH',
        status: 'ACTIVE',
        notes: `Bullish OB broken down. Re-mapped into resistant Bearish Breaker Zone at price ${latestPrice.toFixed(1)}`
      };
    }

    // If a Bearish OB was broken by a candle closing above its ceiling price, it becomes a Bullish Breaker Block
    if (block.type === 'ORDER_BLOCK' && block.direction === 'BEARISH' && latestPrice > block.priceCeiling) {
      return {
        ...block,
        type: 'BREAKER_BLOCK',
        direction: 'BULLISH',
        status: 'ACTIVE',
        notes: `Bearish OB breached upward. Re-mapped into supportive Bullish Breaker Zone at price ${latestPrice.toFixed(1)}`
      };
    }

    return block;
  });
}
