import { PrismaClient, Plan, Direction, POIType, POIStatus, SignalStatus, Bias, Strength, AlertType, AlertStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with demo records...');

  // 1. Clean previous records to prevent duplicates
  await prisma.auditLog.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.trade.deleteMany();
  await prisma.signal.deleteMany();
  await prisma.poi.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.biasAnalysis.deleteMany();
  await prisma.user.deleteMany();

  // 2. Demo User: demo@autoslp.com / Demo@1234
  const saltRounds = 10;
  const passwordHash = bcrypt.hashSync('Demo@1234', saltRounds);
  
  const user = await prisma.user.create({
    data: {
      email: 'demo@autoslp.com',
      username: 'demotrader',
      passwordHash,
      plan: Plan.PRO,
      isVerified: true,
      is2FAEnabled: false,
      preferences: {
        theme: 'dark',
        defaultTimeframes: ['15m', '1H', '4H', '1D'],
        riskPercentage: 1.0,
      },
      createdAt: new Date('2026-05-01T08:00:00.000Z'),
    },
  });

  console.log(`Demo user created: ${user.email}`);

  // 3. 3 POIs for BTCUSDT (2 Order Blocks, 1 Breaker Block)
  const poi1 = await prisma.pOI.create({
    data: {
      userId: user.id,
      pair: 'BTCUSDT',
      timeframe: '1H',
      type: POIType.ORDER_BLOCK,
      priceFrom: 62500.00000000,
      priceTo: 62750.00000000,
      status: POIStatus.ACTIVE,
      notes: 'Strong bullish Order Block on 1H timeframe formed before impulsive expansion.',
    },
  });

  const poi2 = await prisma.pOI.create({
    data: {
      userId: user.id,
      pair: 'BTCUSDT',
      timeframe: '15m',
      type: POIType.ORDER_BLOCK,
      priceFrom: 64100.00000000,
      priceTo: 64200.00000000,
      status: POIStatus.MITIGATED,
      notes: 'Bullish Order Block on 15m. Mitigated and tested successfully.',
    },
  });

  const poi3 = await prisma.pOI.create({
    data: {
      userId: user.id,
      pair: 'BTCUSDT',
      timeframe: '4H',
      type: POIType.BREAKER_BLOCK,
      priceFrom: 61200.00000000,
      priceTo: 61500.00000000,
      status: POIStatus.ACTIVE,
      notes: 'Bearish Order Block breached and transitioned into a solid bullish Breaker Block.',
    },
  });

  console.log('3 POIs created.');

  // 4. 3 recent signals (2 wins, 1 loss)
  const signal1 = await prisma.signal.create({
    data: {
      userId: user.id,
      pair: 'BTCUSDT',
      timeframe: '1H',
      direction: Direction.LONG,
      poiId: poi2.id,
      entryFrom: 64120.00000000,
      entryTo: 64180.00000000,
      stopLoss: 63800.00000000,
      target1: 65100.00000000,
      target2: 66050.00000000,
      status: SignalStatus.HIT_TP2, // Win 1
      confirmationTF: '15m',
      rrRatio: 4.80,
      bias: Bias.BULLISH,
      notes: 'TP2 target hit after structural test within the 15m bullish order block.',
      createdAt: new Date('2026-05-20T10:00:00.000Z'),
      triggeredAt: new Date('2026-05-20T11:15:00.000Z'),
      closedAt: new Date('2026-05-21T02:30:00.000Z'),
      pnlPercent: 4.80,
    },
  });

  const signal2 = await prisma.signal.create({
    data: {
      userId: user.id,
      pair: 'BTCUSDT',
      timeframe: '15m',
      direction: Direction.LONG,
      poiId: poi1.id,
      entryFrom: 62550.00000000,
      entryTo: 62650.00000000,
      stopLoss: 62300.00000000,
      target1: 63500.00000000,
      target2: 64200.00000000,
      status: SignalStatus.HIT_TP1, // Win 2
      confirmationTF: '5m',
      rrRatio: 2.70,
      bias: Bias.BULLISH,
      notes: 'TP1 reached successfully. Trailed SL to entry to prevent further losses.',
      createdAt: new Date('2026-05-22T14:00:00.000Z'),
      triggeredAt: new Date('2026-05-22T15:05:00.000Z'),
      closedAt: new Date('2026-05-22T19:40:00.000Z'),
      pnlPercent: 2.70,
    },
  });

  const signal3 = await prisma.signal.create({
    data: {
      userId: user.id,
      pair: 'BTCUSDT',
      timeframe: '1H',
      direction: Direction.SHORT,
      entryFrom: 65800.00000000,
      entryTo: 65900.00000000,
      stopLoss: 66350.00000000,
      target1: 64500.00000000,
      target2: 63800.00000000,
      status: SignalStatus.STOPPED_OUT, // Loss
      confirmationTF: '15m',
      rrRatio: 3.10,
      bias: Bias.BEARISH,
      notes: 'Failed to break structure before liquidity pool sweep above. Stopped out.',
      createdAt: new Date('2026-05-23T09:00:00.000Z'),
      triggeredAt: new Date('2026-05-23T10:15:00.000Z'),
      closedAt: new Date('2026-05-23T11:45:00.000Z'),
      pnlPercent: -1.00,
    },
  });

  console.log('3 Signalling setups created.');

  // 5. 5 sample trades
  await prisma.trade.create({
    data: {
      userId: user.id,
      signalId: signal1.id,
      pair: 'BTCUSDT',
      direction: Direction.LONG,
      entryPrice: 64150.00000000,
      exitPrice: 66050.00000000,
      size: 0.25000000,
      pnl: 475.00000000,
      pnlPercent: 4.8000,
      rrAchieved: 4.80,
      fees: 0.95000000,
      notes: 'Perfect mitigation entry. Held through overnight consolidation.',
      entryAt: new Date('2026-05-20T11:15:00.000Z'),
      exitAt: new Date('2026-05-21T02:30:00.000Z'),
    },
  });

  await prisma.trade.create({
    data: {
      userId: user.id,
      signalId: signal2.id,
      pair: 'BTCUSDT',
      direction: Direction.LONG,
      entryPrice: 62600.00000000,
      exitPrice: 63500.00000000,
      size: 0.15000000,
      pnl: 135.00000000,
      pnlPercent: 2.7000,
      rrAchieved: 2.70,
      fees: 0.40000000,
      notes: 'TP1 hit, closed full position since market momentum showed weakening signs.',
      entryAt: new Date('2026-05-22T15:05:00.000Z'),
      exitAt: new Date('2026-05-22T19:40:00.000Z'),
    },
  });

  await prisma.trade.create({
    data: {
      userId: user.id,
      signalId: signal3.id,
      pair: 'BTCUSDT',
      direction: Direction.SHORT,
      entryPrice: 65850.00000000,
      exitPrice: 66350.00000000,
      size: 0.20000000,
      pnl: -100.00000000,
      pnlPercent: -1.0000,
      rrAchieved: -1.00,
      fees: 0.50000000,
      notes: 'Strict risk parameters maintained. Cut cleanly at Stop Loss.',
      entryAt: new Date('2026-05-23T10:15:00.000Z'),
      exitAt: new Date('2026-05-23T11:45:00.000Z'),
    },
  });

  // Manual/un-signaled Trades
  await prisma.trade.create({
    data: {
      userId: user.id,
      pair: 'BTCUSDT',
      direction: Direction.SHORT,
      entryPrice: 64800.00000000,
      exitPrice: 64250.00000000,
      size: 0.30000000,
      pnl: 165.00000000,
      pnlPercent: 2.2000,
      rrAchieved: 2.20,
      fees: 0.70000000,
      notes: 'Quick scalping model on Equal Highs sweep near resistance zone.',
      entryAt: new Date('2026-05-24T08:00:00.000Z'),
      exitAt: new Date('2026-05-24T09:30:00.000Z'),
    },
  });

  await prisma.trade.create({
    data: {
      userId: user.id,
      pair: 'BTCUSDT',
      direction: Direction.LONG,
      entryPrice: 63100.00000000,
      exitPrice: 63850.00000000,
      size: 0.10000000,
      pnl: 75.00000000,
      pnlPercent: 1.5000,
      rrAchieved: 1.50,
      fees: 0.25000000,
      notes: 'Entry based on breaker block reaction. Small scale execution.',
      entryAt: new Date('2026-05-24T18:00:00.000Z'),
      exitAt: new Date('2026-05-24T21:15:00.000Z'),
    },
  });

  console.log('5 sample trades created.');

  // 6. 2 alerts
  await prisma.alert.create({
    data: {
      userId: user.id,
      pair: 'BTCUSDT',
      type: AlertType.PRICE_ENTERS_POI,
      condition: { poiId: poi1.id, name: 'Active Bullish OB' },
      status: AlertStatus.ACTIVE,
      channels: { email: true, push: false, inApp: true },
      message: 'BTCUSDT has touched back within active 1H Bullish Order Block at 62,500.',
    },
  });

  await prisma.alert.create({
    data: {
      userId: user.id,
      pair: 'BTCUSDT',
      type: AlertType.BIAS_CHANGE,
      condition: { pair: 'BTCUSDT', timeframe: '4H' },
      status: AlertStatus.ACTIVE,
      channels: { email: true, push: true, inApp: true },
      message: 'Market Structure Alert: BTCUSDT 4H analytical bias shifted to bearish.',
    },
  });

  console.log('2 alerts created.');

  // 7. A sample audit log and some candles
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'USER_LOGIN',
      resource: 'User',
      resourceId: user.id,
      result: 'SUCCESS',
      ip: '127.0.0.1',
      userAgent: 'Mozilla/5.0 Chrome 125',
      metadata: { login_method: 'standard_password' },
    },
  });

  console.log('Seed process finished successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
