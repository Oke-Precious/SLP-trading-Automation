export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: Date;
}

export interface SwingPoint {
  price: number;
  index: number;
  timestamp: Date;
  type: 'HH' | 'HL' | 'LH' | 'LL';
}

export interface BiasResult {
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  strength: 'STRONG' | 'MODERATE' | 'WEAK';
  structure: string;
  phase: string;
  lastHH?: number;
  lastHL?: number;
}

export interface OrderBlock {
  type: 'BULLISH' | 'BEARISH';
  priceFrom: number;
  priceTo: number;
  timestamp: Date;
  index: number;
  strength: number;
}

export interface LiquidityPool {
  type: 'BSL' | 'SSL';
  price: number;
  timestamp: Date;
  index: number;
}

export const analysisService = {

  // ── SWING POINT DETECTION ─────────────────────────────────────────────
  detectSwingPoints(candles: Candle[], lookback = 5): { highs: SwingPoint[], lows: SwingPoint[] } {
    const highs: { price: number; index: number; timestamp: Date }[] = [];
    const lows:  { price: number; index: number; timestamp: Date }[] = [];

    for (let i = lookback; i < candles.length - lookback; i++) {
      const current = candles[i];
      const window  = candles.slice(i - lookback, i + lookback + 1);

      // Swing High: current.high is highest in window
      if (current.high === Math.max(...window.map(c => c.high))) {
        highs.push({ price: current.high, index: i, timestamp: current.timestamp });
      }
      // Swing Low: current.low is lowest in window
      if (current.low === Math.min(...window.map(c => c.low))) {
        lows.push({ price: current.low, index: i, timestamp: current.timestamp });
      }
    }

    // Classify HH/LH and HL/LL
    const classifiedHighs: SwingPoint[] = highs.map((h, i) => ({
      ...h,
      type: (i === 0 || h.price > highs[i - 1].price) ? 'HH' : 'LH'
    }));
    const classifiedLows: SwingPoint[] = lows.map((l, i) => ({
      ...l,
      type: (i === 0 || l.price > lows[i - 1].price) ? 'HL' : 'LL'
    }));

    return { highs: classifiedHighs, lows: classifiedLows };
  },

  // ── BIAS CALCULATION ──────────────────────────────────────────────────
  calculateBias(candles: Candle[], timeframe?: string): BiasResult {
    if (candles.length < 20) {
      return { bias: 'NEUTRAL', strength: 'WEAK', structure: 'Insufficient data', phase: 'Unknown' };
    }

    const lookback = Math.min(5, Math.floor(candles.length / 10));
    const { highs, lows } = this.detectSwingPoints(candles, lookback);

    if (highs.length < 2 || lows.length < 2) {
      return { bias: 'NEUTRAL', strength: 'WEAK', structure: 'Developing', phase: 'Consolidation' };
    }

    // Check last 3 highs and lows
    const recentHighs = highs.slice(-3);
    const recentLows  = lows.slice(-3);

    const hhCount = recentHighs.filter(h => h.type === 'HH').length;
    const lhCount = recentHighs.filter(h => h.type === 'LH').length;
    const hlCount = recentLows.filter(l  => l.type  === 'HL').length;
    const llCount = recentLows.filter(l  => l.type  === 'LL').length;

    let bias: 'BULLISH'|'BEARISH'|'NEUTRAL';
    let strength: 'STRONG'|'MODERATE'|'WEAK';
    let structure: string;
    let phase: string;

    if (hhCount >= 2 && hlCount >= 2) {
      bias = 'BULLISH';
      strength = (hhCount === 3 && hlCount === 3) ? 'STRONG' : hhCount >= 2 ? 'MODERATE' : 'WEAK';
      structure = 'Higher Highs & Higher Lows';
      phase = this.detectPhase(candles, 'BULLISH');
    } else if (lhCount >= 2 && llCount >= 2) {
      bias = 'BEARISH';
      strength = (lhCount === 3 && llCount === 3) ? 'STRONG' : lhCount >= 2 ? 'MODERATE' : 'WEAK';
      structure = 'Lower Highs & Lower Lows';
      phase = this.detectPhase(candles, 'BEARISH');
    } else {
      bias = 'NEUTRAL';
      strength = 'WEAK';
      structure = 'Mixed / Consolidation';
      phase = 'Ranging';
    }

    const lastHH = recentHighs.find(h => h.type === 'HH')?.price;
    const lastHL = recentLows.find(l  => l.type  === 'HL')?.price;

    return { bias, strength, structure, phase, lastHH, lastHL };
  },

  // ── PHASE DETECTION ───────────────────────────────────────────────────
  detectPhase(candles: Candle[], bias: string): string {
    const recent = candles.slice(-20);
    const last   = recent[recent.length - 1];
    const prev   = recent[0];
    const move   = Math.abs(last.close - prev.close) / prev.close;

    if (move > 0.03) return 'Impulse';
    if (move < 0.01) return 'Correction';

    const avgVol = recent.reduce((s, c) => s + c.volume, 0) / recent.length;
    if (last.volume > avgVol * 1.5) return 'Continuation';
    return 'Retracement';
  },

  // ── ORDER BLOCK DETECTION ─────────────────────────────────────────────
  detectOrderBlocks(candles: Candle[]): OrderBlock[] {
    const blocks: OrderBlock[] = [];
    const atr = this.calculateATR(candles, 14);

    for (let i = 5; i < candles.length - 5; i++) {
      // Bullish OB: last bearish candle before a strong bullish impulse
      if (candles[i].close < candles[i].open) {  // bearish candle
        // Check if followed by bullish impulse (3+ candles moving up)
        const impulseCandles = candles.slice(i + 1, i + 6);
        const totalMove = impulseCandles.reduce((acc, c) => acc + (c.close - c.open), 0);

        if (totalMove > atr * 1.5) {
          const strength = Math.min(totalMove / (atr * 3), 1);
          blocks.push({
            type:      'BULLISH',
            priceFrom: candles[i].low,
            priceTo:   candles[i].high,
            timestamp: candles[i].timestamp,
            index:     i,
            strength:  parseFloat(strength.toFixed(2)),
          });
        }
      }

      // Bearish OB: last bullish candle before a strong bearish impulse
      if (candles[i].close > candles[i].open) {  // bullish candle
        const impulseCandles = candles.slice(i + 1, i + 6);
        const totalMove = impulseCandles.reduce((acc, c) => acc + (c.close - c.open), 0);

        if (totalMove < -atr * 1.5) {
          const strength = Math.min(Math.abs(totalMove) / (atr * 3), 1);
          blocks.push({
            type:      'BEARISH',
            priceFrom: candles[i].low,
            priceTo:   candles[i].high,
            timestamp: candles[i].timestamp,
            index:     i,
            strength:  parseFloat(strength.toFixed(2)),
          });
        }
      }
    }

    // Remove order blocks that have been mitigated (price traded through them)
    return blocks.filter(block => {
      const candlesAfter = candles.slice(block.index + 1);
      const mitigated = candlesAfter.some(c => {
        if (block.type === 'BULLISH') return c.low < block.priceFrom;   // price went below bullish OB
        if (block.type === 'BEARISH') return c.high > block.priceTo;    // price went above bearish OB
        return false;
      });
      return !mitigated;
    });
  },

  // ── BREAKER BLOCK DETECTION ───────────────────────────────────────────
  detectBreakerBlocks(candles: Candle[], orderBlocks: OrderBlock[]): OrderBlock[] {
    const breakers: OrderBlock[] = [];

    for (const ob of orderBlocks) {
      const candlesAfter = candles.slice(ob.index + 1);

      // A bullish OB becomes a bearish Breaker when price breaks below it
      if (ob.type === 'BULLISH') {
        const broken = candlesAfter.find(c => c.close < ob.priceFrom);
        if (broken) {
          breakers.push({ ...ob, type: 'BEARISH' });
        }
      }

      // A bearish OB becomes a bullish Breaker when price breaks above it
      if (ob.type === 'BEARISH') {
        const broken = candlesAfter.find(c => c.close > ob.priceTo);
        if (broken) {
          breakers.push({ ...ob, type: 'BULLISH' });
        }
      }
    }

    return breakers;
  },

  // ── LIQUIDITY POOL DETECTION ──────────────────────────────────────────
  detectLiquidityPools(candles: Candle[], tolerance = 0.001): LiquidityPool[] {
    const pools: LiquidityPool[] = [];
    const equalHighs: { price: number; index: number; timestamp: Date }[] = [];
    const equalLows:  { price: number; index: number; timestamp: Date }[] = [];

    // Find swing highs/lows within tolerance of each other (equal highs/lows = liquidity)
    const { highs, lows } = this.detectSwingPoints(candles, 3);

    for (let i = 0; i < highs.length - 1; i++) {
      for (let j = i + 1; j < highs.length; j++) {
        if (Math.abs(highs[i].price - highs[j].price) / highs[i].price < tolerance) {
          equalHighs.push(highs[i]);
          break;
        }
      }
    }

    for (let i = 2; i < lows.length - 1; i++) {
      for (let j = i + 1; j < lows.length; j++) {
        if (Math.abs(lows[i].price - lows[j].price) / lows[i].price < tolerance) {
          equalLows.push(lows[i]);
          break;
        }
      }
    }

    equalHighs.forEach(h => pools.push({ type: 'BSL', price: h.price, timestamp: h.timestamp, index: h.index }));
    equalLows.forEach(l  => pools.push({ type: 'SSL', price: l.price, timestamp: l.timestamp, index: l.index  }));

    return pools;
  },

  // ── FAIR VALUE GAP DETECTION ──────────────────────────────────────────
  detectFairValueGaps(candles: Candle[]): { type: 'BULL' | 'BEAR'; gapFrom: number; gapTo: number; timestamp: Date }[] {
    const fvgs = [];
    for (let i = 1; i < candles.length - 1; i++) {
      const prev = candles[i - 1];
      const curr = candles[i];
      const next = candles[i + 1];

      // Bullish FVG: gap between prev.high and next.low (price moved up fast)
      if (next.low > prev.high && curr.close > curr.open) {
        fvgs.push({ type: 'BULL' as const, gapFrom: prev.high, gapTo: next.low, timestamp: curr.timestamp });
      }
      // Bearish FVG: gap between next.high and prev.low (price moved down fast)
      if (next.high < prev.low && curr.close < curr.open) {
        fvgs.push({ type: 'BEAR' as const, gapFrom: next.high, gapTo: prev.low, timestamp: curr.timestamp });
      }
    }
    return fvgs;
  },

  // ── ATR (Average True Range) ──────────────────────────────────────────
  calculateATR(candles: Candle[], period = 14): number {
    if (candles.length < period + 1) return 0;
    const trs = candles.slice(-period - 1).map((c, i, arr) => {
      if (i === 0) return c.high - c.low;
      const prev = arr[i - 1];
      return Math.max(c.high - c.low, Math.abs(c.high - prev.close), Math.abs(c.low - prev.close));
    });
    return trs.slice(1).reduce((a, b) => a + b, 0) / period;
  },

  // ── MARKET STRUCTURE SHIFT DETECTION ─────────────────────────────────
  detectMSS(candles: Candle[], bias: 'BULLISH' | 'BEARISH'): { detected: boolean; price: number; timestamp: Date } | null {
    const recent = candles.slice(-30);
    const { highs, lows } = this.detectSwingPoints(recent, 3);

    if (bias === 'BULLISH' && lows.length >= 2) {
      const lastTwo = lows.slice(-2);
      if (lastTwo[1].price < lastTwo[0].price) {
        // Lower low in bullish structure = MSS (bearish shift)
        return { detected: true, price: lastTwo[1].price, timestamp: lastTwo[1].timestamp };
      }
    }
    if (bias === 'BEARISH' && highs.length >= 2) {
      const lastTwo = highs.slice(-2);
      if (lastTwo[1].price > lastTwo[0].price) {
        return { detected: true, price: lastTwo[1].price, timestamp: lastTwo[1].timestamp };
      }
    }
    return null;
  },
};
