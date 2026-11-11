// SCIP Backend - Report Management Routes

import { Router, Response } from 'express';
import { db } from '../../database/scipDatabase.js';
import { authenticate, AuthenticatedRequest, requirePermission } from '../middleware/auth.js';
import { Report, ReportCategory, ReportStatus, UrgencyLevel } from '../../types/scip.js';

const router = Router();

const REPORT_CATEGORIES: ReportCategory[] = [
  'Water & Drainage',
  'Roads & Traffic',
  'Public Sanitation',
  'Power & Lighting',
  'Parks & Environment',
  'Structural Safety',
  'Public Health',
  'Noise & Disturbance'
];
const URGENCY_LEVELS: UrgencyLevel[] = ['low', 'medium', 'high', 'critical'];
const CITIZEN_EDITABLE_STATUSES: ReportStatus[] = ['submitted', 'analyzed'];

function canAccessReport(user: { role: string; id: string; departmentId?: string }, report: Report): boolean {
  if (user.role === 'citizen') return report.citizenId === user.id;
  if (user.role === 'officer' || user.role === 'dept_officer') {
    if (!user.departmentId) return false;
    if (!report.incidentId) return false;
    const incident = db.getIncidentById(report.incidentId);
    return Boolean(incident && incident.assignedDepartmentId === user.departmentId);
  }
  // analyst, authority, admin: read access per permission; PII minimization handled at serialization/export layer
  return true;
}

function sanitizeReportForRole(userRole: string, report: Report): Partial<Report> {
  if (userRole === 'analyst') {
    const { citizenName, citizenEmail, ...rest } = report as any;
    return rest;
  }
  return report;
}

function pickCitizenUpdates(body: any): Partial<Report> {
  const out: any = {};
  if (typeof body.title === 'string') out.title = body.title.trim();
  if (typeof body.description === 'string') out.description = body.description.trim();
  if (typeof body.locationName === 'string') out.locationName = body.locationName.trim();
  if (typeof body.subcategory === 'string') out.subcategory = body.subcategory.trim();
  if (REPORT_CATEGORIES.includes(body.category)) out.category = body.category;
  if (URGENCY_LEVELS.includes(body.urgency)) out.urgency = body.urgency;
  const lat = Number(body.latitude);
  const lng = Number(body.longitude);
  if (Number.isFinite(lat) && lat >= -90 && lat <= 90) out.latitude = lat;
  if (Number.isFinite(lng) && lng >= -180 && lng <= 180) out.longitude = lng;
  if (Array.isArray(body.images)) {
    out.images = body.images.filter((x: any) => typeof x === 'string').slice(0, 10);
  }
  return out;
}

// GET /api/reports
router.get('/', authenticate, requirePermission('report.read'), (req: AuthenticatedRequest, res: Response): void => {
  const { category, status, urgency, myOnly } = req.query;

  const filter: any = {};
  if (category) filter.category = String(category);
  if (status) filter.status = String(status);
  if (urgency) filter.urgency = String(urgency);

  if (req.user?.role === 'citizen' || myOnly === 'true') {
    filter.citizenId = req.user?.id;
  }

  let reports = db.getReports(filter);

  if (req.user?.role === 'officer' || req.user?.role === 'dept_officer') {
    const deptId = req.user.departmentId;
    if (!deptId) {
      res.status(403).json({ success: false, message: 'Department assignment required.' });
      return;
    }
    reports = reports.filter(r => {
      if (!r.incidentId) return false;
      const inc = db.getIncidentById(r.incidentId);
      return Boolean(inc && inc.assignedDepartmentId === deptId);
    });
  }

  const data = reports.map(r => sanitizeReportForRole(req.user!.role, r));
  res.json({ success: true, data, meta: { total: data.length } });
});

// GET /api/reports/:id
router.get('/:id', authenticate, requirePermission('report.read'), (req: AuthenticatedRequest, res: Response): void => {
  const report = db.getReportById(req.params.id);
  if (!report) {
    res.status(404).json({ success: false, message: `Report ${req.params.id} not found.` });
    return;
  }

  if (!canAccessReport(req.user!, report)) {
    db.logAudit({
      action: 'SECURITY_EVENT',
      module: 'security',
      recordId: report.id,
      userId: req.user!.id,
      userEmail: req.user!.email,
      userRole: req.user!.role,
      ipAddress: req.ip || '127.0.0.1',
      details: `Unauthorized report access blocked for ${report.id}`
    });
    res.status(403).json({ success: false, message: 'Forbidden: not authorized to access this report.', errors: ['Access denied.'] });
    return;
  }

  const analysis = db.getAIAnalysisForReport(req.params.id);
  res.json({
    success: true,
    data: { report: sanitizeReportForRole(req.user!.role, report), analysis: analysis || null }
  });
});

