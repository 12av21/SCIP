// SCIP Backend - Incident Lifecycle & Human Review Routes

import { Router, Response } from 'express';
import { db } from '../../database/index.js';
import { authenticate, AuthenticatedRequest, requirePermission } from '../middleware/auth.js';
import { Incident } from '../../types/scip.js';

const router = Router();

async function canAccessIncident(user: any, incident: Incident): Promise<boolean> {
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

async function scopedIncidents(user: any, incidents: Incident[]): Promise<Incident[]> {
  const out: Incident[] = [];
  for (const i of incidents) {
    if (await canAccessIncident(user, i)) out.push(i);
  }
  return out;
}

router.get('/', authenticate, requirePermission('incident.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { status, category, priority } = req.query;
  let incidents = await db.getIncidents({
    status: status ? String(status) : undefined,
    category: category ? String(category) : undefined,
    priority: priority ? String(priority) : undefined
  });
  incidents = await scopedIncidents(req.user!, incidents);
  res.json({ success: true, data: incidents, meta: { total: incidents.length } });
});

// GET /api/incidents/jurisdiction — determine administrative jurisdiction from coordinates
router.get('/jurisdiction', authenticate, requirePermission('location.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { lat, lng } = req.query;
  const latitude = lat !== undefined ? Number(lat) : NaN;
  const longitude = lng !== undefined ? Number(lng) : NaN;

  if (!Number.isFinite(latitude) || latitude < -180 || latitude > 180 ||
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    res.status(400).json({ success: false, message: 'Valid latitude (-180 to 180) and longitude (-180 to 180) are required.' });
    return;
  }

  const jurisdiction = await db.findAdministrativeJurisdiction(latitude, longitude);
  res.json({
    success: true,
    data: { ...jurisdiction, coordinate: { latitude, longitude } },
    meta: {
      coordinate: { latitude, longitude },
      withinKnownBoundary: jurisdiction.withinKnownBoundary,
      recommendation: jurisdiction.withinKnownBoundary
        ? 'Complaint falls within known administrative boundary.'
        : 'Complaint falls outside known administrative boundary. Flag for authorized manual review.'
    }
  });
});

// GET /api/incidents/recommended-officers — recommend officers by geographic jurisdiction
router.get('/recommended-officers', authenticate, requirePermission('location.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { lat, lng, departmentId } = req.query;
  const latitude = lat !== undefined ? Number(lat) : NaN;
  const longitude = lng !== undefined ? Number(lng) : NaN;

  if (!Number.isFinite(latitude) || latitude < -180 || latitude > 180 ||
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    res.status(400).json({ success: false, message: 'Valid latitude and longitude are required.' });
    return;
  }

  const jurisdiction = await db.findAdministrativeJurisdiction(latitude, longitude);

  if (!jurisdiction.withinKnownBoundary) {
    res.json({
      success: true,
      data: [],
      meta: {
        coordinate: { latitude, longitude },
        withinKnownBoundary: false,
        message: 'No geographic jurisdiction match; officers cannot be recommended automatically.'
      }
    });
    return;
  }

  const officers = await db.getOfficersByJurisdiction({
    stateId: jurisdiction.stateId,
    districtId: jurisdiction.districtId,
    subDistrictId: jurisdiction.subDistrictId,
    blockId: jurisdiction.blockId,
    localityId: jurisdiction.localityId,
    departmentId: departmentId !== undefined ? String(departmentId) : undefined
  });

  res.json({
    success: true,
    data: officers.map(o => ({ id: o.id, name: o.name, departmentId: o.departmentId, departmentName: o.departmentName })),
    meta: {
      coordinate: { latitude, longitude },
      jurisdiction,
      withinKnownBoundary: true,
      officerCount: officers.length
    }
  });
});

// POST /api/incidents/:id/flag-review — flag complaint for authorized manual review
router.post('/:id/flag-review', authenticate, requirePermission('geoanalytics.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { reason, reviewType = 'geographic_boundary' } = req.body || {};
    const incidentId = req.params.id;
    if (typeof reason !== 'string' || !reason.trim()) {
      res.status(400).json({ success: false, message: 'Review reason is required.' });
      return;
    }

    const incident = await db.getIncidentById(incidentId);
    if (!incident) { res.status(404).json({ success: false, message: 'Incident not found.' }); return; }
    if (!(await canAccessIncident(req.user!, incident))) { res.status(403).json({ success: false, message: 'Forbidden.' }); return; }

    const jurisdiction = await db.findAdministrativeJurisdiction(incident.latitude, incident.longitude);

    await db.logAudit({
      action: 'SECURITY_EVENT', module: 'security',
      userId: req.user!.id, userEmail: req.user!.email, userRole: req.user!.role,
      ipAddress: req.ip || '127.0.0.1',
      details: `Incident ${incidentId} flagged for manual review (${reviewType}): ${reason.trim()}`,
      metadata: { incidentId, reviewType, withinKnownBoundary: jurisdiction.withinKnownBoundary, jurisdiction }
    });

    res.json({
      success: true,
      message: 'Incident flagged for authorized manual review.',
      data: { incidentId, reviewType, reason: reason.trim(), jurisdiction }
    });
  } catch (err: any) {
    const msg = process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message;
    res.status(400).json({ success: false, message: msg });
  }
});

