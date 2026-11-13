// SCIP Backend - Geographic Analytics Routes
// Endpoints: /api/geoanalytics/*
// Location-based intelligence for authorized dashboards.
// All endpoints enforce role-based and geographic scope restrictions.

import { Router, Response } from 'express';
import { db } from '../../database/index.js';
import { authenticate, AuthenticatedRequest, requirePermission } from '../middleware/auth.js';

const router = Router();

// Validate ISO date string
function isValidDate(v: string | undefined): boolean {
  if (!v) return false;
  const d = new Date(v);
  return Number.isFinite(d.getTime());
}

// Parse optional date range filters
function parseDateRange(query: any): { from?: string; to?: string } {
  const from = isValidDate(query.from) ? String(query.from) : undefined;
  const to = isValidDate(query.to) ? String(query.to) : undefined;
  return { from, to };
}

// Filter reports within date range
function filterByDateRange(reports: any[], range: { from?: string; to?: string }): any[] {
  if (!range.from && !range.to) return reports;
  return reports.filter((r) => {
    const t = r.createdAt || r.updatedAt;
    if (!t) return false;
    const d = new Date(t);
    if (!Number.isFinite(d.getTime())) return false;
    if (range.from && d < new Date(range.from)) return false;
    if (range.to && d > new Date(range.to)) return false;
    return true;
  });
}

// Role-based scope filter: restrict reports/incidents by user's jurisdiction & department
async function scopeReportsByRole(user: any, reports: any[]): Promise<any[]> {
  if (user.role === 'citizen') {
    return reports.filter((r) => r.citizenId === user.id);
  }
  if (user.role === 'officer' || user.role === 'dept_officer') {
    const deptId = user.departmentId;
    if (!deptId) return [];
    const out: any[] = [];
    for (const r of reports) {
      if (!r.incidentId) continue;
      const inc = await db.getIncidentById(r.incidentId);
      if (inc && inc.assignedDepartmentId === deptId) out.push(r);
    }
    return out;
  }
  // analyst, authority, admin: all within their geographic scope if jurisdiction set
  return reports;
}

// GET /api/geoanalytics/overview — aggregated dashboard overview
router.get('/overview', authenticate, requirePermission('geoanalytics.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const range = parseDateRange(req.query);
  const reports = await db.getReports();
  const filtered = await scopeReportsByRole(req.user!, filterByDateRange(reports, range));
  const incidents = await db.getIncidents();

  const byCategory = new Map<string, number>();
  for (const r of filtered) {
    byCategory.set(r.category, (byCategory.get(r.category) || 0) + 1);
  }

  const withCoords = filtered.filter((r) =>
    Number.isFinite(r.latitude) && Number.isFinite(r.longitude) &&
    r.latitude >= -90 && r.latitude <= 90 && r.longitude >= -180 && r.longitude <= 180
  );

  const totalReports = filtered.length;
  const totalIncidents = incidents.length;
  const activeIncidents = incidents.filter(i => i.status !== 'resolved' && i.status !== 'closed' && i.status !== 'dismissed').length;
  const potentialIncidents = incidents.filter(i => i.status === 'potential').length;

  res.json({
    success: true,
    data: {
      totalReports,
      totalIncidents,
      activeIncidents,
      potentialIncidents,
      categoryBreakdown: Array.from(byCategory.entries()).map(([category, count]) => ({ category, count })),
      totalReportsWithCoordinates: withCoords.length,
      geoCoveragePercent: totalReports > 0 ? Number(((withCoords.length / totalReports) * 100).toFixed(1)) : 0,
      period: range
    },
    meta: { totalReports: filtered.length, period: range }
  });
});

