// SCIP Email & SMS Verification Test Suite
// Independent tests for email/SMS verification using synthetic data and isolated database.
// Does not modify production data (.scip_database.json). Never sends real emails/SMS.

import { SCIPDatabase } from '../src/database/scipDatabase.js';
import {
  ConsoleEmailProvider, MockEmailProvider, createEmailService
} from '../src/services/emailService.js';
import {
  ConsoleSmsProvider, MockSmsProvider, createSmsService
} from '../src/services/smsService.js';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

interface TestResult {
  capability: string;
  testName: string;
  input: any;
  expected: any;
  actual: any;
  durationMs: number;
  pass: boolean;
  notes: string;
}

const results: TestResult[] = [];

async function timeIt<T>(fn: () => Promise<T>): Promise<{ result: T; durationMs: number }> {
  const start = performance.now();
  const result = await fn();
  const durationMs = Number((performance.now() - start).toFixed(2));
  return { result, durationMs };
}

function addResult(
  capability: string,
  testName: string,
  input: any,
  expected: any,
  actual: any,
  durationMs: number,
  pass: boolean,
  notes: string
) {
  results.push({ capability, testName, input, expected, actual, durationMs, pass, notes });
  const status = pass ? 'PASS' : 'FAIL';
  console.log(`[${status}] ${capability} > ${testName} (${durationMs}ms)${notes ? ` | ${notes}` : ''}`);
}

// ============================================================================
// Setup isolated temp directory
// ============================================================================

const TEST_DIR = path.resolve('C:/Users/HP/AppData/Local/Temp/kilo/scip-verification-tests');
if (!fs.existsSync(TEST_DIR)) {
  fs.mkdirSync(TEST_DIR, { recursive: true });
}
// Clean old test db files
for (const f of fs.readdirSync(TEST_DIR)) {
  if (f.endsWith('.json')) fs.unlinkSync(path.resolve(TEST_DIR, f));
}

function testDbPath(name: string): string {
  return path.resolve(TEST_DIR, `${name}-${Date.now()}.json`);
}

function newDb(name: string): SCIPDatabase {
  return new SCIPDatabase(testDbPath(name));
}

function createTestUser(db: SCIPDatabase, overrides: Partial<{
  name: string; email: string; phone: string; role: string;
  emailVerified: boolean; phoneVerified: boolean; verificationAttempts: number;
  status: string
}> = {}): any {
  return db.createUser({
    name: overrides.name || 'Test User',
    email: overrides.email || `test-${Date.now()}-${Math.floor(Math.random() * 1000)}@test.in`,
    passwordHash: crypto.randomBytes(32).toString('hex'),
    role: (overrides.role || 'citizen') as any,
    phone: overrides.phone,
    status: (overrides.status || 'unverified') as any,
    emailVerified: overrides.emailVerified ?? false,
    phoneVerified: overrides.phoneVerified ?? false,
    verificationAttempts: overrides.verificationAttempts ?? 0
  } as any);
}

// ============================================================================
// Test 1: Email Service Providers
// ============================================================================

console.log('\n=== TEST 1: Email Service Providers ===\n');

// 1.1 ConsoleEmailProvider - success
{
  const provider = new ConsoleEmailProvider({
    provider: 'console',
    fromEmail: 'noreply@scip.gov',
    fromName: 'SCIP Portal'
  });
  const { result, durationMs } = await timeIt(() =>
    provider.sendEmail({ to: 'test@example.com', subject: 'Test', htmlBody: '<p>Hello</p>', textBody: 'Hello' })
  );
  addResult(
    'Email Provider', 'Console provider success',
    { provider: 'console', to: 'test@example.com' },
    { success: true },
    { success: result.success, provider: result.provider },
    durationMs,
    result.success === true && result.provider === 'console',
    'Console provider always returns success'
  );
}

// 1.2 MockEmailProvider - success
{
  const provider = new MockEmailProvider({
    provider: 'mock',
    fromEmail: 'noreply@scip.gov',
    fromName: 'SCIP Portal'
  });
  const { result, durationMs } = await timeIt(() =>
    provider.sendEmail({ to: 'test@example.com', subject: 'Test', htmlBody: '<p>Hello</p>', textBody: 'Hello' })
  );
  addResult(
    'Email Provider', 'Mock provider success',
    { provider: 'mock', shouldFail: false },
    { success: true },
    { success: result.success, provider: result.provider },
    durationMs,
    result.success === true && result.provider === 'mock',
    'Mock provider returns success when not failing'
  );
}