router.get('/:id', authenticate, requirePermission('incident.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const incident = await db.getIncidentById(req.params.id);
  if (!incident) { res.status(404).json({ success: false, message: `Incident ${req.params.id} not found.` }); return; }
  if (!(await canAccessIncident(req.user!, incident))) { res.status(403).json({ success: false, message: 'Forbidden: not authorized to access this incident.' }); return; }

  let linkedReports = (await Promise.all(incident.reportIds.map(rid => db.getReportById(rid)))).filter((r): r is NonNullable<typeof r> => Boolean(r));
  if (req.user?.role === 'citizen') {
    linkedReports = linkedReports.filter(r => r.citizenId === req.user!.id);
  }
  if (req.user?.role === 'analyst') {
    linkedReports = linkedReports.map(r => { const { citizenName, citizenEmail, ...rest } = r as any; return rest; }) as any;
  }
  res.json({ success: true, data: { incident, linkedReports } });
});

router.post('/from-cluster', authenticate, requirePermission('incident.create'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { cluster } = req.body || {};
    if (!cluster || !Array.isArray(cluster.reportIds) || cluster.reportIds.length === 0) {
      res.status(400).json({ success: false, message: 'Valid cluster data with report IDs is required.' }); return;
    }
    if (!cluster.reportIds.every((id: any) => typeof id === 'string' && id.trim())) {
      res.status(400).json({ success: false, message: 'Cluster report IDs must be non-empty strings.' }); return;
    }
    for (const id of cluster.reportIds) {
      if (!(await db.getReportById(id))) {
        res.status(400).json({ success: false, message: 'Cluster contains unknown report IDs.', errors: ['Invalid cluster input.'] }); return;
      }
    }
    const newIncident = await db.createIncidentFromCluster(cluster, req.user!);
    res.status(201).json({ success: true, message: 'Potential incident created from cluster observation.', data: newIncident });
  } catch (err: any) {
    const msg = process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message;
    res.status(500).json({ success: false, message: 'Failed to create incident from cluster.', errors: [msg] });
  }
});

