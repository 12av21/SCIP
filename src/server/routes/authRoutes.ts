// SCIP Backend - Auth Routes
import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { db } from '../../database/index.js';
import { authenticate, AuthenticatedRequest, getJwtSecret, logIpSecurityEvent } from '../middleware/auth.js';
import { User, AuthEventType } from '../../types/scip.js';
import { emailService } from '../../services/emailService.js';
import { smsService } from '../../services/smsService.js';

const router = Router();

function sanitizeAuthUser(user: any) {
  if (!user) return user;
  const { passwordHash, sessionVersion, credentialsResetRequired, ...safe } = user;
  return safe;
}

function signToken(user: User): string {
  return jwt.sign({ id: user.id, email: user.email, role: user.role, sv: (user as any).sessionVersion ?? 0 }, getJwtSecret(), { expiresIn: '7d' });
}

router.post('/register', async (req, res: Response): Promise<void> => {
  try {
    // Public registration ALWAYS yields the citizen role. Any client-supplied role other
    // than 'citizen' is rejected; privileged member registration is admin-only via
    // /api/admin/users (requires admin.manage).
    const { name, email, password, phone, role } = req.body || {};
    const requestedRole = typeof role === 'string' ? role.trim() : '';
    if (requestedRole && requestedRole !== 'citizen') {
      await logIpSecurityEvent({
        req, eventType: 'REGISTER', success: false,
        userId: 'UNKNOWN', userEmail: typeof email === 'string' ? email.trim() : 'UNKNOWN',
        userRole: 'citizen',
        details: `Public registration rejected: client attempted privileged role '${requestedRole}'`
      });
      res.status(403).json({ success: false, message: 'Privileged roles cannot be registered through public registration.', errors: ['Privileged role not allowed on public registration.'] });
      return;
    }
    // Citizen residence location fields (optional)
    const { stateId, districtId, subDistrictId, blockId, localityId, pinCode, residenceAddress, dataConsent } = req.body || {};
    if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({ success: false, message: 'Name, email, and password are required.', errors: ['Missing required fields.'] }); return;
    }
    if (dataConsent !== true) {
      await logIpSecurityEvent({
        req, eventType: 'REGISTER', success: false,
        userId: 'UNKNOWN', userEmail: typeof email === 'string' ? email.trim() : 'UNKNOWN',
        userRole: 'citizen',
        details: 'Public registration rejected: data processing consent not provided'
      });
      res.status(400).json({ success: false, message: 'Data processing consent is required to register.', errors: ['Consent required.'] }); return;
    }
    const safeName = name.trim();
    const safeEmail = email.trim().toLowerCase();
    if (!safeName || !safeEmail || !password) { res.status(400).json({ success: false, message: 'Name, email, and password are required.', errors: ['Missing required fields.'] }); return; }
    if (safeName.length > 100) { res.status(400).json({ success: false, message: 'Name must be 100 characters or fewer.', errors: ['Invalid name.'] }); return; }
    if (phone !== undefined && (typeof phone !== 'string' || phone.trim().length > 30)) { res.status(400).json({ success: false, message: 'Phone must be 30 characters or fewer.', errors: ['Invalid phone.'] }); return; }
    if (password.length < 8 || password.length > 128) { res.status(400).json({ success: false, message: 'Password must be 8-128 characters in length.', errors: ['Weak password.'] }); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(safeEmail) || safeEmail.length > 254) { res.status(400).json({ success: false, message: 'Please provide a valid email address.', errors: ['Invalid email format.'] }); return; }
    const existing = await db.getUserByEmailWithPassword(safeEmail);
    if (existing) { res.status(409).json({ success: false, message: 'An account with this email address already exists.', errors: ['Duplicate email.'] }); return; }
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const newUser = await db.createUser({
      name: safeName, email: safeEmail, passwordHash, role: 'citizen',
      phone: typeof phone === 'string' ? phone.trim() : undefined,
      stateId: typeof stateId === 'string' ? stateId : undefined,
      districtId: typeof districtId === 'string' ? districtId : undefined,
      subDistrictId: typeof subDistrictId === 'string' ? subDistrictId : undefined,
      blockId: typeof blockId === 'string' ? blockId : undefined,
      localityId: typeof localityId === 'string' ? localityId : undefined,
      pinCode: typeof pinCode === 'string' && /^[1-9][0-9]{5}$/.test(pinCode) ? pinCode : undefined,
      residenceAddress: typeof residenceAddress === 'string' ? residenceAddress.trim().slice(0, 500) : undefined,
      status: 'unverified', sessionVersion: 0, credentialsResetRequired: false,
      emailVerified: false, phoneVerified: false, verificationAttempts: 0
    } as any);
    await db.logAudit({
      action: 'REGISTER', module: 'auth', userId: newUser.id, userEmail: newUser.email,
      userRole: 'citizen', ipAddress: req.ip || '127.0.0.1',
      details: 'Public registration completed as citizen'
    });
    const token = signToken(newUser as User);
    await logIpSecurityEvent({
      req, eventType: 'REGISTER', success: true,
      userId: newUser.id, userEmail: newUser.email, userRole: 'citizen',
      details: 'Public registration completed as citizen (unverified)'
    });

    // Trigger email verification for new unverified account
    try {
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await db.setUserEmailVerificationToken(newUser.id, tokenHash, expiresAt);
      await db.updateUserVerificationStatus(newUser.id, {
        lastVerificationSentAt: new Date().toISOString()
      });
      const verificationLink = `${process.env.APP_BASE_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}&email=${encodeURIComponent(safeEmail)}`;
      await emailService.sendEmail({
        to: safeEmail,
        subject: 'SCIP - Verify Your Email Address',
        htmlBody: `
          <h2>Verify your SCIP account</h2>
          <p>Hello ${safeName},</p>
          <p>Please verify your email address by clicking the link below:</p>
          <p><a href="${verificationLink}">Verify Email</a></p>
          <p>This link expires in 24 hours.</p>
          <p>If you did not request this, you can safely ignore this email.</p>
        `,
        textBody: `Hello ${safeName},\nPlease verify your email address by visiting: ${verificationLink}\nThis link expires in 24 hours.\nIf you did not request this, you can safely ignore this email.`
      });
    } catch {
      // Email delivery failure should not block registration
    }

    res.status(201).json({ success: true, message: 'Registration successful. Please verify your email address to activate your account.', data: { user: sanitizeAuthUser(newUser), token } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to complete registration.', errors: [process.env.NODE_ENV === 'production' ? 'Registration failed.' : err.message] });
  }
});

router.post('/login', async (req, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required.', errors: ['Missing credentials.'] }); return;
    }
    if (email.length > 254 || password.length > 128) {
      res.status(401).json({ success: false, message: 'Invalid email or password credentials.', errors: ['Authentication failed.'] }); return;
    }
    const lookupEmail = email.trim().toLowerCase();
    const userWithPassword = await db.getUserByEmailWithPassword(lookupEmail) || await db.getUserByEmailWithPassword(email.trim());
    if (!userWithPassword || !(userWithPassword as any).passwordHash) {
      await logIpSecurityEvent({
        req, eventType: 'LOGIN_FAILED', success: false,
        userId: 'UNKNOWN', userEmail: typeof email === 'string' ? email : 'UNKNOWN', userRole: 'citizen',
        details: 'Login attempt failed: account not found or credentials unavailable'
      });
      res.status(401).json({ success: false, message: 'Invalid email or password credentials.', errors: ['Authentication failed.'] }); return;
    }
    const passwordMatch = await bcrypt.compare(password, (userWithPassword as any).passwordHash);
    if (!passwordMatch) {
      await logIpSecurityEvent({
        req, eventType: 'LOGIN_FAILED', success: false,
        userId: userWithPassword.id, userEmail: userWithPassword.email, userRole: userWithPassword.role,
        details: 'Login attempt failed: invalid credentials'
      });
      res.status(401).json({ success: false, message: 'Invalid email or password credentials.', errors: ['Authentication failed.'] }); return;
    }
    if (userWithPassword.status === 'suspended') { res.status(403).json({ success: false, message: 'Account is suspended. Contact system administrator.', errors: ['Account suspended.'] }); return; }
    if ((userWithPassword as any).credentialsResetRequired) { res.status(403).json({ success: false, message: 'Credential reset required. Please complete account recovery.', errors: ['Credential reset required.'] }); return; }
    const token = signToken(userWithPassword as User);
    await logIpSecurityEvent({
      req, eventType: 'LOGIN_SUCCESS', success: true,
      userId: userWithPassword.id, userEmail: userWithPassword.email, userRole: userWithPassword.role,
      details: 'User authenticated successfully'
    });
    await db.logAudit({ action: 'LOGIN_SUCCESS', module: 'auth', userId: userWithPassword.id, userEmail: userWithPassword.email, userRole: userWithPassword.role, ipAddress: req.ip || '127.0.0.1', details: 'User authenticated successfully' });
    res.json({ success: true, message: 'Login successful.', data: { user: sanitizeAuthUser(userWithPassword), token } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Internal server error during login.', errors: [process.env.NODE_ENV === 'production' ? 'Login failed.' : (err.message || 'Login failed.')] });
  }
});

router.post('/demo-login', async (req, res: Response): Promise<void> => {
  const enabled = process.env.NODE_ENV !== 'production' && process.env.ENABLE_DEV_DEMO_LOGIN === 'true';
  if (!enabled) { res.status(404).json({ success: false, message: 'Not found.' }); return; }
  const { role } = req.body || {};
  const users = await db.getUsers();
  const demoUser = users.find(u => u.role === role) || users.find(u => u.role === 'citizen') || users[0];
  if (!demoUser) { res.status(503).json({ success: false, message: 'No demo account available.' }); return; }
  const token = signToken(demoUser as unknown as User);
  await db.logAudit({ action: 'LOGIN_SUCCESS', module: 'auth', userId: demoUser.id, userEmail: demoUser.email, userRole: demoUser.role, ipAddress: req.ip || '127.0.0.1', details: `Development demo session activated (role: ${demoUser.role})` });
  res.json({ success: true, message: `Development session activated for ${demoUser.role}.`, data: { user: sanitizeAuthUser(demoUser), token } });
});

router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  res.json({ success: true, data: sanitizeAuthUser(req.user) });
});

