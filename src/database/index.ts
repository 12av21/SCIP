/**
 * SCIP Database module entrypoint (Phase 2 repository abstraction)
 * - DEFAULT: file-backed JSON runtime via SCIPDatabase/JsonScipRepository (preserves existing behavior).
 * - Mongo runtime is available ONLY with explicit isolated gates (see tryEnableMongoRuntime):
 *   DATABASE_DRIVER=mongo|mongodb, SCIP_MONGO_RUNTIME_INTEGRATED=true, non-production,
 *   validated local/isolated MONGODB_URI targeting scip_dev, and active Mongo connection.
 * - No silent split-brain/cutover: if any gate fails, file-backed JSON remains active.
 * - Exports `db` as a delegating repository (active backend selected safely at startup).
 */
import { SCIPDatabase } from './scipDatabase.js';
import { JsonScipRepository } from './jsonRepository.js';
import { MongoScipRepository } from './mongoRepository.js';
import type { IScipRepository } from './repository.js';

export { SCIPDatabase };
export { JsonScipRepository };
export { MongoScipRepository, MongoScipRepositoryNotIntegratedError } from './mongoRepository.js';
export type { IScipRepository } from './repository.js';

export type DatabaseDriverSelection = 'json' | 'mongo';

function selectDriver(): DatabaseDriverSelection {
  const driver = (process.env.DATABASE_DRIVER || 'json').toLowerCase().trim();
  if (driver === 'mongo' || driver === 'mongodb') return 'mongo';
  return 'json';
}

const requestedDriver = selectDriver();
const jsonRepository = new JsonScipRepository();
let mongoRepository: MongoScipRepository | null = null;
let activeRepository: IScipRepository = jsonRepository;
let activeDriver: 'json' | 'mongo' | 'mongo-fallback-json' = requestedDriver === 'mongo' ? 'mongo-fallback-json' : 'json';
let fallbackReason: string | null = requestedDriver === 'mongo' ? 'mongo_runtime_not_enabled' : null;

function getIsolatedMongoDbNameFromUri(uri: string): string | null {
  try {
    // mongodb://host:port/dbname?opts
    const m = uri.match(/^mongodb:\/\/[^/]+\/([^?]+)(\?.*)?$/i);
    return m ? decodeURIComponent(m[1]) : null;
  } catch {
    return null;
  }
}