router.post('/:id/review', authenticate, requirePermission('incident.update'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const incident = await db.getIncidentById(req.params.id);
    if (!incident) { res.status(404).json({ success: false, message: 'Incident not found.' }); return; }
    if (!(await canAccessIncident(req.user!, incident))) { res.status(403).json({ success: false, message: 'Forbidden.' }); return; }
    if (req.user?.role === 'dept_officer' && req.user.departmentId && incident.assignedDepartmentId && incident.assignedDepartmentId !== req.user.departmentId) {
      res.status(403).json({ success: false, message: 'Forbidden: department boundary violation.' }); return;
    }
    if (req.user?.role === 'officer' && req.user.departmentId && incident.assignedDepartmentId && incident.assignedDepartmentId !== req.user.departmentId) {
      res.status(403).json({ success: false, message: 'Forbidden: department boundary violation.' }); return;
    }

    const { action, notes, departmentId, officerId } = req.body || {};
    if (!action || (action !== 'confirm' && action !== 'dismiss')) { res.status(400).json({ success: false, message: 'Action must be "confirm" or "dismiss".' }); return; }
    if (typeof notes !== 'string' || !notes.trim()) { res.status(400).json({ success: false, message: 'Review notes are required for administrative accountability.' }); return; }
    if (notes.length > 2000) { res.status(400).json({ success: false, message: 'Review notes must be 2000 characters or fewer.' }); return; }
    if (departmentId !== undefined && (typeof departmentId !== 'string' || departmentId.length > 64)) { res.status(400).json({ success: false, message: 'Invalid department ID.' }); return; }
    if (officerId !== undefined && (typeof officerId !== 'string' || officerId.length > 64)) { res.status(400).json({ success: false, message: 'Invalid officer ID.' }); return; }
    if (req.user?.role === 'dept_officer' && req.user.departmentId && departmentId && departmentId !== req.user.departmentId) {
      res.status(403).json({ success: false, message: 'Forbidden: department boundary violation.' }); return;
    }

    const updatedIncident = await db.reviewIncident(req.params.id, action, req.user!, notes.trim(), departmentId, officerId);
    res.json({ success: true, message: `Incident ${req.params.id} has been ${action === 'confirm' ? 'confirmed' : 'dismissed'} by human review.`, data: updatedIncident });
  } catch (err: any) {
    const msg = process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message;
    res.status(400).json({ success: false, message: msg, errors: [msg] });
  }
});

router.post('/:id/resolve', authenticate, requirePermission('incident.resolve'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { actionTaken, preventiveMeasures, costEstimate } = req.body || {};
    if (typeof actionTaken !== 'string' || actionTaken.trim().length < 5 || actionTaken.trim().length > 2000) {
      res.status(400).json({ success: false, message: 'Action taken description is required (5-2000 characters).' }); return;
    }
    if (preventiveMeasures !== undefined && (typeof preventiveMeasures !== 'string' || preventiveMeasures.length > 2000)) {
      res.status(400).json({ success: false, message: 'Preventive measures must be a string up to 2000 characters.' }); return;
    }
    const parsedCost = costEstimate === undefined || costEstimate === null || costEstimate === '' ? undefined : Number(costEstimate);
    if (parsedCost !== undefined && (!Number.isFinite(parsedCost) || parsedCost < 0)) {
      res.status(400).json({ success: false, message: 'Cost estimate must be a non-negative number.' }); return;
    }

    const existing = await db.getIncidentById(req.params.id);
    if (!existing) { res.status(404).json({ success: false, message: `Incident ${req.params.id} not found.` }); return; }
    if (!(await canAccessIncident(req.user!, existing))) { res.status(403).json({ success: false, message: 'Forbidden.' }); return; }
    if (req.user?.role === 'dept_officer' && req.user.departmentId && existing.assignedDepartmentId && existing.assignedDepartmentId !== req.user.departmentId) {
      res.status(403).json({ success: false, message: 'Forbidden: department boundary violation.' }); return;
    }
    if (existing.status === 'potential' || existing.status === 'dismissed') {
      res.status(400).json({ success: false, message: `Illegal workflow transition: Cannot resolve incident in "${existing.status}" status. It must be confirmed by human authority first.`, errors: ['Invalid lifecycle status transition.'] }); return;
    }

    const resolved = await db.resolveIncident(req.params.id, req.user!, {
      actionTaken: actionTaken.trim(),
      preventiveMeasures: typeof preventiveMeasures === 'string' ? preventiveMeasures.trim() : undefined,
      costEstimate: parsedCost
    });
    res.json({ success: true, message: `Incident ${req.params.id} has been marked resolved.`, data: resolved });
  } catch (err: any) {
    const msg = process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message;
    res.status(400).json({ success: false, message: msg, errors: [msg] });
  }
});