// POST /api/reports - Citizen submits new report
router.post(
  '/',
  authenticate,
  requirePermission('report.create'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const {
        title,
        description,
        category,
        subcategory,
        locationName,
        latitude,
        longitude,
        urgency = 'medium',
        images
      } = req.body || {};

      if (typeof title !== 'string' || typeof description !== 'string' || typeof locationName !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Title, description, and location are required fields.',
          errors: ['Missing mandatory fields.']
        });
        return;
      }
      const safeTitle = title.trim();
      const safeDescription = description.trim();
      const safeLocation = locationName.trim();
      if (safeTitle.length < 5 || safeTitle.length > 200) {
        res.status(400).json({ success: false, message: 'Report title must be 5-200 characters.', errors: ['Invalid title.'] });
        return;
      }
      if (safeDescription.length < 10 || safeDescription.length > 4000) {
        res.status(400).json({ success: false, message: 'Description must be 10-4000 characters.', errors: ['Invalid description.'] });
        return;
      }
      if (!safeLocation || safeLocation.length > 200) {
        res.status(400).json({ success: false, message: 'Location is required and must be <= 200 characters.', errors: ['Invalid location.'] });
        return;
      }

      const validLat = Number(latitude);
      const validLng = Number(longitude);
      if (!Number.isFinite(validLat) || validLat < -90 || validLat > 90 || !Number.isFinite(validLng) || validLng < -180 || validLng > 180) {
        res.status(400).json({ success: false, message: 'Valid latitude and longitude are required.', errors: ['Invalid coordinates.'] });
        return;
      }

      if (!REPORT_CATEGORIES.includes(category)) {
        res.status(400).json({ success: false, message: 'Invalid report category.', errors: ['Invalid category.'] });
        return;
      }
      if (!URGENCY_LEVELS.includes(urgency)) {
        res.status(400).json({ success: false, message: 'Invalid urgency level.', errors: ['Invalid urgency.'] });
        return;
      }
      const safeSubcategory = typeof subcategory === 'string' ? subcategory.trim().slice(0, 120) : undefined;
      const safeImages = Array.isArray(images) ? images.filter((x: any) => typeof x === 'string' && x.length < 2048).slice(0, 10) : [];

      const user = req.user!;
      const { report, analysis } = db.createReport({
        title: safeTitle,
        description: safeDescription,
        category,
        subcategory: safeSubcategory,
        locationName: safeLocation,
        latitude: validLat,
        longitude: validLng,
        citizenId: user.id,
        citizenName: user.name,
        citizenEmail: user.email,
        urgency,
        images: safeImages
      });

      res.status(201).json({
        success: true,
        message: 'Report submitted and processed by SCIP intelligence pipeline.',
        data: {
          report,
          analysis
        }
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to submit report.',
        errors: [process.env.NODE_ENV === 'production' ? 'Submission failed.' : err.message]
      });
    }
  }
);

// PUT /api/reports/:id
router.put('/:id', authenticate, requirePermission('report.update'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const user = req.user!;
    const existing = db.getReportById(req.params.id);
    if (!existing) {
      res.status(404).json({ success: false, message: 'Report not found.' });
      return;
    }
    if (!canAccessReport(user, existing)) {
      res.status(403).json({ success: false, message: 'Forbidden: not authorized to modify this report.' });
      return;
    }

    let updates: Partial<Report> = {};
    if (user.role === 'citizen') {
      if (existing.citizenId !== user.id) {
        res.status(403).json({ success: false, message: 'Forbidden.' });
        return;
      }
      if (!CITIZEN_EDITABLE_STATUSES.includes(existing.status)) {
        res.status(400).json({ success: false, message: 'Report cannot be modified once linked or investigated.' });
        return;
      }
      updates = pickCitizenUpdates(req.body);
      if (Object.keys(updates).length === 0) {
        res.status(400).json({ success: false, message: 'No valid editable fields provided.', errors: ['Invalid update payload.'] });
        return;
      }
      if (typeof updates.title === 'string' && updates.title.length < 5) {
        res.status(400).json({ success: false, message: 'Report title must be at least 5 characters.' });
        return;
      }
    } else if (user.role === 'dept_officer' || user.role === 'authority' || user.role === 'admin') {
      // Staff can only perform limited status workflow updates via allowlist; ownership/PII/system fields immutable here.
      const status = req.body?.status as ReportStatus | undefined;
      const allowedStaffStatuses: ReportStatus[] = ['under_review', 'assigned', 'resolved', 'closed'];
      if (status && allowedStaffStatuses.includes(status)) {
        updates = { status };
      } else {
        res.status(400).json({ success: false, message: 'No permitted fields to update.', errors: ['Field not allowed.'] });
        return;
      }
      if (user.role === 'dept_officer' && user.departmentId) {
        const inc = existing.incidentId ? db.getIncidentById(existing.incidentId) : undefined;
        if (!inc || inc.assignedDepartmentId !== user.departmentId) {
          res.status(403).json({ success: false, message: 'Forbidden: department boundary violation.' });
          return;
        }
      }
    } else {
      res.status(403).json({ success: false, message: 'Forbidden.' });
      return;
    }

    const updated = db.updateReport(req.params.id, updates, user);
    res.json({ success: true, message: 'Report updated successfully.', data: sanitizeReportForRole(user.role, updated) });
  } catch (err: any) {
    const msg = process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message;
    res.status(400).json({ success: false, message: msg, errors: [msg] });
  }
});

