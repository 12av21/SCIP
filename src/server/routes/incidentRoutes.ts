// SCIP Backend - Incident Lifecycle & Human Review Routes

import { Router, Response } from 'express';
import { db } from '../../database/scipDatabase.js';
import { authenticate, AuthenticatedRequest, requirePermission } from '../middleware/auth.js';
import { Incident } from '../../types/scip.js';

const router = Router();

function canAccessIncident(user: any, incident: Incident): boolean {
  if (user.role === 'citizen') {
    return incident.reportIds.some(rid => db.getReportById(rid)?.citizenId === user.id);
  }
  if (user.role === 'officer' || user.role === 'dept_officer') {
    return Boolean(user.departmentId && incident.assignedDepartmentId === user.departmentId);
  }
  return true;
}

function scopedIncidents(user: any, incidents: Incident[]): Incident[] {
  return incidents.filter(i => canAccessIncident(user, i));
}

// GET /api/incidents
router.get('/', authenticate, requirePermission('incident.read'), (req: AuthenticatedRequest, res: Response): void => {
  const { status, category, priority } = req.query;

  let incidents = db.getIncidents({
    status: status ? String(status) : undefined,
    category: category ? String(category) : undefined,
    priority: priority ? String(priority) : undefined
  });
  incidents = scopedIncidents(req.user!, incidents);

  res.json({ success: true, data: incidents, meta: { total: incidents.length } });
});

// GET /api/incidents/:id
router.get('/:id', authenticate, requirePermission('incident.read'), (req: AuthenticatedRequest, res: Response): void => {
  const incident = db.getIncidentById(req.params.id);
  if (!incident) {
    res.status(404).json({ success: false, message: `Incident ${req.params.id} not found.` });
    return;
  }
  if (!canAccessIncident(req.user!, incident)) {
    res.status(403).json({ success: false, message: 'Forbidden: not authorized to access this incident.' });
    return;
  }

  let linkedReports = incident.reportIds
    .map(rid => db.getReportById(rid))
    .filter((r): r is NonNullable<typeof r> => Boolean(r));
  if (req.user?.role === 'citizen') {
    linkedReports = linkedReports.filter(r => r.citizenId === req.user!.id);
  }
  // Analysts receive no unnecessary citizen PII in linked report payloads
  if (req.user?.role === 'analyst') {
    linkedReports = linkedReports.map(r => {
      const { citizenName, citizenEmail, ...rest } = r as any;
      return rest;
    });
  }

  res.json({ success: true, data: { incident, linkedReports } });
});

// POST /api/incidents/from-cluster
router.post(
  '/from-cluster',
  authenticate,
  requirePermission('incident.create'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const { cluster } = req.body || {};
      if (!cluster || !Array.isArray(cluster.reportIds) || cluster.reportIds.length === 0) {
        res.status(400).json({ success: false, message: 'Valid cluster data with report IDs is required.' });
        return;
      }
      if (!cluster.reportIds.every((id: any) => typeof id === 'string' && id.trim())) {
        res.status(400).json({ success: false, message: 'Cluster report IDs must be non-empty strings.' });
        return;
      }
      // Ensure referenced reports exist; prevent creating incidents from arbitrary/unknown records.
      const missing = cluster.reportIds.filter((id: string) => !db.getReportById(id));
      if (missing.length > 0) {
        res.status(400).json({ success: false, message: 'Cluster contains unknown report IDs.', errors: ['Invalid cluster input.'] });
        return;
      }

      const newIncident = db.createIncidentFromCluster(cluster, req.user!);
      res.status(201).json({
        success: true,
        message: 'Potential incident created from cluster observation.',
        data: newIncident
      });
    } catch (err: any) {
      const msg = process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message;
      res.status(500).json({
        success: false,
        message: 'Failed to create incident from cluster.',
        errors: [msg]
      });
    }
  }
);

