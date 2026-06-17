import axios from 'axios'
import { apiClient } from '../api/client'
import { useSettingsStore } from '../../store/useSettingsStore'

// ── SUPPORTED INSTRUMENTS ────────────────────────────────
export const CRYPTO_PAIRS = [
  { symbol: 'BTCUSDT', base: 'BTC', quote: 'USDT', name: 'Bitcoin', category: 'crypto' },
  { symbol: 'ETHUSDT', base: 'ETH', quote: 'USDT', name: 'Ethereum', category: 'crypto' },
  { symbol: 'SOLUSDT', base: 'SOL', quote: 'USDT', name: 'Solana', category: 'crypto' },
  { symbol: 'BNBUSDT', base: 'BNB', quote: 'USDT', name: 'BNB', category: 'crypto' },
  { symbol: 'XRPUSDT', base: 'XRP', quote: 'USDT', name: 'XRP', category: 'crypto' },
  { symbol: 'ADAUSDT', base: 'ADA', quote: 'USDT', name: 'Cardano', category: 'crypto' },
  { symbol: 'DOGEUSDT', base: 'DOGE', quote: 'USDT', name: 'Dogecoin', category: 'crypto' },
  { symbol: 'AVAXUSDT', base: 'AVAX', quote: 'USDT', name: 'Avalanche', category: 'crypto' },
]

export const FOREX_PAIRS = [
  { symbol: 'EURUSD', base: 'EUR', quote: 'USD', name: 'Euro/USD', category: 'forex' },
  { symbol: 'GBPUSD', base: 'GBP', quote: 'USD', name: 'Cable', category: 'forex' },
  { symbol: 'USDJPY', base: 'USD', quote: 'JPY', name: 'Dollar/Yen', category: 'forex' },
  { symbol: 'GBPJPY', base: 'GBP', quote: 'JPY', name: 'Pound/Yen', category: 'forex' },
  { symbol: 'AUDUSD', base: 'AUD', quote: 'USD', name: 'Aussie', category: 'forex' },
  { symbol: 'USDCAD', base: 'USD', quote: 'CAD', name: 'Loonie', category: 'forex' },
  { symbol: 'USDCHF', base: 'USD', quote: 'CHF', name: 'Swissie', category: 'forex' },
  { symbol: 'NZDUSD', base: 'NZD', quote: 'USD', name: 'Kiwi', category: 'forex' },
  { symbol: 'EURJPY', base: 'EUR', quote: 'JPY', name: 'Euro/Yen', category: 'forex' },
]

export const METALS_INDICES = [
  { symbol: 'XAUUSD', base: 'XAU', quote: 'USD', name: 'Gold', category: 'commodity' },
  { symbol: 'XAGUSD', base: 'XAG', quote: 'USD', name: 'Silver', category: 'commodity' },
  { symbol: 'US30',   base: 'US30', quote: 'USD', name: 'Dow Jones', category: 'index' },
  { symbol: 'SPX500', base: 'SPX', quote: 'USD', name: 'S&P 500', category: 'index' },
  { symbol: 'NAS100', base: 'NAS', quote: 'USD', name: 'Nasdaq 100', category: 'index' },
]

export const ALL_INSTRUMENTS = [...CRYPTO_PAIRS, ...FOREX_PAIRS, ...METALS_INDICES]

// ── TIMEFRAME MAPPING ────────────────────────────────────
export const TIMEFRAME_MAP = {
  '1m':  { binance: '1m',  twelvedata: '1min',  alphaVantage: '1min',  minutes: 1    },
  '5m':  { binance: '5m',  twelvedata: '5min',  alphaVantage: '5min',  minutes: 5    },
  '15m': { binance: '15m', twelvedata: '15min', alphaVantage: '15min', minutes: 15   },
  '30m': { binance: '30m', twelvedata: '30min', alphaVantage: '30min', minutes: 30   },
  '1h':  { binance: '1h',  twelvedata: '1h',    alphaVantage: '60min', minutes: 60   },
  '4h':  { binance: '4h',  twelvedata: '4h',    alphaVantage: 'N/A',   minutes: 240  },
  '1d':  { binance: '1d',  twelvedata: '1day',  alphaVantage: 'daily', minutes: 1440 },
  '1w':  { binance: '1w',  twelvedata: '1week', alphaVantage: 'weekly',minutes: 10080},
}

