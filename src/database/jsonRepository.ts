/**
 * JSON-backed repository adapter (Phase 2)
 * Async-capable wrapper over SCIPDatabase preserving current runtime behavior.
 * Default and controlled fallback backend.
 */
import { SCIPDatabase } from './scipDatabase.js';
import type { IScipRepository } from './repository.js';
import type { User, UserRole, Report, Incident, AuditLog, Notification, Feedback, InspectionRecord, SpatioTemporalCluster, AIAnalysis, AdminState, AdminDistrict, AdminSubDistrict, AdminBlock, AdminLocality, AdministrativeBoundary, IPSecurityLog, AuthEventType, LocationLevel } from '../types/scip.js';

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
  deleteUser(userId: string, requestingUser: User) { return this.engine.deleteUser(userId, requestingUser); }

  getDepartments() { return this.engine.getDepartments(); }
  getDepartmentById(id: string) { return this.engine.getDepartmentById(id); }

  getReports(filter?: { citizenId?: string; status?: string; category?: string; urgency?: string; incidentId?: string }) { return this.engine.getReports(filter as any); }
  getReportById(id: string) { return this.engine.getReportById(id); }
  getAIAnalysisForReport(reportId: string) { return this.engine.getAIAnalysisForReport(reportId); }
  updateAIAnalysis(reportId: string, updates: Partial<AIAnalysis>) { return this.engine.updateAIAnalysis(reportId, updates); }
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

  getStorageInfo() { return this.engine.getStorageInfo(); }
  validateDataIntegrity() { return this.engine.validateDataIntegrity(); }

  // --- India Administrative Locations ---
  getAdminStates(filters?: { isActive?: boolean; type?: 'state' | 'union_territory' }) { return this.engine.getAdminStates(filters); }
  getAdminStateById(id: string) { return this.engine.getAdminStateById(id); }
  createAdminState(data: Omit<AdminState, 'id' | 'createdAt' | 'updatedAt'>, adminUser: User) { return this.engine.createAdminState(data, adminUser); }
  updateAdminState(id: string, updates: Partial<AdminState>, adminUser: User) { return this.engine.updateAdminState(id, updates, adminUser); }
  deleteAdminState(id: string, adminUser: User) { return this.engine.deleteAdminState(id, adminUser); }

  getAdminDistricts(filters?: { stateId?: string; isActive?: boolean }) { return this.engine.getAdminDistricts(filters); }
  getAdminDistrictById(id: string) { return this.engine.getAdminDistrictById(id); }
  createAdminDistrict(data: Omit<AdminDistrict, 'id' | 'createdAt' | 'updatedAt'>, adminUser: User) { return this.engine.createAdminDistrict(data, adminUser); }
  updateAdminDistrict(id: string, updates: Partial<AdminDistrict>, adminUser: User) { return this.engine.updateAdminDistrict(id, updates, adminUser); }
  deleteAdminDistrict(id: string, adminUser: User) { return this.engine.deleteAdminDistrict(id, adminUser); }

  getAdminSubDistricts(filters?: { districtId?: string; stateId?: string; isActive?: boolean }) { return this.engine.getAdminSubDistricts(filters); }
  getAdminSubDistrictById(id: string) { return this.engine.getAdminSubDistrictById(id); }
  createAdminSubDistrict(data: Omit<AdminSubDistrict, 'id' | 'createdAt' | 'updatedAt'>, adminUser: User) { return this.engine.createAdminSubDistrict(data, adminUser); }
  updateAdminSubDistrict(id: string, updates: Partial<AdminSubDistrict>, adminUser: User) { return this.engine.updateAdminSubDistrict(id, updates, adminUser); }
  deleteAdminSubDistrict(id: string, adminUser: User) { return this.engine.deleteAdminSubDistrict(id, adminUser); }

  getAdminBlocks(filters?: { subDistrictId?: string; districtId?: string; stateId?: string; isActive?: boolean }) { return this.engine.getAdminBlocks(filters); }
  getAdminBlockById(id: string) { return this.engine.getAdminBlockById(id); }
  createAdminBlock(data: Omit<AdminBlock, 'id' | 'createdAt' | 'updatedAt'>, adminUser: User) { return this.engine.createAdminBlock(data, adminUser); }
  updateAdminBlock(id: string, updates: Partial<AdminBlock>, adminUser: User) { return this.engine.updateAdminBlock(id, updates, adminUser); }
  deleteAdminBlock(id: string, adminUser: User) { return this.engine.deleteAdminBlock(id, adminUser); }

  getAdminLocalities(filters?: { blockId?: string; subDistrictId?: string; districtId?: string; stateId?: string; type?: 'village' | 'town' | 'urban_locality' | 'city'; isActive?: boolean }) { return this.engine.getAdminLocalities(filters); }
  getAdminLocalityById(id: string) { return this.engine.getAdminLocalityById(id); }
  createAdminLocality(data: Omit<AdminLocality, 'id' | 'createdAt' | 'updatedAt'>, adminUser: User) { return this.engine.createAdminLocality(data, adminUser); }
  updateAdminLocality(id: string, updates: Partial<AdminLocality>, adminUser: User) { return this.engine.updateAdminLocality(id, updates, adminUser); }
  deleteAdminLocality(id: string, adminUser: User) { return this.engine.deleteAdminLocality(id, adminUser); }

  getAdministrativeBoundaries(filters?: { level?: LocationLevel; parentId?: string | null }) { return this.engine.getAdministrativeBoundaries(filters); }
  getAdministrativeBoundaryById(id: string) { return this.engine.getAdministrativeBoundaryById(id); }
  createAdministrativeBoundary(data: Omit<AdministrativeBoundary, 'id' | 'createdAt' | 'updatedAt'>, adminUser: User) { return this.engine.createAdministrativeBoundary(data, adminUser); }
  updateAdministrativeBoundary(id: string, updates: Partial<AdministrativeBoundary>, adminUser: User) { return this.engine.updateAdministrativeBoundary(id, updates, adminUser); }
  deleteAdministrativeBoundary(id: string, adminUser: User) { return this.engine.deleteAdministrativeBoundary(id, adminUser); }

  // --- IP Security Logs ---
  createIPSecurityLog(log: Omit<IPSecurityLog, 'id' | 'timestamp' | 'hash' | 'prevHash'>) { return this.engine.createIPSecurityLog(log); }
  getIPSecurityLogs(filters?: { userId?: string; eventType?: AuthEventType; success?: boolean; ipAddress?: string; limit?: number }) { return this.engine.getIPSecurityLogs(filters); }
  getIPSecurityLogById(id: string) { return this.engine.getIPSecurityLogById(id); }
  deleteIPSecurityLogsOlderThan(days: number, adminUser: User) { return this.engine.deleteIPSecurityLogsOlderThan(days, adminUser); }

  // --- Geographic Jurisdiction & Assignment ---
  findAdministrativeJurisdiction(latitude: number, longitude: number) { return this.engine.findAdministrativeJurisdiction(latitude, longitude); }
  getOfficersByJurisdiction(filters: { stateId?: string; districtId?: string; subDistrictId?: string; blockId?: string; localityId?: string; departmentId?: string }) { return this.engine.getOfficersByJurisdiction(filters); }
  updateUserJurisdiction(userId: string, jurisdiction: { stateIds?: string[]; districtIds?: string[]; subDistrictIds?: string[]; blockIds?: string[]; localityIds?: string[]; departmentId?: string }, adminUser: User) { return this.engine.updateUserJurisdiction(userId, jurisdiction, adminUser); }

  // --- Backup / Restore ---
  createBackup(backupDir?: string) { return this.engine.createBackup(backupDir); }
  listBackups(backupDir?: string) { return this.engine.listBackups(backupDir); }
  pruneBackups(retentionCount: number, backupDir?: string) { return this.engine.pruneBackups(retentionCount, backupDir); }
  restoreFromBackup(backupFile: string, storageFile?: string) { return SCIPDatabase.restoreFromBackup(backupFile, storageFile); }
}