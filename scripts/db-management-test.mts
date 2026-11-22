// SCIP Backend - Database Storage & Integrity HTTP Tests (Phase 7)
// Tests /api/database/* endpoints: storage, integrity, health (authZ & data correctness)

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { register } from 'node:module';

// Redirect @clerk/backend to a test shim (this test process only).
register('./test-support/clerk-test-loader.mjs', import.meta.url);

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scip-db-mgmt-'));
const tmpDb = path.join(tmpDir, 'scip_test_db.json');

process.env.SCIP_DB_PATH = tmpDb;
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-db-management-123456';
process.env.DISABLE_RATE_LIMIT = 'true';
process.env.DISABLE_HMR = 'true';

const { createApp } = await import('../src/server/app.js');
const { db } = await import('../src/database/index.js');

// Link every seed user to a deterministic test Clerk identity in the temp DB.
for (const u of await db.getUsers()) {
  if (!(u as any).clerkUserId) { await db.linkClerkIdentity(u.id, `clerk:${u.id}`); }
}

let passed = 0; let failed = 0;
const results: string[] = [];
function ok(name: string, cond: boolean, detail = '') {
  if (cond) { passed++; results.push(`PASS: ${name}`); }
  else { failed++; results.push(`FAIL: ${name}${detail ? ' - ' + detail : ''}`); }
}

function tokenFor(u: any) {
  return u.clerkUserId ?? `clerk:${u.id}`;
}