router.get('/:id/inspections', authenticate, requirePermission('inspection.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const incident = await db.getIncidentById(req.params.id);
  if (!incident) { res.status(404).json({ success: false, message: 'Incident not found.' }); return; }
  if (!(await canAccessIncident(req.user!, incident))) { res.status(403).json({ success: false, message: 'Forbidden.' }); return; }
  const list = await db.getInspections(req.params.id);
  res.json({ success: true, data: list });
});

router.post('/:id/inspection', authenticate, requirePermission('inspection.create'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { verifiedStatus, observations, checklist, evidencePhotos, recommendedAction, inspectionDate } = req.body || {};
    const allowedStatuses = ['verified_match', 'disputed', 'partial'];
    if (typeof observations !== 'string' || !observations.trim() || observations.length > 2000 || !allowedStatuses.includes(verifiedStatus)) {
      res.status(400).json({ success: false, message: 'Valid observations (max 2000 chars) and verified status are mandatory.' }); return;
    }
    if (recommendedAction !== undefined && (typeof recommendedAction !== 'string' || recommendedAction.length > 2000)) {
      res.status(400).json({ success: false, message: 'Recommended action must be 2000 characters or fewer.' }); return;
    }
    if (inspectionDate !== undefined && (typeof inspectionDate !== 'string' || inspectionDate.length > 64)) {
      res.status(400).json({ success: false, message: 'Inspection date must be a string up to 64 characters.' }); return;
    }
    const safeChecklist = {
      physicalVerification: Boolean(checklist?.physicalVerification),
      safetyHazardAssessed: Boolean(checklist?.safetyHazardAssessed),
      structuralDamageChecked: Boolean(checklist?.structuralDamageChecked),
      utilityImpactVerified: Boolean(checklist?.utilityImpactVerified)
    };

    const incident = await db.getIncidentById(req.params.id);
    if (!incident) { res.status(404).json({ success: false, message: 'Incident not found.' }); return; }
    if (!(await canAccessIncident(req.user!, incident))) { res.status(403).json({ success: false, message: 'Forbidden.' }); return; }
    if (req.user?.role === 'officer' && incident.assignedOfficerId && incident.assignedOfficerId !== req.user.id) {
      res.status(403).json({ success: false, message: 'Forbidden: field officers may only inspect incidents assigned to them.' }); return;
    }

    const inspection = await db.createInspection({
      incidentId: req.params.id,
      officerId: req.user!.id,
      officerName: req.user!.name,
      verifiedStatus,
      observations: observations.trim(),
      checklist: safeChecklist,
      evidencePhotos: Array.isArray(evidencePhotos) ? evidencePhotos.filter((x: any) => typeof x === 'string' && x.length <= 2048).slice(0, 10) : [],
      recommendedAction: typeof recommendedAction === 'string' ? recommendedAction.trim() : '',
      inspectionDate: typeof inspectionDate === 'string' ? inspectionDate : new Date().toISOString()
    }, req.user!);

    res.status(201).json({ success: true, message: 'Field inspection report submitted successfully.', data: inspection });
  } catch (err: any) {
    const msg = process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message;
    res.status(400).json({ success: false, message: msg });
  }
});

