import { useState, useEffect } from 'react'
import { binanceWS } from '../lib/market/binanceWebSocket'
import { fetchTicker, Ticker } from '../lib/market/marketDataService'
import { CRYPTO_PAIRS } from '../lib/market/marketDataService'

export function useRealtimeTicker(symbol: string) {
  const [ticker, setTicker] = useState<Ticker | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch initial ticker
  useEffect(() => {
    if (!symbol) return
    setIsLoading(true)
    fetchTicker(symbol)
      .then(t => { setTicker(t); setIsLoading(false) })
      .catch((err) => {
        console.error(err)
        setIsLoading(false)
      })
  }, [symbol])

  // Subscribe to live updates (crypto only)
  useEffect(() => {
    const isCrypto = CRYPTO_PAIRS.some(p => p.symbol === symbol)
    if (!isCrypto || !symbol) return

    const unsubscribe = binanceWS.subscribeTicker(symbol, (price, changePct) => {
      setTicker(prev => prev ? { ...prev, price, changePct24h: changePct } : null)
    })

    return () => unsubscribe()
  }, [symbol])

  return { ticker, isLoading }
}