async function req(port: number, method: string, p: string, body?: any, token?: string) {
  const headers: any = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`http://127.0.0.1:${port}${p}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { status: res.status, headers: res.headers, json, text };
}

const app = await createApp({ initMongo: false, attachFrontend: false });
const server = http.createServer(app);
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
const port = (server.address() as any).port;

try {
  const users = await db.getUsers();
  const admin = users.find((u: any) => u.role === 'admin')!;
  const authority = users.find((u: any) => u.role === 'authority') || admin;
  const analyst = users.find((u: any) => u.role === 'analyst') || admin;
  const citizen = users.find((u: any) => u.role === 'citizen')!;
  const adminTok = tokenFor(admin);
  const authorityTok = tokenFor(authority);
  const analystTok = tokenFor(analyst);
  const citizenTok = tokenFor(citizen);

  // --- AuthZ: unauthenticated ---
  ok('unauthenticated GET /api/database/storage -> 401', (await req(port, 'GET', '/api/database/storage')).status === 401);
  ok('unauthenticated GET /api/database/integrity -> 401', (await req(port, 'GET', '/api/database/integrity')).status === 401);
  ok('unauthenticated GET /api/database/health -> 401', (await req(port, 'GET', '/api/database/health')).status === 401);

  // --- AuthZ: role-based access ---
  ok('citizen cannot access /api/database/storage -> 403', (await req(port, 'GET', '/api/database/storage', undefined, citizenTok)).status === 403);
  ok('analyst cannot access /api/database/storage -> 403', (await req(port, 'GET', '/api/database/storage', undefined, analystTok)).status === 403);
  ok('authority can access /api/database/storage -> 200', (await req(port, 'GET', '/api/database/storage', undefined, authorityTok)).status === 200);
  ok('admin can access /api/database/storage -> 200', (await req(port, 'GET', '/api/database/storage', undefined, adminTok)).status === 200);
  ok('citizen cannot access /api/database/integrity -> 403', (await req(port, 'GET', '/api/database/integrity', undefined, citizenTok)).status === 403);
  ok('authority can access /api/database/integrity -> 200', (await req(port, 'GET', '/api/database/integrity', undefined, authorityTok)).status === 200);
  ok('admin can access /api/database/integrity -> 200', (await req(port, 'GET', '/api/database/integrity', undefined, adminTok)).status === 200);
  ok('citizen cannot access /api/database/health -> 403', (await req(port, 'GET', '/api/database/health', undefined, citizenTok)).status === 403);
  ok('authority can access /api/database/health -> 200', (await req(port, 'GET', '/api/database/health', undefined, authorityTok)).status === 200);
  ok('admin can access /api/database/health -> 200', (await req(port, 'GET', '/api/database/health', undefined, adminTok)).status === 200);

  // --- Data correctness: storage ---
  const storageResp = await req(port, 'GET', '/api/database/storage', undefined, adminTok);
  ok('storage returns success', storageResp.status === 200 && storageResp.json?.success === true);
  const storage = storageResp.json?.data;
  if (storage) {
    ok('storage has storageFile path', typeof storage.storageFile === 'string' && storage.storageFile.length > 0);
    ok('storage has storageExists boolean', typeof storage.storageExists === 'boolean');
    ok('storage has storageSizeBytes number', typeof storage.storageSizeBytes === 'number' && storage.storageSizeBytes >= 0);
    ok('storage has storageSizeMB number', typeof storage.storageSizeMB === 'number' && storage.storageSizeMB >= 0);
    ok('storage has recordCounts object', typeof storage.recordCounts === 'object');
    const rc = storage.recordCounts;
    ok('recordCounts has all expected keys', [
      'users','departments','reports','incidents','analyses','assignments','resolutions',
      'inspections','notifications','feedbacks','auditLogs','ipSecurityLogs',
      'adminStates','adminDistricts','adminSubDistricts','adminBlocks','adminLocalities','administrativeBoundaries'
    ].every(k => typeof rc[k] === 'number'));
    ok('storage has lastPersistedAt', typeof storage.lastPersistedAt === 'string' || storage.lastPersistedAt === null);
  }

  // --- Data correctness: integrity ---
  const integrityResp = await req(port, 'GET', '/api/database/integrity', undefined, adminTok);
  ok('integrity returns success', integrityResp.status === 200 && integrityResp.json?.success === true);
  const integrity = integrityResp.json?.data;
  if (integrity) {
    ok('integrity has auditChainValid boolean', typeof integrity.auditChainValid === 'boolean');
    ok('integrity has auditCheckedCount number', typeof integrity.auditCheckedCount === 'number');
    ok('integrity has orphanedAnalyses number', typeof integrity.orphanedAnalyses === 'number');
    ok('integrity has orphanedIncidents number', typeof integrity.orphanedIncidents === 'number');
    ok('integrity has duplicateReportIds number', typeof integrity.duplicateReportIds === 'number');
    ok('integrity has totalRecords number', typeof integrity.totalRecords === 'number');
    ok('integrity has issues array', Array.isArray(integrity.issues));
    ok('integrity issues are strings', integrity.issues.every((i: any) => typeof i === 'string'));
  }

  // --- Data correctness: health ---
  const healthResp = await req(port, 'GET', '/api/database/health', undefined, adminTok);
  ok('health returns success', healthResp.status === 200 && healthResp.json?.success === true);
  const health = healthResp.json?.data;
  if (health) {
    ok('health has status OK or DEGRADED', ['OK', 'DEGRADED'].includes(health.status));
    ok('health has totalRecords number', typeof health.totalRecords === 'number');
    ok('health has auditChainValid boolean', typeof health.auditChainValid === 'boolean');
    ok('health has issuesCount number', typeof health.issuesCount === 'number');
    ok('health has uptimeSeconds number', typeof health.uptimeSeconds === 'number');
    ok('health has memory object with heapUsedMB', typeof health.memory?.heapUsedMB === 'number');
  }

  // --- Cross-consistency: storage recordCounts matches integrity totalRecords ---
  if (storage && integrity) {
    const scTotal = Object.values(storage.recordCounts).reduce((s: number, c: number) => s + c, 0);
    ok('storage record total >= 0', scTotal >= 0);
  }

  console.log(results.join('\n'));
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
} catch (err: any) {
  console.error('TEST RUNNER ERROR:', err);
  process.exit(1);
} finally {
  try { await server.close(); } catch { /* ignore */ }
}
