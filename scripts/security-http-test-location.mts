// SCIP HTTP Integration Tests - India Location, Geospatial & IP Intelligence
// Tests: administrative locations, geographic jurisdiction, officer recommendation,
// geographic assignment, flag-for-review, IP security logging, authorization.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { register } from 'node:module';

// Redirect @clerk/backend to a test shim (this test process only).
register('./test-support/clerk-test-loader.mjs', import.meta.url);

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scip-http-location-'));
const tmpDb = path.join(tmpDir, 'scip_test_db.json');
process.env.SCIP_DB_PATH = tmpDb;
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-isolated-location-verification-123456';
process.env.DISABLE_RATE_LIMIT = 'true';
process.env.DISABLE_HMR = 'true';

const { createApp } = await import('../src/server/app.js');
const { db, getDatabaseRuntimeInfo } = await import('../src/database/index.js');

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

async function startServer(): Promise<number> {
  const app = await createApp({ initMongo: false, attachFrontend: false });
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address() as any;
      resolve(addr.port);
    });
    server.on('error', reject);
  });
}

// ============================================================================
// Setup
// ============================================================================

const users = db.getUsers();
const admin = users.find(u => u.role === 'admin')!;
const officer = users.find(u => u.role === 'officer')!;
const citizen = users.find(u => u.role === 'citizen')!;
const analyst = users.find(u => u.role === 'analyst')!;
const authority = users.find(u => u.role === 'authority') || admin;

const adminToken = tokenFor(admin);
const officerToken = tokenFor(officer);
const citizenToken = tokenFor(citizen);
const analystToken = tokenFor(analyst);

const port = await startServer();

// Seed a couple of states/districts for hierarchy testing
const mh = await db.createAdminState({ code: 'MH', name: 'Maharashtra', type: 'state', isActive: true }, admin);
const pune = await db.createAdminDistrict({ code: 'PN', name: 'Pune', stateId: mh.id, isActive: true }, admin);
const haveli = await db.createAdminSubDistrict({ code: 'HA', name: 'Haveli', districtId: pune.id, stateId: mh.id, isActive: true }, admin);
const puneCity = await db.createAdminBlock({ code: 'PC', name: 'Pune City', subDistrictId: haveli.id, districtId: pune.id, stateId: mh.id, isActive: true }, admin);
const koregaon = await db.createAdminLocality({ code: 'KR', name: 'Koregaon Park', blockId: puneCity.id, subDistrictId: haveli.id, districtId: pune.id, stateId: mh.id, type: 'urban_locality', pinCode: '411001', isActive: true }, admin);

// Create seed reports for incident clustering
const { report: rep1 } = await db.createReport({
  title: 'Waterlogging near Koregaon Park',
  description: 'Severe water accumulation on road',
  category: 'Water & Drainage',
  locationName: 'Koregaon Park',
  latitude: 18.5204,
  longitude: 73.8567,
  citizenId: citizen.id,
  citizenName: citizen.name,
  citizenEmail: citizen.email,
  urgency: 'medium',
  images: [],
  stateId: mh.id,
  districtId: pune.id,
  subDistrictId: haveli.id,
  blockId: puneCity.id,
  localityId: koregaon.id,
  locationSource: 'gps',
  locationConfirmedAt: new Date().toISOString()
}, citizen);
const { report: rep2 } = await db.createReport({
  title: 'Pothole on main road',
  description: 'Large pothole causing traffic disruption',
  category: 'Roads & Traffic',
  locationName: 'Pune Main Road',
  latitude: 18.5210,
  longitude: 73.8570,
  citizenId: citizen.id,
  citizenName: citizen.name,
  citizenEmail: citizen.email,
  urgency: 'high',
  images: [],
  stateId: mh.id,
  districtId: pune.id,
  subDistrictId: haveli.id,
  blockId: puneCity.id,
  localityId: koregaon.id,
  locationSource: 'manual_map',
  locationConfirmedAt: new Date().toISOString()
}, citizen);

