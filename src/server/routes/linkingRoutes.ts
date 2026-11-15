// SCIP Backend - Clerk Identity Linking Routes (Phase 3.1.3)
//
// Controlled migration of unlinked SCIP users to verified Clerk identities.
// - Bootstrap endpoints are Clerk-only (authenticateLinking): no SCIP account,
//   role, or permission required; identity comes only from the verified Clerk `sub`.
// - Ownership proof: ONE_TIME_CHALLENGE is delivered ONLY to a VERIFIED contact
//   channel already on file for the target SCIP account. Email-only is never
//   accepted as proof on its own; the SCIP record must already carry a verified
//   channel. Otherwise the request falls back to administrator approval.
// - Enumeration-safe: request/status/cancel responses never reveal whether a
//   claimed SCIP account exists.
// - Never logs or returns OTPs, challenge hashes, salts, or tokens.

import { Router, Response } from 'express';
import crypto from 'node:crypto';
import { db } from '../../database/index.js';
import { authenticate, authenticateLinking, requirePermission, AuthenticatedRequest, logIpSecurityEvent } from '../middleware/auth.js';
import { emailService } from '../../services/emailService.js';
import { smsService } from '../../services/smsService.js';
import { createRateLimitStore } from '../rateLimit.js';
import { ClerkIdentityLink, ClerkLinkVerificationMethod } from '../../types/scip.js';

const router = Router();
const rateLimitStore = createRateLimitStore();

const CHALLENGE_OTP_LENGTH = 6;
const CHALLENGE_EXPIRY_MINUTES = 10;
const CHALLENGE_RESEND_COOLDOWN_SECONDS = 60;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;
const MAX_CHALLENGE_SUBMITS_PER_WINDOW = 10;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateOtp(): string {
  const bytes = crypto.randomBytes(3);
  const value = (bytes[0] << 16) | (bytes[1] << 8) | bytes[2];
  return (value % 1000000).toString().padStart(6, '0');
}

function hashChallenge(salt: string, otp: string): string {
  return crypto.createHash('sha256').update(salt + otp).digest('hex');
}

function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email) && email.length <= 254;
}

function isValidPhone(phone: string): boolean {
  const re = /^(\+91|91|0)?[6-9][0-9]{9}$/;
  return re.test(phone.replace(/\s/g, ''));
}

function isVerificationMethod(v: any): v is ClerkLinkVerificationMethod {
  return v === 'ADMIN_APPROVED' || v === 'ONE_TIME_CHALLENGE';
}

// Strip challenge material before returning a link record to any client.
function publicLink(link: ClerkIdentityLink): Record<string, unknown> {
  const { challengeHash, challengeSalt, ...safe } = link as any;
  return safe;
}

// Minimal safe view of a user for the owner's own status view.
function safeSelfUser(user: any): Record<string, unknown> {
  if (!user) return {};
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status
  };
}

// Admin view of a link (admins manage identities, so clerkSubject is included).
function adminLink(link: ClerkIdentityLink): Record<string, unknown> {
  const { challengeHash, challengeSalt, ...safe } = link as any;
  return safe;
}

// Resolve a claimed SCIP identity from the request body. Returns the full user
// record (including passwordHash) for internal use only; callers must never
// return or log the password hash.
async function resolveTargetUser(body: any): Promise<any | null> {
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (email && isValidEmail(email)) {
    return await db.getUserByEmailWithPassword(email);
  }
  const scipUserId = typeof body?.scipUserId === 'string'
    ? body.scipUserId.trim()
    : (typeof body?.userId === 'string' ? body.userId.trim() : '');
  if (scipUserId) {
    return await db.getUserById(scipUserId);
  }
  return null;
}

function strIp(req: AuthenticatedRequest): string {
  return req.ip || '127.0.0.1';
}

// ---------------------------------------------------------------------------
// POST /api/auth/linking/request — create a linking request (Clerk-only)
// ---------------------------------------------------------------------------

