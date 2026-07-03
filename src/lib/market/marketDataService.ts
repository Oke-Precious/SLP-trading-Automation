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
  '1M':  { binance: '1M',  twelvedata: '1month',alphaVantage: 'monthly',minutes: 43200},
  '3m':  { binance: '3m',  twelvedata: '3min',  alphaVantage: '3min',  minutes: 3    },
  '3M':  { binance: '3m',  twelvedata: '3min',  alphaVantage: '3min',  minutes: 3    },
  '5m':  { binance: '5m',  twelvedata: '5min',  alphaVantage: '5min',  minutes: 5    },
  '5M':  { binance: '5m',  twelvedata: '5min',  alphaVantage: '5min',  minutes: 5    },
  '15m': { binance: '15m', twelvedata: '15min', alphaVantage: '15min', minutes: 15   },
  '15M': { binance: '15m', twelvedata: '15min', alphaVantage: '15min', minutes: 15   },
  '30m': { binance: '30m', twelvedata: '30min', alphaVantage: '30min', minutes: 30   },
  '30M': { binance: '30m', twelvedata: '30min', alphaVantage: '30min', minutes: 30   },
  '45m': { binance: '45m', twelvedata: '45min', alphaVantage: '45min', minutes: 45   },
  '45M': { binance: '45m', twelvedata: '45min', alphaVantage: '45min', minutes: 45   },
  '1h':  { binance: '1h',  twelvedata: '1h',    alphaVantage: '60min', minutes: 60   },
  '1H':  { binance: '1h',  twelvedata: '1h',    alphaVantage: '60min', minutes: 60   },
  '2h':  { binance: '2h',  twelvedata: '2h',    alphaVantage: '2h',    minutes: 120  },
  '2H':  { binance: '2h',  twelvedata: '2h',    alphaVantage: '2h',    minutes: 120  },
  '4h':  { binance: '4h',  twelvedata: '4h',    alphaVantage: 'N/A',   minutes: 240  },
  '4H':  { binance: '4h',  twelvedata: '4h',    alphaVantage: 'N/A',   minutes: 240  },
  '8h':  { binance: '8h',  twelvedata: '8h',    alphaVantage: 'N/A',   minutes: 480  },
  '8H':  { binance: '8h',  twelvedata: '8h',    alphaVantage: 'N/A',   minutes: 480  },
  '12h': { binance: '12h', twelvedata: '12h',   alphaVantage: 'N/A',   minutes: 720  },
  '12H': { binance: '12h', twelvedata: '12h',   alphaVantage: 'N/A',   minutes: 720  },
  '1d':  { binance: '1d',  twelvedata: '1day',  alphaVantage: 'daily', minutes: 1440 },
  '1D':  { binance: '1d',  twelvedata: '1day',  alphaVantage: 'daily', minutes: 1440 },
  '1w':  { binance: '1w',  twelvedata: '1week', alphaVantage: 'weekly',minutes: 10080},
  '1W':  { binance: '1w',  twelvedata: '1week', alphaVantage: 'weekly',minutes: 10080},
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

const BINANCE = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_BINANCE_REST) ||
  (import.meta as any).env?.VITE_BINANCE_REST ||
  'https://data-api.binance.vision/api/v3';

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
    console.warn(`[Binance Direct Bypass] Failed to fetch ${symbol} ${interval}: ${err?.message || err}.`);
    return [];
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

const TWELVE = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_TWELVE_DATA_REST) ||
  (import.meta as any).env?.VITE_TWELVE_DATA_REST ||
  'https://api.twelvedata.com';

function getTwelveDataKey(): string {
  const storeKey = useSettingsStore.getState().twelveDataApiKey?.trim()
  if (storeKey) return storeKey
  return (
    (typeof process !== 'undefined' && (
      process.env?.TWELVE_DATA_KEY ||
      process.env?.VITE_TWELVE_DATA_KEY ||
      process.env?.TWELVE_DATA_API_KEY ||
      process.env?.TWELVEDATA_API_KEY ||
      process.env?.TWELVEDATA_KEY ||
      process.env?.NEXT_PUBLIC_TWELVE_DATA_KEY
    )) ||
    (import.meta as any).env?.TWELVE_DATA_KEY ||
    (import.meta as any).env?.VITE_TWELVE_DATA_KEY ||
    (import.meta as any).env?.TWELVE_DATA_API_KEY ||
    (import.meta as any).env?.TWELVEDATA_API_KEY ||
    (import.meta as any).env?.TWELVEDATA_KEY ||
    (import.meta as any).env?.NEXT_PUBLIC_TWELVE_DATA_KEY ||
    ''
  )
}

