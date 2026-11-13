// Mongoose Schema for AuditLog, Department, Notification, and Feedback Entities
import mongoose, { Schema, Document } from 'mongoose';

// --- AuditLog ---
export interface IAuditLogDocument extends Document {
  id: string;
  timestamp: string;
  action: string;
  module: string;
  recordId?: string;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  ipAddress: string;
  details: string;
  hash?: string;
  prevHash?: string;
  metadata?: Record<string, any>;
}

const AuditLogSchema = new Schema<IAuditLogDocument>({
  id: { type: String, required: true, unique: true, index: true },
  timestamp: { type: String, required: true, index: true },
  action: { type: String, required: true, index: true },
  module: { type: String, required: true, index: true },
  recordId: { type: String },
  userId: { type: String, index: true },
  userEmail: { type: String },
  userRole: { type: String },
  ipAddress: { type: String, default: '127.0.0.1' },
  details: { type: String, required: true },
  hash: { type: String, index: true },
  prevHash: { type: String },
  metadata: { type: Schema.Types.Mixed }
});

export const AuditLogModel = mongoose.models.AuditLog || mongoose.model<IAuditLogDocument>('AuditLog', AuditLogSchema);

// --- Department ---
export interface IDepartmentDocument extends Document {
  id: string;
  code: string;
  name: string;
  description: string;
  headName: string;
  email: string;
  phone: string;
  activeIncidentsCount: number;
  categoriesCovered?: string[];
  createdAt?: string;
}

const DepartmentSchema = new Schema<IDepartmentDocument>({
  id: { type: String, required: true, unique: true, index: true },
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  headName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  activeIncidentsCount: { type: Number, default: 0 },
  categoriesCovered: [{ type: String }],
  createdAt: { type: String }
});

export const DepartmentModel = mongoose.models.Department || mongoose.model<IDepartmentDocument>('Department', DepartmentSchema);

// --- Notification ---
export interface INotificationDocument extends Document {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

const NotificationSchema = new Schema<INotificationDocument>({
  id: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: 'general' },
  link: { type: String },
  read: { type: Boolean, default: false, index: true },
  createdAt: { type: String, required: true }
});

NotificationSchema.index({ userId: 1, read: 1 });

export const NotificationModel = mongoose.models.Notification || mongoose.model<INotificationDocument>('Notification', NotificationSchema);

// --- Feedback ---
export interface IFeedbackDocument extends Document {
  id: string;
  reportId?: string;
  incidentId?: string;
  userId: string;
  userName: string;
  rating: number;
  comments: string;
  createdAt: string;
}

const FeedbackSchema = new Schema<IFeedbackDocument>({
  id: { type: String, required: true, unique: true, index: true },
  reportId: { type: String, index: true },
  incidentId: { type: String, index: true },
  userId: { type: String, required: true, index: true },
  userName: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comments: { type: String },
  createdAt: { type: String, required: true }
});

export const FeedbackModel = mongoose.models.Feedback || mongoose.model<IFeedbackDocument>('Feedback', FeedbackSchema);

