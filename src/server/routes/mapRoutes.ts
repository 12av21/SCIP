// SCIP Backend - Map API Routes
// Endpoints: /api/map/*
// Map-optimized payloads for the geospatial intelligence dashboard.
// All endpoints enforce role-based access control.

import { Router, Response } from 'express';
import { db } from '../../database/index.js';
import { authenticate, AuthenticatedRequest, requirePermission } from '../middleware/auth.js';
import { detectIncidentClusters } from '../../ai/incidentClustering.js';
import { LocationLevel } from '../../types/scip.js';

const router = Router();

// Role-based report filter: citizens see own reports, officers see dept reports, others see all
async function scopeReportsForMap(user: any): Promise<any[]> {
  const all = await db.getReports();
  if (user.role === 'citizen') {
    return all.filter((r) => r.citizenId === user.id);
  }
  if (user.role === 'officer' || user.role === 'dept_officer') {
    const deptId = user.departmentId;
    if (!deptId) return [];
    const out: any[] = [];
    for (const r of all) {
      if (!r.incidentId) continue;
      const inc = await db.getIncidentById(r.incidentId);
      if (inc && inc.assignedDepartmentId === deptId) out.push(r);
    }
    return out;
  }
  return all;
}

// Role-based incident filter
async function scopeIncidentsForMap(user: any): Promise<any[]> {
  const all = await db.getIncidents();
  if (user.role === 'citizen') {
    return all.filter((i) => i.reportIds.some((rid: string) => {
      const r = db.getReportById(rid);
      return Boolean(r) && (r as any).citizenId === user.id;
    }));
  }
  if (user.role === 'officer' || user.role === 'dept_officer') {
    return all.filter((i) => i.assignedDepartmentId === user.departmentId);
  }
  return all;
}

// Validate coordinate query params
function parseCoord(req: AuthenticatedRequest, name: string): number | undefined {
  const v = Number(req.query[name]);
  return Number.isFinite(v) ? v : undefined;
}

// GET /api/map/reports — reports with valid coordinates for map markers
router.get('/reports', authenticate, requirePermission('location.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const reports = await scopeReportsForMap(req.user!);
    const withCoords = reports.filter((r) =>
      Number.isFinite(r.latitude) && Number.isFinite(r.longitude) &&
      r.latitude >= -90 && r.latitude <= 90 && r.longitude >= -180 && r.longitude <= 180
    );
    const data = withCoords.map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      urgency: r.urgency,
      status: r.status,
      locationName: r.locationName,
      latitude: r.latitude,
      longitude: r.longitude,
      createdAt: r.createdAt
    }));
    res.json({ success: true, data, meta: { totalReports: data.length } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to load map reports.', errors: [process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message] });
  }
});

