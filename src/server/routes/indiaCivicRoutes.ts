// SCIP Backend - India Civic Intelligence Routes
// Endpoints: /api/india/civic/*
// Maps municipal report categories to Indian government schemes, Urban Local
// Body types, and India-specific escalation matrices for civic issue resolution.

import { Router, Response } from 'express';
import { db } from '../../database/index.js';
import { authenticate, AuthenticatedRequest, requirePermission } from '../middleware/auth.js';
import {
  ReportCategory,
  UrgencyLevel,
  CivicScheme,
  CivicEscalationLevel,
  PinCodeJurisdiction,
  IndiaCivicIntelligence,
  UrbanLocalBody,
  UlbType
} from '../../types/scip.js';
import {
  getSchemesForCategory,
  getPrimaryScheme,
  getEscalationPath,
  getRecommendedAuthority,
  resolveJurisdictionByPinCode,
  determineUlbType,
  generateIndiaCivicIntelligence,
  CIVIC_SCHEMES,
  ESCALATION_MATRIX
} from '../../ai/indiaCivicIntelligence.js';

const router = Router();

// In-memory ULB registry (dev/local). Populated from admin localities on demand.
const ulbRegistry = new Map<string, UrbanLocalBody>();

// GET /api/india/civic/schemes — list all civic schemes
router.get('/civic/schemes', authenticate, requirePermission('intelligence.read'), async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { category, active } = _req.query;
  let schemes = CIVIC_SCHEMES;
  if (active !== undefined) {
    schemes = schemes.filter(s => s.isActive === (active === 'true'));
  }
  if (category) {
    schemes = schemes.filter(s => s.applicableReportCategories.includes(category as ReportCategory));
  }
  res.json({ success: true, data: schemes, meta: { total: schemes.length } });
});

// GET /api/india/civic/schemes/:category — schemes applicable to a report category
router.get('/civic/schemes/:category', authenticate, requirePermission('intelligence.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const category = req.params.category as ReportCategory;
  const validCategories: ReportCategory[] = [
    'Water & Drainage', 'Roads & Traffic', 'Public Sanitation', 'Power & Lighting',
    'Parks & Environment', 'Structural Safety', 'Public Health', 'Noise & Disturbance'
  ];
  if (!validCategories.includes(category)) {
    res.status(400).json({ success: false, message: 'Invalid report category.', errors: ['Invalid category.'] });
    return;
  }
  const schemes = getSchemesForCategory(category);
  const primary = getPrimaryScheme(category);
  res.json({ success: true, data: { category, schemes, primaryScheme: primary ?? null }, meta: { total: schemes.length } });
});

// GET /api/india/civic/escalation-path — escalation path for category + severity
router.get('/civic/escalation-path', authenticate, requirePermission('intelligence.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { category, severity } = req.query;
  if (!category || typeof category !== 'string') {
    res.status(400).json({ success: false, message: 'category query parameter is required.', errors: ['Missing category.'] });
    return;
  }
  const validCategories: ReportCategory[] = [
    'Water & Drainage', 'Roads & Traffic', 'Public Sanitation', 'Power & Lighting',
    'Parks & Environment', 'Structural Safety', 'Public Health', 'Noise & Disturbance'
  ];
  if (!validCategories.includes(category as ReportCategory)) {
    res.status(400).json({ success: false, message: 'Invalid report category.', errors: ['Invalid category.'] });
    return;
  }
  const sev = (severity || 'medium') as UrgencyLevel;
  const validSeverities: UrgencyLevel[] = ['low', 'medium', 'high', 'critical'];
  if (!validSeverities.includes(sev)) {
    res.status(400).json({ success: false, message: 'Invalid severity level.', errors: ['Invalid severity.'] });
    return;
  }
  const path = getEscalationPath(category as ReportCategory, sev);
  const authority = getRecommendedAuthority(category as ReportCategory, sev);
  res.json({ success: true, data: { category, severity: sev, escalationPath: path, recommendedAuthority: authority }, meta: { total: path.length } });
});

// GET /api/india/civic/jurisdiction/pincode/:pin — resolve jurisdiction from PIN code
router.get('/civic/jurisdiction/pincode/:pin', authenticate, requirePermission('location.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const pin = req.params.pin;
  const PIN_CODE_RE = /^[1-9][0-9]{5}$/;
  if (!PIN_CODE_RE.test(pin)) {
    res.status(400).json({ success: false, message: 'PIN code must be a six-digit Indian PIN code.', errors: ['Invalid PIN code.'] });
    return;
  }

  // Build locality lookup from admin data
  const allLocalities = await db.getAdminLocalities();
  const localities = new Map<string, { id: string; name: string; stateId: string; districtId: string; subDistrictId?: string; blockId?: string; pinCode?: string; ulbId?: string; ulbType?: 'municipal_corporation' | 'municipality' | 'nagar_panchayat' | 'cantonment_board' | 'notified_area' }>();
  for (const loc of allLocalities) {
    localities.set(loc.id, {
      id: loc.id,
      name: loc.name,
      stateId: loc.stateId,
      districtId: loc.districtId,
      subDistrictId: loc.subDistrictId,
      blockId: loc.blockId,
      pinCode: loc.pinCode,
      ulbId: undefined,
      ulbType: undefined
    });
  }

  const jurisdiction = resolveJurisdictionByPinCode(pin, { localities });
  if (!jurisdiction) {
    res.status(404).json({ success: false, message: `No jurisdiction found for PIN code ${pin}.`, errors: ['PIN code not found.'] });
    return;
  }

  // Enrich with state/district names
  const state = await db.getAdminStateById(jurisdiction.stateId);
  const district = await db.getAdminDistrictById(jurisdiction.districtId);
  let subDistrict: any;
  let block: any;
  let locality: any;
  if (jurisdiction.subDistrictId) subDistrict = await db.getAdminSubDistrictById(jurisdiction.subDistrictId);
  if (jurisdiction.blockId) block = await db.getAdminBlockById(jurisdiction.blockId);
  if (jurisdiction.localityId) locality = await db.getAdminLocalityById(jurisdiction.localityId);

  res.json({
    success: true,
    data: {
      pinCode: jurisdiction.pinCode,
      state: state ? { id: state.id, code: state.code, name: state.name, type: state.type } : null,
      district: district ? { id: district.id, code: district.code, name: district.name } : null,
      subDistrict: subDistrict ? { id: subDistrict.id, code: subDistrict.code, name: subDistrict.name } : null,
      block: block ? { id: block.id, code: block.code, name: block.name } : null,
      locality: locality ? { id: locality.id, code: locality.code, name: locality.name, type: locality.type } : null,
      ulbId: jurisdiction.ulbId,
      ulbType: jurisdiction.ulbType
    }
  });
});

