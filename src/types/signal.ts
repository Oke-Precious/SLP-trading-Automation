/**
 * @file signal.ts
 * @description Types for signals, entry alerts, and trade management.
 */

import { CurrencyPair } from '../types';

export type SignalDirection = 'Long' | 'Short';
export type SignalStatus = 'Pending' | 'Active' | 'Closed';

export interface Signal {
  id: string;
  pair: CurrencyPair;
  direction: SignalDirection;
  status: SignalStatus;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  pnl?: string;
  pnlPercent?: number;
  isWin?: boolean;
  date: string;
}

export interface TradeSetup {
  id: string;
  pair: CurrencyPair;
  side: SignalDirection;
  entryZone: string;
  stopLoss: number;
  takeProfit: number;
  rrRatio: number;
  probability: 'High' | 'Medium' | 'Low';
}
