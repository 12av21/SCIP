// SCIP Backend - India Administrative Location Routes
// Endpoints: /api/locations/*
// Supports India → State/UT → District → Sub-district → Block → Locality hierarchy.

import { Router, Response } from 'express';
import { db } from '../../database/index.js';
import { authenticate, AuthenticatedRequest, requirePermission } from '../middleware/auth.js';
import {
  AdminState, AdminDistrict, AdminSubDistrict, AdminBlock, AdminLocality,
  AdministrativeBoundary, UserRole, UserPermission
} from '../../types/scip.js';

const router = Router();

// PIN code validation: six-digit Indian PIN code
const PIN_CODE_RE = /^[1-9][0-9]{5}$/;
function isValidPinCode(pin: string | undefined): boolean {
  return typeof pin === 'string' && PIN_CODE_RE.test(pin);
}

function safeAdminState(input: any): Partial<AdminState> {
  const out: Partial<AdminState> = {};
  if (typeof input.code === 'string') out.code = input.code.trim();
  if (typeof input.name === 'string') out.name = input.name.trim();
  if (input.type === 'state' || input.type === 'union_territory') out.type = input.type;
  if (typeof input.isActive === 'boolean') out.isActive = input.isActive;
  return out;
}

function safeAdminDistrict(input: any): Partial<AdminDistrict> {
  const out: Partial<AdminDistrict> = {};
  if (typeof input.code === 'string') out.code = input.code.trim();
  if (typeof input.name === 'string') out.name = input.name.trim();
  if (typeof input.stateId === 'string') out.stateId = input.stateId.trim();
  if (typeof input.isActive === 'boolean') out.isActive = input.isActive;
  return out;
}

function safeAdminSubDistrict(input: any): Partial<AdminSubDistrict> {
  const out: Partial<AdminSubDistrict> = {};
  if (typeof input.code === 'string') out.code = input.code.trim();
  if (typeof input.name === 'string') out.name = input.name.trim();
  if (typeof input.districtId === 'string') out.districtId = input.districtId.trim();
  if (typeof input.stateId === 'string') out.stateId = input.stateId.trim();
  if (typeof input.isActive === 'boolean') out.isActive = input.isActive;
  return out;
}

function safeAdminBlock(input: any): Partial<AdminBlock> {
  const out: Partial<AdminBlock> = {};
  if (typeof input.code === 'string') out.code = input.code.trim();
  if (typeof input.name === 'string') out.name = input.name.trim();
  if (typeof input.subDistrictId === 'string') out.subDistrictId = input.subDistrictId.trim();
  if (typeof input.districtId === 'string') out.districtId = input.districtId.trim();
  if (typeof input.stateId === 'string') out.stateId = input.stateId.trim();
  if (typeof input.isActive === 'boolean') out.isActive = input.isActive;
  return out;
}

function safeAdminLocality(input: any): Partial<AdminLocality> {
  const out: Partial<AdminLocality> = {};
  if (typeof input.code === 'string') out.code = input.code.trim();
  if (typeof input.name === 'string') out.name = input.name.trim();
  if (typeof input.blockId === 'string') out.blockId = input.blockId.trim();
  if (typeof input.subDistrictId === 'string') out.subDistrictId = input.subDistrictId.trim();
  if (typeof input.districtId === 'string') out.districtId = input.districtId.trim();
  if (typeof input.stateId === 'string') out.stateId = input.stateId.trim();
  if (input.type === 'village' || input.type === 'town' || input.type === 'urban_locality' || input.type === 'city') out.type = input.type;
  if (isValidPinCode(input.pinCode)) out.pinCode = input.pinCode;
  if (typeof input.isActive === 'boolean') out.isActive = input.isActive;
  return out;
}

// GET /api/locations/states — list states/UTs
router.get('/states', authenticate, requirePermission('location.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { isActive, type } = req.query;
  const filters: any = {};
  if (isActive !== undefined) filters.isActive = isActive === 'true';
  if (type === 'state' || type === 'union_territory') filters.type = type;
  const states = await db.getAdminStates(filters);
  res.json({ success: true, data: states, meta: { total: states.length } });
});

// GET /api/locations/states/:id
router.get('/states/:id', authenticate, requirePermission('location.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const state = await db.getAdminStateById(req.params.id);
  if (!state) {
    res.status(404).json({ success: false, message: 'State not found.' });
    return;
  }
  res.json({ success: true, data: state });
});

