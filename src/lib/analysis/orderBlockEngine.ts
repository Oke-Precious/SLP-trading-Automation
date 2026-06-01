import { Candle } from '../market/marketDataService'
import { POI } from '../../types'

/**
 * Automatically detects supply and demand order blocks (OB) and breaker blocks (BB).
 * Bullish Order Block (Demand): The last down candle before a powerful expansion upwards.
 * Bearish Order Block (Supply): The last up candle before a powerful expansion downwards.
 */
export function detectOrderBlocks(candles: Candle[], timeframe: any): Omit<POI, 'pair' | 'userId' | 'notes'>[] {
  if (candles.length < 15) return []

  const detected: Omit<POI, 'pair' | 'userId' | 'notes'>[] = []
  
  // Calculate average candle body size for volume/volatility filter
  const bodySizes = candles.map(c => Math.abs(c.close - c.open))
  const avgBody = bodySizes.reduce((a, b) => a + b, 0) / candles.length

  for (let i = 2; i < candles.length - 2; i++) {
    const prev = candles[i - 1]
    const curr = candles[i]
    const next1 = candles[i + 1]
    const next2 = candles[i + 2]

    // Bullish OB setup: Down candle (red) followed by 2 strong consecutive green candles
    const isBullishSetup = 
      prev.close < prev.open && // red
      curr.close > curr.open && // green
      next1.close > next1.open && // green
      (next1.close - curr.open) > avgBody * 1.5 // strong expansion

    if (isBullishSetup) {
      const priceMin = prev.low
      const priceMax = prev.high
      const priceRange = `$${priceMin.toLocaleString(undefined, { minimumFractionDigits: 2 })} - $${priceMax.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
      
      detected.push({
        id: `auto-ob-bull-${i}`,
        name: `${timeframe} Bullish OB (Demand)`,
        type: 'OB',
        priceMin,
        priceMax,
        priceRange,
        status: 'Active',
        timeframe,
      })
    }

    // Bearish OB setup: Up candle (green) followed by 2 strong consecutive red candles
    const isBearishSetup = 
      prev.close > prev.open && // green
      curr.close < curr.open && // red
      next1.close < next1.open && // red
      (curr.open - next1.close) > avgBody * 1.5 // strong expansion

    if (isBearishSetup) {
      const priceMin = prev.low
      const priceMax = prev.high
      const priceRange = `$${priceMin.toLocaleString(undefined, { minimumFractionDigits: 2 })} - $${priceMax.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
      
      detected.push({
        id: `auto-ob-bear-${i}`,
        name: `${timeframe} Bearish OB (Supply)`,
        type: 'BB',
        priceMin,
        priceMax,
        priceRange,
        status: 'Active',
        timeframe,
      })
    }
  }

  // Keep up to 5 most recent ones
  return detected.slice(-5)
}