export function mapSymbolForTwelveData(symbol: string): string {
  const clean = symbol.replace('/', '').toUpperCase();
  if (clean === 'US30') return 'DJI';
  if (clean === 'SPX500') return 'SPX';
  if (clean === 'NAS100') return 'NDX';
  if (clean === 'XAUUSD') return 'XAU/USD';
  if (clean === 'XAGUSD') return 'XAG/USD';
  if (clean.length === 6) return `${clean.slice(0, 3)}/${clean.slice(3)}`;
  return symbol;
}

export async function fetchForexCandles(
  symbol: string,
  interval: string,
  outputsize: number = 200
): Promise<Candle[]> {
  const key = getTwelveDataKey()
  if (!key || key === 'YOUR_TWELVE_DATA_KEY_HERE') {
    console.warn('[TwelveData] No API key — returning empty data')
    return []
  }

  const mappedSymbol = mapSymbolForTwelveData(symbol)
  const tf = TIMEFRAME_MAP[interval as keyof typeof TIMEFRAME_MAP]?.twelvedata || '1day'
  const url = `${TWELVE}/time_series?symbol=${mappedSymbol}&interval=${tf}&outputsize=${outputsize}&apikey=${key}`
  
  try {
    const { data } = await axios.get(url, {
      headers: {
        'apikey': key,
        'Authorization': `apikey ${key}`
      }
    })
    if (data.status === 'error' || !data.values) {
      console.warn('[TwelveData] Error:', data.message);
      return []
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
    console.warn(`[TwelveData] Failed ${symbol} ${interval}:`, err);
    return []
  }
}

export async function fetchForexTicker(symbol: string): Promise<Ticker | null> {
  const key = getTwelveDataKey()
  if (!key || key === 'YOUR_TWELVE_DATA_KEY_HERE') {
    return null
  }
  const mappedSymbol = mapSymbolForTwelveData(symbol)
  try {
    const [priceRes, quoteRes] = await Promise.all([
      axios.get(`${TWELVE}/price?symbol=${mappedSymbol}&apikey=${key}`, {
        headers: { 'apikey': key, 'Authorization': `apikey ${key}` }
      }),
      axios.get(`${TWELVE}/quote?symbol=${mappedSymbol}&apikey=${key}`, {
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
    return null
  }
}

// ════════════════════════════════════════════════════════
// UNIFIED FETCH — auto-routes by instrument type
// ════════════════════════════════════════════════════════

export async function fetchCandlesWithFlag(
  symbol: string,
  timeframe: string,
  limit: number = 200
): Promise<{candles: Candle[], isRealData: boolean, isCachedData?: boolean, apiError?: string | null}> {
  try {
    const { data: res } = await apiClient.get('/market/candles', {
      params: { pair: symbol, timeframe, limit }
    })
    const list = res?.data ?? res
    const isCached = !!res?.isCached
    const backendError = res?.apiError || null

    if (Array.isArray(list)) {
      // Validate each candle completely
      const parsedCandles: Candle[] = []
      for (const c of list) {
        if (!c) continue;
        const time = Math.floor(new Date(c.timestamp || c.time * 1000).getTime() / 1000);
        const open = Number(c.open);
        const high = Number(c.high);
        const low = Number(c.low);
        const close = Number(c.close);
        const volume = Number(c.volume);

        if (
          !isNaN(time) && time > 0 &&
          !isNaN(open) && isFinite(open) &&
          !isNaN(high) && isFinite(high) &&
          !isNaN(low) && isFinite(low) &&
          !isNaN(close) && isFinite(close) &&
          !isNaN(volume) && isFinite(volume)
        ) {
          parsedCandles.push({ time, open, high, low, close, volume });
        }
      }

      // Treat incomplete response as failure if fewer than 10 valid candles parsed
      if (parsedCandles.length >= 10) {
        return {
          isRealData: !isCached,
          isCachedData: isCached,
          candles: parsedCandles,
          apiError: backendError
        }
      }
    }
  } catch (backendErr: any) {
    console.warn(`[API Proxy] Failed to load candles for ${symbol}:`, backendErr)
    const respData = backendErr?.response?.data
    if (respData) {
      if (respData.code === 'UNSUPPORTED_SYMBOL') {
        return {
          isRealData: false,
          candles: [],
          apiError: `Unsupported Symbol: ${respData.error || 'This asset is not supported by the platform.'}`
        }
      }
      if (respData.code === 'TEMPORARILY_UNAVAILABLE') {
        return {
          isRealData: false,
          candles: [],
          apiError: `Service Temporarily Unavailable: ${respData.error}`
        }
      }
    }
  }

  // Fallback to empty array and flag error when API fails
  return {
    isRealData: false,
    candles: [],
    apiError: "Failed to connect to backend proxy. Chart feed unavailable."
  }
}

export async function fetchCandles(
  symbol: string,
  timeframe: string,
  limit: number = 200
): Promise<Candle[]> {
  const result = await fetchCandlesWithFlag(symbol, timeframe, limit);
  return result.candles;
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

  return null
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