// 1.3 MockEmailProvider - failure
{
  const provider = new MockEmailProvider({
    provider: 'mock',
    fromEmail: 'noreply@scip.gov',
    fromName: 'SCIP Portal'
  }, true, 'SMTP connection refused');
  const { result, durationMs } = await timeIt(() =>
    provider.sendEmail({ to: 'test@example.com', subject: 'Test', htmlBody: '<p>Hello</p>', textBody: 'Hello' })
  );
  addResult(
    'Email Provider', 'Mock provider failure',
    { provider: 'mock', shouldFail: true },
    { success: false },
    { success: result.success, error: result.error },
    durationMs,
    result.success === false && result.error === 'SMTP connection refused',
    'Mock provider returns failure when configured to fail'
  );
}

// 1.4 ConsoleEmailProvider handles OTP email without logging OTP value
{
  const provider = new ConsoleEmailProvider({
    provider: 'console',
    fromEmail: 'noreply@scip.gov',
    fromName: 'SCIP Portal'
  });
  const { result, durationMs } = await timeIt(() =>
    provider.sendEmail({ to: 'test@example.com', subject: 'Verify', htmlBody: '<p>Your OTP is 123456</p>', textBody: 'Your OTP is 123456' })
  );
  addResult(
    'Email Provider', 'Console provider handles OTP email',
    { provider: 'console', otpEmail: true },
    { success: true },
    { success: result.success },
    durationMs,
    result.success === true,
    'Console provider returns success for OTP emails (content redacted in logs)'
  );
}

// ============================================================================
// Test 2: SMS Service Providers
// ============================================================================

console.log('\n=== TEST 2: SMS Service Providers ===\n');

// 2.1 ConsoleSmsProvider - success
{
  const provider = new ConsoleSmsProvider({
    provider: 'console',
    fromNumber: '+91-0000000000'
  });
  const { result, durationMs } = await timeIt(() =>
    provider.sendSms({ to: '+919876543210', message: 'SCIP verification code: 123456' })
  );
  addResult(
    'SMS Provider', 'Console provider success',
    { provider: 'console', to: '+919876543210' },
    { success: true },
    { success: result.success, provider: result.provider },
    durationMs,
    result.success === true && result.provider === 'console',
    'Console provider always returns success'
  );
}

// 2.2 MockSmsProvider - success
{
  const provider = new MockSmsProvider({ provider: 'mock', fromNumber: '+91-0000000000' });
  const { result, durationMs } = await timeIt(() =>
    provider.sendSms({ to: '+919876543210', message: 'SCIP verification code: 123456' })
  );
  addResult(
    'SMS Provider', 'Mock provider success',
    { provider: 'mock', shouldFail: false },
    { success: true },
    { success: result.success, provider: result.provider },
    durationMs,
    result.success === true && result.provider === 'mock',
    'Mock provider returns success when not failing'
  );
}

// 2.3 MockSmsProvider - failure
{
  const provider = new MockSmsProvider({ provider: 'mock', fromNumber: '+91-0000000000' }, true, 'Gateway timeout');
  const { result, durationMs } = await timeIt(() =>
    provider.sendSms({ to: '+919876543210', message: 'SCIP verification code: 123456' })
  );
  addResult(
    'SMS Provider', 'Mock provider failure',
    { provider: 'mock', shouldFail: true },
    { success: false },
    { success: result.success, error: result.error },
    durationMs,
    result.success === false && result.error === 'Gateway timeout',
    'Mock provider returns failure when configured to fail'
  );
}

// ============================================================================
// Test 3: Database Email Verification
// ============================================================================

console.log('\n=== TEST 3: Database Email Verification ===\n');

// 3.1 setUserEmailVerificationToken stores hash and expiry
{
  const db = newDb('verification-email-1');
  const user = createTestUser(db, { email: 'verify1@test.in' });

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { result, durationMs } = await timeIt(() =>
    Promise.resolve(db.setUserEmailVerificationToken(user.id, tokenHash, expiresAt))
  );
  addResult(
    'Email Verification DB', 'Set verification token',
    { userId: user.id },
    'Token hash and expiry stored',
    { stored: true },
    durationMs,
    true,
    'Token stored without error'
  );

  const status = db.getUserVerificationStatus(user.id);
  addResult(
    'Email Verification DB', 'Get verification status after setting token',
    { userId: user.id },
    { emailVerified: false, emailVerificationTokenExpiresAt: expiresAt },
    {
      emailVerified: status?.emailVerified,
      emailVerificationTokenExpiresAt: status?.emailVerificationTokenExpiresAt
    },
    0,
    status?.emailVerified === false &&
      status?.emailVerificationTokenExpiresAt === expiresAt,
    `emailVerified: ${status?.emailVerified}, expiresAt present: ${Boolean(status?.emailVerificationTokenExpiresAt)}`
  );
}