// ── NORMALISED CANDLE TYPE ───────────────────────────────
export interface Candle {
  time: number   // Unix timestamp (seconds)
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface Ticker {
  symbol: string
  price: number
  change24h: number
  changePct24h: number
  high24h: number
  low24h: number
  volume24h: number
  category: string
}

// ════════════════════════════════════════════════════════
// CRYPTO DATA — BINANCE (free, no key required)
// ════════════════════════════════════════════════════════

const BINANCE = process.env.NEXT_PUBLIC_BINANCE_REST || 'https://api.binance.com/api/v3'

export async function fetchCryptoCandles(
  symbol: string,
  interval: string,
  limit: number = 200
): Promise<Candle[]> {
  const binanceTF = TIMEFRAME_MAP[interval as keyof typeof TIMEFRAME_MAP]?.binance || interval
  const url = `${BINANCE}/klines?symbol=${symbol.toUpperCase()}&interval=${binanceTF}&limit=${limit}`
  
  try {
    const { data } = await axios.get(url)
    return data.map((k: any[]) => ({
      time:   Math.floor(k[0] / 1000),
      open:   parseFloat(k[1]),
      high:   parseFloat(k[2]),
      low:    parseFloat(k[3]),
      close:  parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }))
  } catch (err: any) {
    console.warn(`[Binance Direct Bypass] Failed to fetch ${symbol} ${interval}: ${err?.message || err}. Local emulation initiated.`);
    return generateFallbackCandles(symbol, limit)
  }
}

export async function fetchCryptoTicker(symbol: string): Promise<Ticker | null> {
  try {
    const [ticker24h, priceRes] = await Promise.all([
      axios.get(`${BINANCE}/ticker/24hr?symbol=${symbol.toUpperCase()}`),
      axios.get(`${BINANCE}/ticker/price?symbol=${symbol.toUpperCase()}`),
    ])
    const d = ticker24h.data
    return {
      symbol,
      price:        parseFloat(priceRes.data.price),
      change24h:    parseFloat(d.priceChange),
      changePct24h: parseFloat(d.priceChangePercent),
      high24h:      parseFloat(d.highPrice),
      low24h:       parseFloat(d.lowPrice),
      volume24h:    parseFloat(d.quoteVolume),
      category:     'crypto',
    }
  } catch {
    return null
  }
}

export async function fetchAllCryptoTickers(): Promise<Ticker[]> {
  try {
    const symbols = CRYPTO_PAIRS.map(p => `"${p.symbol}"`).join(',')
    const { data } = await axios.get(`${BINANCE}/ticker/24hr?symbols=[${symbols}]`)
    return data.map((d: any) => ({
      symbol:       d.symbol,
      price:        parseFloat(d.lastPrice),
      change24h:    parseFloat(d.priceChange),
      changePct24h: parseFloat(d.priceChangePercent),
      high24h:      parseFloat(d.highPrice),
      low24h:       parseFloat(d.lowPrice),
      volume24h:    parseFloat(d.quoteVolume),
      category:     'crypto',
    }))
  } catch {
    return []
  }
}

// ════════════════════════════════════════════════════════
// FOREX + METALS DATA — TWELVE DATA (800 req/day free)
// ════════════════════════════════════════════════════════

const TWELVE = process.env.NEXT_PUBLIC_TWELVE_DATA_REST || 'https://api.twelvedata.com'

function getTwelveDataKey(): string {
  const storeKey = useSettingsStore.getState().twelveDataApiKey?.trim()
  if (storeKey) return storeKey
  return (
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_TWELVE_DATA_KEY) ||
    (import.meta as any).env?.NEXT_PUBLIC_TWELVE_DATA_KEY ||
    (import.meta as any).env?.VITE_TWELVE_DATA_KEY ||
    ''
  )
}

