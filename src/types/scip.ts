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
  | 'map.manage'
  // Image intelligence permissions
  | 'image.read'
  | 'image.upload';

export interface User {
  id: string;
  clerkUserId?: string;
  name: string;
  email: string;
  passwordHash?: string;
  role: UserRole;
  departmentId?: string;
  departmentName?: string;
  phone?: string;
  status: 'active' | 'suspended' | 'unverified';
  sessionVersion?: number;
  credentialsResetRequired?: boolean;
  // Verification status
  emailVerified: boolean;
  phoneVerified: boolean;
  emailVerificationTokenHash?: string;    // hashed token, never plaintext
  emailVerificationTokenExpiresAt?: string;
  phoneVerificationOtpHash?: string;      // hashed OTP, never plaintext
  phoneVerificationOtpExpiresAt?: string;
  verificationAttempts: number;            // failed verification attempts
  lastVerificationSentAt?: string;         // timestamp of last OTP/token sent
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

// ============================================================================
// Clerk Identity Linking (Phase 3.1.3)
// ============================================================================

export type ClerkLinkStatus =
  | 'NOT_LINKED'
  | 'PENDING_VERIFICATION'
  | 'VERIFIED'
  | 'LINKED'
  | 'EXPIRED'
  | 'REJECTED'
  | 'REVOKED';

export type ClerkLinkVerificationMethod = 'ADMIN_APPROVED' | 'ONE_TIME_CHALLENGE';

export interface ClerkIdentityLink {
  id: string;
  scipUserId: string;
  clerkSubject: string;
  status: ClerkLinkStatus;
  verificationMethod: ClerkLinkVerificationMethod;
  challengeHash?: string;
  challengeSalt?: string;
  challengeExpiresAt?: string;
  attemptCount: number;
  maxAttempts: number;
  resendCooldownUntil?: string;
  createdAt: string;
  updatedAt: string;
  verifiedAt?: string;
  linkedAt?: string;
  expiresAt: string;
  decidedBy?: string;
  decidedAt?: string;
  reason?: string;
  correlationId: string;
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
  duplicateScore: number; // 0 to 1, same unified score used for the duplicate decision
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
  modelUsed: string;
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

// ---------------------------------------------------------------------------
// AI Model Registry Types (Phase 2)
// Tracks model versions, performance metrics, and active model selection
// for the SCIP AI pipeline. Supports both local TypeScript TF-IDF models
// and Python sentence-transformers embedding models.
// ---------------------------------------------------------------------------

export type ModelFramework = 'tfidf-ts' | 'sentence-transformers' | 'sklearn';
export type ModelTask = 'classification' | 'embedding' | 'duplicate-detection' | 'entity-extraction' | 'risk-scoring';
export type ModelStatus = 'candidate' | 'staging' | 'production' | 'deprecated' | 'retired';

export interface ModelPerformance {
  task: ModelTask;
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  sampleCount: number;
  evaluatedAt: string;
  inferenceLatencyMs?: number;
  perCategoryMetrics?: {
    category: ReportCategory;
    precision: number;
    recall: number;
    f1: number;
    sampleCount: number;
  }[];
  notes?: string;
}

export interface ModelVersion {
  version: string;           // semver, e.g. '1.0.0', '2.1.0-embed'
  framework: ModelFramework;
  task: ModelTask;
  modelId?: string;          // sentence-transformers model ID, e.g. 'all-MiniLM-L6-v2'
  status: ModelStatus;
  performance: ModelPerformance[];
  createdAt: string;
  createdBy: string;
  checksum?: string;         // model file / weights hash
  config?: Record<string, any>;
  isDefault: boolean;
}

export interface ModelRegistryEntry {
  name: string;              // e.g. 'scip-classifier', 'scip-embedder'
  displayName: string;
  description: string;
  versions: ModelVersion[];
  activeVersion: string | null;
  defaultVersion: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ModelRegistryStats {
  totalModels: number;
  productionModels: number;
  stagingModels: number;
  deprecatedModels: number;
  byFramework: Record<ModelFramework, number>;
  byTask: Record<ModelTask, number>;
}

export interface ModelSelection {
  modelName: string;
  version: string;
  framework: ModelFramework;
  task: ModelTask;
  reason: string;
}

// ---------------------------------------------------------------------------
// Civic Text Dataset Types (Phase 3)
// Labeled municipal report dataset for training, evaluation, and benchmarking
// of SCIP AI models across 8 report categories.
// ---------------------------------------------------------------------------

export type DatasetSplit = 'train' | 'test' | 'validation';

export interface CivicDatasetEntry {
  id: string;
  title: string;
  description: string;
  text: string;            // combined title + description for model input
  trueCategory: ReportCategory;
  urgency: UrgencyLevel;
  locationName: string;
  latitude: number;
  longitude: number;
  source: 'seed' | 'synthetic' | 'crowd' | 'historical';
  split: DatasetSplit;
  stateId?: string;
  districtId?: string;
  localityId?: string;
  pinCode?: string;
  createdAt: string;
}

export interface DatasetVersion {
  version: string;         // semver, e.g. '1.0.0', '1.1.0'
  entryCount: number;
  categoryDistribution: Record<ReportCategory, number>;
  splitDistribution: Record<DatasetSplit, number>;
  createdAt: string;
  checksum?: string;
  notes?: string;
}

export interface LabeledExample {
  id: string;
  text: string;
  trueCategory: ReportCategory;
  predictedCategory?: ReportCategory;
  confidence?: number;
  correct?: boolean;
}

export interface DatasetQualityMetrics {
  datasetName: string;
  version: string;
  totalEntries: number;
  perCategory: {
    category: ReportCategory;
    entryCount: number;
    precision: number;
    recall: number;
    f1: number;
    support: number;
  }[];
  macroPrecision: number;
  macroRecall: number;
  macroF1: number;
  microPrecision: number;
  microRecall: number;
  microF1: number;
  overallAccuracy: number;
  confusionMatrix: {
    actual: ReportCategory;
    predicted: ReportCategory;
    count: number;
  }[];
  evaluatedAt: string;
  modelVersion: string;
}

// ---------------------------------------------------------------------------
// Semantic Intelligence & AI Evaluation Types (Phase 2.3)
// Metrics for semantic similarity, cross-language evaluation, duplicate
// detection, and entity extraction. All computed with local TF-IDF / rule-based
// engines — no sentence-transformers or trained ML models required.
// ---------------------------------------------------------------------------

export interface SemanticPairResult {
  textA: string;
  textB: string;
  similarity: number; // 0 to 1
  modelId: string;
  languageMatch: boolean; // true if both texts use the same script family
}

export interface SemanticClusteringResult {
  totalReports: number;
  clusterCount: number;
  averageSilhouette: number; // -1 to 1, higher = better separated clusters
  intraClusterSimilarity: number; // average similarity within clusters
  interClusterSimilarity: number; // average similarity between clusters
  clusterSizeDistribution: number[]; // sizes of each cluster
}

export interface DuplicateDetectionEvaluation {
  totalEvaluated: number;
  truePositives: number;   // correctly identified duplicates
  falsePositives: number;  // non-duplicates flagged as duplicates
  falseNegatives: number;  // duplicates missed
  precision: number;       // 0 to 1
  recall: number;          // 0 to 1
  f1Score: number;         // 0 to 1
  threshold: number;       // decision threshold used
}

export interface EntityExtractionEvaluation {
  totalEvaluated: number;
  truePositives: number;   // correctly extracted entities
  falsePositives: number;  // spurious entities
  falseNegatives: number;  // missed entities
  precision: number;       // 0 to 1
  recall: number;          // 0 to 1
  f1Score: number;         // 0 to 1
  byType: Record<'locations' | 'infrastructure' | 'hazards', { precision: number; recall: number; f1: number }>;
}

export interface SemanticEvaluationResult {
  evaluatedAt: string;
  semanticPair: SemanticPairResult | null;
  crossLanguagePairs: SemanticPairResult[];
  semanticClustering: SemanticClusteringResult;
  duplicateDetection: DuplicateDetectionEvaluation;
  entityExtraction: EntityExtractionEvaluation;
  overallScore: number; // 0 to 100, weighted composite
  limitations: string[]; // honest limitations of the evaluation
}

// ---------------------------------------------------------------------------
// Image Intelligence Types (Phase 4)
// ---------------------------------------------------------------------------

export type ImageSource = 'upload' | 'url' | 'camera';

export interface ImageExif {
  make?: string;
  model?: string;
  software?: string;
  datetimeOriginal?: string;       // EXIF DateTimeOriginal
  gpsLatitude?: number;            // decimal degrees
  gpsLongitude?: number;           // decimal degrees
  gpsAltitude?: number;            // meters
  orientation?: number;            // EXIF orientation tag
  width?: number;
  height?: number;
}

export interface ImageMetadata {
  imageId: string;
  source: ImageSource;
  format: 'jpeg' | 'png' | 'webp' | 'gif' | 'unknown';
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  exif?: ImageExif;
  url?: string;                    // public URL if hosted
  storagePath?: string;            // local filesystem path (dev only)
  uploadedAt: string;
  uploadedBy?: string;
}

export interface ImageAnalysis {
  imageId: string;
  ocrText?: string;                // OCR-extracted text (Python service)
  detectedObjects: string[];       // detected object labels
  sceneLabels: string[];           // scene classification labels
  hasText: boolean;
  hasDamage: boolean;              // heuristic: visible structural damage
  confidence: number;              // 0 to 1 overall analysis confidence
  modelVersion: string;
  analyzedAt: string;
}

export interface ImageUploadResult {
  imageId: string;
  url: string;
  metadata: ImageMetadata;
  analysis?: ImageAnalysis;
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
  modelVersion?: string;
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
  modelUsed?: string;
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
export const ModelFramework = {} as any;
export const ModelTask = {} as any;
export const ModelStatus = {} as any;
export const ModelPerformance = {} as any;
export const ModelVersion = {} as any;
export const ModelRegistryEntry = {} as any;
export const ModelRegistryStats = {} as any;
export const ModelSelection = {} as any;
export const DatasetSplit = {} as any;
export const CivicDatasetEntry = {} as any;
export const DatasetVersion = {} as any;
export const LabeledExample = {} as any;
export const DatasetQualityMetrics = {} as any;
export const ImageSource = {} as any;
export const ImageExif = {} as any;
export const ImageMetadata = {} as any;
export const ImageAnalysis = {} as any;
export const ImageUploadResult = {} as any;
export const CivicScheme = {} as any;
export const UrbanLocalBody = {} as any;
export const CivicEscalationLevel = {} as any;
export const PinCodeJurisdiction = {} as any;
export const IndiaCivicIntelligence = {} as any;
export const CivicSchemeCategory = {} as any;
export const UlbType = {} as any;
export const EscalationLevel = {} as any;

// ---------------------------------------------------------------------------
// India Civic Intelligence Types (Phase 6)
// Maps municipal report categories to Indian government schemes, Urban Local
// Body types, and India-specific escalation matrices for civic issue resolution.
// ---------------------------------------------------------------------------

export type CivicSchemeCategory =
  | 'swachh_bharat'
  | 'jal_jeevan'
  | 'amrut'
  | 'smart_cities'
  | 'pmgsy'
  | 'mgnrega'
  | 'pma_yojana'
  | 'ayushman_bharat'
  | 'mid_day_meal'
  | 'icds'
  | 'general';

export interface CivicScheme {
  id: string;
  code: string;                 // e.g. 'SBM', 'JJM', 'AMRUT'
  name: string;                 // e.g. 'Swachh Bharat Mission'
  fullName: string;             // e.g. 'Swachh Bharat Abhiyan / Clean India Mission'
  category: CivicSchemeCategory;
  ministry: string;             // Nodal ministry (MoHUA, Jal Shakti, etc.)
  description: string;
  applicableReportCategories: ReportCategory[];
  portalUrl?: string;
  helpline?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type UlbType = 'municipal_corporation' | 'municipality' | 'nagar_panchayat' | 'cantonment_board' | 'notified_area';

export interface UrbanLocalBody {
  id: string;
  code: string;
  name: string;
  type: UlbType;
  stateId: string;
  districtId?: string;
  localityId?: string;
  pincode?: string;             // Six-digit Indian PIN code
  headTitle: string;            // e.g. 'Municipal Commissioner', 'Chief Officer'
  headName?: string;
  email?: string;
  phone?: string;
  jurisdictionAreaSqKm?: number;
  populationEstimate?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type EscalationLevel =
  | 'ward_officer'
  | 'corporator'
  | 'municipal_commissioner'
  | 'district_collector'
  | 'state_secretary'
  | 'chief_minister';

export interface CivicEscalationLevel {
  level: EscalationLevel;
  title: string;
  description: string;
  appliesTo: ReportCategory[];
  minSeverity?: UrgencyLevel;
  contactRole: string;
  typicalResponseTimeHours: number;
  order: number;                // Escalation sequence order (1 = first point of contact)
}

export interface PinCodeJurisdiction {
  pinCode: string;              // Six-digit Indian PIN code
  stateId: string;
  districtId: string;
  subDistrictId?: string;
  blockId?: string;
  localityId?: string;
  ulbId?: string;
  ulbType?: UlbType;
}

export interface IndiaCivicIntelligence {
  reportId: string;
  category: ReportCategory;
  applicableSchemes: CivicScheme[];
  primaryScheme?: CivicScheme;
  ulbType?: UlbType;
  escalationPath: CivicEscalationLevel[];
  recommendedAuthority: string;
  pinCodeJurisdiction?: PinCodeJurisdiction;
  confidence: number;
  generatedAt: string;
}

