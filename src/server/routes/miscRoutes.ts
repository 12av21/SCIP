// SCIP Backend - Miscellaneous & Verification Test Routes

import { Router, Response } from 'express';
import { db, getDatabaseRuntimeInfo } from '../../database/index.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { getMongoRuntimeStatus } from '../../database/mongoConnection.js';

const router = Router();

router.get('/health', (_req, res: Response): void => {
  const mongo = getMongoRuntimeStatus();
  const dbInfo = getDatabaseRuntimeInfo();
  res.json({
    status: 'healthy',
    platform: 'Smart Community Intelligence Platform (SCIP)',
    version: '1.0.0-enterprise',
    timestamp: new Date().toISOString(),
    services: { api: 'operational', database: 'operational', aiPipeline: 'ready', clusteringEngine: 'ready' },
    persistence: {
      active: dbInfo.activeDriver,
      requested: dbInfo.requestedDriver,
      runtimeIntegrated: dbInfo.runtimeIntegrated,
      mongoRepositoryIntegrated: dbInfo.mongoRepositoryIntegrated,
      diskPersisted: dbInfo.diskPersisted,
      fallbackReason: dbInfo.fallbackReason,
      mongo: {
        ...mongo,
        integrated: dbInfo.mongoRepositoryIntegrated,
        note: dbInfo.mongoRepositoryIntegrated
          ? 'MongoDB repository runtime active for isolated development target (explicit opt-in).'
          : 'MongoDB connectivity may be managed separately, but runtime data operations use the file-backed JSON engine unless explicit isolated runtime gates are satisfied.'
      }
    }
  });
});

router.get('/notifications', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const notifs = await db.getNotificationsForUser(req.user!.id);
  res.json({ success: true, data: notifs, unreadCount: notifs.filter((n: any) => !n.read).length });
});

router.put('/notifications/:id/read', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
  if (!id || id.length > 64) { res.status(400).json({ success: false, message: 'Invalid notification ID.' }); return; }
  await db.markNotificationAsRead(id, req.user!.id);
  res.json({ success: true, message: 'Notification marked as read.' });
});

router.post('/notifications/read-all', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  await db.markAllNotificationsAsRead(req.user!.id);
  res.json({ success: true, message: 'All notifications marked as read.' });
});

router.post('/feedback', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { reportId, incidentId, rating, comments } = req.body || {};
  const r = Number(rating);
  if (!Number.isFinite(r) || r < 1 || r > 5) { res.status(400).json({ success: false, message: 'Rating must be between 1 and 5.' }); return; }
  if (reportId !== undefined && typeof reportId !== 'string') { res.status(400).json({ success: false, message: 'Invalid report ID.' }); return; }
  if (incidentId !== undefined && typeof incidentId !== 'string') { res.status(400).json({ success: false, message: 'Invalid incident ID.' }); return; }
  if (req.user?.role === 'citizen') {
    if (reportId) {
      const rep = await db.getReportById(reportId);
      if (!rep || rep.citizenId !== req.user.id) { res.status(403).json({ success: false, message: 'Forbidden.' }); return; }
    }
    if (incidentId) {
      const inc = await db.getIncidentById(incidentId);
      if (!inc) { res.status(404).json({ success: false, message: 'Incident not found.' }); return; }
      let owns = false;
      for (const rid of inc.reportIds) {
        const rep = await db.getReportById(rid);
        if (rep?.citizenId === req.user!.id) { owns = true; break; }
      }
      if (!owns) { res.status(403).json({ success: false, message: 'Forbidden.' }); return; }
    }
  }
  const fb = await db.submitFeedback({
    reportId: typeof reportId === 'string' ? reportId : undefined,
    incidentId: typeof incidentId === 'string' ? incidentId : undefined,
    userId: req.user!.id,
    userName: req.user!.name,
    rating: Math.round(r),
    comments: typeof comments === 'string' ? comments.trim().slice(0, 2000) : ''
  });
  res.status(201).json({ success: true, message: 'Feedback submitted successfully.', data: fb });
});

router.post('/seed', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const isProd = process.env.NODE_ENV === 'production';
  const devOptIn = process.env.ENABLE_DEV_SEED === 'true' && process.env.NODE_ENV !== 'production';
  if (isProd || !devOptIn) { res.status(403).json({ success: false, message: 'Seeding is disabled. This endpoint is not available in production.', errors: ['Seed endpoint disabled.'] }); return; }
  if (req.user?.role !== 'admin') { res.status(403).json({ success: false, message: 'Administrator role required.' }); return; }
  try {
    await db.resetToSeedData();
    res.json({ success: true, message: 'Development seed completed (no existing persisted DB overwritten).' });
  } catch (err: any) {
    res.status(409).json({ success: false, message: 'Seeding refused to protect existing data.', errors: [process.env.NODE_ENV === 'production' ? 'Seed refused.' : (err?.message || 'Seed refused.')] });
  }
});

router.post('/tests/run', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const isProd = process.env.NODE_ENV === 'production';
  const devOptIn = process.env.ENABLE_DEV_TESTS === 'true' && process.env.NODE_ENV !== 'production';
  if (isProd || !devOptIn || req.user?.role !== 'admin') { res.status(403).json({ success: false, message: 'In-process test runner is disabled. Use the isolated automated test suite in a dedicated test environment.', errors: ['Test runner disabled.'] }); return; }
  res.status(403).json({ success: false, message: 'In-process test runner is disabled because it can mutate application data. Use isolated automated tests instead.', errors: ['Test runner disabled.'] });
});

export default router;