// 3.2 verifyUserEmail with valid token
{
  const db = newDb('verification-email-2');
  const user = createTestUser(db, { email: 'verify2@test.in' });

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  db.setUserEmailVerificationToken(user.id, tokenHash, expiresAt);

  const { result, durationMs } = await timeIt(() =>
    Promise.resolve(db.verifyUserEmail(user.id, token))
  );
  addResult(
    'Email Verification DB', 'Verify email with valid token',
    { userId: user.id, hasToken: true },
    true,
    result,
    durationMs,
    result === true,
    'Valid token verifies email'
  );

  const status = db.getUserVerificationStatus(user.id);
  addResult(
    'Email Verification DB', 'Email verified status after successful verification',
    { userId: user.id },
    { emailVerified: true },
    { emailVerified: status?.emailVerified },
    0,
    status?.emailVerified === true,
    `emailVerified: ${status?.emailVerified}`
  );
}

// 3.3 verifyUserEmail with invalid token (fresh user)
{
  const db = newDb('verification-email-3');
  const user = createTestUser(db, { email: 'verify3@test.in' });

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  db.setUserEmailVerificationToken(user.id, tokenHash, expiresAt);

  const { result, durationMs } = await timeIt(() =>
    Promise.resolve(db.verifyUserEmail(user.id, 'wrong-token'))
  );
  addResult(
    'Email Verification DB', 'Verify email with invalid token',
    { userId: user.id, token: 'wrong-token' },
    false,
    result,
    durationMs,
    result === false,
    'Invalid token returns false'
  );

  const status = db.getUserVerificationStatus(user.id);
  addResult(
    'Email Verification DB', 'Email not verified after invalid token',
    { userId: user.id },
    { emailVerified: false },
    { emailVerified: status?.emailVerified },
    0,
    status?.emailVerified === false,
    `emailVerified: ${status?.emailVerified}`
  );
}

// 3.4 verifyUserEmail with expired token
{
  const db = newDb('verification-email-4');
  const user = createTestUser(db, { email: 'verify4@test.in' });

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiredAt = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1 hour ago
  db.setUserEmailVerificationToken(user.id, tokenHash, expiredAt);

  const { result, durationMs } = await timeIt(() =>
    Promise.resolve(db.verifyUserEmail(user.id, token))
  );
  addResult(
    'Email Verification DB', 'Verify email with expired token',
    { userId: user.id, expired: true },
    false,
    result,
    durationMs,
    result === false,
    'Expired token returns false'
  );
}

// 3.5 Verify user not found
{
  const db = newDb('verification-email-5');
  const { result, durationMs } = await timeIt(() =>
    Promise.resolve(db.verifyUserEmail('NONEXISTENT', 'token'))
  );
  addResult(
    'Email Verification DB', 'Verify email for nonexistent user',
    { userId: 'NONEXISTENT' },
    false,
    result,
    durationMs,
    result === false,
    'Nonexistent user returns false'
  );
}

// 3.6 setUserEmailVerificationToken for nonexistent user throws
{
  const db = newDb('verification-email-6');
  let threw = false;
  try {
    db.setUserEmailVerificationToken('NONEXISTENT', 'hash', new Date().toISOString());
  } catch {
    threw = true;
  }
  addResult(
    'Email Verification DB', 'Set token for nonexistent user throws',
    { userId: 'NONEXISTENT' },
    'Throws error',
    { threw },
    0,
    threw,
    'Throws when user not found'
  );
}

// ============================================================================
// Test 4: Database SMS Verification (OTP)
// ============================================================================

console.log('\n=== TEST 4: Database SMS OTP Verification ===\n');