// GET /api/india/civic/intelligence/:reportId — generate full India civic intelligence for a report
router.get('/civic/intelligence/:reportId', authenticate, requirePermission('intelligence.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const report = await db.getReportById(req.params.reportId);
  if (!report) {
    res.status(404).json({ success: false, message: 'Report not found.', errors: ['Report not found.'] });
    return;
  }

  // Build locality lookup
  const allLocalities = await db.getAdminLocalities();
  const localities = new Map<string, { id: string; name: string; stateId: string; districtId: string; subDistrictId?: string; blockId?: string; pinCode?: string; ulbId?: string; ulbType?: 'municipal_corporation' | 'municipality' | 'nagar_panchayat' | 'cantonment_board' | 'notified_area' }>();
  for (const loc of allLocalities) {
    localities.set(loc.id, {
      id: loc.id,
      name: loc.name,
      stateId: loc.stateId,
      districtId: loc.districtId,
      subDistrictId: loc.subDistrictId,
      blockId: loc.blockId,
      pinCode: loc.pinCode,
      ulbId: undefined,
      ulbType: undefined
    });
  }

  const intelligence = generateIndiaCivicIntelligence(
    report.id,
    report.category,
    report.urgency,
    report.pinCode,
    { localities: localities as any }
  );

  res.json({ success: true, data: intelligence });
});

// GET /api/india/civic/ulb-types — list Urban Local Body types
router.get('/civic/ulb-types', authenticate, requirePermission('intelligence.read'), async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  const ulbTypes: { type: string; label: string; description: string }[] = [
    { type: 'municipal_corporation', label: 'Municipal Corporation', description: 'ULB for large urban areas (population > 1 million)' },
    { type: 'municipality', label: 'Municipality', description: 'ULB for smaller urban areas' },
    { type: 'nagar_panchayat', label: 'Nagar Panchayat', description: 'ULB for semi-urban/rural transition areas' },
    { type: 'cantonment_board', label: 'Cantonment Board', description: 'ULB for military cantonment areas' },
    { type: 'notified_area', label: 'Notified Area Committee', description: 'ULB for newly developing areas' }
  ];
  res.json({ success: true, data: ulbTypes, meta: { total: ulbTypes.length } });
});

// GET /api/india/civic/ulb — list ULB registry
router.get('/civic/ulb', authenticate, requirePermission('intelligence.read'), async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { stateId, type } = _req.query;
  let ulbs = Array.from(ulbRegistry.values());
  if (stateId) ulbs = ulbs.filter(u => u.stateId === String(stateId));
  if (type) ulbs = ulbs.filter(u => u.type === type);
  res.json({ success: true, data: ulbs, meta: { total: ulbs.length } });
});

// POST /api/india/civic/ulb — register a ULB (admin only)
router.post('/civic/ulb', authenticate, requirePermission('location.manage'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id, code, name, type, stateId, districtId, localityId, pincode, headTitle, headName, email, phone, jurisdictionAreaSqKm, populationEstimate } = req.body || {};
    if (!id || !code || !name || !type || !stateId || !headTitle) {
      res.status(400).json({ success: false, message: 'id, code, name, type, stateId, and headTitle are required.', errors: ['Missing required fields.'] });
      return;
    }
    const validTypes: UlbType[] = ['municipal_corporation', 'municipality', 'nagar_panchayat', 'cantonment_board', 'notified_area'];
    if (!validTypes.includes(type)) {
      res.status(400).json({ success: false, message: 'Invalid ULB type.', errors: ['Invalid type.'] });
      return;
    }
    const ulb: UrbanLocalBody = {
      id,
      code: code.trim(),
      name: name.trim(),
      type,
      stateId: stateId.trim(),
      districtId: typeof districtId === 'string' ? districtId.trim() : undefined,
      localityId: typeof localityId === 'string' ? localityId.trim() : undefined,
      pincode: typeof pincode === 'string' ? pincode.trim() : undefined,
      headTitle: headTitle.trim(),
      headName: typeof headName === 'string' ? headName.trim() : undefined,
      email: typeof email === 'string' ? email.trim() : undefined,
      phone: typeof phone === 'string' ? phone.trim() : undefined,
      jurisdictionAreaSqKm: typeof jurisdictionAreaSqKm === 'number' ? jurisdictionAreaSqKm : undefined,
      populationEstimate: typeof populationEstimate === 'number' ? populationEstimate : undefined,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    ulbRegistry.set(id, ulb);
    res.status(201).json({ success: true, data: ulb });
  } catch (err: any) {
    res.status(400).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message });
  }
});

export default router;
