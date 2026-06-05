import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../shared/db.js';

export enum Plan {
  FREE = 'FREE',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE'
}

// Hashed evaluation algorithm for stable user rollouts
function isRolloutActiveForUser(userId: string, rolloutPercentage: number): boolean {
  if (rolloutPercentage >= 100) return true;
  if (rolloutPercentage <= 0) return false;
  
  // Calculate a stable 0-99 value based on user ID chars ASCII sum
  let sum = 0;
  for (let i = 0; i < userId.length; i++) {
    sum += userId.charCodeAt(i);
  }
  return (sum % 100) < rolloutPercentage;
}

export async function featuresRoutes(server: FastifyInstance) {
  // GET /features - Public/Protected depending on JWT presence
  server.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    let userId = 'anonymous';
    let userPlan: Plan = Plan.FREE;

    try {
      // Decode JWT token if validly provided, but do not crash if missing
      await request.jwtVerify();
      const decoded = request.user as any;
      userId = decoded?.sub || 'anonymous';
      
      if (userId !== 'anonymous') {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user) {
          userPlan = user.plan;
        }
      }
    } catch {
      // Unauthenticated users are allowed to access public flags (as FREE users)
    }

    try {
      // In-memory flags as database table is bypassed
      const dbFlags: any[] = [];
      
      // Build flags map
      const flagsMap: Record<string, boolean> = {};

      const defaultFeatureFlags = [
        { key: 'ai_pattern_recognition', enabled: false, rollout: 0, planGated: null, description: 'Phase 11 AI pattern recognition feature' },
        { key: 'backtest_module', enabled: true, rollout: 50, planGated: null, description: 'Backtesting module (beta users only)' },
        { key: 'multi_exchange', enabled: false, rollout: 0, planGated: null, description: 'Multi-exchange trading integration' },
        { key: 'social_trading', enabled: false, rollout: 0, planGated: null, description: 'Social trading and shared public signals' },
        { key: 'dark_mode_v2', enabled: true, rollout: 100, planGated: null, description: 'Complete redesigned Dark Mode V2' },
        { key: 'advanced_charts', enabled: true, rollout: 100, planGated: Plan.PRO, description: 'Advanced trading charts (Pro plan only)' }
      ];

      // Merge defaults with DB flags
      const mergedFlags = defaultFeatureFlags.map(defaultFlag => {
        const dbFlag = dbFlags.find((f: any) => f.key === defaultFlag.key);
        return dbFlag ? dbFlag : defaultFlag;
      });

      for (const flag of mergedFlags) {
        // 1. Is the flag overall enabled?
        if (!flag.enabled) {
          flagsMap[flag.key] = false;
          continue;
        }

        // 2. Is it gated to premium plans?
        if (flag.planGated === Plan.PRO && userPlan === Plan.FREE) {
          flagsMap[flag.key] = false;
          continue;
        }

        // 3. For Rollout percentages (if less than 100)
        if (flag.rollout < 100 && userId !== 'anonymous') {
          flagsMap[flag.key] = isRolloutActiveForUser(userId, flag.rollout);
          continue;
        } else if (flag.rollout < 100 && userId === 'anonymous') {
          // Anonymous gets default off if rollout is limited
          flagsMap[flag.key] = false;
          continue;
        }

        flagsMap[flag.key] = true;
      }

      return {
        success: true,
        flags: flagsMap,
        raw: mergedFlags
      };
    } catch (err: any) {
      // In-memory fallback if postgres is disconnected
      const fallbackFlags: Record<string, boolean> = {
        ai_pattern_recognition: false,
        backtest_module: true,
        multi_exchange: false,
        social_trading: false,
        dark_mode_v2: true,
        advanced_charts: userPlan === Plan.PRO,
      };

      return {
        success: true,
        flags: fallbackFlags,
        fallbackActive: true
      };
    }
  });

  // POST /features - Admin endpoint to adjust feature flag properties
  server.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      const decoded = request.user as any;
      const userId = decoded?.sub;
      
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || user.plan !== Plan.ENTERPRISE) {
        // Enforce admin privileges to modify flags
        return reply.status(403).send({ error: 'Forbidden: Admin access only.' });
      }

      const body = request.body as any;
      const { key, enabled, rollout, planGated, description } = body;

      if (!key) {
        return reply.status(400).send({ error: 'Missing feature flag key' });
      }

      const updatedFlag = {
        key,
        enabled: enabled ?? false,
        rollout: rollout ? Number(rollout) : 100,
        planGated: planGated || null,
        description: description || ''
      };

      return { success: true, flag: updatedFlag };
    } catch (err: any) {
      return reply.status(401).send({ error: 'Unauthorized: Admin authentication failed.' });
    }
  });
}