router.post('/:id/verify-inspection', authenticate, requirePermission('inspection.verify'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { inspectionId, departmentRemarks, isApproved } = req.body || {};
    if (typeof inspectionId !== 'string' || !inspectionId.trim()) { res.status(400).json({ success: false, message: 'Inspection ID is required.' }); return; }
    if (typeof departmentRemarks !== 'string' || !departmentRemarks.trim() || departmentRemarks.length > 1000) { res.status(400).json({ success: false, message: 'Valid department remarks are required.' }); return; }
    if (typeof isApproved !== 'boolean') { res.status(400).json({ success: false, message: 'Approval decision must be a boolean.' }); return; }

    const incident = await db.getIncidentById(req.params.id);
    if (!incident) { res.status(404).json({ success: false, message: 'Incident not found.' }); return; }
    if (!(await canAccessIncident(req.user!, incident))) { res.status(403).json({ success: false, message: 'Forbidden.' }); return; }
    const inspection = await db.getInspectionById(inspectionId.trim());
    if (!inspection || inspection.incidentId !== incident.id) { res.status(400).json({ success: false, message: 'Inspection does not belong to this incident.' }); return; }
    if (incident.status === 'resolved' || incident.status === 'dismissed' || incident.status === 'closed') {
      res.status(400).json({ success: false, message: 'Cannot verify inspections for a closed incident.' }); return;
    }
    if (req.user?.role === 'dept_officer' && req.user.departmentId) {
      if (incident.assignedDepartmentId && incident.assignedDepartmentId !== req.user.departmentId) {
        res.status(403).json({ success: false, message: `Forbidden: You can only verify inspections within your department (${req.user.departmentId}).`, errors: ['Department boundary isolation violation.'] }); return;
      }
    }

    const verified = await db.verifyInspection(inspectionId.trim(), departmentRemarks.trim(), req.user!, isApproved);
    res.json({ success: true, message: `Inspection ${inspectionId} has been ${isApproved ? 'approved' : 'rejected'}.`, data: verified });
  } catch (err: any) {
    const msg = process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message;
    res.status(400).json({ success: false, message: msg });
  }
});

router.post('/:id/assign', authenticate, requirePermission('incident.assign'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { departmentId, officerId, officerName, notes } = req.body || {};
    if (typeof officerId !== 'string' || !officerId.trim() || typeof officerName !== 'string' || !officerName.trim()) {
      res.status(400).json({ success: false, message: 'Officer ID and name are required for assignment.' }); return;
    }
    if (officerId.length > 64 || officerName.trim().length > 120) { res.status(400).json({ success: false, message: 'Officer ID or name exceeds allowed length.' }); return; }
    if (notes !== undefined && (typeof notes !== 'string' || notes.length > 500)) { res.status(400).json({ success: false, message: 'Invalid assignment notes.' }); return; }

    let targetDeptId = typeof departmentId === 'string' && departmentId.trim() ? departmentId.trim() : req.user?.departmentId;
    if (!targetDeptId) { res.status(400).json({ success: false, message: 'Target department is required.' }); return; }

    const incident = await db.getIncidentById(req.params.id);
    if (!incident) { res.status(404).json({ success: false, message: 'Incident not found.' }); return; }
    if (!(await canAccessIncident(req.user!, incident))) { res.status(403).json({ success: false, message: 'Forbidden.' }); return; }
    if (incident.status === 'resolved' || incident.status === 'dismissed' || incident.status === 'closed') { res.status(400).json({ success: false, message: 'Cannot assign a closed incident.' }); return; }
    if (req.user?.role === 'dept_officer' && req.user.departmentId) {
      if (targetDeptId !== req.user.departmentId) {
        res.status(403).json({ success: false, message: 'Forbidden: Department desk officers can only manage assignments within their own department.', errors: ['Department boundary isolation violation.'] }); return;
      }
      if (incident.assignedDepartmentId && incident.assignedDepartmentId !== req.user.departmentId) {
        res.status(403).json({ success: false, message: 'Forbidden: department boundary violation.' }); return;
      }
    }

    // Geographic jurisdiction validation: officer must be authorized for the incident's
    // administrative location (state/district/sub-district/block/locality).
    const assignee = await db.getUserById(officerId.trim());
    if (!assignee) { res.status(404).json({ success: false, message: 'Assignee officer not found.' }); return; }
    if (assignee.role !== 'officer') { res.status(400).json({ success: false, message: 'Assignments may only target field officers.' }); return; }

    const jurisdiction = await db.findAdministrativeJurisdiction(incident.latitude, incident.longitude);
    if (jurisdiction.withinKnownBoundary) {
      const jStates = assignee.jurisdictionStateIds || [];
      const jDistricts = assignee.jurisdictionDistrictIds || [];
      const jSubDistricts = assignee.jurisdictionSubDistrictIds || [];
      const jBlocks = assignee.jurisdictionBlockIds || [];
      const jLocalities = assignee.jurisdictionLocalityIds || [];

      const coversState = !jurisdiction.stateId || jStates.includes(jurisdiction.stateId);
      const coversDistrict = !jurisdiction.districtId || jDistricts.includes(jurisdiction.districtId);
      const coversSubDistrict = !jurisdiction.subDistrictId || jSubDistricts.includes(jurisdiction.subDistrictId);
      const coversBlock = !jurisdiction.blockId || jBlocks.includes(jurisdiction.blockId);
      const coversLocality = !jurisdiction.localityId || jLocalities.includes(jurisdiction.localityId);

      const jurisdictionMatch = coversState && coversDistrict && coversSubDistrict && coversBlock && coversLocality;
      if (!jurisdictionMatch) {
        res.status(403).json({
          success: false,
          message: 'Forbidden: Officer geographic jurisdiction does not cover the incident location.',
          errors: ['Geographic jurisdiction mismatch. Officer is not authorized for this administrative area.']
        });
        return;
      }
    }

    const updated = await db.assignIncidentOfficer(req.params.id, targetDeptId, officerId.trim(), officerName.trim(), req.user!, typeof notes === 'string' ? notes.trim() : '');
    res.json({ success: true, message: `Field officer ${officerName.trim()} assigned to incident.`, data: updated });
  } catch (err: any) {
    const msg = process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message;
    res.status(400).json({ success: false, message: msg });
  }
});

