// SCIP Backend - Administrative & Governance Routes

import { Router, Response } from 'express';
import { db } from '../../database/scipDatabase.js';
import { authenticate, AuthenticatedRequest, requirePermission, requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/admin/users
router.get(
  '/users',
  authenticate,
  requirePermission('user.read'),
  (req: AuthenticatedRequest, res: Response): void => {
    const users = db.getUsers().map((u: any) => {
      // Minimize internal auth/session state exposure; never return credential material.
      const { passwordHash, sessionVersion, credentialsResetRequired, ...safe } = u;
      return safe;
    });
    res.json({
      success: true,
      data: users,
      meta: { total: users.length }
    });
  }
);

// PUT /api/admin/users/:id/role
router.put(
  '/users/:id/role',
  authenticate,
  requirePermission('admin.manage'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const { role } = req.body || {};
      const allowedRoles = ['citizen', 'officer', 'dept_officer', 'analyst', 'authority', 'admin'];
      if (typeof role !== 'string' || !allowedRoles.includes(role)) {
        res.status(400).json({ success: false, message: 'Invalid role.' });
        return;
      }
      if (req.params.id === req.user!.id) {
        res.status(400).json({ success: false, message: 'Administrators cannot change their own role.' });
        return;
      }

      const updated = db.updateUserRole(req.params.id, role as any, req.user!);
      res.json({
        success: true,
        message: `User role updated to ${role}.`,
        data: updated
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        message: process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message
      });
    }
  }
);

// PUT /api/admin/users/:id/status
router.put(
  '/users/:id/status',
  authenticate,
  requirePermission('admin.manage'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const { status } = req.body || {};
      if (status !== 'active' && status !== 'suspended') {
        res.status(400).json({ success: false, message: 'Status must be "active" or "suspended".' });
        return;
      }
      if (req.params.id === req.user!.id && status === 'suspended') {
        res.status(400).json({ success: false, message: 'Administrators cannot suspend their own account.' });
        return;
      }

      const updated = db.updateUserStatus(req.params.id, status, req.user!);
      res.json({
        success: true,
        message: `User account status updated to ${status}.`,
        data: updated
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        message: process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message
      });
    }
  }
);

// GET /api/admin/departments
router.get(
  '/departments',
  authenticate,
  requirePermission('user.read'),
  (req: AuthenticatedRequest, res: Response): void => {
    const depts = db.getDepartments();
    res.json({
      success: true,
      data: depts
    });
  }
);

// GET /api/admin/audit-logs
router.get(
  '/audit-logs',
  authenticate,
  requirePermission('audit.read'),
  (req: AuthenticatedRequest, res: Response): void => {
    const { module, action, userId, limit } = req.query;
    const safeStr = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);
    const safeModule = safeStr(module, 64);
    const safeAction = safeStr(action, 64);
    const safeUserId = safeStr(userId, 64);
    const parsedLimit = Number(limit);
    const maxItems = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(Math.floor(parsedLimit), 500) : 500;

    const logs = db.getAuditLogs({
      module: safeModule,
      action: safeAction,
      userId: safeUserId
    }).slice(0, maxItems).map((log: any) => {
      // Minimize exposure of cryptographic chain internals and free-form metadata in list responses.
      // Governance UI needs: id, timestamp, action, module, userEmail, details, ipAddress, userId/userRole/recordId.
      const { hash, prevHash, metadata, ...safe } = log;
      return safe;
    });

    res.json({
      success: true,
      data: logs,
      meta: { returned: logs.length, cappedAt: maxItems }
    });
  }
);

// GET /api/admin/audit-verify - Independent cryptographic audit chain validation
router.get(
  '/audit-verify',
  authenticate,
  requirePermission('audit.read'),
  (req: AuthenticatedRequest, res: Response): void => {
    const check = db.verifyAuditIntegrity();
    res.json({
      success: true,
      data: check
    });
  }
);

// GET /api/admin/system-stats
router.get(
  '/system-stats',
  authenticate,
  requireRole(['authority', 'admin']),
  (req: AuthenticatedRequest, res: Response): void => {
    const mem = process.memoryUsage();
    res.json({
      success: true,
      data: {
        nodeVersion: process.version,
        platform: process.platform,
        uptimeSeconds: Math.floor(process.uptime()),
        memory: {
          heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
          heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
          rssMB: Math.round(mem.rss / 1024 / 1024)
        },
        database: {
          status: 'CONNECTED_IN_MEMORY_PERSISTED',
          usersCount: db.getUsers().length,
          reportsCount: db.getReports().length,
          incidentsCount: db.getIncidents().length,
          auditLogsCount: db.getAuditLogs().length
        }
      }
    });
  }
);

export default router;




