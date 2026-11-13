export type UserRole =
  | 'citizen'
  | 'officer'
  | 'dept_officer'
  | 'analyst'
  | 'authority'
  | 'admin';

export type UserPermission =
  | 'user.read'
  | 'user.create'
  | 'user.update'
  | 'user.delete'
  | 'report.create'
  | 'report.read'
  | 'report.update'
  | 'report.delete'
  | 'report.assign'
  | 'incident.read'
  | 'incident.create'
  | 'incident.update'
  | 'incident.assign'
  | 'incident.resolve'
  | 'incident.escalate'
  | 'inspection.create'
  | 'inspection.verify'
  | 'inspection.read'
  | 'feedback.create'
  | 'analytics.read'
  | 'intelligence.read'
  | 'audit.read'
  | 'model.evaluate'
  | 'data.export'
  | 'admin.manage'
  // India location & geospatial permissions
  | 'location.read'
  | 'location.manage'
  | 'location.boundary.read'
  | 'iplog.read'
  | 'iplog.manage'
  | 'geoanalytics.read'
  | 'map.read'
  | 'map.manage';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash?: string;
  role: UserRole;
  departmentId?: string;
  departmentName?: string;
  phone?: string;
  status: 'active' | 'suspended';
  sessionVersion?: number;
  credentialsResetRequired?: boolean;
  // Residence location (separate from complaint locations)
  stateId?: string;
  districtId?: string;
  subDistrictId?: string;
  blockId?: string;
  localityId?: string;
  pinCode?: string;
  residenceAddress?: string;
  // Officer geographic jurisdiction
  jurisdictionStateIds?: string[];
  jurisdictionDistrictIds?: string[];
  jurisdictionSubDistrictIds?: string[];
  jurisdictionBlockIds?: string[];
  jurisdictionLocalityIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  description: string;
  headName: string;
  email: string;
  phone: string;
  activeIncidentsCount: number;
  categoriesCovered?: string[];
  createdAt: string;
}

export type ReportCategory =
  | 'Water & Drainage'
  | 'Roads & Traffic'
  | 'Public Sanitation'
  | 'Power & Lighting'
  | 'Parks & Environment'
  | 'Structural Safety'
  | 'Public Health'
  | 'Noise & Disturbance';

export type ReportStatus =
  | 'submitted'
  | 'processing'
  | 'analyzed'
  | 'linked'
  | 'under_review'
  | 'assigned'
  | 'resolved'
  | 'closed';

export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical';

