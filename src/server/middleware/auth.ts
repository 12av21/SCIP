// SCIP Backend - Authentication & RBAC Middleware

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../../database/index.js';
import { User, UserPermission, UserRole, AuthEventType } from '../../types/scip.ts';

const MIN_JWT_SECRET_LENGTH = 32;
let cachedSecret: string | null = null;

export function getJwtSecret(): string {
  if (cachedSecret) return cachedSecret;
  const secret = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';
  if (!secret || secret.trim().length < MIN_JWT_SECRET_LENGTH) {
    if (isProduction) {
      throw new Error('JWT_SECRET is required in production and must be at least 32 characters.');
    }
    // Development/test fallback: explicit, non-production only. Never use in production.
    if (!secret || !secret.trim()) {
      cachedSecret = 'scip-dev-only-jwt-secret-do-not-use-in-production-32ch';
      return cachedSecret;
    }
  }
  cachedSecret = secret!.trim();
  return cachedSecret;
}

export function validateJwtConfigOnStartup(): void {
  // Fail closed in production if secret missing/weak.
  getJwtSecret();
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
}
export const AuthenticatedRequest = {} as any;

export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
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
    const decoded = jwt.verify(token, getJwtSecret()) as { id: string; email: string; role?: string; sv?: number };
    const user = await db.getUserById(decoded.id);

    if (!user) {
      await logIpSecurityEvent({
        req, eventType: 'LOGIN_FAILED', success: false,
        userId: decoded.id, userEmail: decoded.email,
        details: 'User no longer exists or session is invalid'
      });
      res.status(401).json({
        success: false,
        message: 'User no longer exists or session is invalid.',
        errors: ['Invalid user session.']
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

    if (typeof decoded.sv === 'number' && typeof user.sessionVersion === 'number' && decoded.sv !== user.sessionVersion) {
      await logIpSecurityEvent({
        req, eventType: 'LOGIN_FAILED', success: false,
        userId: user.id, userEmail: user.email, userRole: user.role,
        details: 'Session revoked'
      });
      res.status(401).json({
        success: false,
        message: 'Session is no longer valid. Please sign in again.',
        errors: ['Session revoked.']
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

    // Successful authentication
    await logIpSecurityEvent({
      req, eventType: 'LOGIN_SUCCESS', success: true,
      userId: user.id, userEmail: user.email, userRole: user.role,
      details: 'User authenticated successfully'
    });

    req.user = user;
    next();
  } catch (err: any) {
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

export function requirePermission(permission: UserPermission) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthenticated.' });
      return;
    }

    // Unverified accounts cannot access protected resources
    const user = req.user as any;
    if (!user.emailVerified && !user.phoneVerified) {
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