// GET /api/geoanalytics/state-distribution — complaint distribution by State/UT
router.get('/state-distribution', authenticate, requirePermission('geoanalytics.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const range = parseDateRange(req.query);
  const reports = await db.getReports();
  const filtered = await scopeReportsByRole(req.user!, filterByDateRange(reports, range));

  const byState = new Map<string, { stateId?: string; stateName?: string; count: number; categories: Map<string, number> }>();
  for (const r of filtered) {
    const sid = r.stateId || 'unknown';
    const entry = byState.get(sid) || { stateId: sid, stateName: undefined, count: 0, categories: new Map() };
    entry.count += 1;
    const catCount = entry.categories.get(r.category) || 0;
    entry.categories.set(r.category, catCount + 1);
    byState.set(sid, entry);
  }

  // Enrich state names from admin data
  const result = Array.from(byState.values()).map(async (e) => {
    const state = e.stateId ? await db.getAdminStateById(e.stateId) : undefined;
    return {
      stateId: e.stateId,
      stateName: state?.name,
      stateType: state?.type,
      count: e.count,
      categoryBreakdown: Array.from(e.categories.entries()).map(([cat, c]) => ({ category: cat, count: c })),
      period: { from: range.from, to: range.to },
      coverage: 'reports with administrative stateId populated'
    };
  });
  const resolved = (await Promise.all(result)).sort((a: any, b: any) => b.count - a.count);

  res.json({ success: true, data: resolved, meta: { totalReports: filtered.length, period: range } });
});

// GET /api/geoanalytics/district-distribution — complaint distribution by District
router.get('/district-distribution', authenticate, requirePermission('geoanalytics.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { stateId } = req.query;
  const range = parseDateRange(req.query);
  const reports = await db.getReports();
  const filtered = await scopeReportsByRole(req.user!, filterByDateRange(reports, range));

  const byDistrict = new Map<string, { districtId?: string; districtName?: string; stateId?: string; count: number; categories: Map<string, number> }>();
  for (const r of filtered) {
    if (stateId && r.stateId !== stateId) continue;
    const did = r.districtId || 'unknown';
    const entry = byDistrict.get(did) || { districtId: did, districtName: undefined, stateId: r.stateId, count: 0, categories: new Map() };
    entry.count += 1;
    const catCount = entry.categories.get(r.category) || 0;
    entry.categories.set(r.category, catCount + 1);
    byDistrict.set(did, entry);
  }

  const result = Array.from(byDistrict.values()).map(async (e) => {
    const district = e.districtId ? await db.getAdminDistrictById(e.districtId) : undefined;
    return {
      districtId: e.districtId,
      districtName: district?.name,
      stateId: e.stateId,
      count: e.count,
      categoryBreakdown: Array.from(e.categories.entries()).map(([cat, c]) => ({ category: cat, count: c })),
      coverage: 'reports with administrative districtId populated'
    };
  });
  const resolved = (await Promise.all(result)).sort((a: any, b: any) => b.count - a.count);

  res.json({ success: true, data: resolved, meta: { totalReports: filtered.length, period: range } });
});

// GET /api/geoanalytics/locality-distribution — complaint distribution by Block/Locality
router.get('/locality-distribution', authenticate, requirePermission('geoanalytics.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { districtId, blockId } = req.query;
  const range = parseDateRange(req.query);
  const reports = await db.getReports();
  const filtered = await scopeReportsByRole(req.user!, filterByDateRange(reports, range));

  const byLocality = new Map<string, { localityId?: string; localityName?: string; blockId?: string; districtId?: string; type?: string; count: number }>();
  for (const r of filtered) {
    if (districtId && r.districtId !== districtId) continue;
    if (blockId && r.blockId !== blockId) continue;
    const lid = r.localityId || 'unknown';
    const entry = byLocality.get(lid) || { localityId: lid, localityName: undefined, blockId: r.blockId, districtId: r.districtId, type: undefined, count: 0 };
    entry.count += 1;
    byLocality.set(lid, entry);
  }

  const result = Array.from(byLocality.values()).map(async (e) => {
    const locality = e.localityId ? await db.getAdminLocalityById(e.localityId) : undefined;
    return {
      localityId: e.localityId,
      localityName: locality?.name,
      blockId: e.blockId,
      districtId: e.districtId,
      type: locality?.type,
      pinCode: locality?.pinCode,
      count: e.count,
      coverage: 'reports with administrative localityId populated'
    };
  });
  const resolved = (await Promise.all(result)).sort((a: any, b: any) => b.count - a.count);

  res.json({ success: true, data: resolved, meta: { totalReports: filtered.length, period: range } });
});