export async function fetchForexCandles(
  symbol: string,
  interval: string,
  outputsize: number = 200
): Promise<Candle[]> {
  const key = getTwelveDataKey()
  if (!key || key === 'YOUR_TWELVE_DATA_KEY_HERE') {
    console.warn('[TwelveData] No API key — returning generated data')
    return generateFallbackCandles(symbol, outputsize)
  }

  const tf = TIMEFRAME_MAP[interval as keyof typeof TIMEFRAME_MAP]?.twelvedata || '1day'
  const url = `${TWELVE}/time_series?symbol=${symbol}&interval=${tf}&outputsize=${outputsize}&apikey=${key}`
  
  try {
    const { data } = await axios.get(url, {
      headers: {
        'apikey': key,
        'Authorization': `apikey ${key}`
      }
    })
    if (data.status === 'error' || !data.values) {
      console.error('[TwelveData] Error:', data.message)
      return generateFallbackCandles(symbol, outputsize)
    }
    return data.values.reverse().map((v: any) => ({
      time:   Math.floor(new Date(v.datetime).getTime() / 1000),
      open:   parseFloat(v.open),
      high:   parseFloat(v.high),
      low:    parseFloat(v.low),
      close:  parseFloat(v.close),
      volume: parseFloat(v.volume || '0'),
    }))
  } catch (err) {
    console.error(`[TwelveData] Failed ${symbol} ${interval}:`, err)
    return generateFallbackCandles(symbol, outputsize)
  }
}

export async function fetchForexTicker(symbol: string): Promise<Ticker | null> {
  const key = getTwelveDataKey()
  if (!key || key === 'YOUR_TWELVE_DATA_KEY_HERE') {
    return generateFallbackTicker(symbol, 'forex')
  }
  try {
    const [priceRes, quoteRes] = await Promise.all([
      axios.get(`${TWELVE}/price?symbol=${symbol}&apikey=${key}`, {
        headers: { 'apikey': key, 'Authorization': `apikey ${key}` }
      }),
      axios.get(`${TWELVE}/quote?symbol=${symbol}&apikey=${key}`, {
        headers: { 'apikey': key, 'Authorization': `apikey ${key}` }
      })
    ])

    const data = priceRes.data
    const q = quoteRes.data
    
    return {
      symbol,
      price:        parseFloat(data.price || q.close),
      change24h:    parseFloat(q.change || '0'),
      changePct24h: parseFloat(q.percent_change || '0'),
      high24h:      parseFloat(q.high || '0'),
      low24h:       parseFloat(q.low || '0'),
      volume24h:    parseFloat(q.volume || '0'),
      category:     symbol.startsWith('XA') ? 'commodity' : 'forex',
    }
  } catch {
    return generateFallbackTicker(symbol, 'forex')
  }
}

// ════════════════════════════════════════════════════════
// UNIFIED FETCH — auto-routes by instrument type
// ════════════════════════════════════════════════════════

export async function fetchCandles(
  symbol: string,
  timeframe: string,
  limit: number = 200
): Promise<Candle[]> {
  try {
    const { data: res } = await apiClient.get('/market/candles', {
      params: { pair: symbol, timeframe, limit }
    })
    const list = res?.data ?? res
    if (Array.isArray(list) && list.length > 0) {
      return list.map((c: any) => ({
        time: Math.floor(new Date(c.timestamp || c.time * 1000).getTime() / 1000),
        open: Number(c.open),
        high: Number(c.high),
        low: Number(c.low),
        close: Number(c.close),
        volume: Number(c.volume),
      }))
    }
  } catch (backendErr) {
    console.warn(`[Backend Cache Bypass] Failed to load candles from proxy backend for ${symbol}:`, backendErr)
  }

  const isCrypto = CRYPTO_PAIRS.some(p => p.symbol === symbol)
  if (isCrypto) return fetchCryptoCandles(symbol, timeframe, limit)
  return fetchForexCandles(symbol, timeframe, limit)
}

export async function fetchTicker(symbol: string): Promise<Ticker | null> {
  try {
    const { data: res } = await apiClient.get('/market/ticker', { params: { pair: symbol } })
    const t = res?.data ?? res
    if (t && t.price !== undefined) {
      return {
        symbol,
        price: Number(t.price),
        change24h: Number(t.change24h ?? t.change ?? 0),
        changePct24h: Number(t.changePct24h ?? t.changePct ?? 0),
        high24h: Number(t.high24h ?? 0),
        low24h: Number(t.low24h ?? 0),
        volume24h: Number(t.volume24h ?? 0),
        category: CRYPTO_PAIRS.some(p => p.symbol === symbol) ? 'crypto' : 'forex'
      }
    }
  } catch (backendErr) {
    console.warn(`[Backend Cache Bypass] Failed to fetch ticker for ${symbol}:`, backendErr)
  }

  const isCrypto = CRYPTO_PAIRS.some(p => p.symbol === symbol)
  if (isCrypto) return fetchCryptoTicker(symbol)
  return fetchForexTicker(symbol)
}

