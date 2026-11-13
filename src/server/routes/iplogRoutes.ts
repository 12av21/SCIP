// SCIP Backend - IP Security Audit Log Routes
// Endpoints: /api/iplogs/*
// Restricted to authorized security administrators (admin role).

import { Router, Response } from 'express';
import { db } from '../../database/index.js';
import { authenticate, AuthenticatedRequest, requirePermission } from '../middleware/auth.js';
import { IPSecurityLog, AuthEventType } from '../../types/scip.js';

const router = Router();

// Helper to extract client IP respecting trusted proxies
function getClientIp(req: any): string {
  // Do not trust arbitrary X-Forwarded-For headers. Use req.ip (Express trust proxy setting controls this).
  // In production, configure app.set('trust proxy', ...) explicitly for the actual deployment environment.
  return req.ip || req.connection?.remoteAddress || 'unknown';
}

// GET /api/iplogs — admin only (iplog.read)
router.get('/', authenticate, requirePermission('iplog.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { userId, eventType, success, ipAddress, limit } = req.query;
  const filters: any = {};
  if (userId) filters.userId = String(userId);
  if (eventType === 'LOGIN_SUCCESS' || eventType === 'LOGIN_FAILED' || eventType === 'LOGOUT' ||
      eventType === 'REGISTER' || eventType === 'PASSWORD_CHANGED' || eventType === 'PASSWORD_RESET_REQUESTED' ||
      eventType === 'SESSION_REVOKED' || eventType === 'SUSPICIOUS_ACTIVITY' || eventType === 'RATE_LIMIT_HIT' ||
      eventType === 'UNAUTHORIZED_ACCESS_ATTEMPT') {
    filters.eventType = eventType;
  }
  if (success !== undefined) filters.success = success === 'true';
  if (ipAddress) filters.ipAddress = String(ipAddress);
  if (limit !== undefined) filters.limit = Number(limit);

  const logs = await db.getIPSecurityLogs(filters);
  // Never return raw metadata to API consumers unless authorized; keep response minimal
  res.json({
    success: true,
    data: logs.map(({ metadata, ...rest }) => rest),
    meta: { total: logs.length }
  });
});

// GET /api/iplogs/:id — admin only
router.get('/:id', authenticate, requirePermission('iplog.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const log = await db.getIPSecurityLogById(req.params.id);
  if (!log) {
    res.status(404).json({ success: false, message: 'IP security log entry not found.' });
    return;
  }
  const { metadata, ...rest } = log;
  res.json({ success: true, data: rest });
});

// POST /api/iplogs — internal/system use to record security events (admin manage or authenticated system)
// Used by auth middleware and route handlers to log login/auth events.
router.post('/', authenticate, requirePermission('iplog.manage'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { ipAddress, userId, userEmail, userRole, correlationId, method, endpoint, userAgent, eventType, success, details, metadata } = req.body || {};

    if (!ipAddress || typeof ipAddress !== 'string') {
      res.status(400).json({ success: false, message: 'ipAddress is required.' });
      return;
    }
    const validEventTypes: AuthEventType[] = [
      'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'REGISTER', 'PASSWORD_CHANGED',
      'PASSWORD_RESET_REQUESTED', 'SESSION_REVOKED', 'SUSPICIOUS_ACTIVITY', 'RATE_LIMIT_HIT',
      'UNAUTHORIZED_ACCESS_ATTEMPT'
    ];
    if (!eventType || !validEventTypes.includes(eventType)) {
      res.status(400).json({ success: false, message: 'Valid eventType is required.' });
      return;
    }
    if (!method || !endpoint) {
      res.status(400).json({ success: false, message: 'method and endpoint are required.' });
      return;
    }
    if (typeof success !== 'boolean') {
      res.status(400).json({ success: false, message: 'success must be a boolean.' });
      return;
    }

    const log = await db.createIPSecurityLog({
      ipAddress,
      userId,
      userEmail,
      userRole,
      correlationId,
      method: String(method),
      endpoint: String(endpoint),
      userAgent,
      eventType,
      success: Boolean(success),
      details: typeof details === 'string' ? details : undefined,
      metadata: metadata && typeof metadata === 'object' ? metadata : undefined
    });

    res.status(201).json({ success: true, data: log });
  } catch (err: any) {
    res.status(400).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message });
  }
});

// DELETE /api/iplogs/retention — admin only (iplog.manage)
// Deletes IP security logs older than N days per configurable retention policy.
router.delete('/retention', authenticate, requirePermission('iplog.manage'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { days } = req.body || {};
    const parsedDays = Number(days);
    if (!Number.isFinite(parsedDays) || parsedDays < 1 || parsedDays > 3650) {
      res.status(400).json({ success: false, message: 'days must be a number between 1 and 3650.' });
      return;
    }
    const deletedCount = await db.deleteIPSecurityLogsOlderThan(parsedDays, req.user!);
    res.json({ success: true, message: `Deleted ${deletedCount} IP security log entries older than ${parsedDays} days.`, data: { deletedCount } });
  } catch (err: any) {
    res.status(400).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message });
  }
});

export default router;
