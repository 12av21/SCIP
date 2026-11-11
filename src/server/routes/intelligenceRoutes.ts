// SCIP Backend - Intelligence & Analytical Pipelines Routes

import { Router, Response } from 'express';
import { db } from '../../database/scipDatabase.js';
import { authenticate, AuthenticatedRequest, requirePermission } from '../middleware/auth.js';
import { SCIPIntelligenceAgent } from '../../ai/scipAgent.js';
import { detectIncidentClusters } from '../../ai/incidentClustering.js';
import { Incident, Report } from '../../types/scip.js';

const router = Router();

function canAccessIncident(user: { role: string; id: string; departmentId?: string }, incident: Incident): boolean {
  if (user.role === 'citizen') {
    return incident.reportIds.some(rid => {
      const r = db.getReportById(rid);
      return r?.citizenId === user.id;
    });
  }
  if (user.role === 'officer' || user.role === 'dept_officer') {
    return Boolean(user.departmentId && incident.assignedDepartmentId === user.departmentId);
  }
  return true; // analyst, authority, admin
}

function filterIncidentsForUser(user: any): Incident[] {
  const all = db.getIncidents();
  return all.filter(i => canAccessIncident(user, i));
}

function filterReportsForUser(user: any): Report[] {
  const all = db.getReports();
  if (user.role === 'citizen') return all.filter(r => r.citizenId === user.id);
  if (user.role === 'officer' || user.role === 'dept_officer') {
    if (!user.departmentId) return [];
    return all.filter(r => {
      if (!r.incidentId) return false;
      const inc = db.getIncidentById(r.incidentId);
      return inc?.assignedDepartmentId === user.departmentId;
    });
  }
  return all;
}

function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? '' : String(value);
  // Neutralize CSV formula injection in spreadsheet clients
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  s = s.replace(/"/g, '""');
  return `"${s}"`;
}

// Helper to instantiate agent with active database snapshot (scoped)
function getAgentInstance(user: any): SCIPIntelligenceAgent {
  const reports = filterReportsForUser(user);
  const incidents = filterIncidentsForUser(user);
  return new SCIPIntelligenceAgent({ reports, incidents });
}

// POST /api/intelligence/agent
// Executes multi-tool intelligence request with transparency & uncertainty disclaimers
router.post(
  '/agent',
  authenticate,
  requirePermission('intelligence.read'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const { query, specificTool } = req.body || {};
      if (typeof query !== 'string' || !query.trim() || query.length > 2000) {
        res.status(400).json({
          success: false,
          message: 'An intelligence query or intent prompt is required (max 2000 characters).'
        });
        return;
      }
      if (specificTool !== undefined && typeof specificTool !== 'string') {
        res.status(400).json({ success: false, message: 'specificTool must be a string.' });
        return;
      }

      const agent = getAgentInstance(req.user);
      const briefing = agent.executeIntelligenceQuery(query.trim(), typeof specificTool === 'string' ? specificTool.trim() : undefined);

      res.json({
        success: true,
        data: briefing
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: 'Agent execution failed.',
        errors: [process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message]
      });
    }
  }
);

// GET /api/intelligence/clusters
// Runs Spatio-Temporal DBSCAN clustering across reports
router.get(
  '/clusters',
  authenticate,
  requirePermission('intelligence.read'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const reports = filterReportsForUser(req.user!);
      const clusters = detectIncidentClusters(reports);

      res.json({
        success: true,
        data: clusters,
        meta: {
          totalClusters: clusters.length,
          clusteredReportsCount: clusters.reduce((acc, c) => acc + c.reportCount, 0)
        }
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to compute incident clusters.',
        errors: [process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message]
      });
    }
  }
);

// GET /api/intelligence/hotspots
router.get(
  '/hotspots',
  authenticate,
  requirePermission('intelligence.read'),
  (req: AuthenticatedRequest, res: Response): void => {
    const reports = filterReportsForUser(req.user!);

    // Group reports by primary location or geo-bins
    const locationMap = new Map<string, { count: number; lat: number; lng: number; categories: Set<string>; reports: string[] }>();

    for (const r of reports) {
      const key = r.locationName;
      const existing = locationMap.get(key) || {
        count: 0,
        lat: r.latitude,
        lng: r.longitude,
        categories: new Set(),
        reports: []
      };
      existing.count += 1;
      existing.categories.add(r.category);
      existing.reports.push(r.id);
      locationMap.set(key, existing);
    }

    const hotspots = Array.from(locationMap.entries()).map(([location, data]) => ({
      location,
      latitude: data.lat,
      longitude: data.lng,
      reportCount: data.count,
      categories: Array.from(data.categories),
      densityIndex: Math.min(100, data.count * 20),
      isHighRisk: data.count >= 3
    })).sort((a, b) => b.reportCount - a.reportCount);

    res.json({
      success: true,
      data: hotspots
    });
  }
);