// GET /api/map/incidents — incidents with valid coordinates for map markers
router.get('/incidents', authenticate, requirePermission('location.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const incidents = await scopeIncidentsForMap(req.user!);
    const withCoords = incidents.filter((i) =>
      Number.isFinite(i.latitude) && Number.isFinite(i.longitude) &&
      i.latitude >= -90 && i.latitude <= 90 && i.longitude >= -180 && i.longitude <= 180
    );
    const data = withCoords.map((i) => ({
      id: i.id,
      title: i.title,
      category: i.category,
      priority: i.priority,
      status: i.status,
      locationName: i.locationName,
      latitude: i.latitude,
      longitude: i.longitude,
      reportCount: i.reportIds?.length || 0,
      radiusMeters: i.radiusMeters,
      createdAt: i.createdAt
    }));
    res.json({ success: true, data, meta: { totalIncidents: data.length } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to load map incidents.', errors: [process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message] });
  }
});

// GET /api/map/hotspots — geographic density hotspots
router.get('/hotspots', authenticate, requirePermission('geoanalytics.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { minReports = '5', radiusMeters = '500' } = req.query;
    const minRepCount = Math.max(1, Math.min(Number(minReports) || 5, 1000));
    const radius = Math.max(50, Math.min(Number(radiusMeters) || 500, 50000));

    const reports = await scopeReportsForMap(req.user!);
    const withCoords = reports.filter((r) =>
      Number.isFinite(r.latitude) && Number.isFinite(r.longitude) &&
      r.latitude >= -90 && r.latitude <= 90 && r.longitude >= -180 && r.longitude <= 180
    );

    const grid = new Map<string, any[]>();
    for (const r of withCoords) {
      const latKey = Math.round(r.latitude / (radius / 111000));
      const lngKey = Math.round(r.longitude / (radius / (111000 * Math.cos((r.latitude * Math.PI) / 180))));
      const key = `${latKey},${lngKey}`;
      const arr = grid.get(key) || [];
      arr.push(r);
      grid.set(key, arr);
    }

    const hotspots = [];
    for (const [key, reportsInCell] of grid.entries()) {
      if (reportsInCell.length < minRepCount) continue;
      const [latKey, lngKey] = key.split(',').map(Number);
      const centroidLat = latKey * (radius / 111000);
      const centroidLng = lngKey * (radius / (111000 * Math.cos((centroidLat * Math.PI) / 180)));
      const categories = new Map<string, number>();
      for (const r of reportsInCell) {
        const c = categories.get(r.category) || 0;
        categories.set(r.category, c + 1);
      }
      hotspots.push({
        centroid: { latitude: Number(centroidLat.toFixed(6)), longitude: Number(centroidLng.toFixed(6)) },
        radiusMeters: radius,
        reportCount: reportsInCell.length,
        categories: Array.from(categories.entries()).map(([cat, c]) => ({ category: cat, count: c })),
        severityDistribution: reportsInCell.reduce((acc: any, r) => { acc[r.urgency] = (acc[r.urgency] || 0) + 1; return acc; }, {} as Record<string, number>)
      });
    }
    hotspots.sort((a: any, b: any) => b.reportCount - a.reportCount);

    res.json({ success: true, data: hotspots.slice(0, 50), meta: { totalReports: withCoords.length, minReports: minRepCount, radiusMeters: radius } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to compute map hotspots.', errors: [process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message] });
  }
});

// GET /api/map/clusters — DBSCAN spatio-temporal incident clusters
router.get('/clusters', authenticate, requirePermission('intelligence.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const reports = await scopeReportsForMap(req.user!);
    const clusters = detectIncidentClusters(reports);
    const data = clusters.map((c) => ({
      clusterId: c.clusterId,
      category: c.category,
      centroid: c.centroid,
      radiusMeters: c.radiusMeters,
      reportCount: c.reportCount,
      severity: c.severity,
      priority: c.priority,
      confidence: c.confidence,
      timeSpanHours: c.timeSpanHours,
      evidence: c.evidence
    }));
    res.json({ success: true, data, meta: { totalClusters: data.length } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to compute map clusters.', errors: [process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message] });
  }
});

// GET /api/map/boundaries — administrative boundaries (GeoJSON)
router.get('/boundaries', authenticate, requirePermission('location.boundary.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { level } = req.query;
    const filters: { level?: LocationLevel } = {};
    if (level && typeof level === 'string') filters.level = level as LocationLevel;
    const boundaries = await db.getAdministrativeBoundaries(filters);
    const data = boundaries.map((b) => ({
      id: b.id,
      level: b.level,
      geometry: b.geometry,
      parentId: b.parentId
    }));
    res.json({ success: true, data, meta: { totalBoundaries: data.length } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to load map boundaries.', errors: [process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message] });
  }
});

// GET /api/map/jurisdiction — administrative jurisdiction for a coordinate
router.get('/jurisdiction', authenticate, requirePermission('location.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const lat = parseCoord(req, 'lat');
    const lng = parseCoord(req, 'lng');
    if (lat === undefined || lng === undefined) {
      res.status(400).json({ success: false, message: 'Valid lat and lng query parameters are required.' });
      return;
    }
    const jurisdiction = db.findAdministrativeJurisdiction(lat, lng);
    res.json({ success: true, data: { coordinate: { latitude: lat, longitude: lng }, ...jurisdiction } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to resolve jurisdiction.', errors: [process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message] });
  }
});

// GET /api/map/stats — map summary statistics
router.get('/stats', authenticate, requirePermission('location.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const reports = await scopeReportsForMap(req.user!);
    const incidents = await scopeIncidentsForMap(req.user!);
    const withCoords = reports.filter((r) =>
      Number.isFinite(r.latitude) && Number.isFinite(r.longitude) &&
      r.latitude >= -90 && r.latitude <= 90 && r.longitude >= -180 && r.longitude <= 180
    );
    const byCategory = new Map<string, number>();
    for (const r of reports) byCategory.set(r.category, (byCategory.get(r.category) || 0) + 1);
    const byUrgency = new Map<string, number>();
    for (const r of reports) byUrgency.set(r.urgency, (byUrgency.get(r.urgency) || 0) + 1);
    res.json({
      success: true,
      data: {
        totalReports: reports.length,
        totalReportsWithCoordinates: withCoords.length,
        totalIncidents: incidents.length,
        activeIncidents: incidents.filter((i) => i.status !== 'resolved' && i.status !== 'closed' && i.status !== 'dismissed').length,
        categoryBreakdown: Array.from(byCategory.entries()).map(([category, count]) => ({ category, count })),
        urgencyBreakdown: Array.from(byUrgency.entries()).map(([urgency, count]) => ({ urgency, count })),
        geoCoveragePercent: reports.length > 0 ? Number(((withCoords.length / reports.length) * 100).toFixed(1)) : 0
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to load map stats.', errors: [process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message] });
  }
});

export default router;