// POST /api/locations/states — admin only
router.post('/states', authenticate, requirePermission('location.manage'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const data = safeAdminState(req.body);
    if (!data.code || !data.name || !data.type) {
      res.status(400).json({ success: false, message: 'code, name, and type are required.' });
      return;
    }
    const state = await db.createAdminState(data as Omit<AdminState, 'id' | 'createdAt' | 'updatedAt'>, req.user!);
    res.status(201).json({ success: true, data: state });
  } catch (err: any) {
    res.status(400).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message });
  }
});

// PUT /api/locations/states/:id — admin only
router.put('/states/:id', authenticate, requirePermission('location.manage'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const updates = safeAdminState(req.body);
    const state = await db.updateAdminState(req.params.id, updates as Partial<AdminState>, req.user!);
    res.json({ success: true, data: state });
  } catch (err: any) {
    res.status(404).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message });
  }
});

// DELETE /api/locations/states/:id — admin only
router.delete('/states/:id', authenticate, requirePermission('location.manage'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await db.deleteAdminState(req.params.id, req.user!);
    res.json({ success: true, message: 'State deleted.' });
  } catch (err: any) {
    res.status(404).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message });
  }
});

// GET /api/locations/districts — list districts (filter by stateId)
router.get('/districts', authenticate, requirePermission('location.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { stateId, isActive } = req.query;
  const filters: any = {};
  if (stateId) filters.stateId = String(stateId);
  if (isActive !== undefined) filters.isActive = isActive === 'true';
  const districts = await db.getAdminDistricts(filters);
  res.json({ success: true, data: districts, meta: { total: districts.length } });
});

// GET /api/locations/districts/:id
router.get('/districts/:id', authenticate, requirePermission('location.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const district = await db.getAdminDistrictById(req.params.id);
  if (!district) {
    res.status(404).json({ success: false, message: 'District not found.' });
    return;
  }
  res.json({ success: true, data: district });
});

// POST /api/locations/districts — admin only
router.post('/districts', authenticate, requirePermission('location.manage'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const data = safeAdminDistrict(req.body);
    if (!data.code || !data.name || !data.stateId) {
      res.status(400).json({ success: false, message: 'code, name, and stateId are required.' });
      return;
    }
    const district = await db.createAdminDistrict(data as Omit<AdminDistrict, 'id' | 'createdAt' | 'updatedAt'>, req.user!);
    res.status(201).json({ success: true, data: district });
  } catch (err: any) {
    res.status(400).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message });
  }
});

// PUT /api/locations/districts/:id — admin only
router.put('/districts/:id', authenticate, requirePermission('location.manage'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const updates = safeAdminDistrict(req.body);
    const district = await db.updateAdminDistrict(req.params.id, updates as Partial<AdminDistrict>, req.user!);
    res.json({ success: true, data: district });
  } catch (err: any) {
    res.status(404).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message });
  }
});

// DELETE /api/locations/districts/:id — admin only
router.delete('/districts/:id', authenticate, requirePermission('location.manage'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await db.deleteAdminDistrict(req.params.id, req.user!);
    res.json({ success: true, message: 'District deleted.' });
  } catch (err: any) {
    res.status(404).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message });
  }
});

// GET /api/locations/sub-districts — list sub-districts (filter by districtId/stateId)
router.get('/sub-districts', authenticate, requirePermission('location.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { districtId, stateId, isActive } = req.query;
  const filters: any = {};
  if (districtId) filters.districtId = String(districtId);
  if (stateId) filters.stateId = String(stateId);
  if (isActive !== undefined) filters.isActive = isActive === 'true';
  const subDistricts = await db.getAdminSubDistricts(filters);
  res.json({ success: true, data: subDistricts, meta: { total: subDistricts.length } });
});

// GET /api/locations/sub-districts/:id
router.get('/sub-districts/:id', authenticate, requirePermission('location.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const sd = await db.getAdminSubDistrictById(req.params.id);
  if (!sd) {
    res.status(404).json({ success: false, message: 'Sub-district not found.' });
    return;
  }
  res.json({ success: true, data: sd });
});

// POST /api/locations/sub-districts — admin only
router.post('/sub-districts', authenticate, requirePermission('location.manage'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const data = safeAdminSubDistrict(req.body);
    if (!data.code || !data.name || !data.districtId || !data.stateId) {
      res.status(400).json({ success: false, message: 'code, name, districtId, and stateId are required.' });
      return;
    }
    const sd = await db.createAdminSubDistrict(data as Omit<AdminSubDistrict, 'id' | 'createdAt' | 'updatedAt'>, req.user!);
    res.status(201).json({ success: true, data: sd });
  } catch (err: any) {
    res.status(400).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message });
  }
});

