/**
 * SCIP Repository contract (Phase 2 abstraction)
 * Async-capable interface to support both JSON-backed and future MongoDB-backed implementations.
 * JSON implementation preserves existing runtime behavior; Mongo implementation must reach parity before cutover.
 */
import { SCIPDatabase } from './scipDatabase.js';
import type {
  User, UserRole, Department, Report, AIAnalysis, Incident, SpatioTemporalCluster,
  Notification, Feedback, AuditLog, InspectionRecord, ModelEvaluationMetrics,
  AdminState, AdminDistrict, AdminSubDistrict, AdminBlock, AdminLocality,
  AdministrativeBoundary, IPSecurityLog, AuthEventType, LocationLevel,
  ClerkIdentityLink, ClerkLinkVerificationMethod,
  NotificationTemplate, NotificationPreference, NotificationEventType, NotificationChannel, NotificationPriority, NotificationFilters, NotificationStats
} from '../types/scip.js';

export interface IScipRepository {
  // persistence/lifecycle
  persist(): Promise<void> | void;
  seedDatabase(): Promise<void> | void;
  resetToSeedData(): Promise<void> | void;
  isDiskPersisted(): boolean;

  // audit
  logAudit(log: Omit<AuditLog, 'id' | 'timestamp' | 'hash' | 'prevHash'>): Promise<AuditLog> | AuditLog;
  verifyAuditIntegrity(): Promise<{ isValid: boolean; checkedCount: number; brokenId?: string }> | { isValid: boolean; checkedCount: number; brokenId?: string };
  getAuditLogs(filters?: { module?: string; action?: string; userId?: string }): Promise<AuditLog[]> | AuditLog[];

  // users
  getUsers(): Promise<User[]> | User[];
  getUserById(id: string): Promise<User | undefined> | User | undefined;
  getUserByEmailWithPassword(email: string): Promise<User | undefined> | User | undefined;
  getUserByClerkId(clerkUserId: string): Promise<User | undefined> | User | undefined;
  findUsersByDepartment(departmentId: string): Promise<User[]> | User[];
  findUsersByRole(role: UserRole): Promise<User[]> | User[];
  createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> | User;
  updateUserRole(userId: string, newRole: UserRole, adminUser: User): Promise<User> | User;
  updateUserStatus(userId: string, status: 'active' | 'suspended', adminUser: User): Promise<User> | User;
  invalidateUserSessions(userId: string): Promise<void> | void;
  markCredentialsResetRequired(userId: string): Promise<void> | void;
  changeUserPassword(userId: string, newPasswordHash: string): Promise<void> | void;
  updateUserProfile(userId: string, updates: { name?: string; phone?: string }): Promise<User> | User;
  deleteUser(userId: string, requestingUser: User): Promise<User> | User;

  // clerk identity linking (Phase 3.1.3)
  linkClerkIdentity(scipUserId: string, clerkSubject: string): Promise<{ linked: boolean; reason?: string }> | { linked: boolean; reason?: string };
  createClerkLinkRequest(input: { scipUserId: string; clerkSubject: string; verificationMethod: ClerkLinkVerificationMethod; correlationId: string }): Promise<ClerkIdentityLink> | ClerkIdentityLink;

  /**
   * Secure citizen onboarding for a verified Clerk identity that has no existing
   * SCIP account. Creates exactly one new citizen profile, links the Clerk
   * subject, and never escalates role. Caller (route) must enforce that the
   * Clerk identity is verified and that no existing SCIP account already matches.
   */
  createClerkCitizen(input: {
    name: string;
    email: string;
    phone?: string;
    clerkSubject: string;
    residenceAddress?: string;
  }): Promise<User> | User;
  getClerkLinkById(id: string): Promise<ClerkIdentityLink | undefined> | ClerkIdentityLink | undefined;
  getClerkLinkBySubject(clerkSubject: string): Promise<ClerkIdentityLink | undefined> | ClerkIdentityLink | undefined;
  getClerkLinksByScipUser(scipUserId: string): Promise<ClerkIdentityLink[]> | ClerkIdentityLink[];
  listPendingClerkLinks(): Promise<ClerkIdentityLink[]> | ClerkIdentityLink[];
  setClerkLinkChallenge(id: string, challengeHash: string, challengeSalt: string, expiresAt: string, resendCooldownUntil: string): Promise<void> | void;
  submitClerkLinkChallenge(id: string, otp: string): Promise<{ verified: boolean; linked: boolean; reason?: string }> | { verified: boolean; linked: boolean; reason?: string };
  decideClerkLink(id: string, decision: 'approve' | 'reject', adminUser: User, reason: string): Promise<{ linked: boolean; reason?: string }> | { linked: boolean; reason?: string };
  cancelClerkLink(id: string, clerkSubject: string): Promise<void> | void;
  expireStaleClerkLinks(): Promise<number> | number;

