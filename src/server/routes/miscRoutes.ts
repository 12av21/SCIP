// SCIP Backend - Miscellaneous & Verification Test Routes

import { Router, Response } from 'express';
import { db } from '../../database/scipDatabase.js';
import { authenticate, AuthenticatedRequest, hasPermission } from '../middleware/auth.js';
import { preprocessText } from '../../ai/preprocessor.js';
import { globalVectorizer } from '../../ai/tfidf.js';
import { findSimilarAndDuplicateReports, calculateHaversineDistance } from '../../ai/duplicateDetector.js';
import { detectIncidentClusters } from '../../ai/incidentClustering.js';
import { computeExplainableRisk } from '../../ai/riskScorer.js';
import { SCIPIntelligenceAgent } from '../../ai/scipAgent.js';

const router = Router();

// GET /api/health
router.get('/health', (req, res: Response): void => {
  res.json({
    status: 'healthy',
    platform: 'Smart Community Intelligence Platform (SCIP)',
    version: '1.0.0-enterprise',
    timestamp: new Date().toISOString(),
    services: {
      api: 'operational',
      database: 'connected',
      aiPipeline: 'ready',
      clusteringEngine: 'ready'
    }
  });
});

// GET /api/notifications
router.get('/notifications', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  const notifs = db.getNotificationsForUser(req.user!.id);
  res.json({
    success: true,
    data: notifs,
    unreadCount: notifs.filter(n => !n.read).length
  });
});

// PUT /api/notifications/:id/read
router.put('/notifications/:id/read', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
  if (!id || id.length > 64) {
    res.status(400).json({ success: false, message: 'Invalid notification ID.' });
    return;
  }
  db.markNotificationAsRead(id, req.user!.id);
  res.json({ success: true, message: 'Notification marked as read.' });
});

// POST /api/notifications/read-all
router.post('/notifications/read-all', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  db.markAllNotificationsAsRead(req.user!.id);
  res.json({ success: true, message: 'All notifications marked as read.' });
});

// POST /api/feedback
router.post('/feedback', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  const { reportId, incidentId, rating, comments } = req.body || {};
  const r = Number(rating);
  if (!Number.isFinite(r) || r < 1 || r > 5) {
    res.status(400).json({ success: false, message: 'Rating must be between 1 and 5.' });
    return;
  }
  if (reportId !== undefined && typeof reportId !== 'string') {
    res.status(400).json({ success: false, message: 'Invalid report ID.' });
    return;
  }
  if (incidentId !== undefined && typeof incidentId !== 'string') {
    res.status(400).json({ success: false, message: 'Invalid incident ID.' });
    return;
  }
  // Citizens may only submit feedback for their own reports/incidents (if provided)
  if (req.user?.role === 'citizen') {
    if (reportId) {
      const rep = db.getReportById(reportId);
      if (!rep || rep.citizenId !== req.user.id) {
        res.status(403).json({ success: false, message: 'Forbidden.' });
        return;
      }
    }
    if (incidentId) {
      const inc = db.getIncidentById(incidentId);
      if (!inc) { res.status(404).json({ success: false, message: 'Incident not found.' }); return; }
      const owns = inc.reportIds.some(id => db.getReportById(id)?.citizenId === req.user!.id);
      if (!owns) { res.status(403).json({ success: false, message: 'Forbidden.' }); return; }
    }
  }
  const fb = db.submitFeedback({
    reportId: typeof reportId === 'string' ? reportId : undefined,
    incidentId: typeof incidentId === 'string' ? incidentId : undefined,
    userId: req.user!.id,
    userName: req.user!.name,
    rating: Math.round(r),
    comments: typeof comments === 'string' ? comments.trim().slice(0, 2000) : ''
  });
  res.status(201).json({ success: true, message: 'Feedback submitted successfully.', data: fb });
});

// POST /api/seed - DANGEROUS: disabled in production; development-only with explicit opt-in.
// Never resets/overwrites an existing persisted database.
router.post('/seed', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  const isProd = process.env.NODE_ENV === 'production';
  const devOptIn = process.env.ENABLE_DEV_SEED === 'true' && process.env.NODE_ENV !== 'production';
  if (isProd || !devOptIn) {
    res.status(403).json({
      success: false,
      message: 'Seeding is disabled. This endpoint is not available in production.',
      errors: ['Seed endpoint disabled.']
    });
    return;
  }
  if (req.user?.role !== 'admin') {
    res.status(403).json({ success: false, message: 'Administrator role required.' });
    return;
  }
  try {
    db.resetToSeedData();
    res.json({ success: true, message: 'Development seed completed (no existing persisted DB overwritten).' });
  } catch (err: any) {
    res.status(409).json({
      success: false,
      message: 'Seeding refused to protect existing data.',
      errors: [process.env.NODE_ENV === 'production' ? 'Seed refused.' : (err?.message || 'Seed refused.')]
    });
  }
});

// POST /api/tests/run
// Disabled: previous in-process suite mutated real application data. Replaced by isolated automated tests.
router.post('/tests/run', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  const isProd = process.env.NODE_ENV === 'production';
  const devOptIn = process.env.ENABLE_DEV_TESTS === 'true' && process.env.NODE_ENV !== 'production';
  if (isProd || !devOptIn || req.user?.role !== 'admin') {
    res.status(403).json({
      success: false,
      message: 'In-process test runner is disabled. Use the isolated automated test suite in a dedicated test environment.',
      errors: ['Test runner disabled.']
    });
    return;
  }
  // Even in opted-in development, refuse to run mutating checks against the active database.
  res.status(403).json({
    success: false,
    message: 'In-process test runner is disabled because it can mutate application data. Use isolated automated tests instead.',
    errors: ['Test runner disabled.']
  });
});

export default router;