// ════════════════════════════════════════════════════════
// FALLBACK — realistic generated candles (when no API key)
// ════════════════════════════════════════════════════════

const SEED_PRICES: Record<string, number> = {
  BTCUSDT: 67000, ETHUSDT: 3500, SOLUSDT: 165, BNBUSDT: 580,
  XRPUSDT: 0.52,  ADAUSDT: 0.45, DOGEUSDT: 0.12, AVAXUSDT: 35,
  EURUSD: 1.085,  GBPUSD: 1.265, USDJPY: 154.5,  GBPJPY: 195.2,
  AUDUSD: 0.645,  USDCAD: 1.364, USDCHF: 0.901,  NZDUSD: 0.593,
  EURJPY: 167.5,  XAUUSD: 2320,  XAGUSD: 27.5,
  US30: 38500, SPX500: 5200, NAS100: 18200,
}

function generateFallbackCandles(symbol: string, limit: number): Candle[] {
  const basePrice = SEED_PRICES[symbol] || 100
  const volatility = basePrice * 0.012
  const now = Math.floor(Date.now() / 1000)
  const interval = 86400 // 1 day in seconds

  let price = basePrice
  const candles: Candle[] = []
  
  for (let i = limit; i >= 0; i--) {
    const trend = Math.sin(i / 20) * volatility * 0.5
    const noise = (Math.random() - 0.48) * volatility
    price = Math.max(price + trend + noise, basePrice * 0.5)
    
    const range = price * 0.008 + Math.random() * volatility * 0.5
    const open = price - noise * 0.3
    const close = price
    const high = Math.max(open, close) + Math.random() * range
    const low  = Math.min(open, close) - Math.random() * range
    
    candles.push({
      time:   now - i * interval,
      open:   parseFloat(open.toFixed(symbol.includes('JPY') ? 3 : 5)),
      high:   parseFloat(high.toFixed(symbol.includes('JPY') ? 3 : 5)),
      low:    parseFloat(low.toFixed(symbol.includes('JPY') ? 3 : 5)),
      close:  parseFloat(close.toFixed(symbol.includes('JPY') ? 3 : 5)),
      volume: parseFloat((Math.random() * 1000000 + 500000).toFixed(2)),
    })
  }
  return candles
}

function generateFallbackTicker(symbol: string, category: string): Ticker {
  const price = SEED_PRICES[symbol] || 100
  return {
    symbol,
    price,
    change24h:    parseFloat((price * (Math.random() * 0.04 - 0.02)).toFixed(4)),
    changePct24h: parseFloat((Math.random() * 4 - 2).toFixed(2)),
    high24h:      parseFloat((price * 1.015).toFixed(4)),
    low24h:       parseFloat((price * 0.985).toFixed(4)),
    volume24h:    Math.floor(Math.random() * 1000000000),
    category,
  }
}

// ════════════════════════════════════════════════════════
// PRICE FORMATTER (context-aware decimal places)
// ════════════════════════════════════════════════════════

export function formatPrice(price: number, symbol: string): string {
  if (!price) return '—'
  if (symbol.includes('JPY')) return price.toFixed(3)
  if (price > 1000) return price.toLocaleString('en-US', { maximumFractionDigits: 2 })
  if (price > 1) return price.toFixed(4)
  if (price > 0.01) return price.toFixed(5)
  return price.toFixed(8)
}

export function formatVolume(vol: number): string {
  if (vol > 1e9) return `${(vol / 1e9).toFixed(2)}B`
  if (vol > 1e6) return `${(vol / 1e6).toFixed(2)}M`
  if (vol > 1e3) return `${(vol / 1e3).toFixed(2)}K`
  return vol.toFixed(2)
}
