/**
 * JSON-backed repository adapter (Phase 2)
 * Async-capable wrapper over SCIPDatabase preserving current runtime behavior.
 * Default and controlled fallback backend.
 */
import { SCIPDatabase } from './scipDatabase.js';
import type { IScipRepository } from './repository.js';
import type { User, UserRole, Report, Incident, AuditLog, Notification, Feedback, InspectionRecord, SpatioTemporalCluster, AIAnalysis } from '../types/scip.js';

export class JsonScipRepository implements IScipRepository {
  readonly engine: SCIPDatabase;
  readonly driver = 'json' as const;

  constructor(storageFile?: string) {
    this.engine = new SCIPDatabase(storageFile);
  }

  persist() { return this.engine.persist(); }
  seedDatabase() { return this.engine.seedDatabase(); }
  resetToSeedData() { return this.engine.resetToSeedData(); }
  isDiskPersisted() { return this.engine.isDiskPersisted(); }

  logAudit(log: Omit<AuditLog, 'id' | 'timestamp' | 'hash' | 'prevHash'>) { return this.engine.logAudit(log); }
  verifyAuditIntegrity() { return this.engine.verifyAuditIntegrity(); }
  getAuditLogs(filters?: { module?: string; action?: string; userId?: string }) { return this.engine.getAuditLogs(filters); }

  getUsers() { return this.engine.getUsers(); }
  getUserById(id: string) { return this.engine.getUserById(id); }
  getUserByEmailWithPassword(email: string) { return this.engine.getUserByEmailWithPassword(email); }
  createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) { return this.engine.createUser(userData); }
  updateUserRole(userId: string, newRole: UserRole, adminUser: User) { return this.engine.updateUserRole(userId, newRole, adminUser); }
  updateUserStatus(userId: string, status: 'active' | 'suspended', adminUser: User) { return this.engine.updateUserStatus(userId, status, adminUser); }
  invalidateUserSessions(userId: string) { return this.engine.invalidateUserSessions(userId); }
  markCredentialsResetRequired(userId: string) { return this.engine.markCredentialsResetRequired(userId); }
  changeUserPassword(userId: string, newPasswordHash: string) { return this.engine.changeUserPassword(userId, newPasswordHash); }
  updateUserProfile(userId: string, updates: { name?: string; phone?: string }) { return this.engine.updateUserProfile(userId, updates); }

  getDepartments() { return this.engine.getDepartments(); }
  getDepartmentById(id: string) { return this.engine.getDepartmentById(id); }

  getReports(filter?: { citizenId?: string; status?: string; category?: string; urgency?: string; incidentId?: string }) { return this.engine.getReports(filter as any); }
  getReportById(id: string) { return this.engine.getReportById(id); }
  getAIAnalysisForReport(reportId: string) { return this.engine.getAIAnalysisForReport(reportId); }
  createReport(reportInput: Omit<Report, 'id' | 'status' | 'createdAt' | 'updatedAt'>) { return this.engine.createReport(reportInput); }
  updateReport(id: string, updates: Partial<Report>, user: User) { return this.engine.updateReport(id, updates, user); }
  withdrawReport(id: string, user: User) { return this.engine.withdrawReport(id, user); }
  runAndStoreAIAnalysis(report: Report, recordAudit = true) { return this.engine.runAndStoreAIAnalysis(report, recordAudit); }

  getIncidents(filter?: { status?: string; category?: string; priority?: string }) { return this.engine.getIncidents(filter as any); }
  getIncidentById(id: string) { return this.engine.getIncidentById(id); }
  createIncidentFromCluster(cluster: SpatioTemporalCluster, creatorUser: User) { return this.engine.createIncidentFromCluster(cluster, creatorUser); }
  reviewIncident(incidentId: string, action: 'confirm' | 'dismiss', reviewer: User, notes?: string, deptId?: string, officerId?: string) { return this.engine.reviewIncident(incidentId, action, reviewer, notes ?? '', deptId, officerId); }
  resolveIncident(incidentId: string, resolver: User, payload: { actionTaken: string; preventiveMeasures?: string; costEstimate?: number }) { return this.engine.resolveIncident(incidentId, resolver, payload); }

  getNotificationsForUser(userId: string) { return this.engine.getNotificationsForUser(userId); }
  createNotification(data: Omit<Notification, 'id' | 'createdAt' | 'read'>) { return this.engine.createNotification(data); }
  markNotificationAsRead(notifId: string, userId: string) { return this.engine.markNotificationAsRead(notifId, userId); }
  markAllNotificationsAsRead(userId: string) { return this.engine.markAllNotificationsAsRead(userId); }
  submitFeedback(data: Omit<Feedback, 'id' | 'createdAt'>) { return this.engine.submitFeedback(data); }
  getFeedbacks() { return this.engine.getFeedbacks(); }

  getInspections(incidentId?: string) { return this.engine.getInspections(incidentId); }
  getInspectionById(id: string) { return this.engine.getInspectionById(id); }
  createInspection(payload: any, user: User) { return this.engine.createInspection(payload, user); }
  verifyInspection(inspectionId: string, departmentRemarks: string, reviewer: User, isApproved: boolean) { return this.engine.verifyInspection(inspectionId, departmentRemarks, reviewer, isApproved); }

  assignIncidentOfficer(incidentId: string, departmentId: string, officerId: string, officerName: string, adminUser: User, notes: string) { return this.engine.assignIncidentOfficer(incidentId, departmentId, officerId, officerName, adminUser, notes); }
  escalateIncident(incidentId: string, user: User, reason: string) { return this.engine.escalateIncident(incidentId, user, reason); }

  evaluateClassifier() { return this.engine.evaluateClassifier(); }
  getDatasetQuality() { return this.engine.getDatasetQuality(); }
}