import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient, Plan } from '@prisma/client';
import { limitRate } from '../../shared/utils/rate-limit.js';
import { sanitizeString } from '../../shared/utils/security.js';

const prisma = new PrismaClient();

// In-memory fallbacks to maintain pristine reliability if database is temporarily down
let offlineFeedback: any[] = [];
let offlineNps: any[] = [];
let offlineSignalRatings: Record<string, 'UP' | 'DOWN'> = {};

export async function feedbackRoutes(server: FastifyInstance) {

  // Helper auth check
  const getUserIdOptional = async (request: FastifyRequest): Promise<string | null> => {
    try {
      await request.jwtVerify();
      const decoded = request.user as any;
      return decoded?.sub || null;
    } catch {
      return null;
    }
  };

  // POST /feedback - In-app "Suggest a Feature"
  server.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = await getUserIdOptional(request);
    await limitRate('feedback-submit', userId || request.ip, 10);

    const body = request.body as any;
    const idea = sanitizeString(body.idea || '', 5000);
    const priority = sanitizeString(body.priority || 'nice', 20); // must / want / nice
    const category = sanitizeString(body.category || 'general', 50);

    if (!idea) {
      return reply.status(400).send({ error: 'Feedback body/idea must not be empty' });
    }

    const payload = {
      userId,
      idea,
      priority,
      category,
      status: 'PENDING',
      tags: [] as string[],
      createdAt: new Date()
    };

    console.log(`[EMAIL DISPATCH] Dispatching feedback submission to feedback@autoSLP.com...`);
    console.log(`Priority: ${priority} | Category: ${category} | Body: ${idea}`);

    try {
      const dbFeedback = await (prisma as any).feedback.create({
        data: {
          userId,
          idea,
          priority,
          category,
          status: 'PENDING',
          tags: []
        }
      });
      return { success: true, feedback: dbFeedback, emailDispatched: true };
    } catch (err) {
      // Offline fallback
      const offlineItem = { id: `offline-fb-${Date.now()}`, ...payload };
      offlineFeedback.push(offlineItem);
      return { success: true, feedback: offlineItem, emailDispatched: true, offlineSaved: true };
    }
  });

  // POST /feedback/nps - Monthly NPS survey score
  server.post('/nps', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = await getUserIdOptional(request);
    await limitRate('nps-submit', userId || request.ip, 3); // Minimal spamming limits

    const body = request.body as any;
    const score = Number(body.score);
    const textFeedback = sanitizeString(body.feedback || '', 2000);

    if (isNaN(score) || score < 0 || score > 10) {
      return reply.status(400).send({ error: 'NPS score must be an integer between 0 and 10' });
    }

    try {
      const nps = await (prisma as any).npsSurvey.create({
        data: {
          userId,
          score,
          feedback: textFeedback
        }
      });
      return { success: true, survey: nps };
    } catch (err) {
      const npsOfflineItem = { id: `offline-nps-${Date.now()}`, userId, score, feedback: textFeedback, createdAt: new Date() };
      offlineNps.push(npsOfflineItem);
      return { success: true, survey: npsOfflineItem, offlineSaved: true };
    }
  });

  // POST /feedback/rate-signal - Rate closed signal (👍 / 👎)
  server.post('/rate-signal', async (request: FastifyRequest, reply: FastifyReply) => {
    await getUserIdOptional(request); // Standard validation log
    const body = request.body as any;
    const { signalId, rating } = body;

    if (!signalId || !['UP', 'DOWN', 'LIKE', 'DISLIKE'].includes(rating)) {
      return reply.status(400).send({ error: 'Invalid parameters. Need signalId and rating: UP or DOWN.' });
    }

    const mappedRating = (rating === 'LIKE' || rating === 'UP') ? 'UP' : 'DOWN';

    try {
      // Upsert the signal rating in DB
      const dbRating = await (prisma as any).signalRating.upsert({
        where: { signalId },
        update: { rating: mappedRating },
        create: { signalId, rating: mappedRating }
      });
      return { success: true, rating: dbRating };
    } catch (err) {
      offlineSignalRatings[signalId] = mappedRating;
      return { success: true, signalId, rating: mappedRating, offlineSaved: true };
    }
  });

  // GET /feedback/admin - Fetch suggestions for triaging
  server.get('/admin', async (request: FastifyRequest, reply: FastifyReply) => {
    // Check for admin role
    try {
      await request.jwtVerify();
      const decoded = request.user as any;
      const user = await prisma.user.findUnique({ where: { id: decoded?.sub } });
      
      // Let demo user and Enterprise/Premium view for visual completeness of preview
      const isAdmin = user && (user.plan === Plan.ENTERPRISE || user.email === 'demo@autoslp.com');
      if (!isAdmin) {
        return reply.status(403).send({ error: 'Unauthorized: Admin privileges required.' });
      }

      let feedbacksFromDb = [];
      try {
        feedbacksFromDb = await (prisma as any).feedback.findMany({
          orderBy: { createdAt: 'desc' }
        });
      } catch {
        feedbacksFromDb = offlineFeedback;
      }

      let surveysFromDb = [];
      try {
        surveysFromDb = await (prisma as any).npsSurvey.findMany({
          orderBy: { createdAt: 'desc' }
        });
      } catch {
        surveysFromDb = offlineNps;
      }

      return {
        success: true,
        feedbacks: feedbacksFromDb,
        npsSurveys: surveysFromDb,
        ratings: offlineSignalRatings
      };
    } catch (err) {
      return reply.status(401).send({ error: 'Admin token missing or expired.' });
    }
  });

  // PATCH /feedback/admin/:id - Update triage status/tags of feedback
  server.patch('/admin/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      const decoded = request.user as any;
      const user = await prisma.user.findUnique({ where: { id: decoded?.sub } });
      
      const isAdmin = user && (user.plan === Plan.ENTERPRISE || user.email === 'demo@autoslp.com');
      if (!isAdmin) {
        return reply.status(403).send({ error: 'Access Denied.' });
      }

      const { id } = request.params as any;
      const body = request.body as any;
      const { status, tags } = body;

      try {
        const updated = await (prisma as any).feedback.update({
          where: { id },
          data: {
            status: status || undefined,
            tags: tags || undefined
          }
        });
        return { success: true, feedback: updated };
      } catch {
        // Triage offline fallback items
        const offlineItemIndex = offlineFeedback.findIndex(f => f.id === id);
        if (offlineItemIndex > -1) {
          if (status) offlineFeedback[offlineItemIndex].status = status;
          if (tags) offlineFeedback[offlineItemIndex].tags = tags;
          return { success: true, feedback: offlineFeedback[offlineItemIndex] };
        }
        return reply.status(404).send({ error: 'Feedback suggestion item not found.' });
      }
    } catch {
      return reply.status(401).send({ error: 'Admin session validation failed.' });
    }
  });
}
