# AutoSLP Algorithmic Solutions — Smart Money Concepts Specs

This document provides mathematical models, algorithmic pseudocode, and technical guidelines for the core Smart Money Concepts (SMC) pipelines computed by the pipeline engine.

---

## 1. Pivot Swing Point Detection

**Theory**: Pivot Points act as local structural anchor lines, representing local maxima (Pivot Highs) and local minima (Pivot Lows). A point is classified as a Pivot High if its high price exceeds the high prices of neighboring candles in an $N$-bar window.

### Mathematical Definition:
A candle at index $i$ is a Pivot High of strength $N$ if:
$$\text{High}_i > \text{High}_{i - j} \quad \forall j \in \{1, \dots, N\} \quad \text{and} \quad \text{High}_i \geq \text{High}_{i + j} \quad \forall j \in \{1, \dots, N\}$$

### Implementation Pseudocode:
```typescript
function findSwingPoints(candles: Candle[], lookbackWindow: number): SwingPoints {
  const pivotHighs: PivotPoint[] = [];
  const pivotLows: PivotPoint[] = [];

  for (let i = lookbackWindow; i < candles.length - lookbackWindow; i++) {
    const target = candles[i];
    let isPivotHigh = true;
    let isPivotLow = true;

    for (let j = 1; j <= lookbackWindow; j++) {
      if (candles[i - j].high >= target.high || candles[i + j].high > target.high) {
        isPivotHigh = false;
      }
      if (candles[i - j].low <= target.low || candles[i + j].low < target.low) {
        isPivotLow = false;
      }
    }

    if (isPivotHigh) {
      pivotHighs.push({ price: target.high, index: i, timestamp: target.timestamp });
    }
    if (isPivotLow) {
      pivotLows.push({ price: target.low, index: i, timestamp: target.timestamp });
    }
  }

  return { pivotHighs, pivotLows };
}
```

---

## 2. Market Structure Shift Classification (BOS & CHoCH)

**Theory**: Real-time market structure determines trending cycles and immediate reversal shift trigger levels.
* **Break of Structure (BOS)**: A break exceeding previous swing points in alignment with the active bias trend direction.
* **Change of Character (CHoCH) / Market Structure Shift (MSS)**: A trend reversal trigger. Price closes below the last active structural low (for a bullish trend) or above the last structural high (for a bearish trend).

```typescript
function classifyStructureShifts(
  candles: Candle[], 
  lastSwings: SwingPoints, 
  currentTrend: 'BULLISH' | 'BEARISH'
): StructureEvent[] {
  const events: StructureEvent[] = [];
  const currentPrice = candles[candles.length - 1].close;
  const recentSwingHigh = lastSwings.pivotHighs[lastSwings.pivotHighs.length - 1];
  const recentSwingLow = lastSwings.pivotLows[lastSwings.pivotLows.length - 1];

  if (currentTrend === 'BULLISH') {
    if (currentPrice < recentSwingLow.price) {
      events.push({
        type: 'CHOCH_BEARISH',
        breakLevel: recentSwingLow.price,
        timestamp: candles[candles.length - 1].timestamp
      });
    } else if (currentPrice > recentSwingHigh.price) {
      events.push({
        type: 'BOS_BULLISH',
        breakLevel: recentSwingHigh.price,
        timestamp: candles[candles.length - 1].timestamp
      });
    }
  } else { // BEARISH
    if (currentPrice > recentSwingHigh.price) {
      events.push({
        type: 'CHOCH_BULLISH',
        breakLevel: recentSwingHigh.price,
        timestamp: candles[candles.length - 1].timestamp
      });
    } else if (currentPrice < recentSwingLow.price) {
      events.push({
        type: 'BOS_BEARISH',
        breakLevel: recentSwingLow.price,
        timestamp: candles[candles.length - 1].timestamp
      });
    }
  }

  return events;
}
```

---

## 3. High-Timeframe Weighted Directional Bias

**Theory**: Scores the overall directional bias alignment by matching multi-timeframe structures.
* 1D timeframe structure triggers **50% weighting matrix**.
* 4H timeframe structure triggers **35% weighting matrix**.
* 1H timeframe structure triggers **15% weighting matrix**.

