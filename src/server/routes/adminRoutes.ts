// SCIP Backend - Administrative & Governance Routes

import { Router, Response } from 'express';
import { db } from '../../database/index.js';
import { authenticate, AuthenticatedRequest, requirePermission, requireRole } from '../middleware/auth.js';

const router = Router();

function maskIp(ip: unknown): string {
  if (typeof ip !== 'string' || !ip.trim()) return 'unknown';
  const v = ip.trim();
  const v4 = v.match(/^(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (v4) { const parts = v.split('.'); parts[3] = '0'; return parts.join('.'); }
  const mapped = v.match(/^(.*:ffff:)(\d{1,3}(?:\.\d{1,3}){3})$/i);
  if (mapped) { const parts = mapped[2].split('.'); parts[3] = '0'; return `${mapped[1]}${parts.join('.')}`; }
  if (v.includes(':')) { const segs = v.split(':'); if (segs.length > 1) { segs[segs.length - 1] = '0'; return segs.join(':'); } }
  return 'redacted';
}

function auditDetailCode(action: unknown): string {
  if (typeof action !== 'string' || !action.trim()) return 'AUDIT_UNKNOWN';
  return `AUDIT_${action.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`;
}

function redactAuditDetails(details: unknown): string {
  let s = typeof details === 'string' ? details : '';
  if (!s) return '';
  s = s.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]');
  s = s.replace(/\bBearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [redacted-token]');
  s = s.replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, '[redacted-token]');
  s = s.replace(/"[^"]{40,}"/g, '"[redacted]"');
  s = s.replace(/\b(?:\+?\d[\d\s().-]{7,}\d)\b/g, '[redacted-phone]');
  s = s.replace(/\b(Notes|Reason|note|reason)\s*:\s*.+$/i, '$1: [redacted]');
  if (s.length > 240) s = s.slice(0, 237) + '...';
  return s;
}

router.get('/users', authenticate, requirePermission('user.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const isAdmin = req.user?.role === 'admin';
  const rawUsers = await db.getUsers();
  const users = rawUsers.map((u: any) => {
    const { passwordHash, sessionVersion, credentialsResetRequired, ...safe } = u;
    if (!isAdmin) { const { email, phone, ...reduced } = safe; return reduced; }
    return safe;
  });
  res.json({ success: true, data: users, meta: { total: users.length } });
});

router.put('/users/:id/role', authenticate, requirePermission('admin.manage'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { role } = req.body || {};
    const allowedRoles = ['citizen', 'officer', 'dept_officer', 'analyst', 'authority', 'admin'];
    if (typeof role !== 'string' || !allowedRoles.includes(role)) { res.status(400).json({ success: false, message: 'Invalid role.' }); return; }
    if (req.params.id === req.user!.id) { res.status(400).json({ success: false, message: 'Administrators cannot change their own role.' }); return; }
    const updated = await db.updateUserRole(req.params.id, role as any, req.user!);
    res.json({ success: true, message: `User role updated to ${role}.`, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message });
  }
});

router.put('/users/:id/status', authenticate, requirePermission('admin.manage'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.body || {};
    if (status !== 'active' && status !== 'suspended') { res.status(400).json({ success: false, message: 'Status must be "active" or "suspended".' }); return; }
    if (req.params.id === req.user!.id && status === 'suspended') { res.status(400).json({ success: false, message: 'Administrators cannot suspend their own account.' }); return; }
    const updated = await db.updateUserStatus(req.params.id, status, req.user!);
    res.json({ success: true, message: `User account status updated to ${status}.`, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message });
  }
});

router.get('/departments', authenticate, requirePermission('user.read'), async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  const depts = await db.getDepartments();
  res.json({ success: true, data: depts });
});

router.get('/audit-logs', authenticate, requirePermission('audit.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { module, action, userId, limit } = req.query;
  const safeStr = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);
  const parsedLimit = Number(limit);
  const maxItems = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(Math.floor(parsedLimit), 500) : 500;
  const rawLogs = await db.getAuditLogs({ module: safeStr(module, 64), action: safeStr(action, 64), userId: safeStr(userId, 64) });
  const logs = rawLogs.slice(0, maxItems).map((log: any) => {
    const { hash, prevHash, metadata, ipAddress, details, action: act, ...safe } = log;
    return {
      ...safe,
      action: act,
      detailCode: auditDetailCode(act),
      ipAddress: maskIp(ipAddress),
      userEmail: typeof log.userEmail === 'string' ? log.userEmail : safe.userEmail,
      details: redactAuditDetails(details)
    };
  });
  res.json({ success: true, data: logs, meta: { returned: logs.length, cappedAt: maxItems } });
});

router.get('/audit-verify', authenticate, requirePermission('audit.read'), async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  const check = await db.verifyAuditIntegrity();
  res.json({ success: true, data: check });
});

router.get('/system-stats', authenticate, requireRole(['authority', 'admin']), async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  const mem = process.memoryUsage();
  const [users, reports, incidents, auditLogs] = await Promise.all([db.getUsers(), db.getReports(), db.getIncidents(), db.getAuditLogs()]);
  res.json({
    success: true,
    data: {
      nodeVersion: process.version,
      platform: process.platform,
      uptimeSeconds: Math.floor(process.uptime()),
      memory: { heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024), heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024), rssMB: Math.round(mem.rss / 1024 / 1024) },
      database: { status: 'CONNECTED_IN_MEMORY_PERSISTED', usersCount: users.length, reportsCount: reports.length, incidentsCount: incidents.length, auditLogsCount: auditLogs.length }
    }
  });
});

export default router;