export interface Report {
  id: string;
  title: string;
  description: string;
  category: ReportCategory;
  subcategory?: string;
  locationName: string;
  latitude: number;
  longitude: number;
  citizenId: string;
  citizenName: string;
  citizenEmail: string;
  status: ReportStatus;
  urgency: UrgencyLevel;
  incidentId?: string;
  images?: string[];
  // India location context (additive, preserves existing records)
  stateId?: string;
  districtId?: string;
  subDistrictId?: string;
  blockId?: string;
  localityId?: string;
  pinCode?: string;
  locationSource?: LocationSource;
  locationAccuracyMeters?: number;
  locationConfirmedAt?: string;
  // Complaint-specific address details (distinct from citizen residence)
  address?: string;
  landmark?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SimilarReportMatch {
  reportId: string;
  reportTitle: string;
  category: ReportCategory;
  similarityScore: number; // 0 to 1
  distanceMeters: number;
  timeDeltaHours: number;
  matchingTerms: string[];
  isPotentialDuplicate: boolean;
}

export interface AIAnalysis {
  reportId: string;
  categoryPredicted: ReportCategory;
  categoryConfidence: number; // 0 to 1
  keywords: string[];
  entities: {
    locations: string[];
    infrastructure: string[];
    hazards: string[];
    temporal: string[];
  };
  sentiment: 'negative' | 'neutral' | 'urgent';
  duplicateProbability: number;
  topSimilarReports: SimilarReportMatch[];
  possibleIncident: boolean;
  incidentClusterId?: string;
  severityIndicator: UrgencyLevel;
  riskScore: number; // 0 to 100
  evidence: string[];
  uncertaintyNotes?: string;
  confidence: number;
  processedAt: string;
}

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentPriority = 'P1_CRITICAL' | 'P2_HIGH' | 'P3_MEDIUM' | 'P4_LOW' | 'P1' | 'P2' | 'P3' | 'P4';
export type IncidentStatus =
  | 'potential'
  | 'under_review'
  | 'confirmed'
  | 'in_progress'
  | 'resolved'
  | 'closed'
  | 'dismissed';

export interface Incident {
  id: string;
  title: string;
  category: ReportCategory;
  description: string;
  locationName: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  reportIds: string[];
  severity: IncidentSeverity;
  priority: IncidentPriority;
  confidence: number; // 0 to 1
  status: IncidentStatus;
  isAIGenerated: boolean;
  humanReviewed: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  assignedDepartmentId?: string;
  assignedDepartmentName?: string;
  assignedOfficerId?: string;
  assignedOfficerName?: string;
  resolutionNotes?: string;
  resolvedAt?: string;
  evidence: string[];
  // India location context (additive)
  stateId?: string;
  districtId?: string;
  subDistrictId?: string;
  blockId?: string;
  localityId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Assignment {
  id: string;
  incidentId: string;
  departmentId: string;
  departmentName: string;
  officerId: string;
  officerName: string;
  assignedBy: string;
  notes: string;
  status: 'assigned' | 'in_progress' | 'completed';
  assignedAt: string;
}

export interface InspectionChecklist {
  physicalVerification: boolean;
  safetyHazardAssessed: boolean;
  structuralDamageChecked: boolean;
  utilityImpactVerified: boolean;
}

export interface InspectionRecord {
  id: string;
  incidentId: string;
  officerId: string;
  officerName: string;
  verifiedStatus: 'verified_match' | 'disputed' | 'partial';
  observations: string;
  checklist: InspectionChecklist;
  evidencePhotos: string[];
  recommendedAction: string;
  inspectionDate: string;
  createdAt: string;
  departmentVerified?: boolean;
  departmentRemarks?: string;
  verifiedByOfficerId?: string;
  verifiedByOfficerName?: string;
  verifiedAt?: string;
}

export interface ModelEvaluationMetrics {
  modelVersion: string;
  evaluatedAt: string;
  sampleCount: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  inferenceLatencyMs: number;
  perCategoryMetrics: {
    category: ReportCategory;
    precision: number;
    recall: number;
    f1: number;
    sampleCount: number;
  }[];
  confusionMatrix: {
    actual: ReportCategory;
    predicted: ReportCategory;
    count: number;
  }[];
  isDevelopmentSample?: boolean;
  sufficiencyStatus?: 'production_verified' | 'insufficient_sample_size';
  limitationsWarning?: string;
  splitRatio?: string;
}

export interface Resolution {
  id: string;
  incidentId: string;
  resolvedBy: string;
  actionTaken: string;
  preventiveMeasures?: string;
  equipmentUsed?: string[];
  costEstimate?: number;
  citizenVerified: boolean;
  resolvedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'report_status' | 'incident_alert' | 'assignment' | 'resolution' | 'system';
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface Feedback {
  id: string;
  reportId?: string;
  incidentId?: string;
  userId: string;
  userName: string;
  rating: number; // 1-5
  comments: string;
  createdAt: string;
}

export type AuditAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'REGISTER'
  | 'PRIVILEGED_MEMBER_REGISTERED'
  | 'USER_CREATED'
  | 'ROLE_CHANGED'
  | 'USER_STATUS_UPDATED'
  | 'PASSWORD_CHANGED'
  | 'PASSWORD_RESET_REQUESTED'
  | 'REPORT_CREATED'
  | 'REPORT_UPDATED'
  | 'REPORT_DELETED'
  | 'REPORT_WITHDRAWN'
  | 'REPORT_REJECTED'
  | 'AI_ANALYSIS_COMPLETED'
  | 'INCIDENT_DETECTED'
  | 'INCIDENT_REVIEWED'
  | 'INCIDENT_ASSIGNED'
  | 'INCIDENT_RESOLVED'
  | 'INCIDENT_DISMISSED'
  | 'SECURITY_EVENT';

export interface AuditLog {
  id: string;
  action: AuditAction;
  module: 'auth' | 'reports' | 'incidents' | 'intelligence' | 'admin' | 'security';
  recordId?: string;
  userId: string;
  userEmail: string;
  userRole: UserRole;
  ipAddress: string;
  details: string;
  metadata?: Record<string, any>;
  timestamp: string;
  hash?: string;
  prevHash?: string;
}

export interface RiskFactor {
  factor: string;
  weight: number;
  score: number;
  description: string;
}

export interface RiskScore {
  id: string;
  entityType: 'report' | 'incident' | 'cluster';
  entityId: string;
  score: number; // 0 to 100
  priority: IncidentPriority;
  factors: RiskFactor[];
  explanation: string;
  computedAt: string;
}

// ---------------------------------------------------------------------------
// India Administrative Location Hierarchy
// India → State/UT → District → Sub-district/Tehsil/Taluk → Block → Village/Town/Urban Locality
// Codes and names are stored separately; LGD-style identifiers preferred.
// ---------------------------------------------------------------------------

export type LocationLevel = 'state' | 'district' | 'sub_district' | 'block' | 'locality';

export interface AdminState {
  id: string;            // e.g. 'IN-ST-01' or LGD state code
  code: string;          // official short code, e.g. 'MH', 'DL', 'KA'
  name: string;          // e.g. 'Maharashtra', 'Delhi', 'Karnataka'
  type: 'state' | 'union_territory';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminDistrict {
  id: string;
  code: string;          // district code within state
  name: string;
  stateId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminSubDistrict {
  id: string;
  code: string;
  name: string;
  districtId: string;
  stateId: string;       // denormalized for fast filtering
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminBlock {
  id: string;
  code: string;
  name: string;
  subDistrictId: string;
  districtId: string;
  stateId: string;       // denormalized for fast filtering
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminLocality {
  id: string;
  code: string;
  name: string;
  blockId: string;
  subDistrictId: string;
  districtId: string;
  stateId: string;       // denormalized for fast filtering
  type: 'village' | 'town' | 'urban_locality' | 'city';
  pinCode?: string;      // six-digit Indian PIN code, optional
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdministrativeBoundary {
  id: string;
  level: LocationLevel;
  parentId: string | null;
  geometry?: GeoJSON.Polygon | null;  // optional boundary polygon
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Complaint location (distinct from residence location)
// ---------------------------------------------------------------------------

export type LocationSource = 'gps' | 'manual_map' | 'geocoded' | 'preset';

export interface ComplaintLocation {
  latitude: number;
  longitude: number;
  stateId?: string;
  districtId?: string;
  subDistrictId?: string;
  blockId?: string;
  localityId?: string;
  address?: string;
  landmark?: string;
  pinCode?: string;
  locationSource: LocationSource;
  locationAccuracyMeters?: number;
  locationConfirmedAt?: string;
}

// ---------------------------------------------------------------------------
// IP security audit logging
// ---------------------------------------------------------------------------

export type AuthEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'REGISTER'
  | 'PASSWORD_CHANGED'
  | 'PASSWORD_RESET_REQUESTED'
  | 'SESSION_REVOKED'
  | 'SUSPICIOUS_ACTIVITY'
  | 'RATE_LIMIT_HIT'
  | 'UNAUTHORIZED_ACCESS_ATTEMPT';

export interface IPSecurityLog {
  id: string;
  ipAddress: string;          // redacted in ordinary app logs
  timestamp: string;
  userId?: string;
  userEmail?: string;
  userRole?: UserRole;
  correlationId?: string;
  method: string;
  endpoint: string;
  userAgent?: string;
  eventType: AuthEventType;
  success: boolean;
  details?: string;
  metadata?: Record<string, any>;
  hash?: string;
  prevHash?: string;
}

export interface SpatioTemporalCluster {
  clusterId: string;
  category: ReportCategory;
  centroid: {
    latitude: number;
    longitude: number;
  };
  radiusMeters: number;
  reportIds: string[];
  reportCount: number;
  suggestedTitle: string;
  severity: IncidentSeverity;
  priority: IncidentPriority;
  confidence: number;
  evidence: string[];
  timeSpanHours: number;
}

export interface AgentToolResult {
  toolName: string;
  status: 'success' | 'partial' | 'insufficient_evidence';
  executionTimeMs: number;
  summary: string;
  data: any;
}

export interface AgentBriefing {
  id: string;
  query: string;
  timestamp: string;
  executiveSummary: string;
  confidence: number;
  toolResults: AgentToolResult[];
  recommendedActions: string[];
  uncertaintyDisclaimer: string;
}

// Runtime placeholder exports to guarantee Node.js 22 native type-stripping module resolution
export const User = {} as any;
export const Department = {} as any;
export const Report = {} as any;
export const Incident = {} as any;
export const AuditLog = {} as any;
export const Notification = {} as any;
export const RiskScore = {} as any;
export const RiskFactor = {} as any;
export const SpatioTemporalCluster = {} as any;
export const AgentBriefing = {} as any;
export const AgentToolResult = {} as any;
export const SimilarReportMatch = {} as any;
export const AIAnalysis = {} as any;
export const Feedback = {} as any;
export const Assignment = {} as any;
export const InspectionRecord = {} as any;
export const ModelEvaluationMetrics = {} as any;
export const Resolution = {} as any;
export const UserRole = {} as any;
export const UserPermission = {} as any;
export const ReportCategory = {} as any;
export const ReportStatus = {} as any;
export const UrgencyLevel = {} as any;
export const IncidentSeverity = {} as any;
export const IncidentPriority = {} as any;
export const IncidentStatus = {} as any;
export const AuditAction = {} as any;
export const LocationLevel = {} as any;
export const LocationSource = {} as any;
export const AuthEventType = {} as any;
export const AdminState = {} as any;
export const AdminDistrict = {} as any;
export const AdminSubDistrict = {} as any;
export const AdminBlock = {} as any;
export const AdminLocality = {} as any;
export const AdministrativeBoundary = {} as any;
export const ComplaintLocation = {} as any;
export const IPSecurityLog = {} as any;