// --- Assignment ---
export interface IAssignmentDocument extends Document {
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

const AssignmentSchema = new Schema<IAssignmentDocument>({
  id: { type: String, required: true, unique: true, index: true },
  incidentId: { type: String, required: true, index: true },
  departmentId: { type: String, required: true, index: true },
  departmentName: { type: String, required: true },
  officerId: { type: String, required: true, index: true },
  officerName: { type: String, required: true },
  assignedBy: { type: String, required: true },
  notes: { type: String, default: '' },
  status: { type: String, enum: ['assigned', 'in_progress', 'completed'], default: 'assigned', index: true },
  assignedAt: { type: String, required: true }
});

export const AssignmentModel = mongoose.models.Assignment || mongoose.model<IAssignmentDocument>('Assignment', AssignmentSchema);

// --- Inspection ---
export interface IInspectionDocument extends Document {
  id: string;
  incidentId: string;
  officerId: string;
  officerName: string;
  verifiedStatus: 'verified_match' | 'disputed' | 'partial';
  observations: string;
  checklist: {
    physicalVerification: boolean;
    safetyHazardAssessed: boolean;
    structuralDamageChecked: boolean;
    utilityImpactVerified: boolean;
  };
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

const InspectionSchema = new Schema<IInspectionDocument>({
  id: { type: String, required: true, unique: true, index: true },
  incidentId: { type: String, required: true, index: true },
  officerId: { type: String, required: true, index: true },
  officerName: { type: String, required: true },
  verifiedStatus: { type: String, enum: ['verified_match', 'disputed', 'partial'], required: true },
  observations: { type: String, required: true },
  checklist: {
    physicalVerification: { type: Boolean, default: false },
    safetyHazardAssessed: { type: Boolean, default: false },
    structuralDamageChecked: { type: Boolean, default: false },
    utilityImpactVerified: { type: Boolean, default: false }
  },
  evidencePhotos: [{ type: String }],
  recommendedAction: { type: String, default: '' },
  inspectionDate: { type: String, required: true },
  createdAt: { type: String, required: true },
  departmentVerified: { type: Boolean },
  departmentRemarks: { type: String },
  verifiedByOfficerId: { type: String },
  verifiedByOfficerName: { type: String },
  verifiedAt: { type: String }
});

export const InspectionModel = mongoose.models.Inspection || mongoose.model<IInspectionDocument>('Inspection', InspectionSchema);

// --- Resolution ---
export interface IResolutionDocument extends Document {
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

const ResolutionSchema = new Schema<IResolutionDocument>({
  id: { type: String, required: true, unique: true, index: true },
  incidentId: { type: String, required: true, index: true },
  resolvedBy: { type: String, required: true },
  actionTaken: { type: String, required: true },
  preventiveMeasures: { type: String },
  equipmentUsed: [{ type: String }],
  costEstimate: { type: Number },
  citizenVerified: { type: Boolean, default: false },
  resolvedAt: { type: String, required: true }
});

export const ResolutionModel = mongoose.models.Resolution || mongoose.model<IResolutionDocument>('Resolution', ResolutionSchema);

// --- AIAnalysis ---
export interface IAIAnalysisDocument extends Document {
  reportId: string;
  categoryPredicted: string;
  categoryConfidence: number;
  keywords: string[];
  entities: Record<string, any>;
  sentiment: string;
  duplicateProbability: number;
  topSimilarReports: any[];
  possibleIncident: boolean;
  incidentClusterId?: string;
  severityIndicator: string;
  riskScore: number;
  evidence: string[];
  uncertaintyNotes?: string;
  confidence: number;
  processedAt: string;
}

const AIAnalysisSchema = new Schema<IAIAnalysisDocument>({
  reportId: { type: String, required: true, unique: true, index: true },
  categoryPredicted: { type: String, required: true },
  categoryConfidence: { type: Number, required: true },
  keywords: [{ type: String }],
  entities: { type: Schema.Types.Mixed, default: {} },
  sentiment: { type: String, required: true },
  duplicateProbability: { type: Number, default: 0 },
  topSimilarReports: { type: [Schema.Types.Mixed] as any, default: [] },
  possibleIncident: { type: Boolean, default: false },
  incidentClusterId: { type: String },
  severityIndicator: { type: String, required: true },
  riskScore: { type: Number, default: 0 },
  evidence: [{ type: String }],
  uncertaintyNotes: { type: String },
  confidence: { type: Number, default: 0 },
  processedAt: { type: String, required: true }
});

export const AIAnalysisModel = mongoose.models.AIAnalysis || mongoose.model<IAIAnalysisDocument>('AIAnalysis', AIAnalysisSchema);

// --- RiskScore ---
export interface IRiskScoreDocument extends Document {
  id: string;
  entityType: 'report' | 'incident' | 'cluster';
  entityId: string;
  score: number;
  priority: string;
  factors: any[];
  explanation: string;
  computedAt: string;
}

const RiskScoreSchema = new Schema<IRiskScoreDocument>({
  id: { type: String, required: true, unique: true, index: true },
  entityType: { type: String, enum: ['report', 'incident', 'cluster'], required: true, index: true },
  entityId: { type: String, required: true, index: true },
  score: { type: Number, required: true },
  priority: { type: String, required: true },
  factors: { type: [Schema.Types.Mixed] as any, default: [] },
  explanation: { type: String, default: '' },
  computedAt: { type: String, required: true }
});

export const RiskScoreModel = mongoose.models.RiskScore || mongoose.model<IRiskScoreDocument>('RiskScore', RiskScoreSchema);

// --- Counter (internal, for concurrency-safe ID generation in Mongo runtime) ---
export interface ICounterDocument extends Document {
  key: string;
  seq: number;
}

const CounterSchema = new Schema<ICounterDocument>({
  key: { type: String, required: true, unique: true, index: true },
  seq: { type: Number, required: true, default: 0 }
});

export const CounterModel = mongoose.models.Counter || mongoose.model<ICounterDocument>('Counter', CounterSchema);

// ============================================================================
// India Administrative Location Mongoose Schemas (Mongo parity scaffolding)
// ============================================================================

export interface IAdminStateDocument extends Document {
  id: string;
  code: string;
  name: string;
  type: 'state' | 'union_territory';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const AdminStateSchema = new Schema<IAdminStateDocument>({
  id: { type: String, required: true, unique: true, index: true },
  code: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, index: true },
  type: { type: String, enum: ['state', 'union_territory'], required: true },
  isActive: { type: Boolean, default: true, index: true },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true }
});

export const AdminStateModel = mongoose.models.AdminState || mongoose.model<IAdminStateDocument>('AdminState', AdminStateSchema);

export interface IAdminDistrictDocument extends Document {
  id: string;
  code: string;
  name: string;
  stateId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const AdminDistrictSchema = new Schema<IAdminDistrictDocument>({
  id: { type: String, required: true, unique: true, index: true },
  code: { type: String, required: true },
  name: { type: String, required: true, index: true },
  stateId: { type: String, required: true, index: true },
  isActive: { type: Boolean, default: true, index: true },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true }
});

AdminDistrictSchema.index({ stateId: 1, isActive: 1 });

export const AdminDistrictModel = mongoose.models.AdminDistrict || mongoose.model<IAdminDistrictDocument>('AdminDistrict', AdminDistrictSchema);

export interface IAdminSubDistrictDocument extends Document {
  id: string;
  code: string;
  name: string;
  districtId: string;
  stateId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const AdminSubDistrictSchema = new Schema<IAdminSubDistrictDocument>({
  id: { type: String, required: true, unique: true, index: true },
  code: { type: String, required: true },
  name: { type: String, required: true, index: true },
  districtId: { type: String, required: true, index: true },
  stateId: { type: String, required: true, index: true },
  isActive: { type: Boolean, default: true, index: true },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true }
});

AdminSubDistrictSchema.index({ districtId: 1, isActive: 1 });

export const AdminSubDistrictModel = mongoose.models.AdminSubDistrict || mongoose.model<IAdminSubDistrictDocument>('AdminSubDistrict', AdminSubDistrictSchema);

export interface IAdminBlockDocument extends Document {
  id: string;
  code: string;
  name: string;
  subDistrictId: string;
  districtId: string;
  stateId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const AdminBlockSchema = new Schema<IAdminBlockDocument>({
  id: { type: String, required: true, unique: true, index: true },
  code: { type: String, required: true },
  name: { type: String, required: true, index: true },
  subDistrictId: { type: String, required: true, index: true },
  districtId: { type: String, required: true, index: true },
  stateId: { type: String, required: true, index: true },
  isActive: { type: Boolean, default: true, index: true },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true }
});

AdminBlockSchema.index({ subDistrictId: 1, isActive: 1 });

export const AdminBlockModel = mongoose.models.AdminBlock || mongoose.model<IAdminBlockDocument>('AdminBlock', AdminBlockSchema);

export interface IAdminLocalityDocument extends Document {
  id: string;
  code: string;
  name: string;
  blockId: string;
  subDistrictId: string;
  districtId: string;
  stateId: string;
  type: 'village' | 'town' | 'urban_locality' | 'city';
  pinCode?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const AdminLocalitySchema = new Schema<IAdminLocalityDocument>({
  id: { type: String, required: true, unique: true, index: true },
  code: { type: String, required: true },
  name: { type: String, required: true, index: true },
  blockId: { type: String, required: true, index: true },
  subDistrictId: { type: String, required: true, index: true },
  districtId: { type: String, required: true, index: true },
  stateId: { type: String, required: true, index: true },
  type: { type: String, enum: ['village', 'town', 'urban_locality', 'city'], required: true },
  pinCode: { type: String, index: true },
  isActive: { type: Boolean, default: true, index: true },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true }
});

AdminLocalitySchema.index({ stateId: 1, districtId: 1, isActive: 1 });
AdminLocalitySchema.index({ blockId: 1, isActive: 1 });
AdminLocalitySchema.index({ pinCode: 1 });

export const AdminLocalityModel = mongoose.models.AdminLocality || mongoose.model<IAdminLocalityDocument>('AdminLocality', AdminLocalitySchema);

export interface IAdministrativeBoundaryDocument extends Document {
  id: string;
  level: 'state' | 'district' | 'sub_district' | 'block' | 'locality';
  parentId: string | null;
  geometry?: any;
  createdAt: string;
  updatedAt: string;
}

const AdministrativeBoundarySchema = new Schema<IAdministrativeBoundaryDocument>({
  id: { type: String, required: true, unique: true, index: true },
  level: { type: String, enum: ['state', 'district', 'sub_district', 'block', 'locality'], required: true, index: true },
  parentId: { type: String, index: true },
  geometry: { type: Schema.Types.Mixed },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true }
});

// 2dsphere geospatial index on boundary geometry for location-in-polygon queries
AdministrativeBoundarySchema.index({ geometry: '2dsphere' });

export const AdministrativeBoundaryModel = mongoose.models.AdministrativeBoundary || mongoose.model<IAdministrativeBoundaryDocument>('AdministrativeBoundary', AdministrativeBoundarySchema);

// ============================================================================
// IP Security Log Mongoose Schema (Mongo parity scaffolding)
// ============================================================================

export interface IIPSecurityLogDocument extends Document {
  id: string;
  ipAddress: string;
  timestamp: string;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  correlationId?: string;
  method: string;
  endpoint: string;
  userAgent?: string;
  eventType: string;
  success: boolean;
  details?: string;
  metadata?: Record<string, any>;
  hash?: string;
  prevHash?: string;
}

const IPSecurityLogSchema = new Schema<IIPSecurityLogDocument>({
  id: { type: String, required: true, unique: true, index: true },
  ipAddress: { type: String, required: true, index: true },
  timestamp: { type: String, required: true, index: true },
  userId: { type: String, index: true },
  userEmail: { type: String },
  userRole: { type: String },
  correlationId: { type: String },
  method: { type: String, required: true },
  endpoint: { type: String, required: true, index: true },
  userAgent: { type: String },
  eventType: { type: String, required: true, index: true },
  success: { type: Boolean, required: true, index: true },
  details: { type: String },
  metadata: { type: Schema.Types.Mixed },
  hash: { type: String },
  prevHash: { type: String }
});

IPSecurityLogSchema.index({ timestamp: -1 });
IPSecurityLogSchema.index({ ipAddress: 1, timestamp: -1 });

export const IPSecurityLogModel = mongoose.models.IPSecurityLog || mongoose.model<IIPSecurityLogDocument>('IPSecurityLog', IPSecurityLogSchema);