// POST /api/incidents/:id/review (Human Review Workflow)
router.post(
  '/:id/review',
  authenticate,
  requirePermission('incident.update'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const incident = db.getIncidentById(req.params.id);
      if (!incident) {
        res.status(404).json({ success: false, message: 'Incident not found.' });
        return;
      }
      if (!canAccessIncident(req.user!, incident)) {
        res.status(403).json({ success: false, message: 'Forbidden.' });
        return;
      }
      if (req.user?.role === 'dept_officer' && req.user.departmentId && incident.assignedDepartmentId && incident.assignedDepartmentId !== req.user.departmentId) {
        res.status(403).json({ success: false, message: 'Forbidden: department boundary violation.' });
        return;
      }
      // Field officers may only act on incidents assigned to them or their department as appropriate
      if (req.user?.role === 'officer' && req.user.departmentId && incident.assignedDepartmentId && incident.assignedDepartmentId !== req.user.departmentId) {
        res.status(403).json({ success: false, message: 'Forbidden: department boundary violation.' });
        return;
      }

      const { action, notes, departmentId, officerId } = req.body || {};

      if (!action || (action !== 'confirm' && action !== 'dismiss')) {
        res.status(400).json({
          success: false,
          message: 'Action must be "confirm" or "dismiss".'
        });
        return;
      }

      if (typeof notes !== 'string' || !notes.trim()) {
        res.status(400).json({ success: false, message: 'Review notes are required for administrative accountability.' });
        return;
      }
      if (notes.length > 2000) {
        res.status(400).json({ success: false, message: 'Review notes must be 2000 characters or fewer.' });
        return;
      }
      if (departmentId !== undefined && (typeof departmentId !== 'string' || departmentId.length > 64)) {
        res.status(400).json({ success: false, message: 'Invalid department ID.' });
        return;
      }
      if (officerId !== undefined && (typeof officerId !== 'string' || officerId.length > 64)) {
        res.status(400).json({ success: false, message: 'Invalid officer ID.' });
        return;
      }
      // Dept officers may only act within their department and cannot assign outside it.
      if (req.user?.role === 'dept_officer' && req.user.departmentId) {
        if (departmentId && departmentId !== req.user.departmentId) {
          res.status(403).json({ success: false, message: 'Forbidden: department boundary violation.' });
          return;
        }
      }

      const updatedIncident = db.reviewIncident(
        req.params.id,
        action,
        req.user!,
        notes.trim(),
        departmentId,
        officerId
      );

      res.json({
        success: true,
        message: `Incident ${req.params.id} has been ${action === 'confirm' ? 'confirmed' : 'dismissed'} by human review.`,
        data: updatedIncident
      });
    } catch (err: any) {
      const msg = process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message;
      res.status(400).json({
        success: false,
        message: msg,
        errors: [msg]
      });
    }
  }
);