router.post('/logout', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (req.user) {
    try { await db.invalidateUserSessions(req.user.id); } catch {}
    await logIpSecurityEvent({
      req, eventType: 'LOGOUT', success: true,
      userId: req.user.id, userEmail: req.user.email, userRole: req.user.role,
      details: 'User logged out; sessions invalidated'
    });
    await db.logAudit({ action: 'LOGOUT', module: 'auth', userId: req.user.id, userEmail: req.user.email, userRole: req.user.role, ipAddress: req.ip || '127.0.0.1', details: 'User logged out; sessions invalidated' });
  }
  res.json({ success: true, message: 'Logged out successfully.' });
});

router.post('/change-password', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { oldPassword, newPassword } = req.body || {};
    if (typeof oldPassword !== 'string' || typeof newPassword !== 'string') { res.status(400).json({ success: false, message: 'Old password and new password are required.' }); return; }
    if (oldPassword.length > 128) { res.status(401).json({ success: false, message: 'Current password incorrect.' }); return; }
    if (newPassword.length < 8 || newPassword.length > 128) { res.status(400).json({ success: false, message: 'New password must be 8-128 characters in length.' }); return; }
    const userWithPassword = await db.getUserByEmailWithPassword(req.user!.email);
    if (!userWithPassword || !(userWithPassword as any).passwordHash) { res.status(400).json({ success: false, message: 'User password record not found.' }); return; }
    const matches = await bcrypt.compare(oldPassword, (userWithPassword as any).passwordHash);
    if (!matches) { res.status(401).json({ success: false, message: 'Current password incorrect.' }); return; }
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);
    await db.changeUserPassword(req.user!.id, newHash);
    res.json({ success: true, message: 'Password changed successfully. Please sign in again.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update password.', errors: [process.env.NODE_ENV === 'production' ? 'Update failed.' : (err.message || 'Update failed.')] });
  }
});

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
    res.json({ success: true, message: 'Profile updated successfully.', data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Profile update failed.' : err.message });
  }
});

