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

    // 2. Seed Journal Trades (Skipped: let user add their own trades from scratch)
    const now = Date.now();

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
