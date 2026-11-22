// SCIP Backend - Report Management Routes

import { Router, Response } from 'express';
import { db } from '../../database/index.js';
import { authenticate, AuthenticatedRequest, requirePermission } from '../middleware/auth.js';
import { Report, ReportCategory, ReportStatus, UrgencyLevel, LocationSource, ImageAnalysis } from '../../types/scip.js';
import { processImageUpload, parseDataUrl, analyzeImage, extractImageMetadata } from '../../ai/imageIntelligence.js';
import { notificationService } from '../../services/notificationService.js';
import { NotificationEventType } from '../../types/scip.js';

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

async function canAccessReport(user: { role: string; id: string; departmentId?: string }, report: Report): Promise<boolean> {
  if (user.role === 'citizen') return report.citizenId === user.id;
  if (user.role === 'officer' || user.role === 'dept_officer') {
    if (!user.departmentId) return false;
    if (!report.incidentId) return false;
    const incident = await db.getIncidentById(report.incidentId);
    return Boolean(incident && incident.assignedDepartmentId === user.departmentId);
  }
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
  if (typeof body.address === 'string') out.address = body.address.trim().slice(0, 500);
  if (typeof body.landmark === 'string') out.landmark = body.landmark.trim().slice(0, 200);
  if (typeof body.pinCode === 'string' && /^[1-9][0-9]{5}$/.test(body.pinCode)) out.pinCode = body.pinCode;
  if (['gps', 'manual_map', 'geocoded', 'preset'].includes(body.locationSource)) out.locationSource = body.locationSource;
  const acc = Number(body.locationAccuracyMeters);
  if (Number.isFinite(acc) && acc >= 0 && acc <= 1000000) out.locationAccuracyMeters = acc;
  if (typeof body.stateId === 'string') out.stateId = body.stateId;
  if (typeof body.districtId === 'string') out.districtId = body.districtId;
  if (typeof body.subDistrictId === 'string') out.subDistrictId = body.subDistrictId;
  if (typeof body.blockId === 'string') out.blockId = body.blockId;
  if (typeof body.localityId === 'string') out.localityId = body.localityId;
  if (Array.isArray(body.images)) {
    out.images = body.images.filter((x: any) => typeof x === 'string').slice(0, 10);
  }
  return out;
}

// GET /api/reports
router.get('/', authenticate, requirePermission('report.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { category, status, urgency, myOnly } = req.query;

  const filter: any = {};
  if (category) filter.category = String(category);
  if (status) filter.status = String(status);
  if (urgency) filter.urgency = String(urgency);

  if (req.user?.role === 'citizen' || myOnly === 'true') {
    filter.citizenId = req.user?.id;
  }

  let reports = await db.getReports(filter);

  if (req.user?.role === 'officer' || req.user?.role === 'dept_officer') {
    const deptId = req.user.departmentId;
    if (!deptId) {
      res.status(403).json({ success: false, message: 'Department assignment required.' });
      return;
    }
    const filtered: typeof reports = [];
    for (const r of reports) {
      if (!r.incidentId) continue;
      const inc = await db.getIncidentById(r.incidentId);
      if (inc && inc.assignedDepartmentId === deptId) filtered.push(r);
    }
    reports = filtered;
  }

  const data = reports.map(r => sanitizeReportForRole(req.user!.role, r));
  res.json({ success: true, data, meta: { total: data.length } });
});