router.post('/:id/escalate', authenticate, requirePermission('incident.escalate'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { reason } = req.body || {};
    if (typeof reason !== 'string' || !reason.trim()) { res.status(400).json({ success: false, message: 'Official reason for incident escalation is mandatory.' }); return; }
    if (reason.length > 2000) { res.status(400).json({ success: false, message: 'Escalation reason must be 2000 characters or fewer.' }); return; }
    const incident = await db.getIncidentById(req.params.id);
    if (!incident) { res.status(404).json({ success: false, message: 'Incident not found.' }); return; }
    if (!(await canAccessIncident(req.user!, incident))) { res.status(403).json({ success: false, message: 'Forbidden.' }); return; }
    if (req.user?.role === 'dept_officer' && req.user.departmentId && incident.assignedDepartmentId && incident.assignedDepartmentId !== req.user.departmentId) {
      res.status(403).json({ success: false, message: 'Forbidden: department boundary violation.' }); return;
    }
    const escalated = await db.escalateIncident(req.params.id, req.user!, reason.trim());
    res.json({ success: true, message: `Incident ${req.params.id} escalated to P1_CRITICAL priority.`, data: escalated });
  } catch (err: any) {
    const msg = process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message;
    res.status(400).json({ success: false, message: msg });
  }
});

router.post('/:id/close', authenticate, requirePermission('incident.resolve'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { notes } = req.body || {};
    if (notes !== undefined && (typeof notes !== 'string' || notes.length > 2000)) { res.status(400).json({ success: false, message: 'Close notes must be a string up to 2000 characters.' }); return; }
    const incident = await db.getIncidentById(req.params.id);
    if (!incident) { res.status(404).json({ success: false, message: 'Incident not found.' }); return; }
    if (!(await canAccessIncident(req.user!, incident))) { res.status(403).json({ success: false, message: 'Forbidden.' }); return; }
    if (req.user?.role === 'dept_officer' && req.user.departmentId && incident.assignedDepartmentId && incident.assignedDepartmentId !== req.user.departmentId) {
      res.status(403).json({ success: false, message: 'Forbidden: department boundary violation.' }); return;
    }
    if (req.user?.role === 'officer' && req.user.departmentId && incident.assignedDepartmentId && incident.assignedDepartmentId !== req.user.departmentId) {
      res.status(403).json({ success: false, message: 'Forbidden: department boundary violation.' }); return;
    }
    if (incident.status !== 'resolved') {
      res.status(400).json({ success: false, message: `Only resolved incidents can be closed. Current status: ${incident.status}` }); return;
    }
    const closed = await db.closeIncident(req.params.id, req.user!, notes?.trim());
    res.json({ success: true, message: `Incident ${req.params.id} has been closed.`, data: closed });
  } catch (err: any) {
    const msg = process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message;
    res.status(400).json({ success: false, message: msg });
  }
});

