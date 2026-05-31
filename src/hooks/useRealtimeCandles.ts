import { useState, useEffect, useRef } from 'react'
import { binanceWS } from '../lib/market/binanceWebSocket'
import { fetchCandles, Candle } from '../lib/market/marketDataService'
import { CRYPTO_PAIRS } from '../lib/market/marketDataService'

export function useRealtimeCandles(symbol: string, timeframe: string) {
  const [candles, setCandles] = useState<Candle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const candlesRef = useRef<Candle[]>([])

  // Load historical candles
  useEffect(() => {
    if (!symbol || !timeframe) return
    setIsLoading(true)
    setError(null)

    fetchCandles(symbol, timeframe, 200)
      .then(data => {
        candlesRef.current = data
        setCandles(data)
        setIsLoading(false)
      })
      .catch(err => {
        console.error(err)
        setError('Failed to load market data')
        setIsLoading(false)
      })
  }, [symbol, timeframe])

  // Subscribe to live updates (crypto only)
  useEffect(() => {
    const isCrypto = CRYPTO_PAIRS.some(p => p.symbol === symbol)
    if (!isCrypto || !symbol || !timeframe) return

    const tfLower = timeframe.toLowerCase()
    const binanceTF = tfLower === '1h' ? '1h'
      : tfLower === '4h' ? '4h'
      : tfLower === '1d' ? '1d'
      : tfLower === '30m' ? '30m'
      : tfLower === '15m' ? '15m'
      : tfLower === '5m' ? '5m'
      : '1d'

    const unsubscribe = binanceWS.subscribeCandles(
      symbol,
      binanceTF,
      (newCandle, isClosed) => {
        setCandles(prev => {
          const updated = [...prev]
          const lastIdx = updated.length - 1
          
          if (lastIdx >= 0 && updated[lastIdx].time === newCandle.time) {
            // Update the current open candle
            updated[lastIdx] = newCandle
          } else if (isClosed) {
            // Add newly closed candle + trim to 200
            updated.push(newCandle)
            if (updated.length > 200) updated.shift()
          }
          candlesRef.current = updated
          return updated
        })
      },
      setIsConnected
    )

    return () => unsubscribe()
  }, [symbol, timeframe])

  const refetch = () => {
    setIsLoading(true)
    fetchCandles(symbol, timeframe, 200)
      .then(data => { candlesRef.current = data; setCandles(data) })
      .finally(() => setIsLoading(false))
  }

  return { candles, isLoading, isConnected, error, refetch }
}
