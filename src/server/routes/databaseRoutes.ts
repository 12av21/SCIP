// SCIP Backend - Database Storage & Integrity Management Routes (Phase 7)
// These endpoints expose database storage monitoring, data integrity validation,
// and maintenance operations. Access is restricted to authority and admin roles.
// Backup/restore/prune operations remain under /api/admin for parity with existing
// admin surface; this route focuses on read-only monitoring plus health reporting.

import { Router, Response } from 'express';
import { db } from '../../database/index.js';
import { authenticate, AuthenticatedRequest, requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/database/storage - storage size and record counts
router.get('/storage', authenticate, requireRole(['authority', 'admin']), async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const storage = await db.getStorageInfo();
    await db.logAudit({
      action: 'SECURITY_EVENT',
      module: 'security',
      userId: _req.user!.id,
      userEmail: _req.user!.email,
      userRole: _req.user!.role,
      ipAddress: _req.ip || '127.0.0.1',
      details: `Database storage info viewed (size:${storage.storageSizeBytes} bytes)`
    });
    res.json({ success: true, data: storage });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve database storage info.', errors: [process.env.NODE_ENV === 'production' ? 'Storage info failed.' : err.message] });
  }
});

// GET /api/database/integrity - validate data integrity (audit chain, orphans, duplicates)
router.get('/integrity', authenticate, requireRole(['authority', 'admin']), async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const integrity = await db.validateDataIntegrity();
    await db.logAudit({
      action: 'SECURITY_EVENT',
      module: 'security',
      userId: _req.user!.id,
      userEmail: _req.user!.email,
      userRole: _req.user!.role,
      ipAddress: _req.ip || '127.0.0.1',
      details: `Database integrity validated (valid:${integrity.auditChainValid} issues:${integrity.issues.length})`
    });
    res.json({ success: true, data: integrity });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Data integrity validation failed.', errors: [process.env.NODE_ENV === 'production' ? 'Integrity check failed.' : err.message] });
  }
});

// GET /api/database/health - combined database health snapshot
router.get('/health', authenticate, requireRole(['authority', 'admin']), async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const [storage, integrity] = await Promise.all([db.getStorageInfo(), db.validateDataIntegrity()]);
    const recordCounts = storage.recordCounts as Record<string, number>;
    const totalRecords = Object.values(recordCounts).reduce((sum: number, c: number) => sum + c, 0);
    const healthy = integrity.auditChainValid && integrity.orphanedAnalyses === 0 && integrity.duplicateReportIds === 0;
    const health = {
      status: healthy ? 'OK' : 'DEGRADED',
      storageExists: storage.storageExists,
      storageSizeMB: storage.storageSizeMB,
      storageFile: storage.storageFile,
      lastPersistedAt: storage.lastPersistedAt,
      totalRecords,
      auditChainValid: integrity.auditChainValid,
      orphanedAnalyses: integrity.orphanedAnalyses,
      duplicateReportIds: integrity.duplicateReportIds,
      issuesCount: integrity.issues.length,
      uptimeSeconds: Math.floor(process.uptime()),
      memory: {
        heapUsedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      }
    };
    await db.logAudit({
      action: 'SECURITY_EVENT',
      module: 'security',
      userId: _req.user!.id,
      userEmail: _req.user!.email,
      userRole: _req.user!.role,
      ipAddress: _req.ip || '127.0.0.1',
      details: `Database health viewed (status:${health.status} records:${totalRecords})`
    });
    res.json({ success: true, data: health });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Database health check failed.', errors: [process.env.NODE_ENV === 'production' ? 'Health check failed.' : err.message] });
  }
});

export default router;
