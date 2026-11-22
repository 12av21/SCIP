// SCIP Backend - Intelligence & Analytical Pipelines Routes

import { Router, Response } from 'express';
import { db } from '../../database/index.js';
import { authenticate, AuthenticatedRequest, requirePermission } from '../middleware/auth.js';
import { SCIPIntelligenceAgent } from '../../ai/scipAgent.js';
import { detectIncidentClusters } from '../../ai/incidentClustering.js';
import {
  generateCitizenResponse,
  generateFieldOfficerBriefing,
  generateDepartmentOfficerIntelligence,
  generateAnalystIntelligence,
  generateAuthoritySummary,
  generateAdminAIHealth
} from '../../ai/responseGenerator.js';
import { Incident, Report, Department, User, SpatioTemporalCluster } from '../../types/scip.js';

const router = Router();

async function canAccessIncident(user: { role: string; id: string; departmentId?: string }, incident: Incident): Promise<boolean> {
  if (user.role === 'citizen') {
    for (const rid of incident.reportIds) {
      const r = await db.getReportById(rid);
      if (r?.citizenId === user.id) return true;
    }
    return false;
  }
  if (user.role === 'officer' || user.role === 'dept_officer') {
    return Boolean(user.departmentId && incident.assignedDepartmentId === user.departmentId);
  }
  return true;
}

async function filterIncidentsForUser(user: any): Promise<Incident[]> {
  const all = await db.getIncidents();
  const out: Incident[] = [];
  for (const i of all) {
    if (await canAccessIncident(user, i)) out.push(i);
  }
  return out;
}

async function filterReportsForUser(user: any): Promise<Report[]> {
  const all = await db.getReports();
  if (user.role === 'citizen') return all.filter(r => r.citizenId === user.id);
  if (user.role === 'officer' || user.role === 'dept_officer') {
    if (!user.departmentId) return [];
    const out: Report[] = [];
    for (const r of all) {
      if (!r.incidentId) continue;
      const inc = await db.getIncidentById(r.incidentId);
      if (inc?.assignedDepartmentId === user.departmentId) out.push(r);
    }
    return out;
  }
  return all;
}

function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  s = s.replace(/"/g, '""');
  return `"${s}"`;
}

async function getAgentInstance(user: any): Promise<SCIPIntelligenceAgent> {
  const reports = await filterReportsForUser(user);
  const incidents = await filterIncidentsForUser(user);
  return new SCIPIntelligenceAgent({ reports, incidents });
}

router.post('/agent', authenticate, requirePermission('intelligence.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { query, specificTool } = req.body || {};
    if (typeof query !== 'string' || !query.trim() || query.length > 2000) {
      res.status(400).json({ success: false, message: 'An intelligence query or intent prompt is required (max 2000 characters).' });
      return;
    }
    if (specificTool !== undefined && typeof specificTool !== 'string') {
      res.status(400).json({ success: false, message: 'specificTool must be a string.' });
      return;
    }
    const agent = await getAgentInstance(req.user);
    const briefing = agent.executeIntelligenceQuery(query.trim(), typeof specificTool === 'string' ? specificTool.trim() : undefined);
    res.json({ success: true, data: briefing });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Agent execution failed.', errors: [process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message] });
  }
});

router.get('/clusters', authenticate, requirePermission('intelligence.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const reports = await filterReportsForUser(req.user!);
    const clusters = detectIncidentClusters(reports);
    res.json({ success: true, data: clusters, meta: { totalClusters: clusters.length, clusteredReportsCount: clusters.reduce((acc, c) => acc + c.reportCount, 0) } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to compute incident clusters.', errors: [process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message] });
  }
});

router.get('/hotspots', authenticate, requirePermission('intelligence.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const reports = await filterReportsForUser(req.user!);
  const locationMap = new Map<string, { count: number; lat: number; lng: number; categories: Set<string>; reports: string[] }>();
  for (const r of reports) {
    const key = r.locationName;
    const existing = locationMap.get(key) || { count: 0, lat: r.latitude, lng: r.longitude, categories: new Set(), reports: [] };
    existing.count += 1;
    existing.categories.add(r.category);
    existing.reports.push(r.id);
    locationMap.set(key, existing);
  }
  const hotspots = Array.from(locationMap.entries()).map(([location, data]) => ({
    location, latitude: data.lat, longitude: data.lng, reportCount: data.count,
    categories: Array.from(data.categories), densityIndex: Math.min(100, data.count * 20), isHighRisk: data.count >= 3
  })).sort((a, b) => b.reportCount - a.reportCount);
  res.json({ success: true, data: hotspots });
});

router.get('/trends', authenticate, requirePermission('analytics.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const reports = await filterReportsForUser(req.user!);
  const incidents = await filterIncidentsForUser(req.user!);
  const categoryCounts: Record<string, number> = {};
  const statusCounts: Record<string, number> = {};
  const dailyVolume: Record<string, number> = {};
  for (const r of reports) {
    categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1;
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    const dateKey = r.createdAt.split('T')[0];
    dailyVolume[dateKey] = (dailyVolume[dateKey] || 0) + 1;
  }
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
      categoryCounts, statusCounts, dailyVolume, incidentStatusCounts
    }
  });
});

