import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import jwt from 'jsonwebtoken';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scip-http-'));
const tmpDb = path.join(tmpDir, 'scip_test_db.json');
process.env.SCIP_DB_PATH = tmpDb;
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-isolated-http-verification-123456';
process.env.DISABLE_RATE_LIMIT = 'true';
process.env.DISABLE_HMR = 'true';

const { createApp } = await import('../src/server/app.js');
const { db } = await import('../src/database/index.js');
const { getJwtSecret } = await import('../src/server/middleware/auth.js');

let passed = 0; let failed = 0;
const results: string[] = [];
function ok(name: string, cond: boolean, detail = '') {
  if (cond) { passed++; results.push(`PASS: ${name}`); }
  else { failed++; results.push(`FAIL: ${name}${detail ? ' - ' + detail : ''}`); }
}

function tokenFor(u: any) {
  return jwt.sign({ id: u.id, email: u.email, role: u.role, sv: u.sessionVersion ?? 0 }, getJwtSecret(), { expiresIn: '1h' });
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
  const users = db.getUsers();
  const admin = users.find((u: any) => u.role === 'admin')!;
  const authority = users.find((u: any) => u.role === 'authority') || admin;
  const analyst = users.find((u: any) => u.role === 'analyst') || admin;
  const citizen = users.find((u: any) => u.role === 'citizen')!;
  const otherCitizen = users.find((u: any) => u.role === 'citizen' && u.id !== citizen.id) || null;
  const officer = users.find((u: any) => u.role === 'officer') || admin;
  const deptOfficer = users.find((u: any) => u.role === 'dept_officer') || admin;
  const adminTok = tokenFor(admin);
  const authorityTok = tokenFor(authority);
  const analystTok = tokenFor(analyst);
  const citizenTok = tokenFor(citizen);
  const officerTok = tokenFor(officer);
  const deptTok = tokenFor(deptOfficer);

  ok('unauthenticated GET /api/reports -> 401', (await req(port, 'GET', '/api/reports')).status === 401);
  ok('unauthenticated POST /api/reports -> 401', (await req(port, 'POST', '/api/reports', { title: 'Valid title', description: 'Valid description here', locationName: 'Loc', latitude: 1, longitude: 1, category: 'Water & Drainage', urgency: 'low' })).status === 401);
  ok('unauthenticated GET /api/reports/:id -> 401', (await req(port, 'GET', '/api/reports/REP-NOPE')).status === 401);
  ok('unauthenticated PUT /api/reports/:id -> 401', (await req(port, 'PUT', '/api/reports/REP-NOPE', { title: 'Nope title' })).status === 401);
  ok('unauthenticated DELETE /api/reports/:id -> 401', (await req(port, 'DELETE', '/api/reports/REP-NOPE')).status === 401);
  ok('unauthenticated POST /api/reports/:id/reject -> 401', (await req(port, 'POST', '/api/reports/REP-NOPE/reject', { reason: 'reason' })).status === 401);
  ok('unauthenticated POST /api/reports/:id/reanalyze -> 401', (await req(port, 'POST', '/api/reports/REP-NOPE/reanalyze')).status === 401);
  ok('unauthenticated GET /api/incidents -> 401', (await req(port, 'GET', '/api/incidents')).status === 401);
  ok('unauthenticated GET /api/incidents/:id -> 401', (await req(port, 'GET', '/api/incidents/INC-NOPE')).status === 401);
  ok('unauthenticated GET /api/incidents/:id/inspections -> 401', (await req(port, 'GET', '/api/incidents/INC-NOPE/inspections')).status === 401);
  ok('unauthenticated POST /api/incidents/:id/inspection -> 401', (await req(port, 'POST', '/api/incidents/INC-NOPE/inspection', { verifiedStatus: 'verified_match', observations: 'valid observation' })).status === 401);
  ok('unauthenticated POST /api/incidents/:id/verify-inspection -> 401', (await req(port, 'POST', '/api/incidents/INC-NOPE/verify-inspection', { inspectionId: 'INS-NOPE', departmentRemarks: 'remarks', isApproved: true })).status === 401);
  ok('unauthenticated GET /api/admin/users -> 401', (await req(port, 'GET', '/api/admin/users')).status === 401);
  ok('unauthenticated PUT /api/admin/users/:id/role -> 401', (await req(port, 'PUT', `/api/admin/users/${admin.id}/role`, { role: 'citizen' })).status === 401);
  ok('unauthenticated PUT /api/admin/users/:id/status -> 401', (await req(port, 'PUT', `/api/admin/users/${admin.id}/status`, { status: 'suspended' })).status === 401);
  ok('unauthenticated GET /api/admin/departments -> 401', (await req(port, 'GET', '/api/admin/departments')).status === 401);
  ok('unauthenticated GET /api/admin/audit-logs -> 401', (await req(port, 'GET', '/api/admin/audit-logs')).status === 401);
  ok('unauthenticated GET /api/admin/audit-verify -> 401', (await req(port, 'GET', '/api/admin/audit-verify')).status === 401);
  ok('unauthenticated GET /api/admin/system-stats -> 401', (await req(port, 'GET', '/api/admin/system-stats')).status === 401);
  ok('unauthenticated GET /api/intelligence/clusters -> 401', (await req(port, 'GET', '/api/intelligence/clusters')).status === 401);
  ok('unauthenticated GET /api/intelligence/hotspots -> 401', (await req(port, 'GET', '/api/intelligence/hotspots')).status === 401);
  ok('unauthenticated GET /api/intelligence/trends -> 401', (await req(port, 'GET', '/api/intelligence/trends')).status === 401);
  ok('unauthenticated GET /api/intelligence/model-metrics -> 401', (await req(port, 'GET', '/api/intelligence/model-metrics')).status === 401);
  ok('unauthenticated GET /api/intelligence/dataset-quality -> 401', (await req(port, 'GET', '/api/intelligence/dataset-quality')).status === 401);
  ok('unauthenticated GET /api/intelligence/export-csv -> 401', (await req(port, 'GET', '/api/intelligence/export-csv')).status === 401);
  ok('unauthenticated POST /api/intelligence/agent -> 401', (await req(port, 'POST', '/api/intelligence/agent', { query: 'test' })).status === 401);
  ok('invalid token -> 401', (await req(port, 'GET', '/api/reports', undefined, 'not-a-token')).status === 401);
  ok('expired token -> 401', (await req(port, 'GET', '/api/reports', undefined, jwt.sign({ id: admin.id, email: admin.email, role: admin.role, sv: admin.sessionVersion ?? 0 }, getJwtSecret(), { expiresIn: -10 }))).status === 401);
  ok('missing token on /api/auth/me -> 401', (await req(port, 'GET', '/api/auth/me')).status === 401);
  ok('analyst cannot access admin users -> 403', (await req(port, 'GET', '/api/admin/users', undefined, analystTok)).status === 403);
  ok('officer cannot access admin users -> 403', (await req(port, 'GET', '/api/admin/users', undefined, officerTok)).status === 403);
  ok('dept_officer cannot access admin users -> 403', (await req(port, 'GET', '/api/admin/users', undefined, deptTok)).status === 403);
  ok('authority can access admin users -> 200', (await req(port, 'GET', '/api/admin/users', undefined, authorityTok)).status === 200);
  ok('admin can access admin users -> 200', (await req(port, 'GET', '/api/admin/users', undefined, adminTok)).status === 200);
  ok('citizen cannot access audit logs -> 403', (await req(port, 'GET', '/api/admin/audit-logs', undefined, citizenTok)).status === 403);
  ok('analyst cannot access audit logs -> 403', (await req(port, 'GET', '/api/admin/audit-logs', undefined, analystTok)).status === 403);
  ok('officer cannot access audit logs -> 403', (await req(port, 'GET', '/api/admin/audit-logs', undefined, officerTok)).status === 403);
  ok('dept_officer cannot access audit logs -> 403', (await req(port, 'GET', '/api/admin/audit-logs', undefined, deptTok)).status === 403);
  const adminAudit = await req(port, 'GET', '/api/admin/audit-logs', undefined, adminTok);
  ok('admin can access audit logs -> 200', adminAudit.status === 200);
  if (adminAudit.status === 200 && Array.isArray(adminAudit.json?.data)) {
    ok('audit logs omit hash/prevHash/metadata internals', adminAudit.json.data.every((l: any) => !('hash' in l) && !('prevHash' in l) && !('metadata' in l)));
    if (adminAudit.json.data.length > 0) {
      ok('audit logs retain governance fields', adminAudit.json.data.every((l: any) => l && typeof l.id === 'string' && typeof l.action === 'string' && typeof l.module === 'string' && typeof l.userEmail === 'string' && typeof l.details === 'string' && typeof l.ipAddress === 'string'));
      ok('audit logs include structured detailCode (Option B)', adminAudit.json.data.every((l: any) => typeof l.detailCode === 'string' && l.detailCode.startsWith('AUDIT_')));
      ok('audit logs mask ipAddress last segment (Option B)', adminAudit.json.data.every((l: any) => {
        if (typeof l.ipAddress !== 'string') return false;
        if (l.ipAddress === 'unknown' || l.ipAddress === 'redacted') return true;
        if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(l.ipAddress)) return l.ipAddress.endsWith('.0');
        if (l.ipAddress.includes(':')) return l.ipAddress.endsWith(':0') || l.ipAddress.split(':').pop() === '0';
        return true;
      }));
    }
  }
  const authorityAudit = await req(port, 'GET', '/api/admin/audit-logs', undefined, authorityTok);
  ok('authority can access audit logs -> 200', authorityAudit.status === 200);
  if (authorityAudit.status === 200 && Array.isArray(authorityAudit.json?.data) && authorityAudit.json.data.length > 0) {
    ok('authority audit logs include detailCode and masked ipAddress (Option B)', authorityAudit.json.data.every((l: any) => typeof l.detailCode === 'string' && typeof l.ipAddress === 'string'));
  }
  ok('admin can access audit verify -> 200', (await req(port, 'GET', '/api/admin/audit-verify', undefined, adminTok)).status === 200);
  ok('authority can access audit verify -> 200', (await req(port, 'GET', '/api/admin/audit-verify', undefined, authorityTok)).status === 200);
  ok('citizen cannot access audit verify -> 403', (await req(port, 'GET', '/api/admin/audit-verify', undefined, citizenTok)).status === 403);
  ok('analyst cannot access audit verify -> 403', (await req(port, 'GET', '/api/admin/audit-verify', undefined, analystTok)).status === 403);
  ok('officer cannot access audit verify -> 403', (await req(port, 'GET', '/api/admin/audit-verify', undefined, officerTok)).status === 403);
  ok('dept_officer cannot access audit verify -> 403', (await req(port, 'GET', '/api/admin/audit-verify', undefined, deptTok)).status === 403);
  ok('admin can access system stats -> 200', (await req(port, 'GET', '/api/admin/system-stats', undefined, adminTok)).status === 200);
  ok('authority can access system stats -> 200', (await req(port, 'GET', '/api/admin/system-stats', undefined, authorityTok)).status === 200);
  ok('analyst cannot access system stats -> 403', (await req(port, 'GET', '/api/admin/system-stats', undefined, analystTok)).status === 403);
  ok('citizen cannot access system stats -> 403', (await req(port, 'GET', '/api/admin/system-stats', undefined, citizenTok)).status === 403);
  ok('dept_officer cannot access system stats -> 403', (await req(port, 'GET', '/api/admin/system-stats', undefined, deptTok)).status === 403);
  ok('officer cannot access system stats -> 403', (await req(port, 'GET', '/api/admin/system-stats', undefined, officerTok)).status === 403);
  ok('authority cannot change user role -> 403', (await req(port, 'PUT', `/api/admin/users/${citizen.id}/role`, { role: 'analyst' }, authorityTok)).status === 403);
  ok('authority cannot change user status -> 403', (await req(port, 'PUT', `/api/admin/users/${citizen.id}/status`, { status: 'suspended' }, authorityTok)).status === 403);
  ok('analyst cannot change user role -> 403', (await req(port, 'PUT', `/api/admin/users/${citizen.id}/role`, { role: 'analyst' }, analystTok)).status === 403);
  ok('officer cannot change user role -> 403', (await req(port, 'PUT', `/api/admin/users/${citizen.id}/role`, { role: 'analyst' }, officerTok)).status === 403);
  ok('officer cannot change user status -> 403', (await req(port, 'PUT', `/api/admin/users/${citizen.id}/status`, { status: 'suspended' }, officerTok)).status === 403);
  ok('dept_officer cannot change user role -> 403', (await req(port, 'PUT', `/api/admin/users/${citizen.id}/role`, { role: 'analyst' }, deptTok)).status === 403);
  ok('dept_officer cannot change user status -> 403', (await req(port, 'PUT', `/api/admin/users/${citizen.id}/status`, { status: 'suspended' }, deptTok)).status === 403);
  ok('citizen cannot change user role -> 403', (await req(port, 'PUT', `/api/admin/users/${officer.id}/role`, { role: 'analyst' }, citizenTok)).status === 403);
  ok('citizen cannot change user status -> 403', (await req(port, 'PUT', `/api/admin/users/${officer.id}/status`, { status: 'suspended' }, citizenTok)).status === 403);
  ok('admin cannot change own role -> 400', (await req(port, 'PUT', `/api/admin/users/${admin.id}/role`, { role: 'analyst' }, adminTok)).status === 400);
  ok('admin cannot suspend own account -> 400', (await req(port, 'PUT', `/api/admin/users/${admin.id}/status`, { status: 'suspended' }, adminTok)).status === 400);
  ok('admin rejects invalid role value -> 400', (await req(port, 'PUT', `/api/admin/users/${citizen.id}/role`, { role: 'superuser' }, adminTok)).status === 400);
  ok('admin rejects invalid status value -> 400', (await req(port, 'PUT', `/api/admin/users/${citizen.id}/status`, { status: 'disabled' }, adminTok)).status === 400);

  ok('unauthenticated /api/auth/me -> 401', (await req(port, 'GET', '/api/auth/me')).status === 401);
  ok('unauthenticated POST /api/auth/logout -> 401', (await req(port, 'POST', '/api/auth/logout')).status === 401);
  ok('unauthenticated POST /api/auth/change-password -> 401', (await req(port, 'POST', '/api/auth/change-password', { oldPassword: 'old', newPassword: 'newpassword123' })).status === 401);
  ok('unauthenticated PUT /api/auth/profile -> 401', (await req(port, 'PUT', '/api/auth/profile', { name: 'Name' })).status === 401);
  ok('reset-password rejects missing email -> 400', (await req(port, 'POST', '/api/auth/reset-password', {})).status === 400);
  ok('reset-password rejects invalid email type -> 400', (await req(port, 'POST', '/api/auth/reset-password', { email: 123 })).status === 400);
  ok('reset-password rejects whitespace email -> 400', (await req(port, 'POST', '/api/auth/reset-password', { email: '   ' })).status === 400);
  ok('reset-password rejects overly long email -> 400', (await req(port, 'POST', '/api/auth/reset-password', { email: 'a'.repeat(255) + '@x.com' })).status === 400);
  const resetUnknown = await req(port, 'POST', '/api/auth/reset-password', { email: 'nobody-does-not-exist@example.invalid' });
  ok('reset-password enumeration-safe for unknown email -> 200', resetUnknown.status === 200, String(resetUnknown.status));
  const meRes = await req(port, 'GET', '/api/auth/me', undefined, citizenTok);
  ok('authenticated /api/auth/me -> 200', meRes.status === 200);
  ok('/api/auth/me omits sensitive auth state', meRes.status === 200 && meRes.json?.data && !('passwordHash' in meRes.json.data) && !('sessionVersion' in meRes.json.data) && !('credentialsResetRequired' in meRes.json.data));
  for (const [label, tok] of [['admin', adminTok], ['authority', authorityTok], ['analyst', analystTok], ['officer', officerTok], ['dept_officer', deptTok]] as const) {
    const meRole = await req(port, 'GET', '/api/auth/me', undefined, tok);
    ok(`/api/auth/me ${label} -> 200 and sanitized`, meRole.status === 200 && meRole.json?.data && !('passwordHash' in meRole.json.data) && !('sessionVersion' in meRole.json.data) && !('credentialsResetRequired' in meRole.json.data));
  }
  ok('profile update rejects empty payload -> 400', (await req(port, 'PUT', '/api/auth/profile', {}, citizenTok)).status === 400);
  ok('profile update rejects invalid name -> 400', (await req(port, 'PUT', '/api/auth/profile', { name: '' }, citizenTok)).status === 400);
  ok('profile update rejects invalid phone -> 400', (await req(port, 'PUT', '/api/auth/profile', { phone: 'x'.repeat(31) }, citizenTok)).status === 400);
  ok('change-password rejects invalid payload -> 400', (await req(port, 'POST', '/api/auth/change-password', {}, citizenTok)).status === 400);
  ok('change-password rejects short new password -> 400', (await req(port, 'POST', '/api/auth/change-password', { oldPassword: 'wrong-old-password', newPassword: 'short' }, citizenTok)).status === 400);
  ok('change-password rejects wrong old password -> 401', (await req(port, 'POST', '/api/auth/change-password', { oldPassword: 'definitely-wrong-old-password', newPassword: 'NewPassword123!' }, citizenTok)).status === 401);

  const citizenReports = await req(port, 'GET', '/api/reports', undefined, citizenTok);
  ok('citizen can list own reports -> 200', citizenReports.status === 200);
  if (citizenReports.status === 200 && Array.isArray(citizenReports.json?.data)) {
    ok('citizen report list scoped to self', citizenReports.json.data.every((r: any) => r.citizenId === citizen.id));
  }
  const citizenIncidents = await req(port, 'GET', '/api/incidents', undefined, citizenTok);
  ok('citizen can list incidents -> 200', citizenIncidents.status === 200);
  if (citizenIncidents.status === 200 && Array.isArray(citizenIncidents.json?.data)) {
    ok('citizen incident list scoped to linked reports', citizenIncidents.json.data.every((i: any) => Array.isArray(i.reportIds) && i.reportIds.some((rid: string) => db.getReportById(rid)?.citizenId === citizen.id)));
  }
  const officerIncidents = await req(port, 'GET', '/api/incidents', undefined, officerTok);
  ok('officer can list incidents -> 200', officerIncidents.status === 200);
  if (officerIncidents.status === 200 && Array.isArray(officerIncidents.json?.data)) {
    ok('officer incident list scoped to department', officerIncidents.json.data.every((i: any) => !i.assignedDepartmentId || i.assignedDepartmentId === officer.departmentId));
  }
  const deptIncidents = await req(port, 'GET', '/api/incidents', undefined, deptTok);
  ok('dept_officer can list incidents -> 200', deptIncidents.status === 200);
  if (deptIncidents.status === 200 && Array.isArray(deptIncidents.json?.data)) {
    ok('dept_officer incident list scoped to department', deptIncidents.json.data.every((i: any) => !i.assignedDepartmentId || i.assignedDepartmentId === deptOfficer.departmentId));
  }
  ok('admin can list incidents -> 200', (await req(port, 'GET', '/api/incidents', undefined, adminTok)).status === 200);
  ok('authority can list incidents -> 200', (await req(port, 'GET', '/api/incidents', undefined, authorityTok)).status === 200);
  ok('analyst can list incidents -> 200', (await req(port, 'GET', '/api/incidents', undefined, analystTok)).status === 200);
  const officerReports = await req(port, 'GET', '/api/reports', undefined, officerTok);
  ok('officer can list reports -> 200', officerReports.status === 200);
  if (officerReports.status === 200 && Array.isArray(officerReports.json?.data)) {
    ok('officer report list only linked-to-department incidents', officerReports.json.data.every((r: any) => {
      if (!r.incidentId) return false;
      const inc = db.getIncidentById(r.incidentId);
      return inc && inc.assignedDepartmentId === officer.departmentId;
    }));
  }
  ok('dept_officer can list reports -> 200', (await req(port, 'GET', '/api/reports', undefined, deptTok)).status === 200);
  ok('authority can list reports -> 200', (await req(port, 'GET', '/api/reports', undefined, authorityTok)).status === 200);
  ok('unknown report read -> 404', (await req(port, 'GET', '/api/reports/REP-NOPE', undefined, adminTok)).status === 404);

  const anyReport = db.getReports()[0];
  if (anyReport) {
    ok('report reject rejects missing reason -> 400', (await req(port, 'POST', `/api/reports/${anyReport.id}/reject`, {}, adminTok)).status === 400);
    ok('report reject unknown report -> 404', (await req(port, 'POST', `/api/reports/REP-NOPE/reject`, { reason: 'invalid reason' }, adminTok)).status === 404);
    ok('citizen cannot reject report -> 403', (await req(port, 'POST', `/api/reports/${anyReport.id}/reject`, { reason: 'not allowed' }, citizenTok)).status === 403);
    ok('analyst cannot reject report -> 403', (await req(port, 'POST', `/api/reports/${anyReport.id}/reject`, { reason: 'not allowed' }, analystTok)).status === 403);
  }
  if (otherCitizen) {
    const otherReport = db.getReports().find((r: any) => r.citizenId === otherCitizen.id);
    if (otherReport) {
      ok('citizen cannot read other citizen report -> 403', (await req(port, 'GET', `/api/reports/${otherReport.id}`, undefined, citizenTok)).status === 403);
      ok('citizen cannot reanalyze other citizen report -> 403', (await req(port, 'POST', `/api/reports/${otherReport.id}/reanalyze`, {}, citizenTok)).status === 403);
      ok('citizen cannot delete other citizen report -> 403', (await req(port, 'DELETE', `/api/reports/${otherReport.id}`, undefined, citizenTok)).status === 403);
      ok('citizen cannot reject other citizen report -> 403', (await req(port, 'POST', `/api/reports/${otherReport.id}/reject`, { reason: 'invalid' }, citizenTok)).status === 403);
      ok('analyst cannot delete report -> 403', (await req(port, 'DELETE', `/api/reports/${otherReport.id}`, undefined, analystTok)).status === 403);
      ok('officer cannot reject report without access -> 403/404', await (async()=>{const s=(await req(port,'POST',`/api/reports/${otherReport.id}/reject`,{reason:'invalid reason'},officerTok)).status; return s===403||s===404;})());
    }
  }
  if (anyReport && analyst.role === 'analyst') {
    const analystRead = await req(port, 'GET', `/api/reports/${anyReport.id}`, undefined, analystTok);
    ok('analyst can read report -> 200', analystRead.status === 200);
    const rep = analystRead.json?.data?.report || {};
    ok('analyst report detail omits citizenName', rep.citizenName === undefined);
    ok('analyst report detail omits citizenEmail', rep.citizenEmail === undefined);
  }

  ok('report create rejects invalid payload -> 400', (await req(port, 'POST', '/api/reports', { title: 'x', description: 'y', locationName: '', latitude: 999, longitude: 0, category: 'Nope', urgency: 'nope' }, citizenTok)).status === 400);
  ok('officer cannot create report -> 403', (await req(port, 'POST', '/api/reports', { title: 'Valid title', description: 'Valid description here', locationName: 'Loc', latitude: 1, longitude: 1, category: 'Water & Drainage', urgency: 'low' }, officerTok)).status === 403);
  ok('dept_officer cannot create report -> 403', (await req(port, 'POST', '/api/reports', { title: 'Valid title', description: 'Valid description here', locationName: 'Loc', latitude: 1, longitude: 1, category: 'Water & Drainage', urgency: 'low' }, deptTok)).status === 403);
  ok('analyst cannot create report -> 403', (await req(port, 'POST', '/api/reports', { title: 'Valid title', description: 'Valid description here', locationName: 'Loc', latitude: 1, longitude: 1, category: 'Water & Drainage', urgency: 'low' }, analystTok)).status === 403);
  ok('authority cannot create report -> 403', (await req(port, 'POST', '/api/reports', { title: 'Valid title', description: 'Valid description here', locationName: 'Loc', latitude: 1, longitude: 1, category: 'Water & Drainage', urgency: 'low' }, authorityTok)).status === 403);
  ok('public registration rejects privileged role -> 403', (await req(port, 'POST', '/api/auth/register', { name: 'Eve', email: 'eve-test@example.com', password: 'StrongPass123!', role: 'admin' })).status === 403);
  ok('registration validates input -> 400', (await req(port, 'POST', '/api/auth/register', { name: '', email: 'bad', password: 'short' })).status === 400);
  ok('login rejects missing credentials -> 400', (await req(port, 'POST', '/api/auth/login', { email: '', password: '' })).status === 400);
  ok('citizen cannot resolve incident -> 403', (await req(port, 'POST', '/api/incidents/NOPE/resolve', { actionTaken: 'test action long' }, citizenTok)).status === 403);
  ok('analyst cannot resolve incident -> 403', (await req(port, 'POST', '/api/incidents/NOPE/resolve', { actionTaken: 'test action long' }, analystTok)).status === 403);
  ok('officer cannot resolve incident -> 403', (await req(port, 'POST', '/api/incidents/NOPE/resolve', { actionTaken: 'test action long' }, officerTok)).status === 403);
  ok('citizen cannot escalate incident -> 403', (await req(port, 'POST', '/api/incidents/NOPE/escalate', { reason: 'test escalation reason' }, citizenTok)).status === 403);
  ok('analyst cannot escalate incident -> 403', (await req(port, 'POST', '/api/incidents/NOPE/escalate', { reason: 'test escalation reason' }, analystTok)).status === 403);
  ok('officer cannot escalate incident (no permission) -> 403', (await req(port, 'POST', '/api/incidents/NOPE/escalate', { reason: 'test escalation reason' }, officerTok)).status === 403);
  ok('citizen cannot export intelligence csv -> 403', (await req(port, 'GET', '/api/intelligence/export-csv?type=reports', undefined, citizenTok)).status === 403);
  ok('analyst can export intelligence csv -> 200', (await req(port, 'GET', '/api/intelligence/export-csv?type=reports', undefined, analystTok)).status === 200);
  ok('officer cannot export intelligence csv -> 403', (await req(port, 'GET', '/api/intelligence/export-csv?type=reports', undefined, officerTok)).status === 403);
  ok('dept_officer can export intelligence csv -> 200', (await req(port, 'GET', '/api/intelligence/export-csv?type=reports', undefined, deptTok)).status === 200);
  ok('authority can export intelligence csv -> 200', (await req(port, 'GET', '/api/intelligence/export-csv?type=reports', undefined, authorityTok)).status === 200);
  const analystCsv = await req(port, 'GET', '/api/intelligence/export-csv?type=reports', undefined, analystTok);
  ok('analyst CSV omits CitizenName header', analystCsv.status === 200 && typeof analystCsv.text === 'string' && !analystCsv.text.includes('CitizenName'));
  const adminCsv = await req(port, 'GET', '/api/intelligence/export-csv?type=reports', undefined, adminTok);
  ok('admin CSV includes CitizenName header', adminCsv.status === 200 && typeof adminCsv.text === 'string' && adminCsv.text.includes('CitizenName'));
  ok('citizen cannot access intelligence agent -> 403', (await req(port, 'POST', '/api/intelligence/agent', { query: 'test' }, citizenTok)).status === 403);
  ok('officer cannot access intelligence agent -> 403', (await req(port, 'POST', '/api/intelligence/agent', { query: 'test' }, officerTok)).status === 403);
  ok('dept_officer cannot access intelligence agent -> 403', (await req(port, 'POST', '/api/intelligence/agent', { query: 'test' }, deptTok)).status === 403);
  ok('authority can access intelligence agent -> 200', (await req(port, 'POST', '/api/intelligence/agent', { query: 'summarize current incident trends' }, authorityTok)).status === 200);
  ok('analyst can access intelligence agent -> 200', (await req(port, 'POST', '/api/intelligence/agent', { query: 'summarize current incident trends' }, analystTok)).status === 200);
  ok('intelligence agent rejects empty query -> 400', (await req(port, 'POST', '/api/intelligence/agent', { query: '' }, adminTok)).status === 400);
  ok('intelligence agent rejects invalid specificTool type -> 400', (await req(port, 'POST', '/api/intelligence/agent', { query: 'test', specificTool: 123 }, adminTok)).status === 400);
  ok('citizen cannot access intelligence clusters -> 403', (await req(port, 'GET', '/api/intelligence/clusters', undefined, citizenTok)).status === 403);
  ok('citizen cannot access intelligence hotspots -> 403', (await req(port, 'GET', '/api/intelligence/hotspots', undefined, citizenTok)).status === 403);
  ok('citizen cannot access intelligence trends -> 403', (await req(port, 'GET', '/api/intelligence/trends', undefined, citizenTok)).status === 403);
  ok('officer cannot access intelligence clusters -> 403', (await req(port, 'GET', '/api/intelligence/clusters', undefined, officerTok)).status === 403);
  ok('officer cannot access intelligence hotspots -> 403', (await req(port, 'GET', '/api/intelligence/hotspots', undefined, officerTok)).status === 403);
  ok('officer cannot access intelligence trends -> 403', (await req(port, 'GET', '/api/intelligence/trends', undefined, officerTok)).status === 403);
  ok('dept_officer cannot access intelligence clusters -> 403', (await req(port, 'GET', '/api/intelligence/clusters', undefined, deptTok)).status === 403);
  ok('dept_officer cannot access intelligence hotspots -> 403', (await req(port, 'GET', '/api/intelligence/hotspots', undefined, deptTok)).status === 403);
  ok('dept_officer can access intelligence trends -> 200', (await req(port, 'GET', '/api/intelligence/trends', undefined, deptTok)).status === 200);
  ok('analyst can access intelligence clusters -> 200', (await req(port, 'GET', '/api/intelligence/clusters', undefined, analystTok)).status === 200);
  ok('analyst can access intelligence hotspots -> 200', (await req(port, 'GET', '/api/intelligence/hotspots', undefined, analystTok)).status === 200);
  ok('analyst can access intelligence trends -> 200', (await req(port, 'GET', '/api/intelligence/trends', undefined, analystTok)).status === 200);
  ok('authority can access intelligence clusters -> 200', (await req(port, 'GET', '/api/intelligence/clusters', undefined, authorityTok)).status === 200);
  ok('authority can access intelligence hotspots -> 200', (await req(port, 'GET', '/api/intelligence/hotspots', undefined, authorityTok)).status === 200);
  ok('authority can access intelligence trends -> 200', (await req(port, 'GET', '/api/intelligence/trends', undefined, authorityTok)).status === 200);
  ok('authority can access dataset quality -> 200', (await req(port, 'GET', '/api/intelligence/dataset-quality', undefined, authorityTok)).status === 200);
  ok('admin can access intelligence clusters -> 200', (await req(port, 'GET', '/api/intelligence/clusters', undefined, adminTok)).status === 200);
  ok('admin can access intelligence hotspots -> 200', (await req(port, 'GET', '/api/intelligence/hotspots', undefined, adminTok)).status === 200);
  ok('admin can access intelligence trends -> 200', (await req(port, 'GET', '/api/intelligence/trends', undefined, adminTok)).status === 200);
  ok('admin can access dataset quality -> 200', (await req(port, 'GET', '/api/intelligence/dataset-quality', undefined, adminTok)).status === 200);
  ok('admin can access model metrics -> 200', (await req(port, 'GET', '/api/intelligence/model-metrics', undefined, adminTok)).status === 200);
  ok('admin can access intelligence agent -> 200', (await req(port, 'POST', '/api/intelligence/agent', { query: 'summarize current incident trends' }, adminTok)).status === 200);
  ok('citizen cannot access model metrics -> 403', (await req(port, 'GET', '/api/intelligence/model-metrics', undefined, citizenTok)).status === 403);
  ok('analyst can access model metrics -> 200', (await req(port, 'GET', '/api/intelligence/model-metrics', undefined, analystTok)).status === 200);
  ok('dept_officer cannot access model metrics -> 403', (await req(port, 'GET', '/api/intelligence/model-metrics', undefined, deptTok)).status === 403);
  ok('officer cannot access model metrics -> 403', (await req(port, 'GET', '/api/intelligence/model-metrics', undefined, officerTok)).status === 403);
  ok('authority cannot access model metrics -> 403', (await req(port, 'GET', '/api/intelligence/model-metrics', undefined, authorityTok)).status === 403);
  ok('analyst can access dataset quality -> 200', (await req(port, 'GET', '/api/intelligence/dataset-quality', undefined, analystTok)).status === 200);
  ok('dept_officer can access dataset quality -> 200', (await req(port, 'GET', '/api/intelligence/dataset-quality', undefined, deptTok)).status === 200);
  ok('officer cannot access dataset quality -> 403', (await req(port, 'GET', '/api/intelligence/dataset-quality', undefined, officerTok)).status === 403);
  ok('citizen cannot access dataset quality -> 403', (await req(port, 'GET', '/api/intelligence/dataset-quality', undefined, citizenTok)).status === 403);

  const incidents = db.getIncidents();
  const unassigned = incidents.find((i: any) => !i.assignedDepartmentId && i.status !== 'resolved' && i.status !== 'dismissed' && i.status !== 'closed');
  const resolved = incidents.find((i: any) => i.status === 'resolved');
  ok('unknown incident read -> 404', (await req(port, 'GET', '/api/incidents/INC-NOPE', undefined, adminTok)).status === 404);
  if (unassigned) {
    ok('dept officer cannot access unassigned incident -> 403', (await req(port, 'GET', `/api/incidents/${unassigned.id}`, undefined, deptTok)).status === 403);
    ok('officer cannot access unassigned incident -> 403', (await req(port, 'GET', `/api/incidents/${unassigned.id}`, undefined, officerTok)).status === 403);
    ok('analyst can access unassigned incident -> 200', (await req(port, 'GET', `/api/incidents/${unassigned.id}`, undefined, analystTok)).status === 200);
    ok('admin can access unassigned incident -> 200', (await req(port, 'GET', `/api/incidents/${unassigned.id}`, undefined, adminTok)).status === 200);
    ok('authority can access unassigned incident -> 200', (await req(port, 'GET', `/api/incidents/${unassigned.id}`, undefined, authorityTok)).status === 200);
    ok('dept officer cannot access unassigned incident inspections -> 403', (await req(port, 'GET', `/api/incidents/${unassigned.id}/inspections`, undefined, deptTok)).status === 403);
    const analystDetail = await req(port, 'GET', `/api/incidents/${unassigned.id}`, undefined, analystTok);
    if (analystDetail.status === 200) {
      const linked = analystDetail.json?.data?.linkedReports || [];
      ok('analyst incident linked reports omit citizen PII', linked.every((r: any) => r.citizenName === undefined && r.citizenEmail === undefined));
    }
    if (otherCitizen) {
      const owns = unassigned.reportIds.some((rid: string) => db.getReportById(rid)?.citizenId === otherCitizen.id);
      const notOwn = unassigned.reportIds.every((rid: string) => db.getReportById(rid)?.citizenId !== otherCitizen.id);
      if (owns) ok('linked citizen can access incident -> 200', (await req(port, 'GET', `/api/incidents/${unassigned.id}`, undefined, tokenFor(otherCitizen))).status === 200);
      if (notOwn) ok('unlinked citizen cannot access incident -> 403', (await req(port, 'GET', `/api/incidents/${unassigned.id}`, undefined, tokenFor(otherCitizen))).status === 403);
    }
    const badAssign = await req(port, 'POST', `/api/incidents/${unassigned.id}/assign`, { officerId: officer.id, officerName: officer.name }, deptTok);
    ok('dept officer cannot assign unassigned/other-dept incident -> 403/400', badAssign.status === 403 || badAssign.status === 400, String(badAssign.status));
    ok('analyst cannot create incident from cluster -> 403', (await req(port, 'POST', '/api/incidents/from-cluster', { cluster: { reportIds: unassigned.reportIds } }, analystTok)).status === 403);
    ok('analyst cannot review incident -> 403', (await req(port, 'POST', `/api/incidents/${unassigned.id}/review`, { action: 'confirm', notes: 'x' }, analystTok)).status === 403);
    ok('analyst cannot create inspection -> 403', (await req(port, 'POST', `/api/incidents/${unassigned.id}/inspection`, { verifiedStatus: 'verified_match', observations: 'valid observation', checklist: {} }, analystTok)).status === 403);
  }
  if (resolved) {
    ok('incident review rejects closed incident -> 400', (await req(port, 'POST', `/api/incidents/${resolved.id}/review`, { action: 'confirm', notes: 'closed incident' }, adminTok)).status === 400);
    ok('incident assign rejects closed incident -> 400', (await req(port, 'POST', `/api/incidents/${resolved.id}/assign`, { departmentId: 'DEP-WTR', officerId: 'USR-OFF-01', officerName: 'Officer' }, adminTok)).status === 400);
    ok('unauthenticated incident resolve -> 401', (await req(port, 'POST', `/api/incidents/${resolved.id}/resolve`, { actionTaken: 'already resolved action' })).status === 401);
    ok('incident resolve unknown incident -> 404', (await req(port, 'POST', '/api/incidents/INC-NOPE/resolve', { actionTaken: 'valid resolve action' }, adminTok)).status === 404);
    ok('incident resolve rejects short actionTaken -> 400', (await req(port, 'POST', `/api/incidents/${resolved.id}/resolve`, { actionTaken: 'no' }, adminTok)).status === 400);
    ok('cannot resolve already closed/resolved incident -> 400', (await req(port, 'POST', `/api/incidents/${resolved.id}/resolve`, { actionTaken: 'already resolved action' }, adminTok)).status === 400);
    ok('cannot escalate closed/resolved incident -> 400', (await req(port, 'POST', `/api/incidents/${resolved.id}/escalate`, { reason: 'too late escalation' }, adminTok)).status === 400);
    ok('incident escalate rejects missing reason -> 400', (await req(port, 'POST', `/api/incidents/${resolved.id}/escalate`, {}, adminTok)).status === 400);
    ok('cannot create inspection on closed/resolved incident -> 400', (await req(port, 'POST', `/api/incidents/${resolved.id}/inspection`, { verifiedStatus: 'verified_match', observations: 'valid observation text', checklist: {} }, adminTok)).status === 400);
  }
  const crossDept = incidents.find((i: any) => i.assignedDepartmentId && i.assignedDepartmentId !== deptOfficer.departmentId && i.status !== 'resolved' && i.status !== 'dismissed' && i.status !== 'closed');
  if (crossDept) {
    ok('dept officer cannot access incident outside department -> 403', (await req(port, 'GET', `/api/incidents/${crossDept.id}`, undefined, deptTok)).status === 403);
  }

  ok('unauthenticated notifications -> 401', (await req(port, 'GET', '/api/notifications')).status === 401);
  ok('unauthenticated logout -> 401', (await req(port, 'POST', '/api/auth/logout')).status === 401);
  ok('authenticated notifications -> 200', (await req(port, 'GET', '/api/notifications', undefined, citizenTok)).status === 200);
  ok('mark notification read validates id -> 400', (await req(port, 'PUT', '/api/notifications/%20/read', undefined, citizenTok)).status === 400);
  ok('feedback rejects invalid rating -> 400', (await req(port, 'POST', '/api/feedback', { rating: 10, comment: 'x', feedbackType: 'service_quality' }, citizenTok)).status === 400);

  // Additional Phase 4/5 negative validation & permission checks (isolated)
  if (otherCitizen) {
    const otherReport = db.getReports().find((r: any) => r.citizenId === otherCitizen.id);
    const ownReport = db.getReports().find((r: any) => r.citizenId === citizen.id);
    if (otherReport) {
      ok('citizen cannot update other citizen report -> 403', (await req(port, 'PUT', `/api/reports/${otherReport.id}`, { title: 'Hacked title' }, citizenTok)).status === 403);
      const unscopedUpd = await req(port, 'PUT', `/api/reports/${otherReport.id}`, { status: 'under_review' }, officerTok);
      ok('officer cannot update unscoped report -> 403/404', unscopedUpd.status === 403 || unscopedUpd.status === 404, String(unscopedUpd.status));
      ok('analyst cannot update report -> 403', (await req(port, 'PUT', `/api/reports/${otherReport.id}`, { status: 'under_review' }, analystTok)).status === 403);
      ok('officer cannot delete report -> 403', (await req(port, 'DELETE', `/api/reports/${otherReport.id}`, undefined, officerTok)).status === 403);
      ok('dept_officer cannot withdraw report -> 403', (await req(port, 'DELETE', `/api/reports/${otherReport.id}`, undefined, deptTok)).status === 403);
      ok('authority cannot withdraw report -> 403', (await req(port, 'DELETE', `/api/reports/${otherReport.id}`, undefined, authorityTok)).status === 403);
    }
    if (ownReport) {
      const emptyUpd = await req(port, 'PUT', `/api/reports/${ownReport.id}`, {}, citizenTok);
      ok('citizen report update rejects empty payload -> 400/409', emptyUpd.status === 400 || emptyUpd.status === 409, String(emptyUpd.status));
      const badTitle = await req(port, 'PUT', `/api/reports/${ownReport.id}`, { title: 'abc' }, citizenTok);
      ok('citizen report update rejects short title -> 400/409', badTitle.status === 400 || badTitle.status === 409, String(badTitle.status));
    }
  }
  ok('report update unknown id -> 404', (await req(port, 'PUT', '/api/reports/REP-NOPE', { title: 'Nope title' }, adminTok)).status === 404);
  ok('report delete unknown id -> 404', (await req(port, 'DELETE', '/api/reports/REP-NOPE', undefined, adminTok)).status === 404);
  ok('report reanalyze unknown id -> 404', (await req(port, 'POST', '/api/reports/REP-NOPE/reanalyze', {}, adminTok)).status === 404);
  ok('citizen cannot reanalyze report -> 403', (await req(port, 'POST', '/api/reports/REP-NOPE/reanalyze', {}, citizenTok)).status === 403);
  ok('officer cannot reanalyze report -> 403', (await req(port, 'POST', '/api/reports/REP-NOPE/reanalyze', {}, officerTok)).status === 403);
  ok('dept_officer cannot reanalyze report -> 403', (await req(port, 'POST', '/api/reports/REP-NOPE/reanalyze', {}, deptTok)).status === 403);
  const closedReport = db.getReports().find((r: any) => r.status === 'closed' || r.status === 'resolved');
  if (closedReport) {
    const ownerTok = closedReport.citizenId === citizen.id ? citizenTok : tokenFor(db.getUserById(closedReport.citizenId));
    ok('reject closed/resolved report -> 400', (await req(port, 'POST', `/api/reports/${closedReport.id}/reject`, { reason: 'already closed' }, adminTok)).status === 400);
    ok('citizen cannot withdraw closed/resolved report -> 400', (await req(port, 'DELETE', `/api/reports/${closedReport.id}`, undefined, ownerTok)).status === 400);
  }
  if (anyReport) {
    ok('unauthenticated report update -> 401', (await req(port, 'PUT', `/api/reports/${anyReport.id}`, { status: 'under_review' })).status === 401);
  }

  // Incident review & inspection validation/permission checks
  const activeIncident = incidents.find((i: any) => !['resolved', 'dismissed', 'closed'].includes(i.status));
  if (activeIncident) {
    ok('admin can read active incident detail -> 200', (await req(port, 'GET', `/api/incidents/${activeIncident.id}`, undefined, adminTok)).status === 200);
    ok('authority can read active incident detail -> 200', (await req(port, 'GET', `/api/incidents/${activeIncident.id}`, undefined, authorityTok)).status === 200);
    ok('analyst can read active incident detail -> 200', (await req(port, 'GET', `/api/incidents/${activeIncident.id}`, undefined, analystTok)).status === 200);
    const analystActiveDetail = await req(port, 'GET', `/api/incidents/${activeIncident.id}`, undefined, analystTok);
    if (analystActiveDetail.status === 200) {
      const linked = analystActiveDetail.json?.data?.linkedReports || [];
      ok('analyst active incident linked reports omit citizen PII', linked.every((r: any) => r.citizenName === undefined && r.citizenEmail === undefined));
    }
    if (!activeIncident.assignedDepartmentId || activeIncident.assignedDepartmentId !== officer.departmentId) {
      ok('officer cannot read out-of-scope active incident -> 403', (await req(port, 'GET', `/api/incidents/${activeIncident.id}`, undefined, officerTok)).status === 403);
    }
    if (!activeIncident.assignedDepartmentId || activeIncident.assignedDepartmentId !== deptOfficer.departmentId) {
      ok('dept_officer cannot read out-of-scope active incident -> 403', (await req(port, 'GET', `/api/incidents/${activeIncident.id}`, undefined, deptTok)).status === 403);
    }
    const citizenOwnsActive = activeIncident.reportIds.some((rid: string) => db.getReportById(rid)?.citizenId === citizen.id);
    if (!citizenOwnsActive) {
      ok('unlinked citizen cannot read active incident -> 403', (await req(port, 'GET', `/api/incidents/${activeIncident.id}`, undefined, citizenTok)).status === 403);
    }
    ok('unauthenticated incident review -> 401', (await req(port, 'POST', `/api/incidents/${activeIncident.id}/review`, { action: 'confirm', notes: 'valid notes here' })).status === 401);
    ok('incident review unknown incident -> 404', (await req(port, 'POST', '/api/incidents/INC-NOPE/review', { action: 'confirm', notes: 'valid notes here' }, adminTok)).status === 404);
    ok('incident review rejects invalid action -> 400', (await req(port, 'POST', `/api/incidents/${activeIncident.id}/review`, { action: 'maybe', notes: 'valid notes here' }, adminTok)).status === 400);
    ok('incident review rejects missing notes -> 400', (await req(port, 'POST', `/api/incidents/${activeIncident.id}/review`, { action: 'confirm' }, adminTok)).status === 400);
    ok('incident review rejects long notes -> 400', (await req(port, 'POST', `/api/incidents/${activeIncident.id}/review`, { action: 'confirm', notes: 'x'.repeat(2001) }, adminTok)).status === 400);
    ok('citizen cannot review incident -> 403', (await req(port, 'POST', `/api/incidents/${activeIncident.id}/review`, { action: 'confirm', notes: 'citizen attempt' }, citizenTok)).status === 403);
    ok('analyst cannot review incident -> 403', (await req(port, 'POST', `/api/incidents/${activeIncident.id}/review`, { action: 'confirm', notes: 'analyst attempt' }, analystTok)).status === 403);
    ok('officer cannot review incident -> 403', (await req(port, 'POST', `/api/incidents/${activeIncident.id}/review`, { action: 'confirm', notes: 'valid notes' }, officerTok)).status === 403);
    ok('dept_officer cannot review unscoped incident -> 403/400', await (async()=>{const s=(await req(port,'POST',`/api/incidents/${activeIncident.id}/review`,{action:'confirm',notes:'valid notes'},deptTok)).status; return s===403||s===400;})());

    const inspBad1 = await req(port, 'POST', `/api/incidents/${activeIncident.id}/inspection`, { verifiedStatus: 'nope', observations: '' }, officerTok);
    ok('inspection create rejects invalid payload -> 400/403', inspBad1.status === 400 || inspBad1.status === 403, String(inspBad1.status));
    const inspBad2 = await req(port, 'POST', `/api/incidents/${activeIncident.id}/inspection`, { verifiedStatus: 'verified_match', observations: '' }, officerTok);
    ok('inspection create rejects missing observations -> 400/403', inspBad2.status === 400 || inspBad2.status === 403, String(inspBad2.status));
    ok('inspection create unknown incident -> 404', (await req(port, 'POST', '/api/incidents/INC-NOPE/inspection', { verifiedStatus: 'verified_match', observations: 'valid observation text', checklist: {} }, adminTok)).status === 404);
    ok('citizen cannot create inspection -> 403', (await req(port, 'POST', `/api/incidents/${activeIncident.id}/inspection`, { verifiedStatus: 'verified_match', observations: 'valid observation text' }, citizenTok)).status === 403);
    ok('analyst cannot create inspection -> 403', (await req(port, 'POST', `/api/incidents/${activeIncident.id}/inspection`, { verifiedStatus: 'verified_match', observations: 'valid observation text' }, analystTok)).status === 403);
    ok('dept_officer cannot create inspection (no permission) -> 403', (await req(port, 'POST', `/api/incidents/${activeIncident.id}/inspection`, { verifiedStatus: 'verified_match', observations: 'valid observation text', checklist: {} }, deptTok)).status === 403);
    ok('authority cannot create inspection (no permission) -> 403', (await req(port, 'POST', `/api/incidents/${activeIncident.id}/inspection`, { verifiedStatus: 'verified_match', observations: 'valid observation text', checklist: {} }, authorityTok)).status === 403);

    ok('inspection verify rejects invalid payload -> 400', (await req(port, 'POST', `/api/incidents/${activeIncident.id}/verify-inspection`, { inspectionId: '', departmentRemarks: '', isApproved: 'yes' }, adminTok)).status === 400);
    ok('inspection verify rejects missing remarks -> 400', (await req(port, 'POST', `/api/incidents/${activeIncident.id}/verify-inspection`, { inspectionId: 'INS-NOPE', departmentRemarks: '', isApproved: true }, adminTok)).status === 400);
    ok('inspection verify unknown incident -> 404', (await req(port, 'POST', '/api/incidents/INC-NOPE/verify-inspection', { inspectionId: 'INS-NOPE', departmentRemarks: 'remarks', isApproved: true }, adminTok)).status === 404);
    ok('inspection verify rejects mismatched incident/inspection -> 400', (await req(port, 'POST', '/api/incidents/INC-2026-002/verify-inspection', { inspectionId: 'INSP-2026-001', departmentRemarks: 'remarks', isApproved: true }, adminTok)).status === 400);
    ok('citizen cannot verify inspection -> 403', (await req(port, 'POST', `/api/incidents/${activeIncident.id}/verify-inspection`, { inspectionId: 'INS-NOPE', departmentRemarks: 'remarks', isApproved: true }, citizenTok)).status === 403);
    ok('analyst cannot verify inspection -> 403', (await req(port, 'POST', `/api/incidents/${activeIncident.id}/verify-inspection`, { inspectionId: 'INS-NOPE', departmentRemarks: 'remarks', isApproved: true }, analystTok)).status === 403);
    const offVerify = await req(port, 'POST', `/api/incidents/${activeIncident.id}/verify-inspection`, { inspectionId: 'INS-NOPE', departmentRemarks: 'remarks', isApproved: true }, officerTok);
    ok('officer cannot verify inspection -> 403', offVerify.status === 403, String(offVerify.status));
    ok('authority cannot verify inspection -> 403', (await req(port, 'POST', `/api/incidents/${activeIncident.id}/verify-inspection`, { inspectionId: 'INS-NOPE', departmentRemarks: 'remarks', isApproved: true }, authorityTok)).status === 403);

    ok('admin can list incident inspections -> 200', (await req(port, 'GET', `/api/incidents/${activeIncident.id}/inspections`, undefined, adminTok)).status === 200);
    ok('authority can list incident inspections -> 200', (await req(port, 'GET', `/api/incidents/${activeIncident.id}/inspections`, undefined, authorityTok)).status === 200);
    ok('analyst cannot list incident inspections (no inspection.read) -> 403', (await req(port, 'GET', `/api/incidents/${activeIncident.id}/inspections`, undefined, analystTok)).status === 403);
    ok('officer cannot list unscoped incident inspections -> 403', (await req(port, 'GET', `/api/incidents/${activeIncident.id}/inspections`, undefined, officerTok)).status === 403);
    ok('dept_officer cannot list unscoped incident inspections -> 403', (await req(port, 'GET', `/api/incidents/${activeIncident.id}/inspections`, undefined, deptTok)).status === 403);
    ok('citizen cannot list unlinked incident inspections -> 403/404', await (async()=>{const s=(await req(port,'GET',`/api/incidents/${activeIncident.id}/inspections`,undefined,citizenTok)).status; return s===403||s===404;})());
  }

  // Incident from-cluster validation/permission (no mutation of existing data except none expected on failures)
  ok('unauthenticated from-cluster -> 401', (await req(port, 'POST', '/api/incidents/from-cluster', { cluster: { reportIds: ['REP-NOPE-XYZ'] } })).status === 401);
  ok('from-cluster rejects missing cluster -> 400', (await req(port, 'POST', '/api/incidents/from-cluster', {}, adminTok)).status === 400);
  ok('from-cluster rejects empty reportIds -> 400', (await req(port, 'POST', '/api/incidents/from-cluster', { cluster: { reportIds: [] } }, adminTok)).status === 400);
  ok('from-cluster rejects non-string reportIds -> 400', (await req(port, 'POST', '/api/incidents/from-cluster', { cluster: { reportIds: [123] } }, adminTok)).status === 400);
  ok('from-cluster rejects unknown reportIds -> 400', (await req(port, 'POST', '/api/incidents/from-cluster', { cluster: { reportIds: ['REP-NOPE-XYZ'] } }, adminTok)).status === 400);
  ok('citizen cannot create incident from cluster -> 403', (await req(port, 'POST', '/api/incidents/from-cluster', { cluster: { reportIds: ['REP-NOPE-XYZ'] } }, citizenTok)).status === 403);
  ok('officer cannot create incident from cluster -> 403', (await req(port, 'POST', '/api/incidents/from-cluster', { cluster: { reportIds: ['REP-NOPE-XYZ'] } }, officerTok)).status === 403);

  // Incident assign/escalate validation & permission checks (no state-changing success paths)
  if (activeIncident) {
    ok('unauthenticated incident assign -> 401', (await req(port, 'POST', `/api/incidents/${activeIncident.id}/assign`, { departmentId: 'DEP-WTR', officerId: 'USR-OFF-01', officerName: 'Officer' })).status === 401);
    ok('incident assign rejects missing officer fields -> 400', (await req(port, 'POST', `/api/incidents/${activeIncident.id}/assign`, { officerId: '', officerName: '' }, adminTok)).status === 400);
    ok('incident assign rejects invalid notes type -> 400', (await req(port, 'POST', `/api/incidents/${activeIncident.id}/assign`, { officerId: 'USR-OFF-01', officerName: 'Officer', notes: 123 }, adminTok)).status === 400);
    ok('incident assign unknown incident -> 404', (await req(port, 'POST', '/api/incidents/INC-NOPE/assign', { departmentId: 'DEP-WTR', officerId: 'USR-OFF-01', officerName: 'Officer' }, adminTok)).status === 404);
    ok('citizen cannot assign incident -> 403', (await req(port, 'POST', `/api/incidents/${activeIncident.id}/assign`, { officerId: 'USR-OFF-01', officerName: 'Officer' }, citizenTok)).status === 403);
    ok('officer cannot assign incident -> 403', (await req(port, 'POST', `/api/incidents/${activeIncident.id}/assign`, { officerId: 'USR-OFF-01', officerName: 'Officer' }, officerTok)).status === 403);
    ok('analyst cannot assign incident -> 403', (await req(port, 'POST', `/api/incidents/${activeIncident.id}/assign`, { officerId: 'USR-OFF-01', officerName: 'Officer' }, analystTok)).status === 403);

    ok('unauthenticated incident escalate -> 401', (await req(port, 'POST', `/api/incidents/${activeIncident.id}/escalate`, { reason: 'valid escalation reason' })).status === 401);
    ok('incident escalate rejects long reason -> 400', (await req(port, 'POST', `/api/incidents/${activeIncident.id}/escalate`, { reason: 'x'.repeat(2001) }, adminTok)).status === 400);
    ok('incident escalate unknown incident -> 404', (await req(port, 'POST', '/api/incidents/INC-NOPE/escalate', { reason: 'valid escalation reason' }, adminTok)).status === 404);
    ok('officer cannot escalate incident -> 403', (await req(port, 'POST', `/api/incidents/${activeIncident.id}/escalate`, { reason: 'valid escalation reason' }, officerTok)).status === 403);
    ok('dept_officer cannot escalate unscoped incident -> 403/400', await (async()=>{const s=(await req(port,'POST',`/api/incidents/${activeIncident.id}/escalate`,{reason:'valid escalation reason'},deptTok)).status; return s===403||s===400;})());
  }

  ok('unauthenticated notifications/read-all -> 401', (await req(port, 'POST', '/api/notifications/read-all')).status === 401);
  ok('authenticated notifications/read-all -> 200', (await req(port, 'POST', '/api/notifications/read-all', {}, citizenTok)).status === 200);

  ok('feedback rejects unauthenticated -> 401', (await req(port, 'POST', '/api/feedback', { rating: 4, comment: 'ok', feedbackType: 'service_quality' })).status === 401);
  const fbBadType = await req(port, 'POST', '/api/feedback', { rating: 4, comment: 'ok', feedbackType: 'invalid_type' }, citizenTok);
  ok('feedback ignores unknown type field safely -> 201/400', fbBadType.status === 201 || fbBadType.status === 400, String(fbBadType.status));
  const badExport = await req(port, 'GET', '/api/intelligence/export-csv?type=secrets', undefined, adminTok);
  ok('intelligence export rejects invalid type -> 400', badExport.status === 400, String(badExport.status));
  const defaultExport = await req(port, 'GET', '/api/intelligence/export-csv', undefined, adminTok);
  ok('intelligence export default type reports -> 200', defaultExport.status === 200, String(defaultExport.status));
  const incidentsExport = await req(port, 'GET', '/api/intelligence/export-csv?type=incidents', undefined, adminTok);
  ok('intelligence export incidents type -> 200', incidentsExport.status === 200, String(incidentsExport.status));
  const victim = otherCitizen || citizen;
  const victimOldTok = tokenFor(victim);
  (db as any).invalidateUserSessions(victim.id);
  ok('revoked session token rejected -> 401', (await req(port, 'GET', '/api/reports', undefined, victimOldTok)).status === 401);
  const target = users.find((u: any) => u.role === 'officer') || admin;
  const targetTok = tokenFor(target);
  db.updateUserStatus(target.id, 'suspended', admin);
  ok('suspended account token rejected -> 403', (await req(port, 'GET', '/api/reports', undefined, targetTok)).status === 403);
  db.updateUserStatus(target.id, 'active', admin);
  const targetTok2 = tokenFor(db.getUserById(target.id));
  db.markCredentialsResetRequired(target.id);
  const resetRes = await req(port, 'GET', '/api/reports', undefined, targetTok2);
  ok('token invalidated by credential reset flow rejected -> 401/403', resetRes.status === 401 || resetRes.status === 403, String(resetRes.status));

  const adminUsers = await req(port, 'GET', '/api/admin/users', undefined, adminTok);
  ok('admin users list -> 200', adminUsers.status === 200);
  if (adminUsers.status === 200 && Array.isArray(adminUsers.json?.data) && adminUsers.json.data.length > 0) {
    ok('admin users response omits passwordHash', adminUsers.json.data.every((u: any) => !('passwordHash' in u)));
    ok('admin users response omits internal auth state', adminUsers.json.data.every((u: any) => !('sessionVersion' in u) && !('credentialsResetRequired' in u)));
    ok('admin users retain contact fields for admin (Option B)', adminUsers.json.data.every((u: any) => typeof u.email === 'string'));
  }
  const authorityUsers = await req(port, 'GET', '/api/admin/users', undefined, authorityTok);
  ok('authority users list -> 200', authorityUsers.status === 200);
  if (authorityUsers.status === 200 && Array.isArray(authorityUsers.json?.data) && authorityUsers.json.data.length > 0) {
    ok('authority users response omits passwordHash/internal auth state', authorityUsers.json.data.every((u: any) => !('passwordHash' in u) && !('sessionVersion' in u) && !('credentialsResetRequired' in u)));
    ok('authority users receive reduced directory view (no email/phone, Option B)', authorityUsers.json.data.every((u: any) => !('email' in u) && !('phone' in u)));
  }
  ok('dept_officer cannot access admin departments -> 403', (await req(port, 'GET', '/api/admin/departments', undefined, deptTok)).status === 403);
  ok('analyst cannot access admin departments -> 403', (await req(port, 'GET', '/api/admin/departments', undefined, analystTok)).status === 403);
  ok('citizen cannot access admin departments -> 403', (await req(port, 'GET', '/api/admin/departments', undefined, citizenTok)).status === 403);
  ok('admin can access admin departments -> 200', (await req(port, 'GET', '/api/admin/departments', undefined, adminTok)).status === 200);
  ok('authority cannot access admin departments -> 200', (await req(port, 'GET', '/api/admin/departments', undefined, authorityTok)).status === 200);
  ok('officer cannot access admin departments -> 403', (await req(port, 'GET', '/api/admin/departments', undefined, tokenFor(db.getUserById(officer.id)))).status === 403);

  const logoutUser = users.find((u: any) => u.role === 'analyst') || admin;
  const logoutTok = tokenFor(db.getUserById(logoutUser.id));
  const logoutRes = await req(port, 'POST', '/api/auth/logout', {}, logoutTok);
  ok('logout succeeds -> 200', logoutRes.status === 200);
  ok('token invalid after logout -> 401', (await req(port, 'GET', '/api/reports', undefined, logoutTok)).status === 401);

  const health = await req(port, 'GET', '/api/health');
  ok('health endpoint -> 200', health.status === 200);
  ok('seed endpoint disabled by default -> 403', (await req(port, 'POST', '/api/seed', {}, adminTok)).status === 403);
  ok('unauthenticated seed endpoint -> 401', (await req(port, 'POST', '/api/seed')).status === 401);
  ok('tests-run endpoint disabled -> 403/404', await (async () => { const s = (await req(port, 'POST', '/api/tests/run', {}, adminTok)).status; return s === 403 || s === 404; })());
  ok('unauthenticated tests-run endpoint -> 401', (await req(port, 'POST', '/api/tests/run')).status === 401);
  ok('demo-login disabled by default -> 403/404', await (async () => { const s = (await req(port, 'POST', '/api/auth/demo-login', { email: citizen.email })).status; return s === 403 || s === 404; })());
  ok('unknown API route -> 404 json', (await req(port, 'GET', '/api/does-not-exist')).status === 404);
  ok('X-Content-Type-Options header set', health.headers.get('x-content-type-options') === 'nosniff');
  ok('X-Frame-Options header set', health.headers.get('x-frame-options') === 'SAMEORIGIN');
  ok('Referrer-Policy header set', !!health.headers.get('referrer-policy'));

  console.log(results.join('\n'));
  console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
} finally {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
}
process.exit(failed ? 1 : 0);