function isIsolatedLocalMongoUri(uri: string): boolean {
  const lower = uri.toLowerCase();
  if (lower.includes('mongodb.net') || lower.includes('mongodb+srv://')) return false;
  if (!/^mongodb:\/\//.test(lower)) return false;
  if (!(lower.includes('127.0.0.1') || lower.includes('localhost') || lower.includes('[::1]'))) return false;
  const dbName = getIsolatedMongoDbNameFromUri(uri);
  if (!dbName) return false;
  // Explicit isolated targets only: approved dev DB or ephemeral local parity-test DBs.
  return dbName === 'scip_dev' || /^scip_test(_[a-z0-9_-]+)?$/i.test(dbName);
}

export function tryEnableMongoRuntime(mongoStatus?: { driverState?: string; dbName?: string | null }): { enabled: boolean; reason?: string } {
  // Always default to JSON unless every gate passes.
  if (requestedDriver !== 'mongo') {
    activeRepository = jsonRepository;
    activeDriver = 'json';
    fallbackReason = null;
    return { enabled: false, reason: 'driver_not_requested' };
  }
  if (process.env.NODE_ENV === 'production') {
    fallbackReason = 'mongo_runtime_blocked_in_production';
    return { enabled: false, reason: fallbackReason };
  }
  if (process.env.SCIP_MONGO_RUNTIME_INTEGRATED !== 'true') {
    fallbackReason = 'mongo_runtime_not_explicitly_enabled';
    return { enabled: false, reason: fallbackReason };
  }
  const uri = process.env.MONGODB_URI || '';
  if (!isIsolatedLocalMongoUri(uri)) {
    fallbackReason = 'mongo_uri_not_isolated_local';
    return { enabled: false, reason: fallbackReason };
  }
  const expectedDb = getIsolatedMongoDbNameFromUri(uri);
  const connected = mongoStatus?.driverState === 'connected';
  if (!connected || !expectedDb || mongoStatus?.dbName !== expectedDb) {
    fallbackReason = 'mongo_not_connected_to_isolated_target';
    return { enabled: false, reason: fallbackReason };
  }
  // Gates satisfied: enable Mongo-backed repository for this isolated runtime only.
  mongoRepository = mongoRepository || new MongoScipRepository();
  activeRepository = mongoRepository;
  activeDriver = 'mongo';
  fallbackReason = null;
  if (process.env.NODE_ENV !== 'test') {
    console.log(`[SCIP Database] Mongo repository runtime enabled for isolated ${expectedDb} (explicit opt-in).`);
  }
  return { enabled: true };
}

// Initial safe state (JSON fallback when mongo requested but not enabled/connected yet)
if (requestedDriver === 'mongo' && process.env.NODE_ENV !== 'test') {
  console.warn('[SCIP Database] DATABASE_DRIVER=mongo requested; file-backed JSON remains active until explicit isolated runtime gates are satisfied.');
}

function delegate<K extends keyof IScipRepository>(key: K): IScipRepository[K] {
  const fn = (...args: any[]) => (activeRepository as any)[key](...args);
  return fn as IScipRepository[K];
}

export const db: IScipRepository = {
  persist: delegate('persist'),
  seedDatabase: delegate('seedDatabase'),
  resetToSeedData: delegate('resetToSeedData'),
  isDiskPersisted: () => activeRepository.isDiskPersisted(),
  logAudit: delegate('logAudit'),
  verifyAuditIntegrity: delegate('verifyAuditIntegrity'),
  getAuditLogs: delegate('getAuditLogs'),
  getUsers: delegate('getUsers'),
  getUserById: delegate('getUserById'),
  getUserByEmailWithPassword: delegate('getUserByEmailWithPassword'),
  createUser: delegate('createUser'),
  updateUserRole: delegate('updateUserRole'),
  updateUserStatus: delegate('updateUserStatus'),
  invalidateUserSessions: delegate('invalidateUserSessions'),
  markCredentialsResetRequired: delegate('markCredentialsResetRequired'),
  changeUserPassword: delegate('changeUserPassword'),
  updateUserProfile: delegate('updateUserProfile'),
  deleteUser: delegate('deleteUser'),
  getDepartments: delegate('getDepartments'),
  getDepartmentById: delegate('getDepartmentById'),
  getReports: delegate('getReports'),
  getReportById: delegate('getReportById'),
  getAIAnalysisForReport: delegate('getAIAnalysisForReport'),
  createReport: delegate('createReport'),
  updateReport: delegate('updateReport'),
  withdrawReport: delegate('withdrawReport'),
  runAndStoreAIAnalysis: delegate('runAndStoreAIAnalysis'),
  getIncidents: delegate('getIncidents'),
  getIncidentById: delegate('getIncidentById'),
  createIncidentFromCluster: delegate('createIncidentFromCluster'),
  reviewIncident: delegate('reviewIncident'),
  resolveIncident: delegate('resolveIncident'),
  getNotificationsForUser: delegate('getNotificationsForUser'),
  createNotification: delegate('createNotification'),
  markNotificationAsRead: delegate('markNotificationAsRead'),
  markAllNotificationsAsRead: delegate('markAllNotificationsAsRead'),
  submitFeedback: delegate('submitFeedback'),
  getFeedbacks: delegate('getFeedbacks'),
  getInspections: delegate('getInspections'),
  getInspectionById: delegate('getInspectionById'),
  createInspection: delegate('createInspection'),
  verifyInspection: delegate('verifyInspection'),
  assignIncidentOfficer: delegate('assignIncidentOfficer'),
  escalateIncident: delegate('escalateIncident'),
  evaluateClassifier: delegate('evaluateClassifier'),
  getDatasetQuality: delegate('getDatasetQuality'),

  // --- India Administrative Locations ---
  getAdminStates: delegate('getAdminStates'),
  getAdminStateById: delegate('getAdminStateById'),
  createAdminState: delegate('createAdminState'),
  updateAdminState: delegate('updateAdminState'),
  deleteAdminState: delegate('deleteAdminState'),
  getAdminDistricts: delegate('getAdminDistricts'),
  getAdminDistrictById: delegate('getAdminDistrictById'),
  createAdminDistrict: delegate('createAdminDistrict'),
  updateAdminDistrict: delegate('updateAdminDistrict'),
  deleteAdminDistrict: delegate('deleteAdminDistrict'),
  getAdminSubDistricts: delegate('getAdminSubDistricts'),
  getAdminSubDistrictById: delegate('getAdminSubDistrictById'),
  createAdminSubDistrict: delegate('createAdminSubDistrict'),
  updateAdminSubDistrict: delegate('updateAdminSubDistrict'),
  deleteAdminSubDistrict: delegate('deleteAdminSubDistrict'),
  getAdminBlocks: delegate('getAdminBlocks'),
  getAdminBlockById: delegate('getAdminBlockById'),
  createAdminBlock: delegate('createAdminBlock'),
  updateAdminBlock: delegate('updateAdminBlock'),
  deleteAdminBlock: delegate('deleteAdminBlock'),
  getAdminLocalities: delegate('getAdminLocalities'),
  getAdminLocalityById: delegate('getAdminLocalityById'),
  createAdminLocality: delegate('createAdminLocality'),
  updateAdminLocality: delegate('updateAdminLocality'),
  deleteAdminLocality: delegate('deleteAdminLocality'),
  getAdministrativeBoundaries: delegate('getAdministrativeBoundaries'),
  getAdministrativeBoundaryById: delegate('getAdministrativeBoundaryById'),
  createAdministrativeBoundary: delegate('createAdministrativeBoundary'),
  updateAdministrativeBoundary: delegate('updateAdministrativeBoundary'),
  deleteAdministrativeBoundary: delegate('deleteAdministrativeBoundary'),

  // --- IP Security Logs ---
  createIPSecurityLog: delegate('createIPSecurityLog'),
  getIPSecurityLogs: delegate('getIPSecurityLogs'),
  getIPSecurityLogById: delegate('getIPSecurityLogById'),
  deleteIPSecurityLogsOlderThan: delegate('deleteIPSecurityLogsOlderThan'),

  // --- Geographic Jurisdiction & Assignment ---
  findAdministrativeJurisdiction: delegate('findAdministrativeJurisdiction'),
  getOfficersByJurisdiction: delegate('getOfficersByJurisdiction'),
  updateUserJurisdiction: delegate('updateUserJurisdiction'),

  // --- Backup / Restore ---
  createBackup: delegate('createBackup'),
  listBackups: delegate('listBackups'),
  pruneBackups: delegate('pruneBackups'),
  restoreFromBackup: delegate('restoreFromBackup'),
} as IScipRepository;

export const REQUESTED_DATABASE_DRIVER: DatabaseDriverSelection = requestedDriver;
export function getActiveDatabaseDriver() { return activeDriver; }

export function getDatabaseRuntimeInfo() {
  const isMongo = activeDriver === 'mongo';
  return {
    requestedDriver: REQUESTED_DATABASE_DRIVER,
    activeDriver,
    runtimeIntegrated: isMongo ? ('mongo' as const) : ('json' as const),
    mongoRepositoryIntegrated: isMongo,
    diskPersisted: activeRepository.isDiskPersisted(),
    fallbackReason,
  };
}