```typescript
function calculateWeightedBias(
  bias1D: 'BULLISH' | 'BEARISH', 
  bias4H: 'BULLISH' | 'BEARISH', 
  bias1H: 'BULLISH' | 'BEARISH'
): { bias: Bias; strength: Strength } {
  let score = 0;

  score += (bias1D === 'BULLISH') ? 50 : -50;
  score += (bias4H === 'BULLISH') ? 35 : -35;
  score += (bias1H === 'BULLISH') ? 15 : -15;

  if (score >= 65) {
    return { bias: 'BULLISH', strength: 'STRONG' };
  } else if (score > 15 && score < 65) {
    return { bias: 'BULLISH', strength: 'MODERATE' };
  } else if (score <= -65) {
    return { bias: 'BEARISH', strength: 'STRONG' };
  } else if (score < -15 && score > -65) {
    return { bias: 'BEARISH', strength: 'MODERATE' };
  } else {
    return { bias: 'NEUTRAL', strength: 'WEAK' };
  }
}
```

---

## 4. Order Block (OB) Validation

**Theory**: Order Blocks capture footprints of aggressive institutional accumulation or distribution in the market prior to high-volume expansions.
* **Bullish OB**: Last bearish (down-close) candle before an aggressive structural upward expansion breaking swing highs.
* **Bearish OB**: Last bullish (up-close) candle before an aggressive structural downward expansion breaking swing lows.

```typescript
function findOrderBlocks(candles: Candle[], minImpulsiveExpansionRatio: number = 1.3): POIZone[] {
  const detectedBlocks: POIZone[] = [];

  for (let i = 2; i < candles.length - 1; i++) {
    const priorCandle = candles[i - 1];
    const currentCandle = candles[i];
    const triggerExpansionCandle = candles[i + 1];

    const bodySize = Math.abs(currentCandle.close - currentCandle.open);
    const expansionSize = Math.abs(triggerExpansionCandle.close - triggerExpansionCandle.open);

    if (expansionSize > bodySize * minImpulsiveExpansionRatio) {
      if (currentCandle.close < currentCandle.open && triggerExpansionCandle.close > triggerExpansionCandle.open) {
        detectedBlocks.push({
          type: 'ORDER_BLOCK',
          direction: 'BULLISH',
          priceFloor: currentCandle.low,
          priceCeiling: Math.max(currentCandle.open, currentCandle.high),
          timestamp: currentCandle.timestamp
        });
      }
      if (currentCandle.close > currentCandle.open && triggerExpansionCandle.close < triggerExpansionCandle.open) {
        detectedBlocks.push({
          type: 'ORDER_BLOCK',
          direction: 'BEARISH',
          priceFloor: Math.min(currentCandle.open, currentCandle.low),
          priceCeiling: currentCandle.high,
          timestamp: currentCandle.timestamp
        });
      }
    }
  }

  return detectedBlocks;
}
```

---

## 5. Breaker Block (BB) Mitigation Transition

**Theory**: When an active Order Block is breached and broken through by a candidate price close, the invalid validation frame splits. The remaining region is transformed into a Breaker Block, acting as support/resistance in future trades.

```typescript
function transitionToBreakerBlocks(
  activeOBs: POIZone[], 
  latestCandle: Candle
): POIZone[] {
  const activeBBs: POIZone[] = [];

  for (const ob of activeOBs) {
    if (ob.type !== 'ORDER_BLOCK') continue;

    if (ob.direction === 'BULLISH' && latestCandle.close < ob.priceFloor) {
      activeBBs.push({
        ...ob,
        type: 'BREAKER_BLOCK',
        direction: 'BEARISH',
        notes: 'Bullish OB breached. Transitioned to resistant bearish breaker path.'
      });
    }
    else if (ob.direction === 'BEARISH' && latestCandle.close > ob.priceCeiling) {
      activeBBs.push({
        ...ob,
        type: 'BREAKER_BLOCK',
        direction: 'BULLISH',
        notes: 'Bearish OB breached. Transitioned to supportive bullish breaker path.'
      });
    }
  }

  return activeBBs;
}
```

---

## 6. Equal Highs / Lows (EQH/EQL) Liquidity pools

**Theory**: Clusters of retail equal/double points accumulate large buy/sell stop liquidity pools above/below swing points. Once a clean sweep triggers, pricing reverses back into higher-timeframe boundaries.

```typescript
function mapLiquidityPools(candles: Candle[], percentageThresh: number = 0.0015): LiquidityPool[] {
  const pools: LiquidityPool[] = [];
  const len = candles.length;

  for (let i = 0; i < len; i++) {
    for (let j = i + 5; j < len; j++) {
      const currentLow = candles[i].low;
      const futureLow = candles[j].low;
      
      const currentHigh = candles[i].high;
      const futureHigh = candles[j].high;

      if (Math.abs(currentLow - futureLow) / currentLow <= percentageThresh) {
        pools.push({
          id: `eql-${i}-${j}`,
          type: 'SELL_SIDE_LIQUIDITY',
          priceLevel: Math.min(currentLow, futureLow),
          candlesMatched: [candles[i].timestamp, candles[j].timestamp]
        });
      }

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
```
