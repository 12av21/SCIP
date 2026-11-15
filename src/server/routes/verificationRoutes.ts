// SCIP Backend - Email & SMS Verification Routes
// Implements secure OTP/token generation, verification, resend cooldowns,
// attempt limits, and provider-independent email/SMS delivery.
// Never logs OTPs, tokens, or passwords.

import { Router, Response } from 'express';
import crypto from 'node:crypto';
import { db } from '../../database/index.js';
import { authenticate, AuthenticatedRequest, logIpSecurityEvent } from '../middleware/auth.js';
import { emailService } from '../../services/emailService.js';
import { smsService } from '../../services/smsService.js';
import { User } from '../../types/scip.js';

const router = Router();

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const MAX_VERIFICATION_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;
const EMAIL_TOKEN_EXPIRY_HOURS = 24;

function generateOtp(): string {
  // Cryptographically secure 6-digit OTP
  const bytes = crypto.randomBytes(3);
  const value = (bytes[0] << 16) | (bytes[1] << 8) | bytes[2];
  return (value % 1000000).toString().padStart(6, '0');
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email) && email.length <= 254;
}

function isValidPhone(phone: string): boolean {
  // Basic E.164-ish validation for Indian mobile numbers
  const re = /^(\+91|91|0)?[6-9][0-9]{9}$/;
  return re.test(phone.replace(/\s/g, ''));
}

// ---------------------------------------------------------------------------
// POST /api/verification/send-email — send email verification token
// ---------------------------------------------------------------------------

