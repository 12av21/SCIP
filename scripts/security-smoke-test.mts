import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scip-test-'));
const tmpDb = path.join(tmpDir, 'scip_test_db.json');
process.env.SCIP_DB_PATH = tmpDb;
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-isolated-verification-123456';

const { SCIPDatabase } = await import('../src/database/scipDatabase.js');
const { hasPermission } = await import('../src/server/middleware/auth.js');

let passed = 0; let failed = 0;
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
    if (msgIncludes && !String(e?.message || '').includes(msgIncludes)) {
      failed++; results.push(`FAIL: ${name} - wrong error: ${e?.message}`);
    } else {
      passed++; results.push(`PASS: ${name}`);
    }
  }
}

const db = new SCIPDatabase(tmpDb);
ok('isolated db uses temp path', !tmpDb.includes('.scip_database.json'));
const users = db.getUsers();
const reports = db.getReports();
const incidents = db.getIncidents();
ok('seeded users exist', users.length > 0);
ok('seeded reports exist', reports.length > 0);
ok('seeded incidents exist', incidents.length > 0);

// RBAC matrix samples
const matrix: Array<[string, string, boolean]> = [
  ['citizen','incident.resolve',false], ['citizen','admin.manage',false], ['citizen','audit.read',false],
  ['officer','admin.manage',false], ['officer','incident.assign',false], ['officer','inspection.create',true],
  ['dept_officer','incident.assign',true], ['dept_officer','incident.resolve',true], ['dept_officer','admin.manage',false],
  ['analyst','intelligence.read',true], ['analyst','incident.resolve',false], ['analyst','data.export',true],
  ['authority','audit.read',true], ['authority','incident.resolve',true], ['authority','admin.manage',false],
  ['admin','admin.manage',true], ['admin','user.delete',true], ['admin','audit.read',true],
];
for (const [role, perm, expected] of matrix) {
  ok(`rbac ${role} ${perm}=${expected}`, hasPermission(role as any, perm as any) === expected);
}

// Sanitization
ok('getUsers strips passwordHash', users.every(u => !(u as any).passwordHash));
const admin = users.find(u => u.role === 'admin')!;
const authority = users.find(u => u.role === 'authority') || admin;
const citizen = users.find(u => u.role === 'citizen')!;
const dept = users.find(u => u.role === 'dept_officer') || authority;
const officer = users.find(u => u.role === 'officer') || authority;
const otherCitizen = users.find(u => u.role === 'citizen' && u.id !== citizen.id) || citizen;

// Assignment DB guards
const openIncident = incidents.find(i => i.status !== 'resolved' && i.status !== 'dismissed' && i.status !== 'closed') || incidents[0];
if (openIncident) {
  expectThrow('assign rejects non-existent officer', () => db.assignIncidentOfficer(openIncident.id, 'DEP-WTR', 'NOPE', 'Nope', admin, ''));
  expectThrow('assign rejects closed incident guard path (non-target)', () => db.assignIncidentOfficer('NOPE-ID', 'DEP-WTR', 'NOPE', 'Nope', admin, ''), 'not found');
}

// Withdraw guards
const citizenReport = reports.find(r => r.citizenId === citizen.id) || reports.find(r => r.status === 'submitted');
if (citizenReport) {
  expectThrow('withdraw rejects other citizen', () => db.withdrawReport(citizenReport.id, otherCitizen.id === citizen.id ? admin : otherCitizen), 'Unauthorized');
}
// withdraw closed
const closedReport = reports.find(r => r.status === 'closed' || r.status === 'resolved');
if (closedReport) {
  expectThrow('withdraw rejects closed report', () => db.withdrawReport(closedReport.id, admin), 'closed');
}

// Review/resolve/escalate closed guards
const closedIncident = incidents.find(i => i.status === 'resolved' || i.status === 'dismissed' || i.status === 'closed');
if (closedIncident) {
  expectThrow('review rejects closed incident', () => db.reviewIncident(closedIncident.id, 'confirm', admin, 'note'), 'closed');
  expectThrow('resolve rejects closed incident', () => db.resolveIncident(closedIncident.id, admin, { actionTaken: 'done' }), 'closed');
  expectThrow('escalate rejects closed incident', () => db.escalateIncident(closedIncident.id, admin, 'reason'), 'closed');
} else {
  results.push('SKIP: closed incident guards (none in seed)');
}

