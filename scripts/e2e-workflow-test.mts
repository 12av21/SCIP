// SCIP - End-to-End Workflow Verification (submission rescue)
// Isolated temp DB + Clerk test shim. No real data, no network, no production credentials.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { register } from 'node:module';

register('./test-support/clerk-test-loader.mjs', import.meta.url);

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scip-e2e-'));
process.env.SCIP_DB_PATH = path.join(tmpDir, 'scip_e2e_db.json');
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-isolated-e2e-123456';
process.env.DISABLE_RATE_LIMIT = 'true';
process.env.DISABLE_HMR = 'true';
process.env.AI_SERVICE_ENABLED = 'false';

const { createApp } = await import('../src/server/app.js');
const { db } = await import('../src/database/index.js');

for (const u of await db.getUsers()) {
  if (!(u as any).clerkUserId) await db.linkClerkIdentity(u.id, `clerk:${u.id}`);
}

const rows: { workflow: string; result: string; detail: string }[] = [];
function record(workflow: string, ok: boolean, detail = '', blocked = false) {
  rows.push({ workflow, result: blocked ? 'BLOCKED' : (ok ? 'PASS' : 'FAIL'), detail });
}

function tokenFor(u: any) { return u.clerkUserId ?? `clerk:${u.id}`; }

