// SCIP Backend - Authentication & RBAC Middleware
// Clerk-based authentication (Phase 3.1). Clerk is the Identity Provider;
// SCIP remains the application data source and RBAC authority.

import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@clerk/backend';
import { db } from '../../database/index.js';
import { isDuplicateClerkIdentityError } from '../../database/identityErrors.js';
import { User, UserPermission, UserRole, AuthEventType } from '../../types/scip.ts';

const MIN_CLERK_SECRET_LENGTH = 32;
let clerkInitialized = false;

/**
 * Optional authorized-party (azp) allowlist for Clerk token verification.
 * When CLERK_AUTHORIZED_PARTIES is set (comma-separated origins), tokens whose
 * `azp` claim is not in the list are rejected, preventing cross-application token
 * replay. When unset, verification behavior is unchanged (backward compatible).
 */
function getAuthorizedParties(): string[] {
  return (process.env.CLERK_AUTHORIZED_PARTIES || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function verifyClerkToken(token: string) {
  const authorizedParties = getAuthorizedParties();
  const opts = authorizedParties.length > 0 ? { authorizedParties } : {};
  return verifyToken(token, opts);
}

export function validateClerkConfigOnStartup(): void {
  // Fail closed in production if Clerk secret missing/weak.
  const secret = process.env.CLERK_SECRET_KEY;
  const isProduction = process.env.NODE_ENV === 'production';
  if (!secret || secret.trim().length < MIN_CLERK_SECRET_LENGTH) {
    if (isProduction) {
      throw new Error('CLERK_SECRET_KEY is required in production and must be at least 32 characters.');
    }
    clerkInitialized = false;
    return;
  }
  clerkInitialized = true;
}

const ROLE_PERMISSIONS: Record<UserRole, UserPermission[]> = {
  citizen: [
    'report.create',
    'report.read',
    'report.update',
    'incident.read',
    'feedback.create',
    'location.read',
    'map.read',
    'image.upload'
  ],
  officer: [
    // Field Officer
    'report.read',
    'incident.read',
    'incident.update',
    'inspection.create',
    'inspection.read',
    'location.read',
    'map.read',
    'image.read',
    'image.upload'
  ],
  dept_officer: [
    // Department Desk Officer
    'report.read',
    'report.update',
    'report.assign',
    'incident.read',
    'incident.create',
    'incident.update',
    'incident.assign',
    'incident.resolve',
    'incident.escalate',
    'inspection.verify',
    'inspection.read',
    'analytics.read',
    'data.export',
    'location.read',
    'map.read',
    'geoanalytics.read',
    'image.read',
    'image.upload'
  ],
  analyst: [
    // Data & AI Analyst
    'report.read',
    'incident.read',
    'analytics.read',
    'intelligence.read',
    'model.evaluate',
    'data.export',
    'location.read',
    'map.read',
    'geoanalytics.read',
    'image.read'
  ],
  authority: [
    // Authority Director
    'user.read',
    'report.read',
    'report.update',
    'report.assign',
    'incident.read',
    'incident.create',
    'incident.update',
    'incident.assign',
    'incident.resolve',
    'incident.escalate',
    'inspection.read',
    'analytics.read',
    'intelligence.read',
    'audit.read',
    'data.export',
    'location.read',
    'location.boundary.read',
    'map.read',
    'geoanalytics.read',
    'image.read',
    'image.upload'
  ],
  admin: [
    // Super Administrator
    'user.read',
    'user.create',
    'user.update',
    'user.delete',
    'report.create',
    'report.read',
    'report.update',
    'report.delete',
    'report.assign',
    'incident.read',
    'incident.create',
    'incident.update',
    'incident.assign',
    'incident.resolve',
    'incident.escalate',
    'inspection.create',
    'inspection.verify',
    'inspection.read',
    'feedback.create',
    'analytics.read',
    'intelligence.read',
    'audit.read',
    'model.evaluate',
    'data.export',
    'admin.manage',
    'location.read',
    'location.manage',
    'location.boundary.read',
    'iplog.read',
    'iplog.manage',
    'map.read',
    'map.manage',
    'geoanalytics.read',
    'image.read',
    'image.upload'
  ]
};

export function hasPermission(role: UserRole, permission: UserPermission): boolean {
  const perms = ROLE_PERMISSIONS[role] || [];
  return perms.includes(permission);
}

export interface AuthenticatedRequest extends Request {
  user?: User;
  clerkSubject?: string;
  clerkEmail?: string;
  clerkEmailVerified?: boolean;
  clerkPhone?: string;
  clerkPhoneVerified?: boolean;
  clerkName?: string;
}
export const AuthenticatedRequest = {} as any;

export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  if (!clerkInitialized && process.env.NODE_ENV === 'production') {
    await logIpSecurityEvent({
      req, eventType: 'LOGIN_FAILED', success: false,
      details: 'Clerk not configured for production'
    });
    res.status(500).json({
      success: false,
      message: 'Authentication service unavailable.',
      errors: ['Authentication service unavailable.']
    });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    await logIpSecurityEvent({
      req, eventType: 'LOGIN_FAILED', success: false,
      details: 'Missing or malformed Authorization header'
    });
    res.status(401).json({
      success: false,
      message: 'Authentication token required.',
      errors: ['Missing or malformed Authorization header.']
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const clerk = await verifyClerkToken(token);

    if (!clerk?.sub) {
      await logIpSecurityEvent({
        req, eventType: 'LOGIN_FAILED', success: false,
        details: 'Missing or invalid Clerk authentication token'
      });
      res.status(401).json({
        success: false,
        message: 'Authentication token required.',
        errors: ['Missing or invalid authentication token.']
      });
      return;
    }

    const clerkUserId = clerk.sub;

    // Phase 3.1.2A: resolve identity ONLY via Clerk sub -> getUserByClerkId.
    // The previous unverified email fallback was removed: it matched accounts by
    // unverified email, never persisted the link, and created an account-takeover
    // risk if ever activated. Unlinked Clerk identities are rejected (401 below).
    const user = await db.getUserByClerkId(clerkUserId);

    if (!user) {
      await logIpSecurityEvent({
        req, eventType: 'LOGIN_FAILED', success: false,
        userId: clerkUserId,
        details: 'No SCIP user record linked to Clerk account'
      });
      res.status(401).json({
        success: false,
        message: 'No account found linked to this Clerk identity. Please contact your administrator.',
        errors: ['Account not linked.']
      });
      return;
    }

    if (user.status === 'suspended') {
      await logIpSecurityEvent({
        req, eventType: 'LOGIN_FAILED', success: false,
        userId: user.id, userEmail: user.email, userRole: user.role,
        details: 'Account suspended'
      });
      res.status(403).json({
        success: false,
        message: 'Your account has been suspended by system administrators.',
        errors: ['Account suspended.']
      });
      return;
    }

    if (user.credentialsResetRequired) {
      await logIpSecurityEvent({
        req, eventType: 'LOGIN_FAILED', success: false,
        userId: user.id, userEmail: user.email, userRole: user.role,
        details: 'Credential reset required'
      });
      res.status(403).json({
        success: false,
        message: 'Credential reset required before accessing protected resources.',
        errors: ['Credential reset required.']
      });
      return;
    }

    await logIpSecurityEvent({
      req, eventType: 'LOGIN_SUCCESS', success: true,
      userId: user.id, userEmail: user.email, userRole: user.role,
      details: 'User authenticated via Clerk'
    });

    req.user = user;
    next();
  } catch (err: any) {
    // Phase 3.1.2A: duplicate identity mappings indicate data corruption/uniqueness
    // violation. Fail closed with a safe internal error (never leak the mapping or token).
    if (isDuplicateClerkIdentityError(err)) {
      await logIpSecurityEvent({
        req, eventType: 'LOGIN_FAILED', success: false,
        details: 'Duplicate Clerk identity mapping detected'
      });
      res.status(500).json({
        success: false,
        message: 'Authentication could not be completed due to a server configuration issue.',
        errors: [process.env.NODE_ENV === 'production' ? 'Internal error.' : 'Duplicate Clerk identity mapping.']
      });
      return;
    }
    await logIpSecurityEvent({
      req, eventType: 'LOGIN_FAILED', success: false,
      details: 'Invalid or expired authentication session'
    });
    res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication session.',
      errors: [process.env.NODE_ENV === 'production' ? 'Authentication failed.' : (err?.message || 'Authentication failed.')]
    });
  }
}

/**
 * Bootstrap-only Clerk authentication for identity linking (Phase 3.1.3).
 *
 * Unlike `authenticate`:
 * - Does NOT require an existing linked SCIP user, role, or permission (bootstrap).
 * - Identity comes ONLY from the verified Clerk `sub`; email is never accepted as an
 *   identity and is only surfaced as informational metadata.
 * - Suspended or credential-reset accounts are still refused.
 * - If the Clerk identity is already linked, `req.user` is attached (best-effort).
 * - Attaches `req.clerkSubject` for downstream linking handlers.
 */
export async function authenticateLinking(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  if (!clerkInitialized && process.env.NODE_ENV === 'production') {
    res.status(500).json({
      success: false,
      message: 'Authentication service unavailable.',
      errors: ['Authentication service unavailable.']
    });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    await logIpSecurityEvent({
      req, eventType: 'LOGIN_FAILED', success: false,
      details: 'Missing or malformed Authorization header (linking)'
    });
    res.status(401).json({
      success: false,
      message: 'Authentication token required.',
      errors: ['Missing or malformed Authorization header.']
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const clerk = await verifyClerkToken(token);
    if (!clerk?.sub) {
      res.status(401).json({
        success: false,
        message: 'Authentication token required.',
        errors: ['Missing or invalid authentication token.']
      });
      return;
    }

    const clerkSubject = clerk.sub;
    req.clerkSubject = clerkSubject;
    const emailish = (clerk as any)?.email || (clerk as any)?.email_address;
    if (typeof emailish === 'string' && emailish.length > 0) req.clerkEmail = emailish;
    req.clerkEmailVerified = Boolean((clerk as any)?.email_verified ?? (clerk as any)?.emailVerified);
    const phoneish = (clerk as any)?.phone_number || (clerk as any)?.phoneNumber;
    if (typeof phoneish === 'string' && phoneish.length > 0) req.clerkPhone = phoneish;
    req.clerkPhoneVerified = Boolean((clerk as any)?.phone_number_verified ?? (clerk as any)?.phoneVerified);
    if (typeof (clerk as any)?.name === 'string' && (clerk as any).name.trim()) {
      req.clerkName = (clerk as any).name.trim();
    } else {
      const nameish = [(clerk as any)?.first_name, (clerk as any)?.last_name].filter((v: any) => typeof v === 'string' && v.trim()).join(' ').trim();
      if (nameish) req.clerkName = nameish;
    }

    // Best-effort: attach an already-linked SCIP user (never required for bootstrap).
    const existing = await db.getUserByClerkId(clerkSubject);
    if (existing) {
      if (existing.status === 'suspended') {
        await logIpSecurityEvent({
          req, eventType: 'LOGIN_FAILED', success: false,
          userId: existing.id, userEmail: existing.email, userRole: existing.role,
          details: 'Account suspended (linking)'
        });
        res.status(403).json({
          success: false,
          message: 'Your account has been suspended by system administrators.',
          errors: ['Account suspended.']
        });
        return;
      }
      if (existing.credentialsResetRequired) {
        res.status(403).json({
          success: false,
          message: 'Credential reset required before accessing protected resources.',
          errors: ['Credential reset required.']
        });
        return;
      }
      req.user = existing;
    }

    next();
  } catch (err: any) {
    if (isDuplicateClerkIdentityError(err)) {
      await logIpSecurityEvent({
        req, eventType: 'LOGIN_FAILED', success: false,
        details: 'Duplicate Clerk identity mapping detected (linking)'
      });
      res.status(500).json({
        success: false,
        message: 'Authentication could not be completed due to a server configuration issue.',
        errors: [process.env.NODE_ENV === 'production' ? 'Internal error.' : 'Duplicate Clerk identity mapping.']
      });
      return;
    }
    await logIpSecurityEvent({
      req, eventType: 'LOGIN_FAILED', success: false,
      details: 'Invalid or expired authentication session (linking)'
    });
    res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication session.',
      errors: [process.env.NODE_ENV === 'production' ? 'Authentication failed.' : (err?.message || 'Authentication failed.')]
    });
  }
}

export function requirePermission(permission: UserPermission) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthenticated.' });
      return;
    }

    // Unverified accounts cannot access protected resources.
    // Exempt privileged/trusted internal roles and Clerk-linked identities (Clerk is the IdP and
    // handles identity verification; SCIP's separate email/phone flags may not be set for them).
    // Do not weaken auth for citizens without a verified channel and without a Clerk identity.
    const user = req.user as any;
    const isClerkLinked = typeof user.clerkUserId === 'string' && user.clerkUserId.trim().length > 0;
    const isPrivilegedRole = ['admin', 'authority', 'analyst', 'officer', 'dept_officer'].includes(user.role);
    if (!user.emailVerified && !user.phoneVerified && !isClerkLinked && !isPrivilegedRole) {
      await db.logAudit({
        action: 'SECURITY_EVENT',
        module: 'security',
        userId: req.user.id,
        userEmail: req.user.email,
        userRole: req.user.role,
        ipAddress: req.ip || '127.0.0.1',
        details: `Access denied: Unverified account attempted to use permission "${permission}"`
      });
      res.status(403).json({
        success: false,
        message: 'Account verification required.',
        errors: ['Please verify your email or phone number before accessing this resource.']
      });
      return;
    }

    if (!hasPermission(req.user.role, permission)) {
      await db.logAudit({
        action: 'SECURITY_EVENT',
        module: 'security',
        userId: req.user.id,
        userEmail: req.user.email,
        userRole: req.user.role,
        ipAddress: req.ip || '127.0.0.1',
        details: `Access denied: User lacked required permission "${permission}"`
      });

      res.status(403).json({
        success: false,
        message: `Forbidden: Lacks required permission '${permission}'`,
        errors: [`Your role '${req.user.role}' is not authorized to perform this operation.`]
      });
      return;
    }

    next();
  };
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthenticated.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Forbidden: Allowed roles: ${allowedRoles.join(', ')}`,
        errors: [`Your role '${req.user.role}' cannot access this endpoint.`]
      });
      return;
    }

    next();
  };
}

/**
 * Middleware: requires the authenticated user to have at least one verified
 * contact channel (email or phone). Unverified users are blocked from most
 * protected endpoints but can still access verification routes.
 */
export function requireVerification(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthenticated.' });
    return;
  }

  const user = req.user as any;
  const isVerified = user.emailVerified || user.phoneVerified;

  if (!isVerified) {
    res.status(403).json({
      success: false,
      message: 'Account verification required.',
      errors: ['Please verify your email or phone number before accessing this resource.']
    });
    return;
  }

  next();
}

/**
 * Middleware: requires email verification specifically.
 */
export function requireEmailVerification(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthenticated.' });
    return;
  }

  const user = req.user as any;
  if (!user.emailVerified) {
    res.status(403).json({
      success: false,
      message: 'Email verification required.',
      errors: ['Please verify your email address before accessing this resource.']
    });
    return;
  }

  next();
}

/**
 * Middleware: requires phone verification specifically.
 */
export function requirePhoneVerification(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthenticated.' });
    return;
  }

  const user = req.user as any;
  if (!user.phoneVerified) {
    res.status(403).json({
      success: false,
      message: 'Phone verification required.',
      errors: ['Please verify your phone number before accessing this resource.']
    });
    return;
  }

  next();
}

/**
 * Log an IP security event to the append-only IP security log.
 * Safe to call even if IPSecurityLog storage is unavailable (swallows errors).
 */
export async function logIpSecurityEvent(params: {
  req: AuthenticatedRequest;
  eventType: AuthEventType;
  success: boolean;
  userId?: string;
  userEmail?: string;
  userRole?: UserRole;
  details?: string;
  correlationId?: string;
}): Promise<void> {
  try {
    await db.createIPSecurityLog({
      ipAddress: params.req.ip || '127.0.0.1',
      userId: params.userId,
      userEmail: params.userEmail,
      userRole: params.userRole,
      correlationId: params.correlationId,
      method: params.req.method,
      endpoint: params.req.originalUrl || params.req.url,
      userAgent: params.req.headers['user-agent'],
      eventType: params.eventType,
      success: params.success,
      details: params.details
    });
  } catch {
    // IP logging must never break the request flow
  }
}
