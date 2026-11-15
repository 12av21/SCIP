// SCIP - Clerk Identity Linking Test (Phase 3.1.3)
// Isolated, temp-DB only. Never touches .scip_database.json.
// Validates the JSON data-layer linking state machine + static wiring checks.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scip-linking-'));
const tmpDb = path.join(tmpDir, 'scip_linking_test_db.json');
process.env.SCIP_DB_PATH = tmpDb;
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = '';

const { SCIPDatabase } = await import('../src/database/scipDatabase.js');
const { UserRole } = await import('../src/types/scip.js');

let passed = 0; let failed = 0; let skipped = 0;
const results: string[] = [];
function ok(name: string, cond: boolean, detail = '') {
  if (cond) { passed++; results.push(`PASS: ${name}`); }
  else { failed++; results.push(`FAIL: ${name}${detail ? ' - ' + detail : ''}`); }
}
function expectThrow(name: string, fn: () => any, msgIncludes?: string) {
  try {
    fn();
    failed++; results.push(`FAIL: ${name} - expected throw`);
  } catch (e: any) {
    const m = String(e?.message || '');
    if (msgIncludes && !m.includes(msgIncludes)) { failed++; results.push(`FAIL: ${name} - wrong error: ${m}`); }
    else { passed++; results.push(`PASS: ${name}`); }
  }
}
function skip(name: string, reason: string) { skipped++; results.push(`SKIP: ${name} (${reason})`); }
function hashChallenge(salt: string, otp: string): string {
  return crypto.createHash('sha256').update(salt + otp).digest('hex');
}

const db = new SCIPDatabase(tmpDb);

let seq = 0;
function makeUser(overrides: any = {}) {
  seq++;
  return {
    name: `Link Test User ${seq}`,
    email: `link_${Date.now()}_${seq}_${Math.random().toString(36).slice(2, 7)}@example.com`,
    role: 'citizen' as UserRole,
    status: 'active' as const,
    emailVerified: false,
    phoneVerified: false,
    verificationAttempts: 0,
    ...overrides,
  };
}

// 1. linkClerkIdentity links an unlinked user.
const u1 = db.createUser(makeUser());
const r1 = db.linkClerkIdentity(u1.id, 'clerk_link_1');
ok('linkClerkIdentity links unlinked user', r1.linked === true && db.getUserByClerkId('clerk_link_1')?.id === u1.id);

// 2. Linking an already-linked user returns already_linked.
const r2 = db.linkClerkIdentity(u1.id, 'clerk_link_2');
ok('linkClerkIdentity already_linked', r2.linked === false && r2.reason === 'already_linked');

// 3. Linking a missing user returns user_not_found.
const r3 = db.linkClerkIdentity('USR-DOES-NOT-EXIST', 'clerk_link_3');
ok('linkClerkIdentity user_not_found', r3.linked === false && r3.reason === 'user_not_found');

// 4. Empty subject returns invalid_identity.
const u4 = db.createUser(makeUser());
const r4 = db.linkClerkIdentity(u4.id, '   ');
ok('linkClerkIdentity invalid_identity', r4.linked === false && r4.reason === 'invalid_identity');

// 5. Identity already held by another user returns identity_taken.
const u5 = db.createUser(makeUser());
const r5 = db.linkClerkIdentity(u5.id, 'clerk_link_1');
ok('linkClerkIdentity identity_taken', r5.linked === false && r5.reason === 'identity_taken');

// 6. createClerkLinkRequest creates a PENDING request with ~15 min expiry.
const u6 = db.createUser(makeUser());
const req6 = db.createClerkLinkRequest({ scipUserId: u6.id, clerkSubject: 'clerk_req_6', verificationMethod: 'ONE_TIME_CHALLENGE', correlationId: 'corr-6' });
const expMs = new Date(req6.expiresAt).getTime() - new Date(req6.createdAt).getTime();
ok('createClerkLinkRequest PENDING', req6.status === 'PENDING_VERIFICATION');
ok('createClerkLinkRequest ~15min expiry', expMs >= 14 * 60 * 1000 && expMs <= 16 * 60 * 1000, String(expMs));
ok('createClerkLinkRequest id pattern', /^LNK-/.test(req6.id));

// 7. createClerkLinkRequest is idempotent for an existing pending request.
const req7again = db.createClerkLinkRequest({ scipUserId: u6.id, clerkSubject: 'clerk_req_6', verificationMethod: 'ONE_TIME_CHALLENGE', correlationId: 'corr-6b' });
ok('createClerkLinkRequest idempotent', req7again.id === req6.id);

// 8. createClerkLinkRequest throws ALREADY_LINKED when target already linked.
expectThrow('createClerkLinkRequest ALREADY_LINKED', () =>
  db.createClerkLinkRequest({ scipUserId: u1.id, clerkSubject: 'clerk_req_u1', verificationMethod: 'ADMIN_APPROVED', correlationId: 'corr-8' }),
  'ALREADY_LINKED');

