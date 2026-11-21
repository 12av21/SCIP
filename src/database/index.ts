/**
 * SCIP Database module entrypoint (Phase 2 repository abstraction)
 * - DEFAULT: file-backed JSON runtime via SCIPDatabase/JsonScipRepository (preserves existing behavior).
 * - Mongo runtime is available ONLY with explicit isolated gates (see tryEnableMongoRuntime):
 *   DATABASE_DRIVER=mongo|mongodb, SCIP_MONGO_RUNTIME_INTEGRATED=true, non-production,
 *   validated local/isolated MONGODB_URI targeting scip_dev, and active Mongo connection.
 * - No silent split-brain/cutover: if any gate fails, file-backed JSON remains active.
 * - Exports `db` as a delegating repository (active backend selected safely at startup).
 */
import path from 'node:path';
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
const testDbPath = process.env.SCIP_TEST_DB_PATH || process.env.SCIP_DB_PATH;
// Allow forcing test database isolation via SCIP_FORCE_TEST_DB=1 regardless of NODE_ENV.
// This enables E2E tests to run with NODE_ENV=test while serving the production-built frontend.
const forceTestDb = process.env.SCIP_FORCE_TEST_DB === '1';
let jsonRepository: JsonScipRepository;
if (testDbPath && (process.env.NODE_ENV === 'test' || forceTestDb)) {
  const resolved = path.resolve(process.cwd(), testDbPath);
  if (path.basename(resolved) === '.scip_database.json') {
    throw new Error('Refusing to use production database file in test mode.');
  }
  jsonRepository = new JsonScipRepository(resolved);
} else if (process.env.NODE_ENV === 'test' || forceTestDb) {
  // Test mode without explicit test DB path - fail closed to prevent accidental primary DB access
  throw new Error('Test mode requires SCIP_TEST_DB_PATH or SCIP_DB_PATH to be set for database isolation.');
} else {
  jsonRepository = new JsonScipRepository();
}
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
  const isAtlas = lower.includes('mongodb.net') || lower.includes('mongodb+srv://');
  if (isAtlas && process.env.NODE_ENV !== 'development') return false;
  if (!/^mongodb(\+srv)?:\/\//.test(lower)) return false;
  if (!isAtlas && !(lower.includes('127.0.0.1') || lower.includes('localhost') || lower.includes('[::1]'))) return false;
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
  getUserByClerkId: delegate('getUserByClerkId'),
  // --- Clerk Identity Linking (Phase 3.1.3) ---
  linkClerkIdentity: delegate('linkClerkIdentity'),
  createClerkLinkRequest: delegate('createClerkLinkRequest'),
  getClerkLinkById: delegate('getClerkLinkById'),
  getClerkLinkBySubject: delegate('getClerkLinkBySubject'),
  getClerkLinksByScipUser: delegate('getClerkLinksByScipUser'),
  listPendingClerkLinks: delegate('listPendingClerkLinks'),
  setClerkLinkChallenge: delegate('setClerkLinkChallenge'),
  submitClerkLinkChallenge: delegate('submitClerkLinkChallenge'),
  decideClerkLink: delegate('decideClerkLink'),
  cancelClerkLink: delegate('cancelClerkLink'),
  expireStaleClerkLinks: delegate('expireStaleClerkLinks'),
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
  getStorageInfo: delegate('getStorageInfo'),
  validateDataIntegrity: delegate('validateDataIntegrity'),

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

  // --- Email & SMS Verification ---
  setUserEmailVerificationToken: delegate('setUserEmailVerificationToken'),
  setUserPhoneVerificationOtp: delegate('setUserPhoneVerificationOtp'),
  verifyUserEmail: delegate('verifyUserEmail'),
  verifyUserPhone: delegate('verifyUserPhone'),
  getUserVerificationStatus: delegate('getUserVerificationStatus'),
  incrementVerificationAttempts: delegate('incrementVerificationAttempts'),
  resetVerificationAttempts: delegate('resetVerificationAttempts'),
  updateUserVerificationStatus: delegate('updateUserVerificationStatus'),
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
