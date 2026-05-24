import { PrismaClient, Plan, Direction, POIType, POIStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with default setup...');

  // 1. Create Demo User
  const passwordHash = await bcrypt.hash('autoslpPass123!', 12);
  const user = await prisma.user.upsert({
    where: { email: 'demo@autoslp.com' },
    update: {},
    create: {
      email: 'demo@autoslp.com',
      username: 'demoplotter',
      passwordHash,
      plan: Plan.PREMIUM,
      preferences: {
        defaultPair: 'BTCUSDT',
        defaultTF: '1H',
        theme: 'dark'
      }
    }
  });

  console.log(`Demo User created: ${user.username}`);

  // 2. Clear previous entries if any
  await prisma.pOI.deleteMany({ where: { userId: user.id } });
  
  // 3. Create Sample POIs
  const poi1 = await prisma.pOI.create({
    data: {
      userId: user.id,
      pair: 'BTCUSDT',
      timeframe: '4H',
      type: POIType.ORDER_BLOCK,
      priceFrom: 64200,
      priceTo: 65100,
      status: POIStatus.ACTIVE,
      notes: 'H4 Institutional Demand Zone'
    }
  });

  const poi2 = await prisma.pOI.create({
    data: {
      userId: user.id,
      pair: 'BTCUSDT',
      timeframe: '1D',
      type: POIType.ORDER_BLOCK,
      priceFrom: 61800,
      priceTo: 62500,
      status: POIStatus.MITIGATED,
      notes: 'Daily Swing Low Mitigation Channel'
    }
  });

  console.log(`SMC POIs seeded: ${poi1.id}, ${poi2.id}`);

  // 4. Create Sample Alerts
  await prisma.alert.create({
    data: {
      userId: user.id,
      pair: 'BTCUSDT',
      condition: 'PRICE_ENTERS_POI',
      value: { poiId: poi1.id, name: 'H4 Institutional Demand Zone' },
      status: 'ACTIVE',
      channels: { email: true, push: true, inApp: true }
    }
  });

  console.log('Database seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