router.post('/send-email', async (req, res: Response): Promise<void> => {
  try {
    const { email } = req.body || {};
    const correlationId = crypto.randomBytes(8).toString('hex');

    if (!isValidEmail(email)) {
      // Enumeration-safe: always return success even for invalid/missing email
      await logIpSecurityEvent({
        req, eventType: 'RATE_LIMIT_HIT', success: false,
        userId: 'UNKNOWN', userEmail: typeof email === 'string' ? email : 'UNKNOWN',
        details: 'Email verification requested with invalid email format'
      });
      res.json({ success: true, message: 'If an account exists with this email, a verification token has been sent.' });
      return;
    }

    const safeEmail = email.trim().toLowerCase();
    const user = await db.getUserByEmailWithPassword(safeEmail);
    if (!user) {
      // Enumeration-safe: don't reveal whether account exists
      await logIpSecurityEvent({
        req, eventType: 'RATE_LIMIT_HIT', success: false,
        userId: 'UNKNOWN', userEmail: safeEmail,
        details: 'Email verification requested for non-existent account'
      });
      res.json({ success: true, message: 'If an account exists with this email, a verification token has been sent.' });
      return;
    }

    if (user.emailVerified) {
      res.json({ success: true, message: 'Email is already verified.' });
      return;
    }

    // Resend cooldown check
    const now = new Date();
    const lastSent = user.lastVerificationSentAt ? new Date(user.lastVerificationSentAt) : null;
    if (lastSent && (now.getTime() - lastSent.getTime()) < RESEND_COOLDOWN_SECONDS * 1000) {
      res.status(429).json({
        success: false,
        message: 'Please wait before requesting another verification email.',
        errors: ['Resend cooldown in effect.']
      });
      return;
    }

    // Attempt limit check
    if ((user.verificationAttempts ?? 0) >= MAX_VERIFICATION_ATTEMPTS) {
      res.status(429).json({
        success: false,
        message: 'Too many verification attempts. Please contact support.',
        errors: ['Verification attempts exceeded.']
      });
      return;
    }

    const token = generateToken();
    const tokenHash = hashValue(token);
    const expiresAt = new Date(now.getTime() + EMAIL_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

    await db.setUserEmailVerificationToken(user.id, tokenHash, expiresAt);
    await db.updateUserVerificationStatus(user.id, {
      lastVerificationSentAt: now.toISOString()
    });

    // Send email via provider-independent service
    const verificationLink = `${process.env.APP_BASE_URL || 'http://localhost:3000'}/verify-email?token=${token}&email=${encodeURIComponent(safeEmail)}`;
    const emailResult = await emailService.sendEmail({
      to: safeEmail,
      subject: 'SCIP - Verify Your Email Address',
      htmlBody: `
        <h2>Verify your SCIP account</h2>
        <p>Hello ${user.name},</p>
        <p>Please verify your email address by clicking the link below:</p>
        <p><a href="${verificationLink}">Verify Email</a></p>
        <p>This link expires in ${EMAIL_TOKEN_EXPIRY_HOURS} hours.</p>
        <p>If you did not request this, you can safely ignore this email.</p>
      `,
      textBody: `Hello ${user.name},\nPlease verify your email address by visiting: ${verificationLink}\nThis link expires in ${EMAIL_TOKEN_EXPIRY_HOURS} hours.\nIf you did not request this, you can safely ignore this email.`,
      correlationId
    });

    if (!emailResult.success) {
      // Log but don't fail - token is stored, user can retry
      await logIpSecurityEvent({
        req, eventType: 'SUSPICIOUS_ACTIVITY', success: false,
        userId: user.id, userEmail: user.email, userRole: user.role,
        details: `Email verification token generated but email delivery failed: ${emailResult.error}`
      });
      res.status(500).json({
        success: false,
        message: 'Verification token generated but email delivery failed. Please try again later.',
        errors: ['Email delivery failed.']
      });
      return;
    }

    await logIpSecurityEvent({
      req, eventType: 'REGISTER', success: true,
      userId: user.id, userEmail: user.email, userRole: user.role,
      details: 'Email verification token sent'
    });

    res.json({
      success: true,
      message: 'Verification email sent. Please check your inbox.',
      // Only expose messageId in non-production for debugging
      ...(process.env.NODE_ENV !== 'production' ? { messageId: emailResult.messageId, provider: emailResult.provider } : {})
    });
  } catch (err: any) {
    await logIpSecurityEvent({
      req, eventType: 'SUSPICIOUS_ACTIVITY', success: false,
      userId: 'UNKNOWN', userEmail: typeof req.body?.email === 'string' ? req.body.email : 'UNKNOWN',
      details: `Email verification send error: ${err.message}`
    });
    res.status(500).json({ success: false, message: 'Failed to send verification email.', errors: ['Internal error.'] });
  }
});

// ---------------------------------------------------------------------------
// POST /api/verification/verify-email — verify email with token
// ---------------------------------------------------------------------------

router.post('/verify-email', async (req, res: Response): Promise<void> => {
  try {
    const { email, token } = req.body || {};

    if (!isValidEmail(email) || typeof token !== 'string' || token.length === 0) {
      res.status(400).json({ success: false, message: 'Email and verification token are required.', errors: ['Invalid input.'] });
      return;
    }

    const safeEmail = email.trim().toLowerCase();
    const user = await db.getUserByEmailWithPassword(safeEmail);
    if (!user) {
      // Enumeration-safe
      res.status(400).json({ success: false, message: 'Invalid verification token or email.', errors: ['Invalid input.'] });
      return;
    }

    if (user.emailVerified) {
      res.json({ success: true, message: 'Email is already verified.' });
      return;
    }

    // Attempt limit check
    if ((user.verificationAttempts ?? 0) >= MAX_VERIFICATION_ATTEMPTS) {
      res.status(429).json({
        success: false,
        message: 'Too many verification attempts. Please request a new token.',
        errors: ['Verification attempts exceeded.']
      });
      return;
    }

    const verified = await db.verifyUserEmail(user.id, token);

    if (!verified) {
      await db.incrementVerificationAttempts(user.id);
      await logIpSecurityEvent({
        req, eventType: 'LOGIN_FAILED', success: false,
        userId: user.id, userEmail: user.email, userRole: user.role,
        details: 'Invalid or expired email verification token'
      });
      res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token. Please request a new one.',
        errors: ['Invalid or expired token.']
      });
      return;
    }

    await db.resetVerificationAttempts(user.id);

    await logIpSecurityEvent({
      req, eventType: 'REGISTER', success: true,
      userId: user.id, userEmail: user.email, userRole: user.role,
      details: 'Email verified successfully'
    });

    // If both email and phone verified, activate account
    if (user.phoneVerified) {
      // Account activation is handled by checking verification status in middleware
    }

    res.json({ success: true, message: 'Email verified successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to verify email.', errors: ['Internal error.'] });
  }
});

// ---------------------------------------------------------------------------
// POST /api/verification/send-sms — send SMS OTP
// ---------------------------------------------------------------------------

