import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { register } from 'node:module';

register('./test-support/clerk-test-loader.mjs', import.meta.url);

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scip-auth-reg-'));
process.env.SCIP_DB_PATH = path.join(tmpDir, 'scip_auth_reg_db.json');
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-isolated-auth-regression-123456';
process.env.DISABLE_RATE_LIMIT = 'true';
process.env.DISABLE_HMR = 'true';
process.env.AI_SERVICE_ENABLED = 'false';

const { createApp } = await import('../src/server/app.js');
const { db } = await import('../src/database/index.js');

let passed = 0; let failed = 0; const results: string[] = [];
function ok(name: string, cond: boolean, detail = '') {
  if (cond) { passed++; results.push(`PASS: ${name}`); }
  else { failed++; results.push(`FAIL: ${name}${detail ? ' - ' + detail : ''}`); }
}

async function req(port: number, method: string, p: string, body?: any, token?: string) {
  const headers: any = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`http://127.0.0.1:${port}${p}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json: any = null; try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { status: res.status, json, text };
}

let seq = 0;
function mk(overrides: any) {
  seq++;
  return db.createUser({
    name: `AuthReg ${seq}`,
    email: `authreg_${seq}_${Date.now()}@example.test`,
    role: 'citizen',
    status: 'active',
    emailVerified: true,
    phoneVerified: false,
    verificationAttempts: 0,
    ...overrides,
  } as any);
}

const app = await createApp({ initMongo: false, attachFrontend: false });
const server = http.createServer(app);
await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
const port = (server.address() as any).port;

try {
  // Dedicated isolated fixtures only (temp DB)
  const admin = mk({ role: 'admin' });
  const authority = mk({ role: 'authority' });
  const officer = mk({ role: 'officer', departmentId: 'DEP-WTR' });
  const analyst = mk({ role: 'analyst' });
  const citizenVerified = mk({ role: 'citizen', emailVerified: true, phoneVerified: false });
  const citizenUnverifiedNoLink = mk({ role: 'citizen', emailVerified: false, phoneVerified: false }); // no Clerk link
  const citizenClerkLinkedUnverified = mk({ role: 'citizen', emailVerified: false, phoneVerified: false });
  const suspendedCitizen = mk({ role: 'citizen', emailVerified: true, status: 'suspended' });
  const credResetUser = mk({ role: 'officer', emailVerified: true, credentialsResetRequired: true, departmentId: 'DEP-WTR' });

  for (const u of [admin, authority, officer, analyst, citizenVerified, citizenClerkLinkedUnverified, suspendedCitizen, credResetUser]) {
    await db.linkClerkIdentity(u.id, `clerk:${u.id}`);
  }
  // Ensure state flags persisted
  await db.updateUserStatus(suspendedCitizen.id, 'suspended', admin);
  await db.markCredentialsResetRequired(credResetUser.id);
  // keep unverified non-linked citizen unlinked
  await (db as any).persist?.();

  const T = (u:any)=> `clerk:${u.id}`;

  ok('unauthenticated protected endpoint -> 401', (await req(port,'GET','/api/reports')).status === 401);
  ok('malformed Authorization header -> 401', (await (async()=>{ const r=await fetch(`http://127.0.0.1:${port}/api/reports`,{headers:{'Content-Type':'application/json', Authorization:'Token nope'}}); return r.status; })()) === 401);
  ok('unlinked Clerk identity rejected -> 401', (await req(port,'GET','/api/reports', undefined, 'clerk:USR-NOT-LINKED')).status === 401);

  ok('suspended citizen rejected -> 403', (await req(port,'GET','/api/reports', undefined, T(suspendedCitizen))).status === 403);
  ok('credential-reset-required user rejected -> 403', (await req(port,'GET','/api/reports', undefined, T(credResetUser))).status === 403);

  ok('unverified non-linked citizen denied protected access (unauthenticated path) -> 401', (await req(port,'GET','/api/reports')).status === 401);
  ok('unverified non-linked citizen denied protected access (no linked SCIP identity for Clerk token) -> 401', (await req(port,'GET','/api/reports', undefined, `clerk:${citizenUnverifiedNoLink.id}`)).status === 401);

  ok('linked verified citizen with valid identity+permissions can access permitted endpoint -> 200', (await req(port,'GET','/api/reports', undefined, T(citizenVerified))).status === 200);
  ok('Clerk-linked citizen (SCIP verification flags unset) with valid identity+permissions allowed by current IdP-link policy -> 200', (await req(port,'GET','/api/reports', undefined, T(citizenClerkLinkedUnverified))).status === 200);

  ok('citizen cannot access admin users (RBAC/cross-role) -> 403', (await req(port,'GET','/api/admin/users', undefined, T(citizenVerified))).status === 403);
  ok('officer cannot access admin users (RBAC/cross-role) -> 403', (await req(port,'GET','/api/admin/users', undefined, T(officer))).status === 403);
  ok('analyst cannot read audit logs (RBAC/cross-role) -> 403', (await req(port,'GET','/api/admin/audit-logs', undefined, T(analyst))).status === 403);
  ok('citizen cannot export intelligence data (RBAC/cross-role) -> 403', (await req(port,'GET','/api/intelligence/export-csv?type=reports', undefined, T(citizenVerified))).status === 403);
  ok('analyst cannot create incidents from cluster (RBAC/cross-role) -> 403', (await req(port,'POST','/api/incidents/from-cluster', { cluster: { reportIds: ['x'] } }, T(analyst))).status === 403);
  ok('admin can access admin users -> 200', (await req(port,'GET','/api/admin/users', undefined, T(admin))).status === 200);
  ok('authority can access incidents -> 200', (await req(port,'GET','/api/incidents', undefined, T(authority))).status === 200);

  console.log(results.join('\n'));
  console.log(`SUMMARY: ${passed} passed, ${failed} failed, 0 skipped`);
  console.log('BLOCKED_NOTE: invalid/expired Clerk token cryptographic rejection not simulatable with deterministic test shim (verifyToken returns sub=token); live/config verification via clerk-config-check and middleware verifyToken path.');
} catch (e:any) {
  console.error('HARNESS_ERROR', e?.stack || e?.message || e);
  process.exit(2);
} finally {
  await new Promise<void>((r)=>server.close(()=>r()));
  try { fs.rmSync(tmpDir,{recursive:true,force:true}); } catch {}
  process.exit(failed ? 1 : 0);
}