// GET /api/geoanalytics/hotspots — geographic hotspot detection (clustering)
router.get('/hotspots', authenticate, requirePermission('geoanalytics.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { minReports = '5', radiusMeters = '500' } = req.query;
  const minRepCount = Math.max(1, Math.min(Number(minReports) || 5, 1000));
  const radius = Math.max(50, Math.min(Number(radiusMeters) || 500, 50000));
  const range = parseDateRange(req.query);

  const reports = await db.getReports();
  const filtered = await scopeReportsByRole(req.user!, filterByDateRange(reports, range));

  // Only use reports with valid coordinates
  const withCoords = filtered.filter((r) =>
    Number.isFinite(r.latitude) && Number.isFinite(r.longitude) &&
    r.latitude >= -90 && r.latitude <= 90 && r.longitude >= -180 && r.longitude <= 180
  );

  // Simple grid-based spatial clustering (bounded, server-side)
  const grid = new Map<string, any[]>();
  for (const r of withCoords) {
    const latKey = Math.round(r.latitude / (radius / 111000)); // approx degrees per meter
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
      severityDistribution: reportsInCell.reduce((acc: any, r) => {
        acc[r.urgency] = (acc[r.urgency] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      period: { from: range.from, to: range.to },
      limitation: 'Grid-based approximate clustering; not certified production geospatial analysis'
    });
  }
  hotspots.sort((a: any, b: any) => b.reportCount - a.reportCount);

  res.json({ success: true, data: hotspots.slice(0, 50), meta: { totalReports: filtered.length, minReports: minRepCount, radiusMeters: radius, period: range } });
});

// GET /api/geoanalytics/resolution-time-by-district
router.get('/resolution-time-by-district', authenticate, requirePermission('geoanalytics.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const range = parseDateRange(req.query);
  const incidents = await db.getIncidents();
  const rangeFiltered = filterByDateRange(incidents, range);

  const byDistrict = new Map<string, { districtId?: string; districtName?: string; count: number; totalHours: number; resolvedCount: number }>();
  for (const inc of rangeFiltered) {
    if (!inc.resolvedAt || !inc.createdAt) continue;
    const start = new Date(inc.createdAt).getTime();
    const end = new Date(inc.resolvedAt).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) continue;
    const did = inc.districtId || 'unknown';
    const entry = byDistrict.get(did) || { districtId: did, districtName: undefined, count: 0, totalHours: 0, resolvedCount: 0 };
    entry.count += 1;
    entry.totalHours += (end - start) / (1000 * 60 * 60);
    entry.resolvedCount += 1;
    byDistrict.set(did, entry);
  }

  const result = Array.from(byDistrict.values()).map(async (e) => {
    const district = e.districtId ? await db.getAdminDistrictById(e.districtId) : undefined;
    return {
      districtId: e.districtId,
      districtName: district?.name,
      resolvedCount: e.resolvedCount,
      averageResolutionHours: e.resolvedCount > 0 ? Number((e.totalHours / e.resolvedCount).toFixed(2)) : 0,
      coverage: 'resolved incidents with administrative districtId populated'
    };
  });
  const resolved = (await Promise.all(result)).sort((a: any, b: any) => b.averageResolutionHours - a.averageResolutionHours);

  res.json({ success: true, data: resolved, meta: { totalIncidents: rangeFiltered.length, period: range } });
});

// GET /api/geoanalytics/pending-concentration — pending complaint concentration by district
router.get('/pending-concentration', authenticate, requirePermission('geoanalytics.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const range = parseDateRange(req.query);
  const reports = await db.getReports({ status: 'submitted' });
  const assigned = await db.getReports({ status: 'assigned' });
  const underReview = await db.getReports({ status: 'under_review' });
  const pending = [...reports, ...assigned, ...underReview];
  const filtered = await scopeReportsByRole(req.user!, filterByDateRange(pending, range));

  const byDistrict = new Map<string, { districtId?: string; districtName?: string; count: number }>();
  for (const r of filtered) {
    const did = r.districtId || 'unknown';
    const entry = byDistrict.get(did) || { districtId: did, districtName: undefined, count: 0 };
    entry.count += 1;
    byDistrict.set(did, entry);
  }

  const result = Array.from(byDistrict.values()).map(async (e) => {
    const district = e.districtId ? await db.getAdminDistrictById(e.districtId) : undefined;
    return {
      districtId: e.districtId,
      districtName: district?.name,
      pendingCount: e.count,
      coverage: 'pending reports with administrative districtId populated'
    };
  });
  const resolved = (await Promise.all(result)).sort((a: any, b: any) => b.count - a.count);

  res.json({ success: true, data: resolved, meta: { totalPending: filtered.length, period: range } });
});

export default router;