router.post('/send-sms', async (req, res: Response): Promise<void> => {
  try {
    const { phone } = req.body || {};
    const correlationId = crypto.randomBytes(8).toString('hex');

    if (!isValidPhone(phone)) {
      res.json({ success: true, message: 'If an account exists with this phone number, an OTP has been sent.' });
      return;
    }

    const normalizedPhone = phone.replace(/\s/g, '').replace(/^(\+91|91)/, '');
    const user = Array.from((db as any).getUsers ? (db as any).getUsers() : []).find((u: any) => u.phone === normalizedPhone || u.phone === phone);
    // Use getUserByEmailWithPassword equivalent - we need to find by phone
    // The repository doesn't have getUserByPhone, so we iterate
    let foundUser: User | undefined;
    const allUsers = await db.getUsers();
    for (const u of allUsers) {
      if (u.phone && (u.phone.replace(/\s/g, '') === normalizedPhone || u.phone === phone)) {
        foundUser = u;
        break;
      }
    }

    if (!foundUser) {
      res.json({ success: true, message: 'If an account exists with this phone number, an OTP has been sent.' });
      return;
    }

    if (foundUser.phoneVerified) {
      res.json({ success: true, message: 'Phone is already verified.' });
      return;
    }

    // Resend cooldown check
    const now = new Date();
    const lastSent = foundUser.lastVerificationSentAt ? new Date(foundUser.lastVerificationSentAt) : null;
    if (lastSent && (now.getTime() - lastSent.getTime()) < RESEND_COOLDOWN_SECONDS * 1000) {
      res.status(429).json({
        success: false,
        message: 'Please wait before requesting another SMS.',
        errors: ['Resend cooldown in effect.']
      });
      return;
    }

    // Attempt limit check
    if ((foundUser.verificationAttempts ?? 0) >= MAX_VERIFICATION_ATTEMPTS) {
      res.status(429).json({
        success: false,
        message: 'Too many verification attempts. Please contact support.',
        errors: ['Verification attempts exceeded.']
      });
      return;
    }

    const otp = generateOtp();
    const otpHash = hashValue(otp);
    const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

    await db.setUserPhoneVerificationOtp(foundUser.id, otpHash, expiresAt);
    await db.updateUserVerificationStatus(foundUser.id, {
      lastVerificationSentAt: now.toISOString()
    });

    // Send SMS via provider-independent service
    const smsResult = await smsService.sendSms({
      to: foundUser.phone || '',
      message: `SCIP verification code: ${otp}. This code expires in ${OTP_EXPIRY_MINUTES} minutes. Do not share this code.`,
      correlationId
    });

    if (!smsResult.success) {
      await logIpSecurityEvent({
        req, eventType: 'SUSPICIOUS_ACTIVITY', success: false,
        userId: foundUser.id, userEmail: foundUser.email, userRole: foundUser.role,
        details: `SMS OTP generated but delivery failed: ${smsResult.error}`
      });
      res.status(500).json({
        success: false,
        message: 'OTP generated but SMS delivery failed. Please try again later.',
        errors: ['SMS delivery failed.']
      });
      return;
    }

    await logIpSecurityEvent({
      req, eventType: 'REGISTER', success: true,
      userId: foundUser.id, userEmail: foundUser.email, userRole: foundUser.role,
      details: 'SMS verification OTP sent'
    });

    res.json({
      success: true,
      message: 'Verification SMS sent. Please check your messages.',
      ...(process.env.NODE_ENV !== 'production' ? { provider: smsResult.provider } : {})
    });
  } catch (err: any) {
    await logIpSecurityEvent({
      req, eventType: 'SUSPICIOUS_ACTIVITY', success: false,
      userId: 'UNKNOWN', userEmail: typeof req.body?.phone === 'string' ? req.body.phone : 'UNKNOWN',
      details: `SMS verification send error: ${err.message}`
    });
    res.status(500).json({ success: false, message: 'Failed to send verification SMS.', errors: ['Internal error.'] });
  }
});

// ---------------------------------------------------------------------------
// POST /api/verification/verify-sms — verify phone with OTP
// ---------------------------------------------------------------------------

