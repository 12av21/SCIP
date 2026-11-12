/**
 * SCIP Repository contract (Phase 2 abstraction)
 * Async-capable interface to support both JSON-backed and future MongoDB-backed implementations.
 * JSON implementation preserves existing runtime behavior; Mongo implementation must reach parity before cutover.
 */
import type {
  User, UserRole, Department, Report, AIAnalysis, Incident, SpatioTemporalCluster,
  Notification, Feedback, AuditLog, InspectionRecord, ModelEvaluationMetrics
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
  createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> | User;
  updateUserRole(userId: string, newRole: UserRole, adminUser: User): Promise<User> | User;
  updateUserStatus(userId: string, status: 'active' | 'suspended', adminUser: User): Promise<User> | User;
  invalidateUserSessions(userId: string): Promise<void> | void;
  markCredentialsResetRequired(userId: string): Promise<void> | void;
  changeUserPassword(userId: string, newPasswordHash: string): Promise<void> | void;
  updateUserProfile(userId: string, updates: { name?: string; phone?: string }): Promise<User> | User;

  // departments
  getDepartments(): Promise<Department[]> | Department[];
  getDepartmentById(id: string): Promise<Department | undefined> | Department | undefined;

  // reports
  getReports(filter?: { citizenId?: string; status?: string; category?: string; urgency?: string; incidentId?: string }): Promise<Report[]> | Report[];
  getReportById(id: string): Promise<Report | undefined> | Report | undefined;
  getAIAnalysisForReport(reportId: string): Promise<AIAnalysis | undefined> | AIAnalysis | undefined;
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

  // notifications/feedback
  getNotificationsForUser(userId: string): Promise<Notification[]> | Notification[];
  createNotification(data: Omit<Notification, 'id' | 'createdAt' | 'read'>): Promise<Notification> | Notification;
  markNotificationAsRead(notifId: string, userId: string): Promise<void> | void;
  markAllNotificationsAsRead(userId: string): Promise<void> | void;
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
}
