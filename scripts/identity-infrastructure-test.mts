// SCIP - Clerk Identity Infrastructure Test (Phase 3.1.2A)
// Isolated, temp-DB only. Never touches .scip_database.json.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scip-identity-'));
const tmpDb = path.join(tmpDir, 'scip_identity_test_db.json');
process.env.SCIP_DB_PATH = tmpDb;
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = '';

const { SCIPDatabase } = await import('../src/database/scipDatabase.js');
const { DuplicateClerkIdentityError, isDuplicateClerkIdentityError } = await import('../src/database/identityErrors.js');
const { UserModel } = await import('../src/database/models/User.js');
const { UserRole } = await import('../src/types/scip.js');

let passed = 0; let failed = 0; let skipped = 0;
const results: string[] = [];
function ok(name: string, cond: boolean, detail = '') {
  if (cond) { passed++; results.push(`PASS: ${name}`); }
  else { failed++; results.push(`FAIL: ${name}${detail ? ' - ' + detail : ''}`); }
}
function expectThrow(name: string, fn: () => any, guard?: (e: any) => boolean) {
  try {
    fn();
    failed++; results.push(`FAIL: ${name} - expected throw`);
  } catch (e: any) {
    if (guard && !guard(e)) { failed++; results.push(`FAIL: ${name} - wrong error: ${e?.message}`); }
    else { passed++; results.push(`PASS: ${name}`); }
  }
}
function skip(name: string, reason: string) { skipped++; results.push(`SKIP: ${name} (${reason})`); }

const db = new SCIPDatabase(tmpDb);

let seq = 0;
function makeUser(overrides: any = {}) {
  seq++;
  return {
    name: `Test User ${seq}`,
    email: `test_${Date.now()}_${seq}_${Math.random().toString(36).slice(2, 7)}@example.com`,
    role: 'citizen' as UserRole,
    status: 'active' as const,
    emailVerified: false,
    phoneVerified: false,
    verificationAttempts: 0,
    ...overrides,
  };
}

// 1. User without clerkUserId can be created.
const u1 = db.createUser(makeUser());
ok('create user without clerkUserId', !!u1.id && u1.clerkUserId === undefined);

// 2. User with valid clerkUserId is represented correctly.
const u2 = db.createUser(makeUser({ clerkUserId: 'clerk_valid_1' }));
ok('create user with clerkUserId stores it', u2.clerkUserId === 'clerk_valid_1');

// 3. Lookup returns the correct linked user.
const found = db.getUserByClerkId('clerk_valid_1');
ok('lookup returns correct linked user', !!found && found.id === u2.id);

// 4. Empty clerk ID rejected (not-found).
ok('empty clerk id -> undefined', db.getUserByClerkId('') === undefined);

// 5. Undefined clerk ID rejected (not-found).
ok('undefined clerk id -> undefined', db.getUserByClerkId(undefined as any) === undefined);

// 6. Null clerk ID rejected (not-found).
ok('null clerk id -> undefined', db.getUserByClerkId(null as any) === undefined);

// 7. Duplicate clerk ID on create rejected.
expectThrow(
  'duplicate clerk id on create rejected',
  () => db.createUser(makeUser({ clerkUserId: 'clerk_valid_1' })),
  (e) => isDuplicateClerkIdentityError(e)
);

// 8. Duplicate identity lookup fails safely (simulate corruption via in-memory map).
const uA = db.createUser(makeUser());
const uB = db.createUser(makeUser());
const usersMap = (db as any).users as Map<string, any>;
usersMap.get(uA.id).clerkUserId = 'clerk_dup_forced';
usersMap.get(uB.id).clerkUserId = 'clerk_dup_forced';
expectThrow(
  'duplicate identity lookup fails safely',
  () => db.getUserByClerkId('clerk_dup_forced'),
  (e) => isDuplicateClerkIdentityError(e)
);
// clean up forced corruption so later assertions are deterministic
usersMap.get(uA.id).clerkUserId = undefined;
usersMap.get(uB.id).clerkUserId = undefined;

// 9. Existing unlinked records remain unaffected.
const seededUnlinked = Array.from(usersMap.values()).filter((u: any) => !u.clerkUserId).length;
ok('unlinked records remain (no auto-population)', seededUnlinked > 0);

// 10. Existing user internal IDs remain unchanged (pattern + uniqueness).
const allIds = Array.from(usersMap.values()).map((u: any) => u.id);
ok('internal ids match USR- pattern', allIds.every((id: string) => /^USR-/.test(id)));
ok('internal ids unique', new Set(allIds).size === allIds.length);

// 11. Suspended users remain suspended and are still returned (middleware enforces).
const uSusp = db.createUser(makeUser({ clerkUserId: 'clerk_susp_1' }));
usersMap.get(uSusp.id).status = 'suspended';
const suspFound = db.getUserByClerkId('clerk_susp_1');
ok('suspended user returned with status preserved', !!suspFound && suspFound.status === 'suspended');

// 12. User roles remain unchanged.
const uRole = db.createUser(makeUser({ role: 'officer' as UserRole, clerkUserId: 'clerk_role_1' }));
const roleFound = db.getUserByClerkId('clerk_role_1');
ok('role preserved through identity mapping', !!roleFound && roleFound.role === 'officer');

// 13. MongoDB schema supports clerkUserId (static; no DB connection).
const schemaPath = UserModel.schema.path('clerkUserId');
ok('mongo schema has clerkUserId path', !!schemaPath);

// 14. MongoDB partial unique index prevents duplicate identities (static).
const idxs = UserModel.schema.indexes() as Array<[Record<string, any>, Record<string, any>]>;
const uniqClerkIdx = idxs.find(([fields, opts]) => fields && fields.clerkUserId !== undefined && opts && opts.unique === true);
ok('mongo has unique index on clerkUserId', !!uniqClerkIdx, JSON.stringify(idxs.map(i => i[0])));
ok('mongo unique index is partial (string-only)', !!uniqClerkIdx && !!uniqClerkIdx[1]?.partialFilterExpression);

// 15. JSON/MongoDB parity: JSON runtime verified above; Mongo runtime NOT RUN (no connection).
skip('mongo runtime parity', 'no MongoDB connection in this environment');

// 16. Unlinked Clerk identity -> not-found (middleware maps to 401).
ok('unlinked clerk id -> undefined (401 path)', db.getUserByClerkId('clerk_nonexistent_zzz') === undefined);

// 17. Email fallback removed from middleware (static source check).
const authSrc = fs.readFileSync(path.resolve('src/server/middleware/auth.ts'), 'utf-8');
ok('email fallback removed (no getUserByEmailWithPassword in auth.ts)', !authSrc.includes('getUserByEmailWithPassword'));
ok('email fallback removed (no (clerk as any).email)', !authSrc.includes('(clerk as any).email'));

// 18. Duplicate mapping fails closed (DuplicateClerkIdentityError is a typed, catchable error).
ok('DuplicateClerkIdentityError is typed/catchable', isDuplicateClerkIdentityError(new DuplicateClerkIdentityError()));

console.log(results.join('\n'));
console.log(`SUMMARY: ${passed} passed, ${failed} failed, ${skipped} skipped`);
try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
process.exit(failed > 0 ? 1 : 0);