// POST /api/incidents/:id/resolve
router.post(
  '/:id/resolve',
  authenticate,
  requirePermission('incident.resolve'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const { actionTaken, preventiveMeasures, costEstimate } = req.body || {};

      if (typeof actionTaken !== 'string' || actionTaken.trim().length < 5 || actionTaken.trim().length > 2000) {
        res.status(400).json({
          success: false,
          message: 'Action taken description is required (5-2000 characters).'
        });
        return;
      }
      if (preventiveMeasures !== undefined && (typeof preventiveMeasures !== 'string' || preventiveMeasures.length > 2000)) {
        res.status(400).json({ success: false, message: 'Preventive measures must be a string up to 2000 characters.' });
        return;
      }
      const parsedCost = costEstimate === undefined || costEstimate === null || costEstimate === '' ? undefined : Number(costEstimate);
      if (parsedCost !== undefined && (!Number.isFinite(parsedCost) || parsedCost < 0)) {
        res.status(400).json({ success: false, message: 'Cost estimate must be a non-negative number.' });
        return;
      }

      const existing = db.getIncidentById(req.params.id);
      if (!existing) {
        res.status(404).json({ success: false, message: `Incident ${req.params.id} not found.` });
        return;
      }
      if (!canAccessIncident(req.user!, existing)) {
        res.status(403).json({ success: false, message: 'Forbidden.' });
        return;
      }
      if (req.user?.role === 'dept_officer' && req.user.departmentId && existing.assignedDepartmentId && existing.assignedDepartmentId !== req.user.departmentId) {
        res.status(403).json({ success: false, message: 'Forbidden: department boundary violation.' });
        return;
      }

      // Workflow lifecycle rule: Incident must be confirmed or in_progress before resolution
      if (existing.status === 'potential' || existing.status === 'dismissed') {
        res.status(400).json({
          success: false,
          message: `Illegal workflow transition: Cannot resolve incident in "${existing.status}" status. It must be confirmed by human authority first.`,
          errors: ['Invalid lifecycle status transition.']
        });
        return;
      }

      const resolved = db.resolveIncident(req.params.id, req.user!, {
        actionTaken: actionTaken.trim(),
        preventiveMeasures: typeof preventiveMeasures === 'string' ? preventiveMeasures.trim() : undefined,
        costEstimate: parsedCost
      });

      res.json({
        success: true,
        message: `Incident ${req.params.id} has been marked resolved.`,
        data: resolved
      });
    } catch (err: any) {
      const msg = process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message;
      res.status(400).json({
        success: false,
        message: msg,
        errors: [msg]
      });
    }
  }
);

// GET /api/incidents/:id/inspections
router.get(
  '/:id/inspections',
  authenticate,
  requirePermission('inspection.read'),
  (req: AuthenticatedRequest, res: Response): void => {
    const incident = db.getIncidentById(req.params.id);
    if (!incident) {
      res.status(404).json({ success: false, message: 'Incident not found.' });
      return;
    }
    if (!canAccessIncident(req.user!, incident)) {
      res.status(403).json({ success: false, message: 'Forbidden.' });
      return;
    }
    const list = db.getInspections(req.params.id);
    res.json({ success: true, data: list });
  }
);

// POST /api/incidents/:id/inspection - Field Officer submits inspection report
router.post(
  '/:id/inspection',
  authenticate,
  requirePermission('inspection.create'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const {
        verifiedStatus,
        observations,
        checklist,
        evidencePhotos,
        recommendedAction,
        inspectionDate
      } = req.body || {};

      const allowedStatuses = ['verified_match', 'disputed', 'partial'];
      if (typeof observations !== 'string' || !observations.trim() || observations.length > 2000 || !allowedStatuses.includes(verifiedStatus)) {
        res.status(400).json({ success: false, message: 'Valid observations (max 2000 chars) and verified status are mandatory.' });
        return;
      }
      if (recommendedAction !== undefined && (typeof recommendedAction !== 'string' || recommendedAction.length > 2000)) {
        res.status(400).json({ success: false, message: 'Recommended action must be 2000 characters or fewer.' });
        return;
      }
      if (inspectionDate !== undefined && (typeof inspectionDate !== 'string' || inspectionDate.length > 64)) {
        res.status(400).json({ success: false, message: 'Inspection date must be a string up to 64 characters.' });
        return;
      }
      const safeChecklist = {
        physicalVerification: Boolean(checklist?.physicalVerification),
        safetyHazardAssessed: Boolean(checklist?.safetyHazardAssessed),
        structuralDamageChecked: Boolean(checklist?.structuralDamageChecked),
        utilityImpactVerified: Boolean(checklist?.utilityImpactVerified)
      };

      const incident = db.getIncidentById(req.params.id);
      if (!incident) {
        res.status(404).json({ success: false, message: 'Incident not found.' });
        return;
      }
      if (!canAccessIncident(req.user!, incident)) {
        res.status(403).json({ success: false, message: 'Forbidden.' });
        return;
      }
      if (req.user?.role === 'officer' && incident.assignedOfficerId && incident.assignedOfficerId !== req.user.id) {
        res.status(403).json({ success: false, message: 'Forbidden: field officers may only inspect incidents assigned to them.' });
        return;
      }

      const inspection = db.createInspection(
        {
          incidentId: req.params.id,
          officerId: req.user!.id,
          officerName: req.user!.name,
          verifiedStatus,
          observations: observations.trim(),
          checklist: safeChecklist,
          evidencePhotos: Array.isArray(evidencePhotos)
            ? evidencePhotos.filter((x: any) => typeof x === 'string' && x.length <= 2048).slice(0, 10)
            : [],
          recommendedAction: typeof recommendedAction === 'string' ? recommendedAction.trim() : '',
          inspectionDate: typeof inspectionDate === 'string' ? inspectionDate : new Date().toISOString()
        },
        req.user!
      );

      res.status(201).json({
        success: true,
        message: 'Field inspection report submitted successfully.',
        data: inspection
      });
    } catch (err: any) {
      const msg = process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message;
      res.status(400).json({
        success: false,
        message: msg
      });
    }
  }
);