router.post('/verify-sms', async (req, res: Response): Promise<void> => {
  try {
    const { phone, otp } = req.body || {};

    if (!isValidPhone(phone) || typeof otp !== 'string' || otp.length !== OTP_LENGTH) {
      res.status(400).json({ success: false, message: 'Phone and 6-digit OTP are required.', errors: ['Invalid input.'] });
      return;
    }

    const normalizedPhone = phone.replace(/\s/g, '').replace(/^(\+91|91)/, '');
    let foundUser: User | undefined;
    const allUsers = await db.getUsers();
    for (const u of allUsers) {
      if (u.phone && (u.phone.replace(/\s/g, '') === normalizedPhone || u.phone === phone)) {
        foundUser = u;
        break;
      }
    }

    if (!foundUser) {
      res.status(400).json({ success: false, message: 'Invalid OTP or phone number.', errors: ['Invalid input.'] });
      return;
    }

    if (foundUser.phoneVerified) {
      res.json({ success: true, message: 'Phone is already verified.' });
      return;
    }

    if ((foundUser.verificationAttempts ?? 0) >= MAX_VERIFICATION_ATTEMPTS) {
      res.status(429).json({
        success: false,
        message: 'Too many verification attempts. Please request a new OTP.',
        errors: ['Verification attempts exceeded.']
      });
      return;
    }

    const verified = await db.verifyUserPhone(foundUser.id, otp);

    if (!verified) {
      await db.incrementVerificationAttempts(foundUser.id);
      await logIpSecurityEvent({
        req, eventType: 'LOGIN_FAILED', success: false,
        userId: foundUser.id, userEmail: foundUser.email, userRole: foundUser.role,
        details: 'Invalid or expired SMS OTP'
      });
      res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP. Please request a new one.',
        errors: ['Invalid or expired OTP.']
      });
      return;
    }

    await db.resetVerificationAttempts(foundUser.id);

    await logIpSecurityEvent({
      req, eventType: 'REGISTER', success: true,
      userId: foundUser.id, userEmail: foundUser.email, userRole: foundUser.role,
      details: 'Phone verified successfully'
    });

    res.json({ success: true, message: 'Phone verified successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to verify phone.', errors: ['Internal error.'] });
  }
});

// ---------------------------------------------------------------------------
// GET /api/verification/status — get verification status for authenticated user
// ---------------------------------------------------------------------------

router.get('/status', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const status = await db.getUserVerificationStatus(req.user!.id);
    if (!status) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }
    res.json({ success: true, data: status });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to get verification status.', errors: ['Internal error.'] });
  }
});

// ---------------------------------------------------------------------------
// POST /api/verification/resend — resend verification (email or SMS)
// ---------------------------------------------------------------------------

router.post('/resend', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { channel } = req.body || {}; // 'email' | 'sms'
    const now = new Date();
    const user = await db.getUserById(req.user!.id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    // Resend cooldown check
    const lastSent = user.lastVerificationSentAt ? new Date(user.lastVerificationSentAt) : null;
    if (lastSent && (now.getTime() - lastSent.getTime()) < RESEND_COOLDOWN_SECONDS * 1000) {
      res.status(429).json({
        success: false,
        message: 'Please wait before requesting another verification.',
        errors: ['Resend cooldown in effect.']
      });
      return;
    }

    if (channel === 'email') {
      if (user.emailVerified) {
        res.json({ success: true, message: 'Email is already verified.' });
        return;
      }
      const token = generateToken();
      const tokenHash = hashValue(token);
      const expiresAt = new Date(now.getTime() + EMAIL_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();
      await db.setUserEmailVerificationToken(user.id, tokenHash, expiresAt);
      await db.updateUserVerificationStatus(user.id, { lastVerificationSentAt: now.toISOString() });
      const verificationLink = `${process.env.APP_BASE_URL || 'http://localhost:3000'}/verify-email?token=${token}&email=${encodeURIComponent(user.email)}`;
      await emailService.sendEmail({
        to: user.email,
        subject: 'SCIP - Resend Email Verification',
        htmlBody: `<h2>Resend Email Verification</h2><p>Hello ${user.name},</p><p>Click to verify: <a href="${verificationLink}">Verify Email</a></p><p>Expires in ${EMAIL_TOKEN_EXPIRY_HOURS} hours.</p>`,
        textBody: `Hello ${user.name},\nVerify: ${verificationLink}\nExpires in ${EMAIL_TOKEN_EXPIRY_HOURS} hours.`
      });
      res.json({ success: true, message: 'Verification email resent.' });
    } else if (channel === 'sms') {
      if (user.phoneVerified) {
        res.json({ success: true, message: 'Phone is already verified.' });
        return;
      }
      if (!user.phone) {
        res.status(400).json({ success: false, message: 'No phone number on file.', errors: ['No phone.'] });
        return;
      }
      const otp = generateOtp();
      const otpHash = hashValue(otp);
      const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();
      await db.setUserPhoneVerificationOtp(user.id, otpHash, expiresAt);
      await db.updateUserVerificationStatus(user.id, { lastVerificationSentAt: now.toISOString() });
      await smsService.sendSms({
        to: user.phone,
        message: `SCIP verification code: ${otp}. Expires in ${OTP_EXPIRY_MINUTES} minutes.`
      });
      res.json({ success: true, message: 'Verification SMS resent.' });
    } else {
      res.status(400).json({ success: false, message: 'Channel must be "email" or "sms".', errors: ['Invalid channel.'] });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Resend failed.', errors: ['Internal error.'] });
  }
});

export default router;