// ============================================================================
// 1. Administrative Locations - CRUD & Hierarchy
// ============================================================================

// States list
let r = await req(port, 'GET', '/api/locations/states', undefined, adminToken);
ok('GET states returns 200', r.status === 200);
ok('states include Maharashtra', Array.isArray(r.json?.data) && r.json.data.some((s: any) => s.name === 'Maharashtra'));

// State by ID
r = await req(port, 'GET', `/api/locations/states/${mh.id}`, undefined, adminToken);
ok('GET state by id returns 200', r.status === 200);
ok('state name matches', r.json?.data?.name === 'Maharashtra');

// Districts filtered by state
r = await req(port, 'GET', `/api/locations/districts?stateId=${mh.id}`, undefined, adminToken);
ok('GET districts by state returns 200', r.status === 200);
ok('district belongs to state', Array.isArray(r.json?.data) && r.json.data.some((d: any) => d.name === 'Pune' && d.stateId === mh.id));

// Sub-districts filtered by district
r = await req(port, 'GET', `/api/locations/sub-districts?districtId=${pune.id}`, undefined, adminToken);
ok('GET sub-districts by district returns 200', r.status === 200);
ok('sub-district belongs to district', Array.isArray(r.json?.data) && r.json.data.some((sd: any) => sd.name === 'Haveli' && sd.districtId === pune.id));

// Localities filtered by block
r = await req(port, 'GET', `/api/locations/localities?blockId=${puneCity.id}`, undefined, adminToken);
ok('GET localities by block returns 200', r.status === 200);
ok('locality belongs to block', Array.isArray(r.json?.data) && r.json.data.some((l: any) => l.name === 'Koregaon Park' && l.blockId === puneCity.id));

// PIN code validation - valid PIN accepted
r = await req(port, 'POST', '/api/locations/localities', {
  code: 'KR2', name: 'Test Locality', blockId: puneCity.id, subDistrictId: haveli.id,
  districtId: pune.id, stateId: mh.id, type: 'urban_locality', pinCode: '411002', isActive: true
}, adminToken);
ok('POST locality with valid PIN returns 201', r.status === 201);

// PIN code validation - invalid PIN rejected
r = await req(port, 'POST', '/api/locations/localities', {
  code: 'KR3', name: 'Bad PIN Locality', blockId: puneCity.id, subDistrictId: haveli.id,
  districtId: pune.id, stateId: mh.id, type: 'urban_locality', pinCode: '123', isActive: true
}, adminToken);
ok('POST locality with invalid PIN returns 400', r.status === 400);

// Citizen can read locations (location.read)
r = await req(port, 'GET', '/api/locations/states', undefined, citizenToken);
ok('citizen can read states', r.status === 200);

// Non-admin cannot manage locations (location.manage)
r = await req(port, 'POST', '/api/locations/states', {
  code: 'XX', name: 'Test State', type: 'state', isActive: true
}, citizenToken);
ok('citizen cannot create state', r.status === 403);

// ============================================================================
// 2. Geographic Jurisdiction Determination
// ============================================================================

// Pune coordinates approx: 18.5204, 73.8567
r = await req(port, 'GET', '/api/incidents/jurisdiction?lat=18.5204&lng=73.8567', undefined, adminToken);
ok('jurisdiction endpoint returns 200', r.status === 200);
ok('jurisdiction response has withinKnownBoundary', typeof r.json?.data?.withinKnownBoundary === 'boolean');
ok('jurisdiction response has coordinate', r.json?.data?.coordinate?.latitude === 18.5204 && r.json?.data?.coordinate?.longitude === 73.8567);

// Invalid coordinates rejected
r = await req(port, 'GET', '/api/incidents/jurisdiction?lat=200&lng=73.8567', undefined, adminToken);
ok('invalid latitude returns 400', r.status === 400);

// No auth -> 401
r = await req(port, 'GET', '/api/incidents/jurisdiction?lat=18.5204&lng=73.8567');
ok('unauthenticated jurisdiction returns 401', r.status === 401);