// POST /api/incidents/:id/verify-inspection - Department Desk Officer approves/disputes
router.post(
  '/:id/verify-inspection',
  authenticate,
  requirePermission('inspection.verify'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const { inspectionId, departmentRemarks, isApproved } = req.body || {};
      if (typeof inspectionId !== 'string' || !inspectionId.trim()) {
        res.status(400).json({ success: false, message: 'Inspection ID is required.' });
        return;
      }
      if (typeof departmentRemarks !== 'string' || !departmentRemarks.trim() || departmentRemarks.length > 1000) {
        res.status(400).json({ success: false, message: 'Valid department remarks are required.' });
        return;
      }
      if (typeof isApproved !== 'boolean') {
        res.status(400).json({ success: false, message: 'Approval decision must be a boolean.' });
        return;
      }

      const incident = db.getIncidentById(req.params.id);
      if (!incident) {
        res.status(404).json({ success: false, message: 'Incident not found.' });
        return;
      }
      if (!canAccessIncident(req.user!, incident)) {
        res.status(403).json({ success: false, message: 'Forbidden.' });
        return;
      }
      const inspection = db.getInspectionById(inspectionId.trim());
      if (!inspection || inspection.incidentId !== incident.id) {
        res.status(400).json({ success: false, message: 'Inspection does not belong to this incident.' });
        return;
      }
      if (incident.status === 'resolved' || incident.status === 'dismissed' || incident.status === 'closed') {
        res.status(400).json({ success: false, message: 'Cannot verify inspections for a closed incident.' });
        return;
      }

      // Department isolation boundary guard
      if (req.user?.role === 'dept_officer' && req.user.departmentId) {
        if (incident.assignedDepartmentId && incident.assignedDepartmentId !== req.user.departmentId) {
          res.status(403).json({
            success: false,
            message: `Forbidden: You can only verify inspections within your department (${req.user.departmentId}).`,
            errors: ['Department boundary isolation violation.']
          });
          return;
        }
      }

      const verified = db.verifyInspection(
        inspectionId.trim(),
        departmentRemarks.trim(),
        req.user!,
        isApproved
      );

      res.json({
        success: true,
        message: `Inspection ${inspectionId} has been ${isApproved ? 'approved' : 'rejected'}.`,
        data: verified
      });
    } catch (err: any) {
      const msg = process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message;
      res.status(400).json({
        success: false,
        message: msg
      });
    }
  }
);