// PUT /api/locations/sub-districts/:id — admin only
router.put('/sub-districts/:id', authenticate, requirePermission('location.manage'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const updates = safeAdminSubDistrict(req.body);
    const sd = await db.updateAdminSubDistrict(req.params.id, updates as Partial<AdminSubDistrict>, req.user!);
    res.json({ success: true, data: sd });
  } catch (err: any) {
    res.status(404).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message });
  }
});

// DELETE /api/locations/sub-districts/:id — admin only
router.delete('/sub-districts/:id', authenticate, requirePermission('location.manage'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await db.deleteAdminSubDistrict(req.params.id, req.user!);
    res.json({ success: true, message: 'Sub-district deleted.' });
  } catch (err: any) {
    res.status(404).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message });
  }
});

// GET /api/locations/blocks — list blocks
router.get('/blocks', authenticate, requirePermission('location.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { subDistrictId, districtId, stateId, isActive } = req.query;
  const filters: any = {};
  if (subDistrictId) filters.subDistrictId = String(subDistrictId);
  if (districtId) filters.districtId = String(districtId);
  if (stateId) filters.stateId = String(stateId);
  if (isActive !== undefined) filters.isActive = isActive === 'true';
  const blocks = await db.getAdminBlocks(filters);
  res.json({ success: true, data: blocks, meta: { total: blocks.length } });
});

// GET /api/locations/blocks/:id
router.get('/blocks/:id', authenticate, requirePermission('location.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const block = await db.getAdminBlockById(req.params.id);
  if (!block) {
    res.status(404).json({ success: false, message: 'Block not found.' });
    return;
  }
  res.json({ success: true, data: block });
});

// POST /api/locations/blocks — admin only
router.post('/blocks', authenticate, requirePermission('location.manage'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const data = safeAdminBlock(req.body);
    if (!data.code || !data.name || !data.subDistrictId || !data.districtId || !data.stateId) {
      res.status(400).json({ success: false, message: 'code, name, subDistrictId, districtId, and stateId are required.' });
      return;
    }
    const block = await db.createAdminBlock(data as Omit<AdminBlock, 'id' | 'createdAt' | 'updatedAt'>, req.user!);
    res.status(201).json({ success: true, data: block });
  } catch (err: any) {
    res.status(400).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message });
  }
});

// PUT /api/locations/blocks/:id — admin only
router.put('/blocks/:id', authenticate, requirePermission('location.manage'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const updates = safeAdminBlock(req.body);
    const block = await db.updateAdminBlock(req.params.id, updates as Partial<AdminBlock>, req.user!);
    res.json({ success: true, data: block });
  } catch (err: any) {
    res.status(404).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message });
  }
});

// DELETE /api/locations/blocks/:id — admin only
router.delete('/blocks/:id', authenticate, requirePermission('location.manage'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await db.deleteAdminBlock(req.params.id, req.user!);
    res.json({ success: true, message: 'Block deleted.' });
  } catch (err: any) {
    res.status(404).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message });
  }
});

// GET /api/locations/localities — list localities (filter by block/subDistrict/district/state/type)
router.get('/localities', authenticate, requirePermission('location.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { blockId, subDistrictId, districtId, stateId, type, isActive } = req.query;
  const filters: any = {};
  if (blockId) filters.blockId = String(blockId);
  if (subDistrictId) filters.subDistrictId = String(subDistrictId);
  if (districtId) filters.districtId = String(districtId);
  if (stateId) filters.stateId = String(stateId);
  if (type === 'village' || type === 'town' || type === 'urban_locality' || type === 'city') filters.type = type;
  if (isActive !== undefined) filters.isActive = isActive === 'true';
  const localities = await db.getAdminLocalities(filters);
  res.json({ success: true, data: localities, meta: { total: localities.length } });
});

// GET /api/locations/localities/:id
router.get('/localities/:id', authenticate, requirePermission('location.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const locality = await db.getAdminLocalityById(req.params.id);
  if (!locality) {
    res.status(404).json({ success: false, message: 'Locality not found.' });
    return;
  }
  res.json({ success: true, data: locality });
});

