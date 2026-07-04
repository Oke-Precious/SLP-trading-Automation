import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuthStore } from './useAuthStore';
import { useMarketStore } from './useMarketStore';
import {
  saveTrade as firebaseSaveTrade,
  updateTrade as firebaseUpdateTrade,
  deleteTrade as firebaseDeleteTrade,
  listenToTrades
} from '../lib/firebase/firestoreService';

export interface JournalTrade {
  id:          string
  pair:        string
  direction:   'LONG' | 'SHORT'
  entryPrice:  number
  exitPrice?:  number
  size:        number       // lot size or units
  stopLoss:    number
  target1:     number
  target2?:    number
  status:      'OPEN' | 'CLOSED' | 'STOPPED' | 'PARTIAL'
  pnl?:        number       // in quote currency
  pnlPercent?: number
  rrAchieved?: number
  entryDate:   string       // ISO
  exitDate?:   string
  session:     'LONDON' | 'NEW_YORK' | 'ASIA' | 'OVERLAP'
  setupType:   'OB_BOUNCE' | 'BREAKER_RETEST' | 'BOS_RETEST' | 'LIQUIDITY_SWEEP' | 'OTHER'
  notes:       string
  tags:        string[]
  bias:        'BULLISH' | 'BEARISH'
  timeframe:   string
  grade:       'A' | 'B' | 'C' | 'D' | null   // trade quality grade
}

export interface JournalStats {
  totalTrades: number
  winRate: number
  totalPnL: number
  avgWin: number
  avgLoss: number
  profitFactor: number
  largestWin: number
  largestLoss: number
  avgRR: number
  bestPair: string
  bestSession: string
  bestSetup: string
  drawdown: number
  streak: { current: number; type: 'W' | 'L' | null; best: number }
}

interface JournalStore {
  trades: JournalTrade[]
  addTrade:    (t: Omit<JournalTrade,'id'>) => void
  updateTrade: (id: string, changes: Partial<JournalTrade>) => void
  closeTrade:  (id: string, exitPrice: number, exitDate: string) => void
  deleteTrade: (id: string) => void
  getStats:    () => JournalStats
  getByMonth:  (year: number, month: number) => JournalTrade[]
  setTrades:   (trades: JournalTrade[]) => void
  clearTrades: () => void
  syncWithFirebase: (uid: string) => () => void
}

function calcPnL(trade: { direction: 'LONG' | 'SHORT'; entryPrice: number; exitPrice: number; size: number }): number {
  const diff = trade.direction === 'LONG'
    ? trade.exitPrice - trade.entryPrice
    : trade.entryPrice - trade.exitPrice
  return diff * trade.size
}

