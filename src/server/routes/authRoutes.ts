// SCIP Backend - Auth Routes
import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../../database/scipDatabase.js';
import { authenticate, AuthenticatedRequest, getJwtSecret } from '../middleware/auth.js';
import { User } from '../../types/scip.js';

const router = Router();

function sanitizeAuthUser(user: any) {
  if (!user) return user;
  const { passwordHash, sessionVersion, credentialsResetRequired, ...safe } = user;
  return safe;
}

function signToken(user: User): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, sv: user.sessionVersion ?? 0 },
    getJwtSecret(),
    { expiresIn: '7d' }
  );
}

function isPublicRegistrationEnabled(): boolean {
  // Self-registration is for citizen accounts only; privileged roles require admin provisioning.
  return true;
}

// POST /api/auth/register
router.post('/register', async (req, res: Response): Promise<void> => {
  try {
    const { name, email, password, role = 'citizen', phone } = req.body || {};

    if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({ success: false, message: 'Name, email, and password are required.', errors: ['Missing required fields.'] });
      return;
    }
    const safeName = name.trim();
    const safeEmail = email.trim().toLowerCase();
    if (!safeName || !safeEmail || !password) {
      res.status(400).json({ success: false, message: 'Name, email, and password are required.', errors: ['Missing required fields.'] });
      return;
    }
    if (safeName.length > 100) {
      res.status(400).json({ success: false, message: 'Name must be 100 characters or fewer.', errors: ['Invalid name.'] });
      return;
    }
    if (phone !== undefined && (typeof phone !== 'string' || phone.trim().length > 30)) {
      res.status(400).json({ success: false, message: 'Phone must be 30 characters or fewer.', errors: ['Invalid phone.'] });
      return;
    }

    if (password.length < 8 || password.length > 128) {
      res.status(400).json({ success: false, message: 'Password must be 8-128 characters in length.', errors: ['Weak password.'] });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(safeEmail) || safeEmail.length > 254) {
      res.status(400).json({ success: false, message: 'Please provide a valid email address.', errors: ['Invalid email format.'] });
      return;
    }

    const existing = db.getUserByEmailWithPassword(safeEmail);
    if (existing) {
      res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
        errors: ['Duplicate email.']
      });
      return;
    }

    if (!isPublicRegistrationEnabled()) {
      res.status(403).json({ success: false, message: 'Public registration is disabled.' });
      return;
    }

    // Prevent privilege escalation: public registration can only create citizen accounts.
    const requestedRole = typeof role === 'string' ? role : 'citizen';
    if (requestedRole !== 'citizen') {
      res.status(403).json({
        success: false,
        message: 'Privileged roles cannot be self-assigned during registration.',
        errors: ['Role assignment restricted.']
      });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = db.createUser({
      name: safeName,
      email: safeEmail,
      passwordHash,
      role: 'citizen',
      phone: typeof phone === 'string' ? phone.trim() : undefined,
      status: 'active',
      sessionVersion: 0,
      credentialsResetRequired: false
    } as any);

    const token = signToken(newUser as User);

    res.status(201).json({
      success: true,
      message: 'Registration successful.',
      data: {
        user: sanitizeAuthUser(newUser),
        token
      }
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to complete registration.',
      errors: [process.env.NODE_ENV === 'production' ? 'Registration failed.' : err.message]
    });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body || {};

    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      res.status(400).json({
        success: false,
        message: 'Email and password are required.',
        errors: ['Missing credentials.']
      });
      return;
    }
    if (email.length > 254 || password.length > 128) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials.',
        errors: ['Authentication failed.']
      });
      return;
    }

    const lookupEmail = email.trim().toLowerCase();
    const userWithPassword = db.getUserByEmailWithPassword(lookupEmail) || db.getUserByEmailWithPassword(email.trim());
    if (!userWithPassword || !userWithPassword.passwordHash) {
      db.logAudit({
        action: 'LOGIN_FAILED',
        module: 'auth',
        userId: 'UNKNOWN',
        userEmail: typeof email === 'string' ? email : 'UNKNOWN',
        userRole: 'citizen',
        ipAddress: req.ip || '127.0.0.1',
        details: `Login attempt failed: account not found or credentials unavailable`
      });

      res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials.',
        errors: ['Authentication failed.']
      });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, userWithPassword.passwordHash);

    if (!passwordMatch) {
      db.logAudit({
        action: 'LOGIN_FAILED',
        module: 'auth',
        userId: userWithPassword.id,
        userEmail: userWithPassword.email,
        userRole: userWithPassword.role,
        ipAddress: req.ip || '127.0.0.1',
        details: `Login attempt failed: invalid credentials`
      });

      res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials.',
        errors: ['Authentication failed.']
      });
      return;
    }

    if (userWithPassword.status === 'suspended') {
      res.status(403).json({
        success: false,
        message: 'Account is suspended. Contact system administrator.',
        errors: ['Account suspended.']
      });
      return;
    }

    if ((userWithPassword as any).credentialsResetRequired) {
      res.status(403).json({
        success: false,
        message: 'Credential reset required. Please complete account recovery.',
        errors: ['Credential reset required.']
      });
      return;
    }

    const token = signToken(userWithPassword as User);

    db.logAudit({
      action: 'LOGIN_SUCCESS',
      module: 'auth',
      userId: userWithPassword.id,
      userEmail: userWithPassword.email,
      userRole: userWithPassword.role,
      ipAddress: req.ip || '127.0.0.1',
      details: `User authenticated successfully`
    });

    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        user: sanitizeAuthUser(userWithPassword),
        token
      }
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: 'Internal server error during login.',
      errors: [process.env.NODE_ENV === 'production' ? 'Login failed.' : (err.message || 'Login failed.')]
    });
  }
});