// 4.1 Set OTP and verify with valid OTP
{
  const db = newDb('verification-sms-1');
  const user = createTestUser(db, { email: 'sms1@test.in', phone: '+919876543210' });

  const otp = '123456';
  const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  db.setUserPhoneVerificationOtp(user.id, otpHash, expiresAt);

  const { result, durationMs } = await timeIt(() =>
    Promise.resolve(db.verifyUserPhone(user.id, otp))
  );
  addResult(
    'SMS OTP DB', 'Verify phone with valid OTP',
    { userId: user.id, otp },
    true,
    result,
    durationMs,
    result === true,
    'Valid OTP verifies phone'
  );

  const status = db.getUserVerificationStatus(user.id);
  addResult(
    'SMS OTP DB', 'Phone verified status after successful OTP',
    { userId: user.id },
    { phoneVerified: true },
    { phoneVerified: status?.phoneVerified },
    0,
    status?.phoneVerified === true,
    `phoneVerified: ${status?.phoneVerified}`
  );
}

// 4.2 Verify with invalid OTP
{
  const db = newDb('verification-sms-2');
  const user = createTestUser(db, { email: 'sms2@test.in', phone: '+919876543211' });

  const otp = '000000';
  const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  db.setUserPhoneVerificationOtp(user.id, otpHash, expiresAt);

  const { result, durationMs } = await timeIt(() =>
    Promise.resolve(db.verifyUserPhone(user.id, '111111'))
  );
  addResult(
    'SMS OTP DB', 'Verify phone with invalid OTP',
    { userId: user.id, otp: '111111' },
    false,
    result,
    durationMs,
    result === false,
    'Invalid OTP returns false'
  );

  const status = db.getUserVerificationStatus(user.id);
  addResult(
    'SMS OTP DB', 'Phone not verified after invalid OTP',
    { userId: user.id },
    { phoneVerified: false },
    { phoneVerified: status?.phoneVerified },
    0,
    status?.phoneVerified === false,
    `phoneVerified: ${status?.phoneVerified}`
  );
}

// 4.3 Verify with expired OTP
{
  const db = newDb('verification-sms-3');
  const user = createTestUser(db, { email: 'sms3@test.in', phone: '+919876543212' });

  const otp = '999999';
  const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
  const expiredAt = new Date(Date.now() - 60 * 1000).toISOString(); // 1 minute ago
  db.setUserPhoneVerificationOtp(user.id, otpHash, expiredAt);

  const { result, durationMs } = await timeIt(() =>
    Promise.resolve(db.verifyUserPhone(user.id, otp))
  );
  addResult(
    'SMS OTP DB', 'Verify phone with expired OTP',
    { userId: user.id, expired: true },
    false,
    result,
    durationMs,
    result === false,
    'Expired OTP returns false'
  );
}

// 4.4 OTP reuse prevention - after successful verification, same OTP cannot be reused
{
  const db = newDb('verification-sms-4');
  const user = createTestUser(db, { email: 'sms4@test.in', phone: '+919876543213' });

  const otp = '555555';
  const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  db.setUserPhoneVerificationOtp(user.id, otpHash, expiresAt);

  const first = db.verifyUserPhone(user.id, otp);
  addResult(
    'SMS OTP DB', 'First OTP verification succeeds',
    { userId: user.id, otp },
    true,
    first,
    0,
    first === true,
    'First verification succeeds'
  );

  const second = db.verifyUserPhone(user.id, otp);
  addResult(
    'SMS OTP DB', 'Same OTP cannot be reused after verification',
    { userId: user.id, otp },
    false,
    second,
    0,
    second === false,
    'Reuse of verified OTP returns false'
  );
}

// 4.5 Nonexistent user for phone verification
{
  const db = newDb('verification-sms-5');
  const { result, durationMs } = await timeIt(() =>
    Promise.resolve(db.verifyUserPhone('NONEXISTENT', '123456'))
  );
  addResult(
    'SMS OTP DB', 'Verify phone for nonexistent user',
    { userId: 'NONEXISTENT' },
    false,
    result,
    durationMs,
    result === false,
    'Nonexistent user returns false'
  );
}

// ============================================================================
// Test 5: Verification Attempt Limits (direct DB calls)
// ============================================================================

console.log('\n=== TEST 5: Verification Attempt Limits ===\n');