export const useJournalStore = create<JournalStore>()(
  persist(
    (set, get) => ({
      trades: [],

      addTrade: (t) => {
        const id = `trade-${Date.now()}`;
        const newTrade = { ...t, id };
        set(s => ({
          trades: [...s.trades, newTrade]
        }));

        const user = useAuthStore.getState().user;
        const uid = user?.uid || user?.id;
        if (uid) {
          firebaseSaveTrade(uid, newTrade).catch(err =>
            console.error('[Firestore] Failed to save trade:', err)
          );
        }
      },

      updateTrade: (id, changes) => {
        set(s => ({
          trades: s.trades.map(t => t.id === id ? { ...t, ...changes } : t)
        }));

        const user = useAuthStore.getState().user;
        const uid = user?.uid || user?.id;
        if (uid) {
          firebaseUpdateTrade(uid, id, changes).catch(err =>
            console.error('[Firestore] Failed to update trade:', err)
          );
        }
      },

      closeTrade: (id, exitPrice, exitDate) => {
        let updatedTradeItem: JournalTrade | null = null;
        set(s => {
          const updatedTrades = s.trades.map(t => {
            if (t.id !== id) return t;
            const pnl = calcPnL({ direction: t.direction, entryPrice: t.entryPrice, exitPrice, size: t.size })
            const pnlPct = ((exitPrice - t.entryPrice) / t.entryPrice) *
                           (t.direction === 'LONG' ? 100 : -100)
            
            let rr = 0
            const denominator = Math.abs(t.entryPrice - t.stopLoss)
            if (denominator > 0) {
              rr = (exitPrice - t.entryPrice) / (t.direction === 'LONG' ? (t.entryPrice - t.stopLoss) : (t.stopLoss - t.entryPrice))
            }

            const updated = {
              ...t, 
              exitPrice, 
              exitDate, 
              pnl, 
              pnlPercent: pnlPct, 
              rrAchieved: rr,
              status: (pnl > 0 ? 'CLOSED' : 'STOPPED') as 'CLOSED' | 'STOPPED',
            };
            updatedTradeItem = updated;
            return updated;
          });
          return { trades: updatedTrades };
        });

        const user = useAuthStore.getState().user;
        const uid = user?.uid || user?.id;
        if (uid && updatedTradeItem) {
          firebaseUpdateTrade(uid, id, updatedTradeItem).catch(err =>
            console.error('[Firestore] Failed to sync closed trade:', err)
          );
        }
      },

      deleteTrade: (id) => {
        set(s => ({ trades: s.trades.filter(t => t.id !== id) }));

        const user = useAuthStore.getState().user;
        const uid = user?.uid || user?.id;
        if (uid) {
          firebaseDeleteTrade(uid, id).catch(err =>
            console.error('[Firestore] Failed to delete trade:', err)
          );
        }
      },

      setTrades: (tradesList) => set({ trades: tradesList }),

      clearTrades: () => set({ trades: [] }),

      syncWithFirebase: (uid) => {
        const unsubscribe = listenToTrades(uid, (tradesFromFirebase) => {
          const parsed = tradesFromFirebase.map(t => ({
            id: t.id,
            pair: t.pair || useMarketStore.getState().selectedPair,
            direction: t.direction || 'LONG',
            entryPrice: t.entryPrice || 0,
            exitPrice: t.exitPrice,
            size: t.size || 0,
            stopLoss: t.stopLoss || 0,
            target1: t.target1 || 0,
            target2: t.target2,
            status: t.status || 'OPEN',
            pnl: t.pnl,
            pnlPercent: t.pnlPercent,
            rrAchieved: t.rrAchieved,
            entryDate: t.entryDate || new Date().toISOString(),
            exitDate: t.exitDate,
            session: t.session || 'LONDON',
            setupType: t.setupType || 'OTHER',
            notes: t.notes || '',
            tags: t.tags || [],
            bias: t.bias || 'BULLISH',
            timeframe: t.timeframe || '1H',
            grade: t.grade || null
          }));
          get().setTrades(parsed);
        });
        return unsubscribe;
      },

      getStats: () => {
        const { trades } = get()
        const closed = trades.filter(t => t.status !== 'OPEN')
        if (closed.length === 0) return {
          totalTrades:0, winRate:0, totalPnL:0, avgWin:0, avgLoss:0,
          profitFactor:0, largestWin:0, largestLoss:0, avgRR:0,
          bestPair:'—', bestSession:'—', bestSetup:'—', drawdown:0,
          streak: { current:0, type:null, best:0 }
        }
        const wins  = closed.filter(t => (t.pnl ?? 0) > 0)
        const losses = closed.filter(t => (t.pnl ?? 0) <= 0)
        const totalPnL = closed.reduce((s,t) => s + (t.pnl ?? 0), 0)
        const avgWin  = wins.length  ? wins.reduce((s,t)=>s+(t.pnl??0),0)  / wins.length  : 0
        const avgLoss = losses.length ? losses.reduce((s,t)=>s+(t.pnl??0),0) / losses.length : 0
        
        const totalWinsVal = wins.reduce((s,t)=>s+(t.pnl??0),0)
        const totalLossesVal = Math.abs(losses.reduce((s,t)=>s+(t.pnl??0),0))
        const profitFactor = totalLossesVal > 0 ? totalWinsVal / totalLossesVal : totalWinsVal

        // Best pair by P&L
        const pairPnL: Record<string, number> = {}
        closed.forEach(t => { pairPnL[t.pair] = (pairPnL[t.pair]||0) + (t.pnl??0) })
        const bestPair = Object.entries(pairPnL).sort((a,b) => b[1]-a[1])[0]?.[0] ?? '—'

        // Best Session by P&L
        const sessionPnL: Record<string, number> = {}
        closed.forEach(t => { sessionPnL[t.session] = (sessionPnL[t.session]||0) + (t.pnl??0) })
        const bestSession = Object.entries(sessionPnL).sort((a,b) => b[1]-a[1])[0]?.[0] ?? '—'

        // Best Setup by P&L
        const setupPnL: Record<string, number> = {}
        closed.forEach(t => { setupPnL[t.setupType] = (setupPnL[t.setupType]||0) + (t.pnl??0) })
        const bestSetup = Object.entries(setupPnL).sort((a,b) => b[1]-a[1])[0]?.[0] ?? '—'

        // Win/loss streaks
        let currentStreak = 0
        let streakType: 'W' | 'L' | null = null
        let bestStreak = 0
        
        // Sort closed trades chronologically to calculate streaks and drawdown
        const sortedClosed = [...closed].sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime())
        
        sortedClosed.forEach(t => {
          const isWin = (t.pnl ?? 0) > 0
          const currentTradeType = isWin ? 'W' : 'L'
          if (streakType === null) {
            streakType = currentTradeType
            currentStreak = 1
            bestStreak = 1
          } else if (streakType === currentTradeType) {
            currentStreak++
            if (currentStreak > bestStreak) {
              bestStreak = currentStreak
            }
          } else {
            streakType = currentTradeType
            currentStreak = 1
          }
        })

        // Drawdown
        let maxPnL = 0
        let cumulativePnL = 0
        let maxDrawdown = 0
        sortedClosed.forEach(t => {
          cumulativePnL += (t.pnl ?? 0)
          if (cumulativePnL > maxPnL) {
            maxPnL = cumulativePnL
          }
          const dd = maxPnL - cumulativePnL
          if (dd > maxDrawdown) {
            maxDrawdown = dd
          }
        })

        return {
          totalTrades: closed.length,
          winRate: (wins.length / closed.length) * 100,
          totalPnL,
          avgWin,
          avgLoss,
          profitFactor,
          largestWin:  wins.length ? Math.max(...wins.map(t => t.pnl ?? 0)) : 0,
          largestLoss: losses.length ? Math.min(...losses.map(t => t.pnl ?? 0)) : 0,
          avgRR: closed.reduce((s,t) => s + (t.rrAchieved ?? 0), 0) / closed.length,
          bestPair,
          bestSession,
          bestSetup,
          drawdown: maxDrawdown,
          streak: { current: currentStreak, type: streakType, best: bestStreak },
        }
      },

      getByMonth: (year, month) => {
        const { trades } = get()
        return trades.filter(t => {
          const d = new Date(t.entryDate)
          return d.getFullYear() === year && d.getMonth() + 1 === month
        })
      },
    }),
    { name: 'autoSLP-journal' }
  )
)