// ============================================================================
// 3. Officer Recommendation by Jurisdiction
// ============================================================================

// Set officer's jurisdiction to Pune
await db.updateUserJurisdiction(officer.id, {
  stateIds: [mh.id],
  districtIds: [pune.id],
  subDistrictIds: [haveli.id],
  blockIds: [puneCity.id],
  localityIds: [koregaon.id],
  departmentId: officer.departmentId
}, admin);

// Recommend officers for Pune coordinates
r = await req(port, 'GET', `/api/incidents/recommended-officers?lat=18.5204&lng=73.8567&departmentId=${officer.departmentId}`, undefined, adminToken);
ok('recommended-officers returns 200', r.status === 200);
ok('recommended-officers includes officer', Array.isArray(r.json?.data) && r.json.data.some((o: any) => o.id === officer.id));

// Out-of-boundary coordinates -> no officers
r = await req(port, 'GET', '/api/incidents/recommended-officers?lat=91&lng=0', undefined, adminToken);
ok('out-of-boundary returns empty officers', r.status === 200 && r.json?.data?.length === 0);

// ============================================================================
// 4. Geographic Assignment Validation
// ============================================================================

// Create an incident with coordinates in Pune jurisdiction
const inc = await db.createIncidentFromCluster({
  clusterId: 'CL-TEST-1',
  category: 'Water & Drainage',
  centroid: { latitude: 18.5204, longitude: 73.8567 },
  radiusMeters: 100,
  reportIds: [rep1.id],
  suggestedTitle: 'Test waterlogging',
  severity: 'medium',
  priority: 'P3_MEDIUM',
  confidence: 0.8,
  evidence: [],
  timeSpanHours: 24
}, admin);

// Update incident with administrative location
const incWithLoc = await db.getIncidentById(inc.id);
// Manually set location fields on incident for testing
// (The database doesn't have a direct update for incident location, so we test via assignment)

// Assign officer whose jurisdiction covers Pune
r = await req(port, 'POST', `/api/incidents/${inc.id}/assign`, {
  departmentId: officer.departmentId,
  officerId: officer.id,
  officerName: officer.name,
  notes: 'Geographic jurisdiction test assignment'
}, adminToken);
ok('assign officer within jurisdiction returns 200', r.status === 200);

// Create another officer OUTSIDE Pune jurisdiction
const outsideOfficer = await db.createUser({
  name: 'Outside Officer',
  email: 'outside@test.local',
  passwordHash: 'x',
  role: 'officer',
  departmentId: officer.departmentId,
  status: 'active',
  sessionVersion: 0,
  credentialsResetRequired: false
}, admin) as any;
if (!(outsideOfficer as any).clerkUserId) { await db.linkClerkIdentity(outsideOfficer.id, `clerk:${outsideOfficer.id}`); }
// No jurisdiction set -> should fail assignment

const inc2 = await db.createIncidentFromCluster({
  clusterId: 'CL-TEST-2',
  category: 'Roads & Traffic',
  centroid: { latitude: 18.5204, longitude: 73.8567 },
  radiusMeters: 100,
  reportIds: [rep2.id],
  suggestedTitle: 'Test pothole',
  severity: 'medium',
  priority: 'P3_MEDIUM',
  confidence: 0.8,
  evidence: [],
  timeSpanHours: 24
}, admin);

r = await req(port, 'POST', `/api/incidents/${inc2.id}/assign`, {
  departmentId: officer.departmentId,
  officerId: outsideOfficer.id,
  officerName: outsideOfficer.name,
  notes: 'Officer outside jurisdiction'
}, adminToken);
ok('assign officer outside jurisdiction returns 403', r.status === 403);

// ============================================================================
// 5. Flag for Manual Review
// ============================================================================

