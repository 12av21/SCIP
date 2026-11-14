// SCIP India Civic Intelligence Test Suite
// Tests civic scheme mapping, escalation matrix, ULB types, PIN code jurisdiction, and full intelligence generation.

import {
  getSchemesForCategory,
  getPrimaryScheme,
  getEscalationPath,
  getRecommendedAuthority,
  resolveJurisdictionByPinCode,
  determineUlbType,
  generateIndiaCivicIntelligence,
  CIVIC_SCHEMES,
  ESCALATION_MATRIX
} from '../src/ai/indiaCivicIntelligence.js';
import {
  ReportCategory,
  UrgencyLevel,
  CivicScheme,
  CivicEscalationLevel,
  UlbType,
  IndiaCivicIntelligence
} from '../types/scip.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  PASS: ${message}`);
  } else {
    failed++;
    console.log(`  FAIL: ${message}`);
  }
}

// ------------------------------------------------------------------
// TEST 1: Civic Schemes
// ------------------------------------------------------------------
console.log('\n=== TEST 1: Civic Schemes ===');

const waterSchemes = getSchemesForCategory('Water & Drainage');
assert(Array.isArray(waterSchemes), 'Water & Drainage returns schemes array');
assert(waterSchemes.length > 0, 'Water & Drainage has at least one scheme');
assert(waterSchemes.some(s => s.code === 'JJM'), 'Jal Jeevan Mission maps to Water & Drainage');
assert(waterSchemes.some(s => s.code === 'AMRUT'), 'AMRUT maps to Water & Drainage');

const sanitationSchemes = getSchemesForCategory('Public Sanitation');
assert(sanitationSchemes.some(s => s.code === 'SBM'), 'Swachh Bharat maps to Public Sanitation');

const roadsSchemes = getSchemesForCategory('Roads & Traffic');
assert(roadsSchemes.some(s => s.code === 'PMGSY'), 'PMGSY maps to Roads & Traffic');

const primary = getPrimaryScheme('Water & Drainage');
assert(primary !== undefined, 'Primary scheme exists for Water & Drainage');
assert(primary!.code === 'JJM', 'Primary scheme for Water & Drainage is JJM');

// Invalid category returns empty
const invalidSchemes = getSchemesForCategory('Non-Existent' as ReportCategory);
assert(invalidSchemes.length === 0, 'Invalid category returns empty schemes');

// All schemes are active
for (const scheme of CIVIC_SCHEMES) {
  assert(scheme.isActive === true, `Scheme ${scheme.code} is active`);
  assert(scheme.ministry.length > 0, `Scheme ${scheme.code} has ministry`);
  assert(scheme.applicableReportCategories.length > 0, `Scheme ${scheme.code} has applicable categories`);
}

// ------------------------------------------------------------------
// TEST 2: Escalation Matrix
// ------------------------------------------------------------------
console.log('\n=== TEST 2: Escalation Matrix ===');

const waterEscalation = getEscalationPath('Water & Drainage', 'medium');
assert(Array.isArray(waterEscalation), 'Escalation path returns array');
assert(waterEscalation.length > 0, 'Escalation path has at least one level');
assert(waterEscalation[0].level === 'ward_officer', 'First escalation level for Water & Drainage medium is ward_officer');

const criticalEscalation = getEscalationPath('Water & Drainage', 'critical');
assert(criticalEscalation.length > waterEscalation.length, 'Critical severity has more escalation levels');

const roadEscalation = getEscalationPath('Roads & Traffic', 'high');
assert(roadEscalation.some(e => e.level === 'municipal_commissioner'), 'Roads & Traffic high includes municipal commissioner');

const authority = getRecommendedAuthority('Water & Drainage', 'medium');
assert(authority === 'Ward Officer', 'Recommended authority for Water & Drainage medium is Ward Officer');

const criticalAuthority = getRecommendedAuthority('Water & Drainage', 'critical');
assert(criticalAuthority === 'Ward Officer', 'Critical severity first point of contact is still Ward Officer');
assert(criticalEscalation.some(e => e.level === 'district_collector'), 'Critical escalation path includes district collector');

// All escalation levels have valid structure
for (const level of ESCALATION_MATRIX) {
  assert(typeof level.level === 'string', 'Escalation level has level string');
  assert(level.order > 0, `Escalation level ${level.level} has positive order`);
  assert(level.typicalResponseTimeHours > 0, `Escalation level ${level.level} has response time`);
}

// ------------------------------------------------------------------
// TEST 3: ULB Type Determination
// ------------------------------------------------------------------
console.log('\n=== TEST 3: ULB Type Determination ===');