// createInspection closed/missing guards
if (closedIncident) {
  expectThrow('createInspection rejects closed incident', () => db.createInspection({ incidentId: closedIncident.id, verifiedStatus: 'verified_match', observations: 'x', checklist: { physicalVerification:false,safetyHazardAssessed:false,structuralDamageChecked:false,utilityImpactVerified:false }, evidencePhotos: [], recommendedAction: '', inspectionDate: new Date().toISOString() } as any, officer), 'closed');
}
expectThrow('createInspection rejects missing incident', () => db.createInspection({ incidentId: 'NOPE', verifiedStatus: 'verified_match', observations: 'x', checklist: { physicalVerification:false,safetyHazardAssessed:false,structuralDamageChecked:false,utilityImpactVerified:false }, evidencePhotos: [], recommendedAction: '', inspectionDate: new Date().toISOString() } as any, officer), 'not found');

// createIncidentFromCluster guards
expectThrow('cluster rejects empty reportIds', () => (db as any).createIncidentFromCluster({ reportIds: [] }, admin));
expectThrow('cluster rejects missing report', () => (db as any).createIncidentFromCluster({ reportIds: ['NOPE-RPT'], suggestedTitle: 't', category: 'Water & Drainage', centroid: { latitude: 0, longitude: 0 }, radiusMeters: 10, confidence: 0.5, severity: 'medium', priority: 'P3_MEDIUM', evidence: [] }, admin), 'not found');

// Audit integrity + tamper detection (isolated copies only)
const v1 = db.verifyAuditIntegrity();
ok('audit chain valid on isolated DB', v1.isValid === true && v1.checkedCount >= 0);
// new canonical entry remains verifiable
db.logAudit({ action: 'SECURITY_EVENT', module: 'security', userId: admin.id, userEmail: admin.email, userRole: admin.role, ipAddress: '127.0.0.1', details: 'isolated-test' } as any);
const v1b = db.verifyAuditIntegrity();
ok('audit chain valid after canonical append', v1b.isValid === true);

const raw = JSON.parse(fs.readFileSync(tmpDb, 'utf-8'));
if (raw.auditLogs && raw.auditLogs.length > 2) {
  const tampered = JSON.parse(JSON.stringify(raw));
  tampered.auditLogs[2].details = (tampered.auditLogs[2].details || '') + ' [tampered-isolated]';
  const tamperedPath = path.join(tmpDir, 'scip_tampered.json');
  fs.writeFileSync(tamperedPath, JSON.stringify(tampered, null, 2), 'utf-8');
  const { SCIPDatabase: DB2 } = await import('../src/database/scipDatabase.js?tamper=' + Date.now());
  const db2 = new DB2(tamperedPath);
  const v2 = db2.verifyAuditIntegrity();
  ok('audit tamper detected on isolated copy (details)', v2.isValid === false);

  // Additional isolated tamper cases: prevHash break and record deletion
  const tamperedPrev = JSON.parse(JSON.stringify(raw));
  tamperedPrev.auditLogs[1].prevHash = '0'.repeat(64);
  const tamperedPrevPath = path.join(tmpDir, 'scip_tampered_prev.json');
  fs.writeFileSync(tamperedPrevPath, JSON.stringify(tamperedPrev, null, 2), 'utf-8');
  const { SCIPDatabase: DB3 } = await import('../src/database/scipDatabase.js?tprev=' + Date.now());
  const db3 = new DB3(tamperedPrevPath);
  ok('audit tamper detected on isolated copy (prevHash)', db3.verifyAuditIntegrity().isValid === false);

  const tamperedDel = JSON.parse(JSON.stringify(raw));
  tamperedDel.auditLogs.splice(1, 1);
  const tamperedDelPath = path.join(tmpDir, 'scip_tampered_del.json');
  fs.writeFileSync(tamperedDelPath, JSON.stringify(tamperedDel, null, 2), 'utf-8');
  const { SCIPDatabase: DB4 } = await import('../src/database/scipDatabase.js?tdel=' + Date.now());
  const db4 = new DB4(tamperedDelPath);
  ok('audit tamper detected on isolated copy (deletion)', db4.verifyAuditIntegrity().isValid === false);
} else {
  results.push('SKIP: audit tamper tests (insufficient logs)');
}

// Session invalidation helpers
const u = db.getUserById(admin.id)! as any;
const prevSv = u.sessionVersion || 0;
(db as any).invalidateUserSessions(admin.id);
const u2 = db.getUserById(admin.id)! as any;
ok('invalidateUserSessions increments sessionVersion', (u2.sessionVersion || 0) === prevSv + 1);

console.log(results.join('\n'));
console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
process.exit(failed ? 1 : 0);