router.get('/model-metrics', authenticate, requirePermission('model.evaluate'), async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const metrics = await db.evaluateClassifier();
    res.json({ success: true, data: metrics });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to compute model evaluation metrics.', errors: [process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message] });
  }
});

router.get('/dataset-quality', authenticate, requirePermission('analytics.read'), async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const quality = await db.getDatasetQuality();
    res.json({ success: true, data: quality });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to compute dataset quality audit.', errors: [process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message] });
  }
});

router.get('/export-csv', authenticate, requirePermission('data.export'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
      const incidents = await filterIncidentsForUser(req.user!);
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

    const reports = await filterReportsForUser(req.user!);
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
});

export default router;

// ============================================================================
// AI Response Generation Endpoints
// ============================================================================

// Citizen: AI-assisted report acknowledgment and guidance
router.get('/citizen/response/:reportId', authenticate, requirePermission('report.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }
    const reportId = req.params.reportId;
    const report = await db.getReportById(reportId);
    if (!report) {
      res.status(404).json({ success: false, message: 'Report not found.' });
      return;
    }
    // Authorization: citizens can only see their own reports
    if (req.user.role === 'citizen' && report.citizenId !== req.user.id) {
      res.status(403).json({ success: false, message: 'Access denied.' });
      return;
    }
    // Officers/dept_officers can see reports in their department's incidents
    if ((req.user.role === 'officer' || req.user.role === 'dept_officer') && req.user.departmentId) {
      const incident = report.incidentId ? await db.getIncidentById(report.incidentId) : null;
      if (!incident || incident.assignedDepartmentId !== req.user.departmentId) {
        res.status(403).json({ success: false, message: 'Access denied.' });
        return;
      }
    }

    const incident = report.incidentId ? await db.getIncidentById(report.incidentId) : undefined;
    const response = generateCitizenResponse(report, incident);
    res.json({ success: true, data: response });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to generate citizen response.', errors: [process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message] });
  }
});

// Field Officer: AI incident briefing with inspection checklist
router.get('/officer/briefing/:incidentId', authenticate, requirePermission('incident.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }
    const incidentId = req.params.incidentId;
    const incident = await db.getIncidentById(incidentId);
    if (!incident) {
      res.status(404).json({ success: false, message: 'Incident not found.' });
      return;
    }
    // Authorization: officers can only see incidents assigned to their department
    if ((req.user.role === 'officer' || req.user.role === 'dept_officer') && req.user.departmentId) {
      if (incident.assignedDepartmentId !== req.user.departmentId) {
        res.status(403).json({ success: false, message: 'Access denied.' });
        return;
      }
    }

    const reports = await db.getReports({ incidentId });
    const briefing = generateFieldOfficerBriefing(incident, reports);
    res.json({ success: true, data: briefing });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to generate field officer briefing.', errors: [process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message] });
  }
});

// Department Officer: Workload intelligence and SLA risk assessment
router.get('/dept/intelligence', authenticate, requirePermission('incident.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }
    if (!req.user.departmentId) {
      res.status(403).json({ success: false, message: 'Department officer role requires department assignment.' });
      return;
    }
    const department = await db.getDepartmentById(req.user.departmentId);
    if (!department) {
      res.status(404).json({ success: false, message: 'Department not found.' });
      return;
    }

    const allIncidents = await db.getIncidents();
    const incidents = allIncidents.filter(i => i.assignedDepartmentId === req.user!.departmentId);
    const reports = await db.getReports();
    const users = await db.getUsers();

    const intelligence = generateDepartmentOfficerIntelligence(department, incidents, reports, users);
    res.json({ success: true, data: intelligence });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to generate department intelligence.', errors: [process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message] });
  }
});

// Analyst: Incident trends, duplicate patterns, hotspots
router.get('/analyst/intelligence', authenticate, requirePermission('analytics.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }
    const incidents = await filterIncidentsForUser(req.user);
    const reports = await filterReportsForUser(req.user!);
    const clusters = detectIncidentClusters(reports);

    const intelligence = generateAnalystIntelligence(incidents, reports, clusters);
    res.json({ success: true, data: intelligence });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to generate analyst intelligence.', errors: [process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message] });
  }
});

// Authority: Regional situation summary and cross-department performance
router.get('/authority/summary', authenticate, requirePermission('intelligence.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }
    if (req.user.role !== 'authority' && req.user.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Authority or admin role required.' });
      return;
    }

    const incidents = await db.getIncidents();
    const reports = await db.getReports();
    const departments = await db.getDepartments();
    const users = await db.getUsers();

    const summary = generateAuthoritySummary(incidents, reports, departments, users);
    res.json({ success: true, data: summary });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to generate authority summary.', errors: [process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message] });
  }
});

// Admin: AI service health and model configuration
router.get('/admin/ai-health', authenticate, requirePermission('admin.manage'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }
    if (req.user.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Admin role required.' });
      return;
    }

    const health = generateAdminAIHealth();
    res.json({ success: true, data: health });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to generate AI health report.', errors: [process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message] });
  }
});