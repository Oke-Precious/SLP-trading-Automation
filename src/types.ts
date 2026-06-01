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
export type Timeframe = '1D' | '4H' | '1H' | '30m' | '15m' | '5m';

export interface POI {
  id: string;
  name: string;
  type: 'OB' | 'BB'; // Order Block or Breaker Block
  priceRange: string;
  priceMin: number;
  priceMax: number;
  status: 'Active' | 'Mitigated' | 'Tested';
  timeframe: Timeframe;
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