// POST /api/incidents/:id/assign - Department Officer assigns field officer
router.post(
  '/:id/assign',
  authenticate,
  requirePermission('incident.assign'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const { departmentId, officerId, officerName, notes } = req.body || {};
      if (typeof officerId !== 'string' || !officerId.trim() || typeof officerName !== 'string' || !officerName.trim()) {
        res.status(400).json({ success: false, message: 'Officer ID and name are required for assignment.' });
        return;
      }
      if (officerId.length > 64 || officerName.trim().length > 120) {
        res.status(400).json({ success: false, message: 'Officer ID or name exceeds allowed length.' });
        return;
      }
      if (notes !== undefined && (typeof notes !== 'string' || notes.length > 500)) {
        res.status(400).json({ success: false, message: 'Invalid assignment notes.' });
        return;
      }

      let targetDeptId = typeof departmentId === 'string' && departmentId.trim()
        ? departmentId.trim()
        : req.user?.departmentId;
      if (!targetDeptId) {
        res.status(400).json({ success: false, message: 'Target department is required.' });
        return;
      }

      const incident = db.getIncidentById(req.params.id);
      if (!incident) {
        res.status(404).json({ success: false, message: 'Incident not found.' });
        return;
      }
      if (!canAccessIncident(req.user!, incident)) {
        res.status(403).json({ success: false, message: 'Forbidden.' });
        return;
      }
      if (incident.status === 'resolved' || incident.status === 'dismissed' || incident.status === 'closed') {
        res.status(400).json({ success: false, message: 'Cannot assign a closed incident.' });
        return;
      }

      // Department isolation boundary check
      if (req.user?.role === 'dept_officer' && req.user.departmentId) {
        if (targetDeptId !== req.user.departmentId) {
          res.status(403).json({
            success: false,
            message: 'Forbidden: Department desk officers can only manage assignments within their own department.',
            errors: ['Department boundary isolation violation.']
          });
          return;
        }
        if (incident.assignedDepartmentId && incident.assignedDepartmentId !== req.user.departmentId) {
          res.status(403).json({ success: false, message: 'Forbidden: department boundary violation.' });
          return;
        }
      }

      const updated = db.assignIncidentOfficer(
        req.params.id,
        targetDeptId,
        officerId.trim(),
        officerName.trim(),
        req.user!,
        typeof notes === 'string' ? notes.trim() : ''
      );

      res.json({
        success: true,
        message: `Field officer ${officerName.trim()} assigned to incident.`,
        data: updated
      });
    } catch (err: any) {
      const msg = process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message;
      res.status(400).json({
        success: false,
        message: msg
      });
    }
  }
);

// POST /api/incidents/:id/escalate - Escalate incident to Critical P1
router.post(
  '/:id/escalate',
  authenticate,
  requirePermission('incident.escalate'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const { reason } = req.body || {};
      if (typeof reason !== 'string' || !reason.trim()) {
        res.status(400).json({ success: false, message: 'Official reason for incident escalation is mandatory.' });
        return;
      }
      if (reason.length > 2000) {
        res.status(400).json({ success: false, message: 'Escalation reason must be 2000 characters or fewer.' });
        return;
      }
      const incident = db.getIncidentById(req.params.id);
      if (!incident) {
        res.status(404).json({ success: false, message: 'Incident not found.' });
        return;
      }
      if (!canAccessIncident(req.user!, incident)) {
        res.status(403).json({ success: false, message: 'Forbidden.' });
        return;
      }
      if (req.user?.role === 'dept_officer' && req.user.departmentId && incident.assignedDepartmentId && incident.assignedDepartmentId !== req.user.departmentId) {
        res.status(403).json({ success: false, message: 'Forbidden: department boundary violation.' });
        return;
      }

      const escalated = db.escalateIncident(req.params.id, req.user!, reason.trim());
      res.json({
        success: true,
        message: `Incident ${req.params.id} escalated to P1_CRITICAL priority.`,
        data: escalated
      });
    } catch (err: any) {
      const msg = process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message;
      res.status(400).json({
        success: false,
        message: msg
      });
    }
  }
);

export default router;









