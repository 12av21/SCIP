// SCIP India Civic Intelligence Engine
// Maps municipal report categories to Indian government schemes, Urban Local
// Body types, and India-specific escalation matrices for civic issue resolution.

import {
  ReportCategory,
  UrgencyLevel,
  CivicScheme,
  UrbanLocalBody,
  CivicEscalationLevel,
  PinCodeJurisdiction,
  IndiaCivicIntelligence,
  CivicSchemeCategory,
  UlbType,
  EscalationLevel
} from '../types/scip.js';

// ---------------------------------------------------------------------------
// Civic Schemes (Indian government programs mapped to report categories)
// ---------------------------------------------------------------------------

const CIVIC_SCHEMES: CivicScheme[] = [
  {
    id: 'SCHEME-SBM',
    code: 'SBM',
    name: 'Swachh Bharat Mission',
    fullName: 'Swachh Bharat Abhiyan (Clean India Mission)',
    category: 'swachh_bharat' as CivicSchemeCategory,
    ministry: 'Ministry of Housing and Urban Affairs (MoHUA)',
    description: 'Nation-wide campaign for solid waste management, sanitation, and elimination of open defecation.',
    applicableReportCategories: ['Public Sanitation', 'Public Health'],
    portalUrl: 'https://swachhbharatmission.gov.in',
    helpline: '1800-180-1234',
    isActive: true,
    createdAt: '2014-10-02T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'SCHEME-JJM',
    code: 'JJM',
    name: 'Jal Jeevan Mission',
    fullName: 'Jal Jeevan Mission (Har Ghar Jal)',
    category: 'jal_jeevan' as CivicSchemeCategory,
    ministry: 'Ministry of Jal Shakti',
    description: 'Providing safe and adequate drinking water through individual household tap connections.',
    applicableReportCategories: ['Water & Drainage'],
    portalUrl: 'https://jaljeevanmission.gov.in',
    helpline: '1800-180-1234',
    isActive: true,
    createdAt: '2019-08-15T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'SCHEME-AMRUT',
    code: 'AMRUT',
    name: 'Atal Mission for Rejuvenation and Urban Transformation',
    fullName: 'AMRUT 2.0',
    category: 'amrut' as CivicSchemeCategory,
    ministry: 'Ministry of Housing and Urban Affairs (MoHUA)',
    description: 'Water supply, sewerage, septage management, storm water drains, green spaces, and non-motorized urban transport in 500 cities.',
    applicableReportCategories: ['Water & Drainage', 'Roads & Traffic', 'Parks & Environment'],
    portalUrl: 'https://amrut.gov.in',
    helpline: '1800-180-1234',
    isActive: true,
    createdAt: '2015-06-25T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'SCHEME-SCM',
    code: 'SCM',
    name: 'Smart Cities Mission',
    fullName: 'Smart Cities Mission',
    category: 'smart_cities' as CivicSchemeCategory,
    ministry: 'Ministry of Housing and Urban Affairs (MoHUA)',
    description: 'Developing 100 smart cities with core infrastructure, clean environment, and smart solutions.',
    applicableReportCategories: ['Roads & Traffic', 'Power & Lighting', 'Public Sanitation'],
    portalUrl: 'https://smartcities.gov.in',
    helpline: '1800-180-1234',
    isActive: true,
    createdAt: '2015-06-25T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'SCHEME-PMGSY',
    code: 'PMGSY',
    name: 'Pradhan Mantri Gram Sadak Yojana',
    fullName: 'PMGSY (Prime Minister Rural Roads Program)',
    category: 'pmgsy' as CivicSchemeCategory,
    ministry: 'Ministry of Rural Development',
    description: 'Providing all-weather road connectivity to unconnected habitations in rural areas.',
    applicableReportCategories: ['Roads & Traffic'],
    portalUrl: 'https://omms.nic.in',
    helpline: '1800-180-1234',
    isActive: true,
    createdAt: '2000-12-25T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'SCHEME-MGNREGA',
    code: 'MGNREGA',
    name: 'Mahatma Gandhi National Rural Employment Guarantee Act',
    fullName: 'MGNREGA',
    category: 'mgnrega' as CivicSchemeCategory,
    ministry: 'Ministry of Rural Development',
    description: 'Guaranteeing 100 days of wage employment per year to rural households for public works.',
    applicableReportCategories: ['Roads & Traffic', 'Water & Drainage', 'Parks & Environment'],
    portalUrl: 'https://nrega.nic.in',
    helpline: '1800-180-1234',
    isActive: true,
    createdAt: '2005-09-07T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'SCHEME-PMAY',
    code: 'PMAY',
    name: 'Pradhan Mantri Awas Yojana',
    fullName: 'Pradhan Mantri Awas Yojana (Housing for All)',
    category: 'pma_yojana' as CivicSchemeCategory,
    ministry: 'Ministry of Housing and Urban Affairs (MoHUA)',
    description: 'Affordable housing for urban poor with credit-linked subsidy.',
    applicableReportCategories: ['Structural Safety'],
    portalUrl: 'https://pmay-urban.gov.in',
    helpline: '1800-180-1234',
    isActive: true,
    createdAt: '2015-06-25T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'SCHEME-ABHA',
    code: 'ABHA',
    name: 'Ayushman Bharat Health Account',
    fullName: 'Ayushman Bharat Digital Health Mission',
    category: 'ayushman_bharat' as CivicSchemeCategory,
    ministry: 'Ministry of Health and Family Welfare',
    description: 'Digital health ecosystem with universal health coverage for vulnerable families.',
    applicableReportCategories: ['Public Health'],
    portalUrl: 'https://abdm.gov.in',
    helpline: '1800-180-1234',
    isActive: true,
    createdAt: '2021-09-27T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }
];

// ---------------------------------------------------------------------------
// Escalation Matrix (India-specific civic escalation path)
// ---------------------------------------------------------------------------

const ESCALATION_MATRIX: CivicEscalationLevel[] = [
  {
    level: 'ward_officer' as EscalationLevel,
    title: 'Ward Officer / Sanitary Inspector',
    description: 'First point of contact for ward-level civic issues (garbage, streetlights, local drains).',
    appliesTo: ['Public Sanitation', 'Power & Lighting', 'Water & Drainage', 'Noise & Disturbance'],
    minSeverity: 'low' as UrgencyLevel,
    contactRole: 'Ward Officer',
    typicalResponseTimeHours: 24,
    order: 1
  },
  {
    level: 'corporator' as EscalationLevel,
    title: 'Corporator / Ward Councillor',
    description: 'Elected ward representative who can escalate to municipal commissioner.',
    appliesTo: ['Public Sanitation', 'Roads & Traffic', 'Water & Drainage', 'Parks & Environment'],
    minSeverity: 'medium' as UrgencyLevel,
    contactRole: 'Corporator',
    typicalResponseTimeHours: 48,
    order: 2
  },
  {
    level: 'municipal_commissioner' as EscalationLevel,
    title: 'Municipal Commissioner / Chief Officer',
    description: 'Head of the Urban Local Body; final authority for ULB-level civic issues.',
    appliesTo: ['Water & Drainage', 'Roads & Traffic', 'Public Sanitation', 'Power & Lighting', 'Structural Safety'],
    minSeverity: 'high' as UrgencyLevel,
    contactRole: 'Municipal Commissioner',
    typicalResponseTimeHours: 72,
    order: 3
  },
  {
    level: 'district_collector' as EscalationLevel,
    title: 'District Collector / District Magistrate',
    description: 'District-level administrative head; intervenes when ULB action is insufficient.',
    appliesTo: ['Structural Safety', 'Public Health', 'Water & Drainage', 'Roads & Traffic'],
    minSeverity: 'critical' as UrgencyLevel,
    contactRole: 'District Collector',
    typicalResponseTimeHours: 96,
    order: 4
  },
  {
    level: 'state_secretary' as EscalationLevel,
    title: 'State Secretary (Urban Development / Rural Development)',
    description: 'State-level department secretary; cross-district and policy-level escalation.',
    appliesTo: ['Water & Drainage', 'Roads & Traffic', 'Public Health'],
    minSeverity: 'critical' as UrgencyLevel,
    contactRole: 'Principal Secretary',
    typicalResponseTimeHours: 120,
    order: 5
  },
  {
    level: 'chief_minister' as EscalationLevel,
    title: 'Chief Minister / Honourable Minister',
    description: 'Highest executive authority; exceptional escalation for unresolved critical issues.',
    appliesTo: ['Public Health', 'Water & Drainage', 'Structural Safety'],
    minSeverity: 'critical' as UrgencyLevel,
    contactRole: 'Chief Minister',
    typicalResponseTimeHours: 168,
    order: 6
  }
];

// ---------------------------------------------------------------------------
// PIN code validation
// ---------------------------------------------------------------------------

const PIN_CODE_RE = /^[1-9][0-9]{5}$/;
function isValidPinCode(pin: string | undefined): boolean {
  return typeof pin === 'string' && PIN_CODE_RE.test(pin);
}

// ---------------------------------------------------------------------------
// Scheme mapping
// ---------------------------------------------------------------------------

export function getSchemesForCategory(category: ReportCategory): CivicScheme[] {
  return CIVIC_SCHEMES.filter(s => s.applicableReportCategories.includes(category));
}

export function getPrimaryScheme(category: ReportCategory): CivicScheme | undefined {
  const schemes = getSchemesForCategory(category);
  return schemes.length > 0 ? schemes[0] : undefined;
}

// ---------------------------------------------------------------------------
// Escalation path
// ---------------------------------------------------------------------------

export function getEscalationPath(category: ReportCategory, severity: UrgencyLevel): CivicEscalationLevel[] {
  const severityRank: Record<UrgencyLevel, number> = { low: 1, medium: 2, high: 3, critical: 4 };
  const minRank = severityRank[severity];

  return ESCALATION_MATRIX
    .filter(e => e.appliesTo.includes(category))
    .filter(e => !e.minSeverity || severityRank[e.minSeverity] <= minRank)
    .sort((a, b) => a.order - b.order);
}

export function getRecommendedAuthority(category: ReportCategory, severity: UrgencyLevel): string {
  const path = getEscalationPath(category, severity);
  return path.length > 0 ? path[0].contactRole : 'Municipal Commissioner';
}

// ---------------------------------------------------------------------------
// PIN code jurisdiction resolution
// ---------------------------------------------------------------------------

export interface JurisdictionLookupOptions {
  localities: Map<string, { id: string; name: string; stateId: string; districtId: string; subDistrictId?: string; blockId?: string; pinCode?: string; ulbId?: string; ulbType?: UlbType }>;
  ulbs?: Map<string, { id: string; name: string; type: UlbType }>;
}

export function resolveJurisdictionByPinCode(
  pinCode: string,
  options: JurisdictionLookupOptions
): PinCodeJurisdiction | undefined {
  if (!isValidPinCode(pinCode)) return undefined;

  for (const [localityId, loc] of options.localities.entries()) {
    if (loc.pinCode === pinCode) {
      return {
        pinCode,
        stateId: loc.stateId,
        districtId: loc.districtId,
        subDistrictId: loc.subDistrictId,
        blockId: loc.blockId,
        localityId: localityId,
        ulbId: loc.ulbId,
        ulbType: loc.ulbType
      };
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// ULB type determination
// ---------------------------------------------------------------------------

export function determineUlbType(localityName: string, populationEstimate?: number): UlbType {
  const name = localityName.toLowerCase();

  // Metro cities / large urban areas -> Municipal Corporation
  if (name.includes('mumbai') || name.includes('delhi') || name.includes('bangalore') ||
      name.includes('bengaluru') || name.includes('chennai') || name.includes('kolkata') ||
      name.includes('hyderabad') || name.includes('pune') || name.includes('ahmedabad') ||
      (populationEstimate !== undefined && populationEstimate >= 1000000)) {
    return 'municipal_corporation';
  }

  // Smaller towns -> Municipality
  if (populationEstimate !== undefined && populationEstimate >= 100000) {
    return 'municipality';
  }

  // Default for semi-urban/rural -> Nagar Panchayat
  return 'nagar_panchayat';
}

// ---------------------------------------------------------------------------
// Full India civic intelligence generation
// ---------------------------------------------------------------------------

export interface IndiaCivicIntelligenceOptions {
  localities: Map<string, { id: string; name: string; stateId: string; districtId: string; subDistrictId?: string; blockId?: string; pinCode?: string; ulbId?: string; ulbType?: UlbType }>;
}

export function generateIndiaCivicIntelligence(
  reportId: string,
  category: ReportCategory,
  severity: UrgencyLevel,
  pinCode?: string,
  options?: IndiaCivicIntelligenceOptions
): IndiaCivicIntelligence {
  const applicableSchemes = getSchemesForCategory(category);
  const primaryScheme = applicableSchemes.length > 0 ? applicableSchemes[0] : undefined;
  const escalationPath = getEscalationPath(category, severity);
  const recommendedAuthority = getRecommendedAuthority(category, severity);

  let pinCodeJurisdiction: PinCodeJurisdiction | undefined;
  let ulbType: UlbType | undefined;

  if (pinCode && options?.localities) {
    pinCodeJurisdiction = resolveJurisdictionByPinCode(pinCode, {
      localities: options.localities as any
    });
    if (pinCodeJurisdiction?.ulbType) {
      ulbType = pinCodeJurisdiction.ulbType;
    }
  }

  if (!ulbType) {
    ulbType = determineUlbType('');
  }

  return {
    reportId,
    category,
    applicableSchemes,
    primaryScheme,
    ulbType,
    escalationPath,
    recommendedAuthority,
    pinCodeJurisdiction,
    confidence: applicableSchemes.length > 0 && escalationPath.length > 0 ? 0.9 : 0.5,
    generatedAt: new Date().toISOString()
  };
}

export { CIVIC_SCHEMES, ESCALATION_MATRIX };
