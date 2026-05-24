import { Candle, POIZone, SwingPoints } from '../../shared/types';

export interface SetupSignal {
  pair: string;
  timeframe: string;
  direction: 'LONG' | 'SHORT';
  entryFrom: number;
  entryTo: number;
  stopLoss: number;
  target1: number;
  target2: number;
  rrRatio: number;
  confirmationTF: string;
}

export function evaluateSetup(
  pair: string,
  candles: Candle[],
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL',
  pois: { id: string; priceFrom: number; priceTo: number; type: string; direction: 'BULLISH' | 'BEARISH' }[],
  currentPrice: number,
  lowerTfCandles?: Candle[] // Optional lower-timeframe validation
): SetupSignal | null {
  if (candles.length < 20) return null;

  // 1. Bias Check (Must be aligned)
  if (bias !== 'BULLISH') return null;

  // 2. Locate active, supportive POI Zone
  const supportivePoi = pois.find((poi) => {
    const minThreshold = poi.priceFrom * 0.998;
    const maxApproach = poi.priceTo * 1.005; // approaching zone (within 0.5% ceiling buffer)
    return currentPrice >= minThreshold && currentPrice <= maxApproach;
  });

  if (!supportivePoi) return null;

  // 3. Confirm via lower timeframe MSS (Market Structure Shift)
  const isLowerTfShiftBullish = (() => {
    if (!lowerTfCandles || lowerTfCandles.length < 5) return true; // default confirmation passed if unavailable
    // Check if latest candle closes above recent high (local MSS)
    const recentHigh = Math.max(...lowerTfCandles.slice(-5, -1).map((c) => c.high));
    return lowerTfCandles[lowerTfCandles.length - 1].close > recentHigh;
  })();

  if (!isLowerTfShiftBullish) return null;

  // 4. Volume Validation: current bar volume > 1.5 x 20-bar average
  const volumeHistory = candles.slice(-20);
  const averageVolume = volumeHistory.reduce((s, c) => s + c.volume, 0) / volumeHistory.length;
  const currentVolume = candles[candles.length - 1].volume;
  if (currentVolume <= averageVolume * 1.5) {
    return null;
  }

  // Calculate parameters
  const entryFrom = supportivePoi.priceFrom;
  const entryTo = supportivePoi.priceTo;
  const stopLoss = entryFrom * 0.998; // 0.2% padding below floor

  // Next swing targets
  const target1 = entryTo * 1.025; // Technical fallback 2.5% Target 1 
  const target2 = entryTo * 1.050; // Technical fallback 5% Target 2

  const risk = Math.abs(entryFrom - stopLoss);
  const reward = Math.abs(target1 - entryTo);
  const rrRatio = risk > 0 ? parseFloat((reward / risk).toFixed(2)) : 1.5;

  if (rrRatio < 1.5) return null;

  return {
    pair,
    timeframe: '1H',
    direction: 'LONG',
    entryFrom,
    entryTo,
    stopLoss,
    target1,
    target2,
    rrRatio,
    confirmationTF: '5m'
  };
}