// POST /api/locations/localities — admin only
router.post('/localities', authenticate, requirePermission('location.manage'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const data = safeAdminLocality(req.body);
    if (!data.code || !data.name || !data.blockId || !data.subDistrictId || !data.districtId || !data.stateId || !data.type) {
      res.status(400).json({ success: false, message: 'code, name, blockId, subDistrictId, districtId, stateId, and type are required.' });
      return;
    }
    // Validate PIN code if provided
    const pinInput = (req.body as any).pinCode;
    if (pinInput !== undefined && pinInput !== null && pinInput !== '' && !isValidPinCode(pinInput)) {
      res.status(400).json({ success: false, message: 'PIN code must be a six-digit Indian PIN code.', errors: ['Invalid PIN code.'] });
      return;
    }
    const locality = await db.createAdminLocality(data as Omit<AdminLocality, 'id' | 'createdAt' | 'updatedAt'>, req.user!);
    res.status(201).json({ success: true, data: locality });
  } catch (err: any) {
    res.status(400).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message });
  }
});

// PUT /api/locations/localities/:id — admin only
router.put('/localities/:id', authenticate, requirePermission('location.manage'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const updates = safeAdminLocality(req.body);
    const locality = await db.updateAdminLocality(req.params.id, updates as Partial<AdminLocality>, req.user!);
    res.json({ success: true, data: locality });
  } catch (err: any) {
    res.status(404).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message });
  }
});

// DELETE /api/locations/localities/:id — admin only
router.delete('/localities/:id', authenticate, requirePermission('location.manage'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await db.deleteAdminLocality(req.params.id, req.user!);
    res.json({ success: true, message: 'Locality deleted.' });
  } catch (err: any) {
    res.status(404).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message });
  }
});

// GET /api/locations/boundaries — administrative boundaries (GeoJSON)
router.get('/boundaries', authenticate, requirePermission('location.boundary.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { level, parentId } = req.query;
  const filters: any = {};
  if (level === 'state' || level === 'district' || level === 'sub_district' || level === 'block' || level === 'locality') filters.level = level;
  if (parentId !== undefined) filters.parentId = parentId === 'null' ? null : String(parentId);
  const boundaries = await db.getAdministrativeBoundaries(filters);
  res.json({ success: true, data: boundaries, meta: { total: boundaries.length } });
});

// GET /api/locations/boundaries/:id
router.get('/boundaries/:id', authenticate, requirePermission('location.boundary.read'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const boundary = await db.getAdministrativeBoundaryById(req.params.id);
  if (!boundary) {
    res.status(404).json({ success: false, message: 'Boundary not found.' });
    return;
  }
  res.json({ success: true, data: boundary });
});

// POST /api/locations/boundaries — admin only
router.post('/boundaries', authenticate, requirePermission('location.manage'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { level, parentId, geometry } = req.body || {};
    if (!level || (level !== 'state' && level !== 'district' && level !== 'sub_district' && level !== 'block' && level !== 'locality')) {
      res.status(400).json({ success: false, message: 'Valid level is required.' });
      return;
    }
    const boundary = await db.createAdministrativeBoundary({
      level,
      parentId: parentId ?? null,
      geometry: geometry ?? null
    } as Omit<AdministrativeBoundary, 'id' | 'createdAt' | 'updatedAt'>, req.user!);
    res.status(201).json({ success: true, data: boundary });
  } catch (err: any) {
    res.status(400).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message });
  }
});

// PUT /api/locations/boundaries/:id — admin only
router.put('/boundaries/:id', authenticate, requirePermission('location.manage'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { level, parentId, geometry } = req.body || {};
    const updates: Partial<AdministrativeBoundary> = {};
    if (level) updates.level = level;
    if (parentId !== undefined) updates.parentId = parentId === 'null' ? null : parentId;
    if (geometry !== undefined) updates.geometry = geometry;
    const boundary = await db.updateAdministrativeBoundary(req.params.id, updates, req.user!);
    res.json({ success: true, data: boundary });
  } catch (err: any) {
    res.status(404).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message });
  }
});

// DELETE /api/locations/boundaries/:id — admin only
router.delete('/boundaries/:id', authenticate, requirePermission('location.manage'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await db.deleteAdministrativeBoundary(req.params.id, req.user!);
    res.json({ success: true, message: 'Boundary deleted.' });
  } catch (err: any) {
    res.status(404).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Request failed.' : err.message });
  }
});

export default router;