router.post('/auth/linking/request', authenticateLinking, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const correlationId = crypto.randomBytes(8).toString('hex');
  const clerkSubject = req.clerkSubject as string;
  try {
    const rlKey = `link-req:${clerkSubject}`;
    const count = await rateLimitStore.increment(rlKey, WINDOW_MS);
    if (count > MAX_REQUESTS_PER_WINDOW) {
      await logIpSecurityEvent({ req, eventType: 'RATE_LIMIT_HIT', success: false, details: `Linking request rate limit hit (${correlationId})` });
      res.status(429).json({ success: false, message: 'Too many linking requests. Please try again later.', errors: ['Rate limit exceeded.'] });
      return;
    }

    const method: ClerkLinkVerificationMethod = isVerificationMethod(req.body?.verificationMethod)
      ? (req.body as any).verificationMethod
      : 'ADMIN_APPROVED';

    // Already linked to a SCIP account: nothing to do.
    const alreadyLinkedUser = await db.getUserByClerkId(clerkSubject);
    if (alreadyLinkedUser) {
      res.json({ success: true, message: 'If the account exists and is eligible, a linking request has been created.' });
      return;
    }

    const target = await resolveTargetUser(req.body || {});
    // Enumeration-safe: identical response whether or not the target exists.
    if (!target) {
      await logIpSecurityEvent({ req, eventType: 'SUSPICIOUS_ACTIVITY', success: false, details: `Linking request for unresolvable target (${correlationId})` });
      res.json({ success: true, message: 'If the account exists and is eligible, a linking request has been created.' });
      return;
    }
    if (typeof target.clerkUserId === 'string' && target.clerkUserId.trim().length > 0) {
      await logIpSecurityEvent({ req, eventType: 'SUSPICIOUS_ACTIVITY', success: false, userId: target.id, details: `Linking request for already-linked account (${correlationId})` });
      res.json({ success: true, message: 'If the account exists and is eligible, a linking request has been created.' });
      return;
    }

    let link: ClerkIdentityLink;
    try {
      link = await db.createClerkLinkRequest({
        scipUserId: target.id,
        clerkSubject,
        verificationMethod: method,
        correlationId
      });
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg === 'ALREADY_LINKED' || msg === 'IDENTITY_TAKEN') {
        res.json({ success: true, message: 'If the account exists and is eligible, a linking request has been created.' });
        return;
      }
      throw e;
    }

    let challengeSent = false;
    let deliveryError: string | undefined;

    if (method === 'ONE_TIME_CHALLENGE') {
      // Ownership proof is only allowed to a VERIFIED channel already on file.
      if (target.emailVerified && typeof target.email === 'string' && target.email.length > 0) {
        const otp = generateOtp();
        const salt = crypto.randomBytes(16).toString('hex');
        const challengeHash = hashChallenge(salt, otp);
        const now = Date.now();
        const expiresAt = new Date(now + CHALLENGE_EXPIRY_MINUTES * 60 * 1000).toISOString();
        const resendCooldownUntil = new Date(now + CHALLENGE_RESEND_COOLDOWN_SECONDS * 1000).toISOString();
        await db.setClerkLinkChallenge(link.id, challengeHash, salt, expiresAt, resendCooldownUntil);
        const r = await emailService.sendEmail({
          to: target.email,
          subject: 'SCIP - Confirm your account linking',
          htmlBody: `
            <h2>Confirm your SCIP account linking</h2>
            <p>Hello ${target.name},</p>
            <p>Use the verification code below to link your Clerk sign-in to this SCIP account:</p>
            <p style="font-size:24px;font-weight:bold;letter-spacing:4px;">${otp}</p>
            <p>This code expires in ${CHALLENGE_EXPIRY_MINUTES} minutes.</p>
            <p>If you did not request this, you can safely ignore this email.</p>
          `,
          textBody: `Hello ${target.name},\nYour SCIP account linking verification code is: ${otp}\nThis code expires in ${CHALLENGE_EXPIRY_MINUTES} minutes.\nIf you did not request this, you can safely ignore this message.`,
          correlationId
        });
        if (r.success) challengeSent = true;
        else deliveryError = r.error;
      } else if (target.phoneVerified && typeof target.phone === 'string' && isValidPhone(target.phone)) {
        const otp = generateOtp();
        const salt = crypto.randomBytes(16).toString('hex');
        const challengeHash = hashChallenge(salt, otp);
        const now = Date.now();
        const expiresAt = new Date(now + CHALLENGE_EXPIRY_MINUTES * 60 * 1000).toISOString();
        const resendCooldownUntil = new Date(now + CHALLENGE_RESEND_COOLDOWN_SECONDS * 1000).toISOString();
        await db.setClerkLinkChallenge(link.id, challengeHash, salt, expiresAt, resendCooldownUntil);
        const r = await smsService.sendSms({
          to: target.phone,
          message: `SCIP: your account linking verification code is ${otp}. It expires in ${CHALLENGE_EXPIRY_MINUTES} minutes. If you did not request this, ignore this message.`,
          correlationId
        });
        if (r.success) challengeSent = true;
        else deliveryError = r.error;
      }
      // No verified channel: the request remains PENDING for administrator approval.
    }

    await db.logAudit({
      action: 'SECURITY_EVENT',
      module: 'security',
      recordId: link.id,
      userId: target.id,
      userEmail: target.email,
      userRole: target.role,
      ipAddress: strIp(req),
      details: `Clerk identity linking requested (method=${method}); challengeSent=${challengeSent}`
    });

    if (deliveryError) {
      await logIpSecurityEvent({ req, eventType: 'SUSPICIOUS_ACTIVITY', success: false, userId: target.id, details: `Linking challenge delivery failed: ${deliveryError}` });
    }

    res.json({ success: true, message: 'If the account exists and is eligible, a linking request has been created.' });
  } catch (err: any) {
    await logIpSecurityEvent({ req, eventType: 'SUSPICIOUS_ACTIVITY', success: false, details: `Linking request error: ${err?.message}` });
    res.status(500).json({ success: false, message: 'Failed to submit linking request.', errors: ['Internal error.'] });
  }
});