// POST /api/auth/demo-login
// Development-only helper. Disabled in production and requires explicit opt-in.
router.post('/demo-login', async (req, res: Response): Promise<void> => {
  const enabled = process.env.NODE_ENV !== 'production' && process.env.ENABLE_DEV_DEMO_LOGIN === 'true';
  if (!enabled) {
    res.status(404).json({ success: false, message: 'Not found.' });
    return;
  }

  const { role } = req.body || {};
  const users = db.getUsers();
  const demoUser = users.find(u => u.role === role) || users.find(u => u.role === 'citizen') || users[0];
  if (!demoUser) {
    res.status(503).json({ success: false, message: 'No demo account available.' });
    return;
  }

  const token = signToken(demoUser as unknown as User);

  db.logAudit({
    action: 'LOGIN_SUCCESS',
    module: 'auth',
    userId: demoUser.id,
    userEmail: demoUser.email,
    userRole: demoUser.role,
    ipAddress: req.ip || '127.0.0.1',
    details: `Development demo session activated (role: ${demoUser.role})`
  });

  res.json({
    success: true,
    message: `Development session activated for ${demoUser.role}.`,
    data: {
      user: sanitizeAuthUser(demoUser),
      token
    }
  });
});

// GET /api/auth/me
router.get('/me', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  res.json({
    success: true,
    data: sanitizeAuthUser(req.user)
  });
});

// POST /api/auth/logout
router.post('/logout', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  if (req.user) {
    try {
      db.invalidateUserSessions(req.user.id);
    } catch {
      // Best-effort server-side revocation; token expiry still applies.
    }
    db.logAudit({
      action: 'LOGOUT',
      module: 'auth',
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      ipAddress: req.ip || '127.0.0.1',
      details: `User logged out; sessions invalidated`
    });
  }
  res.json({
    success: true,
    message: 'Logged out successfully.'
  });
});

// POST /api/auth/change-password
router.post('/change-password', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { oldPassword, newPassword } = req.body || {};
    if (typeof oldPassword !== 'string' || typeof newPassword !== 'string') {
      res.status(400).json({ success: false, message: 'Old password and new password are required.' });
      return;
    }
    if (oldPassword.length > 128) {
      res.status(401).json({ success: false, message: 'Current password incorrect.' });
      return;
    }
    if (newPassword.length < 8 || newPassword.length > 128) {
      res.status(400).json({ success: false, message: 'New password must be 8-128 characters in length.' });
      return;
    }

    const userWithPassword = db.getUserByEmailWithPassword(req.user!.email);
    if (!userWithPassword || !userWithPassword.passwordHash) {
      res.status(400).json({ success: false, message: 'User password record not found.' });
      return;
    }

    const matches = await bcrypt.compare(oldPassword, userWithPassword.passwordHash);

    if (!matches) {
      res.status(401).json({ success: false, message: 'Current password incorrect.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);
    db.changeUserPassword(req.user!.id, newHash);

    res.json({ success: true, message: 'Password changed successfully. Please sign in again.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update password.', errors: [process.env.NODE_ENV === 'production' ? 'Update failed.' : (err.message || 'Update failed.')] });
  }
});

// PUT /api/auth/profile
router.put('/profile', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { name, phone } = req.body || {};
    if (name !== undefined && (typeof name !== 'string' || !name.trim() || name.trim().length > 100)) {
      res.status(400).json({ success: false, message: 'Name must be a non-empty string up to 100 characters.' });
      return;
    }
    if (phone !== undefined && (typeof phone !== 'string' || phone.trim().length > 30)) {
      res.status(400).json({ success: false, message: 'Phone must be a string up to 30 characters.' });
      return;
    }
    const updates: { name?: string; phone?: string } = {};
    if (typeof name === 'string') updates.name = name.trim();
    if (typeof phone === 'string') updates.phone = phone.trim();
    if (Object.keys(updates).length === 0) {
      res.status(400).json({ success: false, message: 'No valid profile fields provided.' });
      return;
    }
    const updated = db.updateUserProfile(req.user!.id, updates);
    res.json({ success: true, message: 'Profile updated successfully.', data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Profile update failed.' : err.message });
  }
});

// POST /api/auth/reset-password
// Safe reset workflow: issues a server-side reset signal (no token leakage in production).
// Actual password change must occur via authenticated, verified admin/recovery flow in deployment.
router.post('/reset-password', async (req, res: Response): Promise<void> => {
  try {
    const { email } = req.body || {};
    if (typeof email !== 'string' || !email.trim() || email.length > 254) {
      res.status(400).json({ success: false, message: 'Email address is required.' });
      return;
    }

    const lookupEmail = email.trim().toLowerCase();
    const user = db.getUserByEmailWithPassword(lookupEmail) || db.getUserByEmailWithPassword(email.trim());
    if (!user) {
      // Avoid user enumeration
      res.json({
        success: true,
        message: 'If an account exists with this email, password reset instructions have been dispatched.'
      });
      return;
    }

    try {
      db.markCredentialsResetRequired(user.id);
    } catch {
      // Do not fail closed for enumeration; audit below records the attempt.
    }

    db.logAudit({
      action: 'PASSWORD_RESET_REQUESTED',
      module: 'auth',
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      ipAddress: req.ip || '127.0.0.1',
      details: `Credential reset workflow initiated`
    });

    const meta =
      process.env.NODE_ENV !== 'production' && process.env.ENABLE_DEV_DEMO_LOGIN === 'true'
        ? { devResetHint: 'Development mode: credential reset flag set; use admin recovery or change-password after authentication in an isolated test environment.' }
        : undefined;

    res.json({
      success: true,
      message: 'If an account exists with this email, password reset instructions have been dispatched.',
      ...(meta ? { meta } : {})
    });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to process request.' });
  }
});

export default router;





