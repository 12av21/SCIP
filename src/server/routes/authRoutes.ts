// SCIP Backend - Auth Routes (Phase 3.1: Clerk migration)
// Clerk is the Identity Provider; SCIP remains the application data source and RBAC authority.
// Custom password-based auth (register/login/change-password/reset-password) is delegated to Clerk.
// SCIP routes: /me (current user), /logout (session invalidation), /profile (profile update), /account (deletion).

import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../../database/index.js';
import { authenticate, AuthenticatedRequest, logIpSecurityEvent } from '../middleware/auth.js';
import { User } from '../../types/scip.js';

const JWT_SECRET = process.env.JWT_SECRET || process.env.CLERK_SECRET_KEY || 'dev-secret-change-in-production';
const AUTH_PROVIDER = (process.env.AUTH_PROVIDER || 'clerk').toLowerCase();

const router = Router();

// Native auth endpoints only available when AUTH_PROVIDER=native
// When using Clerk (default), auth is delegated to Clerk and these endpoints return 404
if (AUTH_PROVIDER === 'native') {
  // Native auth: register
  router.post('/register', async (req: any, res: Response): Promise<void> => {
  try {
    const { name, email, password, phone } = req.body || {};
    if (!name || !email || !password) { res.status(400).json({ success: false, message: 'Name, email and password are required.' }); return; }
    if (password.length < 8) { res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' }); return; }
    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await db.getUserByEmailWithPassword(normalizedEmail);
    if (existing) { res.status(409).json({ success: false, message: 'An account with this email already exists.' }); return; }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await db.createUser({ name: name.trim(), email: normalizedEmail, passwordHash, role: 'citizen', status: 'active', phone: phone?.trim() } as any);
    const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('scip_token', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 7*24*60*60*1000 });
    res.status(201).json({ success: true, message: 'Registration successful.', data: { user: sanitizeAuthUser(user) } });
  } catch (err: any) {
    res.status(400).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Registration failed.' : err.message });
  }
});

// Native auth: login
router.post('/login', async (req: any, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) { res.status(400).json({ success: false, message: 'Email and password are required.' }); return; }
    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await db.getUserByEmailWithPassword(normalizedEmail);
    if (!user || !user.passwordHash) { res.status(401).json({ success: false, message: 'Invalid email or password.' }); return; }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) { res.status(401).json({ success: false, message: 'Invalid email or password.' }); return; }
    if (user.status !== 'active') { res.status(403).json({ success: false, message: 'Account is not active.' }); return; }
    const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('scip_token', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 7*24*60*60*1000 });
    res.json({ success: true, message: 'Login successful.', data: { user: sanitizeAuthUser(user) } });
  } catch (err: any) {
    res.status(400).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Login failed.' : err.message });
  }
});
} // End of AUTH_PROVIDER === 'native' block

// Explicit allowlist of User fields safe to return to the authenticated owner.
// Never expose password hashes, session state, verification secrets, or internal
// verification counters (denylist-free: anything not listed is dropped).
const AUTH_USER_PUBLIC_FIELDS = [
  'id', 'clerkUserId', 'name', 'email', 'role', 'departmentId', 'departmentName',
  'phone', 'status', 'emailVerified', 'phoneVerified',
  'stateId', 'districtId', 'subDistrictId', 'blockId', 'localityId', 'pinCode', 'residenceAddress',
  'jurisdictionStateIds', 'jurisdictionDistrictIds', 'jurisdictionSubDistrictIds',
  'jurisdictionBlockIds', 'jurisdictionLocalityIds',
  'createdAt', 'updatedAt'
] as const;

function sanitizeAuthUser(user: any) {
  if (!user) return user;
  const safe: Record<string, unknown> = {};
  for (const key of AUTH_USER_PUBLIC_FIELDS) {
    if (user[key] !== undefined) safe[key] = user[key];
  }
  return safe;
}

// GET /api/auth/me — current authenticated user (SCIP record, no token; Clerk provides the token)
router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  res.json({ success: true, data: sanitizeAuthUser(req.user) });
});

