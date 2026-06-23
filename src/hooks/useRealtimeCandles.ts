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
    const binanceTF = tfLower === '1m' ? '1m'
      : tfLower === '3m' ? '3m'
      : tfLower === '5m' ? '5m'
      : tfLower === '15m' ? '15m'
      : tfLower === '30m' ? '30m'
      : tfLower === '45m' ? '15m' // Binance REST/WS lacks 45m; fetch 15m as base
      : tfLower === '1h' ? '1h'
      : tfLower === '2h' ? '2h'
      : tfLower === '4h' ? '4h'
      : tfLower === '8h' ? '8h'
      : tfLower === '12h' ? '12h'
      : tfLower === '1d' ? '1d'
      : tfLower === '1w' ? '1w'
      : tfLower === '1m' || tfLower === '1M' || timeframe === '1M' ? '1M'
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
          } else if (lastIdx >= 0 && newCandle.time > updated[lastIdx].time) {
            // It's a new candle that just opened
            updated.push(newCandle)
            if (updated.length > 200) updated.shift()
          } else if (lastIdx === -1) {
             updated.push(newCandle)
          }
          candlesRef.current = updated
          return updated
        })
      },
      setIsConnected
    )

    return () => unsubscribe()
  }, [symbol, timeframe])

  // Fallback Polling if WebSocket fails or for Forex pairs
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;
    
    // Always poll for Forex (since WS is crypto only). 
    // For crypto, poll if not connected to websocket.
    const isCrypto = CRYPTO_PAIRS.some(p => p.symbol === symbol)
    if (!isCrypto || (!isConnected && !isLoading)) {
      intervalId = setInterval(() => {
        fetchCandles(symbol, timeframe, 200).then(data => {
          candlesRef.current = data
          setCandles(data)
        }).catch(() => {})
      }, 5000); // Polling every 5 seconds
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    }
  }, [symbol, timeframe, isConnected, isLoading])

  const refetch = () => {
    setIsLoading(true)
    fetchCandles(symbol, timeframe, 200)
      .then(data => { candlesRef.current = data; setCandles(data) })
      .finally(() => setIsLoading(false))
  }

  return { candles, isLoading, isConnected, error, refetch }
}