// DELETE /api/reports/:id (Withdraw report)
router.delete('/:id', authenticate, requirePermission('report.update'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const user = req.user!;
    const existing = db.getReportById(req.params.id);
    if (!existing) {
      res.status(404).json({ success: false, message: 'Report not found.' });
      return;
    }
    if (user.role === 'citizen' && existing.citizenId !== user.id) {
      res.status(403).json({ success: false, message: 'Forbidden.' });
      return;
    }
    if (user.role !== 'citizen' && user.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Only the reporting citizen or an administrator may withdraw a report.' });
      return;
    }
    if (existing.status === 'closed' || existing.status === 'resolved') {
      res.status(400).json({ success: false, message: 'Report is already closed.' });
      return;
    }
    const withdrawn = db.withdrawReport(req.params.id, user);
    res.json({ success: true, message: `Report ${req.params.id} has been withdrawn.`, data: sanitizeReportForRole(user.role, withdrawn) });
  } catch (err: any) {
    res.status(403).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message });
  }
});

// POST /api/reports/:id/reject (Authority/Officer rejects invalid report)
router.post(
  '/:id/reject',
  authenticate,
  requirePermission('incident.update'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const { reason } = req.body || {};
      if (typeof reason !== 'string' || !reason.trim()) {
        res.status(400).json({ success: false, message: 'Rejection reason is required.' });
        return;
      }
      if (reason.length > 1000) {
        res.status(400).json({ success: false, message: 'Rejection reason must be 1000 characters or fewer.' });
        return;
      }

      const report = db.getReportById(req.params.id);
      if (!report) {
        res.status(404).json({ success: false, message: 'Report not found' });
        return;
      }

      if (!canAccessReport(req.user!, report)) {
        res.status(403).json({ success: false, message: 'Forbidden.' });
        return;
      }
      if (report.status === 'closed' || report.status === 'resolved') {
        res.status(400).json({ success: false, message: 'Report is already closed.' });
        return;
      }

      const updated = db.updateReport(req.params.id, { status: 'closed' }, req.user!);
      db.createNotification({
        userId: report.citizenId,
        title: 'Report Rejected by Authority',
        message: `Your report ${report.id} was reviewed and rejected. Reason: "${reason.trim().slice(0, 500)}"`,
        type: 'report_status',
        link: report.id
      });

      db.logAudit({
        action: 'REPORT_REJECTED',
        module: 'reports',
        recordId: report.id,
        userId: req.user!.id,
        userEmail: req.user!.email,
        userRole: req.user!.role,
        ipAddress: req.ip || '127.0.0.1',
        details: `Report ${report.id} rejected.`
      });

      res.json({ success: true, message: `Report ${report.id} rejected.`, data: sanitizeReportForRole(req.user!.role, updated) });
    } catch (err: any) {
      res.status(400).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message });
    }
  }
);

// POST /api/reports/:id/reanalyze
router.post(
  '/:id/reanalyze',
  authenticate,
  requirePermission('intelligence.read'),
  (req: AuthenticatedRequest, res: Response): void => {
    const report = db.getReportById(req.params.id);
    if (!report) {
      res.status(404).json({ success: false, message: 'Report not found' });
      return;
    }
    if (!canAccessReport(req.user!, report)) {
      res.status(403).json({ success: false, message: 'Forbidden: not authorized to access this report.' });
      return;
    }

    const freshAnalysis = db.runAndStoreAIAnalysis(report, true);
    res.json({
      success: true,
      message: 'AI re-analysis completed.',
      data: freshAnalysis
    });
  }
);

export default router;