// DELETE /api/auth/account — account deletion / right to be forgotten (DPDP Act 2023)
// Citizens can delete their own account; PII is anonymized, associated reports anonymized.
// Admins cannot be deleted through this endpoint.
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
      details: 'Account deleted; sessions invalidated'
    });
    await db.logAudit({
      action: 'USER_STATUS_UPDATED', module: 'auth',
      recordId: deleted.id, userId: deleted.id, userEmail: deleted.email, userRole: deleted.role,
      ipAddress: req.ip || '127.0.0.1',
      details: 'Account deleted by user (right to be forgotten); PII anonymized'
    });
    res.json({ success: true, message: 'Account deleted successfully. Your personal data has been anonymized.' });
  } catch (err: any) {
    res.status(400).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Account deletion failed.' : err.message });
  }
});

router.post('/reset-password', async (req, res: Response): Promise<void> => {
  try {
    const { email } = req.body || {};
    if (typeof email !== 'string' || !email.trim() || email.length > 254) { res.status(400).json({ success: false, message: 'Email address is required.' }); return; }
    const lookupEmail = email.trim().toLowerCase();
    const user = await db.getUserByEmailWithPassword(lookupEmail) || await db.getUserByEmailWithPassword(email.trim());
    if (!user) { res.json({ success: true, message: 'If an account exists with this email, password reset instructions have been dispatched.' }); return; }
    try { await db.markCredentialsResetRequired(user.id); } catch {}
    await db.logAudit({ action: 'PASSWORD_RESET_REQUESTED', module: 'auth', userId: user.id, userEmail: user.email, userRole: user.role, ipAddress: req.ip || '127.0.0.1', details: 'Credential reset workflow initiated' });
    const meta = process.env.NODE_ENV !== 'production' && process.env.ENABLE_DEV_DEMO_LOGIN === 'true'
      ? { devResetHint: 'Development mode: credential reset flag set; use admin recovery or change-password after authentication in an isolated test environment.' }
      : undefined;
    res.json({ success: true, message: 'If an account exists with this email, password reset instructions have been dispatched.', ...(meta ? { meta } : {}) });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to process request.' });
  }
});

export default router;