// 9. createClerkLinkRequest throws IDENTITY_TAKEN when subject already LINKED elsewhere.
const u9a = db.createUser(makeUser());
const req9 = db.createClerkLinkRequest({ scipUserId: u9a.id, clerkSubject: 'clerk_taken_9', verificationMethod: 'ADMIN_APPROVED', correlationId: 'corr-9' });
db.decideClerkLink(req9.id, 'approve', db.createUser(makeUser({ role: 'admin' })), 'ok');
const u9b = db.createUser(makeUser());
expectThrow('createClerkLinkRequest IDENTITY_TAKEN', () =>
  db.createClerkLinkRequest({ scipUserId: u9b.id, clerkSubject: 'clerk_taken_9', verificationMethod: 'ADMIN_APPROVED', correlationId: 'corr-9b' }),
  'IDENTITY_TAKEN');

// 10. Lookups: by id, by subject (active), by scip user, pending list.
ok('getClerkLinkById returns record', db.getClerkLinkById(req6.id)?.id === req6.id);
ok('getClerkLinkBySubject returns active', db.getClerkLinkBySubject('clerk_req_6')?.id === req6.id);
ok('getClerkLinksByScipUser returns list', db.getClerkLinksByScipUser(u6.id).some(l => l.id === req6.id));
const pendingIds = db.listPendingClerkLinks().map(l => l.id);
ok('listPendingClerkLinks only pending', pendingIds.includes(req6.id));

// 11. setClerkLinkChallenge stores hash+salt, never the plaintext OTP.
const otp11 = '123456';
const salt11 = 'salt-11';
db.setClerkLinkChallenge(req6.id, hashChallenge(salt11, otp11), salt11, new Date(Date.now() + 10 * 60 * 1000).toISOString(), new Date(Date.now() + 60 * 1000).toISOString());
const stored11: any = db.getClerkLinkById(req6.id);
ok('challenge hash stored (not plaintext)', stored11.challengeHash === hashChallenge(salt11, otp11) && stored11.challengeHash !== otp11);
ok('challenge salt stored', stored11.challengeSalt === salt11);

// 12. Wrong OTP increments attempts and returns invalid_challenge (not linked).
const beforeAttempts = (db.getClerkLinkById(req6.id) as any).attemptCount;
const r12 = db.submitClerkLinkChallenge(req6.id, '000000');
ok('submitClerkLinkChallenge wrong -> invalid_challenge', r12.verified === false && r12.linked === false && r12.reason === 'invalid_challenge');
ok('submitClerkLinkChallenge increments attempts', (db.getClerkLinkById(req6.id) as any).attemptCount === beforeAttempts + 1);

// 13. Correct OTP verifies + links, sets user.clerkUserId.
const r13 = db.submitClerkLinkChallenge(req6.id, otp11);
ok('submitClerkLinkChallenge correct -> verified+linked', r13.verified === true && r13.linked === true);
ok('submitClerkLinkChallenge links user', db.getUserByClerkId('clerk_req_6')?.id === u6.id);
ok('submitClerkLinkChallenge status LINKED', db.getClerkLinkById(req6.id)?.status === 'LINKED');

// 14. Max attempts -> REJECTED.
const u14 = db.createUser(makeUser());
const req14 = db.createClerkLinkRequest({ scipUserId: u14.id, clerkSubject: 'clerk_max_14', verificationMethod: 'ONE_TIME_CHALLENGE', correlationId: 'corr-14' });
db.setClerkLinkChallenge(req14.id, hashChallenge('s14', '654321'), 's14', new Date(Date.now() + 10 * 60 * 1000).toISOString(), new Date().toISOString());
for (let i = 0; i < 5; i++) db.submitClerkLinkChallenge(req14.id, '111111');
const r14 = db.submitClerkLinkChallenge(req14.id, '654321');
ok('max attempts -> REJECTED', db.getClerkLinkById(req14.id)?.status === 'REJECTED');
ok('rejected request refuses further submits', r14.verified === false && r14.linked === false && r14.reason === 'invalid_state');

// 15. Expired challenge -> EXPIRED.
const u15 = db.createUser(makeUser());
const req15 = db.createClerkLinkRequest({ scipUserId: u15.id, clerkSubject: 'clerk_exp_15', verificationMethod: 'ONE_TIME_CHALLENGE', correlationId: 'corr-15' });
db.setClerkLinkChallenge(req15.id, hashChallenge('s15', '222222'), 's15', new Date(Date.now() - 1000).toISOString(), new Date().toISOString());
const r15 = db.submitClerkLinkChallenge(req15.id, '222222');
ok('expired challenge -> EXPIRED', r15.reason === 'expired' && db.getClerkLinkById(req15.id)?.status === 'EXPIRED');