// GET /api/intelligence/trends
router.get(
  '/trends',
  authenticate,
  requirePermission('analytics.read'),
  (req: AuthenticatedRequest, res: Response): void => {
    const reports = filterReportsForUser(req.user!);
    const incidents = filterIncidentsForUser(req.user!);

    // Category breakdown
    const categoryCounts: Record<string, number> = {};
    for (const r of reports) {
      categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1;
    }

    // Status breakdown
    const statusCounts: Record<string, number> = {};
    for (const r of reports) {
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    }

    // Daily volume
    const dailyVolume: Record<string, number> = {};
    for (const r of reports) {
      const dateKey = r.createdAt.split('T')[0];
      dailyVolume[dateKey] = (dailyVolume[dateKey] || 0) + 1;
    }

    // Incident status breakdown
    const incidentStatusCounts: Record<string, number> = {};
    for (const i of incidents) {
      incidentStatusCounts[i.status] = (incidentStatusCounts[i.status] || 0) + 1;
    }

    res.json({
      success: true,
      data: {
        totalReports: reports.length,
        totalIncidents: incidents.length,
        activeIncidents: incidents.filter(i => i.status !== 'resolved' && i.status !== 'closed' && i.status !== 'dismissed').length,
        potentialIncidents: incidents.filter(i => i.status === 'potential').length,
        categoryCounts,
        statusCounts,
        dailyVolume,
        incidentStatusCounts
      }
    });
  }
);

// GET /api/intelligence/model-metrics - Real evaluated model metrics
router.get(
  '/model-metrics',
  authenticate,
  requirePermission('model.evaluate'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const metrics = db.evaluateClassifier();
      res.json({
        success: true,
        data: metrics
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to compute model evaluation metrics.',
        errors: [process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message]
      });
    }
  }
);

// GET /api/intelligence/dataset-quality - Real dataset quality audit
router.get(
  '/dataset-quality',
  authenticate,
  requirePermission('analytics.read'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const quality = db.getDatasetQuality();
      res.json({
        success: true,
        data: quality
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to compute dataset quality audit.',
        errors: [process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message]
      });
    }
  }
);

// GET /api/intelligence/export-csv - Authorized CSV data export (scoped, PII-minimized, formula-safe)
router.get(
  '/export-csv',
  authenticate,
  requirePermission('data.export'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const rawType = req.query.type;
      if (rawType !== undefined) {
        if (typeof rawType !== 'string' || (rawType !== 'reports' && rawType !== 'incidents')) {
          res.status(400).json({ success: false, message: 'Export type must be "reports" or "incidents".' });
          return;
        }
      }
      const type: 'reports' | 'incidents' = rawType === 'incidents' ? 'incidents' : 'reports';

      if (type === 'incidents') {
        const incidents = filterIncidentsForUser(req.user!);
        const header = 'ID,Title,Category,Status,Severity,Priority,Confidence,Latitude,Longitude,AssignedDept,AssignedOfficer,CreatedAt\n';
        const rows = incidents.map(i => [
          csvCell(i.id), csvCell(i.title), csvCell(i.category), csvCell(i.status), csvCell(i.severity), csvCell(i.priority),
          csvCell(i.confidence), csvCell(i.latitude), csvCell(i.longitude), csvCell(i.assignedDepartmentName || ''),
          csvCell(i.assignedOfficerName || ''), csvCell(i.createdAt)
        ].join(',')).join('\n');

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="scip-incidents-export.csv"');
        res.send(header + rows);
        return;
      }

      const reports = filterReportsForUser(req.user!);
      const includePII = req.user!.role !== 'analyst';
      const header = includePII
        ? 'ID,Title,Category,Subcategory,Location,Latitude,Longitude,Status,Urgency,CitizenName,CreatedAt\n'
        : 'ID,Title,Category,Subcategory,Location,Latitude,Longitude,Status,Urgency,CreatedAt\n';
      const rows = reports.map(r => {
        const base = [
          csvCell(r.id), csvCell(r.title), csvCell(r.category), csvCell(r.subcategory || ''),
          csvCell(r.locationName), csvCell(r.latitude), csvCell(r.longitude), csvCell(r.status), csvCell(r.urgency)
        ];
        if (includePII) base.push(csvCell(r.citizenName));
        base.push(csvCell(r.createdAt));
        return base.join(',');
      }).join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="scip-reports-export.csv"');
      res.send(header + rows);
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Failed to export CSV.', errors: ['Export failed.'] });
    }
  }
);

export default router;