async function req(port: number, method: string, p: string, body?: any, token?: string) {
  const headers: any = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`http://127.0.0.1:${port}${p}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { status: res.status, json };
}

const app = await createApp({ initMongo: false, attachFrontend: false });
const server = http.createServer(app);
await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
const port = (server.address() as any).port;

try {
  const users = await db.getUsers();
  const admin = users.find((u: any) => u.role === 'admin')!;
  const authority = users.find((u: any) => u.role === 'authority') || admin;
  const analyst = users.find((u: any) => u.role === 'analyst') || admin;
  const citizen = users.find((u: any) => u.role === 'citizen')!;
  const officer = users.find((u: any) => u.role === 'officer') || admin;
  const deptOfficer = users.find((u: any) => u.role === 'dept_officer') || admin;
  const T = { admin: tokenFor(admin), authority: tokenFor(authority), analyst: tokenFor(analyst), citizen: tokenFor(citizen), officer: tokenFor(officer), dept: tokenFor(deptOfficer) };

  // --- A. Citizen ---
  const me = await req(port, 'GET', '/api/auth/me', undefined, T.citizen);
  record('Citizen login/session', me.status === 200 && me.json?.data?.role === 'citizen', `status ${me.status}`);

  const created = await req(port, 'POST', '/api/reports', {
    title: 'Waterlogging on market road', description: 'Severe waterlogging after rain near the central market, affecting pedestrians and traffic.',
    locationName: 'Central Market Road', latitude: 28.6139, longitude: 77.2090, category: 'Water & Drainage', urgency: 'high'
  }, T.citizen);
  const reportId = created.json?.data?.report?.id;
  record('Citizen report submission', created.status === 201 && !!reportId, `status ${created.status} id ${reportId || '-'}`);

  const mine = await req(port, 'GET', '/api/reports', undefined, T.citizen);
  const seen = Array.isArray(mine.json?.data) && mine.json.data.some((r: any) => r.id === reportId);
  record('Report visible in citizen dashboard', mine.status === 200 && seen, `status ${mine.status} found ${seen}`);

  const got = await req(port, 'GET', `/api/reports/${reportId}`, undefined, T.citizen);
  record('Citizen opens report detail', got.status === 200 && !!got.json?.data?.report, `status ${got.status}`);

  const updCitizen = await req(port, 'PUT', `/api/reports/${reportId}`, { title: 'Waterlogging on market road (updated)' }, T.citizen);
  record('Citizen edits own report', updCitizen.status === 200, `status ${updCitizen.status}`);

  // --- Officer visibility requires an incident assigned to the officer's department ---
  const officerBefore = await req(port, 'GET', '/api/reports', undefined, T.officer);
  const officerSeesBefore = Array.isArray(officerBefore.json?.data) && officerBefore.json.data.some((r: any) => r.id === reportId);
  record('Officer sees unlinked report (expected no)', officerBefore.status === 200 && !officerSeesBefore, `status ${officerBefore.status} seesBefore ${officerSeesBefore}`);

  // Analyst forms an incident from the report (DB method used by POST /api/incidents/from-cluster)
  const incident = db.createIncidentFromCluster({
    reportIds: [reportId], category: 'Water & Drainage', centroid: { latitude: 28.6139, longitude: 77.2090 },
    radiusMeters: 120, severity: 'medium', priority: 'P3_MEDIUM', confidence: 0.6, suggestedTitle: 'Market road waterlogging', evidence: []
  } as any, analyst as any);
  db.assignIncidentOfficer(incident.id, (officer as any).departmentId, officer.id, officer.name, analyst as any);

  const officerAfter = await req(port, 'GET', '/api/reports', undefined, T.officer);
  const officerSees = Array.isArray(officerAfter.json?.data) && officerAfter.json.data.some((r: any) => r.id === reportId);
  record('Officer sees assigned incident report', officerAfter.status === 200 && officerSees, `status ${officerAfter.status} sees ${officerSees}`);

  // Officers update via inspections/incidents; report status is updated by dept_officer/authority/admin (RBAC).
  const staffUpd = await req(port, 'PUT', `/api/reports/${reportId}`, { status: 'under_review' }, T.authority);
  record('Authority updates report status', staffUpd.status === 200, `status ${staffUpd.status}`);

  const citizenAfter = await req(port, 'GET', `/api/reports/${reportId}`, undefined, T.citizen);
  const citizenSeesUpdate = citizenAfter.json?.data?.report?.status === 'under_review';
  record('Citizen sees status update', citizenAfter.status === 200 && citizenSeesUpdate, `status ${citizenAfter.status} reportStatus ${citizenAfter.json?.data?.report?.status}`);

  // --- C. Department officer ---
  const deptList = await req(port, 'GET', '/api/reports', undefined, T.dept);
  record('Department officer dashboard loads', deptList.status === 200, `status ${deptList.status}`);

  // --- D. Analyst / intelligence ---
  const agent = await req(port, 'POST', '/api/intelligence/agent', { query: 'Summarize waterlogging reports near central market and recommend actions' }, T.analyst);
  const agentOk = agent.status === 200 && typeof agent.json?.data?.executiveSummary === 'string' && agent.json.data.executiveSummary.length > 0;
  record('AI agent responds', agentOk, `status ${agent.status} model ${agent.json?.data?.modelUsed || '-'}`);

  const clusters = await req(port, 'GET', '/api/intelligence/clusters', undefined, T.analyst);
  record('Analyst clusters load', clusters.status === 200, `status ${clusters.status}`);

  const trends = await req(port, 'GET', '/api/intelligence/trends', undefined, T.analyst);
  record('Analyst trends load', trends.status === 200, `status ${trends.status}`);

  const geo = await req(port, 'GET', '/api/geoanalytics/overview', undefined, T.analyst);
  record('Geo analytics overview loads', geo.status === 200, `status ${geo.status}`);

  // --- E. Authority ---
  const authIncidents = await req(port, 'GET', '/api/incidents', undefined, T.authority);
  record('Authority incidents oversight', authIncidents.status === 200, `status ${authIncidents.status}`);

  // --- F. Admin ---
  const adminUsers = await req(port, 'GET', '/api/admin/users', undefined, T.admin);
  record('Admin views members', adminUsers.status === 200 && Array.isArray(adminUsers.json?.data), `status ${adminUsers.status}`);

  const audit = await req(port, 'GET', '/api/admin/audit-logs', undefined, T.admin);
  record('Admin views audit logs', audit.status === 200, `status ${audit.status}`);

  const citizenAdmin = await req(port, 'GET', '/api/admin/users', undefined, T.citizen);
  record('Unauthorized admin access rejected', citizenAdmin.status === 403, `status ${citizenAdmin.status}`);
} catch (err: any) {
  record('E2E harness', false, err?.message || String(err));
} finally {
  await new Promise<void>((r) => server.close(() => r()));
}

const pad = (s: string, n: number) => (s + ' '.repeat(n)).slice(0, n);
console.log('\n=== SCIP END-TO-END WORKFLOW RESULTS ===');
console.log(pad('Workflow', 44) + '| Result  | Detail');
console.log('-'.repeat(100));
for (const r of rows) console.log(pad(r.workflow, 44) + '| ' + pad(r.result, 7) + ' | ' + r.detail);
const failed = rows.filter(r => r.result === 'FAIL').length;
const blocked = rows.filter(r => r.result === 'BLOCKED').length;
console.log('-'.repeat(100));
console.log(`TOTAL ${rows.length} | PASS ${rows.length - failed - blocked} | FAIL ${failed} | BLOCKED ${blocked}`);
process.exit(failed > 0 ? 1 : 0);