// Flag an incident with out-of-boundary coordinates
const { report: rep3 } = await db.createReport({
  title: 'Unauthorized construction',
  description: 'Illegal structure blocking drainage',
  category: 'Structural Safety',
  locationName: 'Out of Boundary Area',
  latitude: 91,
  longitude: 0,
  citizenId: citizen.id,
  citizenName: citizen.name,
  citizenEmail: citizen.email,
  urgency: 'low',
  images: [],
  stateId: mh.id,
  districtId: pune.id,
  subDistrictId: haveli.id,
  blockId: puneCity.id,
  localityId: koregaon.id,
  locationSource: 'manual_map',
  locationConfirmedAt: new Date().toISOString()
}, citizen);

const inc3 = await db.createIncidentFromCluster({
  clusterId: 'CL-TEST-3',
  category: 'Public Safety',
  centroid: { latitude: 91, longitude: 0 }, // invalid/out of boundary
  radiusMeters: 100,
  reportIds: [rep3.id],
  suggestedTitle: 'Out of boundary test',
  severity: 'low',
  priority: 'P4_LOW',
  confidence: 0.5,
  evidence: [],
  timeSpanHours: 1
}, admin);

r = await req(port, 'POST', `/api/incidents/${inc3.id}/flag-review`, {
  reason: 'Coordinates outside known administrative boundary',
  reviewType: 'geographic_boundary'
}, analystToken);
ok('flag review returns 200', r.status === 200);
ok('flag review includes jurisdiction info', r.json?.data?.jurisdiction?.withinKnownBoundary === false);

// Flag review without auth -> 401
r = await req(port, 'POST', `/api/incidents/${inc3.id}/flag-review`, { reason: 'test' });
ok('unauthenticated flag review returns 401', r.status === 401);

// ============================================================================
// 6. IP Security Logging
// ============================================================================

// Admin can read IP logs
r = await req(port, 'GET', '/api/iplogs', undefined, adminToken);
ok('admin can read IP logs', r.status === 200);

// Citizen cannot read IP logs
r = await req(port, 'GET', '/api/iplogs', undefined, citizenToken);
ok('citizen cannot read IP logs', r.status === 403);

// IP logs exclude metadata from response
r = await req(port, 'GET', '/api/iplogs?limit=5', undefined, adminToken);
if (r.status === 200 && r.json?.data) {
  const hasMetadata = r.json.data.some((l: any) => l.metadata !== undefined);
  ok('IP logs exclude metadata from response', !hasMetadata);
}

// IP log retention endpoint
r = await req(port, 'DELETE', '/api/iplogs/retention', { days: 30 }, adminToken);
ok('IP log retention returns 200', r.status === 200);

// Non-admin cannot manage IP logs
r = await req(port, 'DELETE', '/api/iplogs/retention', { days: 30 }, citizenToken);
ok('citizen cannot manage IP logs', r.status === 403);

// ============================================================================
// 7. Authorization - Location Endpoints
// ============================================================================

// Analyst can read geoanalytics
r = await req(port, 'GET', '/api/geoanalytics/state-distribution', undefined, analystToken);
ok('analyst can read geoanalytics', r.status === 200);

// Citizen cannot access geoanalytics (no geoanalytics.read permission)
// Actually citizen doesn't have geoanalytics.read, so should be 403
r = await req(port, 'GET', '/api/geoanalytics/state-distribution', undefined, citizenToken);
ok('citizen cannot read geoanalytics', r.status === 403);

// Admin can manage boundaries
r = await req(port, 'GET', '/api/locations/boundaries', undefined, adminToken);
ok('admin can read boundaries', r.status === 200);

// Citizen cannot read boundaries (no location.boundary.read)
r = await req(port, 'GET', '/api/locations/boundaries', undefined, citizenToken);
ok('citizen cannot read boundaries', r.status === 403);

// ============================================================================
// Summary
// ============================================================================

console.log(`\n=== Location/Geo IP Test Summary: ${passed} passed, ${failed} failed ===`);
for (const res of results) {
  if (res.startsWith('FAIL')) console.log(res);
}
process.exit(failed > 0 ? 1 : 0);