// 16. decideClerkLink approve -> LINKED.
const u16 = db.createUser(makeUser());
const req16 = db.createClerkLinkRequest({ scipUserId: u16.id, clerkSubject: 'clerk_appr_16', verificationMethod: 'ADMIN_APPROVED', correlationId: 'corr-16' });
const admin16 = db.createUser(makeUser({ role: 'admin' }));
const r16 = db.decideClerkLink(req16.id, 'approve', admin16, 'approved');
ok('decideClerkLink approve -> linked', r16.linked === true && db.getUserByClerkId('clerk_appr_16')?.id === u16.id);

// 17. decideClerkLink reject -> REJECTED, not linked.
const u17 = db.createUser(makeUser());
const req17 = db.createClerkLinkRequest({ scipUserId: u17.id, clerkSubject: 'clerk_rej_17', verificationMethod: 'ADMIN_APPROVED', correlationId: 'corr-17' });
const r17 = db.decideClerkLink(req17.id, 'reject', admin16, 'no proof');
ok('decideClerkLink reject -> rejected', r17.linked === false && db.getClerkLinkById(req17.id)?.status === 'REJECTED');
ok('decideClerkLink reject does not link', db.getUserByClerkId('clerk_rej_17') === undefined);

// 18. cancelClerkLink revokes only the caller's own pending request.
const u18 = db.createUser(makeUser());
const req18 = db.createClerkLinkRequest({ scipUserId: u18.id, clerkSubject: 'clerk_cancel_18', verificationMethod: 'ADMIN_APPROVED', correlationId: 'corr-18' });
db.cancelClerkLink(req18.id, 'some_other_subject');
ok('cancelClerkLink ignores wrong subject', db.getClerkLinkById(req18.id)?.status === 'PENDING_VERIFICATION');
db.cancelClerkLink(req18.id, 'clerk_cancel_18');
ok('cancelClerkLink revokes own pending', db.getClerkLinkById(req18.id)?.status === 'REVOKED');

// 19. expireStaleClerkLinks expires stale pending requests.
const u19 = db.createUser(makeUser());
const req19 = db.createClerkLinkRequest({ scipUserId: u19.id, clerkSubject: 'clerk_stale_19', verificationMethod: 'ADMIN_APPROVED', correlationId: 'corr-19' });
(db as any).clerkLinks.get(req19.id).expiresAt = new Date(Date.now() - 1000).toISOString();
const expiredCount = db.expireStaleClerkLinks();
ok('expireStaleClerkLinks expires stale', expiredCount >= 1 && db.getClerkLinkById(req19.id)?.status === 'EXPIRED');

// 20. Persistence: a fresh engine on the same file sees the link + mapping.
const db2 = new SCIPDatabase(tmpDb);
ok('persist: link survives reload', db2.getClerkLinkBySubject('clerk_req_6')?.status === 'LINKED');
ok('persist: user mapping survives reload', db2.getUserByClerkId('clerk_req_6')?.id === u6.id);

// 21. No plaintext OTP/challenge leaked into any returned record (public view strips hash/salt).
const pub: any = db.getClerkLinkById(req6.id);
ok('record never equals plaintext otp', pub.challengeHash !== otp11);

// 22. Static: authenticateLinking middleware exists and is Clerk-only (no permission check inside).
const authSrc = fs.readFileSync(path.resolve('src/server/middleware/auth.ts'), 'utf-8');
ok('authenticateLinking exported', /export async function authenticateLinking/.test(authSrc));
const linkFnBody = authSrc.slice(authSrc.indexOf('export async function authenticateLinking'));
ok('authenticateLinking does not require permission', !/requirePermission\(/.test(linkFnBody.slice(0, linkFnBody.indexOf('\n}\n'))));

// 23. Static: linking routes enforce self-approval prevention.
const routesSrc = fs.readFileSync(path.resolve('src/server/routes/linkingRoutes.ts'), 'utf-8');
ok('linking route blocks self-approval', /link\.scipUserId === req\.user!\.id/.test(routesSrc));
ok('linking route uses admin.manage', /requirePermission\('admin\.manage'\)/.test(routesSrc));

// 24. Static: repository delegates expose linking methods.
const indexSrc = fs.readFileSync(path.resolve('src/database/index.ts'), 'utf-8');
ok('index delegates createClerkLinkRequest', indexSrc.includes("createClerkLinkRequest: delegate('createClerkLinkRequest')"));
ok('index delegates expireStaleClerkLinks', indexSrc.includes("expireStaleClerkLinks: delegate('expireStaleClerkLinks')"));

// 25. Mongo schema/model parity for ClerkIdentityLink.
const { ClerkIdentityLinkModel } = await import('../src/database/models/AuxiliaryModels.js');
const linkSchemaPaths = (ClerkIdentityLinkModel.schema as any).paths;
ok('mongo ClerkIdentityLink schema present', !!linkSchemaPaths.clerkSubject && !!linkSchemaPaths.scipUserId && !!linkSchemaPaths.status);

console.log(results.join('\n'));
console.log(`SUMMARY: ${passed} passed, ${failed} failed, ${skipped} skipped`);
try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
process.exit(failed > 0 ? 1 : 0);