// GET /api/reports/:id
router.get('/:id', authenticate, requirePermission('report.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const report = await db.getReportById(req.params.id);
  if (!report) {
    res.status(404).json({ success: false, message: `Report ${req.params.id} not found.` });
    return;
  }

  if (!(await canAccessReport(req.user!, report))) {
    await db.logAudit({
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

  const analysis = await db.getAIAnalysisForReport(req.params.id);
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
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
        images,
        // Complaint location fields (additive, distinct from citizen residence)
        stateId,
        districtId,
        subDistrictId,
        blockId,
        localityId,
        address,
        landmark,
        pinCode,
        locationSource = 'manual_map',
        locationAccuracyMeters
      } = req.body || {};

      if (typeof title !== 'string' || typeof description !== 'string' || typeof locationName !== 'string') {
        res.status(400).json({ success: false, message: 'Title, description, and location are required fields.', errors: ['Missing mandatory fields.'] });
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

      // Validate complaint location fields
      const validLocationSource = ['gps', 'manual_map', 'geocoded', 'preset'].includes(locationSource) ? locationSource : 'manual_map';
      let safeAccuracyMeters: number | undefined;
      if (locationAccuracyMeters !== undefined && locationAccuracyMeters !== null && locationAccuracyMeters !== '') {
        const acc = Number(locationAccuracyMeters);
        if (!Number.isFinite(acc) || acc < 0 || acc > 1000000) {
          res.status(400).json({ success: false, message: 'Location accuracy must be a non-negative number in metres.', errors: ['Invalid location accuracy.'] });
          return;
        }
        safeAccuracyMeters = acc;
      }
      let safePinCode: string | undefined;
      if (pinCode !== undefined && pinCode !== null && pinCode !== '') {
        if (typeof pinCode !== 'string' || !/^[1-9][0-9]{5}$/.test(pinCode)) {
          res.status(400).json({ success: false, message: 'PIN code must be a six-digit Indian PIN code.', errors: ['Invalid PIN code.'] });
          return;
        }
        safePinCode = pinCode;
      }

      // Validate administrative references exist if provided
      if (stateId && typeof stateId === 'string' && !db.getAdminStateById(stateId)) {
        res.status(400).json({ success: false, message: 'Invalid stateId.', errors: ['Invalid administrative state.'] });
        return;
      }
      if (districtId && typeof districtId === 'string' && !db.getAdminDistrictById(districtId)) {
        res.status(400).json({ success: false, message: 'Invalid districtId.', errors: ['Invalid administrative district.'] });
        return;
      }
      if (subDistrictId && typeof subDistrictId === 'string' && !db.getAdminSubDistrictById(subDistrictId)) {
        res.status(400).json({ success: false, message: 'Invalid subDistrictId.', errors: ['Invalid administrative sub-district.'] });
        return;
      }
      if (blockId && typeof blockId === 'string' && !db.getAdminBlockById(blockId)) {
        res.status(400).json({ success: false, message: 'Invalid blockId.', errors: ['Invalid administrative block.'] });
        return;
      }
      if (localityId && typeof localityId === 'string' && !db.getAdminLocalityById(localityId)) {
        res.status(400).json({ success: false, message: 'Invalid localityId.', errors: ['Invalid administrative locality.'] });
        return;
      }

      const safeSubcategory = typeof subcategory === 'string' ? subcategory.trim().slice(0, 120) : undefined;
      const safeImages = Array.isArray(images) ? images.filter((x: any) => typeof x === 'string' && x.length < 2048).slice(0, 10) : [];
      const safeAddress = typeof address === 'string' ? address.trim().slice(0, 500) : undefined;
      const safeLandmark = typeof landmark === 'string' ? landmark.trim().slice(0, 200) : undefined;
      const safeLocationName = typeof locationName === 'string' ? locationName.trim() : '';
      const now = new Date().toISOString();

      const user = req.user!;
      const { report, analysis } = await db.createReport({
        title: safeTitle,
        description: safeDescription,
        category,
        subcategory: safeSubcategory,
        locationName: safeLocationName,
        latitude: validLat,
        longitude: validLng,
        citizenId: user.id,
        citizenName: user.name,
        citizenEmail: user.email,
        urgency,
        images: safeImages,
        stateId: typeof stateId === 'string' ? stateId : undefined,
        districtId: typeof districtId === 'string' ? districtId : undefined,
        subDistrictId: typeof subDistrictId === 'string' ? subDistrictId : undefined,
        blockId: typeof blockId === 'string' ? blockId : undefined,
        localityId: typeof localityId === 'string' ? localityId : undefined,
        pinCode: safePinCode,
        locationSource: validLocationSource as LocationSource,
        locationAccuracyMeters: safeAccuracyMeters,
        locationConfirmedAt: now,
        address: safeAddress,
        landmark: safeLandmark
      });

      // --- Image Intelligence Integration (Phase 5) ---
      // Analyze each attached image via the AI pipeline (local heuristic + Python service OCR/vision).
      const imageEvidence: string[] = [];
      const imageAnalyses: ImageAnalysis[] = [];
      for (const imageDataUrl of safeImages) {
        try {
          const parsed = parseDataUrl(imageDataUrl);
          if (!parsed) continue;
          const meta = extractImageMetadata(parsed.buffer, 'upload', user.id);
          if (parsed.mimeType && parsed.mimeType !== 'application/octet-stream') {
            meta.mimeType = parsed.mimeType;
          }
          const analysis = await analyzeImage(parsed.buffer, meta, `${safeTitle}: ${safeDescription}`);
          imageAnalyses.push(analysis);
          const obs: string[] = [];
          if (analysis.ocrText) obs.push(`OCR: "${analysis.ocrText}"`);
          if (analysis.detectedObjects.length) obs.push(`Objects: ${analysis.detectedObjects.join(', ')}`);
          if (analysis.sceneLabels.length) obs.push(`Scene: ${analysis.sceneLabels.join(', ')}`);
          if (analysis.hasDamage) obs.push('Damage indicators detected');
          if (obs.length) imageEvidence.push(`Image ${meta.imageId}: ${obs.join('; ')}`);
        } catch {
          // Image analysis is additive; do not fail report creation if image processing fails
        }
      }

      // Merge image observations into the stored AI analysis
      if (imageEvidence.length) {
        try {
          const updatedAnalysis = await db.updateAIAnalysis(report.id, {
            evidence: [...analysis.evidence, ...imageEvidence]
          });
          analysis.evidence = updatedAnalysis.evidence;
        } catch {
          // Non-fatal; analysis already stored without image evidence
        }
      }

      res.status(201).json({
        success: true,
        message: 'Report submitted and processed by SCIP intelligence pipeline.',
        data: { report, analysis, imageAnalyses }
      });
      
      // Trigger notification for report submission
      await notificationService.processEvent('report_submitted', {
        reportId: report.id,
        category: report.category,
        location: report.locationName,
        description: report.description,
        departmentId: report.incidentId ? undefined : (report.category === 'Water & Drainage' || report.category === 'Public Sanitation' ? 'water' : 
          report.category === 'Roads & Traffic' ? 'roads' : 
          report.category === 'Power & Lighting' ? 'power' : 'general')
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
router.put('/:id', authenticate, requirePermission('report.update'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const existing = await db.getReportById(req.params.id);
    if (!existing) {
      res.status(404).json({ success: false, message: 'Report not found.' });
      return;
    }
    if (!(await canAccessReport(user, existing))) {
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
      const status = req.body?.status as ReportStatus | undefined;
      const allowedStaffStatuses: ReportStatus[] = ['under_review', 'assigned', 'resolved', 'closed'];
      if (status && allowedStaffStatuses.includes(status)) {
        updates = { status };
      } else {
        res.status(400).json({ success: false, message: 'No permitted fields to update.', errors: ['Field not allowed.'] });
        return;
      }
      if (user.role === 'dept_officer' && user.departmentId) {
        const inc = existing.incidentId ? await db.getIncidentById(existing.incidentId) : undefined;
        if (!inc || inc.assignedDepartmentId !== user.departmentId) {
          res.status(403).json({ success: false, message: 'Forbidden: department boundary violation.' });
          return;
        }
      }
    } else {
      res.status(403).json({ success: false, message: 'Forbidden.' });
      return;
    }

    const updated = await db.updateReport(req.params.id, updates, user);
    
    // Trigger notification for report status change
    if (updates.status && updates.status !== existing.status) {
      await notificationService.processEvent('report_status_changed', {
        reportId: req.params.id,
        newStatus: updates.status,
        updatedBy: user.name,
        citizenId: existing.citizenId
      });
    }
    
    res.json({ success: true, message: 'Report updated successfully.', data: sanitizeReportForRole(user.role, updated) });
  } catch (err: any) {
    const msg = process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message;
    res.status(400).json({ success: false, message: msg, errors: [msg] });
  }
});

// DELETE /api/reports/:id (Withdraw report)
router.delete('/:id', authenticate, requirePermission('report.update'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const existing = await db.getReportById(req.params.id);
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
    const withdrawn = await db.withdrawReport(req.params.id, user);
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
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

      const report = await db.getReportById(req.params.id);
      if (!report) {
        res.status(404).json({ success: false, message: 'Report not found' });
        return;
      }

      if (!(await canAccessReport(req.user!, report))) {
        res.status(403).json({ success: false, message: 'Forbidden.' });
        return;
      }
      if (report.status === 'closed' || report.status === 'resolved') {
        res.status(400).json({ success: false, message: 'Report is already closed.' });
        return;
      }

      const updated = await db.updateReport(req.params.id, { status: 'closed' }, req.user!);
      await db.createNotification({
        userId: report.citizenId,
        eventType: 'report_status_changed',
        title: 'Report Rejected by Authority',
        message: `Your report ${report.id} was reviewed and rejected. Reason: "${reason.trim().slice(0, 500)}"`,
        channels: ['in_app'],
        priority: 'medium',
        data: { reportId: report.id, newStatus: 'rejected', reason: reason.trim().slice(0, 500) },
        relatedEntityId: report.id,
        relatedEntityType: 'report'
      });

      await db.logAudit({
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
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const report = await db.getReportById(req.params.id);
    if (!report) {
      res.status(404).json({ success: false, message: 'Report not found' });
      return;
    }
    if (!(await canAccessReport(req.user!, report))) {
      res.status(403).json({ success: false, message: 'Forbidden: not authorized to access this report.' });
      return;
    }

    const freshAnalysis = await db.runAndStoreAIAnalysis(report, true);
    res.json({ success: true, message: 'AI re-analysis completed.', data: freshAnalysis });
  }
);

export default router;