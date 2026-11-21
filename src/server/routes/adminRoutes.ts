// SCIP Backend - Administrative & Governance Routes

import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../../database/index.js';
import { SCIPDatabase } from '../../database/scipDatabase.js';
import { authenticate, AuthenticatedRequest, requirePermission, requireRole } from '../middleware/auth.js';
import { UserRole } from '../../types/scip.js';
const router = Router();

function sanitizeAuthUser(user: any) {
  if (!user) return user;
  const { passwordHash, sessionVersion, credentialsResetRequired, ...safe } = user;
  return safe;
}

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

// Admin-only privileged member registration. Public /api/auth/register always yields citizen.
router.post('/users', authenticate, requirePermission('admin.manage'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, email, password, role, phone, departmentId } = req.body || {};
    if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({ success: false, message: 'Name, email, and password are required.', errors: ['Missing required fields.'] }); return;
    }
    const safeName = name.trim();
    const safeEmail = email.trim().toLowerCase();
    if (!safeName || !safeEmail || !password) { res.status(400).json({ success: false, message: 'Name, email, and password are required.', errors: ['Missing required fields.'] }); return; }
    if (safeName.length > 100) { res.status(400).json({ success: false, message: 'Name must be 100 characters or fewer.', errors: ['Invalid name.'] }); return; }
    if (phone !== undefined && (typeof phone !== 'string' || phone.trim().length > 30)) { res.status(400).json({ success: false, message: 'Phone must be 30 characters or fewer.', errors: ['Invalid phone.'] }); return; }
    if (password.length < 8 || password.length > 128) { res.status(400).json({ success: false, message: 'Password must be 8-128 characters in length.', errors: ['Weak password.'] }); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(safeEmail) || safeEmail.length > 254) { res.status(400).json({ success: false, message: 'Please provide a valid email address.', errors: ['Invalid email format.'] }); return; }
    const allowedRoles: UserRole[] = ['citizen', 'officer', 'dept_officer', 'analyst', 'authority', 'admin'];
    const requestedRole = typeof role === 'string' ? role : 'citizen';
    if (!allowedRoles.includes(requestedRole as any)) { res.status(400).json({ success: false, message: 'Invalid role.', errors: ['Role must be one of: ' + allowedRoles.join(', ')] }); return; }
    if (departmentId !== undefined && (typeof departmentId !== 'string' || departmentId.trim().length > 64)) { res.status(400).json({ success: false, message: 'Invalid department id.', errors: ['Invalid departmentId.'] }); return; }
    const existing = await db.getUserByEmailWithPassword(safeEmail);
    if (existing) { res.status(409).json({ success: false, message: 'An account with this email address already exists.', errors: ['Duplicate email.'] }); return; }
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const newUser = await db.createUser({
      name: safeName, email: safeEmail, passwordHash, role: requestedRole as UserRole,
      phone: typeof phone === 'string' ? phone.trim() : undefined,
      departmentId: typeof departmentId === 'string' ? departmentId.trim() : undefined,
      status: 'active', sessionVersion: 0, credentialsResetRequired: false
    } as any);
    await db.logAudit({
      action: 'PRIVILEGED_MEMBER_REGISTERED', module: 'admin', userId: newUser.id, userEmail: newUser.email,
      userRole: newUser.role, ipAddress: req.ip || '127.0.0.1',
      details: `Privileged member registered with role '${newUser.role}' by admin ${req.user!.email}`
    });
    res.status(201).json({ success: true, message: 'Privileged member registered successfully.', data: sanitizeAuthUser(newUser) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to register privileged member.', errors: [process.env.NODE_ENV === 'production' ? 'Registration failed.' : err.message] });
  }
});

// --- Backup / Restore (admin only) ---

router.post('/backup', authenticate, requirePermission('admin.manage'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { backupDir } = req.body || {};
    const result = await db.createBackup(typeof backupDir === 'string' ? backupDir : undefined);
    await db.logAudit({
      action: 'SECURITY_EVENT', module: 'security',
      userId: req.user!.id, userEmail: req.user!.email, userRole: req.user!.role,
      ipAddress: req.ip || '127.0.0.1',
      details: `Database backup created: ${result.backupFile} (${result.recordCount} records)`
    });
    res.json({
      success: true,
      message: 'Database backup created successfully.',
      data: { backupFile: result.backupFile, recordCount: result.recordCount, savedAt: result.savedAt }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Backup failed.', errors: [process.env.NODE_ENV === 'production' ? 'Backup failed.' : err.message] });
  }
});

router.get('/backups', authenticate, requirePermission('admin.manage'), async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { backupDir } = _req.query;
    const backups = await db.listBackups(typeof backupDir === 'string' ? backupDir : undefined);
    res.json({ success: true, data: backups, meta: { total: backups.length } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to list backups.', errors: [process.env.NODE_ENV === 'production' ? 'Backup list failed.' : err.message] });
  }
});

router.delete('/backups/prune', authenticate, requirePermission('admin.manage'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { retentionCount, backupDir } = req.body || {};
    const parsed = Number(retentionCount);
    if (!Number.isFinite(parsed) || parsed < 1) {
      res.status(400).json({ success: false, message: 'retentionCount must be a positive integer.' }); return;
    }
    const result = await db.pruneBackups(parsed, typeof backupDir === 'string' ? backupDir : undefined);
    res.json({ success: true, message: `Pruned ${result.pruned} old backups.`, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Prune failed.', errors: [process.env.NODE_ENV === 'production' ? 'Prune failed.' : err.message] });
  }
});

router.post('/restore-rehearsal', authenticate, requirePermission('admin.manage'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { backupFile } = req.body || {};
    if (typeof backupFile !== 'string' || !backupFile.trim()) {
      res.status(400).json({ success: false, message: 'backupFile is required.' }); return;
    }
    // Restore into an isolated in-memory instance for verification only; does not modify active DB.
    const restored = await db.restoreFromBackup(backupFile.trim());
    const counts = {
      users: restored.getUsers ? restored.getUsers().length : 0,
      reports: restored.getReports ? restored.getReports().length : 0,
      incidents: restored.getIncidents ? restored.getIncidents().length : 0,
      auditLogs: restored.getAuditLogs ? restored.getAuditLogs().length : 0,
      ipSecurityLogs: restored.getIPSecurityLogs ? restored.getIPSecurityLogs().length : 0,
    };
    await db.logAudit({
      action: 'SECURITY_EVENT', module: 'security',
      userId: req.user!.id, userEmail: req.user!.email, userRole: req.user!.role,
      ipAddress: req.ip || '127.0.0.1',
      details: `Restore rehearsal verified from backup: ${backupFile} (users:${counts.users} reports:${counts.reports} incidents:${counts.incidents})`
    });
    res.json({
      success: true,
      message: 'Restore rehearsal verified successfully (isolated, active DB unchanged).',
      data: { backupFile, restoredCounts: counts }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Restore rehearsal failed.', errors: [process.env.NODE_ENV === 'production' ? 'Restore rehearsal failed.' : err.message] });
  }
});

export default router;