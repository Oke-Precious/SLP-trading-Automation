export interface Persona {
  name: string;
  age: number;
  experience: string;
  markets: string[];
  workflow: string[];
  painPoints: string[];
  keyFeatures: string[];
  device: string;
  literacy: string;
}

export type CurrencyPair = string;
export type Timeframe =
  | '1m'
  | '3m'
  | '5m'
  | '15m'
  | '30m'
  | '45m'
  | '1H'
  | '2H'
  | '4H'
  | '8H'
  | '12H'
  | '1D'
  | '1W'
  | '1M';

export interface POI {
  id: string;
  name: string;
  type: 'OB' | 'BB'; // Order Block or Breaker Block
  priceRange: string;
  priceMin: number;
  priceMax: number;
  status: 'Active' | 'Mitigated' | 'Tested';
  timeframe: Timeframe;
  pair?: CurrencyPair;
}

export interface Signal {
  id: string;
  date: string;
  pair: CurrencyPair;
  direction: 'Long' | 'Short';
  result: string;
  pnl: string;
  isWin: boolean;
}

export interface Alert {
  id: string;
  pair: CurrencyPair;
  condition: string;
  status: 'Active' | 'Triggered';
  timestamp: string;
}

export interface TradingStep {
  id: number;
  title: string;
  description: string;
}

export interface Position {
  id: string;
  pair: CurrencyPair;
  direction: 'Long' | 'Short';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  size: string;
  status: 'Open' | 'Closed';
  pnl: string;
  pnlPercent: number;
  date: string;
}
