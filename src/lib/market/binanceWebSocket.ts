import { Candle } from './marketDataService'

type CandleCallback = (candle: Candle, isClosed: boolean) => void
type TickerCallback = (price: number, changePct: number) => void
type ConnectionCallback = (connected: boolean) => void

const WS_BASE = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_BINANCE_WS) ||
  (import.meta as any).env?.VITE_BINANCE_WS ||
  'wss://data-stream.binance.vision/ws';

class BinanceWebSocketManager {
  private sockets: Map<string, WebSocket> = new Map()
  private reconnectTimers: Map<string, ReturnType<typeof setTimeout>> = new Map()
  private reconnectDelays: Map<string, number> = new Map()

  // Subscribe to live candle updates for a pair + timeframe
  subscribeCandles(
    symbol: string,
    interval: string,
    onCandle: CandleCallback,
    onConnection?: ConnectionCallback
  ): () => void {
    const key = `${symbol.toLowerCase()}@kline_${interval}`
    const url = `${WS_BASE}/${key}`

    const connect = () => {
      if (typeof WebSocket === 'undefined') {
        console.warn(`[WS] WebSocket is not supported in this environment.`);
        onConnection?.(false);
        return;
      }
      const ws = new WebSocket(url)
      this.sockets.set(key, ws)

      ws.onopen = () => {
        console.log(`[WS] Connected: ${key}`)
        this.reconnectDelays.set(key, 1000) // reset backoff
        onConnection?.(true)
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        const k = data.k
        const candle: Candle = {
          time:   Math.floor(k.t / 1000),
          open:   parseFloat(k.o),
          high:   parseFloat(k.h),
          low:    parseFloat(k.l),
          close:  parseFloat(k.c),
          volume: parseFloat(k.v),
        }
        onCandle(candle, k.x) // k.x = true when candle closes
      }

      ws.onclose = () => {
        console.warn(`[WS] Disconnected: ${key} — reconnecting...`)
        onConnection?.(false)
        const delay = Math.min(this.reconnectDelays.get(key) || 1000, 30000)
        this.reconnectDelays.set(key, delay * 2)
        const timer = setTimeout(() => connect(), delay)
        this.reconnectTimers.set(key, timer)
      }

      ws.onerror = (err) => {
        console.warn(`[WS] Error on ${key} ignored gracefully.`);
        ws.close()
      }
    }

    connect()

    // Return unsubscribe function
    return () => {
      const timer = this.reconnectTimers.get(key)
      if (timer) clearTimeout(timer)
      const ws = this.sockets.get(key)
      if (ws) {
        ws.onclose = null // prevent reconnect loop
        ws.close()
      }
      this.sockets.delete(key)
      this.reconnectTimers.delete(key)
      this.reconnectDelays.delete(key)
      console.log(`[WS] Unsubscribed: ${key}`)
    }
  }

  // Subscribe to live individual ticker (price + 24h change)
  subscribeTicker(
    symbol: string,
    onTicker: TickerCallback
  ): () => void {
    const key = `${symbol.toLowerCase()}@miniTicker`
    const url = `${WS_BASE}/${key}`

    if (typeof WebSocket === 'undefined') {
      console.warn(`[WS] WebSocket is not supported in this environment.`);
      return () => {};
    }

    const ws = new WebSocket(url)
    this.sockets.set(key, ws)

    ws.onmessage = (event) => {
      const d = JSON.parse(event.data)
      const price = parseFloat(d.c)
      const open24h = parseFloat(d.o)
      const changePct = ((price - open24h) / open24h) * 100
      onTicker(price, changePct)
    }

    ws.onerror = () => {
      // Ignored gracefully
    }

    ws.onclose = () => {
      setTimeout(() => this.subscribeTicker(symbol, onTicker), 2000)
    }

    return () => {
      ws.onclose = null
      ws.close()
      this.sockets.delete(key)
    }
  }

  // Subscribe to multiple tickers at once (market overview)
  subscribeAllTickers(
    symbols: string[],
    onUpdate: (updates: Record<string, { price: number; changePct: number }>) => void
  ): () => void {
    const streams = symbols.map(s => `${s.toLowerCase()}@miniTicker`).join('/')
    const url = `${WS_BASE.replace('/ws', '/stream')}?streams=${streams}`

    if (typeof WebSocket === 'undefined') {
      console.warn(`[WS] WebSocket is not supported in this environment.`);
      return () => {};
    }

    const ws = new WebSocket(url)

    ws.onmessage = (event) => {
      const parsed = JSON.parse(event.data)
      const d = parsed.data
      if (!d) return
      const price = parseFloat(d.c)
      const open24h = parseFloat(d.o)
      const changePct = ((price - open24h) / open24h) * 100
      onUpdate({ [d.s]: { price, changePct } })
    }

    ws.onerror = () => {
      // Ignored gracefully
    }

    return () => {
      ws.onclose = null
      ws.close()
    }
  }

  disconnectAll() {
    this.sockets.forEach(ws => {
      ws.onclose = null
      ws.close()
    })
    this.sockets.clear()
    this.reconnectTimers.forEach(t => clearTimeout(t))
    this.reconnectTimers.clear()
  }
}

// Singleton instance
export const binanceWS = new BinanceWebSocketManager()