// POST /api/auth/logout — invalidate SCIP session + redirect to Clerk logout
router.post('/logout', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (req.user) {
    try { await db.invalidateUserSessions(req.user.id); } catch {}
    await logIpSecurityEvent({
      req, eventType: 'LOGOUT', success: true,
      userId: req.user.id, userEmail: req.user.email, userRole: req.user.role,
      details: 'User logged out via Clerk; SCIP session invalidated'
    });
    await db.logAudit({ action: 'LOGOUT', module: 'auth', userId: req.user.id, userEmail: req.user.email, userRole: req.user.role, ipAddress: req.ip || '127.0.0.1', details: 'User logged out via Clerk' });
  }
  res.clearCookie('scip_token');
  res.json({ success: true, message: 'Logged out successfully.', redirect: '/login' });
});

// PUT /api/auth/profile — authenticated profile update
router.put('/profile', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, phone, stateId, districtId, subDistrictId, blockId, localityId, pinCode, residenceAddress } = req.body || {};
    if (name !== undefined && (typeof name !== 'string' || !name.trim() || name.trim().length > 100)) { res.status(400).json({ success: false, message: 'Name must be a non-empty string up to 100 characters.' }); return; }
    if (phone !== undefined && (typeof phone !== 'string' || phone.trim().length > 30)) { res.status(400).json({ success: false, message: 'Phone must be a string up to 30 characters.' }); return; }
    if (pinCode !== undefined && pinCode !== null && pinCode !== '' && (typeof pinCode !== 'string' || !/^[1-9][0-9]{5}$/.test(pinCode))) { res.status(400).json({ success: false, message: 'PIN code must be a six-digit Indian PIN code.', errors: ['Invalid PIN code.'] }); return; }
    const updates: { name?: string; phone?: string; stateId?: string; districtId?: string; subDistrictId?: string; blockId?: string; localityId?: string; pinCode?: string; residenceAddress?: string } = {};
    if (typeof name === 'string') updates.name = name.trim();
    if (typeof phone === 'string') updates.phone = phone.trim();
    if (typeof stateId === 'string') updates.stateId = stateId.trim();
    if (typeof districtId === 'string') updates.districtId = districtId.trim();
    if (typeof subDistrictId === 'string') updates.subDistrictId = subDistrictId.trim();
    if (typeof blockId === 'string') updates.blockId = blockId.trim();
    if (typeof localityId === 'string') updates.localityId = localityId.trim();
    if (typeof pinCode === 'string') updates.pinCode = pinCode.trim();
    if (typeof residenceAddress === 'string') updates.residenceAddress = residenceAddress.trim().slice(0, 500);
    if (Object.keys(updates).length === 0) { res.status(400).json({ success: false, message: 'No valid profile fields provided.' }); return; }
    const updated = await db.updateUserProfile(req.user!.id, updates);
    res.json({ success: true, message: 'Profile updated successfully.', data: sanitizeAuthUser(updated) });
  } catch (err: any) {
    res.status(400).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Profile update failed.' : err.message });
  }
});

// DELETE /api/auth/account — account deletion / right to be forgotten (DPDP Act 2023)
router.delete('/account', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { confirm } = req.body || {};
    if (confirm !== true) {
      res.status(400).json({ success: false, message: 'Account deletion requires explicit confirmation.', errors: ['Confirmation required.'] }); return;
    }
    const deleted = await db.deleteUser(req.user!.id, req.user!);
    await db.invalidateUserSessions(req.user!.id);
    await logIpSecurityEvent({
      req, eventType: 'LOGOUT', success: true,
      userId: deleted.id, userEmail: deleted.email, userRole: deleted.role,
      details: 'Account deleted via Clerk; SCIP record anonymized'
    });
    await db.logAudit({
      action: 'USER_STATUS_UPDATED', module: 'auth',
      recordId: deleted.id, userId: deleted.id, userEmail: deleted.email, userRole: deleted.role,
      ipAddress: req.ip || '127.0.0.1',
      details: 'Account deleted via Clerk (right to be forgotten); PII anonymized'
    });
    res.json({ success: true, message: 'Account deleted successfully. Your personal data has been anonymized.', redirect: `${process.env.CLERK_LOGOUT_URL || '/sign-in'}` });
  } catch (err: any) {
    res.status(400).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Account deletion failed.' : err.message });
  }
});

export default router;