// ---------------------------------------------------------------------------
// GET /api/auth/linking/status — status of the caller's own linking (Clerk-only)
// ---------------------------------------------------------------------------

router.get('/auth/linking/status', authenticateLinking, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await db.expireStaleClerkLinks();
    const clerkSubject = req.clerkSubject as string;
    const link = await db.getClerkLinkBySubject(clerkSubject);
    const linkedUser = req.user || await db.getUserByClerkId(clerkSubject);

    if (!link) {
      if (linkedUser) {
        res.json({ success: true, data: { status: 'LINKED', user: safeSelfUser(linkedUser) } });
      } else {
        res.json({ success: true, data: { status: 'NOT_LINKED' } });
      }
      return;
    }

    const challengePending = typeof link.challengeHash === 'string' && link.challengeHash.length > 0;
    const attemptsRemaining = Math.max(0, link.maxAttempts - link.attemptCount);
    res.json({
      success: true,
      data: {
        id: link.id,
        status: link.status,
        verificationMethod: link.verificationMethod,
        challengePending,
        challengeExpiresAt: link.challengeExpiresAt,
        attemptsRemaining,
        expiresAt: link.expiresAt,
        createdAt: link.createdAt,
        updatedAt: link.updatedAt,
        ...(linkedUser ? { user: safeSelfUser(linkedUser) } : {})
      }
    });
  } catch (err: any) {
    await logIpSecurityEvent({ req, eventType: 'SUSPICIOUS_ACTIVITY', success: false, details: `Linking status error: ${err?.message}` });
    res.status(500).json({ success: false, message: 'Failed to load linking status.', errors: ['Internal error.'] });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/linking/cancel — cancel the caller's own linking request
// ---------------------------------------------------------------------------

router.post('/auth/linking/cancel', authenticateLinking, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.body || {};
  if (typeof id !== 'string' || id.trim().length === 0) {
    res.status(400).json({ success: false, message: 'A linking request id is required.', errors: ['Invalid input.'] });
    return;
  }
  try {
    // cancelClerkLink only revokes when the id belongs to this Clerk identity.
    await db.cancelClerkLink(id.trim(), req.clerkSubject as string);
    res.json({ success: true, message: 'Linking request cancelled.' });
  } catch (err: any) {
    await logIpSecurityEvent({ req, eventType: 'SUSPICIOUS_ACTIVITY', success: false, details: `Linking cancel error: ${err?.message}` });
    res.status(500).json({ success: false, message: 'Failed to cancel linking request.', errors: ['Internal error.'] });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/linking/challenge — submit OTP for the caller's own request
// ---------------------------------------------------------------------------

router.post('/auth/linking/challenge', authenticateLinking, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id, otp } = req.body || {};
  if (typeof id !== 'string' || id.trim().length === 0 || typeof otp !== 'string' || otp.trim().length === 0) {
    res.status(400).json({ success: false, message: 'A linking request id and verification code are required.', errors: ['Invalid input.'] });
    return;
  }
  const linkId = id.trim();
  try {
    const rlKey = `link-chal:${req.clerkSubject}:${linkId}`;
    const count = await rateLimitStore.increment(rlKey, WINDOW_MS);
    if (count > MAX_CHALLENGE_SUBMITS_PER_WINDOW) {
      await logIpSecurityEvent({ req, eventType: 'RATE_LIMIT_HIT', success: false, details: 'Linking challenge rate limit hit' });
      res.status(429).json({ success: false, message: 'Too many verification attempts. Please try again later.', errors: ['Rate limit exceeded.'] });
      return;
    }

    // Ownership check: the link must belong to this Clerk identity.
    const link = await db.getClerkLinkById(linkId);
    if (!link || link.clerkSubject !== req.clerkSubject) {
      res.status(404).json({ success: false, message: 'Linking request not found.', errors: ['Not found.'] });
      return;
    }

    const targetUser = await db.getUserById(link.scipUserId);
    const result = await db.submitClerkLinkChallenge(linkId, otp.trim());

    if (result.linked) {
      await db.logAudit({
        action: 'SECURITY_EVENT',
        module: 'auth',
        recordId: linkId,
        userId: link.scipUserId,
        userEmail: targetUser?.email ?? 'unknown',
        userRole: targetUser?.role ?? 'citizen',
        ipAddress: strIp(req),
        details: 'Clerk identity linked to SCIP account via verified challenge'
      });
      res.json({ success: true, message: 'Your account has been linked.', data: { linked: true } });
      return;
    }

    if (result.verified) {
      res.status(400).json({ success: false, message: 'Verification succeeded but linking could not be completed.', errors: [result.reason || 'link_failed'] });
      return;
    }

    res.status(400).json({ success: false, message: 'Invalid or expired verification code.', errors: [result.reason || 'invalid'] });
  } catch (err: any) {
    await logIpSecurityEvent({ req, eventType: 'SUSPICIOUS_ACTIVITY', success: false, details: `Linking challenge error: ${err?.message}` });
    res.status(500).json({ success: false, message: 'Failed to verify code.', errors: ['Internal error.'] });
  }
});

// ---------------------------------------------------------------------------
// Admin: linking approval queue (requires admin.manage)
// ---------------------------------------------------------------------------

router.get('/admin/clerk-links/pending', authenticate, requirePermission('admin.manage'), async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await db.expireStaleClerkLinks();
    const pending = await db.listPendingClerkLinks();
    res.json({ success: true, data: pending.map(adminLink), meta: { total: pending.length } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to load pending linking requests.', errors: ['Internal error.'] });
  }
});

router.get('/admin/clerk-links/user/:scipUserId', authenticate, requirePermission('admin.manage'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const links = await db.getClerkLinksByScipUser(req.params.scipUserId);
    res.json({ success: true, data: links.map(adminLink), meta: { total: links.length } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to load linking requests.', errors: ['Internal error.'] });
  }
});

router.get('/admin/clerk-links/:id', authenticate, requirePermission('admin.manage'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const link = await db.getClerkLinkById(req.params.id);
  if (!link) { res.status(404).json({ success: false, message: 'Linking request not found.', errors: ['Not found.'] }); return; }
  res.json({ success: true, data: adminLink(link) });
});

router.post('/admin/clerk-links/:id/approve', authenticate, requirePermission('admin.manage'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const link = await db.getClerkLinkById(req.params.id);
    if (!link) { res.status(404).json({ success: false, message: 'Linking request not found.', errors: ['Not found.'] }); return; }
    // Self-approval prevention: an admin cannot approve their own account link.
    if (link.scipUserId === req.user!.id) {
      await logIpSecurityEvent({ req, eventType: 'SUSPICIOUS_ACTIVITY', success: false, userId: req.user!.id, details: 'Self-approval of own Clerk link blocked' });
      res.status(400).json({ success: false, message: 'Administrators cannot approve their own account linking.', errors: ['Self-approval blocked.'] });
      return;
    }
    const result = await db.decideClerkLink(req.params.id, 'approve', req.user!, 'Approved by administrator');
    if (result.linked) {
      await logIpSecurityEvent({ req, eventType: 'LOGIN_SUCCESS', success: true, userId: link.scipUserId, details: 'Clerk identity link approved by administrator' });
      res.json({ success: true, message: 'Linking request approved.', data: { linked: true } });
      return;
    }
    res.status(400).json({ success: false, message: 'Linking request could not be approved.', errors: [result.reason || 'approval_failed'] });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to approve linking request.', errors: ['Internal error.'] });
  }
});

router.post('/admin/clerk-links/:id/reject', authenticate, requirePermission('admin.manage'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.slice(0, 240) : 'Rejected by administrator';
    const result = await db.decideClerkLink(req.params.id, 'reject', req.user!, reason);
    if (result.reason === 'not_found') { res.status(404).json({ success: false, message: 'Linking request not found.', errors: ['Not found.'] }); return; }
    if (result.reason === 'invalid_state') { res.status(400).json({ success: false, message: 'Linking request is not pending.', errors: ['Invalid state.'] }); return; }
    res.json({ success: true, message: 'Linking request rejected.', data: { rejected: true } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to reject linking request.', errors: ['Internal error.'] });
  }
});

export default router;