assert(determineUlbType('Mumbai') === 'municipal_corporation', 'Mumbai is municipal corporation');
assert(determineUlbType('Delhi') === 'municipal_corporation', 'Delhi is municipal corporation');
assert(determineUlbType('Bengaluru') === 'municipal_corporation', 'Bengaluru is municipal corporation');
assert(determineUlbType('Small Town', 150000) === 'municipality', '150k population is municipality');
assert(determineUlbType('Village', 50000) === 'nagar_panchayat', '50k population is nagar panchayat');

// ------------------------------------------------------------------
// TEST 4: PIN Code Jurisdiction Resolution
// ------------------------------------------------------------------
console.log('\n=== TEST 4: PIN Code Jurisdiction Resolution ===');

const localities = new Map<string, { id: string; name: string; stateId: string; districtId: string; subDistrictId?: string; blockId?: string; pinCode?: string; ulbId?: string; ulbType?: UlbType }>();
localities.set('LOC-1', {
  id: 'LOC-1',
  name: 'Connaught Place',
  stateId: 'ST-DL',
  districtId: 'DIST-DL-01',
  subDistrictId: 'SD-DL-01',
  blockId: 'BLK-DL-01',
  pinCode: '110001',
  ulbId: 'ULB-NDMC',
  ulbType: 'municipal_corporation'
});

const jurisdiction = resolveJurisdictionByPinCode('110001', { localities });
assert(jurisdiction !== undefined, 'PIN code 110001 resolves to jurisdiction');
assert(jurisdiction?.stateId === 'ST-DL', 'Resolved stateId is ST-DL');
assert(jurisdiction?.districtId === 'DIST-DL-01', 'Resolved districtId is DIST-DL-01');
assert(jurisdiction?.localityId === 'LOC-1', 'Resolved localityId is LOC-1');
assert(jurisdiction?.ulbType === 'municipal_corporation', 'Resolved ulbType is municipal_corporation');

// Invalid PIN code
const invalidPin = resolveJurisdictionByPinCode('invalid', { localities });
assert(invalidPin === undefined, 'Invalid PIN code returns undefined');

// Non-existent PIN code
const notFound = resolveJurisdictionByPinCode('999999', { localities });
assert(notFound === undefined, 'Non-existent PIN code returns undefined');

// Short PIN code
const shortPin = resolveJurisdictionByPinCode('1100', { localities });
assert(shortPin === undefined, 'Short PIN code returns undefined');

// ------------------------------------------------------------------
// TEST 5: Full India Civic Intelligence Generation
// ------------------------------------------------------------------
console.log('\n=== TEST 5: Full India Civic Intelligence Generation ===');

const intel = generateIndiaCivicIntelligence(
  'REP-2026-001',
  'Water & Drainage',
  'medium',
  '110001',
  { localities: localities as any }
);

assert(intel.reportId === 'REP-2026-001', 'Intelligence reportId matches');
assert(intel.category === 'Water & Drainage', 'Intelligence category matches');
assert(intel.applicableSchemes.length > 0, 'Intelligence has applicable schemes');
assert(intel.primaryScheme !== undefined, 'Intelligence has primary scheme');
assert(intel.primaryScheme!.code === 'JJM', 'Primary scheme is JJM');
assert(intel.escalationPath.length > 0, 'Intelligence has escalation path');
assert(intel.recommendedAuthority === 'Ward Officer', 'Recommended authority is Ward Officer');
assert(intel.pinCodeJurisdiction !== undefined, 'Intelligence has PIN code jurisdiction');
assert(intel.pinCodeJurisdiction!.stateId === 'ST-DL', 'PIN jurisdiction stateId matches');
assert(intel.confidence > 0, 'Intelligence has positive confidence');
assert(typeof intel.generatedAt === 'string', 'Intelligence has generatedAt timestamp');

// High severity intelligence
const criticalIntel = generateIndiaCivicIntelligence(
  'REP-2026-002',
  'Structural Safety',
  'critical',
  undefined,
  { localities: localities as any }
);
assert(criticalIntel.escalationPath.length > intel.escalationPath.length, 'Critical severity has longer escalation path');
assert(criticalIntel.recommendedAuthority !== 'Ward Officer', 'Critical severity escalates beyond ward officer');

// No PIN code
const noPinIntel = generateIndiaCivicIntelligence(
  'REP-2026-003',
  'Public Health',
  'low',
  undefined,
  { localities: localities as any }
);
assert(noPinIntel.pinCodeJurisdiction === undefined, 'No PIN code means no jurisdiction');
assert(noPinIntel.ulbType === 'nagar_panchayat', 'Default ULB type is nagar_panchayat');

// ------------------------------------------------------------------
// SUMMARY
// ------------------------------------------------------------------
console.log(`\n========================================`);
console.log(`INDIA CIVIC INTELLIGENCE TEST SUMMARY`);
console.log(`========================================`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}`);

if (failed > 0) {
  process.exit(1);
}
