/**
 * @file constants.ts
 * @description Standard config and environment fallbacks.
 */

const envConstApiUrl = (import.meta as any).env.VITE_API_BASE_URL || (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_API_BASE_URL : '');
export const API_BASE_URL = (envConstApiUrl && !envConstApiUrl.includes('localhost')) ? envConstApiUrl : (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}/api/v1` : '/api/v1');
export const WS_URL = (import.meta as any).env.VITE_WS_URL || (typeof window !== 'undefined' ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}` : 'ws://localhost:4000');
export const BINANCE_WS_URL = (import.meta as any).env.VITE_BINANCE_WS || 'wss://data-stream.binance.vision/ws';
export const APP_NAME = 'AutoSLP';

export const DEFAULT_PAIRS = ['BTCUSDT', 'ETHUSDT', 'EURUSD', 'GBPUSD'] as const;
export const TIMEFRAMES = ['1D', '4H', '1H', '30m', '15m'] as const;
