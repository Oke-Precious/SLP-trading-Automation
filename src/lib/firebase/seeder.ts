import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { savePOI, saveTrade, saveAlert, saveUserSettings, saveUserBias } from './firestoreService';

export async function seedUserDataIfEmpty(uid: string, email?: string | null) {
  try {
    const tradesColRef = collection(db, 'users', uid, 'trades');
    const existingTrades = await getDocs(tradesColRef);
    
    // Only seed if there is absolutely no trade data to prevent overwriting user-curated records
    if (!existingTrades.empty) {
      console.log(`ℹ️ [Database Seeder] User ${uid} already has populated records. Skipping seeding.`);
      return;
    }

    console.log(`🌱 [Database Seeder] Seeding premium, realistic sample trading data for user ${uid}...`);

    // 1. Seed Points of Interest (POIs)
    const mockPOIs = [
      {
        id: 'poi-1',
        name: 'Daily Bullish Order Block',
        type: 'OB',
        priceRange: '$61,200 - $61,800',
        priceMin: 61200,
        priceMax: 61800,
        status: 'Active',
        timeframe: '1D'
      },
      {
        id: 'poi-2',
        name: '4H Bearish Breaker Block',
        type: 'BB',
        priceRange: '$63,500 - $64,000',
        priceMin: 63500,
        priceMax: 64000,
        status: 'Active',
        timeframe: '4H'
      },
      {
        id: 'poi-3',
        name: '15M Bullish Order Block (Retested)',
        type: 'OB',
        priceRange: '$62,100 - $62,400',
        priceMin: 62100,
        priceMax: 62400,
        status: 'Mitigated',
        timeframe: '15m'
      }
    ];

    for (const poi of mockPOIs) {
      await savePOI(uid, poi);
    }

    // 2. Seed Journal Trades (including realistic history and active trades)
    const now = Date.now();
    const mockTrades = [
      {
        id: 'trade-seed-1',
        pair: 'BTCUSDT',
        direction: 'LONG',
        entryPrice: 66450,
        exitPrice: 68900,
        size: 0.5,
        stopLoss: 65800,
        target1: 68500,
        status: 'CLOSED',
        pnl: 1225,
        pnlPercent: 3.68,
        rrAchieved: 3.76,
        entryDate: new Date(now - 4 * 24 * 3600 * 1000).toISOString(),
        exitDate: new Date(now - 4 * 24 * 3600 * 1000 + 4 * 3600 * 1000).toISOString(),
        session: 'NEW_YORK',
        setupType: 'OB_BOUNCE',
        notes: 'Price tapped perfectly into unmitigated 4H bullish order block. Strong 15m bullish candle engulfing rejection with high volume. Entered on limit pull-back. Target hit on New York session expansion.',
        tags: ['SMC', 'OB', 'NewYork'],
        bias: 'BULLISH',
        timeframe: '4H',
        grade: 'A'
      },
      {
        id: 'trade-seed-2',
        pair: 'ETHUSDT',
        direction: 'SHORT',
        entryPrice: 3420,
        exitPrice: 3510,
        size: 10,
        stopLoss: 3480,
        target1: 3250,
        status: 'STOPPED',
        pnl: -900,
        pnlPercent: -2.63,
        rrAchieved: -1.5,
        entryDate: new Date(now - 2 * 24 * 3600 * 1000).toISOString(),
        exitDate: new Date(now - 2 * 24 * 3600 * 1000 + 45 * 60 * 1000).toISOString(),
        session: 'LONDON',
        setupType: 'LIQUIDITY_SWEEP',
        notes: 'Asia session high liquidity sweep. Attempted an aggressive short on standard breakdown but higher-timeframe order flow was too strong, resulting in a standard stop out. Lesson: avoid trading counter high-timeframe trends.',
        tags: ['Sweep', 'AsiaHigh', 'Failed'],
        bias: 'BEARISH',
        timeframe: '1H',
        grade: 'C'
      },
      {
        id: 'trade-seed-3',
        pair: 'EURUSD',
        direction: 'LONG',
        entryPrice: 1.0820,
        exitPrice: 1.0895,
        size: 100000,
        stopLoss: 1.0795,
        target1: 1.0890,
        status: 'CLOSED',
        pnl: 750,
        pnlPercent: 0.69,
        rrAchieved: 3.0,
        entryDate: new Date(now - 1 * 24 * 3600 * 1000).toISOString(),
        exitDate: new Date(now - 1 * 24 * 3600 * 1000 + 6 * 3600 * 1000).toISOString(),
        session: 'LONDON',
        setupType: 'BREAKER_RETEST',
        notes: '1H breaker block retest in line with bullish daily bias. Very clean entry alignment with London open expansion. Extended targets taken at the daily liquidity pool.',
        tags: ['Forex', 'BreakerBlock', 'LondonOpen'],
        bias: 'BULLISH',
        timeframe: '1H',
        grade: 'B'
      },
      {
        id: 'trade-seed-4',
        pair: 'BTCUSDT',
        direction: 'LONG',
        entryPrice: 67300,
        size: 0.25,
        stopLoss: 66500,
        target1: 69800,
        status: 'OPEN',
        entryDate: new Date().toISOString(),
        session: 'NEW_YORK',
        setupType: 'BOS_RETEST',
        notes: 'Active trade setup. Limit order filled at 15M Break of Structure (BOS) retest zone. Momentum remains bullish across all timeframes.',
        tags: ['Active', 'BOS', 'H4-Trend'],
        bias: 'BULLISH',
        timeframe: '15m',
        grade: 'A'
      }
    ];

    for (const trade of mockTrades) {
      await saveTrade(uid, trade);
    }

    // 3. Seed Alerts
    const mockAlerts = [
      {
        id: `alert-seed-1`,
        pair: 'BTCUSDT',
        condition: 'PRICE_ABOVE',
        value: 68500,
        status: 'ACTIVE',
        channels: { inApp: true, browser: true, sound: true },
        createdAt: now - 3600 * 1000,
        label: 'BTC Breakout Above Range High'
      },
      {
        id: `alert-seed-2`,
        pair: 'EURUSD',
        condition: 'PRICE_BELOW',
        value: 1.0780,
        status: 'ACTIVE',
        channels: { inApp: true, browser: false, sound: true },
        createdAt: now - 1800 * 1000,
        label: 'EURUSD Liquidity Sweep Low'
      }
    ];

    for (const alert of mockAlerts) {
      await saveAlert(uid, alert);
    }

    // 4. Seed User Settings
    const mockSettings = {
      defaultPair: 'BTCUSDT',
      defaultTimeframe: '4H',
      twelveDataApiKey: 'YOUR_TWELVE_DATA_KEY_HERE',
      notificationsEnabled: true,
      sidebarDefaultExpanded: true,
      timeFormat: '12H',
      chartTheme: 'emerald-rose'
    };
    await saveUserSettings(uid, mockSettings);

    // 5. Seed User Bias Map
    const mockBiasMap = {
      BTCUSDT: { '1D': 'BULLISH', '4H': 'BULLISH', '1H': 'BULLISH', '30m': 'BULLISH', '15m': 'BEARISH', '5m': 'BEARISH' },
      ETHUSDT: { '1D': 'BULLISH', '4H': 'BULLISH', '1H': 'BEARISH', '30m': 'BEARISH', '15m': 'BEARISH', '5m': 'BEARISH' },
      EURUSD: { '1D': 'BEARISH', '4H': 'BEARISH', '1H': 'BULLISH', '30m': 'BULLISH', '15m': 'BULLISH', '5m': 'BULLISH' },
      GBPUSD: { '1D': 'BULLISH', '4H': 'BULLISH', '1H': 'BULLISH', '30m': 'BULLISH', '15m': 'BULLISH', '5m': 'BULLISH' }
    };
    await saveUserBias(uid, mockBiasMap);

    console.log(`🎉 [Database Seeder] Done seeding premium trading assets for user ${uid}!`);
  } catch (error) {
    console.warn(`⚠️ [Database Seeder] Seeding encountered a non-blocking error for user ${uid}:`, error);
  }
}