  // departments
  getDepartments(): Promise<Department[]> | Department[];
  getDepartmentById(id: string): Promise<Department | undefined> | Department | undefined;

  // reports
  getReports(filter?: { citizenId?: string; status?: string; category?: string; urgency?: string; incidentId?: string }): Promise<Report[]> | Report[];
  getReportById(id: string): Promise<Report | undefined> | Report | undefined;
  getAIAnalysisForReport(reportId: string): Promise<AIAnalysis | undefined> | AIAnalysis | undefined;
  updateAIAnalysis(reportId: string, updates: Partial<AIAnalysis>): Promise<AIAnalysis> | AIAnalysis;
  createReport(reportInput: Omit<Report, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<{ report: Report; analysis: AIAnalysis }> | { report: Report; analysis: AIAnalysis };
  updateReport(id: string, updates: Partial<Report>, user: User): Promise<Report> | Report;
  withdrawReport(id: string, user: User): Promise<Report> | Report;
  runAndStoreAIAnalysis(report: Report, recordAudit?: boolean): Promise<AIAnalysis> | AIAnalysis;

  // incidents
  getIncidents(filter?: { status?: string; category?: string; priority?: string }): Promise<Incident[]> | Incident[];
  getIncidentById(id: string): Promise<Incident | undefined> | Incident | undefined;
  createIncidentFromCluster(cluster: SpatioTemporalCluster, creatorUser: User): Promise<Incident> | Incident;
  reviewIncident(incidentId: string, action: 'confirm' | 'dismiss', reviewer: User, notes?: string, deptId?: string, officerId?: string): Promise<Incident> | Incident;
  resolveIncident(incidentId: string, resolver: User, payload: { actionTaken: string; preventiveMeasures?: string; costEstimate?: number }): Promise<Incident> | Incident;
  closeIncident(incidentId: string, closer: User, notes?: string): Promise<Incident> | Incident;
  reopenIncident(incidentId: string, reopener: User, reason: string): Promise<Incident> | Incident;
  verifyResolution(incidentId: string, citizenId: string, verified: boolean, comments?: string): Promise<Incident> | Incident;

  // notifications/feedback
  getNotificationsForUser(userId: string): Promise<Notification[]> | Notification[];
  createNotification(data: Omit<Notification, 'id' | 'createdAt' | 'read'>): Promise<Notification> | Notification;
  markNotificationAsRead(notifId: string, userId: string): Promise<void> | void;
  markAllNotificationsAsRead(userId: string): Promise<void> | void;
  // Enhanced notification methods
  findNotificationById(id: string): Promise<Notification | undefined> | Notification | undefined;
  updateNotification(id: string, notification: Notification): Promise<Notification> | Notification;
  deleteNotification(id: string): Promise<boolean> | boolean;
  findNotificationsByUser(userId: string, filters?: NotificationFilters): Promise<Notification[]> | Notification[];
  getNotificationStats(userId: string): Promise<NotificationStats> | NotificationStats;
  // Notification preferences
  findNotificationPreferencesByUserId(userId: string): Promise<NotificationPreference | undefined> | NotificationPreference | undefined;
  upsertNotificationPreferences(prefs: NotificationPreference): Promise<NotificationPreference> | NotificationPreference;
  // Notification templates
  findAllNotificationTemplates(): Promise<NotificationTemplate[]> | NotificationTemplate[];
  findNotificationTemplateById(id: string): Promise<NotificationTemplate | undefined> | NotificationTemplate | undefined;
  findNotificationTemplateByEventType(eventType: NotificationEventType): Promise<NotificationTemplate | undefined> | NotificationTemplate | undefined;
  createNotificationTemplate(template: NotificationTemplate): Promise<NotificationTemplate> | NotificationTemplate;
  updateNotificationTemplate(id: string, template: NotificationTemplate): Promise<NotificationTemplate> | NotificationTemplate;
  deleteNotificationTemplate(id: string): Promise<boolean> | boolean;
  submitFeedback(data: Omit<Feedback, 'id' | 'createdAt'>): Promise<Feedback> | Feedback;
  getFeedbacks(): Promise<Feedback[]> | Feedback[];

  // inspections
  getInspections(incidentId?: string): Promise<InspectionRecord[]> | InspectionRecord[];
  getInspectionById(id: string): Promise<InspectionRecord | null> | InspectionRecord | null;
  createInspection(payload: any, user: User): Promise<InspectionRecord> | InspectionRecord;
  verifyInspection(inspectionId: string, departmentRemarks: string, reviewer: User, isApproved: boolean): Promise<InspectionRecord> | InspectionRecord;

  // assignment/escalation
  assignIncidentOfficer(incidentId: string, departmentId: string, officerId: string, officerName: string, adminUser: User, notes: string): Promise<Incident> | Incident;
  escalateIncident(incidentId: string, user: User, reason: string): Promise<Incident> | Incident;

  // analytics
  evaluateClassifier(): Promise<ModelEvaluationMetrics> | ModelEvaluationMetrics;
  getDatasetQuality(): Promise<any> | any;

  // --- Database Storage & Integrity (Phase 7) ---
  getStorageInfo(): Promise<any> | any;
  validateDataIntegrity(): Promise<any> | any;

  // --- India Administrative Locations ---
  getAdminStates(filters?: { isActive?: boolean; type?: 'state' | 'union_territory' }): Promise<AdminState[]> | AdminState[];
  getAdminStateById(id: string): Promise<AdminState | undefined> | AdminState | undefined;
  createAdminState(data: Omit<AdminState, 'id' | 'createdAt' | 'updatedAt'>, adminUser: User): Promise<AdminState> | AdminState;
  updateAdminState(id: string, updates: Partial<AdminState>, adminUser: User): Promise<AdminState> | AdminState;
  deleteAdminState(id: string, adminUser: User): Promise<void>;

  getAdminDistricts(filters?: { stateId?: string; isActive?: boolean }): Promise<AdminDistrict[]> | AdminDistrict[];
  getAdminDistrictById(id: string): Promise<AdminDistrict | undefined> | AdminDistrict | undefined;
  createAdminDistrict(data: Omit<AdminDistrict, 'id' | 'createdAt' | 'updatedAt'>, adminUser: User): Promise<AdminDistrict> | AdminDistrict;
  updateAdminDistrict(id: string, updates: Partial<AdminDistrict>, adminUser: User): Promise<AdminDistrict> | AdminDistrict;
  deleteAdminDistrict(id: string, adminUser: User): Promise<void>;

  getAdminSubDistricts(filters?: { districtId?: string; stateId?: string; isActive?: boolean }): Promise<AdminSubDistrict[]> | AdminSubDistrict[];
  getAdminSubDistrictById(id: string): Promise<AdminSubDistrict | undefined> | AdminSubDistrict | undefined;
  createAdminSubDistrict(data: Omit<AdminSubDistrict, 'id' | 'createdAt' | 'updatedAt'>, adminUser: User): Promise<AdminSubDistrict> | AdminSubDistrict;
  updateAdminSubDistrict(id: string, updates: Partial<AdminSubDistrict>, adminUser: User): Promise<AdminSubDistrict> | AdminSubDistrict;
  deleteAdminSubDistrict(id: string, adminUser: User): Promise<void>;

  getAdminBlocks(filters?: { subDistrictId?: string; districtId?: string; stateId?: string; isActive?: boolean }): Promise<AdminBlock[]> | AdminBlock[];
  getAdminBlockById(id: string): Promise<AdminBlock | undefined> | AdminBlock | undefined;
  createAdminBlock(data: Omit<AdminBlock, 'id' | 'createdAt' | 'updatedAt'>, adminUser: User): Promise<AdminBlock> | AdminBlock;
  updateAdminBlock(id: string, updates: Partial<AdminBlock>, adminUser: User): Promise<AdminBlock> | AdminBlock;
  deleteAdminBlock(id: string, adminUser: User): Promise<void>;

  getAdminLocalities(filters?: { blockId?: string; subDistrictId?: string; districtId?: string; stateId?: string; type?: 'village' | 'town' | 'urban_locality' | 'city'; isActive?: boolean }): Promise<AdminLocality[]> | AdminLocality[];
  getAdminLocalityById(id: string): Promise<AdminLocality | undefined> | AdminLocality | undefined;
  createAdminLocality(data: Omit<AdminLocality, 'id' | 'createdAt' | 'updatedAt'>, adminUser: User): Promise<AdminLocality> | AdminLocality;
  updateAdminLocality(id: string, updates: Partial<AdminLocality>, adminUser: User): Promise<AdminLocality> | AdminLocality;
  deleteAdminLocality(id: string, adminUser: User): Promise<void>;

  getAdministrativeBoundaries(filters?: { level?: LocationLevel; parentId?: string | null }): Promise<AdministrativeBoundary[]> | AdministrativeBoundary[];
  getAdministrativeBoundaryById(id: string): Promise<AdministrativeBoundary | undefined> | AdministrativeBoundary | undefined;
  createAdministrativeBoundary(data: Omit<AdministrativeBoundary, 'id' | 'createdAt' | 'updatedAt'>, adminUser: User): Promise<AdministrativeBoundary> | AdministrativeBoundary;
  updateAdministrativeBoundary(id: string, updates: Partial<AdministrativeBoundary>, adminUser: User): Promise<AdministrativeBoundary> | AdministrativeBoundary;
  deleteAdministrativeBoundary(id: string, adminUser: User): Promise<void>;

  // --- IP Security Logs ---
  createIPSecurityLog(log: Omit<IPSecurityLog, 'id' | 'timestamp' | 'hash' | 'prevHash'>): Promise<IPSecurityLog> | IPSecurityLog;
  getIPSecurityLogs(filters?: { userId?: string; eventType?: AuthEventType; success?: boolean; ipAddress?: string; limit?: number }): Promise<IPSecurityLog[]> | IPSecurityLog[];
  getIPSecurityLogById(id: string): Promise<IPSecurityLog | undefined> | IPSecurityLog | undefined;
  deleteIPSecurityLogsOlderThan(days: number, adminUser: User): Promise<number>;

  // --- Geographic Jurisdiction & Assignment ---
  findAdministrativeJurisdiction(latitude: number, longitude: number): Promise<{
    stateId?: string; stateName?: string;
    districtId?: string; districtName?: string;
    subDistrictId?: string; subDistrictName?: string;
    blockId?: string; blockName?: string;
    localityId?: string; localityName?: string;
    withinKnownBoundary: boolean;
    boundaryLevel?: LocationLevel;
  }> | {
    stateId?: string; stateName?: string;
    districtId?: string; districtName?: string;
    subDistrictId?: string; subDistrictName?: string;
    blockId?: string; blockName?: string;
    localityId?: string; localityName?: string;
    withinKnownBoundary: boolean;
    boundaryLevel?: LocationLevel;
  };
  getOfficersByJurisdiction(filters: {
    stateId?: string; districtId?: string; subDistrictId?: string;
    blockId?: string; localityId?: string; departmentId?: string;
  }): Promise<User[]> | User[];
  updateUserJurisdiction(userId: string, jurisdiction: {
    stateIds?: string[]; districtIds?: string[]; subDistrictIds?: string[];
    blockIds?: string[]; localityIds?: string[]; departmentId?: string;
  }, adminUser: User): Promise<User> | User;

  // --- Backup / Restore ---
  createBackup(backupDir?: string): { backupFile: string; recordCount: number; savedAt: string } | Promise<{ backupFile: string; recordCount: number; savedAt: string }>;
  listBackups(backupDir?: string): { file: string; name: string; size: number; savedAt: string | null; recordCount: number }[] | Promise<{ file: string; name: string; size: number; savedAt: string | null; recordCount: number }[]>;
  pruneBackups(retentionCount: number, backupDir?: string): { pruned: number; remaining: number } | Promise<{ pruned: number; remaining: number }>;
  restoreFromBackup(backupFile: string, storageFile?: string): SCIPDatabase | Promise<SCIPDatabase>;

  // --- Email & SMS Verification ---
  setUserEmailVerificationToken(userId: string, tokenHash: string, expiresAt: string): Promise<void> | void;
  setUserPhoneVerificationOtp(userId: string, otpHash: string, expiresAt: string): Promise<void> | void;
  verifyUserEmail(userId: string, token: string): Promise<boolean> | boolean;
  verifyUserPhone(userId: string, otp: string): Promise<boolean> | boolean;
  getUserVerificationStatus(userId: string): Promise<{ emailVerified: boolean; phoneVerified: boolean; emailVerificationTokenExpiresAt?: string; phoneVerificationOtpExpiresAt?: string; verificationAttempts: number; lastVerificationSentAt?: string } | undefined> | { emailVerified: boolean; phoneVerified: boolean; emailVerificationTokenExpiresAt?: string; phoneVerificationOtpExpiresAt?: string; verificationAttempts: number; lastVerificationSentAt?: string } | undefined;
  incrementVerificationAttempts(userId: string): Promise<void> | void;
  resetVerificationAttempts(userId: string): Promise<void> | void;
  updateUserVerificationStatus(userId: string, updates: { emailVerified?: boolean; phoneVerified?: boolean; verificationAttempts?: number; lastVerificationSentAt?: string }): Promise<void> | void;
}
