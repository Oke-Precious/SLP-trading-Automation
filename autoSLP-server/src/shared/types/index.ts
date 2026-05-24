export interface Candle {
  pair: string;
  timeframe: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: string | Date;
}

export interface PivotPoint {
  price: number;
  index: number;
  timestamp: string | Date;
}

export interface SwingPoints {
  highs: PivotPoint[];
  lows: PivotPoint[];
}

export interface POIZone {
  id?: string;
  type: 'ORDER_BLOCK' | 'BREAKER_BLOCK';
  direction: 'BULLISH' | 'BEARISH';
  priceFloor: number;
  priceCeiling: number;
  timestamp: string | Date;
  status?: string;
  notes?: string;
}

export interface LiquidityPool {
  id: string;
  type: 'BUY_SIDE_LIQUIDITY' | 'SELL_SIDE_LIQUIDITY';
  priceLevel: number;
  candlesMatched: (string | Date)[];
}