router.post('/:id/reopen', authenticate, requirePermission('incident.update'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { reason } = req.body || {};
    if (typeof reason !== 'string' || !reason.trim()) { res.status(400).json({ success: false, message: 'Official reason for reopening is mandatory.' }); return; }
    if (reason.length > 2000) { res.status(400).json({ success: false, message: 'Reopening reason must be 2000 characters or fewer.' }); return; }
    const incident = await db.getIncidentById(req.params.id);
    if (!incident) { res.status(404).json({ success: false, message: 'Incident not found.' }); return; }
    if (!(await canAccessIncident(req.user!, incident))) { res.status(403).json({ success: false, message: 'Forbidden.' }); return; }
    if (req.user?.role === 'dept_officer' && req.user.departmentId && incident.assignedDepartmentId && incident.assignedDepartmentId !== req.user.departmentId) {
      res.status(403).json({ success: false, message: 'Forbidden: department boundary violation.' }); return;
    }
    if (req.user?.role === 'officer' && req.user.departmentId && incident.assignedDepartmentId && incident.assignedDepartmentId !== req.user.departmentId) {
      res.status(403).json({ success: false, message: 'Forbidden: department boundary violation.' }); return;
    }
    if (incident.status !== 'resolved' && incident.status !== 'closed') {
      res.status(400).json({ success: false, message: `Only resolved or closed incidents can be reopened. Current status: ${incident.status}` }); return;
    }
    const reopened = await db.reopenIncident(req.params.id, req.user!, reason.trim());
    res.json({ success: true, message: `Incident ${req.params.id} has been reopened.`, data: reopened });
  } catch (err: any) {
    const msg = process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message;
    res.status(400).json({ success: false, message: msg });
  }
});

router.post('/:id/verify-resolution', authenticate, requirePermission('incident.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { verified, comments } = req.body || {};
    if (typeof verified !== 'boolean') { res.status(400).json({ success: false, message: 'Verification decision (boolean) is required.' }); return; }
    if (comments !== undefined && (typeof comments !== 'string' || comments.length > 1000)) { res.status(400).json({ success: false, message: 'Comments must be a string up to 1000 characters.' }); return; }
    const incident = await db.getIncidentById(req.params.id);
    if (!incident) { res.status(404).json({ success: false, message: 'Incident not found.' }); return; }
    if (!(await canAccessIncident(req.user!, incident))) { res.status(403).json({ success: false, message: 'Forbidden.' }); return; }
    if (req.user?.role !== 'citizen') {
      res.status(403).json({ success: false, message: 'Only citizens can verify resolutions for their own reports.' }); return;
    }
    // Check citizen owns one of the linked reports
    const report = (await Promise.all(incident.reportIds.map(rid => db.getReportById(rid)))).find(r => r?.citizenId === req.user!.id);
    if (!report) { res.status(403).json({ success: false, message: 'Citizen not associated with this incident.' }); return; }
    if (incident.status !== 'resolved' && incident.status !== 'closed') {
      res.status(400).json({ success: false, message: `Resolution can only be verified for resolved or closed incidents. Current status: ${incident.status}` }); return;
    }
    const verifiedIncident = await db.verifyResolution(req.params.id, req.user!.id, verified, comments?.trim());
    res.json({ success: true, message: `Resolution ${verified ? 'verified' : 'disputed'} by citizen.`, data: verifiedIncident });
  } catch (err: any) {
    const msg = process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message;
    res.status(400).json({ success: false, message: msg });
  }
});

export default router;