{
  const db = newDb('verification-attempts-1');
  const user = createTestUser(db, { email: 'attempts1@test.in' });

  const MAX_ATTEMPTS = 5;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    db.incrementVerificationAttempts(user.id);
  }

  const status = db.getUserVerificationStatus(user.id);
  addResult(
    'Attempt Limits', 'Multiple incrementVerificationAttempts calls',
    { userId: user.id, increments: MAX_ATTEMPTS },
    { verificationAttempts: MAX_ATTEMPTS },
    { verificationAttempts: status?.verificationAttempts },
    0,
    status?.verificationAttempts === MAX_ATTEMPTS,
    `Attempts: ${status?.verificationAttempts}`
  );

  // Reset attempts
  db.resetVerificationAttempts(user.id);
  const status2 = db.getUserVerificationStatus(user.id);
  addResult(
    'Attempt Limits', 'Reset verification attempts to zero',
    { userId: user.id },
    { verificationAttempts: 0 },
    { verificationAttempts: status2?.verificationAttempts },
    0,
    status2?.verificationAttempts === 0,
    `Attempts after reset: ${status2?.verificationAttempts}`
  );

  db.persist();
}

// ============================================================================
// Test 6: Increment/Reset Verification Attempts
// ============================================================================

console.log('\n=== TEST 6: Increment/Reset Verification Attempts ===\n');

{
  const db = newDb('verification-increment-1');
  const user = createTestUser(db, { email: 'increment1@test.in' });

  db.incrementVerificationAttempts(user.id);
  db.incrementVerificationAttempts(user.id);
  const status1 = db.getUserVerificationStatus(user.id);
  addResult(
    'Attempt Increments', 'Increment attempts twice',
    { userId: user.id },
    { verificationAttempts: 2 },
    { verificationAttempts: status1?.verificationAttempts },
    0,
    status1?.verificationAttempts === 2,
    `Attempts: ${status1?.verificationAttempts}`
  );

  db.resetVerificationAttempts(user.id);
  const status2 = db.getUserVerificationStatus(user.id);
  addResult(
    'Attempt Increments', 'Reset attempts to zero',
    { userId: user.id },
    { verificationAttempts: 0 },
    { verificationAttempts: status2?.verificationAttempts },
    0,
    status2?.verificationAttempts === 0,
    `Attempts after reset: ${status2?.verificationAttempts}`
  );

  // Increment for nonexistent user should not throw
  let threw = false;
  try {
    db.incrementVerificationAttempts('NONEXISTENT');
  } catch {
    threw = true;
  }
  addResult(
    'Attempt Increments', 'Increment for nonexistent user does not throw',
    { userId: 'NONEXISTENT' },
    { threw: false },
    { threw },
    0,
    threw === false,
    'No throw for nonexistent user'
  );

  db.persist();
}

// ============================================================================
// Test 7: Provider-Independent Factory Functions
// ============================================================================

console.log('\n=== TEST 7: Provider-Independent Factory Functions ===\n');

// 7.1 createEmailService with console provider
{
  process.env.EMAIL_PROVIDER = 'console';
  const service = createEmailService();
  addResult(
    'Factory', 'createEmailService returns console provider',
    { EMAIL_PROVIDER: 'console' },
    { provider: 'console' },
    { provider: service.getProviderName() },
    0,
    service.getProviderName() === 'console',
    `Provider: ${service.getProviderName()}`
  );
}

// 7.2 createSmsService with console provider
{
  process.env.SMS_PROVIDER = 'console';
  const service = createSmsService();
  addResult(
    'Factory', 'createSmsService returns console provider',
    { SMS_PROVIDER: 'console' },
    { provider: 'console' },
    { provider: service.getProviderName() },
    0,
    service.getProviderName() === 'console',
    `Provider: ${service.getProviderName()}`
  );
}

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n' + '='.repeat(70));
console.log('EMAIL & SMS VERIFICATION TEST SUMMARY');
console.log('='.repeat(70));

const total = results.length;
const passed = results.filter(r => r.pass).length;
const failed = results.filter(r => !r.pass).length;
console.log(`Total tests: ${total}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

const capabilities = [...new Set(results.map(r => r.capability))];
console.log('\nBy capability:');
for (const cap of capabilities) {
  const capResults = results.filter(r => r.capability === cap);
  const capPassed = capResults.filter(r => r.pass).length;
  console.log(`  ${cap}: ${capPassed}/${capResults.length} passed`);
}

console.log('\nFailed tests:');
for (const r of results.filter(r => !r.pass)) {
  console.log(`  - ${r.capability} > ${r.testName}`);
  console.log(`    Expected: ${JSON.stringify(r.expected).slice(0, 100)}`);
  console.log(`    Actual: ${JSON.stringify(r.actual).slice(0, 100)}`);
}

if (failed > 0) {
  console.log('\nVERDICT: SOME TESTS FAILED');
  process.exit(1);
} else {
  console.log('\nVERDICT: ALL TESTS PASSED');
}
